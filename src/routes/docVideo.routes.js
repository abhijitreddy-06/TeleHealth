const express = require('express');
const router = express.Router();
const videoService = require('../services/video.service');
const { authenticate, authorize } = require('../middleware/auth');

router.post("/doc/start-call/:appointmentId", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const roomId = await videoService.startVideoCall(req.params.appointmentId, req.user.id);
        res.redirect(`/doc_video/${roomId}`);
    } catch (err) {
        console.error("Start call error:", err);
        res.status(500).send(err.message || "Failed to start call");
    }
});

module.exports = router;