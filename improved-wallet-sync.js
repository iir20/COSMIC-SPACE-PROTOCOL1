/**
 * Improved Wallet Synchronization System
 * 
 * This module fixes issues with wallet connection, balance synchronization,
 * and NFT collection display across all pages of the application.
 */

class ImprovedWalletSync {
    constructor() {
        this.isInitialized = false;
        this.syncInterval = null;
        this.lastSyncTime = 0;
        this.syncIntervalTime = 2000; // Check every 2 seconds
        this.forceResync = false;
        this.currentWalletAddress = null;
        this.debugMode = false;
    }

    /**
     * Initialize the wallet synchronization system
     */
    init() {
        if (this.isInitialized) {
            this.log('Wallet sync already initialized');
            return;
        }

        this.log('Initializing improved wallet synchronization system');

        // Set up visibility change listener for sync on tab activation
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.log('Page became visible, forcing resync');
                this.forceResync = true;
                this.syncWallet();
            }
        });

        // Handle storage events for cross-tab synchronization
        window.addEventListener('storage', (event) => {
            this.handleStorageEvent(event);
        });

        // Set up periodic sync
        this.syncInterval = setInterval(() => this.syncWallet(), this.syncIntervalTime);

        // Create custom event listeners for wallet changes
        this.setupEventListeners();

        // Perform initial sync
        setTimeout(() => {
            this.syncWallet(true);
        }, 500);

        this.isInitialized = true;
        this.log('Wallet synchronization system initialized');
    }

    /**
     * Set up event listeners for wallet changes
     */
    setupEventListeners() {
        // Listen for wallet connection events
        window.addEventListener('walletConnected', (event) => {
            this.log('Wallet connected event detected', event.detail);
            this.syncWallet(true);
        });

        window.addEventListener('walletChanged', (event) => {
            this.log('Wallet changed event detected', event.detail);
            this.syncWallet(true);
        });

        window.addEventListener('walletDisconnected', () => {
            this.log('Wallet disconnected event detected');
            this.currentWalletAddress = null;
            this.updateUIElements(null);
        });

        // Listen for balance changes
        window.addEventListener('balance:updated', (event) => {
            this.log('Balance updated event detected', event.detail);
            this.updateBalanceDisplays(event.detail);
        });

        // Listen for NFT changes
        window.addEventListener('nft:minted', (event) => {
            this.log('NFT minted event detected', event.detail);
            this.updateNFTDisplays();
        });
    }

    /**
     * Handle localStorage change events
     */
    handleStorageEvent(event) {
        if (!event) return;

        this.log('Storage event detected', event.key);

        // Wallet-related changes
        if (event.key === 'current_wallet_id' || 
            event.key === 'cisp_wallets' || 
            event.key === 'cisp_balances') {
            
            this.forceResync = true;
            this.syncWallet();
        }

        // NFT-related changes
        if (event.key === 'nft_system') {
            this.updateNFTDisplays();
        }
    }

    /**
     * Main wallet synchronization function
     */
    async syncWallet(force = false) {
        try {
            const now = Date.now();
            
            // Avoid too frequent syncs unless forced
            if (!force && !this.forceResync && now - this.lastSyncTime < 1000) {
                return;
            }
            
            this.lastSyncTime = now;
            this.forceResync = false;
            
            // Check if wallet systems are available
            if (!this.areWalletSystemsReady()) {
                this.log('Wallet systems not ready');
                return;
            }
            
            const wallet = this.getCurrentWallet();
            
            // If a wallet was found, synchronize its state
            if (wallet) {
                // Check if wallet address has changed since last sync
                if (wallet.address !== this.currentWalletAddress) {
                    this.log(`Wallet changed: ${this.currentWalletAddress} -> ${wallet.address}`);
                    this.currentWalletAddress = wallet.address;
                    
                    // Store address in session storage for cross-page access
                    sessionStorage.setItem('current_wallet_address', wallet.address);
                    
                    // Trigger UI update for wallet change
                    this.updateUIElements(wallet);
                } else {
                    // Wallet is the same, just update balances
                    this.updateBalances(wallet);
                }
                
                // Ensure NFTs are synchronized for this wallet
                this.syncNFTs(wallet.address);
            } else {
                // No wallet connected
                if (this.currentWalletAddress) {
                    // We had a wallet before, but not anymore
                    this.log('Wallet disconnected');
                    this.currentWalletAddress = null;
                    sessionStorage.removeItem('current_wallet_address');
                    
                    // Update UI for disconnected state
                    this.updateUIElements(null);
                }
                
                // Check if we have a stored wallet in session
                const storedWalletAddress = sessionStorage.getItem('current_wallet_address');
                if (storedWalletAddress) {
                    this.log(`Attempting to reconnect stored wallet: ${storedWalletAddress}`);
                    await this.reconnectWallet(storedWalletAddress);
                }
            }
        } catch (error) {
            console.error('Error in wallet sync:', error);
        }
    }

    /**
     * Are all wallet-related systems ready?
     */
    areWalletSystemsReady() {
        const walletReady = window.cispWallet && 
                            typeof window.cispWallet.getCurrentWallet === 'function';
        
        const blockchainReady = (window.blockchain || window.cispChain) && 
                                typeof (window.blockchain || window.cispChain).getBalance === 'function';
        
        return walletReady && blockchainReady;
    }

    /**
     * Attempt to reconnect a wallet from stored address
     */
    async reconnectWallet(address) {
        if (!window.cispWallet || !address) return false;
        
        try {
            // Try different methods to find and connect the wallet
            if (typeof window.cispWallet.connectWallet === 'function') {
                await window.cispWallet.connectWallet(address);
                this.log(`Reconnected wallet using connectWallet: ${address}`);
                return true;
            }
            
            if (typeof window.cispWallet.setCurrentWallet === 'function') {
                await window.cispWallet.setCurrentWallet(address);
                this.log(`Reconnected wallet using setCurrentWallet: ${address}`);
                return true;
            }
            
            if (window.cispWallet.wallets && window.cispWallet.wallets.has(address)) {
                window.cispWallet.currentWallet = window.cispWallet.wallets.get(address);
                if (typeof window.cispWallet._broadcastWalletChange === 'function') {
                    window.cispWallet._broadcastWalletChange();
                }
                this.log(`Reconnected wallet using direct assignment: ${address}`);
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Error reconnecting wallet:', error);
            return false;
        }
    }

    /**
     * Get current wallet from available sources
     */
    getCurrentWallet() {
        if (!window.cispWallet) return null;
        
        // Try direct method
        if (typeof window.cispWallet.getCurrentWallet === 'function') {
            return window.cispWallet.getCurrentWallet();
        }
        
        // Try properties
        if (window.cispWallet.currentWallet) {
            return window.cispWallet.currentWallet;
        }
        
        return null;
    }

    /**
     * Update balances for a wallet
     */
    updateBalances(wallet) {
        if (!wallet || !wallet.address) return;
        
        const blockchain = window.blockchain || window.cispChain;
        if (!blockchain) return;
        
        try {
            // Get current balances from blockchain
            const xCISBalance = blockchain.getBalance(wallet.address, 'xCIS') || 0;
            const CISBalance = blockchain.getBalance(wallet.address, 'CIS') || 0;
            
            // Update wallet object if needed
            if (!wallet.balance) wallet.balance = {};
            wallet.balance.xCIS = xCISBalance;
            wallet.balance.CIS = CISBalance;
            
            // Update UI
            this.updateBalanceDisplays({
                address: wallet.address,
                xCIS: xCISBalance,
                CIS: CISBalance
            });
        } catch (error) {
            console.error('Error updating balances:', error);
        }
    }

    /**
     * Update all UI elements related to wallet status
     */
    updateUIElements(wallet) {
        this.updateWalletConnectionUI(wallet);
        
        if (wallet) {
            this.updateBalances(wallet);
            this.updateNFTDisplays(wallet.address);
        } else {
            // Clear balance displays
            this.updateBalanceDisplays({
                address: null,
                xCIS: 0,
                CIS: 0
            });
            
            // Clear NFT displays
            this.updateNFTDisplays(null);
        }
    }

    /**
     * Update wallet connection UI elements
     */
    updateWalletConnectionUI(wallet) {
        try {
            // Update connect wallet buttons
            const connectBtns = document.querySelectorAll('.wallet-connect, [data-action="connect-wallet"]');
            connectBtns.forEach(btn => {
                if (wallet) {
                    btn.innerHTML = `<i class="fas fa-wallet"></i> ${this.formatAddress(wallet.address)}`;
                    btn.classList.add('connected');
                } else {
                    btn.innerHTML = `<i class="fas fa-wallet"></i> Connect Wallet`;
                    btn.classList.remove('connected');
                }
            });
            
            // Update wallet address displays
            const addressDisplays = document.querySelectorAll('[data-wallet-address]');
            addressDisplays.forEach(element => {
                if (wallet) {
                    element.textContent = wallet.address;
                    element.setAttribute('title', wallet.address);
                } else {
                    element.textContent = 'Not Connected';
                    element.removeAttribute('title');
                }
            });
            
            // Update any wallet name displays
            const nameDisplays = document.querySelectorAll('[data-wallet-name]');
            nameDisplays.forEach(element => {
                element.textContent = wallet ? (wallet.name || 'My Wallet') : 'Not Connected';
            });
            
            // Update "Connect First" screens
            const connectFirstScreens = document.querySelectorAll('.connect-wallet-first');
            connectFirstScreens.forEach(screen => {
                screen.style.display = wallet ? 'none' : 'flex';
            });
            
            // Update wallet-dependent content
            const walletContent = document.querySelectorAll('.wallet-dependent-content');
            walletContent.forEach(content => {
                content.style.display = wallet ? 'block' : 'none';
            });
        } catch (error) {
            console.error('Error updating wallet connection UI:', error);
        }
    }

    /**
     * Update balance displays throughout the UI
     */
    updateBalanceDisplays(balanceData) {
        try {
            if (!balanceData) return;
            
            // Format balances
            const xCISFormatted = typeof balanceData.xCIS === 'number' ? 
                balanceData.xCIS.toFixed(2) : '0.00';
            
            const CISFormatted = typeof balanceData.CIS === 'number' ? 
                balanceData.CIS.toFixed(2) : '0.00';
            
            // Update xCIS balance displays
            const xCISDisplays = document.querySelectorAll('#xcis-balance, .xcis-balance, [data-currency-type="xCIS"]');
            xCISDisplays.forEach(element => {
                element.textContent = xCISFormatted;
            });
            
            // Update CIS balance displays
            const CISDisplays = document.querySelectorAll('#cis-balance, .cis-balance, [data-currency-type="CIS"]');
            CISDisplays.forEach(element => {
                element.textContent = CISFormatted;
            });
            
            // Update any custom balance formatters
            const formattedDisplays = document.querySelectorAll('[data-balance-format]');
            formattedDisplays.forEach(element => {
                const format = element.getAttribute('data-balance-format');
                const type = element.getAttribute('data-currency-type') || 'CIS';
                const value = type === 'xCIS' ? balanceData.xCIS : balanceData.CIS;
                
                if (format === 'short' && value >= 1000) {
                    element.textContent = this.formatShortNumber(value);
                } else if (format === 'comma') {
                    element.textContent = this.formatNumberWithCommas(value);
                }
            });
        } catch (error) {
            console.error('Error updating balance displays:', error);
        }
    }

    /**
     * Synchronize NFTs for a wallet address
     */
    syncNFTs(walletAddress) {
        try {
            // Check if NFT system is available
            if (!window.nftSystem) return;
            
            // Force refresh NFTs for this wallet
            if (typeof window.nftSystem.loadState === 'function') {
                window.nftSystem.loadState();
            }
            
            // Update NFT displays
            this.updateNFTDisplays(walletAddress);
        } catch (error) {
            console.error('Error syncing NFTs:', error);
        }
    }

    /**
     * Update NFT displays for a wallet
     */
    updateNFTDisplays(walletAddress = null) {
        try {
            // If we're not on the NFT page, exit early
            const nftCollectionContainer = document.getElementById('nft-collection');
            if (!nftCollectionContainer) return;
            
            // If no address provided, use current wallet
            if (!walletAddress) {
                const wallet = this.getCurrentWallet();
                walletAddress = wallet?.address;
            }
            
            // Clear existing loading message if any
            if (nftCollectionContainer.querySelector('.loading-nfts')) {
                nftCollectionContainer.innerHTML = '';
            }
            
            // If no wallet connected, show message
            if (!walletAddress) {
                nftCollectionContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-wallet"></i>
                        <p>Connect your wallet to view your NFT collection</p>
                    </div>
                `;
                return;
            }
            
            // Get NFTs for this wallet
            const nfts = this.getNFTsForAddress(walletAddress);
            
            // If no NFTs, show message
            if (!nfts || nfts.length === 0) {
                nftCollectionContainer.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-images"></i>
                        <p>No NFTs found in your collection</p>
                        <button class="action-button" onclick="mintFirstNFT()">
                            <i class="fas fa-magic"></i> Mint Your First NFT
                        </button>
                    </div>
                `;
                return;
            }
            
            // If we already have the exact number of cards, no need to rebuild
            const existingCards = nftCollectionContainer.querySelectorAll('.nft-card');
            if (existingCards.length === nfts.length) {
                // Just update data-attributes
                existingCards.forEach((card, index) => {
                    if (index < nfts.length) {
                        card.setAttribute('data-nft-id', nfts[index].id);
                        card.setAttribute('data-rarity', nfts[index].rarity);
                    }
                });
                return;
            }
            
            // Render NFTs
            nftCollectionContainer.innerHTML = '';
            
            nfts.forEach(nft => {
                const card = document.createElement('div');
                card.className = 'nft-card';
                card.setAttribute('data-nft-id', nft.id);
                card.setAttribute('data-rarity', nft.rarity);
                
                // Add rarity-based glow class
                card.classList.add(`rarity-glow-${nft.rarity.toLowerCase()}`);
                
                card.innerHTML = `
                    <div class="nft-image">
                        <img src="${nft.image || 'img/nft-placeholder.png'}" alt="${nft.name}">
                        <div class="nft-rarity ${nft.rarity.toLowerCase()}">
                            ${nft.rarity}
                        </div>
                    </div>
                    <div class="nft-info">
                        <h3 class="nft-name">${nft.name}</h3>
                        <p class="nft-category">${nft.category}</p>
                        <div class="nft-attributes">
                            ${this.renderNFTAttributes(nft.attributes)}
                        </div>
                    </div>
                    <div class="nft-footer">
                        <button class="action-button" onclick="showNFTDetails('${nft.id}')">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </div>
                `;
                
                nftCollectionContainer.appendChild(card);
            });
        } catch (error) {
            console.error('Error updating NFT displays:', error);
        }
    }

    /**
     * Get NFTs for a wallet address
     */
    getNFTsForAddress(address) {
        if (!window.nftSystem || !address) return [];
        
        try {
            // Try different methods to get NFTs
            if (typeof window.nftSystem.getNFTsByOwner === 'function') {
                return window.nftSystem.getNFTsByOwner(address);
            }
            
            // Fallback: Manually filter NFTs
            if (window.nftSystem.nfts) {
                const nftMap = window.nftSystem.nfts;
                const result = [];
                
                // If it's a Map
                if (typeof nftMap.forEach === 'function') {
                    nftMap.forEach(nft => {
                        if (nft.owner === address) {
                            result.push(nft);
                        }
                    });
                }
                // If it's an object with entries
                else if (typeof nftMap.entries === 'function') {
                    for (const [id, nft] of nftMap.entries()) {
                        if (nft.owner === address) {
                            result.push(nft);
                        }
                    }
                }
                // If it's a plain object
                else if (typeof nftMap === 'object') {
                    Object.values(nftMap).forEach(nft => {
                        if (nft.owner === address) {
                            result.push(nft);
                        }
                    });
                }
                
                return result;
            }
            
            return [];
        } catch (error) {
            console.error('Error getting NFTs for address:', error);
            return [];
        }
    }

    /**
     * Render NFT attributes
     */
    renderNFTAttributes(attributes) {
        if (!attributes || !Array.isArray(attributes) || attributes.length === 0) {
            return '<p class="no-attributes">No attributes</p>';
        }
        
        return attributes.map(attr => `
            <div class="nft-attribute">
                <span class="attribute-name">${attr.trait_type}</span>
                <span class="attribute-value">${attr.value}</span>
            </div>
        `).join('');
    }

    /**
     * Format address for display
     */
    formatAddress(address) {
        if (!address) return '';
        if (address.length <= 12) return address;
        
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * Format large numbers with K, M, B abbreviations
     */
    formatShortNumber(num) {
        if (num < 1000) return num.toFixed(2);
        if (num < 1000000) return (num / 1000).toFixed(1) + 'K';
        if (num < 1000000000) return (num / 1000000).toFixed(1) + 'M';
        return (num / 1000000000).toFixed(1) + 'B';
    }

    /**
     * Format number with commas
     */
    formatNumberWithCommas(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Log with prefix if debug mode is on
     */
    log(message, ...args) {
        if (this.debugMode) {
            console.log(`[WalletSync] ${message}`, ...args);
        }
    }
}

// Create instance and initialize when DOM is ready
const improvedWalletSync = new ImprovedWalletSync();

document.addEventListener('DOMContentLoaded', () => {
    improvedWalletSync.init();
    
    // Make globally available
    window.improvedWalletSync = improvedWalletSync;
});

// Helper function for minting first NFT (used in empty state)
window.mintFirstNFT = async function() {
    try {
        const wallet = improvedWalletSync.getCurrentWallet();
        if (!wallet) {
            if (window.notifications) {
                window.notifications.show('Please connect your wallet first', 'error');
            }
            return;
        }
        
        if (!window.nftSystem) {
            if (window.notifications) {
                window.notifications.show('NFT system not available', 'error');
            }
            return;
        }
        
        // Show loading state
        const nftCollection = document.getElementById('nft-collection');
        if (nftCollection) {
            nftCollection.innerHTML = '<div class="loading-nfts">Creating your first NFT...</div>';
        }
        
        // Mint a random NFT
        const nft = await window.nftSystem.mintRandomNFT(wallet.address);
        
        // Show success notification
        if (window.notifications) {
            window.notifications.show(`Successfully minted your first NFT: ${nft.name}!`, 'success');
        }
        
        // Update NFT displays
        setTimeout(() => {
            improvedWalletSync.updateNFTDisplays(wallet.address);
        }, 500);
        
    } catch (error) {
        console.error('Error minting first NFT:', error);
        if (window.notifications) {
            window.notifications.show('Error minting NFT: ' + error.message, 'error');
        }
    }
}; 