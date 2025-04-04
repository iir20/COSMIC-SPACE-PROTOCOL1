/**
 * CISP Wallet System
 * Native wallet implementation for the Cosmic Space Protocol
 */

class CISPWallet {
    constructor() {
        this.wallets = new Map();
        this.currentWallet = null;
        this.isInitialized = false;
        this.isConnecting = false;
        this.connectionListeners = [];
        this.currentWalletId = null;
        
        // Wallet types
        this.WALLET_TYPES = {
            STANDARD: 'standard',
            MULTISIG: 'multisig',
            HARDWARE: 'hardware'
        };
        
        // BIP-39 wordlist (first 400 words for brevity)
        this.bip39Wordlist = [
            "abandon", "ability", "able", "about", "above", "absent", "absorb", "abstract", "absurd", "abuse",
            "access", "accident", "account", "accuse", "achieve", "acid", "acoustic", "acquire", "across", "act",
            "action", "actor", "actress", "actual", "adapt", "add", "addict", "address", "adjust", "admit",
            "adult", "advance", "advice", "aerobic", "affair", "afford", "afraid", "again", "age", "agent",
            "agree", "ahead", "aim", "air", "airport", "aisle", "alarm", "album", "alcohol", "alert",
            "alien", "all", "alley", "allow", "almost", "alone", "alpha", "already", "also", "alter",
            "always", "amateur", "amazing", "among", "amount", "amused", "analyst", "anchor", "ancient", "anger",
            "angle", "angry", "animal", "ankle", "announce", "annual", "another", "answer", "antenna", "antique",
            "anxiety", "any", "apart", "apology", "appear", "apple", "approve", "april", "arch", "arctic",
            "area", "arena", "argue", "arm", "armed", "armor", "army", "around", "arrange", "arrest",
            "arrive", "arrow", "art", "artefact", "artist", "artwork", "ask", "aspect", "assault", "asset",
            "assist", "assume", "asthma", "athlete", "atom", "attack", "attend", "attitude", "attract", "auction",
            "audit", "august", "aunt", "author", "auto", "autumn", "average", "avocado", "avoid", "awake",
            "aware", "away", "awesome", "awful", "awkward", "axis", "baby", "bachelor", "bacon", "badge",
            "bag", "balance", "balcony", "ball", "bamboo", "banana", "banner", "bar", "barely", "bargain",
            "barrel", "base", "basic", "basket", "battle", "beach", "bean", "beauty", "because", "become",
            "beef", "before", "begin", "behave", "behind", "believe", "below", "belt", "bench", "benefit",
            "best", "betray", "better", "between", "beyond", "bicycle", "bid", "bike", "bind", "biology",
            "bird", "birth", "bitter", "black", "blade", "blame", "blanket", "blast", "bleak", "bless",
            "blind", "blood", "blossom", "blouse", "blue", "blur", "blush", "board", "boat", "body",
            "boil", "bomb", "bone", "bonus", "book", "boost", "border", "boring", "borrow", "boss",
            "bottom", "bounce", "box", "boy", "bracket", "brain", "brand", "brass", "brave", "bread",
            "breeze", "brick", "bridge", "brief", "bright", "bring", "brisk", "broccoli", "broken", "bronze",
            "broom", "brother", "brown", "brush", "bubble", "buddy", "budget", "buffalo", "build", "bulb",
            "bulk", "bullet", "bundle", "bunker", "burden", "burger", "burst", "bus", "business", "busy",
            "butter", "buyer", "buzz", "cabbage", "cabin", "cable", "cactus", "cage", "cake", "call",
            "calm", "camera", "camp", "can", "canal", "cancel", "candy", "cannon", "canoe", "canvas",
            "canyon", "capable", "capital", "captain", "car", "carbon", "card", "cargo", "carpet", "carry",
            "cart", "case", "cash", "casino", "castle", "casual", "cat", "catalog", "catch", "category",
            "cattle", "caught", "cause", "caution", "cave", "ceiling", "celery", "cement", "census", "century",
            "cereal", "certain", "chair", "chalk", "champion", "change", "chaos", "chapter", "charge", "chase",
            "chat", "cheap", "check", "cheese", "chef", "cherry", "chest", "chicken", "chief", "child",
            "chimney", "choice", "choose", "chronic", "chuckle", "chunk", "churn", "cigar", "cinnamon", "circle",
            "citizen", "city", "civil", "claim", "clap", "clarify", "claw", "clay", "clean", "clerk"
        ];
        
        // Add encryption constants
        this.ENCRYPTION_ALGORITHM = 'AES-GCM';
        this.ITERATIONS = 100000;
        this.KEY_LENGTH = 32;
        this.SALT_LENGTH = 16;
        this.IV_LENGTH = 12;
        this.AUTH_TAG_LENGTH = 16;
        
        // Password requirements
        this.PASSWORD_REQUIREMENTS = {
            minLength: 12,
            requireUppercase: true,
            requireLowercase: true,
            requireNumbers: true,
            requireSpecial: true
        };
        
        // Balance sync settings
        this.SYNC_INTERVAL = 10000; // 10 seconds
        this.MAX_SYNC_RETRIES = 3;
        this.syncTimeouts = new Map();
        
        // Transaction queue for failed transactions
        this.pendingTransactions = new Map();
        this.maxRetryAttempts = 3;
        
        // Error event handlers
        this.errorHandlers = new Set();
    }

    async init() {
        try {
            if (this.isInitialized) {
                console.log('Wallet system already initialized');
                return true;
            }
            
            console.log('Initializing CISP Wallet system');
            
            // Load wallets from localStorage
            const walletData = localStorage.getItem('cisp_wallets');
            if (walletData) {
                try {
                    const parsedWallets = JSON.parse(walletData);
                    this.wallets = new Map(Object.entries(parsedWallets));
                } catch (e) {
                    console.error('Error parsing wallet data:', e);
                    this.wallets = new Map();
                }
            }
            
            // Load current wallet from localStorage or sessionStorage
            const currentWalletId = sessionStorage.getItem('current_wallet_id') || localStorage.getItem('current_wallet_id');
            if (currentWalletId && this.wallets.has(currentWalletId)) {
                this.currentWallet = this.wallets.get(currentWalletId);
                
                // Broadcast wallet connection event
                this._broadcastWalletChange();
                console.log(`Wallet auto-connected: ${this.currentWallet.address}`);
            }
            
            // Set up cross-page wallet synchronization
            window.addEventListener('storage', (event) => {
                if (event.key === 'current_wallet_id') {
                    this._synchronizeWallet(event.newValue);
                }
            });
            
            // Set up global connection check
            this._setupConnectionCheck();
            
            this.isInitialized = true;
            return true;
        } catch (error) {
            console.error('Error initializing wallet system:', error);
            return false;
        }
    }

    async createWallet(walletName, password) {
        try {
            // Validate password strength
            this._validatePassword(password);

            if (!walletName || walletName.length < 3) {
                throw new Error('Please enter a wallet name (minimum 3 characters)');
            }

            this.isConnecting = true;
            if (!this.isInitialized) await this.init();
            
            // Generate cryptographically secure wallet address
            const addressBytes = await window.crypto.subtle.digest(
                'SHA-256',
                new TextEncoder().encode(Date.now().toString() + crypto.getRandomValues(new Uint8Array(32)))
            );
            const address = 'CISP' + Array.from(new Uint8Array(addressBytes))
                .slice(0, 16)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
            
            // Generate secure seed phrase
            const seedPhrase = await this._generateSecureSeedPhrase();
            
            // Derive encryption key from password
            const { key, salt, iv } = await this._deriveKey(password);
            
            // Encrypt seed phrase
            const encryptedSeed = await this._encryptData(seedPhrase, key, iv);
            
            // Create wallet object
            const wallet = {
                address,
                name: walletName,
                encryptedSeed,
                salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
                iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                balance: {
                    CIS: 0,
                    xCIS: 100
                },
                transactions: [],
                nonce: 0,
                version: 2 // Add version for future migrations
            };
            
            // Add to wallets collection
            this.wallets.set(address, wallet);
            this.currentWallet = wallet;
            
            // Save state
            await this._save();
            
            // Set current wallet ID
            this._setCurrentWalletId(address);
            
            // Initialize blockchain connection
            await this._initializeBlockchainConnection(address);
            
            // Setup balance synchronization
            this._setupBalanceSync(address);
            
            // Broadcast wallet connection event
            this._broadcastWalletChange();
            
            this.isConnecting = false;
            
            // Notify user of successful wallet creation
            if (window.notifications) {
                window.notifications.show('success', 'Wallet created successfully! Welcome to the Cosmic Space Protocol!');
            }
            this.addXCISToWallet(100); // Example: giving 100 xCIS as a welcome gift
            
            return {
                wallet,
                seedPhrase, // Return seed phrase for backup
                address // Return wallet address as key
            };
        } catch (error) {
            this.isConnecting = false;
            this._handleError('Wallet creation failed', error);
            throw error;
        }
    }

    async _initializeBlockchainConnection(walletAddress) {
        try {
            // Simulate connecting to the blockchain
            console.log(`Connecting to blockchain with wallet address: ${walletAddress}`);
            // Here you would add the actual connection logic
            // For example, using a blockchain API to establish a connection
            // await blockchainAPI.connect(walletAddress);
            console.log('Blockchain connection established successfully.');
        } catch (error) {
            console.error('Failed to connect to blockchain:', error);
            throw new Error('Blockchain connection failed');
        }
    }

    async restoreWallet(seedPhrase, password, walletName) {
        try {
            // Validate inputs
            this._validatePassword(password);
            this._validateSeedPhrase(seedPhrase);
            
            if (!walletName || walletName.length < 3) {
                throw new Error('Please enter a wallet name (minimum 3 characters)');
            }
            
            // Derive wallet address from seed phrase
            const addressBytes = await this._deriveAddressFromSeed(seedPhrase);
            const address = 'CISP' + Array.from(addressBytes)
                .slice(0, 16)
                .map(b => b.toString(16).padStart(2, '0'))
                .join('')
                .toUpperCase();
            
            // Check if wallet already exists
            if (this.wallets.has(address)) {
                throw new Error('Wallet already exists');
            }
            
            // Encrypt seed phrase
            const { key, salt, iv } = await this._deriveKey(password);
            const encryptedSeed = await this._encryptData(seedPhrase, key, iv);
            
            // Create wallet object
            const wallet = {
                address,
                name: walletName,
                encryptedSeed,
                salt: Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join(''),
                iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join(''),
                createdAt: Date.now(),
                lastAccessed: Date.now(),
                balance: {
                    CIS: 0,
                    xCIS: 0
                },
                transactions: [],
                nonce: 0,
                version: 2
            };
            
            // Add to wallets collection
            this.wallets.set(address, wallet);
            
            // Save state
            await this._save();
            
            // Setup balance synchronization
            this._setupBalanceSync(address);
            
            return wallet;
        } catch (error) {
            this._handleError('Wallet restoration failed', error);
            throw error;
        }
    }

    async verifyWallet(address, password) {
        try {
            const wallet = this.wallets.get(address);
            if (!wallet) {
                throw new Error('Wallet not found');
            }
            
            // Reconstruct encryption key
            const salt = new Uint8Array(wallet.salt.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            const iv = new Uint8Array(wallet.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            const { key } = await this._deriveKey(password, salt);
            
            // Try to decrypt seed phrase
            await this._decryptData(wallet.encryptedSeed, key, iv);
            
            return true;
        } catch (error) {
            return false;
        }
    }

    async exportWallet(address, password) {
        try {
            const wallet = this.wallets.get(address);
            if (!wallet) {
                throw new Error('Wallet not found');
            }
            
            // Verify password
            if (!await this.verifyWallet(address, password)) {
                throw new Error('Invalid password');
            }
            
            // Reconstruct encryption key
            const salt = new Uint8Array(wallet.salt.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            const iv = new Uint8Array(wallet.iv.match(/.{2}/g).map(byte => parseInt(byte, 16)));
            const { key } = await this._deriveKey(password, salt);
            
            // Decrypt seed phrase
            const seedPhrase = await this._decryptData(wallet.encryptedSeed, key, iv);
            
            return {
                seedPhrase,
                address: wallet.address,
                name: wallet.name,
                createdAt: wallet.createdAt
            };
        } catch (error) {
            this._handleError('Wallet export failed', error);
            throw error;
        }
    }

    connectWallet(address) {
        try {
            this.isConnecting = true;
            if (!address) {
                throw new Error('Wallet address is required');
            }
            
            if (!this.wallets.has(address)) {
                throw new Error('Wallet not found: ' + address);
            }
            
            // Set as current wallet
            this.currentWallet = this.wallets.get(address);
            this.currentWallet.lastAccessed = Date.now();
            
            // Store current wallet ID in both storages for cross-page access
            localStorage.setItem('current_wallet_id', address);
            sessionStorage.setItem('current_wallet_id', address);
            
            // Save wallet state
            this._save();
            
            // Broadcast wallet connection event
            this._broadcastWalletChange();
            
            // Notify user
            if (window.notifications) {
                window.notifications.show('success', `Wallet connected: ${address}`);
            }
            
            this.isConnecting = false;
            return this.currentWallet;
        } catch (error) {
            this.isConnecting = false;
            console.error('Error connecting wallet:', error);
            
            // Notify user of error
            if (window.notifications) {
                window.notifications.show('error', 'Failed to connect wallet: ' + error.message);
            }
            
            throw error;
        }
    }

    disconnectWallet() {
        try {
            this.currentWallet = null;
            
            // Remove current wallet ID from storage
            localStorage.removeItem('current_wallet_id');
            sessionStorage.removeItem('current_wallet_id');
            
            // Broadcast wallet disconnection event
            this._broadcastWalletChange();
            
            // Notify user
            if (window.notifications) {
                window.notifications.show('info', 'Wallet disconnected');
            }
            
            return true;
        } catch (error) {
            console.error('Error disconnecting wallet:', error);
            return false;
        }
    }

    isWalletConnected() {
        return !!this.currentWallet;
    }

    getCurrentWallet() {
        return this.currentWallet;
    }

    getWalletByAddress(address) {
        if (!address) return null;
        return this.wallets.get(address) || null;
    }

    getAllWallets() {
        return Array.from(this.wallets.values());
    }

    async updateWalletBalance(address, currency, amount) {
        if (!this.wallets.has(address)) {
            console.error('Wallet not found:', address);
            return false;
        }
        
        const wallet = this.wallets.get(address);
        wallet.balance[currency] = amount;
        
        // Update if it's the current wallet
        if (this.currentWallet && this.currentWallet.address === address) {
            this.currentWallet = wallet;
            this._broadcastWalletChange();
        }
        
        this._save();
        return true;
    }

    // Private method to generate seed phrase
    _generateSeedPhrase() {
        const words = [
            'cosmic', 'space', 'protocol', 'galaxy', 'star', 'planet', 'meteor', 
            'asteroid', 'comet', 'nebula', 'quasar', 'black', 'hole', 'universe', 
            'exploration', 'discovery', 'mission', 'rocket', 'satellite', 'orbit', 
            'lunar', 'solar', 'system', 'colony', 'station', 'module', 'quantum', 
            'gravity', 'fusion', 'energy', 'matter', 'dark', 'light', 'void', 
            'dimension', 'portal', 'wormhole', 'infinity', 'beyond', 'eternal'
        ];
        
        let seedPhrase = '';
        for (let i = 0; i < 12; i++) {
            const randomIndex = Math.floor(Math.random() * words.length);
            seedPhrase += (seedPhrase ? ' ' : '') + words[randomIndex];
        }
        
        return seedPhrase;
    }

    // Private method to save wallet state
    _save() {
        try {
            // Convert Map to object for storing
            const walletsObj = Object.fromEntries(this.wallets.entries());
            localStorage.setItem('cisp_wallets', JSON.stringify(walletsObj));
            
            // Also save current wallet ID if available
            if (this.currentWallet) {
                localStorage.setItem('current_wallet_id', this.currentWallet.address);
                sessionStorage.setItem('current_wallet_id', this.currentWallet.address);
            }
        } catch (error) {
            console.error('Error saving wallet state:', error);
        }
    }

    // New method to broadcast wallet change event
    _broadcastWalletChange() {
        // Use a custom event to notify the application of wallet changes
        const walletEvent = new CustomEvent('walletChanged', {
            detail: this.currentWallet
        });
        
        // Dispatch the event
        window.dispatchEvent(walletEvent);
        
        // Also notify registered listeners
        this.connectionListeners.forEach(listener => {
            try {
                listener(this.currentWallet);
            } catch (e) {
                console.error('Error in wallet connection listener:', e);
            }
        });
        
        console.log('Broadcast wallet change event:', this.currentWallet?.address || 'disconnected');
    }

    // New method to synchronize wallet state across pages
    _synchronizeWallet(walletId) {
        try {
            // Check if we need to update current wallet
            if (!walletId) {
                if (this.currentWallet) {
                    this.currentWallet = null;
                    this._broadcastWalletChange();
                }
                return;
            }
            
            // If wallet ID is different from current and exists in our collection
            if ((!this.currentWallet || this.currentWallet.address !== walletId) && this.wallets.has(walletId)) {
                this.currentWallet = this.wallets.get(walletId);
                this._broadcastWalletChange();
            }
        } catch (error) {
            console.error('Error synchronizing wallet:', error);
        }
    }

    // New method to setup periodic connection check
    _setupConnectionCheck() {
        // Check every 3 seconds if we need to synchronize wallet state
        setInterval(() => {
            const storedWalletId = sessionStorage.getItem('current_wallet_id') || localStorage.getItem('current_wallet_id');
            
            // If no wallet ID stored but we have a current wallet, disconnect
            if (!storedWalletId && this.currentWallet) {
                this.disconnectWallet();
                return;
            }
            
            // If wallet ID stored but no current wallet or different wallet, connect
            if (storedWalletId && (!this.currentWallet || this.currentWallet.address !== storedWalletId)) {
                if (this.wallets.has(storedWalletId)) {
                    // Silently reconnect without notification
                    this.currentWallet = this.wallets.get(storedWalletId);
                    this._broadcastWalletChange();
                }
            }
        }, 3000);
    }

    // Add a wallet connection listener
    addConnectionListener(listener) {
        if (typeof listener === 'function') {
            this.connectionListeners.push(listener);
            
            // If wallet is already connected, notify immediately
            if (this.currentWallet) {
                try {
                    listener(this.currentWallet);
                } catch (e) {
                    console.error('Error in wallet connection listener:', e);
                }
            }
        }
    }

    // Remove a wallet connection listener
    removeConnectionListener(listener) {
        this.connectionListeners = this.connectionListeners.filter(l => l !== listener);
    }

    /**
     * Check if a wallet is currently connected
     * @returns {boolean} - Whether a wallet is connected
     */
    isConnected() {
        return this.currentWallet !== null && this.currentWallet !== undefined;
    }

    /**
     * Synchronize wallet state with localStorage
     * This helps maintain wallet state across different pages
     */
    synchronizeWalletState() {
        try {
            // Check if we have a current wallet
            if (this.currentWallet) {
                // Save wallet to localStorage
                localStorage.setItem('current_wallet_address', this.currentWallet.address);
                
                // Dispatch wallet connected event
                const event = new CustomEvent('walletConnected', {
                    detail: {
                        wallet: this.currentWallet
                    }
                });
                window.dispatchEvent(event);
                
                console.log('Wallet state synchronized - wallet connected:', this.currentWallet.address);
            } else {
                // Check if we have a saved wallet address
                const savedAddress = localStorage.getItem('current_wallet_address');
                
                if (savedAddress) {
                    // Try to reconnect the wallet
                    const wallet = this.wallets.find(w => w.address === savedAddress);
                    
                    if (wallet) {
                        this.currentWallet = wallet;
                        
                        // Dispatch wallet connected event
                        const event = new CustomEvent('walletConnected', {
                            detail: {
                                wallet: this.currentWallet
                            }
                        });
                        window.dispatchEvent(event);
                        
                        console.log('Wallet reconnected from saved address:', savedAddress);
                    } else {
                        // Clear saved address if wallet not found
                        localStorage.removeItem('current_wallet_address');
                        console.log('Saved wallet address not found in wallets list:', savedAddress);
                    }
                } else {
                    console.log('No wallet connected and no saved address found');
                }
            }
        } catch (error) {
            console.error('Error synchronizing wallet state:', error);
        }
    }

    /**
     * Add xCIS tokens to the current wallet
     * @param {number} amount - Amount of xCIS to add
     * @returns {boolean} - Whether the operation was successful
     */
    addXCISToWallet(amount) {
        if (!this.currentWallet) {
            console.error('No wallet connected');
            return false;
        }
        
        try {
            // Ensure balance is properly structured
            if (!this.currentWallet.balance) {
                this.currentWallet.balance = { CIS: 0, xCIS: 0 };
            } else if (typeof this.currentWallet.balance === 'number') {
                // Convert from old format
                const cisBalance = this.currentWallet.balance;
                this.currentWallet.balance = { CIS: cisBalance, xCIS: 0 };
            }
            
            // Add xCIS to balance
            this.currentWallet.balance.xCIS += amount;
            
            // Save wallets
            this.saveWallets();
            
            // Dispatch balance updated event
            const event = new CustomEvent('walletBalanceUpdated', {
                detail: {
                    address: this.currentWallet.address,
                    token: 'xCIS',
                    balance: this.currentWallet.balance.xCIS
                }
            });
            window.dispatchEvent(event);
            
            return true;
        } catch (error) {
            console.error('Error adding xCIS to wallet:', error);
            return false;
        }
    }

    /**
     * Add tokens to a wallet by address
     * @param {string} address - Wallet address
     * @param {number} amount - Amount to add
     * @param {string} token - Token type (CIS or xCIS)
     * @returns {boolean} - Whether the operation was successful
     */
    addToWalletByAddress(address, amount, token = 'xCIS') {
        try {
            // Find wallet by address
            const wallet = this.wallets.find(w => w.address === address);
            
            if (!wallet) {
                console.error('Wallet not found:', address);
                return false;
            }
            
            // Ensure balance is properly structured
            if (!wallet.balance) {
                wallet.balance = { CIS: 0, xCIS: 0 };
            } else if (typeof wallet.balance === 'number') {
                // Convert from old format
                const cisBalance = wallet.balance;
                wallet.balance = { CIS: cisBalance, xCIS: 0 };
            }
            
            // Add tokens to balance
            if (token === 'CIS') {
                wallet.balance.CIS += amount;
            } else {
                wallet.balance.xCIS += amount;
            }
            
            // Save wallets
            this.saveWallets();
            
            // Dispatch balance updated event if this is the current wallet
            if (this.currentWallet && this.currentWallet.address === address) {
                const event = new CustomEvent('walletBalanceUpdated', {
                    detail: {
                        address: address,
                        token: token,
                        balance: token === 'CIS' ? wallet.balance.CIS : wallet.balance.xCIS
                    }
                });
                window.dispatchEvent(event);
            }
            
            return true;
        } catch (error) {
            console.error('Error adding tokens to wallet by address:', error);
            return false;
        }
    }

    // Add encryption helper methods
    async _encryptData(data, key, iv) {
        const encoded = new TextEncoder().encode(data);
        
        const encrypted = await crypto.subtle.encrypt(
            {
                name: this.ENCRYPTION_ALGORITHM,
                iv,
                tagLength: this.AUTH_TAG_LENGTH * 8
            },
            key,
            encoded
        );
        
        return Array.from(new Uint8Array(encrypted))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    async _decryptData(encryptedData, key, iv) {
        const encrypted = new Uint8Array(
            encryptedData.match(/.{2}/g).map(byte => parseInt(byte, 16))
        );
        
        const decrypted = await crypto.subtle.decrypt(
            {
                name: this.ENCRYPTION_ALGORITHM,
                iv,
                tagLength: this.AUTH_TAG_LENGTH * 8
            },
            key,
            encrypted
        );
        
        return new TextDecoder().decode(decrypted);
    }

    async _generateSecureSeedPhrase() {
        // Generate 256 bits of entropy
        const entropy = crypto.getRandomValues(new Uint8Array(32));
        
        // Calculate checksum
        const hash = await crypto.subtle.digest('SHA-256', entropy);
        const checksumBits = Array.from(new Uint8Array(hash))
            .map(b => b.toString(2).padStart(8, '0'))
            .join('')
            .slice(0, entropy.length / 32);
        
        // Combine entropy and checksum
        const bits = Array.from(entropy)
            .map(b => b.toString(2).padStart(8, '0'))
            .join('') + checksumBits;
        
        // Convert to word indices
        const words = [];
        for (let i = 0; i < bits.length; i += 11) {
            const index = parseInt(bits.slice(i, i + 11), 2);
            words.push(this.bip39Wordlist[index]);
        }
        
        return words.join(' ');
    }

    _validatePassword(password) {
        if (!password || password.length < this.PASSWORD_REQUIREMENTS.minLength) {
            throw new Error(`Password must be at least ${this.PASSWORD_REQUIREMENTS.minLength} characters long`);
        }
        
        if (this.PASSWORD_REQUIREMENTS.requireUppercase && !/[A-Z]/.test(password)) {
            throw new Error('Password must contain at least one uppercase letter');
        }
        
        if (this.PASSWORD_REQUIREMENTS.requireLowercase && !/[a-z]/.test(password)) {
            throw new Error('Password must contain at least one lowercase letter');
        }
        
        if (this.PASSWORD_REQUIREMENTS.requireNumbers && !/\d/.test(password)) {
            throw new Error('Password must contain at least one number');
        }
        
        if (this.PASSWORD_REQUIREMENTS.requireSpecial && !/[^A-Za-z0-9]/.test(password)) {
            throw new Error('Password must contain at least one special character');
        }
    }

    _validateSeedPhrase(seedPhrase) {
        const words = seedPhrase.trim().split(/\s+/);
        
        if (words.length !== 12 && words.length !== 24) {
            throw new Error('Seed phrase must be 12 or 24 words');
        }
        
        for (const word of words) {
            if (!this.bip39Wordlist.includes(word.toLowerCase())) {
                throw new Error(`Invalid word in seed phrase: ${word}`);
            }
        }
    }

    async _deriveKey(password, existingSalt = null) {
        const salt = existingSalt || crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
        const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
        
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );
        
        const key = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: this.ITERATIONS,
                hash: 'SHA-256'
            },
            keyMaterial,
            {
                name: 'AES-GCM',
                length: 256
            },
            true,
            ['encrypt', 'decrypt']
        );
        
        return { key, salt, iv };
    }

    async _deriveAddressFromSeed(seedPhrase) {
        // Implementation of _deriveAddressFromSeed method
        // This method should return a Uint8Array representing the derived address
        const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(seedPhrase));
        return new Uint8Array(hash.slice(0, 16));
    }

    async _setupBalanceSync(address) {
        // Clear existing sync timeout
        if (this.syncTimeouts.has(address)) {
            clearTimeout(this.syncTimeouts.get(address));
        }
        
        const syncBalance = async () => {
            try {
                if (!this.wallets.has(address)) return;
                
                const wallet = this.wallets.get(address);
                let retries = 0;
                let success = false;
                
                while (!success && retries < this.MAX_SYNC_RETRIES) {
                    try {
                        const balances = await this._fetchBalances(address);
                        wallet.balance = balances;
                        success = true;
                    } catch (error) {
                        retries++;
                        await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                    }
                }
                
                if (!success) {
                    this._handleError('Balance sync failed', new Error('Max retries exceeded'));
                }
                
                // Schedule next sync
                this.syncTimeouts.set(
                    address,
                    setTimeout(() => syncBalance(), this.SYNC_INTERVAL)
                );
                
                // Save updated state
                await this._save();
                
                // Broadcast update if this is the current wallet
                if (this.currentWallet && this.currentWallet.address === address) {
                    this._broadcastWalletChange();
                }
            } catch (error) {
                this._handleError('Balance sync error', error);
            }
        };
        
        // Start syncing
        await syncBalance();
    }

    async _fetchBalances(address) {
        if (!window.blockchain) {
            throw new Error('Blockchain connection not available');
        }
        
        const [cisBalance, xcisBalance] = await Promise.all([
            window.blockchain.getBalance(address, 'CIS'),
            window.blockchain.getBalance(address, 'xCIS')
        ]);
        
        return {
            CIS: cisBalance,
            xCIS: xcisBalance
        };
    }

    // Error handling
    _handleError(context, error) {
        console.error(context + ':', error);
        
        const errorEvent = new CustomEvent('walletError', {
            detail: {
                context,
                message: error.message,
                timestamp: Date.now()
            }
        });
        
        window.dispatchEvent(errorEvent);
        
        this.errorHandlers.forEach(handler => {
            try {
                handler(context, error);
            } catch (e) {
                console.error('Error in error handler:', e);
            }
        });
    }

    addErrorHandler(handler) {
        if (typeof handler === 'function') {
            this.errorHandlers.add(handler);
        }
    }

    removeErrorHandler(handler) {
        this.errorHandlers.delete(handler);
    }

    _setCurrentWalletId(walletId) {
        this.currentWalletId = walletId;
        localStorage.setItem('current_wallet_id', walletId);
        sessionStorage.setItem('current_wallet_id', walletId);
    }

    // Add initialize method to maintain backwards compatibility
    async initialize() {
        console.log('CISPWallet initialize called - redirecting to init');
        return this.init();
    }

    // Add getBalance method
    getBalance(currency = 'CIS') {
        if (!this.currentWallet) {
            console.error('No wallet is connected');
            return 0;
        }
        
        // Ensure the balance object exists
        if (!this.currentWallet.balance) {
            this.currentWallet.balance = { CIS: 0, xCIS: 0 };
        }
        
        // Handle case insensitive currency parameter
        const normalizedCurrency = currency.toUpperCase();
        if (normalizedCurrency === 'CIS' || normalizedCurrency === 'XCIS') {
            const key = normalizedCurrency === 'XCIS' ? 'xCIS' : 'CIS';
            return this.currentWallet.balance[key] || 0;
        } else {
            console.warn(`Unknown currency: ${currency}, returning 0`);
            return 0;
        }
    }
}

// Create global instance
window.cispWallet = new CISPWallet();

// Initialize the wallet system when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.cispWallet.init().then(success => {
        console.log('Wallet system initialization ' + (success ? 'successful' : 'failed'));
    });
});
