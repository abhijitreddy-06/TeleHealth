const swaggerJSDoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.3',
        info: {
            title: 'TeleHealth API',
            version: '1.0.0',
            description: 'Production API documentation for TeleHealth backend.'
        },
        servers: [
            {
                url: '/'
            }
        ],
        components: {
            securitySchemes: {
                cookieAuth: {
                    type: 'apiKey',
                    in: 'cookie',
                    name: 'accessToken'
                }
            },
            schemas: {
                StandardSuccess: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: true },
                        message: { type: 'string', example: 'Operation successful' },
                        data: { type: 'object', nullable: true }
                    }
                },
                StandardError: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Validation failed' },
                        data: { type: 'object', nullable: true }
                    }
                },
                AuthCredentials: {
                    type: 'object',
                    required: ['phone', 'password'],
                    properties: {
                        phone: { type: 'string', example: '+919876543210' },
                        password: { type: 'string', minLength: 6, example: 'Secret123' }
                    }
                },
                AuthSignup: {
                    allOf: [
                        { $ref: '#/components/schemas/AuthCredentials' },
                        {
                            type: 'object',
                            required: ['confirmpassword'],
                            properties: {
                                confirmpassword: { type: 'string', minLength: 6, example: 'Secret123' }
                            }
                        }
                    ]
                },
                AuthSessionUser: {
                    type: 'object',
                    properties: {
                        userId: { type: 'integer', example: 101 },
                        role: { type: 'string', enum: ['patient', 'doctor'], example: 'patient' },
                        backendRole: { type: 'string', enum: ['user', 'doctor', 'admin'], example: 'user' },
                        profileComplete: { type: 'boolean', example: true }
                    }
                },
                AiPrecheckPayload: {
                    type: 'object',
                    required: ['text'],
                    properties: {
                        text: { type: 'string', minLength: 3, example: 'fever and sore throat for 2 days' }
                    }
                }
            }
        },
        paths: {
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check',
                    responses: {
                        200: {
                            description: 'Service healthy',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        },
                        503: {
                            description: 'Service degraded',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardError' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/auth/patient/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Patient login',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AuthCredentials' }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: {
                                        allOf: [
                                            { $ref: '#/components/schemas/StandardSuccess' },
                                            {
                                                type: 'object',
                                                properties: {
                                                    data: { $ref: '#/components/schemas/AuthSessionUser' }
                                                }
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/auth/doctor/login': {
                post: {
                    tags: ['Auth'],
                    summary: 'Doctor login',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AuthCredentials' }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: 'Login successful',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/auth/patient/signup': {
                post: {
                    tags: ['Auth'],
                    summary: 'Patient signup',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AuthSignup' }
                            }
                        }
                    },
                    responses: {
                        201: {
                            description: 'Signup successful',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/auth/doctor/signup': {
                post: {
                    tags: ['Auth'],
                    summary: 'Doctor signup',
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AuthSignup' }
                            }
                        }
                    },
                    responses: {
                        201: {
                            description: 'Signup successful',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/auth/session': {
                get: {
                    tags: ['Auth'],
                    summary: 'Get auth session',
                    responses: {
                        200: {
                            description: 'Session fetched',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/auth/refresh-token': {
                post: {
                    tags: ['Auth'],
                    summary: 'Refresh auth tokens',
                    responses: {
                        200: {
                            description: 'Token refreshed',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/auth/logout': {
                get: {
                    tags: ['Auth'],
                    summary: 'Logout user',
                    responses: {
                        200: {
                            description: 'Logged out',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        }
                    }
                }
            },
            '/api/v1/ai/precheck': {
                post: {
                    tags: ['AI'],
                    summary: 'Run AI symptom precheck',
                    security: [{ cookieAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: { $ref: '#/components/schemas/AiPrecheckPayload' }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: 'Precheck complete',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardSuccess' }
                                }
                            }
                        },
                        503: {
                            description: 'AI service unavailable',
                            content: {
                                'application/json': {
                                    schema: { $ref: '#/components/schemas/StandardError' }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    apis: ['src/**/*.routes.js']
};

module.exports = swaggerJSDoc(options);
