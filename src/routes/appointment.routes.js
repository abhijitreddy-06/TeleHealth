const express = require('express');
const router = express.Router();
const appointmentService = require('../services/appointment.service');
const { authenticate, authorize } = require('../middleware/auth');

const escapeHtml = (str) => {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
};

router.post("/appointments/book", authenticate, authorize("user"), async (req, res) => {
    try {
        await appointmentService.bookAppointment(
            req.user.id,
            req.body.doctorId,
            req.body.appointment_date,
            req.body.appointment_time
        );
        res.redirect("/user_video_dashboard");

    } catch (err) {
        console.error("Appointment booking error:", err.message);

        if (err.message.includes('already has an active appointment')) {
            return res.send(`
                <script>
                    alert("${escapeHtml(err.message)}");
                    window.location.href = "/appointments";
                </script>
            `);
        }

        res.status(500).send(`
            <script>
                alert("Error booking appointment. Please try again.");
                window.location.href = "/appointments";
            </script>
        `);
    }
});

router.get("/api/appointments/user", authenticate, authorize("user"), async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'user');
        res.json(appointment ? [appointment] : []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load appointments" });
    }
});

router.post("/appointments/:id/start", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const result = await appointmentService.startAppointment(req.params.id, req.user.id);
        res.json({ roomId: result.room_id });
    } catch (err) {
        console.error("Start appointment error:", err);
        res.status(400).json({ error: err.message });
    }
});

router.get("/api/appointments/doctor", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'doctor');
        res.json(appointment ? [appointment] : []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load appointment" });
    }
});

router.get("/api/doctors", authenticate, authorize("user"), async (req, res) => {
    try {
        const doctors = await appointmentService.getAvailableDoctors();
        res.json(doctors);
    } catch (err) {
        console.error("Fetch doctors error:", err);
        res.status(500).json({ error: "Failed to load doctors" });
    }
});

router.post("/appointments/:id/complete", authenticate, authorize("doctor"), async (req, res) => {
    try {
        await appointmentService.completeAppointment(req.params.id, req.user.id);
        res.sendStatus(200);
    } catch (err) {
        console.error("Complete appointment error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get("/api/appointments/:id/status", authenticate, async (req, res) => {
    try {
        const status = await appointmentService.getAppointmentStatus(req.params.id, req.user.id, req.user.role);
        res.json({ status });
    } catch (err) {
        console.error("Get appointment status error:", err);
        res.status(500).json({ error: err.message });
    }
});

router.get("/api/appointments/recent-prescription", authenticate, authorize("user"), async (req, res) => {
    try {
        const appointment = await appointmentService.getRecentCompletedAppointment(req.user.id);
        if (!appointment) {
            return res.status(404).json({ error: "No recent completed appointment found" });
        }
        res.json({ roomId: appointment.room_id, appointmentId: appointment.id });
    } catch (err) {
        console.error("Get recent prescription error:", err);
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;