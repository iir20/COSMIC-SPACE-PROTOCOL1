/**
 * Cosmic Space Protocol - Staking System
 * 
 * This module handles the staking functionality for xCIS tokens, allowing users
 * to stake their tokens and earn rewards over time with dynamic APY and compound interest.
 */

class StakingSystem {
    constructor() {
        this.isInitialized = false;
        this.walletSystem = null;
        this.stakingPools = [
            {
                id: 'standard',
                name: 'Standard Pool',
                baseApy: 0.08, // 8% base APY
                maxApy: 0.12, // 12% max APY
                minAmount: 10,
                lockPeriod: 0, // No lock period
                description: 'Standard staking pool with dynamic 8-12% APY based on total staked amount.',
                totalStaked: 0,
                stakersCount: 0
            },
            {
                id: 'premium',
                name: 'Premium Pool',
                baseApy: 0.12, // 12% base APY
                maxApy: 0.18, // 18% max APY
                minAmount: 100,
                lockPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days
                description: 'Premium staking pool with dynamic 12-18% APY and a 7-day lock period.',
                totalStaked: 0,
                stakersCount: 0
            },
            {
                id: 'cosmic',
                name: 'Cosmic Pool',
                baseApy: 0.20, // 20% base APY
                maxApy: 0.30, // 30% max APY
                minAmount: 1000,
                lockPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days
                description: 'Cosmic staking pool with dynamic 20-30% APY and a 30-day lock period.',
                totalStaked: 0,
                stakersCount: 0,
                compoundingEnabled: true // Enable auto-compounding
            }
        ];
        
        // User's staking positions
        this.stakingPositions = [];
        
        // Reward calculation interval (1 hour in milliseconds)
        this.rewardInterval = 60 * 60 * 1000;
        
        // Last reward calculation timestamp
        this.lastRewardCalculation = 0;
        
        // Total value locked
        this.totalValueLocked = 0;
        
        // APY adjustment parameters
        this.apyAdjustmentThreshold = 100000; // 100k xCIS
        this.maxTotalStaked = 1000000; // 1M xCIS
    }

    /**
     * Initialize the staking system
     * @returns {Promise<boolean>} - Success status
     */
    async initialize() {
        try {
            if (this.isInitialized) {
                console.log('Staking system already initialized');
                return true;
            }

            console.log('Initializing staking system...');
            
            // Connect to wallet system
            this.walletSystem = window.cispWallet;
            
            // Wait for wallet system if needed
            if (!this.walletSystem) {
                console.warn('Wallet system not available, waiting for it to initialize...');
                
                // Try up to 10 times with a 500ms delay between attempts
                for (let i = 0; i < 10; i++) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    this.walletSystem = window.cispWallet;
                    if (this.walletSystem) break;
                }
                
                if (!this.walletSystem) {
                    console.error('Wallet system not available after waiting');
                    throw new Error('Wallet system not available');
                }
            }
            
            // Load staking positions and calculate TVL
            await this._loadStakingPositions();
            this._calculateTVL();
            
            // Set up automatic reward calculations
            this._setupRewardCalculator();
            
            // Set up UI elements and event listeners
            this._setupEventListeners();
            
            // Calculate pending rewards and update APYs
            await this._calculatePendingRewards();
            this._updatePoolAPYs();
            
            this.isInitialized = true;
            console.log('Staking system initialized successfully');
            
            // Dispatch initialized event
            window.dispatchEvent(new CustomEvent('stakingSystemInitialized'));
            
            return true;
        } catch (error) {
            console.error('Error initializing staking system:', error);
            return false;
        }
    }

    /**
     * Stake xCIS tokens in a selected pool
     * @param {string} poolId - ID of the staking pool
     * @param {number} amount - Amount of xCIS to stake
     * @param {boolean} enableCompounding - Enable auto-compounding for the position
     * @returns {Promise<boolean>} - Success status
     */
    async stakeTokens(poolId, amount, enableCompounding = false) {
        try {
            amount = parseFloat(amount);
            if (isNaN(amount) || amount <= 0) {
                throw new Error('Please enter a valid amount');
            }
            
            const pool = this.stakingPools.find(p => p.id === poolId);
            if (!pool) {
                throw new Error('Invalid staking pool selected');
            }
            
            if (amount < pool.minAmount) {
                throw new Error(`Minimum staking amount for ${pool.name} is ${pool.minAmount} xCIS`);
            }
            
            const wallet = this._validateWallet();
            
            if (wallet.balance.xCIS < amount) {
                throw new Error(`Not enough xCIS. You have ${wallet.balance.xCIS.toFixed(2)} xCIS`);
            }
            
            // Create staking position with compound settings
            const position = {
                id: this._generatePositionId(),
                poolId: pool.id,
                walletAddress: wallet.address,
                amount: amount,
                stakedAt: Date.now(),
                unlockTime: Date.now() + pool.lockPeriod,
                lastRewardClaim: Date.now(),
                apy: await this._calculateCurrentAPY(pool),
                rewards: 0,
                compoundingEnabled: enableCompounding && pool.compoundingEnabled,
                compoundedAmount: amount,
                rewardHistory: []
            };
            
            // Update wallet and pool state
            wallet.balance.xCIS -= amount;
            pool.totalStaked += amount;
            pool.stakersCount++;
            
            // Save states
            this.walletSystem._save();
            this.stakingPositions.push(position);
            await this._saveStakingPositions();
            
            // Update TVL and APYs
            this._calculateTVL();
            this._updatePoolAPYs();
            
            // Show success notification
            this._showNotification(
                `Successfully staked ${amount.toFixed(2)} xCIS in ${pool.name}`,
                'success'
            );
            
            // Dispatch event
            this._dispatchEvent('stakingPositionCreated', { position });
            
            return true;
        } catch (error) {
            this._handleError('Error staking tokens:', error);
            return false;
        }
    }

    /**
     * Unstake tokens from a staking position
     * @param {string} positionId - ID of the staking position
     * @returns {Promise<boolean>} - Success status
     */
    async unstakeTokens(positionId) {
        try {
            // Find the staking position
            const positionIndex = this.stakingPositions.findIndex(p => p.id === positionId);
            if (positionIndex === -1) {
                throw new Error('Staking position not found');
            }
            
            const position = this.stakingPositions[positionIndex];
            
            // Check if the position is locked
            if (position.unlockTime > Date.now()) {
                const remainingDays = Math.ceil((position.unlockTime - Date.now()) / (24 * 60 * 60 * 1000));
                throw new Error(`This position is locked for ${remainingDays} more days`);
            }
            
            // Check wallet connection
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
            
            // Calculate pending rewards before unstaking
            await this._calculateRewardsForPosition(position);
            
            // Update wallet balance
            wallet.balance.xCIS += position.amount;
            wallet.balance.xCIS += position.rewards;
            
            // Save wallet state
            this.walletSystem._save();
            
            // Remove staking position
            this.stakingPositions.splice(positionIndex, 1);
            
            // Save staking positions
            await this._saveStakingPositions();
            
            // Show success notification
            if (window.notifications) {
                window.notifications.show(
                    `Successfully unstaked ${position.amount.toFixed(2)} xCIS + ${position.rewards.toFixed(2)} xCIS rewards`,
                    'success'
                );
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('stakingPositionClosed', {
                detail: { position }
            }));
            
            return true;
        } catch (error) {
            console.error('Error unstaking tokens:', error);
            
            // Show error notification
            if (window.notifications) {
                window.notifications.show(error.message, 'error');
            }
            
            return false;
        }
    }

    /**
     * Claim rewards from a staking position
     * @param {string} positionId - ID of the staking position
     * @returns {Promise<boolean>} - Success status
     */
    async claimRewards(positionId) {
        try {
            // Find the staking position
            const positionIndex = this.stakingPositions.findIndex(p => p.id === positionId);
            if (positionIndex === -1) {
                throw new Error('Staking position not found');
            }
            
            const position = this.stakingPositions[positionIndex];
            
            // Calculate pending rewards before claiming
            await this._calculateRewardsForPosition(position);
            
            // Check if there are rewards to claim
            if (position.rewards <= 0) {
                throw new Error('No rewards available to claim');
            }
            
            // Check wallet connection
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
            
            // Update wallet balance
            const rewardAmount = position.rewards;
            wallet.balance.xCIS += rewardAmount;
            
            // Reset rewards and update last claim time
            position.rewards = 0;
            position.lastRewardClaim = Date.now();
            
            // Save wallet state
            this.walletSystem._save();
            
            // Update staking position
            this.stakingPositions[positionIndex] = position;
            
            // Save staking positions
            await this._saveStakingPositions();
            
            // Show success notification
            if (window.notifications) {
                window.notifications.show(
                    `Successfully claimed ${rewardAmount.toFixed(2)} xCIS rewards`,
                    'success'
                );
            }
            
            // Dispatch event
            window.dispatchEvent(new CustomEvent('stakingRewardsClaimed', {
                detail: { position, amount: rewardAmount }
            }));
            
            return true;
        } catch (error) {
            console.error('Error claiming rewards:', error);
            
            // Show error notification
            if (window.notifications) {
                window.notifications.show(error.message, 'error');
            }
            
            return false;
        }
    }

    /**
     * Get all staking pools
     * @returns {Array} - List of staking pools
     */
    getStakingPools() {
        return this.stakingPools;
    }

    /**
     * Get user's staking positions
     * @param {string} walletAddress - Wallet address to filter positions by
     * @returns {Array} - List of staking positions for the wallet
     */
    getUserStakingPositions(walletAddress) {
        if (!walletAddress) {
            const wallet = this.walletSystem?.getCurrentWallet();
            if (!wallet) return [];
            walletAddress = wallet.address;
        }
        
        return this.stakingPositions.filter(p => p.walletAddress === walletAddress);
    }

    /**
     * Calculate APY for a given position
     * @param {Object} position - Staking position
     * @returns {Promise<number>} - Current APY
     */
    async calculateCurrentAPY(position) {
        const pool = this.stakingPools.find(p => p.id === position.poolId);
        return pool ? pool.apy : 0;
    }

    /**
     * Calculate pending rewards for all staking positions
     * @returns {Promise<boolean>} - Success status
     */
    async _calculatePendingRewards() {
        try {
            const now = Date.now();
            
            // Check if we've already calculated rewards recently
            if (now - this.lastRewardCalculation < this.rewardInterval && this.lastRewardCalculation !== 0) {
                // Skip calculations if less than an hour has passed
                return true;
            }
            
            // Calculate rewards for each position
            for (const position of this.stakingPositions) {
                await this._calculateRewardsForPosition(position);
            }
            
            // Update last calculation timestamp
            this.lastRewardCalculation = now;
            
            // Save staking positions
            await this._saveStakingPositions();
            
            return true;
        } catch (error) {
            console.error('Error calculating pending rewards:', error);
            return false;
        }
    }

    /**
     * Calculate rewards for a specific position
     * @param {Object} position - Staking position
     * @returns {Promise<number>} - Calculated rewards
     */
    async _calculateRewardsForPosition(position) {
        try {
            const now = Date.now();
            const timeElapsed = now - position.lastRewardClaim;
            const daysElapsed = timeElapsed / (24 * 60 * 60 * 1000);
            
            // Get pool for APY
            const pool = this.stakingPools.find(p => p.id === position.poolId);
            if (!pool) {
                console.error('Pool not found for position', position.id);
                return 0;
            }
            
            // Calculate rewards using compound interest if enabled
            let rewards;
            if (position.compoundingEnabled) {
                // Compound interest formula: A = P(1 + r/n)^(nt)
                const r = position.apy;
                const n = 365; // Daily compounding
                const t = daysElapsed;
                const futureValue = position.compoundedAmount * Math.pow(1 + r/n, n*t);
                rewards = futureValue - position.compoundedAmount;
            } else {
                // Simple interest for non-compounding positions
                rewards = position.amount * position.apy * daysElapsed / 365;
            }
            
            // Update position
            position.rewards += rewards;
            position.lastRewardClaim = now;
            
            if (position.compoundingEnabled) {
                position.compoundedAmount += rewards;
            }
            
            // Record reward history (keep only last 10 entries)
            position.rewardHistory.push({
                timestamp: now,
                amount: rewards,
                apy: position.apy
            });
            
            // Trim history if needed
            if (position.rewardHistory.length > 10) {
                position.rewardHistory = position.rewardHistory.slice(-10);
            }
            
            return rewards;
        } catch (error) {
            console.error('Error calculating rewards for position:', error);
            return 0;
        }
    }

    /**
     * Load staking positions from localStorage
     * @returns {Promise<boolean>} - Success status
     */
    async _loadStakingPositions() {
        try {
            const data = localStorage.getItem('staking_positions');
            if (data) {
                this.stakingPositions = JSON.parse(data);
            }
            
            return true;
        } catch (error) {
            console.error('Error loading staking positions:', error);
            this.stakingPositions = [];
            return false;
        }
    }

    /**
     * Save staking positions to localStorage
     * @returns {Promise<boolean>} - Success status
     */
    async _saveStakingPositions() {
        try {
            localStorage.setItem('staking_positions', JSON.stringify(this.stakingPositions));
            return true;
        } catch (error) {
            console.error('Error saving staking positions:', error);
            return false;
        }
    }

    /**
     * Generate a unique position ID
     * @returns {string} - Unique position ID
     */
    _generatePositionId() {
        return 'pos_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Set up UI event listeners
     */
    _setupEventListeners() {
        try {
            // Stake button
            const stakeBtn = document.getElementById('stake-btn');
            if (stakeBtn) {
                stakeBtn.addEventListener('click', async () => {
                    const amountInput = document.getElementById('stake-amount');
                    const poolSelect = document.getElementById('stake-pool');
                    
                    if (!amountInput || !poolSelect) return;
                    
                    const amount = parseFloat(amountInput.value);
                    const poolId = poolSelect.value;
                    
                    await this.stakeTokens(poolId, amount);
                    
                    // Clear inputs after staking
                    amountInput.value = '';
                    
                    // Update UI
                    this._updateUI();
                });
            }
            
            // Wallet connection events
            window.addEventListener('walletConnected', () => {
                this._updateUI();
            });
            
            window.addEventListener('walletDisconnected', () => {
                this._updateUI();
            });
            
            // Update UI initially
            this._updateUI();
            
            console.log('Staking system event listeners set up');
        } catch (error) {
            console.error('Error setting up staking event listeners:', error);
        }
    }

    /**
     * Update UI elements based on current state
     */
    _updateUI() {
        try {
            // Update staking pools display
            const poolsContainer = document.getElementById('staking-pools');
            if (poolsContainer) {
                let poolsHtml = '';
                
                for (const pool of this.stakingPools) {
                    poolsHtml += `
                        <div class="staking-pool-card">
                            <h3>${pool.name}</h3>
                            <div class="pool-details">
                                <p class="pool-apy">${(pool.apy * 100).toFixed(1)}% APY</p>
                                <p class="pool-min">Min: ${pool.minAmount} xCIS</p>
                                <p class="pool-lock">Lock Period: ${pool.lockPeriod > 0 ? (pool.lockPeriod / (24 * 60 * 60 * 1000)) + ' days' : 'None'}</p>
                            </div>
                            <p class="pool-description">${pool.description}</p>
                            <button class="stake-pool-btn" data-pool-id="${pool.id}">Stake xCIS</button>
                        </div>
                    `;
                }
                
                poolsContainer.innerHTML = poolsHtml;
                
                // Add event listeners to stake buttons
                const stakeButtons = document.querySelectorAll('.stake-pool-btn');
                stakeButtons.forEach(btn => {
                    btn.addEventListener('click', () => {
                        const poolId = btn.getAttribute('data-pool-id');
                        const poolSelect = document.getElementById('stake-pool');
                        if (poolSelect) {
                            poolSelect.value = poolId;
                        }
                        
                        // Scroll to staking form
                        const stakingForm = document.getElementById('staking-form');
                        if (stakingForm) {
                            stakingForm.scrollIntoView({ behavior: 'smooth' });
                        }
                    });
                });
            }
            
            // Update pool select dropdown
            const poolSelect = document.getElementById('stake-pool');
            if (poolSelect) {
                let optionsHtml = '';
                
                for (const pool of this.stakingPools) {
                    optionsHtml += `<option value="${pool.id}">${pool.name} (${(pool.apy * 100).toFixed(1)}% APY)</option>`;
                }
                
                poolSelect.innerHTML = optionsHtml;
            }
            
            // Update staking positions display
            this._updateStakingPositionsUI();
            
        } catch (error) {
            console.error('Error updating staking UI:', error);
        }
    }

    /**
     * Update the staking positions UI
     */
    _updateStakingPositionsUI() {
        try {
            const positionsContainer = document.getElementById('staking-positions');
            if (!positionsContainer) return;
            
            const wallet = this.walletSystem?.getCurrentWallet();
            if (!wallet) {
                positionsContainer.innerHTML = '<p class="empty-message">Connect your wallet to view your staking positions</p>';
                return;
            }
            
            const positions = this.getUserStakingPositions(wallet.address);
            
            if (positions.length === 0) {
                positionsContainer.innerHTML = '<p class="empty-message">You don\'t have any active staking positions</p>';
                return;
            }
            
            let positionsHtml = '';
            
            for (const position of positions) {
                const pool = this.stakingPools.find(p => p.id === position.poolId);
                const isLocked = position.unlockTime > Date.now();
                const lockTimeRemaining = isLocked 
                    ? Math.ceil((position.unlockTime - Date.now()) / (24 * 60 * 60 * 1000))
                    : 0;
                
                positionsHtml += `
                    <div class="staking-position-card">
                        <div class="position-header">
                            <h3>${pool ? pool.name : 'Unknown Pool'}</h3>
                            <span class="position-status ${isLocked ? 'locked' : 'unlocked'}">
                                ${isLocked ? `Locked (${lockTimeRemaining} days remaining)` : 'Unlocked'}
                            </span>
                        </div>
                        <div class="position-details">
                            <div class="detail-item">
                                <span class="detail-label">Staked Amount:</span>
                                <span class="detail-value">${position.amount.toFixed(2)} xCIS</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Current APY:</span>
                                <span class="detail-value">${(position.apy * 100).toFixed(1)}%</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Staked Date:</span>
                                <span class="detail-value">${new Date(position.stakedAt).toLocaleDateString()}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Pending Rewards:</span>
                                <span class="detail-value rewards">${position.rewards.toFixed(4)} xCIS</span>
                            </div>
                        </div>
                        <div class="position-actions">
                            <button class="claim-rewards-btn" data-position-id="${position.id}" ${position.rewards <= 0 ? 'disabled' : ''}>
                                Claim Rewards
                            </button>
                            <button class="unstake-btn" data-position-id="${position.id}" ${isLocked ? 'disabled' : ''}>
                                Unstake
                            </button>
                        </div>
                    </div>
                `;
            }
            
            positionsContainer.innerHTML = positionsHtml;
            
            // Add event listeners to action buttons
            const claimButtons = document.querySelectorAll('.claim-rewards-btn');
            claimButtons.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const positionId = btn.getAttribute('data-position-id');
                    await this.claimRewards(positionId);
                    this._updateUI();
                });
            });
            
            const unstakeButtons = document.querySelectorAll('.unstake-btn');
            unstakeButtons.forEach(btn => {
                btn.addEventListener('click', async () => {
                    const positionId = btn.getAttribute('data-position-id');
                    await this.unstakeTokens(positionId);
                    this._updateUI();
                });
            });
            
        } catch (error) {
            console.error('Error updating staking positions UI:', error);
        }
    }

    _setupRewardCalculator() {
        // Calculate rewards every hour
        setInterval(async () => {
            await this._calculatePendingRewards();
            this._updatePoolAPYs();
        }, this.rewardInterval);
    }

    _updatePoolAPYs() {
        this.stakingPools.forEach(async pool => {
            const newApy = await this._calculateCurrentAPY(pool);
            
            // Update APY for all positions in this pool
            this.stakingPositions
                .filter(pos => pos.poolId === pool.id)
                .forEach(pos => {
                    pos.apy = newApy;
                });
        });
        
        // Save updated positions
        this._saveStakingPositions();
    }

    _calculateTVL() {
        this.totalValueLocked = this.stakingPositions.reduce((total, pos) => {
            return total + pos.amount + pos.rewards;
        }, 0);
        
        // Update pool statistics
        this.stakingPools.forEach(pool => {
            pool.totalStaked = this.stakingPositions
                .filter(pos => pos.poolId === pool.id)
                .reduce((total, pos) => total + pos.amount + pos.rewards, 0);
            
            pool.stakersCount = new Set(
                this.stakingPositions
                    .filter(pos => pos.poolId === pool.id)
                    .map(pos => pos.walletAddress)
            ).size;
        });
    }

    _validateWallet() {
        if (!this.walletSystem || !this.walletSystem.getCurrentWallet()) {
            throw new Error('Please connect your wallet first');
        }
        
        const wallet = this.walletSystem.getCurrentWallet();
        
        if (!wallet.balance) {
            wallet.balance = { CIS: 0, xCIS: 0 };
        } else if (typeof wallet.balance === 'number') {
            wallet.balance = { CIS: wallet.balance, xCIS: 0 };
        }
        
        return wallet;
    }

    _showNotification(message, type) {
        if (window.notifications) {
            window.notifications.show(message, type);
        }
    }

    _dispatchEvent(eventName, detail) {
        window.dispatchEvent(new CustomEvent(eventName, { detail }));
    }

    _handleError(context, error) {
        console.error(context, error);
        this._showNotification(error.message, 'error');
    }

    /**
     * Clean up resources to prevent memory leaks
     */
    async cleanup() {
        try {
            console.log('Cleaning up staking system resources');
            
            // Cancel all pending timers
            if (this.rewardCalculationTimer) {
                clearInterval(this.rewardCalculationTimer);
                this.rewardCalculationTimer = null;
            }
            
            if (this.autosaveTimer) {
                clearInterval(this.autosaveTimer);
                this.autosaveTimer = null;
            }
            
            // Calculate final rewards before shutdown
            if (this.stakingPositions.length > 0) {
                for (const position of this.stakingPositions) {
                    await this._calculateRewardsForPosition(position);
                }
                await this._saveStakingPositions();
            }
            
            // Remove event listeners from UI elements
            this._removeEventListeners();
            
            // Reset state
            this.isInitialized = false;
            
            console.log('Staking system cleanup complete');
        } catch (error) {
            console.error('Error cleaning up staking system:', error);
        }
    }

    /**
     * Remove event listeners to prevent memory leaks
     */
    _removeEventListeners() {
        try {
            // Stake button
            const stakeBtn = document.getElementById('stake-btn');
            if (stakeBtn) {
                // Clone and replace to remove all listeners
                const newStakeBtn = stakeBtn.cloneNode(true);
                stakeBtn.parentNode.replaceChild(newStakeBtn, stakeBtn);
            }
            
            // Remove wallet connection event listeners
            window.removeEventListener('walletConnected', this._handleWalletConnected);
            window.removeEventListener('walletDisconnected', this._handleWalletDisconnected);
            
            // Remove others if any
            const unstakeBtns = document.querySelectorAll('[data-action="unstake"]');
            unstakeBtns.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            });
            
            const claimBtns = document.querySelectorAll('[data-action="claim-rewards"]');
            claimBtns.forEach(btn => {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
            });
        } catch (error) {
            console.error('Error removing staking event listeners:', error);
        }
    }

    /**
     * Calculate current APY for a pool based on TVL and other factors
     * @param {Object} pool - Staking pool
     * @returns {Promise<number>} - Current APY
     */
    async _calculateCurrentAPY(pool) {
        try {
            // Base APY from pool configuration
            let apy = pool.baseApy;
            
            // Calculate adjustment based on total staked
            if (this.totalValueLocked > 0) {
                // As TVL increases, APY approaches maxApy, starting from baseApy
                const ratio = Math.min(1, pool.totalStaked / this.apyAdjustmentThreshold);
                apy = pool.baseApy + (ratio * (pool.maxApy - pool.baseApy));
            }
            
            return Math.min(pool.maxApy, apy);
        } catch (error) {
            console.error('Error calculating APY:', error);
            return pool.baseApy; // Return base APY as fallback
        }
    }
}

// Create global instance
window.stakingSystem = new StakingSystem();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.stakingSystem) {
        window.stakingSystem.initialize();
    }
}); 