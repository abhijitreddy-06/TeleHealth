const { pool } = require('../../config/database');

class AuthModel {
    static _getTableConfig(role) {
        return {
            user: { table: 'login', idField: 'id' },
            doctor: { table: 'doc_login', idField: 'docid' },
            admin: { table: 'admin_login', idField: 'id' }
        }[role];
    }

    static async findByPhone(phone, role) {
        const { table } = this._getTableConfig(role);
        const result = await pool.query(`SELECT * FROM ${table} WHERE phone=$1`, [phone]);
        return result.rows[0] || null;
    }

    static async createUser(phone, hashedPassword, role) {
        const { table, idField } = this._getTableConfig(role);
        const result = await pool.query(
            `INSERT INTO ${table} (phone, password) VALUES ($1, $2) RETURNING ${idField}, phone`,
            [phone, hashedPassword]
        );
        const row = result.rows[0];
        return { id: row[idField], phone: row.phone, role };
    }

    static async findUserById(id, role) {
        const { table, idField } = this._getTableConfig(role);
        const result = await pool.query(
            `SELECT phone FROM ${table} WHERE ${idField} = $1`, [id]
        );
        return result.rows[0] || null;
    }

    static async storeRefreshToken(userId, role, token, expiresAt) {
        await pool.query(
            `INSERT INTO refresh_tokens (user_id, role, token, expires_at) VALUES ($1, $2, $3, $4)`,
            [userId, role, token, expiresAt]
        );
    }

    static async findValidRefreshToken(token, userId, role) {
        const result = await pool.query(
            `SELECT * FROM refresh_tokens WHERE token = $1 AND user_id = $2 AND role = $3
             AND revoked = FALSE AND expires_at > CURRENT_TIMESTAMP`,
            [token, userId, role]
        );
        return result.rows[0] || null;
    }

    static async revokeToken(token) {
        await pool.query(
            `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP WHERE token = $1`,
            [token]
        );
    }

    static async revokeAllUserTokens(userId, role) {
        await pool.query(
            `UPDATE refresh_tokens SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND role = $2 AND revoked = FALSE`,
            [userId, role]
        );
    }
}

module.exports = AuthModel;
