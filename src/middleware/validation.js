const { body, param, query } = require('express-validator');

const authValidation = {
    userSignup: [
        body('phone')
            .notEmpty().withMessage('Phone is required')
            .isMobilePhone().withMessage('Invalid phone number'),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmpassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match');
                }
                return true;
            })
    ],
    userLogin: [
        body('phone').notEmpty().withMessage('Phone is required'),
        body('password').notEmpty().withMessage('Password is required')
    ],
    doctorSignup: [
        body('phone')
            .notEmpty().withMessage('Phone is required')
            .isMobilePhone().withMessage('Invalid phone number'),
        body('password')
            .notEmpty().withMessage('Password is required')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
        body('confirmpassword')
            .custom((value, { req }) => {
                if (value !== req.body.password) {
                    throw new Error('Passwords do not match');
                }
                return true;
            })
    ],
    doctorLogin: [
        body('phone').notEmpty().withMessage('Phone is required'),
        body('password').notEmpty().withMessage('Password is required')
    ]
};

const appointmentValidation = {
    bookAppointment: [
        body('doctorId').notEmpty().withMessage('Doctor ID is required').isInt(),
        body('appointment_date').notEmpty().withMessage('Date is required').isDate(),
        body('appointment_time').notEmpty().withMessage('Time is required')
    ],
    startAppointment: [
        param('id').notEmpty().withMessage('Appointment ID is required').isInt()
    ],
    completeAppointment: [
        param('id').notEmpty().withMessage('Appointment ID is required').isInt()
    ]
};

const profileValidation = {
    userProfile: [
        body('fullName').notEmpty().withMessage('Full name is required'),
        body('gender').notEmpty().withMessage('Gender is required'),
        body('dob').notEmpty().withMessage('Date of birth is required').isDate(),
        body('weight').notEmpty().withMessage('Weight is required').isFloat({ min: 1 }),
        body('height').notEmpty().withMessage('Height is required').isFloat({ min: 1 }),
        body('bloodGroup').notEmpty().withMessage('Blood group is required')
    ],
    doctorProfile: [
        body('fullName').notEmpty().withMessage('Full name is required'),
        body('specialization').notEmpty().withMessage('Specialization is required'),
        body('experience').notEmpty().withMessage('Experience is required').isInt({ min: 0 })
    ]
};

const vaultValidation = {
    uploadFile: [
        body('recordType').optional().isString()
    ],
    downloadFile: [
        param('id').notEmpty().withMessage('File ID is required').isInt()
    ]
};

const aiValidation = {
    precheck: [
        body('text')
            .notEmpty().withMessage('Symptoms text is required')
            .isLength({ min: 3 }).withMessage('Symptoms must be at least 3 characters')
    ]
};

module.exports = {
    authValidation,
    appointmentValidation,
    profileValidation,
    vaultValidation,
    aiValidation
};