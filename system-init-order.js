/**
 * System Initialization Order
 * This script ensures proper initialization order for all systems
 */

// Define initialization order
window.SYSTEM_INIT_ORDER = {
    // Core systems should be initialized first
    core: [
        'blockchain.js',
        'wallet-manager.js',
        'global-coordination.js'
    ],
    
    // Initialization scripts
    init: [
        'blockchain-init.js',
        'wallet-init.js',
        'error-boundary.js',
        'balance-utils.js'
    ],
    
    // Feature systems depend on core systems
    features: [
        'cosmic-integration.js',
        'mining.js',
        'nft-system.js',
        'staking-system.js',
        'coin-converter.js'
    ],
    
    // UI and effect systems
    ui: [
        'cosmic-ui.js',
        'notifications.js',
        'share-modal.js',
        'cosmic-effects.js',
        'enhanced-cosmic-effects.js'
    ],
    
    // Synchronization systems
    sync: [
        'wallet-sync.js',
        'global-state-sync.js',
        'page-sync.js'
    ]
};

// CSS files to load
window.CSS_FILES = [
    'styles.css',
    'shared-components.css',
    'balance-styles.css'
];

// Track loaded scripts and styles
window.loadedScripts = {};
window.loadedStyles = {};

// Load styles
function loadStyles() {
    return Promise.all(window.CSS_FILES.map(loadStyle));
}

// Load a single style
function loadStyle(href) {
    return new Promise((resolve, reject) => {
        // Skip if already loaded
        if (window.loadedStyles[href]) {
            console.log(`Style ${href} already loaded`);
            resolve();
            return;
        }
        
        // Create link element
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        
        // Set load and error handlers
        link.onload = () => {
            console.log(`Loaded style: ${href}`);
            window.loadedStyles[href] = true;
            resolve();
        };
        
        link.onerror = (error) => {
            console.error(`Error loading style: ${href}`, error);
            reject(error);
        };
        
        // Add to document
        document.head.appendChild(link);
    });
}

// Load scripts in the correct order
function loadScriptsInOrder() {
    return new Promise(async (resolve) => {
        // First load styles
        await loadStyles();
        
        // Then load each script category in sequence
        for (const category of ['core', 'init', 'features', 'ui', 'sync']) {
            console.log(`Loading ${category} scripts...`);
            
            // Load all scripts in this category
            const scripts = window.SYSTEM_INIT_ORDER[category];
            await Promise.all(scripts.map(scriptSrc => loadScript(scriptSrc)));
        }
        
        // All scripts loaded
        console.log('All scripts loaded in the correct order');
        resolve();
    });
}

// Load a single script
function loadScript(src) {
    return new Promise((resolve, reject) => {
        // Skip if already loaded
        if (window.loadedScripts[src]) {
            console.log(`Script ${src} already loaded`);
            resolve();
            return;
        }
        
        // Create script element
        const script = document.createElement('script');
        script.src = src;
        script.async = false; // Important: Load scripts in order
        
        // Set load and error handlers
        script.onload = () => {
            console.log(`Loaded script: ${src}`);
            window.loadedScripts[src] = true;
            resolve();
        };
        
        script.onerror = (error) => {
            console.error(`Error loading script: ${src}`, error);
            reject(error);
        };
        
        // Add to document
        document.head.appendChild(script);
    });
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing system in the correct order...');
    
    // Load all scripts
    loadScriptsInOrder().then(() => {
        console.log('All systems initialized and ready');
        
        // Dispatch global initialization complete event
        window.dispatchEvent(new CustomEvent('systemsInitialized'));
    }).catch(error => {
        console.error('Error initializing systems:', error);
    });
}); 