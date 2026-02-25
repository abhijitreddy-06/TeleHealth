require('dotenv').config();

const { pool, testConnection, cleanupExpiredTokens } = require('./database');
const { getClient } = require('./redis');
const supabaseService = require('./supabase');
const { upload, createCleanupMiddleware } = require('./upload');
const { socketConfig } = require('./socket');

const PORT = process.env.PORT || 10000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const HOST = NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const FRONTEND_URL = process.env.FRONTEND_URL;

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    throw new Error('ACCESS_TOKEN_SECRET (or JWT_SECRET) and REFRESH_TOKEN_SECRET must both be set');
}
if (ACCESS_TOKEN_SECRET === REFRESH_TOKEN_SECRET) {
    console.warn('WARNING: ACCESS and REFRESH token secrets should be different for security');
}
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRE_MINUTES
    ? `${process.env.ACCESS_TOKEN_EXPIRE_MINUTES}m` : '15m';
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRE_DAYS
    ? `${process.env.REFRESH_TOKEN_EXPIRE_DAYS}d` : '7d';

const accessTokenCookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/',
    maxAge: 15 * 60 * 1000
};

const refreshTokenCookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
};

const clearCookieOptions = {
    httpOnly: true,
    secure: NODE_ENV === 'production',
    sameSite: NODE_ENV === 'production' ? 'None' : 'Lax',
    path: '/'
};

const corsOptions = {
    origin: NODE_ENV === 'production'
        ? [FRONTEND_URL, 'https://telehealth-production.onrender.com'].filter(Boolean)
        : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    maxAge: 600
};

module.exports = {
    // Server
    PORT, NODE_ENV, HOST, FRONTEND_URL, corsOptions,
    // Auth / JWT
    ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET,
    ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY,
    accessTokenCookieOptions, refreshTokenCookieOptions, clearCookieOptions,
    // Database
    pool, testConnection, cleanupExpiredTokens,
    // Redis
    getClient,
    // Supabase
    supabaseService,
    // Upload
    upload, createCleanupMiddleware,
    // Socket
    socketConfig
};
