const express = require('express');
const router = express.Router();
const videoService = require('../services/video.service');
const { authenticate, authorize } = require('../middleware/auth');

router.get("/user/join-call/:appointmentId", authenticate, authorize("user"), async (req, res) => {
    try {
        const roomId = await videoService.joinVideoCall(req.params.appointmentId, req.user.id);
        res.redirect(`/user_video/${roomId}`);
    } catch (err) {
        console.error("Join call error:", err);
        res.send(err.message || "Unable to join call");
    }
});

module.exports = router;