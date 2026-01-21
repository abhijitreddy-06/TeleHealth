const path = require('path');
require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require('express-rate-limit');
const config = require('./config');
const { initializeDatabase, testConnection, cleanupExpiredTokens } = require('./config/database');
const routes = require('./routes');

// Initialize app
const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const PROJECT_ROOT = path.join(__dirname, '..');

// JWT Configuration
const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    console.error("❌ JWT secrets must be set in environment variables");
    process.exit(1);
}

// ============================================
// CORS Configuration
// ============================================
const corsOptions = {
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL, 'https://telehealth-production.onrender.com']
        : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
};
app.use(cors(corsOptions));

// ============================================
// SECURITY MIDDLEWARE (Helmet with CSP)
// ============================================
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "'unsafe-eval'",
                "https://cdnjs.cloudflare.com",
                "https://maps.googleapis.com",
                "https://maps.gstatic.com",
                "https://unpkg.com",
                "https://*.googleapis.com",
                "https://*.gstatic.com",
                "https://cdn.socket.io"
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com",
                "https://maps.googleapis.com",
                "https://*.googleapis.com"
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com",
                "https://fonts.googleapis.com",
                "data:"
            ],
            imgSrc: [
                "'self'",
                "data:",
                "blob:",
                "https:",
                "http:",
                "*",
                "https://*.googleapis.com",
                "https://*.gstatic.com",
                "https://maps.gstatic.com",
                "https://*.ggpht.com"
            ],
            connectSrc: [
                "'self'",
                "https://api.mapbox.com",
                "https://events.mapbox.com",
                "https://maps.googleapis.com",
                "https://*.googleapis.com",
                "https://abhijit75-clinical-bert-ai.hf.space",
                "wss://*",
                "ws://*",
                "http://localhost:10000",
                "ws://localhost:10000",
                "http://localhost:8080",
                "ws://localhost:8080"
            ],
            frameSrc: [
                "'self'",
                "https://www.google.com",
                "https://maps.google.com",
                "https://maps.googleapis.com",
                "https://*.google.com",
                "https://*.googleapis.com"
            ],
            mediaSrc: ["'self'", "blob:", "data:"],
            objectSrc: ["'none'"],
            workerSrc: ["'self'", "blob:"],
            childSrc: ["'self'", "blob:"],
            frameAncestors: ["'self'"],
            formAction: ["'self'"],
            baseUri: ["'self'"],
            manifestSrc: ["'self'"]
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
    hsts: false
}));

// ============================================
// RATE LIMITING
// ============================================
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use('/api/auth/', apiLimiter);
app.use('/api/appointments/', apiLimiter);
app.use('/api/ai/', apiLimiter);

// ============================================
// BODY PARSING & COOKIES
// ============================================
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================
// AUTH MIDDLEWARE FOR REQUESTS
// ============================================
app.use((req, res, next) => {
    // Add user info to request for socket handshake
    if (req.cookies.accessToken) {
        try {
            const payload = jwt.verify(req.cookies.accessToken, ACCESS_TOKEN_SECRET);
            req.user = payload;
        } catch (err) {
            // Token invalid, skip
            console.log('Token verification failed:', err.message);
        }
    }
    next();
});

// ============================================
// STATIC FILES (MUST COME BEFORE ROUTES!)
// ============================================
app.use(express.static(path.join(PROJECT_ROOT, 'public')));

// ============================================
// VIEW ENGINE SETUP
// ============================================
app.set("view engine", "ejs");
app.set("views", path.join(PROJECT_ROOT, "views"));
app.set('trust proxy', 1);
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 2); // Trust up to 2 proxies in production
}

// ============================================
// ROUTES
// ============================================
app.use(routes);  // This includes all routes from src/routes/index.js

// ============================================
// SOCKET.IO SERVER SETUP
// ============================================
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? [process.env.FRONTEND_URL, 'https://telehealth-production.onrender.com']
            : ['http://localhost:3000', 'http://localhost:8080', 'http://localhost:10000'],
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,
    pingTimeout: 60000,
    pingInterval: 25000,
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true
    }
});

// ============================================
// SOCKET.IO AUTHENTICATION MIDDLEWARE
// ============================================
io.use(async (socket, next) => {
    try {
        // Get token from handshake auth or cookies
        let token = socket.handshake.auth.token;

        // If not in auth, check cookies
        if (!token) {
            const cookieHeader = socket.handshake.headers.cookie;
            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
                    const [key, value] = cookie.trim().split('=');
                    acc[key] = value;
                    return acc;
                }, {});
                token = cookies.accessToken;
            }
        }

        console.log('Socket auth attempt, token exists:', !!token);

        if (!token) {
            // For video calls, we might allow connection without token initially
            // but will check in join-room event
            console.log('No token provided for socket connection');
            socket.user = null;
            return next();
        }

        // Verify token
        const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
        socket.user = {
            id: payload.id,
            role: payload.role,
            phone: payload.phone
        };

        console.log('Socket authenticated:', socket.user.role, socket.user.id);
        next();
    } catch (error) {
        console.error('Socket auth error:', error.message);
        // For video calls, allow connection but mark as unauthenticated
        socket.user = null;
        next();
    }
});

// ============================================
// IMPORT AND INITIALIZE VIDEO SOCKET HANDLER
// ============================================
require('./sockets/videoSocket')(io);

// ============================================
// FIX FOR MIXED HTML/EJS ROUTES
// ============================================
app.get('/predict', (req, res) => {
    const htmlPath = path.join(PROJECT_ROOT, 'public', 'pages', 'predict.html');
    const fs = require('fs');

    if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
    } else {
        res.render('predict');
    }
});

// ============================================
// 404 HANDLER (MUST BE LAST!)
// ============================================
app.use((req, res) => {
    console.log(`❌ 404: ${req.url} not found`);
    res.status(404).sendFile(path.join(PROJECT_ROOT, 'public', 'pages', '404.html'));
});

// ============================================
// ERROR HANDLER (For API errors)
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
});

// ============================================
// START SERVER
// ============================================
async function startServer() {
    try {
        await testConnection();
        await initializeDatabase();

        // Start token cleanup interval
        setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

        server.listen(PORT, HOST, () => {
            console.log(`✅ Server running on http://${HOST}:${PORT}`);
            console.log(`✅ Socket.IO ready on ws://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, server, io };