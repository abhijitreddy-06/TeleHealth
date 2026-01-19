const express = require('express');
const router = express.Router();
const prescriptionService = require('../services/prescription.service');
const { authenticate } = require('../middleware/auth');

router.get("/api/prescription/download/:roomId", authenticate, async (req, res) => {
    try {
        const prescriptionData = await prescriptionService.getPrescriptionData(
            req.params.roomId,
            req.user.id,
            req.user.role
        );

        const pdfBuffer = await prescriptionService.generatePDF(prescriptionData);

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `attachment; filename="Prescription_${req.params.roomId}_${Date.now()}.pdf"`
        );
        res.send(pdfBuffer);

    } catch (err) {
        console.error(err);

        if (err.message.includes('not found')) {
            return res.status(404).send(`
                <h2>Prescription Not Found</h2>
                <p>${err.message}</p>
                <p>Room ID: ${req.params.roomId}</p>
                <a href="/user_video_dashboard">Return to Dashboard</a>
            `);
        }

        res.status(500).send(`
            <h2>Error Generating Prescription</h2>
            <p>We encountered an error while generating your prescription.</p>
            <p><strong>Error:</strong> ${err.message}</p>
            <a href="/user_video_dashboard">Return to Dashboard</a>
        `);
    }
});

module.exports = router;