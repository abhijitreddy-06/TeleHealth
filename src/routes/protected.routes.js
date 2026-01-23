const express = require('express');
const router = express.Router();
const path = require('path');
const { authenticate, authorize } = require('../middleware/auth');
const { pool } = require('../config/database');

const getPublicPath = (fileName) => {
    return path.join(__dirname, '..', '..', 'public', 'pages', fileName);
};

router.get("/user_home", authenticate, authorize("user"), (req, res) => {
    res.sendFile(getPublicPath("user_home.html"));
});

router.get("/appointments", authenticate, authorize("user"), (req, res) => {
    res.sendFile(getPublicPath("appointments.html"));
});

router.get("/doc_home", authenticate, authorize("doctor"), (req, res) => {
    res.sendFile(getPublicPath("doc_home.html"));
});

router.get("/records", authenticate, authorize("user"), (req, res) => {
    res.sendFile(getPublicPath("records.html"));
});

router.get("/doc_profile_create", authenticate, authorize("doctor"), (req, res) => {
    res.sendFile(getPublicPath("doc_profile_create.html"));
});

router.get("/user_profile_create", authenticate, authorize("user"), (req, res) => {
    res.sendFile(getPublicPath("user_profile_create.html"));
});

router.get("/api/prescription/download/:appointmentId", authenticate, authorize("user"), async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT prescription_pdf
             FROM doctor_notes dn
             JOIN appointments a ON a.id = dn.appointment_id
             WHERE a.id = $1 AND a.user_id = $2 AND dn.sent = TRUE`,
            [req.params.appointmentId, req.user.id]
        );

        if (!result.rows.length) {
            return res.sendStatus(404);
        }

        res.download(result.rows[0].prescription_pdf);
    } catch (err) {
        console.error("Download prescription error:", err);
        res.status(500).send("Download failed");
    }
});

module.exports = router;