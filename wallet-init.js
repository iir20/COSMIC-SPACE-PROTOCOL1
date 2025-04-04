/**
 * Initialize wallet system and register with coordinator
 */
document.addEventListener('DOMContentLoaded', () => {
    // Initialize wallet manager
    if (!window.walletManager) {
        window.walletManager = new WalletManager();
    }
    
    // Add initialize method if not exists
    if (!window.walletManager.initialize) {
        window.walletManager.initialize = async function() {
            if (this.initialized) return;
            
            try {
                await this.init();
                this.initialized = true;
                console.log('Wallet manager initialized successfully');
            } catch (error) {
                console.error('Error initializing wallet manager:', error);
                throw error;
            }
        };
    }
    
    // Register with coordinator
    window.registerSystem('wallet', window.walletManager);
}); 