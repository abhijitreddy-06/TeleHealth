const catchAsync = require('../../utils/catchAsync');
const adminService = require('./admin.service');
const { accessTokenCookieOptions, refreshTokenCookieOptions } = require('../../config');

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

// ════════════════════════════════════════════
// PHARMACY – Products
// ════════════════════════════════════════════

const listProducts = catchAsync(async (req, res) => {
    const { page, search, categoryId } = req.validated?.query || {};
    const filters = {};
    if (search) filters.search = search;
    if (categoryId) filters.categoryId = categoryId;
    const data = await adminService.listProducts(filters, page || 1);
    res.json({ success: true, data });
});

const createProduct = catchAsync(async (req, res) => {
    const product = await adminService.createProduct(req.validated.body);
    res.status(201).json({ success: true, data: product });
});

const updateProduct = catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    const product = await adminService.updateProduct(id, req.validated.body);
    res.json({ success: true, data: product });
});

const deleteProduct = catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    await adminService.deleteProduct(id);
    res.json({ success: true, message: 'Product deactivated' });
});

const updateStock = catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    const { stockQuantity, lowStockThreshold } = req.validated.body;
    const inventory = await adminService.updateStock(id, stockQuantity, lowStockThreshold);
    res.json({ success: true, data: inventory });
});

const getLowStockProducts = catchAsync(async (req, res) => {
    const data = await adminService.getLowStockProducts();
    res.json({ success: true, data });
});

// ════════════════════════════════════════════
// PHARMACY – Categories
// ════════════════════════════════════════════

const listCategories = catchAsync(async (req, res) => {
    const data = await adminService.listCategories();
    res.json({ success: true, data });
});

const createCategory = catchAsync(async (req, res) => {
    const category = await adminService.createCategory(req.validated.body);
    res.status(201).json({ success: true, data: category });
});

const updateCategory = catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    const category = await adminService.updateCategory(id, req.validated.body);
    res.json({ success: true, data: category });
});

const deleteCategory = catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    await adminService.deleteCategory(id);
    res.json({ success: true, message: 'Category deactivated' });
});

// ════════════════════════════════════════════
// PHARMACY – Orders
// ════════════════════════════════════════════

const listOrders = catchAsync(async (req, res) => {
    const { page, status } = req.validated?.query || {};
    const filters = {};
    if (status) filters.status = status;
    const data = await adminService.listOrders(filters, page || 1);
    res.json({ success: true, data });
});

const updateOrderStatus = catchAsync(async (req, res) => {
    const id = Number(req.params.id);
    const { status } = req.validated.body;
    const order = await adminService.updateOrderStatus(id, status);
    res.json({ success: true, data: order });
});

module.exports = {
    login,
    getDashboardStats,
    listDoctors,
    listPatients,
    listAppointments,
    overrideAppointment,
    viewDoctorSchedule,
    listProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStock,
    getLowStockProducts,
    listCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    listOrders,
    updateOrderStatus
};
