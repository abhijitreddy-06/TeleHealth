const { pool } = require('../../config/database');

class AdminModel {
    /**
     * Find an admin by phone number.
     */
    static async findByPhone(phone) {
        const result = await pool.query(
            `SELECT id, phone, password, created_at
             FROM users
             WHERE phone = $1 AND role = 'admin'`,
            [phone]
        );
        return result.rows[0] || null;
    }

    /**
     * Create a new admin account.
     */
    static async createAdmin(phone, hashedPassword) {
        const result = await pool.query(
            `INSERT INTO users (phone, password, role)
             VALUES ($1, $2, 'admin')
             RETURNING id, phone`,
            [phone, hashedPassword]
        );
        return result.rows[0];
    }

    /**
     * Get all doctors with profile info, paginated.
     */
    static async getAllDoctors(limit = 20, offset = 0) {
        const result = await pool.query(
            `SELECT u.id, u.phone, u.created_at,
                    dp.full_name, dp.specialization, dp.experience_years,
                    dp.qualification, dp.hospital_name
             FROM users u
             LEFT JOIN doc_profile dp ON u.id = dp.doc_id
             WHERE u.role = 'doctor'
             ORDER BY u.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    /**
     * Get all patients with profile info, paginated.
     */
    static async getAllPatients(limit = 20, offset = 0) {
        const result = await pool.query(
            `SELECT u.id, u.phone, u.created_at,
                    up.full_name, up.gender, up.date_of_birth,
                    up.blood_group
             FROM users u
             LEFT JOIN user_profile up ON u.id = up.user_id
             WHERE u.role = 'user'
             ORDER BY u.created_at DESC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    }

    /**
     * Get all appointments with optional filters, paginated.
     * Filters: status, doctorId, date
     */
    static async getAllAppointments(filters = {}, limit = 20, offset = 0) {
        const conditions = [];
        const params = [];
        let paramIndex = 1;

        if (filters.status) {
            conditions.push(`a.status = $${paramIndex++}`);
            params.push(filters.status);
        }
        if (filters.doctorId) {
            conditions.push(`a.doctor_id = $${paramIndex++}`);
            params.push(filters.doctorId);
        }
        if (filters.date) {
            conditions.push(`a.appointment_date = $${paramIndex++}`);
            params.push(filters.date);
        }

        const whereClause = conditions.length > 0
            ? 'WHERE ' + conditions.join(' AND ')
            : '';

        params.push(limit);
        params.push(offset);

        const result = await pool.query(
            `SELECT a.*,
                    up.full_name AS patient_name,
                    dp.full_name AS doctor_name
             FROM appointments a
             LEFT JOIN user_profile up ON a.user_id = up.user_id
             LEFT JOIN doc_profile dp ON a.doctor_id = dp.doc_id
             ${whereClause}
             ORDER BY a.appointment_date DESC, a.appointment_time DESC
             LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
            params
        );
        return result.rows;
    }

    /**
     * Get system-wide statistics.
     */
    static async getSystemStats() {
        const [patients, doctors, appointments, active, completedToday] = await Promise.all([
            pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'user'"),
            pool.query("SELECT COUNT(*) AS count FROM users WHERE role = 'doctor'"),
            pool.query('SELECT COUNT(*) AS count FROM appointments'),
            pool.query(
                `SELECT COUNT(*) AS count FROM appointments
                 WHERE status IN ('scheduled', 'started')`
            ),
            pool.query(
                `SELECT COUNT(*) AS count FROM appointments
                 WHERE status = 'completed'
                   AND appointment_date = CURRENT_DATE`
            )
        ]);

        return {
            totalPatients: parseInt(patients.rows[0].count, 10),
            totalDoctors: parseInt(doctors.rows[0].count, 10),
            totalAppointments: parseInt(appointments.rows[0].count, 10),
            activeAppointments: parseInt(active.rows[0].count, 10),
            completedToday: parseInt(completedToday.rows[0].count, 10)
        };
    }

    /**
     * Override an appointment's status (admin action).
     */
    static async overrideAppointmentStatus(appointmentId, newStatus) {
        const result = await pool.query(
            `UPDATE appointments
             SET status = $2, updated_at = NOW()
             WHERE id = $1
             RETURNING *`,
            [appointmentId, newStatus]
        );
        return result.rows[0] || null;
    }

    /**
     * Get a doctor's active schedule entries.
     */
    static async getDoctorSchedule(doctorId) {
        const result = await pool.query(
            `SELECT id, day_of_week, start_time, end_time, is_active, created_at
             FROM doctor_schedules
             WHERE doctor_id = $1 AND is_active = TRUE
             ORDER BY day_of_week, start_time`,
            [doctorId]
        );
        return result.rows;
    }
}

module.exports = AdminModel;
