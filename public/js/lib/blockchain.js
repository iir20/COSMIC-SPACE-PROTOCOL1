/**
 * Blockchain Integration Library
 */
class BlockchainSystem {
    constructor() {
        this.web3 = null;
        this.account = null;
        this.networkId = null;
        this.contracts = {};
        this.isInitialized = false;
        this.init();
    }

    async init() {
        try {
            // Check if Web3 is injected by MetaMask
            if (typeof window.ethereum !== 'undefined') {
                this.web3 = new Web3(window.ethereum);
                window.web3 = this.web3;
                
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                // Get current account
                const accounts = await this.web3.eth.getAccounts();
                this.account = accounts[0];
                
                // Get network ID
                this.networkId = await this.web3.eth.net.getId();
                
                // Initialize contracts
                await this.initializeContracts();
                
                // Setup event listeners
                this.setupEventListeners();
                
                this.isInitialized = true;
                console.log('Blockchain system initialized');
                
                // Emit initialization event
                this.emitInitialized();
            } else {
                throw new Error('Please install MetaMask to use this application');
            }
        } catch (error) {
            console.error('Failed to initialize blockchain system:', error);
            this.emitError(error);
        }
    }

    async initializeContracts() {
        // Contract ABIs and addresses would be imported from a config file
        const contractAddresses = {
            Mining: '0x...',  // Replace with actual contract address
            Token: '0x...'    // Replace with actual contract address
        };

        // Initialize contract instances
        try {
            this.contracts.Mining = new this.web3.eth.Contract(
                MiningContractABI,
                contractAddresses.Mining
            );

            this.contracts.Token = new this.web3.eth.Contract(
                TokenContractABI,
                contractAddresses.Token
            );
        } catch (error) {
            console.error('Failed to initialize contracts:', error);
            throw error;
        }
    }

    setupEventListeners() {
        // Listen for account changes
        window.ethereum.on('accountsChanged', (accounts) => {
            this.account = accounts[0];
            this.emitAccountChanged(accounts[0]);
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', (chainId) => {
            window.location.reload();
        });

        // Listen for new blocks
        this.web3.eth.subscribe('newBlockHeaders', (error, block) => {
            if (!error) {
                this.emitNewBlock(block);
            }
        });
    }

    async getBalance(address = this.account) {
        try {
            const balance = await this.web3.eth.getBalance(address);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Error getting balance:', error);
            throw error;
        }
    }

    async getTokenBalance(address = this.account) {
        try {
            const balance = await this.contracts.Token.methods.balanceOf(address).call();
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('Error getting token balance:', error);
            throw error;
        }
    }

    async getMiningPower(address = this.account) {
        try {
            return await this.contracts.Mining.methods.getMiningPower(address).call();
        } catch (error) {
            console.error('Error getting mining power:', error);
            throw error;
        }
    }

    async startMining(power) {
        try {
            const gasEstimate = await this.contracts.Mining.methods.startMining(power)
                .estimateGas({ from: this.account });

            const result = await this.contracts.Mining.methods.startMining(power)
                .send({
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.2) // Add 20% buffer
                });

            this.emitMiningStarted(power);
            return result;
        } catch (error) {
            console.error('Error starting mining:', error);
            throw error;
        }
    }

    async stopMining() {
        try {
            const gasEstimate = await this.contracts.Mining.methods.stopMining()
                .estimateGas({ from: this.account });

            const result = await this.contracts.Mining.methods.stopMining()
                .send({
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.2)
                });

            this.emitMiningStopped();
            return result;
        } catch (error) {
            console.error('Error stopping mining:', error);
            throw error;
        }
    }

    async claimRewards() {
        try {
            const gasEstimate = await this.contracts.Mining.methods.claimRewards()
                .estimateGas({ from: this.account });

            const result = await this.contracts.Mining.methods.claimRewards()
                .send({
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.2)
                });

            this.emitRewardsClaimed(result);
            return result;
        } catch (error) {
            console.error('Error claiming rewards:', error);
            throw error;
        }
    }

    async upgradeMiningPower() {
        try {
            const gasEstimate = await this.contracts.Mining.methods.upgradeMiningPower()
                .estimateGas({ from: this.account });

            const result = await this.contracts.Mining.methods.upgradeMiningPower()
                .send({
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.2)
                });

            this.emitMiningPowerUpgraded(result);
            return result;
        } catch (error) {
            console.error('Error upgrading mining power:', error);
            throw error;
        }
    }

    // Event emitters
    emitInitialized() {
        window.dispatchEvent(new CustomEvent('blockchainInitialized', {
            detail: {
                account: this.account,
                networkId: this.networkId
            }
        }));
    }

    emitAccountChanged(account) {
        window.dispatchEvent(new CustomEvent('accountChanged', {
            detail: { account }
        }));
    }

    emitNewBlock(block) {
        window.dispatchEvent(new CustomEvent('newBlock', {
            detail: block
        }));
    }

    emitMiningStarted(power) {
        window.dispatchEvent(new CustomEvent('miningStarted', {
            detail: { power }
        }));
    }

    emitMiningStopped() {
        window.dispatchEvent(new CustomEvent('miningStopped'));
    }

    emitRewardsClaimed(result) {
        window.dispatchEvent(new CustomEvent('rewardsClaimed', {
            detail: result
        }));
    }

    emitMiningPowerUpgraded(result) {
        window.dispatchEvent(new CustomEvent('miningPowerUpgraded', {
            detail: result
        }));
    }

    emitError(error) {
        window.dispatchEvent(new CustomEvent('blockchainError', {
            detail: { error }
        }));
    }

    // Utility methods
    isConnected() {
        return this.isInitialized && this.account !== null;
    }

    getAccount() {
        return this.account;
    }

    async getGasPrice() {
        return await this.web3.eth.getGasPrice();
    }

    async estimateGas(transaction) {
        return await this.web3.eth.estimateGas(transaction);
    }
}

// Initialize blockchain system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.blockchainSystem = new BlockchainSystem();
});

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BlockchainSystem;
} 