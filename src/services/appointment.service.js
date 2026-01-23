const { pool } = require('../config/database');
const crypto = require('crypto');
const { getClient } = require('../config/redis');
const cacheService = require('./cache.service');

class AppointmentService {
    constructor() {
        this.redisClient = null;
    }
    async _getRedisClient() {
        if (!this.redisClient) {
            this.redisClient = await getClient();
        }
        return this.redisClient;
    }

    async bookAppointment(userId, doctorId, date, time) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const existing = await client.query(
                `SELECT id FROM appointments
                 WHERE user_id = $1
                   AND status IN ('scheduled', 'approved', 'started')
                 LIMIT 1`,
                [userId]
            );

            if (existing.rows.length > 0) {
                throw new Error('User already has an active appointment');
            }

            const result = await client.query(
                `INSERT INTO appointments
                 (user_id, doctor_id, appointment_date, appointment_time, status)
                 VALUES ($1, $2, $3, $4, 'scheduled')
                 RETURNING id`,
                [userId, doctorId, date, time]
            );

            await client.query('COMMIT');

            await cacheService.invalidateDoctorsList();

            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async startAppointment(appointmentId, doctorId) {
        const roomId = crypto.randomUUID();
        const result = await pool.query(
            `UPDATE appointments
             SET status = 'started', room_id = $1
             WHERE id = $2
               AND doctor_id = $3
               AND status = 'scheduled'
             RETURNING room_id`,
            [roomId, appointmentId, doctorId]
        );

        if (!result.rowCount) {
            throw new Error('Appointment not found or already started');
        }

        return result.rows[0];
    }

    async completeAppointment(appointmentId, doctorId) {
        const result = await pool.query(
            `UPDATE appointments
             SET status = 'completed', completed_at = NOW()
             WHERE id = $1 AND doctor_id = $2
             RETURNING id`,
            [appointmentId, doctorId]
        );

        if (!result.rowCount) {
            throw new Error('Appointment not found');
        }

        await cacheService.invalidateDoctorsList();

        return result.rows[0];
    }

    async getUserActiveAppointment(userId, role) {
        const isDoctor = role === 'doctor';
        const query = isDoctor ?
            `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.room_id,
                    COALESCE(up.full_name, 'Patient') AS user_name
             FROM appointments a
             LEFT JOIN user_profile up ON up.user_id = a.user_id
             WHERE a.doctor_id = $1 AND a.status IN ('scheduled','started')` :
            `SELECT a.id, a.appointment_date, a.appointment_time, a.status, a.room_id,
                    COALESCE(dp.full_name, 'Doctor') AS doctor_name,
                    COALESCE(dp.specialization, 'General') AS specialization
             FROM appointments a
             LEFT JOIN doc_profile dp ON dp.doc_id = a.doctor_id
             WHERE a.user_id = $1 AND a.status IN ('scheduled','started')`;

        const result = await pool.query(
            query + ` ORDER BY a.appointment_date, a.appointment_time LIMIT 1`,
            [userId]
        );

        return result.rows[0] || null;
    }

    async getAvailableDoctors() {
        try {
            const client = await this._getRedisClient();
            if (client) {
                const cached = await client.get('doctors:available');
                if (cached) {
                    return JSON.parse(cached);
                }
            }
        } catch (err) {
            console.log('Redis cache read failed for doctors (non-critical)');
        }

        const result = await pool.query(
            `SELECT d.docid AS id, p.full_name, p.specialization,
                    p.experience_years, p.qualification, p.hospital_name
             FROM doc_login d
             JOIN doc_profile p ON p.doc_id = d.docid
             WHERE NOT EXISTS (
                 SELECT 1 FROM appointments a
                 WHERE a.doctor_id = d.docid
                 AND a.status IN ('started', 'scheduled')
                 AND a.appointment_date >= CURRENT_DATE
             )
             ORDER BY p.full_name`
        );

        const doctors = result.rows;
        try {
            const client = await this._getRedisClient();
            if (client) {
                await client.set(
                    'doctors:available',
                    JSON.stringify(doctors),
                    { EX: 300 }
                );
            }
        } catch (err) {
        }

        return doctors;
    }

    async getAppointmentByRoomId(roomId, userId, role) {
        let query;
        if (role === "user") {
            query = `SELECT a.id, a.user_id, a.doctor_id, a.appointment_date,
                            dp.full_name as doctor_name,
                            dp.specialization,
                            dp.qualification,
                            dp.hospital_name
                     FROM appointments a
                     LEFT JOIN doc_profile dp ON dp.doc_id = a.doctor_id
                     WHERE a.room_id = $1 AND a.user_id = $2`;
        } else if (role === "doctor") {
            query = `SELECT a.id, a.user_id, a.doctor_id, a.appointment_date,
                            dp.full_name as doctor_name,
                            dp.specialization,
                            dp.qualification,
                            dp.hospital_name
                     FROM appointments a
                     LEFT JOIN doc_profile dp ON dp.doc_id = a.doctor_id
                     WHERE a.room_id = $1 AND a.doctor_id = $2`;
        }

        const result = await pool.query(query, [roomId, userId]);
        return result.rows[0] || null;
    }

    async validateRoomAccess(roomId, userId) {
        const result = await pool.query(
            `SELECT id FROM appointments 
             WHERE room_id = $1 
             AND (user_id = $2 OR doctor_id = $3)`,
            [roomId, userId, userId]
        );
        return result.rows.length > 0;
    }

    async endCallWithPrescription(roomId, appointmentId, notes) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            if (notes && notes.trim()) {
                await client.query(
                    `INSERT INTO doctor_notes (room_id, appointment_id, notes, sent, created_at)
                     VALUES ($1, $2, $3, TRUE, NOW())
                     ON CONFLICT (room_id) 
                     DO UPDATE SET 
                        notes = EXCLUDED.notes, 
                        sent = TRUE, 
                        created_at = NOW()`,
                    [roomId, appointmentId, notes]
                );
            } else {
                await client.query(
                    `INSERT INTO doctor_notes (room_id, appointment_id, notes, sent, created_at)
                     VALUES ($1, $2, $3, TRUE, NOW())
                     ON CONFLICT (room_id) 
                     DO UPDATE SET 
                        notes = EXCLUDED.notes, 
                        sent = TRUE, 
                        created_at = NOW()`,
                    [roomId, appointmentId, "No prescription notes provided."]
                );
            }

            await client.query(
                `UPDATE appointments 
                 SET status = 'completed', completed_at = NOW()
                 WHERE room_id = $1 AND id = $2`,
                [roomId, appointmentId]
            );

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new AppointmentService();