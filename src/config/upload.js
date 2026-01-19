const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(process.cwd(), 'temp_uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: uploadDir,
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        mimetype && extname ? cb(null, true) : cb(new Error('Only images, PDFs, and Word documents are allowed'));
    }
});

function createCleanupMiddleware() {
    return (req, res, next) => {
        const originalSend = res.send;
        res.send = function (data) {
            if (req.file?.path) {
                fs.unlink(req.file.path, (err) => {
                    if (err) console.error('Cleanup failed:', err.message);
                });
            }
            return originalSend.call(this, data);
        };
        next();
    };
}

module.exports = {
    upload,
    createCleanupMiddleware
};