const express = require('express');
const router = express.Router();
const { pool } = require('../config/database');
const { authenticate } = require('../middleware/auth');

router.get("/predict", authenticate, (req, res) => {
    res.render("predict");
});

router.post("/api/ai/precheck", authenticate, async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        if (!req.body?.text || req.body.text.trim().length < 3) {
            return res.status(400).json({ error: "Symptoms required" });
        }

        const response = await fetch(
            "https://abhijit75-clinical-bert-ai.hf.space/ai/precheck",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: req.body.text }),
                signal: controller.signal
            }
        );

        clearTimeout(timeout);

        if (!response.ok) {
            throw new Error(`AI error ${response.status}`);
        }

        const data = await response.json();

        await pool.query(
            `INSERT INTO ai_prechecks (user_id, symptoms, ai_response, severity)
             VALUES ($1, $2, $3, $4)`,
            [
                req.user.id,
                req.body.text,
                JSON.stringify(data),
                data.severity || "unknown"
            ]
        );

        return res.json(data);

    } catch (err) {
        clearTimeout(timeout);
        console.error("AI service error:", err);

        return res.json({
            input: req.body?.text || "",
            severity: "unknown",
            recommendation: "AI service temporarily unavailable. Please try again later.",
            top_conditions: [],
            disclaimer: "AI system offline",
            offline: true
        });
    }
});

module.exports = router;