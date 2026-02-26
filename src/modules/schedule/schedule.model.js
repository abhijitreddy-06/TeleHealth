const { pool } = require('../../config/database');

class ScheduleModel {
    static async getWeeklySchedule(doctorId) {
        const result = await pool.query(
            `SELECT id, day_of_week, start_time, end_time
             FROM doctor_schedules
             WHERE doctor_id = $1 AND is_active = TRUE
             ORDER BY day_of_week, start_time`,
            [doctorId]
        );
        return result.rows;
    }

    static async upsertScheduleDay(doctorId, dayOfWeek, startTime, endTime, client) {
        const db = client || pool;
        const result = await db.query(
            `INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, is_active, updated_at)
             VALUES ($1, $2, $3, $4, TRUE, NOW())
             ON CONFLICT (doctor_id, day_of_week, start_time)
             DO UPDATE SET end_time = $4, is_active = TRUE, updated_at = NOW()
             RETURNING id`,
            [doctorId, dayOfWeek, startTime, endTime]
        );
        return result.rows[0];
    }

    static async deactivateScheduleDay(doctorId, dayOfWeek, client) {
        const db = client || pool;
        await db.query(
            `UPDATE doctor_schedules SET is_active = FALSE, updated_at = NOW()
             WHERE doctor_id = $1 AND day_of_week = $2`,
            [doctorId, dayOfWeek]
        );
    }

    static async deactivateAllSchedules(doctorId, client) {
        const db = client || pool;
        await db.query(
            `UPDATE doctor_schedules SET is_active = FALSE, updated_at = NOW()
             WHERE doctor_id = $1`,
            [doctorId]
        );
    }

    static async getOverrides(doctorId, startDate, endDate) {
        const result = await pool.query(
            `SELECT id, override_date, override_type, start_time, end_time, reason
             FROM schedule_overrides
             WHERE doctor_id = $1 AND override_date BETWEEN $2 AND $3
             ORDER BY override_date`,
            [doctorId, startDate, endDate]
        );
        return result.rows;
    }

    static async createOverride(doctorId, date, type, startTime, endTime, reason) {
        const result = await pool.query(
            `INSERT INTO schedule_overrides (doctor_id, override_date, override_type, start_time, end_time, reason)
             VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [doctorId, date, type, startTime || null, endTime || null, reason || null]
        );
        return result.rows[0];
    }

    static async deleteOverride(overrideId, doctorId) {
        const result = await pool.query(
            `DELETE FROM schedule_overrides WHERE id = $1 AND doctor_id = $2 RETURNING id`,
            [overrideId, doctorId]
        );
        return result.rows[0] || null;
    }

    static async getBookedSlots(doctorId, date) {
        const result = await pool.query(
            `SELECT appointment_time
             FROM appointments
             WHERE doctor_id = $1 AND appointment_date = $2 AND status IN ('scheduled', 'started')
             ORDER BY appointment_time`,
            [doctorId, date]
        );
        return result.rows.map(r => r.appointment_time);
    }

    static async getDoctorsWithSchedules() {
        const result = await pool.query(
            `SELECT DISTINCT d.id, p.full_name, p.specialization,
                    p.experience_years, p.qualification, p.hospital_name
             FROM users d
             JOIN doc_profile p ON p.doc_id = d.id
             JOIN doctor_schedules ds ON ds.doctor_id = d.id AND ds.is_active = TRUE
             WHERE d.role = 'doctor'
             ORDER BY p.full_name`
        );
        return result.rows;
    }
}

module.exports = ScheduleModel;
