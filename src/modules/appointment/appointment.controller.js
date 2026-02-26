const appointmentService = require('./appointment.service');
const catchAsync = require('../../utils/catchAsync');
const escapeHtml = require('../../utils/escapeHtml');
const logger = require('../../utils/logger');

function broadcastDashboard(req, event, data) {
    const io = req.app.get('io');
    if (!io) return;
    try {
        const dashNsp = io.of('/dashboard');
        if (data.doctorId) {
            dashNsp.to(`dashboard:doctor:${data.doctorId}`).emit(event, data);
        }
        if (data.userId) {
            dashNsp.to(`dashboard:user:${data.userId}`).emit(event, data);
        }
    } catch (err) {
        logger.warn('Failed to broadcast dashboard event:', err.message);
    }
}

exports.bookAppointment = async (req, res) => {
    try {
        await appointmentService.bookAppointment(
            req.user.id, req.body.doctorId,
            req.body.appointment_date, req.body.appointment_time,
            req.body.lockToken, req.body.symptoms
        );

        // Broadcast to doctor's dashboard
        broadcastDashboard(req, 'appointment-updated', {
            status: 'booked',
            doctorId: req.body.doctorId,
            userId: req.user.id,
            appointmentDate: req.body.appointment_date,
            appointmentTime: req.body.appointment_time,
            timestamp: new Date().toISOString()
        });

        const acceptHeader = req.get('Accept') || '';
        const isAjax = req.xhr || acceptHeader.includes('application/json');

        if (isAjax) {
            return res.json({ success: true, message: 'Appointment booked successfully!' });
        }

        res.redirect('/user_video_dashboard');
    } catch (err) {
        console.error('Appointment booking error:', err.message);

        const acceptHeader = req.get('Accept') || '';
        const isAjax = req.xhr || acceptHeader.includes('application/json');
        const statusCode = err.statusCode || 500;

        if (isAjax) {
            return res.status(statusCode).json({ success: false, error: err.message });
        }

        if (err.message.includes('already have an active appointment')) {
            return res.send(`<script>alert("${escapeHtml(err.message)}");window.location.href="/appointments";</script>`);
        }

        res.status(500).send(`<script>alert("Error booking appointment. Please try again.");window.location.href="/appointments";</script>`);
    }
};

exports.getUserAppointments = catchAsync(async (req, res) => {
    const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'user');
    res.json(appointment ? [appointment] : []);
});

exports.startAppointment = catchAsync(async (req, res) => {
    const result = await appointmentService.startAppointment(req.params.id, req.user.id);
    res.json({ roomId: result.room_id });
});

exports.getDoctorAppointments = catchAsync(async (req, res) => {
    const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'doctor');
    res.json(appointment ? [appointment] : []);
});

exports.getAvailableDoctors = catchAsync(async (req, res) => {
    const doctors = await appointmentService.getAvailableDoctors();
    res.json(doctors);
});

exports.completeAppointment = catchAsync(async (req, res) => {
    await appointmentService.completeAppointment(req.params.id, req.user.id);
    res.sendStatus(200);
});

exports.getAppointmentStatus = catchAsync(async (req, res) => {
    const status = await appointmentService.getAppointmentStatus(req.params.id, req.user.id, req.user.role);
    res.json({ status });
});

exports.getRecentPrescription = catchAsync(async (req, res) => {
    const appointment = await appointmentService.getRecentCompletedAppointment(req.user.id);
    if (!appointment) {
        return res.status(404).json({ error: 'No recent completed appointment found' });
    }
    res.json({ roomId: appointment.room_id, appointmentId: appointment.id });
});

exports.cancelAppointment = async (req, res) => {
    try {
        const { reason } = req.body;
        const result = await appointmentService.cancelAppointment(
            req.params.id, req.user.id, req.user.role, reason
        );

        // Broadcast cancellation to both dashboards
        broadcastDashboard(req, 'appointment-updated', {
            appointmentId: req.params.id,
            status: 'cancelled',
            cancelledBy: req.user.role,
            doctorId: result.doctorId,
            userId: result.userId,
            timestamp: new Date().toISOString()
        });

        res.json({ success: true, message: result.message });
    } catch (err) {
        console.error('Cancel appointment error:', err);

        if (err.message.includes('not found')) {
            return res.status(404).json({ error: err.message });
        }
        if (err.message.includes('Cannot cancel') || err.message.includes('already cancelled')) {
            return res.status(400).json({ error: err.message });
        }

        res.status(500).json({ error: err.message || 'Failed to cancel appointment' });
    }
};

exports.getCancelledAppointments = catchAsync(async (req, res) => {
    const appointments = await appointmentService.getCancelledAppointments(req.user.id, req.user.role);
    res.json(appointments);
});

exports.rescheduleAppointment = async (req, res) => {
    try {
        const result = await appointmentService.rescheduleAppointment(
            req.params.id,
            req.user.id,
            req.body.doctorId,
            req.body.appointment_date,
            req.body.appointment_time,
            req.body.lockToken,
            req.body.symptoms
        );
        res.json(result);
    } catch (err) {
        console.error('Reschedule error:', err);
        const statusCode = err.statusCode || 500;
        res.status(statusCode).json({ error: err.message });
    }
};

exports.getUpcomingAppointments = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const appointments = await appointmentService.getUpcomingAppointments(req.user.id, req.user.role, page);
    res.json(appointments);
});

exports.getAppointmentHistory = catchAsync(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const appointments = await appointmentService.getAppointmentHistory(req.user.id, req.user.role, page);
    res.json(appointments);
});
