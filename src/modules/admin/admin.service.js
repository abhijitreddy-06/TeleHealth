const bcrypt = require('bcrypt');
const config = require('../../config');
const authService = require('../auth/auth.service');
const AdminModel = require('./admin.model');
const { AppError } = require('../../utils/AppError');

const PAGE_SIZE = 20;

class AdminService {
    /**
     * Authenticate an admin by phone and password.
     * Returns JWT access + refresh tokens.
     */
    async login(phone, password) {
        const admin = await AdminModel.findByPhone(phone);
        if (!admin) {
            throw new AppError('Invalid credentials', 401);
        }

        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            throw new AppError('Invalid credentials', 401);
        }

        const tokenPayload = { id: admin.id, role: 'admin' };
        const tokens = await authService.generateTokens(tokenPayload);

        return {
            admin: { id: admin.id, phone: admin.phone },
            ...tokens
        };
    }

    /**
     * Get high-level dashboard statistics.
     */
    async getDashboardStats() {
        return await AdminModel.getSystemStats();
    }

    /**
     * List doctors with pagination.
     */
    async listDoctors(page = 1) {
        const offset = (page - 1) * PAGE_SIZE;
        return await AdminModel.getAllDoctors(PAGE_SIZE, offset);
    }

    /**
     * List patients with pagination.
     */
    async listPatients(page = 1) {
        const offset = (page - 1) * PAGE_SIZE;
        return await AdminModel.getAllPatients(PAGE_SIZE, offset);
    }

    /**
     * List appointments with optional filters and pagination.
     * Filters: { status, doctorId, date }
     */
    async listAppointments(filters = {}, page = 1) {
        const offset = (page - 1) * PAGE_SIZE;
        return await AdminModel.getAllAppointments(filters, PAGE_SIZE, offset);
    }

    /**
     * Override an appointment's status. Throws 404 if not found.
     */
    async overrideAppointment(appointmentId, status) {
        const appointment = await AdminModel.overrideAppointmentStatus(appointmentId, status);
        if (!appointment) {
            throw new AppError('Appointment not found', 404);
        }
        return appointment;
    }

    /**
     * View a specific doctor's schedule.
     */
    async viewDoctorSchedule(doctorId) {
        return await AdminModel.getDoctorSchedule(doctorId);
    }
}

module.exports = new AdminService();
