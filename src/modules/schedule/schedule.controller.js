const catchAsync = require('../../utils/catchAsync');
const scheduleService = require('./schedule.service');

const getDoctorSchedule = catchAsync(async (req, res) => {
    const doctorId = req.user.id;
    const schedule = await scheduleService.getDoctorSchedule(doctorId);
    res.json({ success: true, data: schedule });
});

const updateDoctorSchedule = catchAsync(async (req, res) => {
    const doctorId = req.user.id;
    const { schedules } = req.validated.body;
    const updated = await scheduleService.updateDoctorSchedule(doctorId, schedules);
    res.json({ success: true, data: updated });
});

const addOverride = catchAsync(async (req, res) => {
    const doctorId = req.user.id;
    const override = await scheduleService.addOverride(doctorId, req.validated.body);
    res.status(201).json({ success: true, data: override });
});

const removeOverride = catchAsync(async (req, res) => {
    const doctorId = req.user.id;
    const { id } = req.params;
    await scheduleService.removeOverride(Number(id), doctorId);
    res.json({ success: true, message: 'Override removed' });
});

const getAvailableSlots = catchAsync(async (req, res) => {
    const { doctorId, date } = req.validated.query;
    const slots = await scheduleService.getAvailableSlots(doctorId, date);
    res.json({ success: true, data: slots });
});

const getAvailableDoctors = catchAsync(async (req, res) => {
    const doctors = await scheduleService.getAvailableDoctors();
    res.json({ success: true, data: doctors });
});

const lockSlot = catchAsync(async (req, res) => {
    const userId = req.user.id;
    const { doctorId, date, time } = req.validated.body;
    const lockToken = await scheduleService.lockSlot(doctorId, date, time, userId);
    res.json({ success: true, data: { lockToken } });
});

const unlockSlot = catchAsync(async (req, res) => {
    const { doctorId, date, time, lockToken } = req.validated.body;
    await scheduleService.unlockSlot(doctorId, date, time, lockToken);
    res.json({ success: true, message: 'Slot unlocked' });
});

module.exports = {
    getDoctorSchedule,
    updateDoctorSchedule,
    addOverride,
    removeOverride,
    getAvailableSlots,
    getAvailableDoctors,
    lockSlot,
    unlockSlot
};
