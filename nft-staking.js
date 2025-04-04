/**
 * Cosmic Space Protocol - NFT Staking System
 */

class NFTStakingSystem {
    constructor() {
        this.pools = new Map();
        this.stakedNFTs = new Map();
        this.rewards = new Map();
        this.initialized = false;
        this.eventListeners = new Set();
        this.rewardsCache = new Map();
        this.rewardsCacheTime = new Map();
        this.REWARDS_CACHE_DURATION = 60 * 1000; // 1 minute
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            console.log('Initializing NFT Staking System...');
            
            // Initialize staking pools
            this.initializePools();
            
            // Load staked NFTs from storage
            await this.loadStakedNFTs();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('NFT Staking System initialized successfully');
            
            // Register globally
            window.nftStaking = this;
            
            return true;
        } catch (error) {
            console.error('Failed to initialize NFT Staking System:', error);
            return false;
        }
    }

    initializePools() {
        // Initialize staking pools with their configurations
        this.pools.set('legendary', {
            name: 'Legendary Pool',
            apr: 120,
            lockPeriod: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
            minRarity: 'legendary',
            rewardMultiplier: 3,
            totalStaked: 0
        });

        this.pools.set('epic', {
            name: 'Epic Pool',
            apr: 90,
            lockPeriod: 14 * 24 * 60 * 60 * 1000, // 14 days in milliseconds
            minRarity: 'epic',
            rewardMultiplier: 2,
            totalStaked: 0
        });

        this.pools.set('rare', {
            name: 'Rare Pool',
            apr: 60,
            lockPeriod: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
            minRarity: 'rare',
            rewardMultiplier: 1.5,
            totalStaked: 0
        });
    }

    async loadStakedNFTs() {
        try {
            const stored = localStorage.getItem('staked_nfts');
            if (stored) {
                this.stakedNFTs = new Map(Object.entries(JSON.parse(stored)));
            }

            const storedRewards = localStorage.getItem('staking_rewards');
            if (storedRewards) {
                this.rewards = new Map(Object.entries(JSON.parse(storedRewards)));
            }
        } catch (error) {
            console.error('Error loading staked NFTs:', error);
        }
    }

    async stakeNFT(tokenId, poolId) {
        try {
            if (!window.cispWallet?.getCurrentWallet()) {
                throw new Error('Please connect your wallet first');
            }

            const nft = await window.nftSystem.getNFT(tokenId);
            if (!nft) {
                throw new Error('NFT not found');
            }

            const pool = this.pools.get(poolId);
            if (!pool) {
                throw new Error('Invalid staking pool');
            }

            // Check if NFT meets pool requirements
            if (!this.isNFTEligibleForPool(nft, pool)) {
                throw new Error(`This NFT does not meet the minimum requirements for the ${pool.name}`);
            }

            // Check if NFT is already staked
            if (this.stakedNFTs.has(tokenId)) {
                throw new Error('NFT is already staked');
            }

            const stakingInfo = {
                tokenId,
                poolId,
                owner: window.cispWallet.getCurrentWallet().address,
                stakedAt: Date.now(),
                lastRewardClaim: Date.now(),
                nftData: nft
            };

            this.stakedNFTs.set(tokenId, stakingInfo);
            this.updatePoolStats(poolId);
            this.saveToPersistentStorage();
            this.notifyListeners('stake', stakingInfo);

            return true;
        } catch (error) {
            console.error('Error staking NFT:', error);
            throw error;
        }
    }

    async unstakeNFT(tokenId) {
        try {
            if (!window.cispWallet?.getCurrentWallet()) {
                throw new Error('Please connect your wallet first');
            }

            const stakingInfo = this.stakedNFTs.get(tokenId);
            if (!stakingInfo) {
                throw new Error('NFT is not staked');
            }

            if (stakingInfo.owner !== window.cispWallet.getCurrentWallet().address) {
                throw new Error('Only the owner can unstake this NFT');
            }

            const pool = this.pools.get(stakingInfo.poolId);
            const currentTime = Date.now();
            const stakedTime = currentTime - stakingInfo.stakedAt;

            if (stakedTime < pool.lockPeriod) {
                throw new Error(`Cannot unstake yet. Lock period: ${this.formatDuration(pool.lockPeriod - stakedTime)} remaining`);
            }

            // Claim any pending rewards before unstaking
            await this.claimRewards(tokenId);

            this.stakedNFTs.delete(tokenId);
            this.updatePoolStats(stakingInfo.poolId);
            this.saveToPersistentStorage();
            this.notifyListeners('unstake', { tokenId, poolId: stakingInfo.poolId });

            return true;
        } catch (error) {
            console.error('Error unstaking NFT:', error);
            throw error;
        }
    }

    async claimRewards(tokenId) {
        try {
            if (!window.cispWallet?.getCurrentWallet()) {
                throw new Error('Please connect your wallet first');
            }

            const stakingInfo = this.stakedNFTs.get(tokenId);
            if (!stakingInfo) {
                throw new Error('NFT is not staked');
            }

            if (stakingInfo.owner !== window.cispWallet.getCurrentWallet().address) {
                throw new Error('Only the owner can claim rewards');
            }

            const rewards = await this.calculateRewards(tokenId);
            if (rewards <= 0) {
                throw new Error('No rewards available to claim');
            }

            // Process reward transaction
            await this.processRewardClaim(stakingInfo.owner, rewards);

            // Update last claim time
            stakingInfo.lastRewardClaim = Date.now();
            this.stakedNFTs.set(tokenId, stakingInfo);
            this.saveToPersistentStorage();

            this.notifyListeners('claim', {
                tokenId,
                rewards,
                owner: stakingInfo.owner
            });

            return rewards;
        } catch (error) {
            console.error('Error claiming rewards:', error);
            throw error;
        }
    }

    async calculateRewards(tokenId) {
        const stakingInfo = this.stakedNFTs.get(tokenId);
        if (!stakingInfo) return 0;

        const pool = this.pools.get(stakingInfo.poolId);
        const currentTime = Date.now();
        const timeStaked = currentTime - stakingInfo.lastRewardClaim;
        const baseReward = (pool.apr / 365 / 24 / 60 / 60) * (timeStaked / 1000); // APR to per-second rate
        const multiplier = this.getRewardMultiplier(stakingInfo.nftData);

        return baseReward * multiplier;
    }

    async processRewardClaim(address, amount) {
        try {
            // Transfer xCIS tokens as rewards
            await window.cispWallet.mintRewardTokens(address, amount);
            
            // Update balances
            await window.cispWallet.updateBalances();
            
            return true;
        } catch (error) {
            console.error('Reward claim failed:', error);
            throw error;
        }
    }

    getRewardMultiplier(nft) {
        // Base multiplier from pool
        const pool = this.pools.get(nft.poolId);
        let multiplier = pool.rewardMultiplier;

        // Additional multipliers based on NFT properties
        const rarityMultipliers = {
            'common': 1,
            'uncommon': 1.2,
            'rare': 1.5,
            'epic': 2,
            'legendary': 3
        };

        multiplier *= rarityMultipliers[nft.rarity.toLowerCase()] || 1;

        return multiplier;
    }

    async getPoolData(poolId) {
        const pool = this.pools.get(poolId);
        if (!pool) return null;

        const wallet = window.cispWallet?.getCurrentWallet();
        const stakedNFTs = Array.from(this.stakedNFTs.values())
            .filter(info => info.poolId === poolId);
        
        const yourStakedNFTs = wallet ? 
            stakedNFTs.filter(info => info.owner === wallet.address) : [];

        return {
            ...pool,
            totalStaked: stakedNFTs.length,
            yourStaked: yourStakedNFTs.length,
            nfts: yourStakedNFTs.map(info => ({
                ...info.nftData,
                stakedAt: info.stakedAt,
                rewards: await this.calculateRewards(info.tokenId)
            }))
        };
    }

    async getStakingStats(address) {
        const stats = {
            totalStaked: 0,
            averageApr: 0,
            totalRewards: 0,
            averageTime: 0
        };

        const userNFTs = Array.from(this.stakedNFTs.values())
            .filter(info => info.owner === address);

        if (userNFTs.length > 0) {
            stats.totalStaked = userNFTs.length;

            // Calculate average APR
            const totalApr = userNFTs.reduce((sum, info) => {
                const pool = this.pools.get(info.poolId);
                return sum + pool.apr;
            }, 0);
            stats.averageApr = totalApr / userNFTs.length;

            // Calculate total rewards
            const rewards = await Promise.all(userNFTs.map(info => 
                this.calculateRewards(info.tokenId)
            ));
            stats.totalRewards = rewards.reduce((sum, reward) => sum + reward, 0);

            // Calculate average staking time
            const currentTime = Date.now();
            const totalTime = userNFTs.reduce((sum, info) => 
                sum + (currentTime - info.stakedAt), 0);
            stats.averageTime = Math.floor(totalTime / userNFTs.length / (24 * 60 * 60 * 1000)); // Convert to days
        }

        return stats;
    }

    async getStakingRewards(address) {
        // Check cache first
        const cached = this.rewardsCache.get(address);
        const cacheTime = this.rewardsCacheTime.get(address);
        if (cached && cacheTime && (Date.now() - cacheTime < this.REWARDS_CACHE_DURATION)) {
            return cached;
        }

        const userNFTs = Array.from(this.stakedNFTs.values())
            .filter(info => info.owner === address);

        const rewards = {
            available: 0,
            nextReward: 0,
            share: 0,
            totalClaimed: 0
        };

        if (userNFTs.length > 0) {
            // Calculate available rewards
            const pendingRewards = await Promise.all(userNFTs.map(info => 
                this.calculateRewards(info.tokenId)
            ));
            rewards.available = pendingRewards.reduce((sum, reward) => sum + reward, 0);

            // Calculate next reward time (shortest time until next reward)
            const currentTime = Date.now();
            const nextRewardTimes = userNFTs.map(info => {
                const pool = this.pools.get(info.poolId);
                const timeUntilReward = (info.lastRewardClaim + (60 * 60 * 1000)) - currentTime; // 1 hour intervals
                return Math.max(0, timeUntilReward);
            });
            rewards.nextReward = Math.min(...nextRewardTimes) + currentTime;

            // Calculate share of total staking pool
            const totalStaked = Array.from(this.stakedNFTs.values()).length;
            rewards.share = (userNFTs.length / totalStaked) * 100;

            // Get total claimed rewards from storage
            const claimed = this.rewards.get(address) || 0;
            rewards.totalClaimed = claimed;
        }

        // Update cache
        this.rewardsCache.set(address, rewards);
        this.rewardsCacheTime.set(address, Date.now());

        return rewards;
    }

    isNFTEligibleForPool(nft, pool) {
        const rarityLevels = ['common', 'uncommon', 'rare', 'epic', 'legendary'];
        const nftRarityIndex = rarityLevels.indexOf(nft.rarity.toLowerCase());
        const poolMinRarityIndex = rarityLevels.indexOf(pool.minRarity.toLowerCase());
        
        return nftRarityIndex >= poolMinRarityIndex;
    }

    updatePoolStats(poolId) {
        const pool = this.pools.get(poolId);
        if (!pool) return;

        const stakedInPool = Array.from(this.stakedNFTs.values())
            .filter(info => info.poolId === poolId);
        
        pool.totalStaked = stakedInPool.length;
    }

    setupEventListeners() {
        window.addEventListener('walletChanged', () => {
            this.notifyListeners('walletChanged', {
                address: window.cispWallet?.getCurrentWallet()?.address
            });
        });
    }

    addListener(callback) {
        this.eventListeners.add(callback);
    }

    removeListener(callback) {
        this.eventListeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.eventListeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in staking event listener:', error);
            }
        });
    }

    saveToPersistentStorage() {
        try {
            localStorage.setItem('staked_nfts', JSON.stringify(Object.fromEntries(this.stakedNFTs)));
            localStorage.setItem('staking_rewards', JSON.stringify(Object.fromEntries(this.rewards)));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }

    formatDuration(ms) {
        const days = Math.floor(ms / (24 * 60 * 60 * 1000));
        const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
        
        const parts = [];
        if (days > 0) parts.push(`${days}d`);
        if (hours > 0) parts.push(`${hours}h`);
        if (minutes > 0) parts.push(`${minutes}m`);
        
        return parts.join(' ');
    }
}

// Initialize staking system
const stakingSystem = new NFTStakingSystem();
window.nftStaking = stakingSystem;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    stakingSystem.initialize().catch(error => {
        console.error('Failed to initialize NFT staking system:', error);
    });
}); 