// Transaction Handler for CISP
class TransactionHandler {
    constructor() {
        this.pendingTransactions = new Map();
        this.transactionHistory = [];
        this.maxHistoryLength = 100;
        this.confirmationBlocks = 1;
    }

    async init() {
        try {
            // Load transaction history from local storage
            this.loadTransactionHistory();
            
            // Setup event listeners
            this.setupEventListeners();
            
            return true;
        } catch (error) {
            console.error('Transaction handler initialization failed:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Listen for new blocks to check transaction confirmations
        window.addEventListener('blockUpdated', async (event) => {
            await this.checkPendingTransactions();
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', () => {
            this.clearPendingTransactions();
        });
    }

    async handleTransaction(type, params) {
        if (!window.walletSync.isConnected) {
            throw new Error('Wallet not connected');
        }

        try {
            // Estimate gas before transaction
            const gasEstimate = await this.estimateGas(type, params);

            // Create transaction object
            const transaction = {
                type,
                params,
                timestamp: Date.now(),
                status: 'pending',
                gasEstimate
            };

            // Execute transaction based on type
            const result = await this.executeTransaction(transaction);
            
            // Add to pending transactions
            this.addPendingTransaction(result.hash, {
                ...transaction,
                hash: result.hash
            });

            // Add to history
            this.addToHistory({
                ...transaction,
                hash: result.hash,
                blockNumber: result.blockNumber
            });

            return result;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    async executeTransaction(transaction) {
        const { type, params } = transaction;

        try {
            let result;
            switch (type) {
                case 'mining.start':
                    result = await window.cispChain.startMining(
                        window.walletSync.currentAccount
                    );
                    break;

                case 'mining.claim':
                    result = await window.cispChain.claimMiningRewards(
                        window.walletSync.currentAccount
                    );
                    break;

                case 'staking.stake':
                    result = await window.cispChain.stake(
                        window.walletSync.currentAccount,
                        window.cispChain.parseAmount(params.amount)
                    );
                    break;

                case 'staking.unstake':
                    result = await window.cispChain.unstake(
                        window.walletSync.currentAccount,
                        window.cispChain.parseAmount(params.amount)
                    );
                    break;

                case 'staking.claim':
                    result = await window.cispChain.claimStakingRewards(
                        window.walletSync.currentAccount
                    );
                    break;

                case 'transfer.xCIS':
                    result = await window.cispChain.sendXCIS(
                        window.walletSync.currentAccount,
                        params.to,
                        window.cispChain.parseAmount(params.amount)
                    );
                    break;

                case 'transfer.CIS':
                    result = await window.cispChain.sendCIS(
                        window.walletSync.currentAccount,
                        params.to,
                        window.cispChain.parseAmount(params.amount)
                    );
                    break;

                case 'convert.xCIStoCIS':
                    result = await window.cispChain.convertXCIStoCIS(
                        window.walletSync.currentAccount,
                        window.cispChain.parseAmount(params.amount)
                    );
                    break;

                case 'convert.CIStoXCIS':
                    result = await window.cispChain.convertCIStoXCIS(
                        window.walletSync.currentAccount,
                        window.cispChain.parseAmount(params.amount)
                    );
                    break;

                default:
                    throw new Error('Unknown transaction type');
            }

            return result;
        } catch (error) {
            console.error('Transaction execution failed:', error);
            throw error;
        }
    }

    async estimateGas(type, params) {
        try {
            const gasPrice = await window.cispChain.getGasPrice();
            let gasEstimate;

            switch (type) {
                case 'mining.start':
                    gasEstimate = await window.cispChain.contracts.mining.methods
                        .startMining()
                        .estimateGas({ from: window.walletSync.currentAccount });
                    break;

                case 'mining.claim':
                    gasEstimate = await window.cispChain.contracts.mining.methods
                        .claimRewards()
                        .estimateGas({ from: window.walletSync.currentAccount });
                    break;

                case 'staking.stake':
                    gasEstimate = await window.cispChain.contracts.staking.methods
                        .stake(window.cispChain.parseAmount(params.amount))
                        .estimateGas({ from: window.walletSync.currentAccount });
                    break;

                // Add other cases as needed

                default:
                    gasEstimate = 21000; // Default gas limit
            }

            return {
                gasEstimate,
                gasPrice,
                totalCost: window.cispChain.formatBalance(
                    (BigInt(gasEstimate) * BigInt(gasPrice)).toString()
                )
            };
        } catch (error) {
            console.error('Gas estimation failed:', error);
            throw error;
        }
    }

    addPendingTransaction(hash, transaction) {
        this.pendingTransactions.set(hash, transaction);
        this.savePendingTransactions();
        
        // Dispatch event
        window.dispatchEvent(new CustomEvent('transactionPending', {
            detail: { transaction }
        }));
    }

    async checkPendingTransactions() {
        for (const [hash, transaction] of this.pendingTransactions.entries()) {
            try {
                const receipt = await window.cispChain.web3.eth.getTransactionReceipt(hash);
                
                if (receipt) {
                    const currentBlock = await window.cispChain.web3.eth.getBlockNumber();
                    const confirmations = currentBlock - receipt.blockNumber;

                    if (confirmations >= this.confirmationBlocks) {
                        // Transaction confirmed
                        this.confirmTransaction(hash, receipt);
                    }
                }
            } catch (error) {
                console.error('Error checking transaction:', error);
            }
        }
    }

    confirmTransaction(hash, receipt) {
        const transaction = this.pendingTransactions.get(hash);
        if (!transaction) return;

        // Update transaction status
        transaction.status = receipt.status ? 'confirmed' : 'failed';
        transaction.receipt = receipt;
        transaction.confirmationTime = Date.now();

        // Remove from pending
        this.pendingTransactions.delete(hash);
        this.savePendingTransactions();

        // Update history
        this.updateTransactionInHistory(hash, transaction);

        // Dispatch event
        window.dispatchEvent(new CustomEvent('transactionConfirmed', {
            detail: { transaction }
        }));

        // Trigger balance update
        window.walletSync.updateBalances();
    }

    addToHistory(transaction) {
        this.transactionHistory.unshift(transaction);
        
        // Limit history length
        if (this.transactionHistory.length > this.maxHistoryLength) {
            this.transactionHistory = this.transactionHistory.slice(0, this.maxHistoryLength);
        }
        
        this.saveTransactionHistory();
    }

    updateTransactionInHistory(hash, updatedTransaction) {
        const index = this.transactionHistory.findIndex(tx => tx.hash === hash);
        if (index !== -1) {
            this.transactionHistory[index] = {
                ...this.transactionHistory[index],
                ...updatedTransaction
            };
            this.saveTransactionHistory();
        }
    }

    getTransactionHistory(filters = {}) {
        let filtered = [...this.transactionHistory];

        if (filters.type) {
            filtered = filtered.filter(tx => tx.type === filters.type);
        }

        if (filters.status) {
            filtered = filtered.filter(tx => tx.status === filters.status);
        }

        if (filters.timeRange) {
            const { start, end } = filters.timeRange;
            filtered = filtered.filter(tx => 
                tx.timestamp >= start && tx.timestamp <= end
            );
        }

        return filtered;
    }

    clearPendingTransactions() {
        this.pendingTransactions.clear();
        this.savePendingTransactions();
    }

    savePendingTransactions() {
        try {
            localStorage.setItem('pendingTransactions', 
                JSON.stringify(Array.from(this.pendingTransactions.entries()))
            );
        } catch (error) {
            console.error('Error saving pending transactions:', error);
        }
    }

    loadTransactionHistory() {
        try {
            const stored = localStorage.getItem('transactionHistory');
            if (stored) {
                this.transactionHistory = JSON.parse(stored);
            }
        } catch (error) {
            console.error('Error loading transaction history:', error);
            this.transactionHistory = [];
        }
    }

    saveTransactionHistory() {
        try {
            localStorage.setItem('transactionHistory', 
                JSON.stringify(this.transactionHistory)
            );
        } catch (error) {
            console.error('Error saving transaction history:', error);
        }
    }
}

// Initialize transaction handler
window.transactionHandler = new TransactionHandler();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionHandler;
} 