const multer = require('multer');
const { AppError } = require('../utils/AppError');
const logger = require('../utils/logger');
const path = require('path');

const PROJECT_ROOT = path.join(__dirname, '..', '..');

function errorHandler(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.isOperational = err.isOperational || false;

    if (err.statusCode >= 500) {
        logger.error(err.message, { stack: err.stack, url: req.originalUrl, method: req.method });
    } else {
        logger.warn(err.message, { statusCode: err.statusCode, url: req.originalUrl, method: req.method });
    }

    if (err instanceof multer.MulterError) {
        err.statusCode = 400;
        err.message = `File upload error: ${err.message}`;
        err.isOperational = true;
    }

    if (err.name === 'JsonWebTokenError') {
        err.statusCode = 401;
        err.message = 'Invalid token';
        err.isOperational = true;
    }

    if (err.name === 'TokenExpiredError') {
        err.statusCode = 401;
        err.message = 'Token expired';
        err.isOperational = true;
    }

    const message = err.isOperational ? err.message : 'Internal Server Error';

    const acceptHeader = req.get('Accept') || '';
    const isApiRequest = req.xhr || acceptHeader.includes('application/json') || req.path.startsWith('/api/');

    if (isApiRequest) {
        return res.status(err.statusCode).json({
            error: message,
            ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        });
    }

    res.status(err.statusCode).json({
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
}

function notFoundHandler(req, res) {
    logger.warn(`404: ${req.method} ${req.originalUrl}`);
    res.status(404).sendFile(path.join(PROJECT_ROOT, 'public', 'pages', '404.html'));
}

module.exports = { errorHandler, notFoundHandler };
