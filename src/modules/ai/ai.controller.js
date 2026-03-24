const AiService = require('./ai.service');
const sendResponse = require('../../utils/sendResponse');

exports.precheck = async (req, res) => {
    const symptoms = req.body?.text;

    try {
        AiService.validatePrecheckInput(symptoms);
        const result = await AiService.runPrecheck(req.user.id, symptoms);

        return sendResponse(res, 200, 'AI precheck completed', result);
    } catch (err) {
        if (err.statusCode === 400) {
            return sendResponse(res, 400, err.message, null);
        }

        console.error('AI service error:', err);
        const fallback = AiService.buildOfflineFallback(symptoms);
        return sendResponse(res, 503, 'AI service temporarily unavailable', fallback);
    }
};
