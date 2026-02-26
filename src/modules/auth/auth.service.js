const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const config = require('../../config');
const { getClient } = require('../../config/redis');
const AuthModel = require('./auth.model');
const { AppError, AuthError, ValidationError } = require('../../utils/AppError');

class AuthService {
    validatePassword(password) {
        if (!password || password.length < 6) {
            throw new ValidationError('Password must be at least 6 characters');
        }
    }

    validatePasswordMatch(password, confirmPassword) {
        if (password !== confirmPassword) {
            throw new ValidationError('Passwords must match');
        }
    }

    async register(phone, password, role) {
        const phoneInUse = await AuthModel.findByPhoneAnyRole(phone);
        if (phoneInUse) throw new AppError('An account with this phone number already exists', 409);

        const hash = await bcrypt.hash(password, 10);
        return AuthModel.createUser(phone, hash, role);
    }

    async authenticate(phone, password, role) {
        const user = await AuthModel.findByPhone(phone, role);

        const valid = user ? await bcrypt.compare(password, user.password) : false;
        if (!user || !valid) throw new AuthError('Invalid credentials');

        return { id: user.id, phone: user.phone, role };
    }

    async generateTokens(user) {
        const accessToken = jwt.sign(
            { id: user.id, role: user.role },
            config.ACCESS_TOKEN_SECRET,
            { expiresIn: config.ACCESS_TOKEN_EXPIRY }
        );

        const refreshToken = jwt.sign(
            { id: user.id, role: user.role, type: 'refresh' },
            config.REFRESH_TOKEN_SECRET,
            { expiresIn: config.REFRESH_TOKEN_EXPIRY }
        );

        await AuthModel.storeRefreshToken(
            user.id, user.role, refreshToken,
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );

        return { accessToken, refreshToken };
    }

    async verifyAccessToken(token) {
        const payload = jwt.verify(token, config.ACCESS_TOKEN_SECRET);

        const isBlacklisted = await this._isTokenBlacklisted(token);
        if (isBlacklisted) throw new AuthError('Token revoked');

        return payload;
    }

    async verifyRefreshToken(refreshToken) {
        const payload = jwt.verify(refreshToken, config.REFRESH_TOKEN_SECRET);
        if (payload.type !== 'refresh') throw new AuthError('Invalid token type');

        const stored = await AuthModel.findValidRefreshToken(refreshToken, payload.id, payload.role);
        if (!stored) throw new AuthError('Invalid or revoked refresh token');

        const user = await AuthModel.findUserById(payload.id, payload.role);
        if (!user) throw new AuthError('User not found');

        return { id: payload.id, phone: user.phone, role: payload.role };
    }

    async revokeRefreshToken(token) {
        await AuthModel.revokeToken(token);
    }

    async revokeAllUserTokens(userId, role) {
        await AuthModel.revokeAllUserTokens(userId, role);
    }

    async blacklistAccessToken(token) {
        try {
            const client = await getClient();
            if (!client) return;

            const payload = jwt.decode(token);
            if (!payload || !payload.exp) return;

            const ttl = payload.exp - Math.floor(Date.now() / 1000);
            if (ttl <= 0) return;

            await client.set(`bl:${token}`, '1', { EX: ttl });
        } catch (err) { /* non-critical */ }
    }

    async _isTokenBlacklisted(token) {
        try {
            const client = await getClient();
            if (!client) return false;

            const result = await client.get(`bl:${token}`);
            return result !== null;
        } catch (err) {
            return false;
        }
    }
}

module.exports = new AuthService();
