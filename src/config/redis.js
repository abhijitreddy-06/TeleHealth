const { createClient } = require('redis');
require('dotenv').config();

let redisClient = null;
let isConnected = false;
let connectionAttempted = false;

const getClient = async () => {
    if (connectionAttempted && !isConnected) {
        return null;
    }

    if (!redisClient) {
        redisClient = createClient({
            url: process.env.REDIS_URL,
            socket: {
                connectTimeout: 5000,
                reconnectStrategy: (retries) => {
                    if (retries > 10) return false;
                    return Math.min(retries * 200, 3000);
                }
            }
        });

        redisClient.on('error', (err) => {
            if (isConnected) {
                console.log('Redis connection error (non-critical):', err.message);
            }
            isConnected = false;
        });

        redisClient.on('ready', () => {
            isConnected = true;
            console.log('✅ Redis reconnected');
        });
    }

    if (!isConnected && !connectionAttempted) {
        connectionAttempted = true;
        try {
            await redisClient.connect();
            isConnected = true;
            console.log('✅ Redis connected');
        } catch (err) {
            console.log('❌ Redis connection failed, continuing without cache');
            isConnected = false;
            return null;
        }
    }

    return isConnected ? redisClient : null;
};

module.exports = { getClient };