const { Pool } = require('pg');
const path = require('path');

// Load environment variables
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

async function initializeDatabase() {
    try {
        const client = await pool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS refresh_tokens (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL,
                role VARCHAR(20) NOT NULL,
                token TEXT NOT NULL UNIQUE,
                expires_at TIMESTAMP NOT NULL,
                revoked BOOLEAN DEFAULT FALSE,
                revoked_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id, role);
            CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
        `);

        client.release();
        console.log('✅ Database schema initialized');
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}

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
    initializeDatabase,
    testConnection,
    cleanupExpiredTokens
};