// Public JavaScript configuration for MPA
const APP_CONFIG = {
    API_BASE_URL: window.location.origin,
    IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    STATIC_PATH: '/'
};

// Make it globally available
window.APP_CONFIG = APP_CONFIG;