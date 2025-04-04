if (typeof window.WalletManager === 'undefined') {
    class WalletManager {
        constructor() {
            this.web3 = null;
            this.account = null;
            this.isConnected = false;
            this.onWalletChange = new Set();
            this.contracts = {};
            this.balances = {
                ETH: '0',
                CIS: '0',
                xCIS: '0'
            };
            this.networkId = null;
            this.wallets = {};
            this.currentWallet = null;
            this.initialized = false;
        }

        async initialize() {
            if (this.initialized) return;
            
            try {
                await this.init();
                this.initialized = true;
                console.log('Wallet manager initialized successfully');
                return true;
            } catch (error) {
                console.error('Error initializing wallet manager:', error);
                throw error;
            }
        }

        async init() {
            if (this.initialized) return;
            
            try {
                await this.loadWallets();
                this.initialized = true;
                console.log('Wallet manager initialized successfully');
                return true;
            } catch (error) {
                console.error('Error initializing wallet manager:', error);
                throw error;
            }
        }

        async loadWallets() {
            try {
                console.log('Initializing WalletManager...');
                
                // Check for Web3 injection
                if (typeof window.ethereum !== 'undefined') {
                    this.web3 = new Web3(window.ethereum);
                    console.log('Web3 instance created');
                } else {
                    throw new Error('Please install MetaMask to use this application');
                }

                // Initialize contracts
                await this.initializeContracts();

                // Setup event listeners
                this.setupEventListeners();

                // Check for stored connection
                const storedAddress = localStorage.getItem(WALLET_CONFIG.STORAGE_KEYS.WALLET_ADDRESS);
                if (storedAddress) {
                    await this.connectWallet(true);
                }

                // Start periodic balance updates
                this.startBalanceUpdates();
                
                return true;
            } catch (error) {
                console.error('Failed to initialize WalletManager:', error);
                this.showNotification('Failed to initialize wallet system: ' + error.message, 'error');
                return false;
            }
        }

        async initializeContracts() {
            try {
                if (!this.web3) return;

                this.contracts = {
                    token: new this.web3.eth.Contract(
                        WALLET_CONFIG.ABIS.TOKEN_ABI,
                        WALLET_CONFIG.TOKEN_CONTRACT
                    ),
                    nft: new this.web3.eth.Contract(
                        WALLET_CONFIG.ABIS.NFT_ABI,
                        WALLET_CONFIG.NFT_CONTRACT
                    ),
                    mining: new this.web3.eth.Contract(
                        WALLET_CONFIG.ABIS.MINING_ABI,
                        WALLET_CONFIG.MINING_CONTRACT
                    ),
                    staking: new this.web3.eth.Contract(
                        WALLET_CONFIG.ABIS.STAKING_ABI,
                        WALLET_CONFIG.STAKING_CONTRACT
                    )
                };

                console.log('Contracts initialized');
            } catch (error) {
                console.error('Failed to initialize contracts:', error);
                throw error;
            }
        }

        async connectWallet(silent = false) {
            try {
                if (!this.web3) {
                    throw new Error('Web3 not initialized');
                }

                // Request account access
                const accounts = await window.ethereum.request({ 
                    method: 'eth_requestAccounts' 
                });
                
                if (accounts.length === 0) {
                    throw new Error('No accounts found');
                }

                this.account = accounts[0];
                this.isConnected = true;

                // Save connection
                localStorage.setItem(WALLET_CONFIG.STORAGE_KEYS.WALLET_ADDRESS, this.account);

                // Get network ID
                this.networkId = await this.web3.eth.net.getId();

                // Update balances
                await this.updateBalances();

                // Update UI
                this.updateUI();

                // Notify listeners
                this.notifyListeners();

                if (!silent) {
                    this.showNotification('Wallet connected successfully!', 'success');
                }

                return true;
            } catch (error) {
                console.error('Failed to connect wallet:', error);
                if (!silent) {
                    this.showNotification('Failed to connect wallet: ' + error.message, 'error');
                }
                return false;
            }
        }

        async disconnectWallet() {
            try {
                this.account = null;
                this.isConnected = false;
                this.balances = { ETH: '0', CIS: '0', xCIS: '0' };
                
                // Clear storage
                localStorage.removeItem(WALLET_CONFIG.STORAGE_KEYS.WALLET_ADDRESS);
                localStorage.removeItem(WALLET_CONFIG.STORAGE_KEYS.WALLET_DATA);

                // Update UI
                this.updateUI();

                // Notify listeners
                this.notifyListeners();

                this.showNotification('Wallet disconnected', 'info');
                return true;
            } catch (error) {
                console.error('Error disconnecting wallet:', error);
                this.showNotification('Error disconnecting wallet', 'error');
                return false;
            }
        }

        setupEventListeners() {
            if (window.ethereum) {
                window.ethereum.on('accountsChanged', (accounts) => {
                    if (accounts.length === 0) {
                        this.disconnectWallet();
                    } else {
                        this.account = accounts[0];
                        this.updateBalances();
                        this.updateUI();
                        this.notifyListeners();
                    }
                });

                window.ethereum.on('chainChanged', () => {
                    window.location.reload();
                });

                window.ethereum.on('disconnect', () => {
                    this.disconnectWallet();
                });
            }
        }

        async updateBalances() {
            if (!this.isConnected || !this.account) return;

            try {
                // Get ETH balance
                const ethBalance = await this.web3.eth.getBalance(this.account);
                this.balances.ETH = this.web3.utils.fromWei(ethBalance, 'ether');

                // Get CIS balance
                if (this.contracts.token) {
                    const cisBalance = await this.contracts.token.methods.balanceOf(this.account).call();
                    this.balances.CIS = this.web3.utils.fromWei(cisBalance, 'ether');
                }

                // Get xCIS balance
                if (this.contracts.token) {
                    const xCisBalance = await this.contracts.token.methods.getXCISBalance(this.account).call();
                    this.balances.xCIS = this.web3.utils.fromWei(xCisBalance, 'ether');
                }

                // Update UI with new balances
                this.updateBalanceUI();

                return this.balances;
            } catch (error) {
                console.error('Error updating balances:', error);
                return null;
            }
        }

        startBalanceUpdates() {
            // Update balances every 30 seconds
            setInterval(() => {
                if (this.isConnected) {
                    this.updateBalances();
                }
            }, 30000);
        }

        updateUI() {
            // Update wallet connection button
            const connectBtn = document.querySelector('.wallet-connect');
            const walletInfo = document.getElementById('wallet-info');
            
            if (connectBtn && walletInfo) {
                if (this.isConnected) {
                    connectBtn.style.display = 'none';
                    walletInfo.style.display = 'flex';
                    const addressDisplay = document.getElementById('wallet-address');
                    if (addressDisplay) {
                        addressDisplay.textContent = this.formatAddress(this.account);
                    }
                } else {
                    connectBtn.style.display = 'flex';
                    walletInfo.style.display = 'none';
                }
            }

            // Update balance displays
            this.updateBalanceUI();
        }

        updateBalanceUI() {
            try {
                // Use the new balance widget if containers exist
                const balanceWidgets = document.querySelectorAll('.wallet-balance-widget');
                
                if (balanceWidgets.length > 0) {
                    balanceWidgets.forEach(widget => {
                        if (window.renderBalanceWidget) {
                            // Use the new balance widget renderer
                            window.renderBalanceWidget(widget, this.balances, {
                                showUSD: widget.getAttribute('data-show-usd') !== 'false',
                                showChange: widget.getAttribute('data-show-change') !== 'false',
                                showTotal: widget.getAttribute('data-show-total') !== 'false',
                                showTokenIcons: widget.getAttribute('data-show-icons') !== 'false'
                            });
                        }
                    });
                } else {
                    // Update balance displays using new function if available
                    if (window.updateBalanceDisplays) {
                        window.updateBalanceDisplays(this.balances);
                    } else {
                        // Legacy balance update
                        this.updateLegacyBalanceDisplays();
                    }
                }
                
                // Check for mini balance displays (compact display in header/footer)
                this.updateMiniBalanceDisplays();
            } catch (error) {
                console.error('Error updating balance UI:', error);
            }
        }
        
        updateLegacyBalanceDisplays() {
            // Update balance displays
            const balanceDisplays = document.querySelectorAll('[data-balance-type]');
            balanceDisplays.forEach(display => {
                const type = display.getAttribute('data-balance-type');
                if (this.balances[type]) {
                    display.textContent = this.formatBalance(this.balances[type]);
                }
            });
            
            // Update CIS balance
            const cisBalanceElements = document.querySelectorAll('.cis-balance, .token-balance-cis');
            cisBalanceElements.forEach(el => {
                if (el) el.textContent = this.formatBalance(this.balances.CIS || 0, 'CIS');
            });
            
            // Update xCIS balance
            const xcisBalanceElements = document.querySelectorAll('.xcis-balance, .token-balance-xcis');
            xcisBalanceElements.forEach(el => {
                if (el) el.textContent = this.formatBalance(this.balances.xCIS || 0, 'xCIS');
            });
            
            // Update total balance
            const totalBalance = (Number(this.balances.CIS) || 0) + (Number(this.balances.xCIS) || 0);
            const totalBalanceElements = document.querySelectorAll('.total-balance');
            totalBalanceElements.forEach(el => {
                if (el) el.textContent = this.formatBalance(totalBalance, 'COSMIC');
            });
        }
        
        updateMiniBalanceDisplays() {
            // Update mini balance displays in header/navigation
            const miniDisplays = document.querySelectorAll('.balance-mini-display');
            
            miniDisplays.forEach(display => {
                const type = display.getAttribute('data-token') || 'CIS';
                const balance = this.balances[type] || 0;
                
                // Format with shorter decimals for mini display
                display.textContent = this.formatTokenAmount(balance);
                
                // Add token badge
                const badge = display.querySelector('.token-badge') || document.createElement('span');
                badge.className = `token-badge ${type.toLowerCase()}`;
                badge.textContent = type;
                
                if (!display.querySelector('.token-badge')) {
                    display.appendChild(badge);
                }
            });
        }
        
        formatTokenAmount(amount) {
            // Use the global formatter if available
            if (window.balanceFormatter) {
                return window.balanceFormatter.formatNumber(amount, 2);
            }
            
            // Fallback formatting
            const num = Number(amount);
            return isNaN(num) ? '0.00' : num.toFixed(2);
        }

        formatBalance(balance, symbol = '') {
            // Use the global formatter if available
            if (window.balanceFormatter) {
                return window.balanceFormatter.formatBalance(balance, symbol);
            }
            
            // Fallback formatting
            const formattedNumber = this.formatTokenAmount(balance);
            return symbol ? `${formattedNumber} ${symbol}` : formattedNumber;
        }

        notifyListeners() {
            this.onWalletChange.forEach(callback => {
                try {
                    callback({
                        address: this.account,
                        isConnected: this.isConnected,
                        balances: this.balances,
                        networkId: this.networkId
                    });
                } catch (error) {
                    console.error('Error in wallet change listener:', error);
                }
            });
        }

        addWalletChangeListener(callback) {
            this.onWalletChange.add(callback);
            if (this.isConnected) {
                callback({
                    address: this.account,
                    isConnected: this.isConnected,
                    balances: this.balances,
                    networkId: this.networkId
                });
            }
        }

        removeWalletChangeListener(callback) {
            this.onWalletChange.delete(callback);
        }

        formatAddress(address) {
            return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : '';
        }

        showNotification(message, type = 'info') {
            if (window.notifications) {
                window.notifications.show(message, type);
            } else {
                // Fallback notification
                const notification = document.createElement('div');
                notification.className = `notification ${type}`;
                notification.textContent = message;
                document.body.appendChild(notification);
                setTimeout(() => notification.remove(), 3000);
            }
        }

        // Getters
        getAccount() {
            return this.account;
        }

        getBalances() {
            return this.balances;
        }

        getNetworkId() {
            return this.networkId;
        }

        isWalletConnected() {
            return this.isConnected;
        }

        getContract(name) {
            return this.contracts[name];
        }

        getCurrentWallet() {
            return this.currentWallet;
        }

        getBalance(address) {
            if (!address) {
                address = this.account;
            }
            return this.balances;
        }
    }
    
    window.WalletManager = WalletManager;
    window.walletManager = new WalletManager();
    console.log('WalletManager registered globally as window.walletManager');
}

// Initialize wallet manager globally
window.WalletManager = WalletManager;
window.walletManager = new WalletManager();

// Add this code at the end to ensure wallet manager is properly initialized
document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check if wallet manager is initialized
        if (window.walletManager && !window.walletManager.initialized) {
            if (typeof window.walletManager.init === 'function') {
                window.walletManager.init().catch(error => {
                    console.error('Failed to initialize wallet manager:', error);
                });
            } else if (typeof window.walletManager.initialize === 'function') {
                window.walletManager.initialize().catch(error => {
                    console.error('Failed to initialize wallet manager:', error);
                });
            } else {
                console.error('No initialization method found on wallet manager');
            }
        }
    } catch (error) {
        console.error('Error initializing wallet manager:', error);
    }
}); 