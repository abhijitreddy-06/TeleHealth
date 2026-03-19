const express = require('express');
const router = express.Router();
const videoService = require('../services/video.service');
const { authenticate, authorize } = require('../middleware/auth');

router.post("/api/notes/save", authenticate, authorize("doctor"), async (req, res) => {
    const { roomId, notes } = req.body;

    if (!roomId) {
        return res.status(400).json({ message: "roomId required", error: "roomId required" });
    }

    try {
        await videoService.saveCallNotes(roomId, req.user.id, notes);
        res.json({ success: true, data: null, error: null, message: 'Notes saved successfully' });
    } catch (err) {
        console.error("Save notes error:", err);
        res.status(500).json({
            message: err.message || "Failed to save notes",
            error: err.message || "Failed to save notes"
        });
    }
});

module.exports = router;