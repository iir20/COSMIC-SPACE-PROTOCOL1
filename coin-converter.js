/**
 * Cosmic Space Protocol - Coin Converter System
 * 
 * This module handles the conversion between different token types (CIS and xCIS).
 */

class CoinConverter {
    constructor() {
        this.isInitialized = false;
        this.conversionRates = {
            CIS_TO_XCIS: 0.9, // 1 CIS = 0.9 xCIS (10% fee)
            XCIS_TO_CIS: 0.1  // 1 xCIS = 0.1 CIS
        };
        this.walletSystem = null;
        this.minAmount = 1;
        this.maxAmount = 10000;
        this.lastConversion = 0;
        this.cooldownPeriod = 5000; // 5 seconds between conversions
    }

    /**
     * Initialize the converter system
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('Coin converter already initialized');
                return true;
            }

            console.log('Initializing coin converter...');
            
            // Connect to wallet system
            this.walletSystem = window.cispWallet;
            
            if (!this.walletSystem) {
                console.warn('Wallet system not available, waiting for it to initialize...');
                
                // Wait for wallet to be available
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.walletSystem = window.cispWallet;
                    if (this.walletSystem) break;
                }
                
                if (!this.walletSystem) {
                    console.error('Wallet system not available after multiple attempts');
                    throw new Error('Wallet system not available');
                }
            }
            
            // Set up UI elements and event listeners
            this._setupEventListeners();
            
            this.isInitialized = true;
            console.log('Coin converter initialized successfully');
            
            // Dispatch initialized event
            window.dispatchEvent(new CustomEvent('coinConverterInitialized'));
            
            return true;
        } catch (error) {
            console.error('Error initializing coin converter:', error);
            return false;
        }
    }

    /**
     * Convert CIS to xCIS
     * @param {number} amount - Amount of CIS to convert
     * @returns {boolean} - Success status
     */
    async convertCISToXCIS(amount) {
        try {
            // Validate amount
            amount = parseFloat(amount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Please enter a valid amount');
            }
            
            if (amount < this.minAmount) {
                throw new Error(`Minimum conversion amount is ${this.minAmount} CIS`);
            }
            
            if (amount > this.maxAmount) {
                throw new Error(`Maximum conversion amount is ${this.maxAmount} CIS`);
            }
            
            // Check cooldown
            const now = Date.now();
            if (now - this.lastConversion < this.cooldownPeriod) {
                const remainingSeconds = Math.ceil((this.cooldownPeriod - (now - this.lastConversion)) / 1000);
                throw new Error(`Please wait ${remainingSeconds} seconds before your next conversion`);
            }
            
            // Get wallet
            if (!this.walletSystem || !this.walletSystem.getCurrentWallet()) {
                throw new Error('Please connect your wallet first');
            }
            
            const wallet = this.walletSystem.getCurrentWallet();
            
            // Ensure wallet has proper balance structure
            if (!wallet.balance) {
                wallet.balance = { CIS: 0, xCIS: 0 };
            } else if (typeof wallet.balance === 'number') {
                wallet.balance = { CIS: wallet.balance, xCIS: 0 };
            }
            
            // Check if user has enough CIS
            if (wallet.balance.CIS < amount) {
                throw new Error(`Not enough CIS. You have ${wallet.balance.CIS.toFixed(2)} CIS`);
            }
            
            // Calculate conversion amount
            const convertedAmount = amount * this.conversionRates.CIS_TO_XCIS;
            
            // Create transaction record
            const transaction = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                from: wallet.address,
                to: wallet.address,
                fromToken: 'CIS',
                toToken: 'xCIS',
                fromAmount: amount,
                toAmount: convertedAmount,
                timestamp: Date.now(),
                type: 'CONVERSION'
            };
            
            // Update wallet balance
            wallet.balance.CIS -= amount;
            wallet.balance.xCIS += convertedAmount;
            
            // Save wallet state
            this.walletSystem._save();
            
            // Update blockchain state if available
            if (window.blockchain) {
                try {
                    // Record transaction in blockchain
                    if (typeof window.blockchain.recordTransaction === 'function') {
                        await window.blockchain.recordTransaction(transaction);
                    }
                    
                    // Update blockchain balances directly if necessary
                    if (typeof window.blockchain.updateBalance === 'function') {
                        await window.blockchain.updateBalance(wallet.address, 'CIS', -amount);
                        await window.blockchain.updateBalance(wallet.address, 'xCIS', convertedAmount);
                    }
                } catch (blockchainError) {
                    console.error('Blockchain update error:', blockchainError);
                    // Continue with local update even if blockchain update fails
                }
            }
            
            // Update last conversion timestamp
            this.lastConversion = Date.now();
            
            // Show success notification
            if (window.notifications) {
                window.notifications.show(
                    `Successfully converted ${amount.toFixed(2)} CIS to ${convertedAmount.toFixed(2)} xCIS`,
                    'success'
                );
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('conversionComplete', {
                detail: {
                    from: 'CIS',
                    to: 'xCIS',
                    inputAmount: amount,
                    outputAmount: convertedAmount,
                    transaction: transaction
                }
            }));
            
            return true;
        } catch (error) {
            console.error('Error converting CIS to xCIS:', error);
            
            // Show error notification
            if (window.notifications) {
                window.notifications.show(error.message, 'error');
            }
            
            return false;
        }
    }

    /**
     * Convert xCIS to CIS
     * @param {number} amount - Amount of xCIS to convert
     * @returns {boolean} - Success status
     */
    async convertXCISToCIS(amount) {
        try {
            // Validate amount
            amount = parseFloat(amount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Please enter a valid amount');
            }
            
            if (amount < this.minAmount) {
                throw new Error(`Minimum conversion amount is ${this.minAmount} xCIS`);
            }
            
            if (amount > this.maxAmount) {
                throw new Error(`Maximum conversion amount is ${this.maxAmount} xCIS`);
            }
            
            // Check cooldown
            const now = Date.now();
            if (now - this.lastConversion < this.cooldownPeriod) {
                const remainingSeconds = Math.ceil((this.cooldownPeriod - (now - this.lastConversion)) / 1000);
                throw new Error(`Please wait ${remainingSeconds} seconds before your next conversion`);
            }
            
            // Get wallet
            if (!this.walletSystem || !this.walletSystem.getCurrentWallet()) {
                throw new Error('Please connect your wallet first');
            }
            
            const wallet = this.walletSystem.getCurrentWallet();
            
            // Ensure wallet has proper balance structure
            if (!wallet.balance) {
                wallet.balance = { CIS: 0, xCIS: 0 };
            } else if (typeof wallet.balance === 'number') {
                wallet.balance = { CIS: wallet.balance, xCIS: 0 };
            }
            
            // Check if user has enough xCIS
            if (wallet.balance.xCIS < amount) {
                throw new Error(`Not enough xCIS. You have ${wallet.balance.xCIS.toFixed(2)} xCIS`);
            }
            
            // Calculate conversion amount
            const convertedAmount = amount * this.conversionRates.XCIS_TO_CIS;
            
            // Create transaction record
            const transaction = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                from: wallet.address,
                to: wallet.address,
                fromToken: 'xCIS',
                toToken: 'CIS',
                fromAmount: amount,
                toAmount: convertedAmount,
                timestamp: Date.now(),
                type: 'CONVERSION'
            };
            
            // Update wallet balance
            wallet.balance.xCIS -= amount;
            wallet.balance.CIS += convertedAmount;
            
            // Save wallet state
            this.walletSystem._save();
            
            // Update blockchain state if available
            if (window.blockchain) {
                try {
                    // Record transaction in blockchain
                    if (typeof window.blockchain.recordTransaction === 'function') {
                        await window.blockchain.recordTransaction(transaction);
                    }
                    
                    // Update blockchain balances directly if necessary
                    if (typeof window.blockchain.updateBalance === 'function') {
                        await window.blockchain.updateBalance(wallet.address, 'xCIS', -amount);
                        await window.blockchain.updateBalance(wallet.address, 'CIS', convertedAmount);
                    }
                } catch (blockchainError) {
                    console.error('Blockchain update error:', blockchainError);
                    // Continue with local update even if blockchain update fails
                }
            }
            
            // Update last conversion timestamp
            this.lastConversion = Date.now();
            
            // Show success notification
            if (window.notifications) {
                window.notifications.show(
                    `Successfully converted ${amount.toFixed(2)} xCIS to ${convertedAmount.toFixed(2)} CIS`,
                    'success'
                );
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('conversionComplete', {
                detail: { 
                    from: 'xCIS',
                    to: 'CIS',
                    inputAmount: amount,
                    outputAmount: convertedAmount,
                    transaction: transaction
                } 
            }));
            
            return true;
        } catch (error) {
            console.error('Error converting xCIS to CIS:', error);
            
            // Show error notification
            if (window.notifications) {
                window.notifications.show(error.message, 'error');
            }
            
            return false;
        }
    }

    /**
     * Get conversion rate for displaying in UI
     * @param {string} from - Source currency (CIS or xCIS)
     * @param {string} to - Target currency (CIS or xCIS)
     * @returns {number} - Conversion rate
     */
    getConversionRate(from, to) {
        if (from === 'CIS' && to === 'xCIS') {
            return this.conversionRates.CIS_TO_XCIS;
        } else if (from === 'xCIS' && to === 'CIS') {
            return this.conversionRates.XCIS_TO_CIS;
        } else {
            return 1; // Same currency
        }
    }

    /**
     * Calculate expected output amount
     * @param {number} inputAmount - Input amount
     * @param {string} fromCurrency - Source currency
     * @param {string} toCurrency - Target currency
     * @returns {number} - Expected output amount
     */
    calculateOutput(inputAmount, fromCurrency, toCurrency) {
        const rate = this.getConversionRate(fromCurrency, toCurrency);
        return inputAmount * rate;
    }

    /**
     * Set up event listeners for UI elements
     */
    _setupEventListeners() {
        try {
            // Find UI elements
            const convertBtn = document.getElementById('convert-button');
            const fromAmountInput = document.getElementById('from-amount');
            const toAmountInput = document.getElementById('to-amount');
            const fromTokenSelect = document.getElementById('from-token');
            const toTokenSelect = document.getElementById('to-token');
            const swapButton = document.querySelector('.swap-button');
            
            if (convertBtn) {
                // Remove existing listeners to prevent duplicates
                const oldClickHandler = convertBtn._clickHandler;
                if (oldClickHandler) {
                    convertBtn.removeEventListener('click', oldClickHandler);
                }
                
                // Create new handler
                const clickHandler = (e) => {
                    e.preventDefault();
                    this.handleConversion();
                };
                
                // Store handler for future reference
                convertBtn._clickHandler = clickHandler;
                
                // Add listener
                convertBtn.addEventListener('click', clickHandler);
                
                console.log('Coin converter event listeners set up successfully');
            } else {
                console.log('Convert button not found on this page');
            }
            
            // Set up other elements
            if (fromAmountInput) {
                fromAmountInput.addEventListener('input', () => {
                    this.updateExpectedOutput(
                        fromAmountInput.value,
                        fromTokenSelect?.value || 'cis',
                        toTokenSelect?.value || 'xcis',
                        toAmountInput
                    );
                });
            }
            
            if (swapButton) {
                swapButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.swapTokens(fromTokenSelect, toTokenSelect, fromAmountInput, toAmountInput);
                });
            }
            
        } catch (error) {
            console.error('Error setting up coin converter event listeners:', error);
        }
    }
    
    swapTokens(fromSelect, toSelect, fromAmount, toAmount) {
        if (!fromSelect || !toSelect) return;
        
        // Swap select values
        const fromVal = fromSelect.value;
        fromSelect.value = toSelect.value;
        toSelect.value = fromVal;
        
        // Update output display
        this.updateExpectedOutput(
            fromAmount.value,
            fromSelect.value,
            toSelect.value,
            toAmount
        );
    }

    /**
     * Handle conversion button click
     */
    async handleConversion() {
        try {
            // Get input values
            const fromAmount = document.getElementById('from-amount');
            const fromToken = document.getElementById('from-token');
            const toToken = document.getElementById('to-token');
            
            if (!fromAmount || !fromToken || !toToken) {
                throw new Error('UI elements not found');
            }
            
            const amount = parseFloat(fromAmount.value);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Please enter a valid amount');
            }
            
            // Perform conversion
            let success = false;
            if (fromToken.value === 'cis' && toToken.value === 'xcis') {
                success = await this.convertCISToXCIS(amount);
            } else if (fromToken.value === 'xcis' && toToken.value === 'cis') {
                success = await this.convertXCISToCIS(amount);
            } else {
                throw new Error('Invalid conversion pair');
            }
            
            if (success) {
                // Clear input
                fromAmount.value = '';
                
                // Update expected output
                document.getElementById('to-amount').value = '';
                
                // Show coin animation
                this._showCoinAnimation();
                
                // Add to history
                this._addToHistory(fromToken.value, toToken.value, amount, amount * this.getConversionRate(fromToken.value, toToken.value));
            }
        } catch (error) {
            console.error('Error handling conversion:', error);
            
            if (window.notifications) {
                window.notifications.show(error.message, 'error');
            }
        }
    }

    /**
     * Update expected output display
     */
    updateExpectedOutput(amount, fromCurrency, toCurrency, outputElement) {
        try {
            amount = parseFloat(amount) || 0;
            const expectedOutput = this.calculateOutput(amount, fromCurrency, toCurrency);
            
            if (outputElement) {
                outputElement.value = expectedOutput.toFixed(2);
            }
            
            // Update min received
            const minReceivedEl = document.getElementById('min-received');
            if (minReceivedEl) {
                const minOutput = expectedOutput * 0.995; // 0.5% slippage
                minReceivedEl.textContent = `${minOutput.toFixed(4)} ${toCurrency.toUpperCase()}`;
            }
            
            // Update convert button state
            const convertBtn = document.getElementById('convert-button');
            if (convertBtn) {
                convertBtn.disabled = amount <= 0;
            }
        } catch (error) {
            console.error('Error updating expected output:', error);
        }
    }
    
    _addToHistory(fromToken, toToken, fromAmount, toAmount) {
        try {
            const historyContainer = document.getElementById('conversion-history');
            if (!historyContainer) return;
            
            // Remove empty history message if present
            const emptyHistory = historyContainer.querySelector('.empty-history');
            if (emptyHistory) {
                emptyHistory.remove();
            }
            
            // Create history item
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.innerHTML = `
                <div class="history-info">
                    <span class="history-date">${new Date().toLocaleString()}</span>
                    <span class="history-type">
                        <i class="fas fa-exchange-alt"></i> 
                        ${fromToken.toUpperCase()} → ${toToken.toUpperCase()}
                    </span>
                </div>
                <div class="history-amount">
                    <span class="history-from">${fromAmount.toFixed(2)} ${fromToken.toUpperCase()}</span>
                    <span class="history-arrow">→</span>
                    <span class="history-to">${toAmount.toFixed(2)} ${toToken.toUpperCase()}</span>
                </div>
            `;
            
            // Add to container
            historyContainer.prepend(historyItem);
            
            // Limit history items to 5
            const items = historyContainer.querySelectorAll('.history-item');
            if (items.length > 5) {
                items[items.length - 1].remove();
            }
            
        } catch (error) {
            console.error('Error adding to history:', error);
        }
    }

    /**
     * Show coin animation effect
     */
    _showCoinAnimation() {
        try {
            const container = document.getElementById('coin-animation');
            if (!container) return;
            
            // Clear previous animation
            container.innerHTML = '';
            
            // Create coins
            for (let i = 0; i < 20; i++) {
                const coin = document.createElement('div');
                coin.className = 'coin';
                
                // Random position
                coin.style.left = `${Math.random() * 100}%`;
                coin.style.animationDelay = `${Math.random() * 0.5}s`;
                coin.style.animationDuration = `${0.5 + Math.random() * 1}s`;
                
                container.appendChild(coin);
            }
            
            // Remove animation after it completes
            setTimeout(() => {
                if (container) {
                    container.innerHTML = '';
                }
            }, 2000);
        } catch (error) {
            console.error('Error showing coin animation:', error);
        }
    }
}

// Create global instance
    window.coinConverter = new CoinConverter();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.coinConverter) {
        window.coinConverter.initialize();
    }
});

// Export for compatibility
window.convertToCIS = function(amount) {
    if (window.coinConverter) {
        return window.coinConverter.convertXCISToCIS(amount);
    }
    return false;
}; 