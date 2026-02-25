const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const { authenticate, authorize, blockAfterLogin } = require('../../middleware/auth');
const { validate } = require('../../middleware/validation');
const {
    adminLoginSchema,
    listFiltersSchema,
    overrideStatusSchema,
    doctorIdParam,
    appointmentIdParam
} = require('./admin.schema');

// Public admin routes
router.get('/admin/login', blockAfterLogin, adminController.renderLogin);
router.post('/api/admin/login', validate(adminLoginSchema), adminController.login);

// Protected admin routes
router.get('/admin/dashboard', authenticate, authorize('admin'), adminController.renderDashboard);
router.get('/api/admin/stats', authenticate, authorize('admin'), adminController.getDashboardStats);
router.get('/api/admin/doctors', authenticate, authorize('admin'), adminController.listDoctors);
router.get('/api/admin/patients', authenticate, authorize('admin'), adminController.listPatients);
router.get('/api/admin/appointments', authenticate, authorize('admin'), validate(listFiltersSchema, 'query'), adminController.listAppointments);
router.post('/api/admin/appointments/:id/override', authenticate, authorize('admin'), validate(appointmentIdParam, 'params'), validate(overrideStatusSchema), adminController.overrideAppointment);
router.get('/api/admin/doctors/:id/schedule', authenticate, authorize('admin'), validate(doctorIdParam, 'params'), adminController.viewDoctorSchedule);

module.exports = router;
