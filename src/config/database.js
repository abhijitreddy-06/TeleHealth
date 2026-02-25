const { Pool } = require('pg');
const path = require('path');

require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function testConnection() {
    try {
        await pool.query('SELECT 1');
        console.log('✅ Database connection established');
    } catch (error) {
        console.error('❌ Database connection failed:', error);
        process.exit(1);
    }
}

async function cleanupExpiredTokens() {
    try {
        const result = await pool.query(
            `DELETE FROM refresh_tokens 
             WHERE expires_at < CURRENT_TIMESTAMP - INTERVAL '30 days' 
                OR revoked = TRUE AND revoked_at < CURRENT_TIMESTAMP - INTERVAL '7 days'`
        );
        console.log(`Cleaned up ${result.rowCount} expired tokens`);
    } catch (error) {
        console.error('Token cleanup error:', error);
    }
}

module.exports = {
    pool,
    testConnection,
    cleanupExpiredTokens
};