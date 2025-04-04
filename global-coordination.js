/**
 * Global Coordination System
 * Manages initialization order and dependency resolution
 */
class GlobalCoordinator {
  constructor() {
        this.systems = {};
    this.initialized = false;
        this.initializationQueue = [];
        this.systemDependencies = {
            'blockchain': [],
            'wallet': ['blockchain'],
            'cosmicIntegration': ['blockchain', 'wallet'],
            'mining': ['blockchain', 'wallet', 'cosmicIntegration'],
            'nft': ['blockchain', 'wallet', 'cosmicIntegration'],
            'staking': ['blockchain', 'wallet', 'cosmicIntegration']
    };
  }
  
  /**
     * Register a system with the coordinator
     */
    registerSystem(name, system) {
        this.systems[name] = {
            instance: system,
            status: 'registered',
            dependencies: this.systemDependencies[name] || []
        };
        
        console.log(`System registered: ${name}`);
        this.attemptInitialization();
    }

    /**
     * Initialize systems in dependency order
     */
    async attemptInitialization() {
        if (this.initialized) return;
        
        // Build initialization order
        const order = this.buildInitializationOrder();
        console.log('Initialization order:', order);
        
        // Initialize systems in order
        for (const systemName of order) {
            if (this.systems[systemName]?.status === 'registered') {
                await this.initializeSystem(systemName);
            }
        }
        
        this.initialized = true;
        console.log('All systems initialized');
        
        // Broadcast event
        window.dispatchEvent(new CustomEvent('allSystemsInitialized'));
    }

    /**
     * Initialize a specific system
     */
    async initializeSystem(name) {
        if (!this.systems[name]) return false;
        
        const system = this.systems[name];
        
        // Check dependencies
        for (const depName of system.dependencies) {
            if (!this.systems[depName] || this.systems[depName].status !== 'initialized') {
                console.log(`System ${name} waiting for dependency: ${depName}`);
                return false;
            }
        }
        
        try {
            console.log(`Initializing system: ${name}`);
            system.status = 'initializing';
            
            // Call initialize if it exists
            if (system.instance && typeof system.instance.initialize === 'function') {
                await system.instance.initialize();
            }
            
            system.status = 'initialized';
            console.log(`System initialized: ${name}`);
            
            // Broadcast event
            window.dispatchEvent(new CustomEvent('systemInitialized', { detail: { name } }));
            
            // Try to initialize pending systems
            this.attemptInitialization();
            
            return true;
        } catch (error) {
            console.error(`Error initializing ${name}:`, error);
            system.status = 'error';
            system.error = error;
            
            // Broadcast error event
            window.dispatchEvent(new CustomEvent('systemInitializationError', { 
                detail: { name, error } 
            }));
            
            return false;
        }
    }

    /**
     * Build initialization order based on dependencies
     */
    buildInitializationOrder() {
        const visited = new Set();
        const order = [];
        
        function visit(name) {
            if (visited.has(name)) return;
            visited.add(name);
            
            const system = this.systems[name];
            if (!system) return;
            
            for (const dep of system.dependencies) {
                visit.call(this, dep);
            }
            
            order.push(name);
        }
        
        // Visit all systems
        for (const name in this.systems) {
            visit.call(this, name);
        }
        
        return order;
    }

    /**
     * Get a system instance by name
     */
    getSystem(name) {
        return this.systems[name]?.instance;
    }

    /**
     * Check if all systems are initialized
     */
    isFullyInitialized() {
        return this.initialized;
    }

    /**
     * Check if a specific system is initialized
     */
    isSystemInitialized(name) {
        return this.systems[name]?.status === 'initialized';
    }
}

// Initialize global coordinator
window.coordinator = new GlobalCoordinator();

// Make system registration function globally available
window.registerSystem = (name, system) => {
    window.coordinator.registerSystem(name, system);
}; 