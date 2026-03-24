const express = require('express');
const router = express.Router();
const aiController = require('../modules/ai/ai.controller');
const { authenticate } = require('../middleware/auth');
const catchAsync = require('../utils/catchAsync');

router.post(['/api/v1/ai/precheck', '/api/ai/precheck'], authenticate, catchAsync(aiController.precheck));

module.exports = router;