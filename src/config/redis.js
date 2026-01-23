const { createClient } = require('redis');
require('dotenv').config();

const redisClient = createClient({
    url: process.env.REDIS_URL
});

redisClient.on('error', (err) => {
    console.log('Redis connection error (non-critical):', err.message);
});

let isConnected = false;

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