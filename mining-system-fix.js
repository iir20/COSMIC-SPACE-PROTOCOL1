/**
 * Mining System Fix
 * 
 * This script fixes issues with the mining system, ensuring it can find
 * the blockchain and properly distribute mining rewards.
 */

// Mining System Fix - Handles mining system improvements and fixes
class MiningSystemFix {
    constructor() {
        this.retryCount = 0;
        this.maxRetries = 5;
    }

    async initialize() {
        try {
            if (!window.cispWallet) {
                if (this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log(`Wallet not initialized, retrying... (${this.retryCount}/${this.maxRetries})`);
                    setTimeout(() => this.initialize(), 1000);
                    return;
                }
                throw new Error('Wallet system not found after retries');
            }
            
            // Initialize mining system
            if (window.miningSystem) {
                await window.miningSystem.initialize();
                console.log('Mining system initialized successfully');
            }
        } catch (error) {
            console.error('Error initializing mining system fix:', error);
            throw error;
        }
    }

    async initializeMiningComponents() {
        // Initialize mining worker if not already initialized
        if (!window.miningWorker) {
            window.miningWorker = new Worker('miningWorker.js');
        }

        // Set up mining worker message handlers
        window.miningWorker.onmessage = this.handleWorkerMessage.bind(this);
        window.miningWorker.onerror = this.handleWorkerError.bind(this);

        // Initialize mining UI components
        this.initializeMiningUI();
    }

    handleWorkerMessage(event) {
        const { type, data } = event.data;
        switch (type) {
            case 'hashRate':
                this.updateHashRate(data);
                break;
            case 'block':
                this.handleBlockMined(data);
                break;
            case 'error':
                this.handleMiningError(data);
                break;
        }
    }

    handleWorkerError(error) {
        console.error('Mining worker error:', error);
        this.showNotification('Mining Error', 'An error occurred in the mining process. Please try again.', 'error');
    }

    updateHashRate(hashRate) {
        const hashRateElement = document.getElementById('hashRate');
        if (hashRateElement) {
            hashRateElement.textContent = `${(hashRate / 1000).toFixed(2)} kH/s`;
        }
    }

    async handleBlockMined(blockData) {
        try {
            // Submit the mined block
            const result = await window.miningContract.methods.submitBlock(
                blockData.nonce,
                blockData.hash
            ).send({ from: window.wallet.address });

            this.showNotification('Block Mined!', 'Successfully mined a new block.', 'success');
            
            // Update mining stats
            this.updateMiningStats();
        } catch (error) {
            console.error('Error submitting mined block:', error);
            this.showNotification('Submission Error', 'Failed to submit mined block.', 'error');
        }
    }

    handleMiningError(error) {
        console.error('Mining error:', error);
        this.showNotification('Mining Error', error.message || 'An error occurred while mining.', 'error');
    }

    initializeMiningUI() {
        // Initialize mining controls
        const startButton = document.getElementById('startMining');
        const stopButton = document.getElementById('stopMining');

        if (startButton) {
            startButton.addEventListener('click', () => this.startMining());
        }
        if (stopButton) {
            stopButton.addEventListener('click', () => this.stopMining());
        }

        // Initialize mining stats display
        this.updateMiningStats();
    }

    async startMining() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }

            window.miningWorker.postMessage({
                type: 'start',
                data: {
                    address: window.wallet.address,
                    difficulty: await this.getCurrentDifficulty()
                }
            });

            this.showNotification('Mining Started', 'Mining process has begun.', 'info');
        } catch (error) {
            console.error('Error starting mining:', error);
            this.showNotification('Start Error', 'Failed to start mining.', 'error');
        }
    }

    stopMining() {
        window.miningWorker.postMessage({ type: 'stop' });
        this.showNotification('Mining Stopped', 'Mining process has been stopped.', 'info');
    }

    async getCurrentDifficulty() {
        try {
            return await window.miningContract.methods.getCurrentDifficulty().call();
        } catch (error) {
            console.error('Error getting current difficulty:', error);
            return '0x100000';  // Default difficulty
        }
    }

    async updateMiningStats() {
        try {
            const statsElement = document.getElementById('miningStats');
            if (!statsElement) return;

            const stats = await this.getMiningStats();
            statsElement.innerHTML = `
                <div>Total Blocks Mined: ${stats.totalBlocks}</div>
                <div>Current Difficulty: ${stats.difficulty}</div>
                <div>Rewards Earned: ${stats.rewards} COSMIC</div>
            `;
        } catch (error) {
            console.error('Error updating mining stats:', error);
        }
    }

    async getMiningStats() {
        try {
            const address = window.wallet.address;
            return {
                totalBlocks: await window.miningContract.methods.getMinedBlocks(address).call(),
                difficulty: await this.getCurrentDifficulty(),
                rewards: await window.miningContract.methods.getRewards(address).call()
            };
        } catch (error) {
            console.error('Error getting mining stats:', error);
            return { totalBlocks: 0, difficulty: '0x100000', rewards: '0' };
        }
    }

    showNotification(title, message, type) {
        if (window.notifications) {
            window.notifications.show(title, message, type);
        } else {
            console.log(`${title}: ${message}`);
        }
    }
}

// Initialize the fix
const miningSystemFix = new MiningSystemFix();
miningSystemFix.initialize(); 