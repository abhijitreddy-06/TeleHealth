const { pool } = require('../../config/database');

class AiModel {
    static async insertPrecheck(userId, symptoms, aiResponse, severity) {
        await pool.query(
            `INSERT INTO ai_prechecks (user_id, symptoms, ai_response, severity)
             VALUES ($1, $2, $3, $4)`,
            [userId, symptoms, JSON.stringify(aiResponse), severity]
        );
    }
}

module.exports = AiModel;
