const authService = require('./auth.service');
const config = require('../../config');
const catchAsync = require('../../utils/catchAsync');
const escapeHtml = require('../../utils/escapeHtml');

function setTokenCookies(res, tokens) {
    res.cookie('accessToken', tokens.accessToken, config.accessTokenCookieOptions);
    res.cookie('refreshToken', tokens.refreshToken, config.refreshTokenCookieOptions);
}

function clearAuthCookies(res) {
    res.clearCookie('accessToken', config.clearCookieOptions);
    res.clearCookie('refreshToken', config.clearCookieOptions);
}

exports.userSignup = async (req, res, next) => {
    const { phone, password, confirmpassword } = req.body;

    try {
        authService.validatePassword(password);
        authService.validatePasswordMatch(password, confirmpassword);

        const user = await authService.register(phone, password, 'user');
        const tokens = await authService.generateTokens(user);

        setTokenCookies(res, tokens);
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.redirect('/user_profile');
    } catch (err) {
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/user_signup'</script>`);
    }
};

exports.userLogin = async (req, res, next) => {
    const { phone, password } = req.body;

    try {
        const user = await authService.authenticate(phone, password, 'user');
        const tokens = await authService.generateTokens(user);

        setTokenCookies(res, tokens);
        res.redirect('/user_home');
    } catch (err) {
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/user_login'</script>`);
    }
};

exports.docSignup = async (req, res, next) => {
    const { phone, password, confirmpassword } = req.body;

    try {
        authService.validatePassword(password);
        authService.validatePasswordMatch(password, confirmpassword);

        const doctor = await authService.register(phone, password, 'doctor');
        const tokens = await authService.generateTokens(doctor);

        setTokenCookies(res, tokens);
        res.setHeader('Cache-Control', 'no-cache, no-store');
        res.redirect('/doc_profile');
    } catch (err) {
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/doc_signup'</script>`);
    }
};

exports.docLogin = async (req, res, next) => {
    const { phone, password } = req.body;

    try {
        const doctor = await authService.authenticate(phone, password, 'doctor');
        const tokens = await authService.generateTokens(doctor);

        setTokenCookies(res, tokens);
        res.redirect('/doc_home');
    } catch (err) {
        res.send(`<script>alert('${escapeHtml(err.message)}');location='/doc_login'</script>`);
    }
};

exports.logout = catchAsync(async (req, res) => {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    if (accessToken) {
        await authService.blacklistAccessToken(accessToken);
    }

    if (refreshToken) {
        try {
            const user = await authService.verifyRefreshToken(refreshToken);
            await authService.revokeAllUserTokens(user.id, user.role);
        } catch (err) {
            // Token already invalid - still clear cookies
        }
    }

    clearAuthCookies(res);
    res.redirect('/role');
});

exports.refreshToken = catchAsync(async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    const user = await authService.verifyRefreshToken(refreshToken);
    await authService.revokeRefreshToken(refreshToken);
    const tokens = await authService.generateTokens(user);

    setTokenCookies(res, tokens);
    res.json({ success: true });
});
