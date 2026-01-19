const express = require('express');
const router = express.Router();
const fileService = require('../services/file.service');
const { authenticate, authorize } = require('../middleware/auth');
const { upload } = require('../config/upload');

// Upload file
router.post("/vault/upload", authenticate, authorize("user"), upload.single("file"), async (req, res) => {
    try {
        await fileService.validateFileUpload(req.file);

        const result = await fileService.uploadFile(
            req.user.id,
            req.file,
            req.body.recordType || "general"
        );

        // For MPA, redirect with success message
        res.send(`
            <script>
                alert("File uploaded successfully!");
                window.location.href = "/records";
            </script>
        `);

    } catch (err) {
        console.error(err);
        res.send(`
            <script>
                alert("Upload failed: ${err.message}");
                window.history.back();
            </script>
        `);
    }
});

// Get user files (API)
router.get("/api/vault/user", authenticate, authorize("user"), async (req, res) => {
    try {
        const files = await fileService.getUserFiles(req.user.id);
        res.json(files);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load records" });
    }
});

// Download file
router.get("/vault/file/:id", authenticate, async (req, res) => {
    try {
        const file = await fileService.checkFileAccess(req.params.id, req.user.id, req.user.role);
        res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
        res.redirect(file.file_path);

    } catch (err) {
        console.error(err);

        if (err.message.includes('not found')) {
            return res.status(404).send("File not found");
        }

        if (err.message.includes('Access denied')) {
            return res.status(403).send("Access denied");
        }

        res.status(500).send("Download failed");
    }
});

// API download endpoint
router.get("/api/vault/download/:id", authenticate, async (req, res) => {
    try {
        const file = await fileService.checkFileAccess(req.params.id, req.user.id, req.user.role);
        const fileData = await fileService.downloadFile(file);

        res.setHeader('Content-Type', fileData.contentType);
        res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
        res.setHeader('Content-Length', fileData.fileSize);
        res.send(fileData.buffer);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Download failed' });
    }
});

module.exports = router;