/**
 * Mining System Component
 */
class MiningSystem {
    constructor() {
        this.isInitialized = false;
        this.isMining = false;
        this.miningPower = 1;
        this.currentHashRate = 0;
        this.totalMined = 0;
        this.lastReward = 0;
        this.miningInterval = null;
        this.updateInterval = null;
        this.difficultyFactor = 1000000; // Adjust for desired mining difficulty
        this.blockReward = 0.01; // Base reward per block
        this.powerMultiplier = 1.5; // Reward multiplier per power level
        this.init();
    }

    async init() {
        try {
            // Wait for blockchain system to be ready
            await this.waitForBlockchain();
            
            // Initialize UI elements
            this.initializeElements();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Get initial mining power
            await this.updateMiningPower();
            
            this.isInitialized = true;
            console.log('Mining system initialized');
            
            // Start stats update interval
            this.startStatsUpdate();
        } catch (error) {
            console.error('Failed to initialize mining system:', error);
        }
    }

    async waitForBlockchain() {
        return new Promise((resolve) => {
            if (window.blockchainSystem && window.blockchainSystem.isConnected()) {
                resolve();
            } else {
                window.addEventListener('blockchainInitialized', () => resolve(), { once: true });
            }
        });
    }

    initializeElements() {
        // Get UI elements
        this.startButton = document.getElementById('startMining');
        this.stopButton = document.getElementById('stopMining');
        this.claimButton = document.getElementById('claimRewards');
        this.upgradeButton = document.getElementById('upgradePower');
        this.powerSlider = document.getElementById('powerSlider');
        this.hashRateDisplay = document.getElementById('hashRate');
        this.totalMinedDisplay = document.getElementById('totalMined');
        this.lastRewardDisplay = document.getElementById('lastReward');
        this.progressBar = document.querySelector('.mining-progress-bar');
        
        // Initialize button states
        this.updateButtonStates();
    }

    setupEventListeners() {
        // Mining controls
        this.startButton.addEventListener('click', () => this.startMining());
        this.stopButton.addEventListener('click', () => this.stopMining());
        this.claimButton.addEventListener('click', () => this.claimRewards());
        this.upgradeButton.addEventListener('click', () => this.upgradePower());
        
        // Power slider
        this.powerSlider.addEventListener('input', (e) => {
            this.updateMiningPower(parseInt(e.target.value));
        });
        
        // Blockchain events
        window.addEventListener('accountChanged', () => this.handleAccountChange());
        window.addEventListener('blockchainError', (e) => this.handleError(e.detail.error));
    }

    async startMining() {
        if (!this.isInitialized || this.isMining) return;
        
        try {
            // Start mining on blockchain
            await window.blockchainSystem.startMining(this.miningPower);
            
            this.isMining = true;
            this.updateButtonStates();
            
            // Start mining simulation
            this.miningInterval = setInterval(() => this.mineCycle(), 1000);
            
            // Create mining animation
            window.miningAnimations.startAnimation();
            
            console.log('Mining started');
        } catch (error) {
            console.error('Failed to start mining:', error);
            this.handleError(error);
        }
    }

    async stopMining() {
        if (!this.isInitialized || !this.isMining) return;
        
        try {
            // Stop mining on blockchain
            await window.blockchainSystem.stopMining();
            
            this.isMining = false;
            this.updateButtonStates();
            
            // Clear mining interval
            if (this.miningInterval) {
                clearInterval(this.miningInterval);
                this.miningInterval = null;
            }
            
            // Stop mining animation
            window.miningAnimations.stopAnimation();
            
            console.log('Mining stopped');
        } catch (error) {
            console.error('Failed to stop mining:', error);
            this.handleError(error);
        }
    }

    async claimRewards() {
        if (!this.isInitialized) return;
        
        try {
            // Claim rewards on blockchain
            const result = await window.blockchainSystem.claimRewards();
            
            // Update total mined
            this.totalMined += this.lastReward;
            this.lastReward = 0;
            
            // Update displays
            this.updateDisplays();
            
            // Trigger success animation
            window.miningAnimations.triggerSuccessAnimation(result.events.RewardsClaimed.returnValues.amount);
            
            console.log('Rewards claimed');
        } catch (error) {
            console.error('Failed to claim rewards:', error);
            this.handleError(error);
        }
    }

    async upgradePower() {
        if (!this.isInitialized) return;
        
        try {
            // Upgrade power on blockchain
            await window.blockchainSystem.upgradeMiningPower();
            
            // Update mining power
            await this.updateMiningPower();
            
            console.log('Mining power upgraded');
        } catch (error) {
            console.error('Failed to upgrade power:', error);
            this.handleError(error);
        }
    }

    async updateMiningPower(power = null) {
        try {
            if (power !== null) {
                this.miningPower = power;
            } else {
                // Get mining power from blockchain
                this.miningPower = await window.blockchainSystem.getMiningPower();
            }
            
            // Update power slider
            this.powerSlider.value = this.miningPower;
            
            // Update hash rate calculation
            this.updateHashRate();
        } catch (error) {
            console.error('Failed to update mining power:', error);
        }
    }

    mineCycle() {
        // Calculate mining progress
        const hashRate = this.calculateHashRate();
        const difficulty = this.calculateDifficulty();
        const miningChance = hashRate / difficulty;
        
        // Random mining success check
        if (Math.random() < miningChance) {
            this.handleMiningSuccess();
        }
        
        // Update progress bar
        this.updateProgress(miningChance);
    }

    calculateHashRate() {
        // Base hash rate calculation
        const baseRate = 100 * Math.pow(this.powerMultiplier, this.miningPower - 1);
        
        // Add some randomness
        const variance = baseRate * 0.1; // 10% variance
        const randomFactor = 1 + (Math.random() * variance * 2 - variance) / baseRate;
        
        this.currentHashRate = baseRate * randomFactor;
        return this.currentHashRate;
    }

    calculateDifficulty() {
        // Difficulty increases with mining power
        return this.difficultyFactor * Math.pow(1.2, this.miningPower - 1);
    }

    calculateReward() {
        // Base reward with power multiplier
        return this.blockReward * Math.pow(this.powerMultiplier, this.miningPower - 1);
    }

    handleMiningSuccess() {
        // Calculate and add reward
        const reward = this.calculateReward();
        this.lastReward += reward;
        
        // Trigger success animation
        window.miningAnimations.triggerSuccessAnimation(reward);
        
        console.log(`Mining success! Reward: ${reward}`);
    }

    updateProgress(miningChance) {
        // Update progress bar based on mining chance
        const progress = (miningChance * 100) % 100;
        this.progressBar.style.width = `${progress}%`;
    }

    updateHashRate() {
        const hashRate = this.calculateHashRate();
        this.currentHashRate = hashRate;
        this.updateDisplays();
    }

    startStatsUpdate() {
        // Update stats display every second
        this.updateInterval = setInterval(() => {
            this.updateDisplays();
        }, 1000);
    }

    updateDisplays() {
        // Format and update displays
        this.hashRateDisplay.textContent = this.formatHashRate(this.currentHashRate);
        this.totalMinedDisplay.textContent = this.formatNumber(this.totalMined);
        this.lastRewardDisplay.textContent = this.formatNumber(this.lastReward);
        
        // Trigger value update animation
        window.miningAnimations.updateStats({
            hashRate: this.currentHashRate,
            totalMined: this.totalMined,
            lastReward: this.lastReward
        });
    }

    updateButtonStates() {
        // Update button states based on mining status
        this.startButton.disabled = this.isMining;
        this.stopButton.disabled = !this.isMining;
        this.powerSlider.disabled = this.isMining;
        this.claimButton.disabled = this.lastReward <= 0;
    }

    formatHashRate(value) {
        const units = ['H/s', 'KH/s', 'MH/s', 'GH/s'];
        let unitIndex = 0;
        
        while (value >= 1000 && unitIndex < units.length - 1) {
            value /= 1000;
            unitIndex++;
        }
        
        return `${value.toFixed(2)} ${units[unitIndex]}`;
    }

    formatNumber(value) {
        return value.toFixed(8);
    }

    handleAccountChange() {
        // Stop mining and reset stats on account change
        this.stopMining();
        this.totalMined = 0;
        this.lastReward = 0;
        this.updateDisplays();
        this.updateMiningPower();
    }

    handleError(error) {
        // Display error to user
        console.error('Mining error:', error);
        // You would typically show this in a UI notification
    }

    destroy() {
        // Cleanup
        this.stopMining();
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize mining system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.miningSystem = new MiningSystem();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiningSystem;
} 