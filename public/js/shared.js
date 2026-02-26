/* ============================================
   TeleHealth Shared JavaScript Utilities
   ============================================ */

// ============================================
// Toast Notification System
// ============================================
const Toast = {
    container: null,

    init() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    },

    show(type, title, message, duration = 5000) {
        this.init();

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas ${icons[type]} toast-icon"></i>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" aria-label="Close">
                <i class="fas fa-times"></i>
            </button>
        `;

        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.dismiss(toast));

        this.container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => this.dismiss(toast), duration);
        }

        return toast;
    },

    dismiss(toast) {
        if (!toast || toast.classList.contains('toast-exit')) return;

        toast.classList.add('toast-exit');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    },

    success(message, title = 'Success') {
        return this.show('success', title, message);
    },

    error(message, title = 'Error') {
        return this.show('error', title, message);
    },

    warning(message, title = 'Warning') {
        return this.show('warning', title, message);
    },

    info(message, title = 'Info') {
        return this.show('info', title, message);
    }
};

// ============================================
// Theme Toggle
// ============================================
function initTheme() {
    const themeToggle = document.getElementById('themeToggle');
    const mobileThemeToggle = document.getElementById('mobileThemeToggle');
    const html = document.documentElement;

    const savedTheme = localStorage.getItem('theme') || 'light';
    html.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    function toggleTheme() {
        const newTheme = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    }

    function updateThemeIcon(theme) {
        const icon = theme === 'dark' ? 'fa-sun' : 'fa-moon';
        if (themeToggle) themeToggle.innerHTML = `<i class="fas ${icon}"></i>`;
        if (mobileThemeToggle) mobileThemeToggle.innerHTML = `<i class="fas ${icon}"></i>`;
    }

    if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
    if (mobileThemeToggle) mobileThemeToggle.addEventListener('click', toggleTheme);
}

// ============================================
// Mobile Menu
// ============================================
function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const closeMenuBtn = document.getElementById('closeMenu');
    const mobileMenu = document.getElementById('mobileMenu');
    const mobileOverlay = document.getElementById('mobileOverlay');

    function openMenu() {
        if (mobileMenu) mobileMenu.classList.add('active');
        if (mobileOverlay) mobileOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
        if (mobileMenu) mobileMenu.classList.remove('active');
        if (mobileOverlay) mobileOverlay.classList.remove('active');
        document.body.style.overflow = '';
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMenu);
    if (closeMenuBtn) closeMenuBtn.addEventListener('click', closeMenu);
    if (mobileOverlay) mobileOverlay.addEventListener('click', closeMenu);
}

// ============================================
// Modal Utilities
// ============================================
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ============================================
// Loader
// ============================================
function showLoader() {
    let loader = document.getElementById('globalLoader');
    if (!loader) {
        loader = document.createElement('div');
        loader.id = 'globalLoader';
        loader.className = 'loader-overlay';
        loader.innerHTML = '<div class="loader"></div>';
        document.body.appendChild(loader);
    }
    setTimeout(() => loader.classList.add('active'), 10);
}

function hideLoader() {
    const loader = document.getElementById('globalLoader');
    if (loader) {
        loader.classList.remove('active');
    }
}

// ============================================
// Global Page Loader
// Shows a loader ONLY when page load takes > 1 second
// Prevents flashing on fast loads / navigations
// ============================================
(function initGlobalPageLoader() {
    // Skip if already managed by an inline loader on this page
    if (document.getElementById('global-loader')) return;

    var loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.className = 'global-loader';
    loader.innerHTML = '<div class="loader-box"><div class="gl-spinner"></div><p>Loading, please wait...</p></div>';
    document.body.appendChild(loader);

    var showTimer = null;
    var wasShown = false;

    // Only show loader if page hasn't finished loading after 1 second
    showTimer = setTimeout(function () {
        loader.classList.add('visible');
        wasShown = true;
    }, 1000);

    function hidePageLoader() {
        clearTimeout(showTimer);
        if (wasShown) {
            loader.classList.add('hiding');
            setTimeout(function () {
                loader.classList.remove('visible', 'hiding');
                loader.style.display = 'none';
            }, 250);
        } else {
            loader.style.display = 'none';
        }
    }

    // Hide when page is interactive
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        hidePageLoader();
    } else {
        document.addEventListener('DOMContentLoaded', hidePageLoader);
    }

    // Handle browser back/forward cache
    window.addEventListener('pageshow', function (e) {
        if (e.persisted) {
            clearTimeout(showTimer);
            loader.classList.remove('visible', 'hiding');
            loader.style.display = 'none';
        }
    });
})();

// ============================================
// API Helper with Toast Integration
// ============================================
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers
            },
            ...options
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || 'Request failed');
        }

        return data;
    } catch (error) {
        throw error;
    }
}

// ============================================
// Escape HTML (prevent XSS)
// ============================================
function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============================================
// Format Date
// ============================================
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// ============================================
// Initialize on DOM Ready
// ============================================
document.addEventListener('DOMContentLoaded', function () {
    initTheme();
    initMobileMenu();

    // Show toast from sessionStorage (set by server-side redirects)
    const toastError = sessionStorage.getItem('toastError');
    if (toastError) {
        sessionStorage.removeItem('toastError');
        Toast.error(toastError);
    }
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Toast, apiRequest, escapeHtml, formatDate, formatTime };
}
