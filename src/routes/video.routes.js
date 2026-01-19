const express = require('express');
const router = express.Router();
const videoService = require('../services/video.service');
const { authenticate, authorize } = require('../middleware/auth');

router.get("/user_video/:roomId", authenticate, authorize("user"), async (req, res) => {
    try {
        const appointment = await videoService.validateVideoRoom(req.params.roomId, req.user.id);

        res.render("user_video", {
            roomId: req.params.roomId,
            appointmentId: appointment.id
        });
    } catch (err) {
        console.error("User video route error:", err);
        res.send(err.message || "Invalid or expired video session");
    }
});

router.get("/doc_video/:roomId", authenticate, authorize("doctor"), async (req, res) => {
    const { roomId } = req.params;

    try {
        const appointment = await videoService.validateVideoRoom(roomId, req.user.id);

        res.render("doc_video", {
            roomId,
            appointment: { id: appointment.id }
        });
    } catch (err) {
        console.error("Doctor video route error:", err);
        res.status(404).send(err.message || "Appointment not found");
    }
});

module.exports = router;