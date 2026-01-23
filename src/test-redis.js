// src/test-redis.js
const { getClient } = require('./config/redis');

async function testRedis() {
    try {
        const client = await getClient();

        await client.set('test', 'OK', { EX: 10 });
        const value = await client.get('test');

        console.log(
            'Redis test:',
            value === 'OK' ? '✅ Working' : '❌ Failed'
        );
    } catch (err) {
        console.error(
            'Redis test: ❌ Failed (non-critical)',
            err.message
        );
    } finally {
        process.exit(0);
    }
}

testRedis();
