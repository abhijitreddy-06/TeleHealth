const path = require('path');
require('dotenv').config();
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
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


// ============================================
// CORS Configuration
// ============================================
app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? [process.env.FRONTEND_URL, 'https://telehealth-production.onrender.com']
        : ['http://localhost:3000', 'http://localhost:8080'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie', 'X-Requested-With'],
    exposedHeaders: ['Set-Cookie']
}));

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
                "https://*.gstatic.com"
            ],
            scriptSrcAttr: ["'self'", "'unsafe-inline'", "'unsafe-hashes'"],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com",
                "https://maps.googleapis.com",
                "https://*.googleapis.com"
            ],
            scriptSrcAttr: ["'unsafe-inline'", "'unsafe-hashes'"],
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
                "ws://*"
            ],
            frameSrc: [
                "'self'",
                "https://www.google.com",
                "https://maps.google.com",
                "https://maps.googleapis.com",
                "https://*.google.com",
                "https://*.googleapis.com"
            ],
            mediaSrc: ["'self'", "blob:"],
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
// STATIC FILES (MUST COME BEFORE ROUTES!)
// ============================================
app.use(express.static(path.join(PROJECT_ROOT, 'public')));


app.set("view engine", "ejs");
app.set("views", path.join(PROJECT_ROOT, "views"));
app.set('trust proxy', 1);
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 2); // Trust up to 2 proxies in production
}

app.use(routes);  // This includes all routes from src/routes/index.js

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



// Socket.IO authentication
// io.use(async (socket, next) => {
//     try {
//         const token = socket.handshake.auth.token ||
//             socket.handshake.headers.cookie?.split(';')
//                 .find(c => c.trim().startsWith('accessToken='))
//                 ?.split('=')[1];

//         if (!token) {
//             return next(new Error("Authentication required"));
//         }

//         const jwt = require('jsonwebtoken');
//         const payload = jwt.verify(token, process.env.JWT_SECRET);
//         socket.user = {
//             id: payload.id,
//             role: payload.role,
//             phone: payload.phone
//         };
//         next();
//     } catch (error) {
//         next(new Error("Invalid token"));
//     }
// });
const io = new Server(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production'
            ? [process.env.FRONTEND_URL, 'https://telehealth-production.onrender.com']
            : ['http://localhost:3000', 'http://localhost:8080'],
        credentials: true,
        methods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type', 'Authorization']
    },
    transports: ['websocket', 'polling'],
    allowEIO3: true,  // Allow Engine.IO v3
    pingTimeout: 60000,
    pingInterval: 25000,
    connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true
    }
});
io.use(async (socket, next) => {
    try {
        // For video calls, we'll use room-based authentication
        // Allow connection and authenticate in the join-room event
        next();
    } catch (error) {
        next(new Error("Connection error"));
    }
});
    
// Import and initialize socket handlers
require('./sockets/videoSocket')(io);

// ============================================
// START SERVER
// ============================================
async function startServer() {
    try {

        await testConnection();
        await initializeDatabase();
        setInterval(cleanupExpiredTokens, 60 * 60 * 1000);

        server.listen(PORT, HOST, () => {
            console.log(`✅ Server running on http://${HOST}:${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = { app, server };