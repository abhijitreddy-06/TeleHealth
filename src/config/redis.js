const { createClient } = require('redis');
require('dotenv').config();

// Why: Simple Redis client that fails gracefully
const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
    // Why: Silent fail - app works without Redis
    console.log('Redis connection error (non-critical):', err.message);
});

let isConnected = false;

// Connect on first use
const getClient = async () => {
    if (!isConnected) {
        try {
            await redisClient.connect();
            isConnected = true;
            console.log('✅ Redis connected');
        } catch (err) {
            console.log('❌ Redis connection failed, continuing without cache');
        }
    }
    return redisClient;
};

module.exports = { getClient };