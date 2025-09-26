/**
 * Navigation-specific functionality
 * This module should ONLY be used by navigation tests
 */

export class NavigationManager {
    constructor() {
        this.routes = new Map();
        this.currentPage = 'home';
        this.breadcrumbs = [];
        this.init();
    }

    init() {
        this.setupRoutes();
        this.displayBreadcrumbs();
        this.setupNavigationListeners();
    }

    setupRoutes() {
        this.routes.set('home', { title: 'Calculator App', description: 'Main calculator application' });
        this.routes.set('about', { title: 'About', description: 'About this calculator' });
        this.routes.set('help', { title: 'Help', description: 'Calculator help and documentation' });
    }

    getCurrentPageInfo() {
        return this.routes.get(this.currentPage) || { title: 'Unknown', description: 'Page not found' };
    }

    displayBreadcrumbs() {
        const breadcrumbElement = document.getElementById('breadcrumbs');
        if (breadcrumbElement) {
            const pageInfo = this.getCurrentPageInfo();
            breadcrumbElement.innerHTML = `
                <span class="breadcrumb-home">Home</span>
                <span class="breadcrumb-separator"> &gt; </span>
                <span class="breadcrumb-current">${pageInfo.title}</span>
            `;
        }
    }

    setupNavigationListeners() {
        // Add click listeners for navigation elements
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('nav-link')) {
                this.handleNavigation(e.target.dataset.route);
            }
        });
    }

    handleNavigation(route) {
        if (this.routes.has(route)) {
            this.currentPage = route;
            this.breadcrumbs.push(route);
            this.displayBreadcrumbs();
            this.updatePageTitle();
        }
    }

    updatePageTitle() {
        const pageInfo = this.getCurrentPageInfo();
        document.title = `${pageInfo.title} - Calculator App`;
        
        const titleElement = document.getElementById('page-title');
        if (titleElement) {
            titleElement.textContent = pageInfo.title;
        }

        const descElement = document.getElementById('page-description');
        if (descElement) {
            descElement.textContent = pageInfo.description;
        }
    }

    getNavigationStats() {
        return {
            totalRoutes: this.routes.size,
            currentPage: this.currentPage,
            visitedPages: [...new Set(this.breadcrumbs)].length,
            breadcrumbLength: this.breadcrumbs.length
        };
    }

    resetNavigation() {
        this.currentPage = 'home';
        this.breadcrumbs = [];
        this.displayBreadcrumbs();
        this.updatePageTitle();
    }
}

// Navigation-specific utility functions
export function formatPageTitle(title) {
    return title.charAt(0).toUpperCase() + title.slice(1);
}

export function validateRoute(route) {
    const validRoutes = ['home', 'about', 'help', 'calculator'];
    return validRoutes.includes(route);
}

export function generateBreadcrumbText(breadcrumbs) {
    return breadcrumbs.map(formatPageTitle).join(' > ');
}
