const express = require('express');
const router = express.Router();
const appointmentService = require('../services/appointment.service');
const { authenticate, authorize } = require('../middleware/auth');

// Book appointment (form submission)
router.post("/appointments/book", authenticate, authorize("user"), async (req, res) => {
    try {
        await appointmentService.bookAppointment(
            req.user.id,
            req.body.doctorId,
            req.body.appointment_date,
            req.body.appointment_time
        );

        // Redirect to video dashboard for MPA
        res.redirect("/user_video_dashboard");

    } catch (err) {
        console.error("Appointment booking error:", err.message);

        if (err.message.includes('already has an active appointment')) {
            return res.send(`
                <script>
                    alert("${err.message}");
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

// API endpoint for user appointments (for AJAX calls)
router.get("/api/appointments/user", authenticate, authorize("user"), async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'user');
        res.json(appointment ? [appointment] : []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load appointments" });
    }
});

// Start appointment (doctor)
router.post("/appointments/:id/start", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const result = await appointmentService.startAppointment(req.params.id, req.user.id);
        res.json({ roomId: result.room_id });
    } catch (err) {
        console.error("Start appointment error:", err);
        res.status(400).json({ error: err.message });
    }
});

// API endpoint for doctor appointments
router.get("/api/appointments/doctor", authenticate, authorize("doctor"), async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'doctor');
        res.json(appointment ? [appointment] : []);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to load appointment" });
    }
});

// Get available doctors (for appointment booking form)
router.get("/api/doctors", authenticate, authorize("user"), async (req, res) => {
    try {
        const doctors = await appointmentService.getAvailableDoctors();
        res.json(doctors);
    } catch (err) {
        console.error("Fetch doctors error:", err);
        res.status(500).json({ error: "Failed to load doctors" });
    }
});

// Complete appointment
router.post("/appointments/:id/complete", authenticate, authorize("doctor"), async (req, res) => {
    try {
        await appointmentService.completeAppointment(req.params.id, req.user.id);
        res.sendStatus(200);
    } catch (err) {
        console.error("Complete appointment error:", err);
        res.status(500).json({ error: err.message });
    }
});
// In appointment.routes.js, add this test route
router.post("/test-appointment-start", authenticate, authorize("doctor"), async (req, res) => {
    try {

        // Test with a specific appointment
        const appointmentId = 96;
        const doctorId = req.user.id;

        const roomId = await videoService.startVideoCall(appointmentId, doctorId);

        res.json({
            success: true,
            message: "Test successful",
            roomId: roomId,
            appointmentId: appointmentId,
            doctorId: doctorId
        });
    } catch (err) {
        console.error("Test error:", err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

module.exports = router;