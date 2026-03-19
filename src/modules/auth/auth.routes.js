const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { signupSchema, loginSchema } = require('./auth.schema');
const { validate } = require('../../middleware/validation');

router.post('/api/auth/patient/signup', validate(signupSchema), authController.userSignup);
router.post('/api/auth/patient/login', validate(loginSchema), authController.userLogin);
router.post('/api/auth/doctor/signup', validate(signupSchema), authController.docSignup);
router.post('/api/auth/doctor/login', validate(loginSchema), authController.docLogin);
router.get('/api/auth/logout', authController.logout);
router.post('/api/auth/refresh-token', authController.refreshToken);
router.get('/api/auth/session', authController.getSession);

module.exports = router;
