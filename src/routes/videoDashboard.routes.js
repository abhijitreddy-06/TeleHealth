const express = require('express');
const router = express.Router();
const appointmentService = require('../services/appointment.service');
const { authenticate, authorize } = require('../middleware/auth');
const videoService = require('../services/video.service');

const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

router.get("/doc_video_dashboard", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'doctor');
        const allAppointments = await appointmentService.getDoctorAllAppointments(req.user.id);
        const hasAppointment = !!appointment;

        res.render("doc_video_dashboard", {
            appointment: appointment,
            hasAppointment: hasAppointment,
            allAppointments: allAppointments
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Internal Server Error</h1>
                    <p>${escapeHtml(err.message)}</p>
                    <a href="/doc_home">Go back to home</a>
                </body>
            </html>
        `);
    }
});

router.post("/appointments/:appointmentId/start", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const doctorId = req.user.id;

        const roomId = await videoService.startVideoCall(appointmentId, doctorId);

        res.json({
            success: true,
            roomId: roomId
        });

    } catch (err) {
        console.error("Error starting video call:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});
router.get("/user_video_dashboard", authenticate, authorize("user"), async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'user');
        const hasAppointment = !!appointment;

        res.render("user_video_dashboard", {
            appointment: appointment,
            hasAppointment: hasAppointment
        });

    } catch (err) {
        console.error(err);
        res.status(500).send(`
            <html>
                <body>
                    <h1>Internal Server Error</h1>
                    <p>${escapeHtml(err.message)}</p>
                    <a href="/user_home">Go back to home</a>
                </body>
            </html>
        `);
    }
});

module.exports = router;