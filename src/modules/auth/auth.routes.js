const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { signupSchema, loginSchema } = require('./auth.schema');
const { validate } = require('../../middleware/validation');

router.post('/user_signup', validate(signupSchema), authController.userSignup);
router.post('/user_login', validate(loginSchema), authController.userLogin);
router.post('/doc_signup', validate(signupSchema), authController.docSignup);
router.post('/doc_login', validate(loginSchema), authController.docLogin);
router.get('/logout', authController.logout);
router.post('/api/refresh-token', authController.refreshToken);

module.exports = router;
