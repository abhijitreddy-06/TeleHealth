const videoService = require('./video.service');
const VideoModel = require('./video.model');
const appointmentService = require('../appointment/appointment.service');
const catchAsync = require('../../utils/catchAsync');
const logger = require('../../utils/logger');

exports.userVideoRoom = catchAsync(async (req, res) => {
    const appointment = await videoService.validateVideoRoom(req.params.roomId, req.user.id);
    const participants = await videoService.getRoomParticipants(req.params.roomId);

    res.json({
        roomId: req.params.roomId,
        appointmentId: appointment.id,
        userId: req.user.id,
        userName: participants.patientName || 'Patient',
        doctorName: participants.doctorName || 'Doctor',
        userRole: 'user'
    });
});

exports.docVideoRoom = catchAsync(async (req, res) => {
    const appointment = await videoService.validateVideoRoom(req.params.roomId, req.user.id);
    const participants = await videoService.getRoomParticipants(req.params.roomId);

    res.json({
        roomId: req.params.roomId,
        appointment: {
            id: appointment.id,
            patientName: participants.patientName || 'Patient',
            doctorName: participants.doctorName || 'Doctor'
        },
        userId: req.user.id,
        userRole: 'doctor'
    });
});

exports.docDashboard = async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'doctor');
        const allAppointments = await appointmentService.getDoctorAllAppointments(req.user.id);

        res.json({
            appointment: appointment,
            hasAppointment: !!appointment,
            allAppointments: allAppointments
        });
    } catch (err) {
        logger.error('Doc dashboard error:', err);
        res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
};

exports.startCall = catchAsync(async (req, res) => {
    const roomId = await videoService.startVideoCall(req.params.appointmentId, req.user.id);

    // Broadcast to patient's dashboard via Socket.IO
    const io = req.app.get('io');
    if (io) {
        try {
            const appointment = await VideoModel.getAppointmentForRoom(roomId);
            if (appointment) {
                const dashNsp = io.of('/dashboard');
                dashNsp.to(`dashboard:user:${appointment.user_id}`).emit('appointment-updated', {
                    appointmentId: appointment.id,
                    status: 'started',
                    roomId: roomId,
                    doctorName: appointment.doctor_name,
                    timestamp: new Date().toISOString()
                });
                dashNsp.to(`dashboard:doctor:${appointment.doctor_id}`).emit('appointment-updated', {
                    appointmentId: appointment.id,
                    status: 'started',
                    roomId: roomId,
                    patientName: appointment.patient_name,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (err) {
            logger.warn('Failed to broadcast startCall to dashboard:', err.message);
        }
    }

    res.json({ success: true, roomId: roomId });
});

exports.userDashboard = async (req, res) => {
    try {
        const appointment = await appointmentService.getUserActiveAppointment(req.user.id, 'user');

        res.json({
            appointment: appointment,
            hasAppointment: !!appointment
        });
    } catch (err) {
        logger.error('User dashboard error:', err);
        res.status(500).json({ success: false, error: err.message || 'Internal Server Error' });
    }
};

exports.docStartCall = catchAsync(async (req, res) => {
    const roomId = await videoService.startVideoCall(req.params.appointmentId, req.user.id);

    // Broadcast to patient's dashboard
    const io = req.app.get('io');
    if (io) {
        try {
            const appointment = await VideoModel.getAppointmentForRoom(roomId);
            if (appointment) {
                const dashNsp = io.of('/dashboard');
                dashNsp.to(`dashboard:user:${appointment.user_id}`).emit('appointment-updated', {
                    appointmentId: appointment.id,
                    status: 'started',
                    roomId: roomId,
                    doctorName: appointment.doctor_name,
                    timestamp: new Date().toISOString()
                });
            }
        } catch (err) {
            logger.warn('Failed to broadcast docStartCall to dashboard:', err.message);
        }
    }

    res.json({ success: true, roomId, redirect: `/doctor/video/${roomId}` });
});

exports.userJoinCall = catchAsync(async (req, res) => {
    const roomId = await videoService.joinVideoCall(req.params.appointmentId, req.user.id);
    res.json({ success: true, roomId, redirect: `/patient/video/${roomId}` });
});

exports.saveNotes = catchAsync(async (req, res) => {
    const { roomId, notes } = req.body;

    await videoService.saveCallNotes(roomId, req.user.id, notes);
    res.json({
        success: true,
        data: null,
        error: null,
        message: 'Notes saved successfully'
    });
});
