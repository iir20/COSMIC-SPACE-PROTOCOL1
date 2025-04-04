/**
 * Cosmic Integration System
 * 
 * This module enhances the integration between the global coordination system,
 * wallet system, and NFT system to fix synchronization issues across pages.
 */

class CosmicIntegration {
    constructor() {
        this.initialized = false;
        this.requiredSystems = ['blockchain', 'wallet'];
        this.systems = {
            coordination: null,
            wallet: null,
            nft: null,
            mining: null,
            notifications: null
        };
        this.syncInterval = null;
        this.syncIntervalTime = 3000; // 3 seconds
        this.lastSyncTime = 0;
        this.debugMode = true;
        this.retryAttempts = 0;
        this.maxRetries = 5;
        this.initializationPromise = null;
    }

    /**
     * Initialize the integration system
     */
    async initialize() {
        // Prevent multiple simultaneous initialization attempts
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = (async () => {
            try {
                console.log('[Cosmic Integration] Initializing Cosmic Integration System');
                
                // Check if all required systems are available
                const allSystems = ['blockchain', 'wallet', 'mining', 'nft'];
                const missingSystems = [];
                
                for (const system of allSystems) {
                    // Check if system exists globally
                    const systemObj = window[system + 'System'] || window[system] || window['cisp' + system.charAt(0).toUpperCase() + system.slice(1)];
                    
                    if (!systemObj) {
                        missingSystems.push(system);
                    } else {
                        // Store reference to system
                        this.systems[system] = systemObj;
                    }
                }
                
                // If any required systems are missing, retry with backoff
                if (missingSystems.length > 0) {
                    if (this.retryAttempts < this.maxRetries) {
                        this.retryAttempts++;
                        const delay = Math.min(1000 * this.retryAttempts, 5000); // Increase delay with each retry
                        console.log(`[Cosmic Integration] Missing systems: ${missingSystems.join(', ')}. Retrying in ${delay}ms (attempt ${this.retryAttempts}/${this.maxRetries})`);
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this.initialize();
                    } else {
                        console.warn(`[Cosmic Integration] Some systems unavailable after ${this.maxRetries} retries: ${missingSystems.join(', ')}. Continuing with available systems.`);
                    }
                }

                // Initialize integration components
                await this.initializeComponents();
                
                this.initialized = true;
                console.log('[Cosmic Integration] Cosmic Integration System initialized successfully');
                
                // Dispatch initialization event
                window.dispatchEvent(new CustomEvent('cosmicIntegration:initialized'));
                
                // Make globally available
                window.cosmicIntegration = this;
                
                return true;
            } catch (error) {
                console.error('[Cosmic Integration] Initialization error:', error);
                this.logError('Initialization failed', error);
                throw error;
            }
        })();

        return this.initializationPromise;
    }

    async initializeComponents() {
        // Initialize system synchronization
        this.setupSystemSync();
        
        // Initialize event listeners
        this.setupEventListeners();
        
        // Initial synchronization
        await this.synchronizeAll();
    }

    setupSystemSync() {
        // Set up periodic synchronization
        this.syncInterval = setInterval(() => this.synchronizeAll(), this.syncIntervalTime);
    }

    setupEventListeners() {
        // Add system-specific event listeners
        window.addEventListener('wallet:changed', () => this.synchronizeAll());
        window.addEventListener('mining:updated', () => this.synchronizeAll());
        window.addEventListener('nft:updated', () => this.synchronizeAll());

        // Listen for wallet events
        window.addEventListener('walletConnected', (event) => {
            this.log('Wallet connected event detected', event.detail);
            this.handleWalletConnection(event.detail?.wallet);
        });

        window.addEventListener('walletDisconnected', () => {
            this.log('Wallet disconnected event detected');
            this.handleWalletDisconnection();
        });

        window.addEventListener('walletBalanceUpdated', (event) => {
            this.log('Wallet balance updated event detected', event.detail);
            this.handleBalanceUpdate(event.detail);
        });

        // Listen for NFT events
        window.addEventListener('nftMinted', (event) => {
            this.log('NFT minted event detected', event.detail);
            this.handleNFTMinted(event.detail);
        });

        window.addEventListener('nftTransferred', (event) => {
            this.log('NFT transferred event detected', event.detail);
            this.handleNFTTransferred(event.detail);
        });

        // Listen for coordination system events
        window.addEventListener('coordination:state:updated', (event) => {
            this.log('Coordination state updated event detected', event.detail);
            this.handleCoordinationStateUpdate(event.detail);
        });

        // Listen for page visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.log('Page became visible, forcing resync');
                this.synchronizeAll(true);
            }
        });
    }

    /**
     * Handle wallet connection event
     */
    handleWalletConnection(wallet) {
        if (!wallet || !this.systems.coordination) return;

        // Update coordination system state
        this.systems.coordination.updateState('wallet', {
            connected: true,
            address: wallet.address,
            balance: wallet.balance || { CIS: 0, xCIS: 0 }
        });

        // Synchronize NFTs for this wallet
        this.synchronizeNFTs(wallet.address);
    }

    /**
     * Handle wallet disconnection event
     */
    handleWalletDisconnection() {
        if (!this.systems.coordination) return;

        // Update coordination system state
        this.systems.coordination.updateState('wallet', {
            connected: false,
            address: null,
            balance: { CIS: 0, xCIS: 0 }
        });

        // Clear NFT display
        this.systems.coordination.updateState('nft.owned', []);
    }

    /**
     * Handle balance update event
     */
    handleBalanceUpdate(data) {
        if (!data || !this.systems.coordination) return;

        const { address, token, balance } = data;
        const currentWalletAddress = this.systems.coordination.getState('wallet.address');

        if (address && currentWalletAddress === address) {
            // Update specific token balance
            const newBalance = { ...this.systems.coordination.getState('wallet.balance') };
            newBalance[token] = balance;
            this.systems.coordination.updateState('wallet.balance', newBalance);
        }
    }

    /**
     * Handle NFT minted event
     */
    handleNFTMinted(data) {
        if (!data || !data.nft || !this.systems.coordination) return;

        const nft = data.nft;
        const currentWalletAddress = this.systems.coordination.getState('wallet.address');

        // Update total minted count
        this.systems.coordination.updateState('nft.totalMinted', 
            this.systems.coordination.getState('nft.totalMinted') + 1);

        // Update rarity distribution
        const rarityDistribution = { ...this.systems.coordination.getState('nft.rarityDistribution') };
        rarityDistribution[nft.rarity] = (rarityDistribution[nft.rarity] || 0) + 1;
        this.systems.coordination.updateState('nft.rarityDistribution', rarityDistribution);

        // If this NFT belongs to the current wallet, add it to owned NFTs
        if (nft.owner === currentWalletAddress) {
            const ownedNfts = [...this.systems.coordination.getState('nft.owned')];
            ownedNfts.push(nft);
            this.systems.coordination.updateState('nft.owned', ownedNfts);
            this.systems.coordination.updateState('wallet.nftCount', ownedNfts.length);
        }
    }

    /**
     * Handle NFT transferred event
     */
    handleNFTTransferred(data) {
        if (!data || !data.nft || !this.systems.coordination) return;

        const { nft, from, to } = data;
        const currentWalletAddress = this.systems.coordination.getState('wallet.address');

        // If transferred from current wallet
        if (from === currentWalletAddress) {
            const ownedNfts = this.systems.coordination.getState('nft.owned').filter(
                ownedNft => ownedNft.id !== nft.id
            );
            this.systems.coordination.updateState('nft.owned', ownedNfts);
            this.systems.coordination.updateState('wallet.nftCount', ownedNfts.length);
        }

        // If transferred to current wallet
        if (to === currentWalletAddress) {
            const ownedNfts = [...this.systems.coordination.getState('nft.owned')];
            ownedNfts.push(nft);
            this.systems.coordination.updateState('nft.owned', ownedNfts);
            this.systems.coordination.updateState('wallet.nftCount', ownedNfts.length);
        }
    }

    /**
     * Handle coordination state update event
     */
    handleCoordinationStateUpdate(data) {
        // Update UI based on state changes
        this.updateUI();
    }

    /**
     * Synchronize all systems
     */
    async synchronizeAll(force = false) {
        const now = Date.now();
        
        // Skip if not forced and last sync was too recent
        if (!force && now - this.lastSyncTime < this.syncIntervalTime / 2) {
            return;
        }

        this.lastSyncTime = now;
        console.log('[Cosmic Integration] Synchronizing all systems');

        // Synchronize wallet state
        await this.synchronizeWallet();

        // Synchronize NFTs
        if (this.systems.coordination && this.systems.coordination.getState('wallet.connected')) {
            const walletAddress = this.systems.coordination.getState('wallet.address');
            await this.synchronizeNFTs(walletAddress);
        }

        // Update UI
        this.updateUI();
    }

    /**
     * Synchronize wallet state
     */
    async synchronizeWallet() {
        if (!this.systems.wallet || !this.systems.coordination) return;

        try {
            // Get current wallet from wallet system
            let currentWallet = null;
            
            // Try different methods to get the current wallet
            if (typeof this.systems.wallet.getCurrentWallet === 'function') {
                currentWallet = this.systems.wallet.getCurrentWallet();
            } else if (this.systems.wallet.currentWallet) {
                currentWallet = this.systems.wallet.currentWallet;
            }
            
            if (currentWallet) {
                // Update coordination system state
                this.systems.coordination.updateState('wallet', {
                    connected: true,
                    address: currentWallet.address,
                    balance: currentWallet.balance || { CIS: 0, xCIS: 0 }
                });

                // Check if wallet is properly connected by seeing if it matches the current wallet
                const isConnected = this.systems.wallet.currentWallet?.address === currentWallet.address;
                if (!isConnected) {
                    this.log('Wallet exists but not properly connected, reconnecting');
                    try {
                        if (typeof this.systems.wallet.connectWallet === 'function') {
                            this.systems.wallet.connectWallet(currentWallet.address);
                        }
                    } catch (error) {
                        this.log('Error reconnecting wallet:', error);
                    }
                }
            } else {
                // Check if coordination system thinks wallet is connected
                if (this.systems.coordination.getState('wallet.connected')) {
                    // Try to reconnect using the address in coordination system
                    const savedAddress = this.systems.coordination.getState('wallet.address');
                    
                    // Check if the wallet exists in the wallet system
                    let walletExists = false;
                    if (this.systems.wallet.wallets) {
                        if (typeof this.systems.wallet.wallets.has === 'function') {
                            walletExists = this.systems.wallet.wallets.has(savedAddress);
                        } else if (this.systems.wallet.wallets[savedAddress]) {
                            walletExists = true;
                        }
                    }
                    
                    if (savedAddress && walletExists) {
                        this.log('Attempting to reconnect wallet', savedAddress);
                        try {
                            if (typeof this.systems.wallet.connectWallet === 'function') {
                                this.systems.wallet.connectWallet(savedAddress);
                            }
                        } catch (error) {
                            this.log('Error reconnecting wallet:', error);
                        }
                    } else {
                        // No wallet available, update coordination system
                        this.systems.coordination.updateState('wallet', {
                            connected: false,
                            address: null,
                            balance: { CIS: 0, xCIS: 0 }
                        });
                    }
                }
            }
        } catch (error) {
            this.log('Error synchronizing wallet:', error);
        }
    }

    /**
     * Synchronize NFTs for a wallet address
     */
    async synchronizeNFTs(walletAddress) {
        if (!walletAddress || !this.systems.nft || !this.systems.coordination) return;

        this.log('Synchronizing NFTs for', walletAddress);

        // Get NFTs for this address
        const nfts = this.systems.nft.getNFTsByOwner(walletAddress);
        
        if (nfts && Array.isArray(nfts)) {
            // Update owned NFTs in coordination system
            this.systems.coordination.updateState('nft.owned', nfts);
            this.systems.coordination.updateState('wallet.nftCount', nfts.length);
        }

        // Update NFT statistics
        if (this.systems.nft.getStatistics) {
            const stats = this.systems.nft.getStatistics();
            if (stats) {
                this.systems.coordination.updateState('nft.totalMinted', stats.totalMinted || 0);
                this.systems.coordination.updateState('nft.rarityDistribution', stats.rarityCount || {});
            }
        }
    }

    /**
     * Update UI elements based on current state
     */
    updateUI() {
        if (!this.systems.coordination) return;

        const state = this.systems.coordination.getState();
        
        // Update wallet connection UI
        this.updateWalletConnectionUI(state.wallet);
        
        // Update balance displays
        this.updateBalanceDisplays(state.wallet.balance);
        
        // Update NFT displays
        this.updateNFTDisplays(state.nft.owned);
    }

    /**
     * Update wallet connection UI elements
     */
    updateWalletConnectionUI(walletState) {
        // Update connect/disconnect buttons
        const connectButtons = document.querySelectorAll('.connect-wallet-btn, .wallet-connect-btn');
        const disconnectButtons = document.querySelectorAll('.disconnect-wallet-btn, .wallet-disconnect-btn');
        const walletAddressElements = document.querySelectorAll('.wallet-address, .current-wallet-address');
        
        if (walletState.connected && walletState.address) {
            // Hide connect buttons, show disconnect buttons
            connectButtons.forEach(btn => {
                if (btn) {
                    btn.style.display = 'none';
                    if (btn.parentElement && btn.parentElement.querySelector('.connected-status')) {
                        btn.parentElement.querySelector('.connected-status').style.display = 'inline-flex';
                    }
                }
            });
            
            disconnectButtons.forEach(btn => {
                if (btn) btn.style.display = 'inline-flex';
            });
            
            // Update wallet address displays
            walletAddressElements.forEach(el => {
                if (el) el.textContent = this.formatAddress(walletState.address);
            });
            
            // Update wallet status indicators
            const walletStatusElements = document.querySelectorAll('.wallet-status');
            walletStatusElements.forEach(el => {
                if (el) {
                    el.textContent = 'Connected';
                    el.classList.remove('disconnected');
                    el.classList.add('connected');
                }
            });
        } else {
            // Show connect buttons, hide disconnect buttons
            connectButtons.forEach(btn => {
                if (btn) {
                    btn.style.display = 'inline-flex';
                    if (btn.parentElement && btn.parentElement.querySelector('.connected-status')) {
                        btn.parentElement.querySelector('.connected-status').style.display = 'none';
                    }
                }
            });
            
            disconnectButtons.forEach(btn => {
                if (btn) btn.style.display = 'none';
            });
            
            // Clear wallet address displays
            walletAddressElements.forEach(el => {
                if (el) el.textContent = 'Not Connected';
            });
            
            // Update wallet status indicators
            const walletStatusElements = document.querySelectorAll('.wallet-status');
            walletStatusElements.forEach(el => {
                if (el) {
                    el.textContent = 'Not Connected';
                    el.classList.remove('connected');
                    el.classList.add('disconnected');
                }
            });
        }
    }

    /**
     * Update balance displays
     */
    updateBalanceDisplays(balanceData) {
        if (!balanceData) return;
        
        // Use the new global balance update function if available
        if (window.updateBalanceDisplays) {
            window.updateBalanceDisplays(balanceData);
            return;
        }

        // Legacy balance update (fallback)
        
        // Update CIS balance displays
        const cisBalanceElements = document.querySelectorAll('.cis-balance, .token-balance-cis');
        cisBalanceElements.forEach(el => {
            if (el) {
                el.textContent = this.formatBalance(balanceData.CIS || 0, 'CIS');
                
                // Add animation class to highlight changes
                this.addHighlightAnimation(el);
            }
        });
        
        // Update xCIS balance displays
        const xcisBalanceElements = document.querySelectorAll('.xcis-balance, .token-balance-xcis');
        xcisBalanceElements.forEach(el => {
            if (el) {
                el.textContent = this.formatBalance(balanceData.xCIS || 0, 'xCIS');
                
                // Add animation class to highlight changes
                this.addHighlightAnimation(el);
            }
        });
        
        // Update total balance displays (CIS + xCIS)
        const totalBalance = (Number(balanceData.CIS) || 0) + (Number(balanceData.xCIS) || 0);
        const totalBalanceElements = document.querySelectorAll('.total-balance');
        totalBalanceElements.forEach(el => {
            if (el) {
                el.textContent = this.formatBalance(totalBalance, 'COSMIC');
                
                // Add animation class to highlight changes
                this.addHighlightAnimation(el);
            }
        });
    }
    
    /**
     * Add highlight animation to an element
     */
    addHighlightAnimation(element) {
        // Add highlight class
        element.classList.add('highlight');
        
        // Remove class after animation completes
        setTimeout(() => {
            element.classList.remove('highlight');
        }, 2000);
    }
    
    /**
     * Format balance with the global formatter or fallback
     */
    formatBalance(amount, symbol = '') {
        // Use the global formatter if available
        if (window.balanceFormatter) {
            return window.balanceFormatter.formatBalance(amount, symbol);
        }
        
        // Fallback formatting
        return this.formatNumberWithCommas(amount) + (symbol ? ` ${symbol}` : '');
    }

    /**
     * Update NFT displays
     */
    updateNFTDisplays(nfts) {
        if (!nfts) return;
        
        // Find NFT container elements
        const nftContainers = document.querySelectorAll('.nft-grid, .nft-container, .nft-collection');
        if (nftContainers.length === 0) return;
        
        nftContainers.forEach(container => {
            // Clear existing NFTs
            container.innerHTML = '';
            
            if (nfts.length === 0) {
                // Show empty state
                const emptyState = document.createElement('div');
                emptyState.className = 'nft-empty-state';
                emptyState.innerHTML = `
                    <div class="empty-state-icon">🌌</div>
                    <h3>No NFTs Found</h3>
                    <p>Your cosmic collection is empty. Start mining or visit the marketplace to acquire NFTs.</p>
                `;
                container.appendChild(emptyState);
                return;
            }
            
            // Render each NFT
            nfts.forEach(nft => {
                const nftCard = document.createElement('div');
                nftCard.className = `nft-card ${nft.rarity.toLowerCase()}`;
                nftCard.dataset.nftId = nft.id;
                
                // Generate image path based on NFT category and rarity
                const imagePath = `nft-images/${nft.category.toLowerCase()}/${nft.rarity.toLowerCase()}.png`;
                
                nftCard.innerHTML = `
                    <div class="nft-image-container">
                        <img src="${imagePath}" alt="${nft.name}" class="nft-image" onerror="this.src='nft-images/placeholder.png'">
                        <div class="nft-rarity-badge ${nft.rarity.toLowerCase()}">${nft.rarity}</div>
                    </div>
                    <div class="nft-details">
                        <h3 class="nft-name">${nft.name}</h3>
                        <p class="nft-category">${nft.category}</p>
                        <div class="nft-attributes">
                            ${this.renderNFTAttributes(nft.attributes)}
                        </div>
                    </div>
                `;
                
                container.appendChild(nftCard);
            });
        });
        
        // Update NFT count displays
        const nftCountElements = document.querySelectorAll('.nft-count');
        nftCountElements.forEach(el => {
            if (el) el.textContent = nfts.length;
        });
    }

    /**
     * Render NFT attributes as HTML
     */
    renderNFTAttributes(attributes) {
        if (!attributes || Object.keys(attributes).length === 0) {
            return '<p class="no-attributes">No attributes</p>';
        }
        
        let html = '';
        for (const [key, value] of Object.entries(attributes)) {
            html += `<div class="nft-attribute"><span class="attribute-name">${key}:</span> <span class="attribute-value">${value}</span></div>`;
        }
        return html;
    }

    /**
     * Format wallet address for display
     */
    formatAddress(address) {
        if (!address) return 'Not Connected';
        if (address.length <= 10) return address;
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    }

    /**
     * Format number with commas
     */
    formatNumberWithCommas(num) {
        return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    /**
     * Log message if debug mode is enabled
     */
    log(message, ...args) {
        if (this.debugMode) {
            console.log(`[Cosmic Integration] ${message}`, ...args);
        }
    }

    logError(message, error) {
        if (this.debugMode) {
            console.error(`[Cosmic Integration] ${message}:`, error);
        }
    }
}

// Initialize cosmic integration
const cosmicIntegration = new CosmicIntegration();
cosmicIntegration.initialize().catch(error => {
    console.error('[Cosmic Integration] Failed to initialize:', error);
}); 