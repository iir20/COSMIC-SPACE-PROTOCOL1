class TransactionHandler {
    constructor() {
        this.web3 = window.web3;
        this.pendingTransactions = new Map();
        this.transactionTimeout = 300000; // 5 minutes
        this.init();
    }

    async init() {
        try {
            if (!this.web3) {
                console.error('Web3 not initialized');
                return;
            }
            
            console.log('Transaction handler initialized');
            this.setupEventListeners();
        } catch (error) {
            console.error('Failed to initialize transaction handler:', error);
        }
    }

    setupEventListeners() {
        window.addEventListener('newBlock', (event) => {
            this.checkPendingTransactions(event.detail.blockNumber);
        });
    }

    async sendTransaction(transactionConfig) {
        try {
            const {
                to,
                from,
                value,
                data,
                gasPrice,
                gasLimit
            } = transactionConfig;

            // Validate transaction parameters
            if (!to || !from) {
                throw new Error('Invalid transaction parameters');
            }

            // Estimate gas if not provided
            const gas = gasLimit || await this.web3.eth.estimateGas({
                to,
                from,
                value: value || '0x0',
                data: data || '0x'
            });

            // Get current gas price if not provided
            const currentGasPrice = gasPrice || await this.web3.eth.getGasPrice();

            const transaction = {
                to,
                from,
                value: value || '0x0',
                gas,
                gasPrice: currentGasPrice,
                data: data || '0x'
            };

            const txHash = await this.web3.eth.sendTransaction(transaction);
            
            // Add to pending transactions
            this.addPendingTransaction(txHash, {
                ...transaction,
                timestamp: Date.now()
            });

            return txHash;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    addPendingTransaction(txHash, transaction) {
        this.pendingTransactions.set(txHash, transaction);
        
        // Set timeout to remove transaction if not confirmed
        setTimeout(() => {
            if (this.pendingTransactions.has(txHash)) {
                this.pendingTransactions.delete(txHash);
                this.emitTransactionTimeout(txHash);
            }
        }, this.transactionTimeout);
    }

    async checkPendingTransactions(blockNumber) {
        for (const [txHash, transaction] of this.pendingTransactions) {
            try {
                const receipt = await this.web3.eth.getTransactionReceipt(txHash);
                
                if (receipt) {
                    this.pendingTransactions.delete(txHash);
                    this.emitTransactionConfirmed(receipt);
                }
            } catch (error) {
                console.error('Error checking transaction:', error);
            }
        }
    }

    emitTransactionConfirmed(receipt) {
        const event = new CustomEvent('transactionConfirmed', {
            detail: {
                receipt,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }

    emitTransactionTimeout(txHash) {
        const event = new CustomEvent('transactionTimeout', {
            detail: {
                txHash,
                timestamp: Date.now()
            }
        });
        window.dispatchEvent(event);
    }

    getPendingTransactions() {
        return Array.from(this.pendingTransactions.entries()).map(([hash, tx]) => ({
            hash,
            ...tx
        }));
    }

    async getTransactionStatus(txHash) {
        try {
            const receipt = await this.web3.eth.getTransactionReceipt(txHash);
            if (!receipt) {
                return 'pending';
            }
            return receipt.status ? 'confirmed' : 'failed';
        } catch (error) {
            console.error('Error getting transaction status:', error);
            return 'error';
        }
    }

    clearPendingTransactions() {
        this.pendingTransactions.clear();
    }
}

// Initialize transaction handler when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.transactionHandler = new TransactionHandler();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransactionHandler;
} 