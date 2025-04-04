/**
 * Global State Synchronization System
 * 
 * This system ensures that wallet connection status, balances, and NFT collections
 * are properly synchronized across all pages of the application.
 */

class GlobalStateSync {
    constructor() {
        this.isInitialized = false;
        this.syncInterval = null;
        this.pageVisibilityState = 'visible';
        this.walletSyncEnabled = true;
        this.balanceSyncEnabled = true;
        this.nftSyncEnabled = true;
        this.lastSyncTime = 0;
        this.eventListeners = []; // Track event listeners for cleanup
    }

    init() {
        if (this.isInitialized) {
            console.log('Global state sync already initialized');
            return;
        }

        console.log('Initializing global state synchronization system');

        // Set up page visibility tracking
        const visibilityHandler = () => {
            this.pageVisibilityState = document.visibilityState;
            if (document.visibilityState === 'visible') {
                this.performFullSync();
            }
        };
        document.addEventListener('visibilitychange', visibilityHandler);
        this.eventListeners.push({
            element: document,
            type: 'visibilitychange',
            handler: visibilityHandler
        });

        // Set up periodic sync
        this.syncInterval = setInterval(() => this.performSync(), 3000);

        // Set up storage event listener for cross-tab synchronization
        const storageHandler = (event) => this.handleStorageEvent(event);
        window.addEventListener('storage', storageHandler);
        this.eventListeners.push({
            element: window,
            type: 'storage',
            handler: storageHandler
        });

        // Perform initial sync
        this.performFullSync();
        
        // Set global reference
        this.isInitialized = true;
    }

    /**
     * Perform a full synchronization of wallet, balances, and NFTs
     */
    async performFullSync() {
        console.log('Performing full state synchronization');
        this.lastSyncTime = Date.now();
        
        try {
            // First sync wallet state (wallet must be available for balances/NFTs)
            if (this.walletSyncEnabled) {
                await this.syncWalletState();
            }
            
            // Then sync blockchain balances
            if (this.balanceSyncEnabled) {
                await this.syncBalances();
            }
            
            // Finally sync NFT collection
            if (this.nftSyncEnabled) {
                await this.syncNFTs();
            }
            
            // Update UI displays
            this.updateUIDisplays();
        } catch (error) {
            console.error('Error during full sync:', error);
        }
    }

    /**
     * Perform regular sync based on timing and changes
     */
    async performSync() {
        // Skip if page is not visible
        if (this.pageVisibilityState !== 'visible') return;
        
        // Determine what needs to be synced based on time since last sync
        const now = Date.now();
        const timeSinceLastSync = now - this.lastSyncTime;
        
        try {
            // Always sync wallet state on every sync
            if (this.walletSyncEnabled) {
                await this.syncWalletState();
            }
            
            // Sync balances every 5 seconds
            if (this.balanceSyncEnabled && timeSinceLastSync >= 5000) {
                await this.syncBalances();
            }
            
            // Sync NFTs every 10 seconds
            if (this.nftSyncEnabled && timeSinceLastSync >= 10000) {
                await this.syncNFTs();
            }
            
            // Update last sync time if we synced balances or NFTs
            if (timeSinceLastSync >= 5000) {
                this.lastSyncTime = now;
            }
            
            // Update UI displays
            this.updateUIDisplays();
        } catch (error) {
            console.error('Error during regular sync:', error);
        }
    }

    /**
     * Handle localStorage changes from other tabs
     */
    handleStorageEvent(event) {
        // React to changes in storage from other tabs
        if (!event || !event.key) return;
        
        try {
            if (event.key === 'current_wallet_id') {
                // Wallet connection changed in another tab
                this.syncWalletState();
            } else if (event.key === 'blockchain_balances') {
                // Balances changed in another tab
                this.syncBalances();
            } else if (event.key === 'cisp_nfts') {
                // NFTs changed in another tab
                this.syncNFTs();
            }
        } catch (error) {
            console.error('Error handling storage event:', error);
        }
    }

    /**
     * Synchronize wallet connection state
     */
    async syncWalletState() {
        if (!window.cispWallet) {
            console.warn('Wallet system not available for sync');
            return;
        }
        
        try {
            // Ensure wallet system is initialized
            if (!window.cispWallet.isInitialized) {
                if (typeof window.cispWallet.init === 'function') {
                    await window.cispWallet.init();
                } else {
                    console.warn('Wallet system has no init function');
                    return;
                }
            }
            
            // Check for current wallet ID in storage
            const storedWalletId = sessionStorage.getItem('current_wallet_id') || localStorage.getItem('current_wallet_id');
            
            // If there's a stored wallet ID but no current wallet, try to connect
            if (storedWalletId && !window.cispWallet.isWalletConnected()) {
                // Check if isWalletConnected is a function
                const isConnected = typeof window.cispWallet.isWalletConnected === 'function' ? 
                    window.cispWallet.isWalletConnected() : 
                    !!window.cispWallet.currentWallet;
                
                if (!isConnected) {
                    // Make sure we have the wallets Map
                    if (window.cispWallet.wallets && window.cispWallet.wallets.has && window.cispWallet.wallets.has(storedWalletId)) {
                        // Try to use connectWallet method first
                        if (typeof window.cispWallet.connectWallet === 'function') {
                            window.cispWallet.connectWallet(storedWalletId);
                        } else {
                            // Fallback for direct connection
                            window.cispWallet.currentWallet = window.cispWallet.wallets.get(storedWalletId);
                            if (typeof window.cispWallet._broadcastWalletChange === 'function') {
                                window.cispWallet._broadcastWalletChange();
                            }
                        }
                        console.log(`Auto-connected wallet: ${storedWalletId}`);
                    } else {
                        console.warn(`Wallet ID ${storedWalletId} not found in wallet collection`);
                    }
                }
            } 
            // If there's no stored wallet ID but a current wallet, disconnect
            else if (!storedWalletId && window.cispWallet.isWalletConnected && window.cispWallet.isWalletConnected()) {
                if (typeof window.cispWallet.disconnectWallet === 'function') {
                    window.cispWallet.disconnectWallet();
                    console.log('Disconnected wallet due to missing storage ID');
                }
            }
        } catch (error) {
            console.error('Error syncing wallet state:', error);
        }
    }

    /**
     * Synchronize blockchain balances
     */
    async syncBalances() {
        if (!window.blockchain) {
            console.warn('Blockchain system not available for sync');
            return;
        }
        
        try {
            // Ensure blockchain is initialized
            if (!window.blockchain.isInitialized && typeof window.blockchain.init === 'function') {
                await window.blockchain.init();
            }
            
            // If wallet is connected, sync wallet object with blockchain balances
            if (window.cispWallet && window.cispWallet.getCurrentWallet) {
                const wallet = window.cispWallet.getCurrentWallet();
                if (!wallet) {
                    console.warn('No wallet connected for balance sync');
                    return;
                }
                
                const address = wallet.address;
                
                // Make sure wallet has a balance object
                if (!wallet.balance) wallet.balance = { CIS: 0, xCIS: 0 };
                
                // Use getWalletBalance if available (preferred method)
                if (typeof window.blockchain.getWalletBalance === 'function') {
                    const balances = await window.blockchain.getWalletBalance(address);
                    if (balances) {
                        const hasChanged = 
                            wallet.balance.CIS !== balances.CIS || 
                            wallet.balance.xCIS !== balances.xCIS;
                            
                        if (hasChanged) {
                            wallet.balance = balances;
                            if (window.cispWallet._save) {
                                window.cispWallet._save();
                            }
                            
                            // Dispatch balance updated event
                            this._dispatchBalanceUpdatedEvent(address, balances);
                        }
                    }
                } else if (typeof window.blockchain.getBalance === 'function') {
                    // Get latest balances from blockchain using individual calls
                    const cisBalance = window.blockchain.getBalance(address, 'CIS');
                    const xCisBalance = window.blockchain.getBalance(address, 'xCIS');
                    
                    // Update wallet object if different
                    const hasChanged = 
                        wallet.balance.CIS !== cisBalance || 
                        wallet.balance.xCIS !== xCisBalance;
                        
                    if (hasChanged) {
                        wallet.balance = {
                            CIS: cisBalance,
                            xCIS: xCisBalance
                        };
                        
                        if (window.cispWallet._save) {
                            window.cispWallet._save();
                        }
                        
                        // Dispatch balance updated event
                        this._dispatchBalanceUpdatedEvent(address, wallet.balance);
                    }
                }
            }
        } catch (error) {
            console.error('Error syncing balances:', error);
        }
    }
    
    /**
     * Helper method to dispatch balance updated event
     */
    _dispatchBalanceUpdatedEvent(address, balance) {
        const event = new CustomEvent('walletBalanceUpdated', {
            detail: {
                address: address,
                balance: balance
            }
        });
        document.dispatchEvent(event);
        window.dispatchEvent(event);
    }

    /**
     * Synchronize NFT collection
     */
    async syncNFTs() {
        try {
            // Check if NFT system is initialized
            if (!window.nftSystem) {
                console.warn('NFT system not available for sync');
                return;
            }
            
            // Initialize NFT system if needed
            if (!window.nftSystem.isInitialized && typeof window.nftSystem.init === 'function') {
                await window.nftSystem.init();
            }
            
            // Check if wallet is connected
            if (!window.cispWallet || !window.cispWallet.getCurrentWallet) {
                console.warn('Wallet not available for NFT sync');
                return;
            }
            
            const currentWallet = window.cispWallet.getCurrentWallet();
            if (!currentWallet) {
                console.warn('No wallet connected for NFT sync');
                return;
            }
            
            const address = currentWallet.address;
            
            // Determine the best method to sync NFTs
            if (typeof window.nftSystem.syncNFTs === 'function') {
                // Best option: Use dedicated sync method
                await window.nftSystem.syncNFTs(address);
            } else if (typeof window.nftSystem.loadNFTs === 'function') {
                // Second option: Use loadNFTs method
                await window.nftSystem.loadNFTs(address);
            } else if (typeof window.nftSystem.loadState === 'function') {
                // Fallback: Load full state and manually filter
                await window.nftSystem.loadState();
            } else {
                console.warn('No method available to sync NFTs');
                return;
            }
            
            // Get NFTs for the current wallet address
            let userNFTs = [];
            if (typeof window.nftSystem.getNFTsByOwner === 'function') {
                userNFTs = window.nftSystem.getNFTsByOwner(address);
            } else if (window.nftSystem.nfts && typeof window.nftSystem.nfts.size === 'number') {
                // If using a Map for NFTs, convert to array
                userNFTs = Array.from(window.nftSystem.nfts.values())
                    .filter(nft => nft.owner === address);
            } else if (Array.isArray(window.nftSystem.nfts)) {
                // If using an array for NFTs
                userNFTs = window.nftSystem.nfts.filter(nft => nft.owner === address);
            }
            
            // Dispatch an event for UI updates
            const event = new CustomEvent('nftCollectionUpdated', {
                detail: {
                    address: address,
                    nfts: userNFTs,
                    count: userNFTs.length
                }
            });
            document.dispatchEvent(event);
            window.dispatchEvent(event);
            
            console.log(`Synchronized ${userNFTs.length} NFTs for address ${address}`);
            return userNFTs;
        } catch (error) {
            console.error('Error synchronizing NFTs:', error);
            return [];
        }
    }

    /**
     * Update all UI displays based on current state
     */
    updateUIDisplays() {
        try {
            // Update balance displays
            if (window.blockchain && window.cispWallet && window.cispWallet.isWalletConnected()) {
                const address = window.cispWallet.currentWallet.address;
                
                // Update specific balance displays
                const balanceElements = document.querySelectorAll(`[data-balance-for="${address}"], [data-current-wallet-balance]`);
                balanceElements.forEach(element => {
                    const currencyType = element.getAttribute('data-currency-type') || 'CIS';
                    const balance = window.blockchain.getBalance(address, currencyType);
                    element.textContent = balance;
                });
                
                // Update any wallet address displays
                const addressElements = document.querySelectorAll('[data-wallet-address]');
                addressElements.forEach(element => {
                    element.textContent = address;
                });
            }
            
            // Update wallet connection UI elements
            this.updateWalletConnectionUI();
        } catch (error) {
            console.error('Error updating UI displays:', error);
        }
    }

    /**
     * Update UI elements based on wallet connection state
     */
    updateWalletConnectionUI() {
        try {
            const isConnected = window.cispWallet && window.cispWallet.isWalletConnected();
            
            // Update elements with data-requires-wallet attribute
            const walletRequiredElements = document.querySelectorAll('[data-requires-wallet]');
            walletRequiredElements.forEach(element => {
                if (isConnected) {
                    element.classList.remove('wallet-required');
                    element.removeAttribute('disabled');
                } else {
                    element.classList.add('wallet-required');
                    element.setAttribute('disabled', 'disabled');
                }
            });
            
            // Update elements that should only show when wallet is connected
            const walletConnectedElements = document.querySelectorAll('[data-wallet-connected-only]');
            walletConnectedElements.forEach(element => {
                element.style.display = isConnected ? '' : 'none';
            });
            
            // Update elements that should only show when wallet is disconnected
            const walletDisconnectedElements = document.querySelectorAll('[data-wallet-disconnected-only]');
            walletDisconnectedElements.forEach(element => {
                element.style.display = !isConnected ? '' : 'none';
            });
            
            // Remove any "connect wallet first" notifications if wallet is connected
            if (isConnected && window.notifications) {
                // Find and remove any connect wallet warnings
                const notificationsContainer = document.querySelector('.notifications-container');
                if (notificationsContainer) {
                    const connectWarnings = notificationsContainer.querySelectorAll('.notification-warning, .notification-error');
                    connectWarnings.forEach(notification => {
                        if (notification.textContent.toLowerCase().includes('connect') && 
                            notification.textContent.toLowerCase().includes('wallet')) {
                            notification.remove();
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error updating wallet connection UI:', error);
        }
    }

    /**
     * Clean up resources and event listeners to prevent memory leaks
     */
    cleanup() {
        console.log('Cleaning up GlobalStateSync resources');
        
        // Clear sync interval
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        
        // Remove all event listeners
        this.eventListeners.forEach(listener => {
            listener.element.removeEventListener(listener.type, listener.handler);
        });
        this.eventListeners = [];
        
        // Reset state
        this.isInitialized = false;
        this.lastSyncTime = 0;
        
        console.log('GlobalStateSync cleanup complete');
    }
}

// Create global instance
window.globalStateSync = new GlobalStateSync();

// Initialize when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize with a slight delay to ensure other systems are loaded first
    setTimeout(() => {
        window.globalStateSync.init();
    }, 500);
});

/**
 * Ensure all systems are properly initialized in the correct order
 */
async function initializeAllSystems() {
    console.log('Initializing all systems in order...');
    
    try {
        // Step 1: Initialize wallet system
        if (window.cispWallet) {
            await window.cispWallet.init();
            console.log('Wallet system initialized');
        } else {
            console.warn('Wallet system not found');
        }
        
        // Step 2: Initialize blockchain
        if (window.blockchain) {
            await window.blockchain.init();
            console.log('Blockchain system initialized');
        }
        
        // Step 3: Initialize NFT system
        if (window.nftSystem) {
            await window.nftSystem.init();
            console.log('NFT system initialized');
        }
        
        // Step 4: Initialize referral system
        if (window.referralSystem) {
            await window.referralSystem.init();
            console.log('Referral system initialized');
        }
        
        // Step 5: Initialize staking system
        if (window.stakingSystem) {
            await window.stakingSystem.initialize();
            console.log('Staking system initialized');
        }
        
        // Step 6: Initialize converter system
        if (window.coinConverter) {
            await window.coinConverter.initialize();
            console.log('Coin converter initialized');
        }
        
        // Step 7: Initialize mining system
        if (window.miningSystem) {
            await window.miningSystem.initialize();
            console.log('Mining system initialized');
        }
        
        console.log('All systems initialized successfully');
        
        // Dispatch global initialization event
        window.dispatchEvent(new CustomEvent('all-systems-initialized'));
        
        // Hide any loading overlay
        const loadingOverlay = document.getElementById('loading-overlay');
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
        
        return true;
    } catch (error) {
        console.error('Error during system initialization:', error);
        
        // Show error notification
        if (window.notifications) {
            window.notifications.show('System initialization error: ' + error.message, 'error');
        }
        
        return false;
    }
}

// Add to window object
window.initializeAllSystems = initializeAllSystems;

// Call on page load if document is already ready
if (document.readyState === 'complete') {
    window.initializeAllSystems();
} else {
    // Otherwise wait for DOMContentLoaded
    document.addEventListener('DOMContentLoaded', () => {
        window.initializeAllSystems();
    });
} 