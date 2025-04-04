class MiningSystem {
    constructor() {
        this.initialized = false;
        this.requiredSystems = ['blockchain', 'wallet'];
        this.worker = null;
        this.isRunning = false;
        this.miningPower = 1;
        this.contract = null;
        this.totalMined = 0;
        this.currentHashRate = 0;
        this.blockReward = 0;
        this.difficulty = 0;
        this.poolAddress = null;
        this.sessionReward = 0;
        this.blocksFound = 0;
        this.energyUsage = 0;
        this.retryAttempts = 0;
        this.maxRetries = 5;
        this.initializationPromise = null;
    }
    
    async initialize() {
        try {
            // Check if required systems are available through coordinator
            for (const system of this.requiredSystems) {
                if (!window.coordinator.isSystemInitialized(system)) {
                    throw new Error(`Required system not available: ${system}`);
                }
            }
            
            console.log('Mining system initializing...');
            // Initialize mining components here
            
            this.initialized = true;
            console.log('Mining system initialized successfully');
            
            // Make globally available
            window.miningSystem = this;
            
            return true;
        } catch (error) {
            console.error('Mining system initialization error:', error);
            throw error;
        }
    }
    
    async initializeMiningComponents() {
        // Initialize mining worker
        if (!window.miningWorker) {
            window.miningWorker = new Worker('mining-worker.js');
        }

        // Set up event listeners
        this.setupEventListeners();
        
        // Initialize mining UI
        this.initializeMiningUI();
    }
    
    setupEventListeners() {
        // Add mining system event listeners
        window.miningWorker.onmessage = this.handleWorkerMessage.bind(this);
        window.miningWorker.onerror = this.handleWorkerError.bind(this);
    }
    
    initializeMiningUI() {
        const startButton = document.getElementById('startMining');
        const stopButton = document.getElementById('stopMining');
        
        if (startButton) {
            startButton.addEventListener('click', () => this.startMining());
        }
        
        if (stopButton) {
            stopButton.addEventListener('click', () => this.stopMining());
        }
    }
    
    async handleWorkerMessage(event) {
        const { type, data } = event.data;
        
        switch (type) {
            case 'hashRate':
                this.updateHashRate(data);
                break;
            case 'block':
                this.handleBlockMined(data);
                break;
            case 'error':
                this.handleWorkerError(data);
                break;
        }
    }
    
    handleWorkerError(error) {
        console.error('Mining worker error:', error);
        this.showNotification('Mining Error', error.message || 'An error occurred in the mining process', 'error');
        this.stopMining();
    }
    
    async updateMiningParameters() {
        try {
            // Get current difficulty
            this.difficulty = await this.getCurrentDifficulty();
            
            // Get block reward
            this.blockReward = await window.miningContract.methods.blockReward().call();
            
            // Get pool info
            const pool = await window.miningContract.methods.miningPools(window.cispWallet.getCurrentWallet()?.address).call();
            this.poolAddress = pool.isActive ? window.cispWallet.getCurrentWallet()?.address : null;
            
            // Update worker if running
            if (this.isRunning) {
                this.worker.postMessage({
                    type: 'update',
                    data: {
                        difficulty: this.difficulty,
                        miningPower: this.miningPower
                    }
                });
            }
            
            this.updateUI();
        } catch (error) {
            console.error('Error updating mining parameters:', error);
            throw error;
        }
    }
    
    async getCurrentDifficulty() {
        try {
            return await window.miningContract.methods.difficulty().call();
        } catch (error) {
            console.error('Error getting current difficulty:', error);
            return '0x100000'; // Default difficulty
        }
    }
    
    async startMining() {
        try {
            if (this.isRunning) return;
            
            // Ensure initialization
            if (!this.initialized) {
                await this.initialize();
            }
            
            // Check wallet connection
            const currentWallet = window.cispWallet.getCurrentWallet();
            if (!currentWallet || !currentWallet.address) {
                throw new Error('Please connect your wallet to start mining');
            }
            
            // Register pool if needed
            if (!this.poolAddress) {
                await this.registerPool();
            }
            
            // Update parameters before starting
            await this.updateMiningParameters();
            
            // Start mining worker
            this.worker.postMessage({ type: 'start' });
            this.isRunning = true;
            
            // Update UI
            this.updateUI();
            this.showNotification('Mining Started', 'Mining process has begun', 'success');
            
        } catch (error) {
            console.error('Start mining error:', error);
            this.showNotification('Start Error', error.message, 'error');
        }
    }
    
    stopMining() {
        try {
            if (!this.isRunning) return;
            
            this.worker.postMessage({ type: 'stop' });
            this.isRunning = false;
            
            // Update UI
            this.updateUI();
            this.showNotification('Mining Stopped', 'Mining process has been stopped', 'info');
            
        } catch (error) {
            console.error('Stop mining error:', error);
            this.showNotification('Stop Error', error.message, 'error');
        }
    }
    
    async registerPool() {
        try {
            await window.miningContract.methods.registerPool().send({
                from: window.cispWallet.getCurrentWallet()?.address
            });
            this.poolAddress = window.cispWallet.getCurrentWallet()?.address;
            this.showNotification('Pool Registered', 'Successfully registered in mining pool', 'success');
        } catch (error) {
            console.error('Pool registration error:', error);
            throw new Error('Failed to register in mining pool: ' + error.message);
        }
    }
    
    async claimRewards() {
        try {
            const rewards = await window.miningContract.methods.getTotalRewards(window.cispWallet.getCurrentWallet()?.address).call();
            
            if (rewards > 0) {
                await window.miningContract.methods.claimRewards().send({
                    from: window.cispWallet.getCurrentWallet()?.address
                });
                
                this.showNotification('Rewards Claimed', 'Mining rewards claimed successfully!', 'success');
                
                // Update balances
                if (window.walletSync) {
                    await window.walletSync.syncWallet(true);
                }
            } else {
                this.showNotification('No Rewards', 'No rewards available to claim', 'info');
            }
        } catch (error) {
            console.error('Claim rewards error:', error);
            this.showNotification('Claim Error', error.message, 'error');
        }
    }
    
    updateHashRate(hashRate) {
        this.currentHashRate = hashRate;
        this.energyUsage = this.calculateEnergyUsage(hashRate);
        this.updateUI();
    }
    
    calculateEnergyUsage(hashRate) {
        // Calculate energy usage based on hash rate and mining power
        return (hashRate * this.miningPower * 0.001).toFixed(2);
    }
    
    async handleBlockMined(blockData) {
        try {
            console.log('Block mined:', blockData);
            
            // Submit block to contract
            await window.miningContract.methods.submitBlock(
                blockData.nonce,
                blockData.hash,
                this.currentHashRate
            ).send({
                from: window.cispWallet.getCurrentWallet()?.address
            });
            
            // Update stats
            this.blocksFound++;
            this.totalMined += Number(this.blockReward);
            this.sessionReward += Number(this.blockReward);
            
            this.showNotification('Block Mined!', 
                `Successfully mined a block! Reward: ${this.formatNumber(this.blockReward)} COSMIC`, 
                'success'
            );
            
            // Update UI
            this.updateUI();
            
            // Sync wallet
            if (window.walletSync) {
                await window.walletSync.syncWallet(true);
            }
            
        } catch (error) {
            console.error('Block submission error:', error);
            this.showNotification('Submission Error', error.message, 'error');
        }
    }
    
    updateUI() {
        // Update mining status
        const statusElement = document.getElementById('mining-status');
        if (statusElement) {
            statusElement.textContent = this.isRunning ? 'Active' : 'Inactive';
            statusElement.className = `cosmic-badge ${this.isRunning ? 'success' : 'error'}`;
        }
        
        // Update hash rate
        const hashRateElement = document.getElementById('hashRate');
        if (hashRateElement) {
            hashRateElement.textContent = this.formatHashRate(this.currentHashRate);
        }
        
        // Update mining power
        const powerElement = document.getElementById('miningPower');
        if (powerElement) {
            powerElement.textContent = `${this.miningPower.toFixed(1)}x`;
        }
        
        // Update session reward
        const sessionRewardElement = document.getElementById('session-reward');
        if (sessionRewardElement) {
            sessionRewardElement.textContent = `${this.formatNumber(this.sessionReward)} COSMIC`;
        }
        
        // Update total mined
        const totalMinedElement = document.getElementById('totalMined');
        if (totalMinedElement) {
            totalMinedElement.textContent = `${this.formatNumber(this.totalMined)} COSMIC`;
        }
        
        // Update blocks found
        const blocksFoundElement = document.getElementById('blocks-found');
        if (blocksFoundElement) {
            blocksFoundElement.textContent = this.blocksFound.toString();
        }
        
        // Update difficulty
        const difficultyElement = document.getElementById('difficulty');
        if (difficultyElement) {
            difficultyElement.textContent = this.formatNumber(this.difficulty);
        }
        
        // Update energy usage
        const energyElement = document.getElementById('energy-usage');
        if (energyElement) {
            energyElement.textContent = `${this.energyUsage} energy/s`;
        }
        
        // Update buttons
        const startButton = document.getElementById('startMining');
        const stopButton = document.getElementById('stopMining');
        
        if (startButton && stopButton) {
            startButton.style.display = this.isRunning ? 'none' : 'block';
            stopButton.style.display = this.isRunning ? 'block' : 'none';
        }
    }
    
    formatHashRate(hashRate) {
        if (hashRate >= 1e9) {
            return `${(hashRate / 1e9).toFixed(2)} GH/s`;
        } else if (hashRate >= 1e6) {
            return `${(hashRate / 1e6).toFixed(2)} MH/s`;
        } else if (hashRate >= 1e3) {
            return `${(hashRate / 1e3).toFixed(2)} KH/s`;
        }
        return `${hashRate.toFixed(2)} H/s`;
    }
    
    formatNumber(value) {
        return parseFloat(value).toFixed(6);
    }
    
    showNotification(title, message, type) {
        if (window.notifications) {
            window.notifications.show(title, message, type);
        } else {
            console.log(`${title}: ${message}`);
        }
    }
}

// Register with coordinator when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const miningSystem = new MiningSystem();
    window.registerSystem('mining', miningSystem);
}); 