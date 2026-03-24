const AiModel = require('./ai.model');

class AiService {
    static validatePrecheckInput(text) {
        if (!text || text.trim().length < 3) {
            const error = new Error('Symptoms required');
            error.statusCode = 400;
            error.isOperational = true;
            throw error;
        }
    }

    static async runPrecheck(userId, text) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 60000);

        try {
            const response = await fetch(
                'https://abhijit75-clinical-bert-ai.hf.space/ai/precheck',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text }),
                    signal: controller.signal
                }
            );

            if (!response.ok) {
                const error = new Error(`AI error ${response.status}`);
                error.statusCode = 503;
                error.isOperational = true;
                throw error;
            }

            const aiData = await response.json();

            await AiModel.insertPrecheck(
                userId,
                text,
                aiData,
                aiData.severity || 'unknown'
            );

            return aiData;
        } finally {
            clearTimeout(timeout);
        }
    }

    static buildOfflineFallback(text) {
        return {
            input: text || '',
            severity: 'unknown',
            recommendation: 'AI service temporarily unavailable. Please try again later.',
            top_conditions: [],
            disclaimer: 'AI system offline',
            offline: true
        };
    }
}

module.exports = AiService;
