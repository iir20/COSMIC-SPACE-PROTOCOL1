/**
 * Wallet Synchronization Script
 * 
 * This script ensures wallet state is synchronized across all pages.
 * It should be included on every page of the application.
 */

(function() {
    // Run when DOM is loaded
    document.addEventListener('DOMContentLoaded', function() {
        console.log('Initializing wallet synchronization...');
        
        // Set up periodic wallet synchronization
        setInterval(synchronizeWallet, 3000);
        
        // Initial synchronization
        setTimeout(synchronizeWallet, 500);
        
        // Listen for wallet connection/disconnection events
        document.addEventListener('walletConnected', updateWalletDisplay);
        document.addEventListener('walletDisconnected', updateWalletDisplay);
        document.addEventListener('walletBalanceUpdated', updateWalletDisplay);
        
        // Set up wallet display elements
        setupWalletDisplayElements();
    });
    
    /**
     * Synchronize wallet state
     */
    async function synchronizeWallet() {
        try {
            // Check if wallet system is available
            if (!window.cispWallet) {
                console.warn('Wallet system not available for synchronization');
                return;
            }
            
            // Get current wallet from storage
            const currentWalletId = sessionStorage.getItem('current_wallet_id') || localStorage.getItem('current_wallet_id');
            if (!currentWalletId) {
                return;
            }

            // Synchronize with blockchain if available
            if (window.blockchain) {
                // Check if getWalletBalance function exists, otherwise use fallback
                if (typeof window.blockchain.getWalletBalance === 'function') {
                    try {
                        const balance = await window.blockchain.getWalletBalance(currentWalletId);
                        if (window.cispWallet && window.cispWallet.getCurrentWallet()) {
                            const wallet = window.cispWallet.getCurrentWallet();
                            // Only update if the balance actually changed
                            const hasChanged = 
                                !wallet.balance || 
                                wallet.balance.CIS !== balance.CIS || 
                                wallet.balance.xCIS !== balance.xCIS;
                            
                            if (hasChanged) {
                                wallet.balance = balance;
                                if (typeof window.cispWallet._save === 'function') {
                            window.cispWallet._save();
                                }
                                
                                // Dispatch balance update event
                                const event = new CustomEvent('walletBalanceUpdated', {
                                    detail: { 
                                        balance: balance,
                                        address: wallet.address
                                    }
                                });
                                document.dispatchEvent(event);
                            }
                        }
                    } catch (error) {
                        console.error('Error getting wallet balance:', error);
                    }
                } else if (typeof window.blockchain.getBalance === 'function') {
                    // Fallback to using getBalance with separate calls for each token
                    try {
                        const wallet = window.cispWallet.getCurrentWallet();
                        if (wallet) {
                            const cisBalance = window.blockchain.getBalance(currentWalletId, 'CIS');
                            const xcisBalance = window.blockchain.getBalance(currentWalletId, 'xCIS');
                            
                            // Only update if the balance actually changed
                            const hasChanged = 
                                !wallet.balance || 
                                wallet.balance.CIS !== cisBalance || 
                                wallet.balance.xCIS !== xcisBalance;
                            
                            if (hasChanged) {
                                wallet.balance = {
                                    CIS: cisBalance,
                                    xCIS: xcisBalance
                                };
                                
                                if (typeof window.cispWallet._save === 'function') {
                                    window.cispWallet._save();
                                }
                            
                            // Dispatch balance update event
                            const event = new CustomEvent('walletBalanceUpdated', {
                                    detail: { 
                                        balance: wallet.balance,
                                        address: wallet.address
                                    }
                            });
                            document.dispatchEvent(event);
                            }
                        }
                    } catch (error) {
                        console.error('Error getting wallet balance with fallback method:', error);
                    }
                } else {
                    // Last fallback: Get balance directly from wallet
                    const wallet = window.cispWallet.getCurrentWallet();
                    if (wallet) {
                        // Dispatch balance update event with current balance
                        const event = new CustomEvent('walletBalanceUpdated', {
                            detail: { 
                                balance: wallet.balance,
                                address: wallet.address 
                            }
                        });
                        document.dispatchEvent(event);
                    }
                }
            }
            
            // Update wallet display
            updateWalletDisplay();
            
            // Synchronize NFT data if available
            if (window.nftSystem && typeof window.nftSystem.syncNFTs === 'function') {
                try {
                    await window.nftSystem.syncNFTs(currentWalletId);
                } catch (error) {
                    console.warn("NFT sync failed:", error);
                }
            }
        } catch (error) {
            console.error('Error synchronizing wallet:', error);
        }
    }
    
    /**
     * Update wallet display elements
     */
    function updateWalletDisplay(event) {
        try {
            // Find wallet display elements
            const walletAddressElement = document.getElementById('wallet-address');
            const walletBalanceElement = document.getElementById('wallet-balance');
            const walletXCISBalanceElement = document.getElementById('wallet-xcis-balance');
            const connectWalletBtn = document.getElementById('connect-wallet-btn');
            const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
            const walletStatusElement = document.getElementById('wallet-status');
            
            // Check if wallet system is available
            if (!window.cispWallet) {
                console.warn('Wallet system not available for display update');
                return;
            }
            
            // Get current wallet
            const currentWallet = window.cispWallet.getCurrentWallet();
            
            // Update wallet address display
            if (walletAddressElement) {
                if (currentWallet) {
                    const address = currentWallet.address;
                    // Format address for display (first 6 and last 4 characters)
                    const formattedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
                    walletAddressElement.textContent = formattedAddress;
                    walletAddressElement.title = address; // Full address on hover
                } else {
                    walletAddressElement.textContent = 'Not connected';
                    walletAddressElement.title = '';
                }
            }
            
            // Update wallet balance display with animation
            if (walletBalanceElement) {
                if (currentWallet) {
                    const cisBalance = (currentWallet.balance?.CIS || 0).toFixed(2);
                    const currentBalance = parseFloat(walletBalanceElement.textContent);
                    animateBalance(walletBalanceElement, currentBalance, parseFloat(cisBalance));
                } else {
                    walletBalanceElement.textContent = '0.00';
                }
            }
            
            // Update xCIS balance display with animation
            if (walletXCISBalanceElement) {
                if (currentWallet) {
                    const xcisBalance = (currentWallet.balance?.xCIS || 0).toFixed(2);
                    const currentBalance = parseFloat(walletXCISBalanceElement.textContent);
                    animateBalance(walletXCISBalanceElement, currentBalance, parseFloat(xcisBalance));
                } else {
                    walletXCISBalanceElement.textContent = '0.00';
                }
            }
            
            // Update wallet status with animation
            if (walletStatusElement) {
                if (currentWallet) {
                    walletStatusElement.textContent = 'Connected';
                    walletStatusElement.className = 'wallet-status connected';
                    walletStatusElement.style.animation = 'pulse 2s infinite';
                } else {
                    walletStatusElement.textContent = 'Disconnected';
                    walletStatusElement.className = 'wallet-status disconnected';
                    walletStatusElement.style.animation = 'none';
                }
            }
            
            // Update connect/disconnect buttons with smooth transitions
            if (connectWalletBtn) {
                connectWalletBtn.style.transition = 'opacity 0.3s ease';
                connectWalletBtn.style.opacity = currentWallet ? '0' : '1';
                connectWalletBtn.style.display = currentWallet ? 'none' : 'inline-block';
            }
            
            if (disconnectWalletBtn) {
                disconnectWalletBtn.style.transition = 'opacity 0.3s ease';
                disconnectWalletBtn.style.opacity = currentWallet ? '1' : '0';
                disconnectWalletBtn.style.display = currentWallet ? 'inline-block' : 'none';
            }
            
            // Update page title with wallet info
            updatePageTitle(currentWallet);
            
            // Update wallet-dependent UI elements
            updateWalletDependentElements(currentWallet);
        } catch (error) {
            console.error('Error updating wallet display:', error);
        }
    }
    
    /**
     * Set up wallet display elements if they don't exist
     */
    function setupWalletDisplayElements() {
        // Check if we need to create wallet display elements
        const walletDisplayContainer = document.getElementById('wallet-display');
        
        if (!walletDisplayContainer) {
            // We're on a page without wallet display, no need to create elements
            return;
        }
        
        // Check if elements already exist
        if (
            document.getElementById('wallet-address') &&
            document.getElementById('wallet-balance') &&
            document.getElementById('connect-wallet-btn')
        ) {
            // Elements already exist, no need to create them
            return;
        }
        
        // Create wallet display elements
        walletDisplayContainer.innerHTML = `
            <div class="wallet-info">
                <div class="wallet-status-container">
                    <span id="wallet-status" class="wallet-status disconnected">Disconnected</span>
                </div>
                <div class="wallet-address-container">
                    <span class="wallet-label">Address:</span>
                    <span id="wallet-address">Not connected</span>
                </div>
                <div class="wallet-balance-container">
                    <span class="wallet-label">CIS Balance:</span>
                    <span id="wallet-balance">0.00</span> CIS
                </div>
                <div class="wallet-xcis-balance-container">
                    <span class="wallet-label">xCIS Balance:</span>
                    <span id="wallet-xcis-balance">0.00</span> xCIS
                </div>
            </div>
            <div class="wallet-actions">
                <button id="connect-wallet-btn" class="btn btn-primary">Connect Wallet</button>
                <button id="disconnect-wallet-btn" class="btn btn-danger" style="display: none;">Disconnect</button>
            </div>
        `;
        
        // Set up event listeners for buttons
        const connectWalletBtn = document.getElementById('connect-wallet-btn');
        const disconnectWalletBtn = document.getElementById('disconnect-wallet-btn');
        
        if (connectWalletBtn) {
            connectWalletBtn.addEventListener('click', function() {
                if (window.cispWallet) {
                    window.cispWallet.connectWallet();
                }
            });
        }
        
        if (disconnectWalletBtn) {
            disconnectWalletBtn.addEventListener('click', function() {
                if (window.cispWallet) {
                    window.cispWallet.disconnectWallet();
                }
            });
        }
    }
    
    /**
     * Update page title with wallet info
     */
    function updatePageTitle(wallet) {
        // Get current page title
        const baseTitle = document.title.split(' | ')[0];
        
        if (wallet) {
            // Add wallet info to title
            let cisBalance = 0;
            if (typeof wallet.balance === 'object') {
                cisBalance = wallet.balance.CIS || 0;
            } else if (typeof wallet.balance === 'number') {
                cisBalance = wallet.balance;
            }
            
            document.title = `${baseTitle} | ${cisBalance.toFixed(2)} CIS`;
        } else {
            // Reset title
            document.title = baseTitle;
        }
    }
    
    /**
     * Update wallet-dependent UI elements
     */
    function updateWalletDependentElements(wallet) {
        // Find elements that should be enabled/disabled based on wallet connection
        const walletDependentElements = document.querySelectorAll('[data-requires-wallet]');
        
        walletDependentElements.forEach(element => {
            if (wallet) {
                // Enable element
                element.disabled = false;
                element.classList.remove('disabled');
            } else {
                // Disable element
                element.disabled = true;
                element.classList.add('disabled');
            }
        });
    }

    // Add balance animation function
    function animateBalance(element, start, end) {
        const duration = 1000; // Animation duration in milliseconds
        const startTime = performance.now();
        
        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutCubic = progress => 1 - Math.pow(1 - progress, 3);
            const currentValue = start + (end - start) * easeOutCubic(progress);
            
            element.textContent = currentValue.toFixed(2);
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        requestAnimationFrame(update);
    }
})(); 

// Wallet Synchronization System
class WalletSync {
    constructor() {
        this.isInitialized = false;
        this.currentAccount = null;
        this.isConnected = false;
        this.retryAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 1000;
    }

    async init() {
        console.log('Initializing wallet synchronization...');
        try {
            await this.waitForBlockchain();
            this.setupEventListeners();
            this.isInitialized = true;
            console.log('Wallet sync initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize wallet sync:', error);
            return false;
        }
    }

    async waitForBlockchain() {
        while (this.retryAttempts < this.maxRetries) {
            if (window.cispChain && window.cispChain.isInitialized) {
                return true;
            }
            console.log(`Waiting for blockchain system... (attempt ${this.retryAttempts + 1}/${this.maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            this.retryAttempts++;
        }
        throw new Error('Blockchain system not available');
    }

    setupEventListeners() {
        window.addEventListener('walletChanged', this.handleWalletChange.bind(this));
        window.addEventListener('blockchainUpdate', this.synchronizeWallet.bind(this));
    }

    async synchronizeWallet() {
        if (!this.isInitialized) {
            console.warn('Wallet system not available for synchronization');
            return;
        }

        try {
            if (!this.currentAccount) {
                const accounts = await window.cispChain.getAccounts();
                if (accounts && accounts.length > 0) {
                    this.currentAccount = accounts[0];
                    this.isConnected = true;
                }
            }

            if (this.currentAccount) {
                await this.updateBalances();
                this.dispatchWalletUpdate();
            }
        } catch (error) {
            console.error('Failed to synchronize wallet:', error);
        }
    }

    async connect() {
        try {
            if (!window.cispChain) {
                throw new Error('Blockchain system not available');
            }

            const accounts = await window.cispChain.requestAccounts();
            if (accounts && accounts.length > 0) {
                this.currentAccount = accounts[0];
                this.isConnected = true;
                await this.synchronizeWallet();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            return false;
        }
    }

    async updateBalances() {
        if (!this.currentAccount) return;

        try {
            const balances = await window.cispChain.getBalances(this.currentAccount);
            this.dispatchBalanceUpdate(balances);
        } catch (error) {
            console.error('Failed to update balances:', error);
        }
    }

    handleWalletChange(event) {
        const { account, connected } = event.detail;
        this.currentAccount = account;
        this.isConnected = connected;
        this.synchronizeWallet();
    }

    dispatchWalletUpdate() {
        window.dispatchEvent(new CustomEvent('walletUpdated', {
            detail: {
                account: this.currentAccount,
                connected: this.isConnected
            }
        }));
    }

    dispatchBalanceUpdate(balances) {
        window.dispatchEvent(new CustomEvent('balanceUpdated', {
            detail: { balances }
        }));
    }
}

// Initialize wallet sync system
window.walletSync = new WalletSync();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletSync;
}