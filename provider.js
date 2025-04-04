class TonProvider {
    constructor() {
        if (!window.ton) {
            console.log('TON wallet not found');
            return;
        }
        
        try {
            if (typeof window.ton._destroy === 'function') {
                window.ton._destroy();
            }
        } catch (error) {
            console.log('Error cleaning up TON wallet:', error);
        }
        
        this.initializeTonWallet();
    }
    
    async initializeTonWallet() {
        try {
            // Initialize TON wallet
            if (!window.ton) {
                throw new Error('TON wallet not available');
            }
            
            await window.ton.requestWallets();
            console.log('TON wallet initialized');
        } catch (error) {
            console.error('Error initializing TON wallet:', error);
        }
    }
}

// Initialize provider only if TON is available
if (window.ton) {
    new TonProvider();
} 