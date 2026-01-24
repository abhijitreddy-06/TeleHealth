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

        // Check if request expects JSON
        const acceptHeader = req.get('Accept') || '';
        const isAjax = req.xhr || acceptHeader.includes('application/json');

        if (isAjax) {
            return res.json({ success: true, message: 'Appointment booked successfully!' });
        }

        res.redirect("/user_video_dashboard");

    } catch (err) {
        console.error("Appointment booking error:", err.message);

        const acceptHeader = req.get('Accept') || '';
        const isAjax = req.xhr || acceptHeader.includes('application/json');

        if (isAjax) {
            return res.status(400).json({ success: false, error: err.message });
        }

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

// Cancel appointment (for both user and doctor)
router.post("/api/appointments/:id/cancel", authenticate, async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await appointmentService.cancelAppointment(
            req.params.id,
            req.user.id,
            req.user.role,
            reason
        );
        res.json(result);
    } catch (err) {
        console.error("Cancel appointment error:", err);

        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Cannot cancel') || err.message.includes('already cancelled')) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: err.message || 'Failed to cancel appointment' });
    }
});

// Get cancelled appointments history
router.get("/api/appointments/cancelled", authenticate, async (req, res) => {
    try {
        const appointments = await appointmentService.getCancelledAppointments(req.user.id, req.user.role);
        res.json(appointments);
    } catch (err) {
        console.error("Get cancelled appointments error:", err);
        res.status(500).json({ error: "Failed to load cancelled appointments" });
    }
});


module.exports = router;