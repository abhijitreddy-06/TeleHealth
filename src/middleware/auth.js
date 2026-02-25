const jwt = require('jsonwebtoken');
const config = require('../config');
const authService = require('../modules/auth/auth.service');

function clearAuthCookies(res) {
    res.clearCookie("accessToken", config.clearCookieOptions);
    res.clearCookie("refreshToken", config.clearCookieOptions);
}

function isApiRequest(req) {
    return req.xhr ||
        (req.headers.accept && req.headers.accept.includes('application/json')) ||
        req.path.startsWith('/api/') ||
        req.headers['content-type']?.includes('application/json');
}

function sendAuthError(req, res, status, message) {
    if (isApiRequest(req)) {
        return res.status(status).json({ success: false, error: message });
    }
    return res.redirect("/role");
}

async function authenticate(req, res, next) {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (!accessToken && !refreshToken) {
        return sendAuthError(req, res, 401, 'Authentication required');
    }

    try {
        const payload = await authService.verifyAccessToken(accessToken);
        req.user = { id: payload.id, role: payload.role };
        next();
    } catch (accessTokenError) {
        if (!refreshToken) {
            clearAuthCookies(res);
            return sendAuthError(req, res, 401, 'Session expired. Please log in again.');
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
        req.user = { id: user.id, role: user.role };
        next();
    } catch (error) {
        clearAuthCookies(res);
        return sendAuthError(req, res, 401, 'Session expired. Please log in again.');
    }
}

function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return sendAuthError(req, res, 403, 'Access denied');
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
                const payload = await authService.verifyAccessToken(accessToken);
                return redirectBasedOnRole(res, payload.role);
            } catch (accessError) {
                // Token invalid - try refresh
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
    if (role === 'admin') return res.redirect('/admin/dashboard');
    return res.redirect(role === "doctor" ? "/doc_home" : "/user_home");
}

module.exports = {
    clearAuthCookies,
    authenticate,
    handleRefreshToken,
    authorize,
    blockAfterLogin,
    redirectBasedOnRole
};