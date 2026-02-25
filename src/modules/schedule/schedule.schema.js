const { z } = require('zod');

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

const scheduleItemSchema = z.object({
    dayOfWeek: z.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, 'Time must be HH:MM format'),
    endTime: z.string().regex(timeRegex, 'Time must be HH:MM format')
});

const updateScheduleSchema = z.object({
    schedules: z.array(scheduleItemSchema).min(0).max(7)
});

const addOverrideSchema = z.object({
    date: z.string().min(1, 'Date is required'),
    type: z.enum(['unavailable', 'custom']),
    startTime: z.string().regex(timeRegex).optional(),
    endTime: z.string().regex(timeRegex).optional(),
    reason: z.string().max(255).optional()
}).refine(data => {
    if (data.type === 'custom') return data.startTime && data.endTime;
    return true;
}, { message: 'Custom overrides require start and end times' });

const deleteOverrideParam = z.object({
    id: z.coerce.number().int().positive()
});

const getAvailableSlotsQuery = z.object({
    doctorId: z.coerce.number().int().positive(),
    date: z.string().min(1, 'Date is required')
});

const lockSlotSchema = z.object({
    doctorId: z.coerce.number().int().positive(),
    date: z.string().min(1),
    time: z.string().regex(timeRegex)
});

const unlockSlotSchema = z.object({
    doctorId: z.coerce.number().int().positive(),
    date: z.string().min(1),
    time: z.string().regex(timeRegex),
    lockToken: z.string().uuid()
});

module.exports = {
    updateScheduleSchema,
    addOverrideSchema,
    deleteOverrideParam,
    getAvailableSlotsQuery,
    lockSlotSchema,
    unlockSlotSchema
};
