const authService = require('./auth.service');
const config = require('../../config');
const catchAsync = require('../../utils/catchAsync');

function setTokenCookies(res, tokens) {
    const req = res.req;
    res.cookie('accessToken', tokens.accessToken, config.getAccessTokenCookieOptions(req));
    res.cookie('refreshToken', tokens.refreshToken, config.getRefreshTokenCookieOptions(req));
}

function clearAuthCookies(res) {
    const req = res.req;
    res.clearCookie('accessToken', config.getClearCookieOptions(req));
    res.clearCookie('refreshToken', config.getClearCookieOptions(req));
}

exports.userSignup = async (req, res, next) => {
    const { phone, password, confirmpassword } = req.body;

    try {
        authService.validatePassword(password);
        authService.validatePasswordMatch(password, confirmpassword);

        const user = await authService.register(phone, password, 'user');
        const tokens = await authService.generateTokens(user);
        const authState = await authService.getPostAuthState(user.id, user.role);

        setTokenCookies(res, tokens);
        res.setHeader('Cache-Control', 'no-cache, no-store');

        return res.json({
            success: true,
            message: 'Account created successfully',
            ...authState,
            redirect: authState.profileCreatePath
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

exports.userLogin = async (req, res, next) => {
    const { phone, password } = req.body;

    try {
        const user = await authService.authenticate(phone, password, 'user');
        const tokens = await authService.generateTokens(user);
        const authState = await authService.getPostAuthState(user.id, user.role);

        setTokenCookies(res, tokens);

        return res.json({ success: true, role: authState.role, ...authState });
    } catch (err) {
        return res.status(401).json({ error: err.message });
    }
};

exports.docSignup = async (req, res, next) => {
    const { phone, password, confirmpassword } = req.body;

    try {
        authService.validatePassword(password);
        authService.validatePasswordMatch(password, confirmpassword);

        const doctor = await authService.register(phone, password, 'doctor');
        const tokens = await authService.generateTokens(doctor);
        const authState = await authService.getPostAuthState(doctor.id, doctor.role);

        setTokenCookies(res, tokens);
        res.setHeader('Cache-Control', 'no-cache, no-store');

        return res.json({
            success: true,
            message: 'Account created successfully',
            ...authState,
            redirect: authState.profileCreatePath
        });
    } catch (err) {
        return res.status(400).json({ error: err.message });
    }
};

exports.docLogin = async (req, res, next) => {
    const { phone, password } = req.body;

    try {
        const doctor = await authService.authenticate(phone, password, 'doctor');
        const tokens = await authService.generateTokens(doctor);
        const authState = await authService.getPostAuthState(doctor.id, doctor.role);

        setTokenCookies(res, tokens);

        return res.json({ success: true, role: authState.role, ...authState });
    } catch (err) {
        return res.status(401).json({ error: err.message });
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
    res.json({ success: true, message: 'Logged out successfully' });
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

exports.getSession = catchAsync(async (req, res) => {
    const accessToken = req.cookies.accessToken;
    const refreshToken = req.cookies.refreshToken;

    res.setHeader('Cache-Control', 'no-store');

    if (!accessToken && !refreshToken) {
        return res.json({ authenticated: false });
    }

    let user = null;

    if (accessToken) {
        try {
            const payload = await authService.verifyAccessToken(accessToken);
            user = { id: payload.id, role: payload.role };
        } catch (err) {
            user = null;
        }
    }

    if (!user && refreshToken) {
        try {
            user = await authService.verifyRefreshToken(refreshToken);
            await authService.revokeRefreshToken(refreshToken);
            const tokens = await authService.generateTokens(user);
            setTokenCookies(res, tokens);
        } catch (err) {
            clearAuthCookies(res);
            return res.json({ authenticated: false });
        }
    }

    if (!user) {
        clearAuthCookies(res);
        return res.json({ authenticated: false });
    }

    const authState = await authService.getPostAuthState(user.id, user.role);

    return res.json({
        authenticated: true,
        userId: user.id,
        ...authState
    });
});
