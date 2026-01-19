const express = require('express');
const router = express.Router();
const videoService = require('../services/video.service');
const { authenticate, authorize } = require('../middleware/auth');

router.post("/api/notes/save", authenticate, authorize("doctor"), async (req, res) => {
    const { roomId, notes } = req.body;

    if (!roomId) {
        return res.status(400).json({ error: "roomId required" });
    }

    try {
        await videoService.saveCallNotes(roomId, req.user.id, notes);
        res.sendStatus(200);
    } catch (err) {
        console.error("Save notes error:", err);
        res.status(500).json({ error: err.message || "Failed to save notes" });
    }
});

module.exports = router;