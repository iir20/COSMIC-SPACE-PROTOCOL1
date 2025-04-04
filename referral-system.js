// Referral System and Token Transfer Management

class ReferralSystem {
    constructor() {
        this.referralData = {};
        this.referralReward = 50; // Amount of xCIS for referring someone
        this.levels = [
            { level: 1, required: 5, reward: { xcis: 100 } },
            { level: 2, required: 15, reward: { xcis: 250 } },
            { level: 3, required: 30, reward: { xcis: 500, nft: true } },
            { level: 4, required: 50, reward: { xcis: 1000, nft: true } },
            { level: 5, required: 100, reward: { xcis: 2500, nft: true } }
        ];
        
        // Add titles to levels
        this.levels.forEach(level => {
            level.title = `Level ${level.level} Referrer`;
        });
        
        this.isInitialized = false;
        this.loadReferralData();
    }

    async init() {
        try {
            if (this.isInitialized) {
                console.log('Referral system already initialized');
                return true;
            }
            
            // Load saved referral data
            this.loadReferralData();
            
            // Wait for wallet system if needed
            if (!window.cispWallet) {
                console.warn('Wallet system not available, waiting for it to initialize...');
                
                // Try up to 5 times with a 1s delay between attempts
                for (let i = 0; i < 5; i++) {
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    if (window.cispWallet) break;
                }
                
                if (!window.cispWallet) {
                    console.warn('Wallet system not available after waiting, some features may be limited');
                }
            }
            
            this.isInitialized = true;
            console.log('Referral system initialized');
            
            // Dispatch initialized event
            window.dispatchEvent(new CustomEvent('referralSystemInitialized'));
            
            return true;
        } catch (error) {
            console.error('Error initializing referral system:', error);
            return false;
        }
    }

    loadReferralData() {
        const savedData = localStorage.getItem('referralData');
        this.referralData = savedData ? JSON.parse(savedData) : {};
    }

    saveReferralData() {
        localStorage.setItem('referralData', JSON.stringify(this.referralData));
    }

    generateReferralCode(address) {
        // Generate a unique referral code based on address and timestamp
        const timestamp = Date.now().toString(36);
        const addressPart = address.substring(2, 8);
        return `${addressPart}-${timestamp}`.toUpperCase();
    }

    async applyReferralCode(userAddress, referralCode) {
        try {
            // Ensure system is initialized
            if (!this.isInitialized) {
                await this.init();
            }
            
            // Validate inputs
            if (!userAddress || !referralCode) {
                throw new Error('Invalid parameters for referral code application');
            }

            // Normalize referral code
            referralCode = referralCode.trim().toUpperCase();
            
            // Check if code is valid format
            if (referralCode.length < 5) {
                throw new Error('Invalid referral code format');
            }

            // Validate referral code
            const referrer = this.findReferrerByCode(referralCode);
            if (!referrer) {
                throw new Error('Invalid referral code');
            }

            if (referrer === userAddress) {
                throw new Error('Cannot use your own referral code');
            }

            // Initialize user's referral data if not exists
            if (!this.referralData[userAddress]) {
                this.referralData[userAddress] = {
                    referralCode: this.generateReferralCode(userAddress),
                    referrer: referrer,
                    referrals: [],
                    level: 0,
                    totalRewards: 0,
                    claimedRewards: []
                };
            } else {
                // If user already has a referrer, don't allow changing it
                if (this.referralData[userAddress].referrer) {
                    throw new Error('You already have a referrer');
                }
                
                // Update the referrer
                this.referralData[userAddress].referrer = referrer;
            }

            // Update referrer's data
            if (!this.referralData[referrer]) {
                this.referralData[referrer] = {
                    referralCode: this.generateReferralCode(referrer),
                    referrer: null,
                    referrals: [],
                    level: 0,
                    totalRewards: 0,
                    claimedRewards: []
                };
            }

            // Add user to referrer's referrals if not already added
            if (!this.referralData[referrer].referrals.includes(userAddress)) {
                this.referralData[referrer].referrals.push(userAddress);
                
                // Grant bonus tokens to referrer
                if (window.cispWallet) {
                    const referrerWallet = window.cispWallet.getWalletByAddress(referrer);
                    if (referrerWallet) {
                        try {
                            // Ensure wallet has proper balance structure
                            if (!referrerWallet.balance) {
                                referrerWallet.balance = { CIS: 0, xCIS: 0 };
                            } else if (typeof referrerWallet.balance === 'number') {
                                referrerWallet.balance = { 
                                    CIS: referrerWallet.balance,
                                    xCIS: 0
                                };
                            }
                            
                            // Add referral bonus to xCIS balance
                            referrerWallet.balance.xCIS = (referrerWallet.balance.xCIS || 0) + this.referralReward;
                            
                            // Save updated wallet
                            window.cispWallet._save();
                            
                            // Update referrer's total rewards
                            this.referralData[referrer].totalRewards += this.referralReward;
                            
                            // Notify referrer if possible
                            if (window.notifications) {
                                window.notifications.show(`You received ${this.referralReward} xCIS from a referral!`, 'success', 5000);
                            }
                            
                            // Log successful referral
                            console.log(`Referral reward of ${this.referralReward} xCIS granted to ${referrer}`);
                        } catch (walletError) {
                            console.error('Error updating wallet balance for referral:', walletError);
                        }
                    }
                }
                
                await this.checkAndUpdateLevel(referrer);
            }

            this.saveReferralData();
            return true;
        } catch (error) {
            console.error('Error applying referral code:', error);
            throw error;
        }
    }

    /**
     * Find referrer address by referral code
     * @param {string} referralCode - Referral code to search for
     * @returns {string|null} - Referrer address or null if not found
     */
    findReferrerByCode(referralCode) {
        if (!referralCode) return null;
        
        // Normalize the code
        referralCode = referralCode.trim().toUpperCase();
        
        // Search for the referral code in all users
        for (const [address, data] of Object.entries(this.referralData)) {
            if (data.referralCode && data.referralCode.toUpperCase() === referralCode) {
                return address;
            }
        }
        
        // For the first few users who need to use a referral code, provide some default ones
        const defaultCodes = {
            'COSMIC-2023': 'CISP1000000000000',  // System address
            'SPACE-2023': 'CISP1000000000001',   // System address
            'WEB3-2023': 'CISP1000000000002'     // System address
        };
        
        return defaultCodes[referralCode] || null;
    }

    async checkAndUpdateLevel(address) {
        const userData = this.referralData[address];
        if (!userData) return;

        const referralCount = userData.referrals.length;
        let newLevel = 0;

        // Find the highest level achieved
        for (const levelData of this.levels) {
            if (referralCount >= levelData.required) {
                newLevel = levelData.level;
            } else {
                break;
            }
        }

        // If level increased, grant rewards
        if (newLevel > userData.level) {
            for (let i = userData.level + 1; i <= newLevel; i++) {
                await this.grantLevelRewards(address, i);
            }
            userData.level = newLevel;
            this.saveReferralData();
        }
    }

    async grantLevelRewards(address, level) {
        const levelData = this.levels[level - 1];
        if (!levelData) return;

        const reward = levelData.reward;
        const userData = this.referralData[address];

        // Grant xCIS tokens
        if (reward.xcis > 0) {
            try {
                // Try different methods to grant tokens based on available API
                if (window.blockchain) {
                    if (typeof window.blockchain.grantTokens === 'function') {
                        await window.blockchain.grantTokens(address, reward.xcis);
                    } else if (typeof window.blockchain.addBalance === 'function') {
                        await window.blockchain.addBalance(address, 'xCIS', reward.xcis);
                    } else if (typeof window.blockchain.getWalletBalance === 'function') {
                        // Transfer directly to wallet if blockchain API not available
                        const wallet = window.cispWallet?.getWalletByAddress(address);
                        if (wallet && wallet.balance) {
                            if (typeof wallet.balance === 'number') {
                                wallet.balance = { CIS: wallet.balance, xCIS: 0 };
                            }
                            wallet.balance.xCIS = (wallet.balance.xCIS || 0) + reward.xcis;
                            window.cispWallet?._save();
                        }
                    }
                } else if (window.cispChain) {
                    // Try cispChain as an alternative
                    if (typeof window.cispChain.grantTokens === 'function') {
                        await window.cispChain.grantTokens(address, reward.xcis);
                    } else if (typeof window.cispChain.addBalance === 'function') {
                        await window.cispChain.addBalance(address, 'xCIS', reward.xcis);
                    }
                } else {
                    // Direct wallet update if no blockchain API available
                    const wallet = window.cispWallet?.getWalletByAddress(address);
                    if (wallet && wallet.balance) {
                        if (typeof wallet.balance === 'number') {
                            wallet.balance = { CIS: wallet.balance, xCIS: 0 };
                        }
                        wallet.balance.xCIS = (wallet.balance.xCIS || 0) + reward.xcis;
                        window.cispWallet?._save();
                    }
                }
                
                // Update user's total rewards regardless of method used
                userData.totalRewards += reward.xcis;
            } catch (error) {
                console.error('Error granting level reward tokens:', error);
            }
        }

        // Grant NFT if applicable
        if (reward.nft && window.nftSystem) {
            try {
                // Use mintRandomNFT or fallback to mintNFT
                let nft;
                if (typeof window.nftSystem.mintRandomNFT === 'function') {
                    nft = await window.nftSystem.mintRandomNFT(address);
                } else if (typeof window.nftSystem.mintNFT === 'function') {
                    nft = await window.nftSystem.mintNFT(address, 'random');
                }
                
                if (nft) {
                    userData.claimedRewards.push({
                        type: 'nft',
                        id: nft.id,
                        level: level,
                        timestamp: Date.now()
                    });
                }
            } catch (error) {
                console.error('Error minting NFT reward:', error);
            }
        }

        // Save updated data
        this.saveReferralData();

        // Show notification
        const rewardText = `${reward.xcis} xCIS${reward.nft ? ' + Random NFT' : ''}`;
        if (window.notifications) {
            window.notifications.show(
                `Level ${level} Achieved!\nRewards: ${rewardText}`,
                'success',
                8000
            );
        }
    }

    getReferralStats(address) {
        if (!address) {
            // Try to get current wallet address
            if (window.cispWallet) {
                const currentWallet = window.cispWallet.getCurrentWallet();
                if (currentWallet) {
                    address = currentWallet.address;
                }
            }
            
            if (!address) {
                return {
                    referralCode: null,
                    totalReferrals: 0,
                    currentLevel: 0,
                    levelTitle: 'Not Connected',
                    totalRewards: 0,
                    nextLevelRequirement: null,
                    remainingForNextLevel: 0
                };
            }
        }
    
        const userData = this.referralData[address] || {
            referralCode: null,
            referrals: [],
            level: 0,
            totalRewards: 0
        };

        // If user doesn't have a referral code yet, generate one
        if (!userData.referralCode) {
            userData.referralCode = this.generateReferralCode(address);
            
            // Save the generated code
            if (!this.referralData[address]) {
                this.referralData[address] = userData;
                this.saveReferralData();
            }
        }

        const currentLevel = userData.level >= 1 && userData.level <= 5 ? 
            this.levels[userData.level - 1] : 
            { level: 0, title: 'New Referrer', required: this.levels[0].required };
            
        const nextLevel = userData.level < 5 ? 
            this.levels[userData.level] : 
            null;

        return {
            referralCode: userData.referralCode,
            totalReferrals: userData.referrals.length,
            currentLevel: userData.level,
            levelTitle: currentLevel.title || `Level ${currentLevel.level} Referrer`,
            totalRewards: userData.totalRewards,
            nextLevelRequirement: nextLevel ? nextLevel.required : null,
            remainingForNextLevel: nextLevel ? nextLevel.required - userData.referrals.length : 0
        };
    }
}

class TokenTransfer {
    static async sendTokens(fromAddress, toAddress, amount, tokenType = 'xCIS') {
        try {
            if (!window.cispChain) throw new Error('Blockchain not initialized');
            
            const sender = window.cispChain.addresses[fromAddress];
            if (!sender || sender[tokenType] < amount) {
                throw new Error('Insufficient balance');
            }

            // Initialize recipient address if it doesn't exist
            if (!window.cispChain.addresses[toAddress]) {
                window.cispChain.addresses[toAddress] = { xCIS: 0, CIS: 0, nfts: [] };
            }

            // Perform transfer
            window.cispChain.addresses[fromAddress][tokenType] -= amount;
            window.cispChain.addresses[toAddress][tokenType] += amount;

            // Save blockchain state
            window.cispChain.saveState();

            return {
                success: true,
                message: `Successfully sent ${amount} ${tokenType} to ${toAddress}`,
                transaction: {
                    from: fromAddress,
                    to: toAddress,
                    amount: amount,
                    type: tokenType,
                    timestamp: Date.now()
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }

    static async transferNFT(fromAddress, toAddress, nftId) {
        try {
            if (!window.cispChain) throw new Error('Blockchain not initialized');
            
            const sender = window.cispChain.addresses[fromAddress];
            if (!sender) throw new Error('Sender address not found');

            const nftIndex = sender.nfts.findIndex(nft => nft.id === nftId);
            if (nftIndex === -1) throw new Error('NFT not found in sender\'s collection');

            // Initialize recipient address if it doesn't exist
            if (!window.cispChain.addresses[toAddress]) {
                window.cispChain.addresses[toAddress] = { xCIS: 0, CIS: 0, nfts: [] };
            }

            // Transfer NFT
            const nft = sender.nfts.splice(nftIndex, 1)[0];
            nft.owner = toAddress;
            window.cispChain.addresses[toAddress].nfts.push(nft);

            // Save blockchain state
            window.cispChain.saveState();

            return {
                success: true,
                message: `Successfully transferred NFT #${nftId} to ${toAddress}`,
                nft: nft
            };
        } catch (error) {
            return {
                success: false,
                message: error.message
            };
        }
    }
}

// Initialize global instances
window.referralSystem = new ReferralSystem();
window.tokenTransfer = TokenTransfer; 