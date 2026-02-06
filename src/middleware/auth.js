const jwt = require('jsonwebtoken');
const config = require('../config');
const authService = require('../services/auth.service');

class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
    }
}

class AuthError extends AppError {
    constructor(message) {
        super(message, 401);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

async function generateTokens(user) {
    return authService.generateTokens(user);
}

async function revokeRefreshToken(token) {
    return authService.revokeRefreshToken(token);
}

async function revokeAllUserTokens(userId, role) {
    return authService.revokeAllUserTokens(userId, role);
}

function clearAuthCookies(res) {
    res.clearCookie("accessToken", config.clearCookieOptions);
    res.clearCookie("refreshToken", config.clearCookieOptions);
}

async function authenticate(req, res, next) {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
        return res.redirect("/role");
    }

    try {
        const payload = await authService.verifyAccessToken(accessToken);
        req.user = { id: payload.id, role: payload.role, phone: payload.phone };
        next();
    } catch (accessTokenError) {
        if (!refreshToken) {
            clearAuthCookies(res);
            return res.redirect("/role");
        }
        await handleRefreshToken(req, res, next, refreshToken);
    }
}

async function handleRefreshToken(req, res, next, refreshToken) {
    try {
        const user = await authService.verifyRefreshToken(refreshToken);
        await authService.revokeRefreshToken(refreshToken);
        const tokens = await authService.generateTokens(user);

        res.cookie("accessToken", tokens.accessToken, config.accessTokenCookieOptions);
        res.cookie("refreshToken", tokens.refreshToken, config.refreshTokenCookieOptions);
        req.user = user;
        next();
    } catch (error) {
        clearAuthCookies(res);
        return res.redirect("/role");
    }
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.redirect("/role");
        }
        next();
    };
}

async function blockAfterLogin(req, res, next) {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) return next();

    try {

        if (accessToken) {
            try {
                const payload = jwt.verify(accessToken, config.ACCESS_TOKEN_SECRET);
                return redirectBasedOnRole(res, payload.role);
            } catch (accessError) {

            }
        }


        if (refreshToken) {
            try {
                const user = await authService.verifyRefreshToken(refreshToken);
                await authService.revokeRefreshToken(refreshToken);
                const tokens = await authService.generateTokens(user);

                res.cookie("accessToken", tokens.accessToken, config.accessTokenCookieOptions);
                res.cookie("refreshToken", tokens.refreshToken, config.refreshTokenCookieOptions);

                return redirectBasedOnRole(res, user.role);
            } catch (refreshError) {

                clearAuthCookies(res);
                return next();
            }
        }

        return next();
    } catch {
        return next();
    }
}

function redirectBasedOnRole(res, role) {
    return res.redirect(role === "doctor" ? "/doc_home" : "/user_home");
}

async function getUserAppointment(userId, role) {
    const appointmentService = require('../services/appointment.service');
    return appointmentService.getUserActiveAppointment(userId, role);
}

module.exports = {
    AppError,
    AuthError,
    ValidationError,
    generateTokens,
    revokeRefreshToken,
    revokeAllUserTokens,
    clearAuthCookies,
    authenticate,
    handleRefreshToken,
    authorize,
    blockAfterLogin,
    redirectBasedOnRole,
    getUserAppointment
};