const express = require('express');
const router = express.Router();
const AiModel = require('../modules/ai/ai.model');
const { authenticate } = require('../middleware/auth');

router.post("/api/ai/precheck", authenticate, async (req, res) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
        if (!req.body?.text || req.body.text.trim().length < 3) {
            return res.status(400).json({ message: "Symptoms required", error: "Symptoms required" });
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

        await AiModel.insertPrecheck(
            req.user.id,
            req.body.text,
            data,
            data.severity || "unknown"
        );

        return res.json({
            message: 'AI precheck completed',
            ...data
        });

    } catch (err) {
        clearTimeout(timeout);
        console.error("AI service error:", err);

        return res.status(503).json({
            message: 'AI service temporarily unavailable',
            error: 'AI service temporarily unavailable',
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