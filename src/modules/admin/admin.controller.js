const catchAsync = require('../../utils/catchAsync');
const adminService = require('./admin.service');
const { accessTokenCookieOptions, refreshTokenCookieOptions } = require('../../config');

const renderLogin = catchAsync(async (req, res) => {
    res.render('admin_login');
});

const login = catchAsync(async (req, res) => {
    const { phone, password } = req.validated.body;
    const result = await adminService.login(phone, password);

    res.cookie('accessToken', result.accessToken, accessTokenCookieOptions);
    res.cookie('refreshToken', result.refreshToken, refreshTokenCookieOptions);

    res.json({
        success: true,
        data: {
            admin: result.admin,
            accessToken: result.accessToken
        }
    });
});

const renderDashboard = catchAsync(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    res.render('admin_dashboard', { stats });
});

const getDashboardStats = catchAsync(async (req, res) => {
    const stats = await adminService.getDashboardStats();
    res.json({ success: true, data: stats });
});

const listDoctors = catchAsync(async (req, res) => {
    const page = req.validated?.query?.page || 1;
    const doctors = await adminService.listDoctors(page);
    res.json({ success: true, data: doctors });
});

const listPatients = catchAsync(async (req, res) => {
    const page = req.validated?.query?.page || 1;
    const patients = await adminService.listPatients(page);
    res.json({ success: true, data: patients });
});

const listAppointments = catchAsync(async (req, res) => {
    const { page, status, doctorId, date } = req.validated?.query || {};
    const filters = {};
    if (status) filters.status = status;
    if (doctorId) filters.doctorId = doctorId;
    if (date) filters.date = date;

    const appointments = await adminService.listAppointments(filters, page || 1);
    res.json({ success: true, data: appointments });
});

const overrideAppointment = catchAsync(async (req, res) => {
    const appointmentId = Number(req.params.id);
    const { status } = req.validated.body;
    const appointment = await adminService.overrideAppointment(appointmentId, status);
    res.json({ success: true, data: appointment });
});

const viewDoctorSchedule = catchAsync(async (req, res) => {
    const doctorId = Number(req.params.id);
    const schedule = await adminService.viewDoctorSchedule(doctorId);
    res.json({ success: true, data: schedule });
});

module.exports = {
    renderLogin,
    login,
    renderDashboard,
    getDashboardStats,
    listDoctors,
    listPatients,
    listAppointments,
    overrideAppointment,
    viewDoctorSchedule
};
