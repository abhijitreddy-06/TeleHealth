const path = require('path');
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const routes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PROJECT_ROOT = path.join(__dirname, '..');

// --- Trust Proxy (MUST be before rate limiter) ---
app.set('trust proxy', config.NODE_ENV === 'production' ? 2 : 1);

// --- Security Headers (Helmet) ---
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdn.socket.io",
                "https://cdn.jsdelivr.net",
                "https://cdnjs.cloudflare.com"
            ],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https://*.supabase.co",
                "https://images.unsplash.com"
            ],
            connectSrc: [
                "'self'",
                "wss:",
                "ws:",
                ...(config.NODE_ENV === 'production' && config.FRONTEND_URL
                    ? [config.FRONTEND_URL] : ['http://localhost:*'])
            ],
            mediaSrc: ["'self'", "blob:"],
            frameSrc: ["'self'", "https://www.google.com"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null
        }
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    xContentTypeOptions: true,
    xXssProtection: true,
    frameguard: { action: 'deny' },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// --- Gzip Compression ---
app.use(compression());

// --- CORS ---
app.use(cors(config.corsOptions));

// --- Rate Limiting ---
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP',
    standardHeaders: true,
    legacyHeaders: false
});

app.use('/user_signup', authLimiter);
app.use('/user_login', authLimiter);
app.use('/doc_signup', authLimiter);
app.use('/doc_login', authLimiter);
app.use('/api/refresh-token', authLimiter);
app.use('/api/appointments/', apiLimiter);
app.use('/api/ai/', apiLimiter);

// --- Body Parsing (1MB limit) ---
app.use(bodyParser.json({ limit: '1mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '1mb' }));
app.use(cookieParser());

// --- Soft JWT Decode (non-blocking) ---
app.use((req, res, next) => {
    if (req.cookies.accessToken) {
        try {
            const payload = jwt.verify(req.cookies.accessToken, config.ACCESS_TOKEN_SECRET);
            req.user = { id: payload.id, role: payload.role };
        } catch (err) {
            // Token invalid -- not an error, just not authenticated
        }
    }
    next();
});

// --- Static Files & View Engine ---
app.use(express.static(path.join(PROJECT_ROOT, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(PROJECT_ROOT, 'views'));

// --- Health Check ---
app.get('/health', async (req, res) => {
    const checks = { server: true, database: false, redis: false, timestamp: new Date().toISOString() };

    try {
        await config.pool.query('SELECT 1');
        checks.database = true;
    } catch (err) { /* noop */ }

    try {
        const redisClient = await config.getClient();
        if (redisClient) {
            await redisClient.ping();
            checks.redis = true;
        }
    } catch (err) { /* noop */ }

    const isHealthy = checks.server && checks.database;
    res.status(isHealthy ? 200 : 503).json({ status: isHealthy ? 'healthy' : 'degraded', checks });
});

// --- Routes ---
app.use(routes);

// --- Error Handling ---
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
