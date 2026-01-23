const { getClient } = require('../config/redis');

// Why: Cache keys for easy management
const CACHE_KEYS = {
    DOCTORS_LIST: 'doctors:list',
    USER_PROFILE: (userId) => `user:profile:${userId}`,
    DOCTOR_PROFILE: (doctorId) => `doctor:profile:${doctorId}`
};

// Why: TTLs based on data volatility
const TTL = {
    DOCTORS_LIST: 300,      // 5 minutes - frequently accessed
    PROFILES: 1800          // 30 minutes - less volatile
};

class CacheService {
    // Why: Doctors list is read-heavy (appointment booking form)
    async getDoctorsList() {
        try {
            const client = await getClient();
            const cached = await client.get(CACHE_KEYS.DOCTORS_LIST);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null; // Fail silently
        }
    }

    async setDoctorsList(doctors) {
        try {
            const client = await getClient();
            await client.set(
                CACHE_KEYS.DOCTORS_LIST,
                JSON.stringify(doctors),
                { EX: TTL.DOCTORS_LIST }
            );
        } catch {
            // Fail silently
        }
    }

    async invalidateDoctorsList() {
        try {
            const client = await getClient();
            await client.del(CACHE_KEYS.DOCTORS_LIST);
        } catch {
            // Fail silently
        }
    }

    // Why: User profiles are frequently accessed (dashboard/profile pages)
    async getUserProfile(userId) {
        try {
            const client = await getClient();
            const cached = await client.get(CACHE_KEYS.USER_PROFILE(userId));
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }

    async setUserProfile(userId, profile) {
        try {
            const client = await getClient();
            await client.set(
                CACHE_KEYS.USER_PROFILE(userId),
                JSON.stringify(profile),
                { EX: TTL.PROFILES }
            );
        } catch {
            // Fail silently
        }
    }

    async invalidateUserProfile(userId) {
        try {
            const client = await getClient();
            await client.del(CACHE_KEYS.USER_PROFILE(userId));
        } catch {
            // Fail silently
        }
    }

    // Why: Doctor profiles for appointment details and doctor dashboard
    async getDoctorProfile(doctorId) {
        try {
            const client = await getClient();
            const cached = await client.get(CACHE_KEYS.DOCTOR_PROFILE(doctorId));
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    }

    async setDoctorProfile(doctorId, profile) {
        try {
            const client = await getClient();
            await client.set(
                CACHE_KEYS.DOCTOR_PROFILE(doctorId),
                JSON.stringify(profile),
                { EX: TTL.PROFILES }
            );
        } catch {
            // Fail silently
        }
    }

    async invalidateDoctorProfile(doctorId) {
        try {
            const client = await getClient();
            await client.del(CACHE_KEYS.DOCTOR_PROFILE(doctorId));
        } catch {
            // Fail silently
        }
    }
}

module.exports = new CacheService();