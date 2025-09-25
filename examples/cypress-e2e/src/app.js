/**
 * Application initialization and UI setup
 */
import { APP_CONFIG, getVersion } from './config.js';

class AppManager {
    constructor() {
        this.config = APP_CONFIG;
        this.init();
    }

    init() {
        this.displayVersion();
        this.displayDebugStatus();
        this.setupGlobalEventListeners();
    }

    displayVersion() {
        const versionElement = document.getElementById('app-version');
        if (versionElement) {
            versionElement.textContent = `v${getVersion()}`;
        }
    }

    displayDebugStatus() {
        const debugElement = document.getElementById('debug-status');
        if (debugElement) {
            if (this.config.debug) {
                debugElement.textContent = '[DEBUG MODE]';
                debugElement.style.color = 'orange';
            } else {
                debugElement.textContent = '[PRODUCTION]';
                debugElement.style.color = 'green';
            }
        }
    }

    setupGlobalEventListeners() {
        // Add global app functionality here
        document.addEventListener('keydown', (e) => {
            if (e.key === 'F12' && this.config.debug) {
                console.log('Debug mode active - F12 pressed');
            }
        });
    }

    getApiUrl() {
        return this.config.apiUrl;
    }

    isDebugMode() {
        return this.config.debug;
    }

    toggleDebugMode() {
        this.config.debug = !this.config.debug;
        this.displayDebugStatus();
        return this.config.debug;
    }
}

// Initialize app when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.appManager = new AppManager();
});

export default AppManager;
