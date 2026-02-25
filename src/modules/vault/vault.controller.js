const vaultService = require('./vault.service');
const catchAsync = require('../../utils/catchAsync');
const escapeHtml = require('../../utils/escapeHtml');

exports.upload = async (req, res) => {
    try {
        vaultService.validateFileUpload(req.file);

        const result = await vaultService.uploadFile(
            req.user.id, req.file, req.body.recordType || 'general'
        );

        const acceptHeader = req.get('Accept') || '';
        const isAjax = req.xhr || acceptHeader.includes('application/json');

        if (isAjax) {
            return res.json({ success: true, fileId: result.id, message: 'File uploaded successfully!' });
        }

        res.send(`<script>alert("File uploaded successfully!");window.location.href="/records";</script>`);
    } catch (err) {
        console.error(err);

        const acceptHeader = req.get('Accept') || '';
        const isAjax = req.xhr || acceptHeader.includes('application/json');

        if (isAjax) {
            return res.status(400).json({ success: false, error: err.message });
        }

        res.send(`<script>alert("Upload failed: ${escapeHtml(err.message)}");window.history.back();</script>`);
    }
};

exports.listFiles = catchAsync(async (req, res) => {
    const files = await vaultService.getUserFiles(req.user.id);
    res.json(files);
});

exports.accessFile = async (req, res) => {
    try {
        const file = await vaultService.checkFileAccess(req.params.id, req.user.id, req.user.role);
        res.setHeader('Content-Disposition', `attachment; filename="${file.file_name}"`);
        res.redirect(file.file_path);
    } catch (err) {
        console.error(err);
        if (err.message.includes('not found')) return res.status(404).send('File not found');
        if (err.message.includes('Access denied')) return res.status(403).send('Access denied');
        res.status(500).send('Download failed');
    }
};

exports.downloadFile = catchAsync(async (req, res) => {
    const file = await vaultService.checkFileAccess(req.params.id, req.user.id, req.user.role);
    const fileData = await vaultService.downloadFile(file);

    res.setHeader('Content-Type', fileData.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileData.fileName}"`);
    res.setHeader('Content-Length', fileData.fileSize);
    res.send(fileData.buffer);
});

exports.deleteFile = async (req, res) => {
    try {
        await vaultService.deleteFile(req.params.id, req.user.id);
        res.json({ success: true, message: 'Record deleted successfully' });
    } catch (err) {
        console.error('Delete file error:', err);
        if (err.message.includes('not found')) {
            return res.status(404).json({ success: false, error: 'Record not found' });
        }
        res.status(500).json({ success: false, error: err.message || 'Failed to delete record' });
    }
};
