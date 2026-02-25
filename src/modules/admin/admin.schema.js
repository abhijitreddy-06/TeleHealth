const { z } = require('zod');

const adminLoginSchema = z.object({
    phone: z.string().min(1, 'Phone is required'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

const listFiltersSchema = z.object({
    page: z.coerce.number().int().positive().default(1),
    status: z.string().optional(),
    doctorId: z.coerce.number().int().positive().optional(),
    date: z.string().optional()
});

const overrideStatusSchema = z.object({
    status: z.enum(['scheduled', 'started', 'completed', 'cancelled'])
});

const doctorIdParam = z.object({
    id: z.coerce.number().int().positive()
});

const appointmentIdParam = z.object({
    id: z.coerce.number().int().positive()
});

module.exports = {
    adminLoginSchema,
    listFiltersSchema,
    overrideStatusSchema,
    doctorIdParam,
    appointmentIdParam
};
