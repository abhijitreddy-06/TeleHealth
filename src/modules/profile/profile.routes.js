const express = require('express');
const router = express.Router();
const profileController = require('./profile.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { userProfileSchema, doctorProfileSchema } = require('./profile.schema');
const { validate } = require('../../middleware/validation');

router.get('/user_profile', authenticate, authorize('user'), profileController.getUserProfile);
router.post('/user_profile', authenticate, authorize('user'), validate(userProfileSchema), profileController.createUserProfile);
router.get('/doc_profile', authenticate, authorize('doctor'), profileController.getDoctorProfile);
router.post('/doc_profile', authenticate, authorize('doctor'), validate(doctorProfileSchema), profileController.createDoctorProfile);
router.get('/user_profile/edit', authenticate, authorize('user'), profileController.editUserProfileForm);
router.post('/user_profile/edit', authenticate, authorize('user'), validate(userProfileSchema), profileController.updateUserProfile);
router.get('/doc_profile/edit', authenticate, authorize('doctor'), profileController.editDoctorProfileForm);
router.post('/doc_profile/edit', authenticate, authorize('doctor'), validate(doctorProfileSchema), profileController.updateDoctorProfile);

module.exports = router;
