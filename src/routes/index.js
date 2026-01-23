const express = require('express');
const router = express.Router();

const authRoutes = require('./auth.routes');
const appointmentRoutes = require('./appointment.routes');
const profileRoutes = require('./profile.routes');
const aiRoutes = require('./ai.routes');
const vaultRoutes = require('./vault.routes');
const videoRoutes = require('./video.routes');
const videoDashboardRoutes = require('./videoDashboard.routes');
const prescriptionRoutes = require('./prescription.routes');
const docVideoRoutes = require('./docVideo.routes');
const notesRoutes = require('./notes.routes');
const userVideoRoutes = require('./userVideo.routes');
const publicRoutes = require('./public.routes');
const protectedRoutes = require('./protected.routes');

router.use('/', publicRoutes);
router.use('/', authRoutes);
router.use('/', profileRoutes);
router.use('/', aiRoutes);
router.use('/', appointmentRoutes);
router.use('/', vaultRoutes);
router.use('/', prescriptionRoutes);
router.use('/', docVideoRoutes);
router.use('/', notesRoutes);
router.use('/', videoRoutes);
router.use('/', videoDashboardRoutes);
router.use('/', userVideoRoutes);
router.use('/', protectedRoutes);

module.exports = router;