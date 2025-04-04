/**
 * Cosmic Space Protocol Blockchain (CISP)
 * A lightweight blockchain implementation for the Cosmic Space Protocol
 */

class Block {
    constructor(index, timestamp, transactions, previousHash = '') {
        this.index = index;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.previousHash = previousHash;
        this.nonce = 0;
        this.hash = '';
    }

    async calculateHash(blockData) {
        // If no blockData provided, try to use class properties
        if (!blockData) {
            blockData = {
                index: this.index,
                previousHash: this.previousHash,
                timestamp: this.timestamp,
                transactions: this.transactions,
                nonce: this.nonce
            };
        }
        
        // Convert to string for hashing
        const dataString = typeof blockData === 'string' 
            ? blockData 
            : JSON.stringify(blockData);
        
        // Use browser's crypto API if available
        try {
            const encoder = new TextEncoder();
            const dataBuffer = encoder.encode(dataString);
            const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (error) {
            console.warn('Crypto API not available, using fallback hash:', error);
            return fallbackSHA256(dataString);
        }
    }

    async mineBlock(difficulty) {
        const target = Array(difficulty + 1).join("0");
        while (!this.hash || !this.hash.startsWith(target)) {
            this.nonce++;
            this.hash = await this.calculateHash();
        }
        return this.hash;
    }
}

class Transaction {
    constructor(fromAddress, toAddress, amount, type = 'TRANSFER') {
        this.fromAddress = fromAddress;
        this.toAddress = toAddress;
        this.amount = amount;
        this.type = type; // TRANSFER, MINT, REWARD, NFT_MINT
        this.timestamp = Date.now();
        this.signature = '';
    }

    calculateHash() {
        return SHA256(
            this.fromAddress +
            this.toAddress +
            this.amount +
            this.type +
            this.timestamp
        ).toString();
    }

    signTransaction(signingKey) {
        // In a real implementation, this would use proper key signing
        // For now we'll use a simplified approach
        if (!signingKey) {
            throw new Error('No signing key provided');
        }

        const hashTx = this.calculateHash();
        // In a real implementation, we would use the private key to sign
        this.signature = SHA256(hashTx + signingKey).toString();
    }

    isValid() {
        // Minting and reward transactions don't need a signature
        if (this.fromAddress === null) return true;

        if (!this.signature || this.signature.length === 0) {
            throw new Error('No signature in this transaction');
        }

        // In a real implementation, we would verify the signature with the public key
        // For now, we'll just check if it exists
        return true;
    }
}

class Blockchain {
    constructor() {
        this.balances = new Map();
        this.transactions = [];
        this.addresses = {};
        this.nftCollections = {};
        this.difficulty = 2;
        this.miningReward = 10;
        this.conversionRate = 0.1; // 1 xCIS = 0.1 CIS
        
        // Mining configuration
        this.maxSupplyXCIS = 21000000; // 21 million xCIS
        this.circulatingSupplyXCIS = 0;
        this.blockReward = 50; // Initial block reward
        this.halveningInterval = 210000; // Number of blocks between halvings
        this.lastBlockTime = Date.now();
        this.blockTime = 30000; // Target block time in milliseconds (30 seconds)
        
        // New properties for enhanced functionality
        this.mempool = new Map();
        this.hashingMode = 'js'; // 'js' or 'wasm'
        this.difficultyHistory = [];
        this.targetBlockTime = 120000; // 2 minutes in milliseconds
        this.difficultyAdjustmentWindow = 10; // blocks
        this.difficultyAdjustmentPercentage = 10; // max 10% change per adjustment
        
        // Initialize WebAssembly if available
        this._initWasm();
        
        // Load state from localStorage if available
        this.loadState();
    }

    async init() {
        // Load from localStorage if exists
        const savedData = localStorage.getItem('blockchain_data');
        if (savedData) {
            const data = JSON.parse(savedData);
            this.balances = new Map(data.balances);
            this.transactions = data.transactions;
        }
    }

    async addBalance(address, token, amount) {
        if (!address) {
            throw new Error('Address is required');
        }
        
        if (!token) {
            throw new Error('Token type is required');
        }
        
        if (isNaN(amount) || amount <= 0) {
            throw new Error('Amount must be a positive number');
        }
        
        // Create address entry if it doesn't exist
        if (!this.balances.has(address)) {
            this.balances.set(address, {});
        }
        
        const addressBalances = this.balances.get(address);
        
        // Initialize token balance if it doesn't exist
        if (!addressBalances[token]) {
            addressBalances[token] = 0;
        }
        
        // Add the amount
        addressBalances[token] += amount;
        
        // Save to localStorage
        this._save();
        
        // Create a transaction record for this balance addition
        const transaction = new Transaction(
            null, // From null for minting/airdrop transactions
            address,
            amount,
            'MINT' // This is a minting transaction
        );
        
        // Add transaction to history
        this.transactions.push(transaction);
        
        // Update circulating supply for xCIS
        if (token === 'xCIS') {
            this.circulatingSupplyXCIS += amount;
        }
        
        // Emit event for UI updates
        const event = new CustomEvent('balance:updated', {
            detail: {
                address,
                token,
                newBalance: addressBalances[token]
            }
        });
        document.dispatchEvent(event);
        
        return addressBalances[token];
    }

    getBalance(address, token) {
        if (!address || !token) {
            return 0;
        }
        
        const addressBalances = this.balances.get(address);
        if (!addressBalances) {
            return 0;
        }
        
        // Check if the specified token exists in the address balances
        if (typeof addressBalances[token] === 'undefined') {
            return 0;
        }
        
        return addressBalances[token];
    }

    getWalletBalance(address) {
        if (!address) {
            return { CIS: 0, xCIS: 0 };
        }
        
        const addressBalances = this.balances.get(address);
        if (!addressBalances) {
            return { CIS: 0, xCIS: 0 };
        }
        
        // Return object with both token balances
        return {
            CIS: addressBalances.CIS || 0,
            xCIS: addressBalances.xCIS || 0
        };
    }

    _save() {
        try {
            // Save balances
            localStorage.setItem('cisp_balances', JSON.stringify(Array.from(this.balances.entries())));
            
            // Save transactions (keep only the last 100 for performance)
            const recentTransactions = this.transactions.slice(-100);
            localStorage.setItem('cisp_transactions', JSON.stringify(recentTransactions));
            
            // Save other state
            localStorage.setItem('cisp_state', JSON.stringify({
                circulatingSupplyXCIS: this.circulatingSupplyXCIS,
                lastBlockTime: this.lastBlockTime,
                difficulty: this.difficulty
            }));
        } catch (error) {
            console.error('Error saving blockchain state:', error);
        }
    }

    loadState() {
        try {
            // Load balances
            const savedBalances = localStorage.getItem('cisp_balances');
            if (savedBalances) {
                this.balances = new Map(JSON.parse(savedBalances));
            }
            
            // Load transactions
            const savedTransactions = localStorage.getItem('cisp_transactions');
            if (savedTransactions) {
                this.transactions = JSON.parse(savedTransactions);
            }
            
            // Load other state
            const savedState = localStorage.getItem('cisp_state');
            if (savedState) {
                const state = JSON.parse(savedState);
                this.circulatingSupplyXCIS = state.circulatingSupplyXCIS || 0;
                this.lastBlockTime = state.lastBlockTime || Date.now();
                this.difficulty = state.difficulty || 2;
            }
        } catch (error) {
            console.error('Error loading blockchain state:', error);
            // Initialize with defaults if loading fails
            this.balances = new Map();
            this.transactions = [];
            this.circulatingSupplyXCIS = 0;
            this.lastBlockTime = Date.now();
            this.difficulty = 2;
        }
    }

    /**
     * Grant initial tokens to a new wallet
     */
    async grantInitialTokens(address, amount = 100) {
        try {
            console.log(`Granting ${amount} xCIS to ${address}`);
            
            // Initialize pendingTransactions if it doesn't exist
            if (!this.pendingTransactions) {
                this.pendingTransactions = [];
            }
            
            // Create a transaction
            const tx = {
                id: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
                from: 'COSMIC_TREASURY',
                to: address,
                amount: amount,
                token: 'xCIS',
                type: 'INITIAL_GRANT',
                timestamp: Date.now(),
                status: 'confirmed',
                confirmations: 1
            };
            
            this.pendingTransactions.push(tx);
            
            // Add to user's balance directly
            await this.addBalance(address, 'xCIS', amount);
            
            // Update circulating supply
            this.circulatingSupplyXCIS += amount;
            
            return true;
        } catch (error) {
            console.error('Error granting initial tokens:', error);
            return false;
        }
    }

    async processMinedBlock(block, minerAddress) {
        try {
            // Validate block
            if (!block || !block.hash || !minerAddress) {
                throw new Error('Invalid block data');
            }

            // Calculate reward based on current difficulty
            const reward = 0.1; // Base reward
            
            // Update miner's balance
            const currentBalance = this.getBalanceXCIS(minerAddress);
            this.addBalance(minerAddress, 'xCIS', currentBalance + reward);

            return {
                success: true,
                reward: reward,
                newDifficulty: 2.0 // Fixed difficulty for now
            };
        } catch (error) {
            console.error('Error processing block:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // New method to initialize WebAssembly hashing
    async _initWasm() {
        try {
            // Check for blockchainWasm from our fallback script
            if (window.blockchainWasm && typeof window.blockchainWasm.getModule === 'function') {
                console.log('Using blockchainWasm fallback module');
                this.wasmInstance = window.blockchainWasm.getModule();
                return true;
            }
            
            // Fetch and compile the WebAssembly module
            console.log('Attempting to load WebAssembly from server');
            const response = await fetch('/blockchain.wasm');
            
            // Continue with the existing code
            const wasmBuffer = await response.arrayBuffer();
            const wasmModule = await WebAssembly.compile(wasmBuffer);
            const wasmInstance = await WebAssembly.instantiate(wasmModule);
            
            this.wasmInstance = wasmInstance;
            return true;
        } catch (error) {
            console.error('WASM initialization failed, falling back to JS implementation:', error);
            
            // Use JS fallback
            this.wasmInstance = {
                hash: this._hashJS.bind(this),
                verify: this._verifyJS.bind(this)
            };
            
            return false;
        }
    }

    // JavaScript fallback implementation of hash function
    _hashJS(data) {
        // Simple JavaScript hash implementation for fallback
        if (typeof data !== 'string') {
            try {
                data = JSON.stringify(data);
            } catch (e) {
                console.error('Cannot hash data:', e);
                return '0';
            }
        }
        
        let h = 0x811c9dc5;
        for (let i = 0; i < data.length; i++) {
            h ^= data.charCodeAt(i);
            h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
        }
        
        return (h >>> 0).toString(16);
    }

    // JavaScript fallback implementation of verify function
    _verifyJS(data, signature) {
        return this._hashJS(data) === signature;
    }

    _getJsFallback() {
        return {
            hash: async function(data) {
                const encoder = new TextEncoder();
                const dataBuffer = encoder.encode(data);
                const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        };
    }

    // Helper to create a WASM buffer from string
    _createWasmBuffer(wasmCode) {
        // This is a simplified implementation to create a WASM buffer
        // In a real implementation, you would compile proper WASM binary
        
        if (typeof wasmCode !== 'string') {
            throw new Error('WASM code must be a string');
        }
        
        // For our demo, we'll use a pre-compiled buffer with basic operations
        // This is just to demonstrate the concept
        const buffer = new ArrayBuffer(1024);
        const view = new Uint8Array(buffer);
        
        // Set WebAssembly module header
        view[0] = 0x00;  // Magic number (0x0061736d)
        view[1] = 0x61;
        view[2] = 0x73;
        view[3] = 0x6d;
        view[4] = 0x01;  // Version (1.0)
        view[5] = 0x00;
        view[6] = 0x00;
        view[7] = 0x00;
        
        // This is a placeholder - in a real implementation, 
        // you would generate actual WASM bytecode
        
        return buffer;
    }

    // Enhanced mining method with WebAssembly support
    async mineBlock(minerAddress, difficulty = this.difficulty) {
        // Add dynamic difficulty adjustment
        const adjustedDifficulty = this._calculateDynamicDifficulty();
        difficulty = adjustedDifficulty || difficulty;
        
        // Create block data for hashing
        const blockData = {
            minerAddress,
            timestamp: Date.now(),
            difficulty: difficulty,
            nonce: this.nonce || 0,
            previousHash: this.previousHash || ''
        };
        
        // Set target hash pattern
        const target = Array(difficulty + 1).join("0");
        let hash = '';
        
        // Use WASM hashing if available
        if (this.hashingMode === 'wasm' && this.wasmInstance && this.wasmInstance.exports.sha256) {
            try {
                // Convert the data to bytes
                const dataString = JSON.stringify(blockData);
                const dataBytes = new TextEncoder().encode(dataString);
                
                // Copy data into WASM memory
                const memory = this.wasmInstance.exports.memory;
                const dataPtr = 32; // Start after the initial data
                const memoryArray = new Uint8Array(memory.buffer);
                memoryArray.set(dataBytes, dataPtr);
                
                // Call WASM sha256 function
                const resultPtr = this.wasmInstance.exports.sha256(dataPtr, dataBytes.length);
                
                // Read hash result from memory
                const hashBytes = new Uint8Array(memory.buffer, resultPtr, 32); // SHA-256 is 32 bytes
                hash = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');
            } catch (wasmError) {
                console.warn('WASM mining failed, falling back to JS:', wasmError);
                hash = await this.calculateHash(blockData);
            }
        } else {
            hash = await this.calculateHash(blockData);
        }
        
        // Store the hash
        this.hash = hash;
        
        // After mining, record difficulty for future adjustments
        this.difficultyHistory.push({
            timestamp: Date.now(),
            difficulty: difficulty,
            blockIndex: this.chain?.length || 0
        });
        
        // Limit history size
        if (this.difficultyHistory.length > 100) {
            this.difficultyHistory.shift();
        }
        
        return hash;
    }
    
    // New method for dynamic difficulty calculation
    _calculateDynamicDifficulty() {
        if (!this.chain || this.chain.length < this.difficultyAdjustmentWindow) {
            return this.difficulty; // Not enough blocks yet
        }
        
        const lastAdjustmentBlock = this.chain[this.chain.length - this.difficultyAdjustmentWindow];
        const timeSpent = Date.now() - lastAdjustmentBlock.timestamp;
        const expectedTime = this.targetBlockTime * this.difficultyAdjustmentWindow;
        
        // Calculate ratio of actual vs expected time
        const ratio = timeSpent / expectedTime;
        
        // If mining too fast, increase difficulty; if too slow, decrease
        let newDifficulty = this.difficulty;
        if (ratio < 0.8) {
            // Too fast, increase difficulty
            const increase = Math.min(this.difficultyAdjustmentPercentage / 100, 1 - ratio);
            newDifficulty = Math.min(
                this.difficulty * (1 + increase),
                this.difficulty + 1 // Max 1 difficulty increase per adjustment
            );
        } else if (ratio > 1.2) {
            // Too slow, decrease difficulty
            const decrease = Math.min(this.difficultyAdjustmentPercentage / 100, ratio - 1);
            newDifficulty = Math.max(
                this.difficulty * (1 - decrease),
                1 // Never go below difficulty 1
            );
        }
        
        return parseFloat(newDifficulty.toFixed(2)); // Round to 2 decimal places
    }
    
    // New method to get transaction mempool
    getMempool() {
        return Array.from(this.mempool.values());
    }
    
    // Enhanced add transaction method with mempool
    addTransaction(transaction) {
        // Validate transaction
        if (!transaction || !transaction.fromAddress || !transaction.toAddress) {
            throw new Error('Invalid transaction data');
        }
        
        // Add to mempool first
        const txId = transaction.id || this._generateTransactionId(transaction);
        transaction.id = txId;
        transaction.timestamp = transaction.timestamp || Date.now();
        transaction.status = 'pending';
        
        this.mempool.set(txId, transaction);
        
        // Broadcast event for UI updates
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('mempoolUpdate', {
                detail: { transaction, mempoolSize: this.mempool.size }
            }));
        }
        
        return txId;
    }
    
    // When mining a block, select transactions from mempool
    _selectTransactionsForBlock() {
        const transactions = [];
        const maxTransactions = 10; // Configurable block size limit
        
        // Sort by fee (in a real blockchain) or timestamp for this demo
        const sortedTransactions = Array.from(this.mempool.values())
            .sort((a, b) => b.timestamp - a.timestamp);
        
        // Select transactions up to limit
        for (let i = 0; i < Math.min(maxTransactions, sortedTransactions.length); i++) {
            transactions.push(sortedTransactions[i]);
            this.mempool.delete(sortedTransactions[i].id);
        }
        
        return transactions;
    }
    
    // Get blockchain statistics for dashboard
    getStatistics() {
        if (!this.chain) {
            return {
                blocks: 0,
                transactions: 0,
                difficulty: this.difficulty,
                mempoolSize: this.mempool.size,
                lastBlockTime: 0,
                averageBlockTime: 0,
                difficultyHistory: []
            };
        }

        return {
            blocks: this.chain.length,
            transactions: this.chain.reduce((acc, block) => acc + block.transactions.length, 0),
            difficulty: this.difficulty,
            mempoolSize: this.mempool.size,
            lastBlockTime: this.chain.length > 1 ? 
                (this.chain[this.chain.length - 1].timestamp - this.chain[this.chain.length - 2].timestamp) / 1000 : 0,
            averageBlockTime: this._calculateAverageBlockTime(),
            difficultyHistory: this.difficultyHistory.slice(-20) // Last 20 adjustments
        };
    }
    
    // Calculate average block time
    _calculateAverageBlockTime() {
        if (!this.chain || this.chain.length < 3) {
            return 0;
        }
        
        const lastBlocks = this.chain.slice(-11); // Last 10 intervals (11 blocks)
        let totalTime = 0;
        
        for (let i = 1; i < lastBlocks.length; i++) {
            totalTime += lastBlocks[i].timestamp - lastBlocks[i-1].timestamp;
        }
        
        return totalTime / (lastBlocks.length - 1) / 1000; // Average in seconds
    }
}

// Export core classes first
window.Block = Block;
window.Transaction = Transaction;
window.Blockchain = Blockchain;
window.SHA256 = SHA256;

// Initialize blockchain and wallet manager
async function initializeBlockchain() {
    try {
        console.log('Initializing blockchain and wallet system...');
        
        // Create blockchain instance if not exists
        if (!window.blockchain) {
            window.blockchain = new Blockchain();
        }
        
        // Initialize blockchain
        await window.blockchain.init();
        
        // Make blockchain globally available
        window.cispChain = window.blockchain;
        
        console.log('Blockchain initialized successfully');
        
        // Dispatch initialization complete event
        window.dispatchEvent(new CustomEvent('blockchainInitialized'));
        
        return true;
    } catch (error) {
        console.error('Error during initialization:', error);
        window.dispatchEvent(new CustomEvent('blockchainInitError', { detail: error }));
        throw error;
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initializeBlockchain());
} else {
    initializeBlockchain();
}

// SHA-256 hashing function implementation
async function SHA256(data) {
    try {
        // Convert data to string if it's not already
        const dataString = typeof data === 'string' ? data : JSON.stringify(data);
        
        // Use browser's crypto API
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(dataString);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
        console.error('Error in SHA256:', error);
        // Fallback to simple hash if crypto API fails
        return fallbackSHA256(data);
    }
}

function fallbackSHA256(data) {
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
        const char = dataString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16).padStart(64, '0');
}

// Wallet Management Class
class WalletManager {
    constructor() {
        this.wallets = {};
        this.currentWallet = null;
        this.loadWallets();
        
        // Bind methods to instance
        this.getWallets = this.getWallets.bind(this);
        this.getCurrentWallet = this.getCurrentWallet.bind(this);
        this.createWallet = this.createWallet.bind(this);
        this.setCurrentWallet = this.setCurrentWallet.bind(this);
        this.disconnectWallet = this.disconnectWallet.bind(this);
    }

    loadWallets() {
        try {
            const savedWallets = localStorage.getItem('CISP_Wallets');
            if (savedWallets) {
                this.wallets = JSON.parse(savedWallets);
            }
            
            const currentWalletAddress = localStorage.getItem('CISP_CurrentWallet');
            if (currentWalletAddress) {
                this.currentWallet = this.wallets[currentWalletAddress];
            }
            
            console.log('Wallets loaded:', Object.keys(this.wallets).length);
        } catch (error) {
            console.error('Error loading wallets:', error);
            this.wallets = {};
            this.currentWallet = null;
        }
    }

    getWallets() {
        return Object.values(this.wallets);
    }

    getCurrentWallet() {
        return this.currentWallet;
    }

    async createWallet(name) {
        try {
            console.log('Starting wallet creation process');
            if (!window.cispChain) {
                throw new Error('Blockchain not initialized');
            }

            const walletData = await window.cispChain.createWallet(name);
            if (!walletData.success) {
                throw new Error(walletData.error || 'Failed to create wallet');
            }

            const wallet = {
                address: walletData.address,
                name: walletData.name,
                balances: walletData.balance
            };

            this.wallets[wallet.address] = wallet;
            this.currentWallet = wallet;
            this.saveWallets();

            console.log('Wallet created successfully:', wallet);

            // Dispatch wallet creation event
            const event = new CustomEvent('walletCreated', {
                detail: walletData
            });
            window.dispatchEvent(event);

            return walletData;
        } catch (error) {
            console.error('Error creating wallet:', error);
            throw error;
        }
    }

    saveWallets() {
        try {
            localStorage.setItem('CISP_Wallets', JSON.stringify(this.wallets));
            if (this.currentWallet) {
                localStorage.setItem('CISP_CurrentWallet', this.currentWallet.address);
            } else {
                localStorage.removeItem('CISP_CurrentWallet');
            }
            console.log('Wallets saved to localStorage');
        } catch (error) {
            console.error('Error saving wallets:', error);
        }
    }

    setCurrentWallet(address) {
        if (!this.wallets[address]) {
            throw new Error('Wallet not found');
        }
        this.currentWallet = this.wallets[address];
        this.saveWallets();

        // Dispatch wallet changed event
        const event = new CustomEvent('walletChanged', {
            detail: this.currentWallet
        });
        window.dispatchEvent(event);
    }

    disconnectWallet() {
        this.currentWallet = null;
        this.saveWallets();

        // Dispatch wallet changed event
        const event = new CustomEvent('walletChanged', {
            detail: null
        });
        window.dispatchEvent(event);
    }
}

// Make the blockchain instance globally available
window.blockchain = window.blockchain || new Blockchain();

// Create a blockchain visualization module
class BlockchainVisualizer {
    constructor(blockchain) {
        this.blockchain = blockchain;
        this.container = null;
    }
    
    initialize(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container ${containerId} not found`);
            return false;
        }
        
        // Set up visualization
        this.render();
        
        // Set up event listeners
        window.addEventListener('newBlock', () => this.render());
        window.addEventListener('mempoolUpdate', () => this.renderMempool());
        
        return true;
    }
    
    render() {
        if (!this.container) return;
        
        // Clear container
        this.container.innerHTML = '';
        
        // Create a blockchain visualization
        const blocksContainer = document.createElement('div');
        blocksContainer.className = 'blockchain-blocks';
        
        // Add blocks
        this.blockchain.chain.forEach((block, index) => {
            const blockElement = this._createBlockElement(block, index);
            blocksContainer.appendChild(blockElement);
        });
        
        this.container.appendChild(blocksContainer);
        
        // Add mempool
        this.renderMempool();
    }
    
    renderMempool() {
        if (!this.container) return;
        
        // Find or create mempool container
        let mempoolContainer = this.container.querySelector('.blockchain-mempool');
        if (!mempoolContainer) {
            mempoolContainer = document.createElement('div');
            mempoolContainer.className = 'blockchain-mempool';
            mempoolContainer.innerHTML = '<h3>Transaction Mempool</h3>';
            this.container.appendChild(mempoolContainer);
        } else {
            // Clear existing transactions
            const h3 = mempoolContainer.querySelector('h3');
            mempoolContainer.innerHTML = '';
            mempoolContainer.appendChild(h3);
        }
        
        // Add mempool transactions
        const mempool = this.blockchain.getMempool();
        
        if (mempool.length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'No pending transactions';
            mempoolContainer.appendChild(emptyMsg);
            return;
        }
        
        mempool.forEach(tx => {
            const txElement = this._createTransactionElement(tx);
            mempoolContainer.appendChild(txElement);
        });
    }
    
    _createBlockElement(block, index) {
        const blockElement = document.createElement('div');
        blockElement.className = 'blockchain-block';
        blockElement.dataset.index = index;
        
        // Block header
        const header = document.createElement('div');
        header.className = 'block-header';
        header.innerHTML = `<span class="block-index">Block #${index}</span>`;
        blockElement.appendChild(header);
        
        // Block details
        const details = document.createElement('div');
        details.className = 'block-details';
        details.innerHTML = `
            <div><strong>Hash:</strong> <span class="hash">${block.hash.substring(0, 10)}...</span></div>
            <div><strong>Previous:</strong> <span class="prev-hash">${
                index > 0 ? block.previousHash.substring(0, 10) + '...' : 'Genesis'
            }</span></div>
            <div><strong>Time:</strong> ${new Date(block.timestamp).toLocaleString()}</div>
            <div><strong>Transactions:</strong> ${block.transactions.length}</div>
            <div><strong>Difficulty:</strong> ${block.difficulty}</div>
            <div><strong>Nonce:</strong> ${block.nonce}</div>
        `;
        blockElement.appendChild(details);
        
        return blockElement;
    }
    
    _createTransactionElement(tx) {
        const txElement = document.createElement('div');
        txElement.className = 'mempool-transaction';
        
        txElement.innerHTML = `
            <div><strong>ID:</strong> ${tx.id.substring(0, 10)}...</div>
            <div><strong>Type:</strong> ${tx.type}</div>
            <div><strong>From:</strong> ${
                tx.from ? tx.from.substring(0, 6) + '...' : 'System'
            }</div>
            <div><strong>To:</strong> ${tx.to.substring(0, 6)}...</div>
            <div><strong>Amount:</strong> ${tx.amount} ${tx.token || 'CISP'}</div>
            <div><strong>Time:</strong> ${new Date(tx.timestamp).toLocaleTimeString()}</div>
        `;
        
        return txElement;
    }
}

// Make visualizer available globally
if (typeof window !== 'undefined') {
    window.BlockchainVisualizer = BlockchainVisualizer;
}

// CISP Blockchain Integration
class CISPBlockchain {
    constructor() {
        this.web3 = null;
        this.contracts = {
            xCIS: null,
            CIS: null,
            mining: null,
            staking: null
        };
        this.networkId = null;
        this.gasPrice = '50000000000'; // Default gas price
        this.initialized = false;
    }

    async init() {
        try {
            // Check if Web3 is injected
            if (typeof window.ethereum !== 'undefined') {
                this.web3 = new Web3(window.ethereum);
                this.networkId = await this.web3.eth.net.getId();
                
                // Initialize contracts
                await this.initializeContracts();
                this.initialized = true;

                // Setup event listeners
                this.setupEventListeners();
                
                // Initial balance sync
                await this.syncBalances();
                
                return true;
            } else {
                throw new Error('Web3 provider not found');
            }
        } catch (error) {
            console.error('Blockchain initialization failed:', error);
            return false;
        }
    }

    async initializeContracts() {
        // Contract ABIs and addresses
        const contractAddresses = {
            xCIS: '0x...', // xCIS contract address
            CIS: '0x...', // CIS contract address
            mining: '0x...', // Mining contract address
            staking: '0x...' // Staking contract address
        };

        // Initialize contract instances
        this.contracts.xCIS = new this.web3.eth.Contract(XCIS_ABI, contractAddresses.xCIS);
        this.contracts.CIS = new this.web3.eth.Contract(CIS_ABI, contractAddresses.CIS);
        this.contracts.mining = new this.web3.eth.Contract(MINING_ABI, contractAddresses.mining);
        this.contracts.staking = new this.web3.eth.Contract(STAKING_ABI, contractAddresses.staking);
    }

    setupEventListeners() {
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            this.syncBalances();
            window.dispatchEvent(new CustomEvent('walletChanged', { detail: accounts[0] }));
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', (chainId) => {
            window.location.reload();
        });

        // Listen for block updates
        this.web3.eth.subscribe('newBlockHeaders', async (error, block) => {
            if (!error) {
                await this.syncBalances();
                window.dispatchEvent(new CustomEvent('blockUpdated', { detail: block }));
            }
        });
    }

    async syncBalances() {
        try {
            const accounts = await this.web3.eth.getAccounts();
            if (accounts.length === 0) return;

            const account = accounts[0];
            const balances = {
                xCIS: await this.getXCISBalance(account),
                CIS: await this.getCISBalance(account),
                stakedXCIS: await this.getStakedBalance(account),
                pendingRewards: await this.getPendingRewards(account)
            };

            window.dispatchEvent(new CustomEvent('balanceUpdated', { detail: balances }));
            return balances;
        } catch (error) {
            console.error('Balance sync failed:', error);
            throw error;
        }
    }

    // Token Balance Methods
    async getXCISBalance(address) {
        return this.contracts.xCIS.methods.balanceOf(address).call();
    }

    async getCISBalance(address) {
        return this.contracts.CIS.methods.balanceOf(address).call();
    }

    async getStakedBalance(address) {
        return this.contracts.staking.methods.stakedBalance(address).call();
    }

    async getPendingRewards(address) {
        return this.contracts.staking.methods.pendingRewards(address).call();
    }

    // Transaction Methods
    async sendXCIS(from, to, amount) {
        try {
            const gasEstimate = await this.contracts.xCIS.methods.transfer(to, amount)
                .estimateGas({ from });

            return await this.contracts.xCIS.methods.transfer(to, amount)
                .send({
                    from,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('xCIS transfer failed:', error);
            throw error;
        }
    }

    async sendCIS(from, to, amount) {
        try {
            const gasEstimate = await this.contracts.CIS.methods.transfer(to, amount)
                .estimateGas({ from });

            return await this.contracts.CIS.methods.transfer(to, amount)
                .send({
                    from,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('CIS transfer failed:', error);
            throw error;
        }
    }

    // Mining Methods
    async startMining(address) {
        try {
            const gasEstimate = await this.contracts.mining.methods.startMining()
                .estimateGas({ from: address });

            return await this.contracts.mining.methods.startMining()
                .send({
                    from: address,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('Mining start failed:', error);
            throw error;
        }
    }

    async claimMiningRewards(address) {
        try {
            const gasEstimate = await this.contracts.mining.methods.claimRewards()
                .estimateGas({ from: address });

            return await this.contracts.mining.methods.claimRewards()
                .send({
                    from: address,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('Mining rewards claim failed:', error);
            throw error;
        }
    }

    // Staking Methods
    async stake(address, amount) {
        try {
            // First approve staking contract
            await this.contracts.xCIS.methods.approve(this.contracts.staking._address, amount)
                .send({
                    from: address,
                    gasPrice: this.gasPrice
                });

            const gasEstimate = await this.contracts.staking.methods.stake(amount)
                .estimateGas({ from: address });

            return await this.contracts.staking.methods.stake(amount)
                .send({
                    from: address,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('Staking failed:', error);
            throw error;
        }
    }

    async unstake(address, amount) {
        try {
            const gasEstimate = await this.contracts.staking.methods.unstake(amount)
                .estimateGas({ from: address });

            return await this.contracts.staking.methods.unstake(amount)
                .send({
                    from: address,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('Unstaking failed:', error);
            throw error;
        }
    }

    async claimStakingRewards(address) {
        try {
            const gasEstimate = await this.contracts.staking.methods.claimRewards()
                .estimateGas({ from: address });

            return await this.contracts.staking.methods.claimRewards()
                .send({
                    from: address,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('Staking rewards claim failed:', error);
            throw error;
        }
    }

    // Conversion Methods
    async convertXCIStoCIS(address, amount) {
        try {
            const gasEstimate = await this.contracts.xCIS.methods.convert(amount)
                .estimateGas({ from: address });

            return await this.contracts.xCIS.methods.convert(amount)
                .send({
                    from: address,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('xCIS to CIS conversion failed:', error);
            throw error;
        }
    }

    async convertCIStoXCIS(address, amount) {
        try {
            const gasEstimate = await this.contracts.CIS.methods.convert(amount)
                .estimateGas({ from: address });

            return await this.contracts.CIS.methods.convert(amount)
                .send({
                    from: address,
                    gas: Math.floor(gasEstimate * 1.2),
                    gasPrice: this.gasPrice
                });
        } catch (error) {
            console.error('CIS to xCIS conversion failed:', error);
            throw error;
        }
    }

    // Utility Methods
    async getGasPrice() {
        try {
            return await this.web3.eth.getGasPrice();
        } catch (error) {
            console.error('Gas price fetch failed:', error);
            return this.gasPrice;
        }
    }

    async estimateGas(transaction) {
        try {
            return await this.web3.eth.estimateGas(transaction);
        } catch (error) {
            console.error('Gas estimation failed:', error);
            throw error;
        }
    }

    formatBalance(balance, decimals = 18) {
        return this.web3.utils.fromWei(balance, 'ether');
    }

    parseAmount(amount, decimals = 18) {
        return this.web3.utils.toWei(amount.toString(), 'ether');
    }
}

// Initialize blockchain instance
window.cispChain = new CISPBlockchain();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Block,
        Transaction,
        Blockchain,
        CISPBlockchain,
        WalletManager,
        BlockchainVisualizer
    };
} 