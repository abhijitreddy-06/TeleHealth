const express = require('express');
const router = express.Router();

// Module-based routes
const profileRoutes = require('../modules/profile/profile.routes');
const appointmentRoutes = require('../modules/appointment/appointment.routes');
const videoRoutes = require('../modules/video/video.routes');
const vaultRoutes = require('../modules/vault/vault.routes');
const authRoutes = require('../modules/auth/auth.routes');
const scheduleRoutes = require('../modules/schedule/schedule.routes');
const adminRoutes = require('../modules/admin/admin.routes');
const pharmacyRoutes = require('../modules/pharmacy/pharmacy.routes');

// Remaining legacy routes
const aiRoutes = require('./ai.routes');
const prescriptionRoutes = require('./prescription.routes');
const publicRoutes = require('./public.routes');
const protectedRoutes = require('./protected.routes');

router.use('/', publicRoutes);
router.use('/', authRoutes);
router.use('/', profileRoutes);
router.use('/', aiRoutes);
router.use('/', appointmentRoutes);
router.use('/', scheduleRoutes);
router.use('/', adminRoutes);
router.use('/', pharmacyRoutes);
router.use('/', vaultRoutes);
router.use('/', prescriptionRoutes);
router.use('/', videoRoutes);
router.use('/', protectedRoutes);

module.exports = router;