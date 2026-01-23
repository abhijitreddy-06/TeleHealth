const APP_CONFIG = {
    API_BASE_URL: window.location.origin,
    IS_PRODUCTION: window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1',
    STATIC_PATH: '/'
};

window.APP_CONFIG = APP_CONFIG;