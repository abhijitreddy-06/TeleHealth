const path = require('path');
require('dotenv').config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const cors = require("cors");
const rateLimit = require('express-rate-limit');
const { initializeDatabase, testConnection, cleanupExpiredTokens } = require('./config/database');
const routes = require('./routes');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 10000;
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';
const PROJECT_ROOT = path.join(__dirname, '..');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
    console.error("JWT secrets must be set in environment variables");
    process.exit(1);
}

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

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP'
});
app.use('/api/auth/', apiLimiter);
app.use('/api/appointments/', apiLimiter);
app.use('/api/ai/', apiLimiter);
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.use((req, res, next) => {
    if (req.cookies.accessToken) {
        try {
            const payload = jwt.verify(req.cookies.accessToken, ACCESS_TOKEN_SECRET);
            req.user = payload;
        } catch (err) {
            console.log('Token verification failed:', err.message);
        }
    }
    next();
});

app.use(express.static(path.join(PROJECT_ROOT, 'public')));

app.set("view engine", "ejs");
app.set("views", path.join(PROJECT_ROOT, "views"));
app.set('trust proxy', 1);
if (process.env.NODE_ENV === 'production') {
    app.set('trust proxy', 2); 
}

app.use(routes);  

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
        maxDisconnectionDuration: 2 * 60 * 1000, 
        skipMiddlewares: true
    }
});

io.use(async (socket, next) => {
    try {
        let token = socket.handshake.auth.token;

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

        if (!token) {
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
        next();
    } catch (error) {
        socket.user = null;
        next();
    }
});

require('./sockets/videoSocket')(io);

app.use((req, res) => {
    console.log(`❌ 404: ${req.url} not found`);
    res.status(404).sendFile(path.join(PROJECT_ROOT, 'public', 'pages', '404.html'));
});

app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.stack);
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
        stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
});

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