/**
 * Cosmic Space Protocol - Mining System
 * This file handles the mining operations and rewards distribution
 */

// Mining System for CISP
class MiningSystem {
    constructor() {
        this.isActive = false;
        this.currentHashRate = 0;
        this.totalMined = 0;
        this.lastReward = 0;
        this.miningPower = 1;
        this.miningInterval = null;
        this.updateInterval = null;
        this.lastBlockTime = Date.now();
        this.difficulty = 1;
        this.blockReward = 50; // Base block reward in xCIS
        this.blockTime = 15000; // Target block time in milliseconds
    }

    async init() {
        try {
            // Initialize blockchain connection
            if (!window.cispChain.initialized) {
                await window.cispChain.init();
            }

            // Setup event listeners
            this.setupEventListeners();

            // Load mining stats
            await this.loadMiningStats();

            return true;
        } catch (error) {
            console.error('Mining system initialization failed:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Listen for wallet changes
        window.addEventListener('walletChanged', () => {
            if (this.isActive) {
                this.stopMining();
            }
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', () => {
            if (this.isActive) {
                this.stopMining();
            }
        });

        // Listen for visibility changes
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden' && this.isActive) {
                this.pauseMining();
            } else if (document.visibilityState === 'visible' && this.isActive) {
                this.resumeMining();
            }
        });
    }

    async startMining() {
        if (this.isActive) return;

        try {
            // Check wallet connection
            if (!window.walletSync.isConnected) {
                throw new Error('Wallet not connected');
            }

            // Start mining on blockchain
            const result = await window.transactionHandler.handleTransaction('mining.start');
            
            if (result) {
                this.isActive = true;
                this.startMiningProcess();
                this.startStatsUpdate();
                
                // Dispatch mining started event
                window.dispatchEvent(new CustomEvent('miningStarted'));
                
                return true;
            }
        } catch (error) {
            console.error('Failed to start mining:', error);
            throw error;
        }
    }

    stopMining() {
        if (!this.isActive) return;

        this.isActive = false;
        this.clearIntervals();
        
        // Save mining stats
        this.saveMiningStats();
        
        // Dispatch mining stopped event
        window.dispatchEvent(new CustomEvent('miningStopped'));
    }

    pauseMining() {
        if (this.miningInterval) {
            clearInterval(this.miningInterval);
            this.miningInterval = null;
        }
    }

    resumeMining() {
        if (this.isActive && !this.miningInterval) {
            this.startMiningProcess();
        }
    }

    startMiningProcess() {
        this.miningInterval = setInterval(() => {
            this.mineBlock();
        }, this.blockTime);
    }

    startStatsUpdate() {
        this.updateInterval = setInterval(() => {
            this.updateMiningStats();
        }, 1000);
    }

    clearIntervals() {
        if (this.miningInterval) {
            clearInterval(this.miningInterval);
            this.miningInterval = null;
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    async mineBlock() {
        try {
            const now = Date.now();
            const timeDiff = now - this.lastBlockTime;
            
            // Calculate mining success probability based on mining power and difficulty
            const probability = (this.miningPower * timeDiff) / (this.difficulty * this.blockTime);
            
            if (Math.random() < probability) {
                // Successfully mined a block
                const reward = this.calculateReward();
                this.lastReward = reward;
                this.totalMined += reward;
                this.lastBlockTime = now;
                
                // Update difficulty
                this.adjustDifficulty(timeDiff);
                
                // Dispatch block mined event
                window.dispatchEvent(new CustomEvent('blockMined', {
                    detail: {
                        reward,
                        totalMined: this.totalMined,
                        difficulty: this.difficulty
                    }
                }));
                
                // Update UI
                this.updateMiningStats();
            }
        } catch (error) {
            console.error('Mining block failed:', error);
        }
    }

    calculateReward() {
        // Base reward adjusted by mining power and random factor
        const baseReward = this.blockReward * this.miningPower;
        const randomFactor = 0.9 + Math.random() * 0.2; // Random factor between 0.9 and 1.1
        return baseReward * randomFactor;
    }

    adjustDifficulty(lastBlockTime) {
        // Adjust difficulty based on last block time
        const targetTime = this.blockTime;
        const adjustment = targetTime / lastBlockTime;
        this.difficulty *= adjustment;
        
        // Clamp difficulty between reasonable values
        this.difficulty = Math.max(0.5, Math.min(this.difficulty, 5));
    }

    async updateMiningStats() {
        if (!this.isActive) return;

        try {
            // Calculate hash rate (simplified)
            this.currentHashRate = this.miningPower * (1000 / this.blockTime) * this.difficulty;

            // Update UI elements
            document.querySelectorAll('[data-mining="hashrate"]').forEach(element => {
                element.textContent = this.formatHashRate(this.currentHashRate);
            });

            document.querySelectorAll('[data-mining="total"]').forEach(element => {
                element.textContent = this.formatAmount(this.totalMined);
            });

            document.querySelectorAll('[data-mining="last-reward"]').forEach(element => {
                element.textContent = this.formatAmount(this.lastReward);
            });

            // Dispatch stats updated event
            window.dispatchEvent(new CustomEvent('miningStatsUpdated', {
                detail: {
                    hashRate: this.currentHashRate,
                    totalMined: this.totalMined,
                    lastReward: this.lastReward,
                    difficulty: this.difficulty
                }
            }));
        } catch (error) {
            console.error('Error updating mining stats:', error);
        }
    }

    async claimRewards() {
        try {
            if (this.totalMined <= 0) {
                throw new Error('No rewards to claim');
            }

            const result = await window.transactionHandler.handleTransaction('mining.claim');
            
            if (result) {
                // Reset mining stats after successful claim
                this.lastReward = 0;
                this.totalMined = 0;
                this.saveMiningStats();
                
                return result;
            }
        } catch (error) {
            console.error('Failed to claim mining rewards:', error);
            throw error;
        }
    }

    async upgradeMiningPower() {
        try {
            // Calculate upgrade cost based on current mining power
            const upgradeCost = this.calculateUpgradeCost();
            
            // Check if user has enough xCIS
            const balance = await window.cispChain.getXCISBalance(window.walletSync.currentAccount);
            if (balance < upgradeCost) {
                throw new Error('Insufficient xCIS balance for upgrade');
            }

            // Execute upgrade transaction
            const result = await window.transactionHandler.handleTransaction('mining.upgrade', {
                cost: upgradeCost
            });

            if (result) {
                // Increase mining power
                this.miningPower *= 1.2;
                this.saveMiningStats();
                
                return true;
            }
        } catch (error) {
            console.error('Failed to upgrade mining power:', error);
            throw error;
        }
    }

    calculateUpgradeCost() {
        // Base cost increases exponentially with mining power
        return Math.floor(100 * Math.pow(1.5, this.miningPower - 1));
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

    formatAmount(amount) {
        return amount.toFixed(4);
    }

    saveMiningStats() {
        try {
            const stats = {
                totalMined: this.totalMined,
                miningPower: this.miningPower,
                lastReward: this.lastReward,
                difficulty: this.difficulty
            };
            localStorage.setItem('miningStats', JSON.stringify(stats));
        } catch (error) {
            console.error('Error saving mining stats:', error);
        }
    }

    async loadMiningStats() {
        try {
            const stored = localStorage.getItem('miningStats');
            if (stored) {
                const stats = JSON.parse(stored);
                this.totalMined = stats.totalMined || 0;
                this.miningPower = stats.miningPower || 1;
                this.lastReward = stats.lastReward || 0;
                this.difficulty = stats.difficulty || 1;
            }
        } catch (error) {
            console.error('Error loading mining stats:', error);
        }
    }
}

// Initialize mining system
window.miningSystem = new MiningSystem();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiningSystem;
}

console.log('Mining system script loaded'); 