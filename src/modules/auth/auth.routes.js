const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { signupSchema, loginSchema } = require('./auth.schema');
const { validate } = require('../../middleware/validation');

const routeAliases = {
	patientSignup: ['/api/v1/auth/patient/signup', '/api/auth/patient/signup'],
	patientLogin: ['/api/v1/auth/patient/login', '/api/auth/patient/login'],
	doctorSignup: ['/api/v1/auth/doctor/signup', '/api/auth/doctor/signup'],
	doctorLogin: ['/api/v1/auth/doctor/login', '/api/auth/doctor/login'],
	logout: ['/api/v1/auth/logout', '/api/auth/logout'],
	refreshToken: ['/api/v1/auth/refresh-token', '/api/auth/refresh-token'],
	session: ['/api/v1/auth/session', '/api/auth/session']
};

router.post(routeAliases.patientSignup, validate(signupSchema), authController.userSignup);
router.post(routeAliases.patientLogin, validate(loginSchema), authController.userLogin);
router.post(routeAliases.doctorSignup, validate(signupSchema), authController.docSignup);
router.post(routeAliases.doctorLogin, validate(loginSchema), authController.docLogin);
router.get(routeAliases.logout, authController.logout);
router.post(routeAliases.refreshToken, authController.refreshToken);
router.get(routeAliases.session, authController.getSession);

module.exports = router;
