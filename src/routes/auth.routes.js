const express = require('express');
const router = express.Router();
const authService = require('../services/auth.service');
const { clearAuthCookies } = require('../middleware/auth');
const { accessTokenCookieOptions, refreshTokenCookieOptions } = require('../config/auth');

const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

router.post("/user_signup", async (req, res) => {
    const { phone, password, confirmpassword } = req.body;

    try {
        await authService.validatePassword(password);
        await authService.validatePasswordMatch(password, confirmpassword);

        const user = await authService.registerUser(phone, password, 'user');
        const tokens = await authService.generateTokens(user);

        res.cookie("accessToken", tokens.accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.redirect("/user_profile");

    } catch (err) {
        console.error(err);
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/user_signup'</script>`);
    }
});

router.post("/user_login", async (req, res) => {
    const { phone, password } = req.body;

    try {
        const user = await authService.authenticateUser(phone, password, 'user');
        const tokens = await authService.generateTokens(user);

        res.cookie("accessToken", tokens.accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

        res.redirect('/user_home');

    } catch (err) {
        console.error(err);
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/user_login'</script>`);
    }
});

router.post("/doc_signup", async (req, res) => {
    const { phone, password, confirmpassword } = req.body;

    try {
        await authService.validatePassword(password);
        await authService.validatePasswordMatch(password, confirmpassword);

        const doctor = await authService.registerUser(phone, password, 'doctor');
        const tokens = await authService.generateTokens(doctor);

        res.cookie("accessToken", tokens.accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.redirect("/doc_profile");

    } catch (err) {
        console.error(err);
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/doc_signup'</script>`);
    }
});

router.post("/doc_login", async (req, res) => {
    const { phone, password } = req.body;

    try {
        const doctor = await authService.authenticateUser(phone, password, 'doctor');
        const tokens = await authService.generateTokens(doctor);

        res.cookie("accessToken", tokens.accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

        res.redirect('/doc_home');

    } catch (err) {
        console.error(err);
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/doc_login'</script>`);
    }
});

router.get("/logout", async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (refreshToken) {
        try {
            const jwt = require('jsonwebtoken');
            const decoded = jwt.decode(refreshToken);
            if (decoded) {
                await authService.revokeAllUserTokens(decoded.id, decoded.role);
            }
        } catch (error) {
            console.error("Error revoking tokens on logout:", error);
        }
    }

    clearAuthCookies(res);
    res.redirect("/role");
});

router.post("/api/refresh-token", async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ error: "Refresh token required" });
    }

    try {
        const user = await authService.verifyRefreshToken(refreshToken);
        await authService.revokeRefreshToken(refreshToken);
        const tokens = await authService.generateTokens(user);

        res.cookie("accessToken", tokens.accessToken, accessTokenCookieOptions);
        res.cookie("refreshToken", tokens.refreshToken, refreshTokenCookieOptions);

        return res.json({ success: true });

    } catch (error) {
        clearAuthCookies(res);
        return res.status(401).json({ error: "Invalid refresh token" });
    }
});

module.exports = router;