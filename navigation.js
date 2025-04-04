class Navigation {
    constructor() {
        this.currentPage = window.location.pathname.split('/').pop() || 'collection.html';
        this.transitionDuration = 500;
        this.init();
    }

    init() {
        // Add page transition element
        const transitionElement = document.createElement('div');
        transitionElement.className = 'page-transition';
        document.body.appendChild(transitionElement);

        // Add navigation indicator
        const nav = document.querySelector('nav');
        const indicator = document.createElement('div');
        indicator.className = 'nav-indicator';
        nav.appendChild(indicator);

        // Initialize navigation indicator
        this.updateNavigationIndicator();

        // Add event listeners to navigation links
        document.querySelectorAll('nav a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const href = link.getAttribute('href');
                if (href !== this.currentPage) {
                    this.navigateToPage(href);
                }
            });
        });

        // Add section transitions
        this.initializeSectionTransitions();

        // Initialize tab transitions
        this.initializeTabTransitions();
    }

    updateNavigationIndicator() {
        const activeLink = document.querySelector(`nav a[href="${this.currentPage}"]`);
        const indicator = document.querySelector('.nav-indicator');
        
        if (activeLink && indicator) {
            const { left, width } = activeLink.getBoundingClientRect();
            const navLeft = activeLink.parentElement.getBoundingClientRect().left;
            
            indicator.style.width = `${width}px`;
            indicator.style.left = `${left - navLeft}px`;
        }
    }

    async navigateToPage(href) {
        const transition = document.querySelector('.page-transition');
        
        // Start transition
        transition.classList.add('active');
        
        // Wait for transition
        await new Promise(resolve => setTimeout(resolve, this.transitionDuration));
        
        // Update current page
        this.currentPage = href;
        
        // Load new content
        try {
            const response = await fetch(href);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Update main content
            const currentMain = document.querySelector('main');
            const newMain = doc.querySelector('main');
            currentMain.innerHTML = newMain.innerHTML;
            
            // Update title
            document.title = doc.title;
            
            // Update URL without page reload
            window.history.pushState({}, '', href);
            
            // Update active navigation
            this.updateActiveNavigation();
            
            // Initialize new page features
            this.initializePageFeatures();
        } catch (error) {
            console.error('Error loading page:', error);
        }
        
        // End transition
        transition.classList.remove('active');
    }

    updateActiveNavigation() {
        // Remove active class from all links
        document.querySelectorAll('nav a').forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to current page link
        const activeLink = document.querySelector(`nav a[href="${this.currentPage}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }
        
        // Update indicator
        this.updateNavigationIndicator();
    }

    initializeSectionTransitions() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.section-transition').forEach(section => {
            observer.observe(section);
        });
    }

    initializeTabTransitions() {
        document.querySelectorAll('.tab-button').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }

    switchTab(tabId) {
        // Update tab buttons
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId);
        });

        // Update tab panels
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.getAttribute('data-tab') === tabId);
        });
    }

    initializePageFeatures() {
        switch (this.currentPage) {
            case 'marketplace.html':
                this.initializeMarketplace();
                break;
            case 'mint.html':
                this.initializeMinting();
                break;
            case 'collection.html':
                this.initializeCollection();
                break;
            case 'staking.html':
                this.initializeStaking();
                break;
        }
    }

    initializeMarketplace() {
        // Initialize marketplace specific features
        if (window.marketplaceSystem) {
            window.marketplaceSystem.initialize();
        }
    }

    initializeMinting() {
        // Initialize minting specific features
        if (window.mintingSystem) {
            window.mintingSystem.initialize();
        }
    }

    initializeCollection() {
        // Initialize collection specific features
        if (window.collectionSystem) {
            window.collectionSystem.initialize();
        }
    }

    initializeStaking() {
        // Initialize staking specific features
        if (window.stakingSystem) {
            window.stakingSystem.initialize();
        }
    }
}

// Initialize navigation system
document.addEventListener('DOMContentLoaded', () => {
    window.navigation = new Navigation();
}); 