/**
 * Wallet Synchronization System
 */
class WalletSync {
    constructor() {
        this.currentAccount = null;
        this.isConnected = false;
        this.balances = {
            xCIS: '0',
            CIS: '0',
            stakedXCIS: '0',
            pendingRewards: '0'
        };
        this.lastUpdate = 0;
        this.updateInterval = 30000; // 30 seconds
    }

    async init() {
        try {
            // Check if Web3 is available
            if (!window.ethereum || !window.cispChain) {
                throw new Error('Web3 provider or blockchain system not available');
            }

            // Check for existing connection
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                await this.handleAccountChange(accounts);
            }

            // Set up event listeners
            this.setupEventListeners();

            // Start periodic updates
            this.startPeriodicUpdates();

            console.log('Wallet sync system initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize wallet sync:', error);
            return false;
        }
    }

    setupEventListeners() {
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', (accounts) => this.handleAccountChange(accounts));
            window.ethereum.on('chainChanged', () => window.location.reload());
            window.ethereum.on('disconnect', () => this.handleDisconnect());
        }

        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                this.checkAndUpdate();
            }
        });
    }

    async handleAccountChange(accounts) {
        if (accounts.length > 0) {
            this.currentAccount = accounts[0];
            this.isConnected = true;
            await this.updateBalances();
            this.updateUI();
        } else {
            this.handleDisconnect();
        }
    }

    handleDisconnect() {
        this.currentAccount = null;
        this.isConnected = false;
        this.balances = {
            xCIS: '0',
            CIS: '0',
            stakedXCIS: '0',
            pendingRewards: '0'
        };
        this.updateUI();
    }

    async connect() {
        try {
            const accounts = await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            await this.handleAccountChange(accounts);
            return true;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            throw error;
        }
    }

    async updateBalances() {
        try {
            if (!this.isConnected || !this.currentAccount) return;

            const balances = await window.cispChain.getBalances(this.currentAccount);
            this.balances = balances;
            this.lastUpdate = Date.now();
            this.updateUI();
        } catch (error) {
            console.error('Failed to update balances:', error);
        }
    }

    updateUI() {
        // Update wallet button
        const connectButton = document.getElementById('connect-wallet');
        if (connectButton) {
            if (this.isConnected) {
                connectButton.innerHTML = `
                    <i class="fas fa-wallet"></i>
                    <span>${this.formatAddress(this.currentAccount)}</span>
                `;
            } else {
                connectButton.innerHTML = `
                    <i class="fas fa-wallet"></i>
                    <span>Connect Wallet</span>
                `;
            }
        }

        // Update balance displays
        this.updateBalanceDisplay('xCIS-balance', this.balances.xCIS);
        this.updateBalanceDisplay('CIS-balance', this.balances.CIS);
        this.updateBalanceDisplay('staked-balance', this.balances.stakedXCIS);
        this.updateBalanceDisplay('pending-rewards', this.balances.pendingRewards);
    }

    updateBalanceDisplay(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = this.formatBalance(value);
            element.classList.add('value-updated');
            setTimeout(() => element.classList.remove('value-updated'), 500);
        }
    }

    startPeriodicUpdates() {
        setInterval(() => this.checkAndUpdate(), this.updateInterval);
    }

    async checkAndUpdate() {
        if (this.isConnected && document.visibilityState === 'visible') {
            const now = Date.now();
            if (now - this.lastUpdate >= this.updateInterval) {
                await this.updateBalances();
            }
        }
    }

    formatAddress(address) {
        return address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
    }

    formatBalance(balance) {
        return parseFloat(balance).toFixed(4);
    }
}

// Initialize wallet sync system
window.walletSync = new WalletSync();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WalletSync;
} 