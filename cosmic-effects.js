/**
 * Cosmic Space Protocol - Visual Effects and Animations
 * This file contains the JavaScript code for creating cosmic particles, 
 * loading animations, and other visual effects for the application.
 */

// Add this at the top of the file after the initial comment block
let isInitialized = false;

// Wait for DOM and blockchain to be ready
async function initializeApp() {
    if (isInitialized) return;
    
    try {
        // Wait for blockchain and wallet to be available
        if (!window.cispChain || !window.cispWallet) {
            console.error('Blockchain or wallet system not found');
            showToast('Error: System not initialized', 'error');
            return;
        }

        // Initialize blockchain
        await window.cispChain.init();
        console.log('Blockchain initialized successfully');
        
        // Set initialization flag
        isInitialized = true;

        // Create visual effects
        createCosmicParticles();
        showLoadingAnimation();
        
        // Initialize event listeners
        initializeEventListeners();
        
        // Update UI with current wallet state
        const currentWallet = window.cispWallet.getCurrentWallet();
        if (currentWallet) {
            updateAllPages({
                isConnected: true,
                ...currentWallet
            });
        }
        
        // Initialize blockchain listeners
        initializeBlockchainListeners();
        
        console.log('App initialization completed');
    } catch (error) {
        console.error('Error initializing app:', error);
        showToast('Error initializing application', 'error');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Listen for wallet creation events
    window.addEventListener('walletCreated', (event) => {
        console.log('Wallet created event received:', event.detail);
        handleWalletCreation(event.detail);
    });
    
    // Listen for wallet changes
    window.addEventListener('walletChanged', (event) => {
        console.log('Wallet changed event received:', event.detail);
        const newState = event.detail;
        if (newState) {
            updateAllPages({
                isConnected: true,
                ...newState
            });
        } else {
            updateAllPages({
                isConnected: false,
                address: '',
                balances: { xCIS: 0, CIS: 0 }
            });
        }
    });
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}

/**
 * Creates cosmic particle effects in the background
 */
function createCosmicParticles() {
    const container = document.querySelector('.cosmic-particles');
    if (!container) return;
    
    // Create stars
    for (let i = 0; i < 100; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.animationDelay = `${Math.random() * 3}s`;
        container.appendChild(star);
    }
}

/**
 * Shows loading animation overlay when page loads
 */
function showLoadingAnimation() {
    // Check if loading overlay already exists
    if (document.querySelector('.loading-overlay')) return;
    
    const loadingOverlay = document.createElement('div');
    loadingOverlay.className = 'loading-overlay';
    loadingOverlay.innerHTML = '<div class="loading-spinner"></div>';
    document.body.appendChild(loadingOverlay);
    
    // Remove loading animation after content loads
    setTimeout(() => {
        loadingOverlay.style.opacity = '0';
        setTimeout(() => {
            if (document.body.contains(loadingOverlay)) {
                document.body.removeChild(loadingOverlay);
            }
        }, 500);
    }, 1500);
}

/**
 * Creates a floating glow effect around an element
 * @param {HTMLElement} element - The element to apply the effect to
 * @param {string} color - The color of the glow (hex or rgba)
 */
function createGlowEffect(element, color = 'rgba(0, 198, 255, 0.5)') {
    if (!element) return;
    
    const glow = document.createElement('div');
    glow.className = 'glow-effect';
    glow.style.position = 'absolute';
    glow.style.top = '-20px';
    glow.style.left = '-20px';
    glow.style.right = '-20px';
    glow.style.bottom = '-20px';
    glow.style.borderRadius = '50%';
    glow.style.background = `radial-gradient(circle, ${color} 0%, rgba(0, 0, 0, 0) 70%)`;
    glow.style.zIndex = '-1';
    glow.style.animation = 'pulse 2s infinite';
    
    element.style.position = 'relative';
    element.appendChild(glow);
}

/**
 * Creates hovering card effect
 * @param {string} selector - CSS selector for the cards to apply the effect to
 */
function enableHoverEffect(selector) {
    const element = document.querySelector(selector);
    if (!element) return;
    
    element.addEventListener('mousemove', (e) => {
        const rect = element.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        element.style.setProperty('--mouse-x', `${x}px`);
        element.style.setProperty('--mouse-y', `${y}px`);
    });
}

/**
 * Adds a notification toast message
 * @param {string} message - The message to display
 * @param {string} type - The type of toast (success, error, info)
 */
function showToast(message, type = 'info') {
    // Create toast element if it doesn't exist
    let toast = document.querySelector('.toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    // Set message and type
    toast.textContent = message;
    toast.className = `toast ${type}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Update the server health check function to be optional and handle CORS properly
async function checkServerStatus() {
    try {
        // Check if the server URL is configured
        const serverUrl = window.SERVER_URL || localStorage.getItem('server_url') || null;
        
        // If no server URL, consider it a local development environment
        if (!serverUrl) {
            console.log('No server URL configured, assuming local development environment');
            return true; // Return true to indicate "connected" for local development
        }
        
        // Add a timestamp to prevent caching
        const url = `${serverUrl}/health?t=${Date.now()}`;
        
        // Use fetch with mode: 'no-cors' to avoid CORS issues, but we won't get a meaningful response
        const response = await fetch(url, { 
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache'
        });
        
        // Since mode is 'no-cors', we won't be able to check the status
        // But if we get here without an error, connection was made
        return true;
    } catch (error) {
        // Only log the error if it's not a CORS issue
        if (!error.message.includes('CORS')) {
            console.warn('Server connection failed:', error);
        } else {
            console.log('CORS policy prevented direct API access, but connection attempt was made');
            return true; // Consider this a success for local development
        }
        return false;
    }
}

// Modified version of updateServerStatus to handle connection errors gracefully
function updateServerStatus() {
    // Check if we should skip server checks (for local development)
    const skipServerChecks = localStorage.getItem('skip_server_checks') === 'true';
    
    if (skipServerChecks) {
        console.log('Server health checks are disabled');
        // Consider it connected for local development
        if (window.onServerConnected && typeof window.onServerConnected === 'function') {
            window.onServerConnected();
        }
        return;
    }
    
    // Periodically check server status
    setInterval(async () => {
        try {
            const isConnected = await checkServerStatus();
            
            if (isConnected) {
                if (window.onServerConnected && typeof window.onServerConnected === 'function') {
                    window.onServerConnected();
                }
            } else {
                console.log('Server connection lost, will retry automatically');
                if (window.onServerDisconnected && typeof window.onServerDisconnected === 'function') {
                    window.onServerDisconnected();
                }
            }
        } catch (error) {
            console.warn('Error checking server status:', error);
        }
    }, 60000); // Check every minute instead of more frequently
    
    // Initial check
    checkServerStatus().then(isConnected => {
        if (isConnected) {
            console.log('Connected to server');
            if (window.onServerConnected && typeof window.onServerConnected === 'function') {
                window.onServerConnected();
            }
        } else {
            console.log('Not connected to server, local mode enabled');
            if (window.onServerDisconnected && typeof window.onServerDisconnected === 'function') {
                window.onServerDisconnected();
            }
        }
    }).catch(error => {
        console.warn('Failed to check server status:', error);
    });
}

// Initialize with server checks disabled for local development
document.addEventListener('DOMContentLoaded', () => {
    // Set flag to skip server checks for local development
    localStorage.setItem('skip_server_checks', 'true');
    updateServerStatus();
});

// Handle wallet changes without recursion
let lastWalletState = null;

function updateWalletDisplay(walletState) {
    // Update wallet display elements
    const walletElements = document.querySelectorAll('[data-wallet-display]');
    walletElements.forEach(element => {
        const displayType = element.dataset.walletDisplay;
        switch (displayType) {
            case 'address':
                element.textContent = walletState.address || 'Not Connected';
                break;
            case 'xCIS':
                element.textContent = walletState.balances?.xCIS || '0';
                break;
            case 'CIS':
                element.textContent = walletState.balances?.CIS || '0';
                break;
        }
    });
}

function updatePageSpecificElements(walletState) {
    // Update wallet info elements
    const walletInfoElements = document.querySelectorAll('.wallet-info');
    walletInfoElements.forEach(element => {
        if (walletState.isConnected) {
            element.innerHTML = `
                <div class="wallet-address">
                    <span class="label">Address:</span>
                    <span class="value">${formatAddress(walletState.address)}</span>
                </div>
                <div class="wallet-balance">
                    <span class="label">xCIS Balance:</span>
                    <span class="value">${walletState.balances?.xCIS || 0}</span>
                </div>
                <div class="wallet-balance">
                    <span class="label">CIS Balance:</span>
                    <span class="value">${walletState.balances?.CIS || 0}</span>
                </div>
            `;
            element.style.display = 'block';
        } else {
            element.innerHTML = '<div>No wallet connected</div>';
            element.style.display = 'none';
        }
    });
    
    // Update connect wallet buttons
    const connectButtons = document.querySelectorAll('.connect-wallet-btn');
    connectButtons.forEach(button => {
        if (walletState.isConnected) {
            button.textContent = 'Disconnect Wallet';
            button.onclick = () => window.cispWallet.disconnectWallet();
        } else {
            button.textContent = 'Connect Wallet';
            button.onclick = () => window.cispWallet.connectWallet();
        }
    });
    
    // Update navigation elements
    const navElements = document.querySelectorAll('[data-requires-wallet]');
    navElements.forEach(element => {
        element.style.display = walletState.isConnected ? 'block' : 'none';
    });
}

function formatAddress(address) {
    if (!address) return 'Not Connected';
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

function showWelcomeMessage(walletState) {
    const welcomeMessage = `
        Welcome to Cosmic Space Protocol!
        Your wallet (${formatAddress(walletState.address)}) has been created successfully.
        You've received:
        - 100 xCIS tokens
        - A welcome NFT
        
        Start your cosmic journey by exploring the available features!
    `;
    
    showToast(welcomeMessage, 'success', 10000);
}

// Expose functions globally
window.createCosmicParticles = createCosmicParticles;
window.showLoadingAnimation = showLoadingAnimation;
window.createGlowEffect = createGlowEffect;
window.enableHoverEffect = enableHoverEffect;
window.showToast = showToast;

// Add cosmic styles
const cosmicStyles = document.createElement('style');
cosmicStyles.textContent = `
    .cosmic-particles {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: -1;
        overflow: hidden;
    }
    
    .star {
        position: absolute;
        width: 2px;
        height: 2px;
        background: white;
        border-radius: 50%;
        animation: twinkle 3s infinite;
    }
    
    @keyframes twinkle {
        0%, 100% { opacity: 0.2; transform: scale(1); }
        50% { opacity: 1; transform: scale(1.5); }
    }
    
    .visa-container {
        position: relative;
        width: 300px;
        height: 180px;
        background: linear-gradient(45deg, #000428, #004e92);
        border-radius: 15px;
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
    }
    
    .visa-container::before {
        content: '';
        position: absolute;
        top: var(--mouse-y, 0);
        left: var(--mouse-x, 0);
        width: 100px;
        height: 100px;
        background: radial-gradient(circle, rgba(255,255,255,0.2) 0%, transparent 70%);
        transform: translate(-50%, -50%);
        pointer-events: none;
    }
    
    .visa-container:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 20px rgba(0, 114, 255, 0.3);
    }
`;

document.head.appendChild(cosmicStyles);

// Initialize event listeners for blockchain state changes
function initializeBlockchainListeners() {
    // Listen for general blockchain state changes
    window.addEventListener('blockchainStateChanged', (event) => {
        console.log('Blockchain state changed:', event.detail.type);
        updateUIForAllPages();
    });

    // Listen for token conversion events
    window.addEventListener('tokenConversion', (event) => {
        console.log('Token conversion occurred:', event.detail.type);
        const { address, type, amountConverted, amountReceived, newXCISBalance, newCISBalance } = event.detail;
        
        // Update balances display
        updateWalletDisplay({
            address: address,
            balances: {
                xCIS: newXCISBalance,
                CIS: newCISBalance
            }
        });

        // Show conversion notification
        showNotification(
            'Conversion Successful',
            `Converted ${amountConverted} ${type === 'XCIS_TO_CIS' ? 'xCIS to CIS' : 'CIS to xCIS'}`
        );
    });

    // Listen for mining reward events
    window.addEventListener('miningReward', (event) => {
        console.log('Mining reward received:', event.detail);
        const { address, reward, newBalance, difficulty } = event.detail;
        
        // Update miner's balance display
        updateWalletDisplay({
            address: address,
            balances: {
                xCIS: newBalance
            }
        });

        // Update mining stats if on mining page
        if (document.getElementById('mining-stats')) {
            updateMiningStats({
                reward: reward,
                difficulty: difficulty,
                balance: newBalance
            });
        }

        // Show mining reward notification
        showNotification(
            'Mining Reward',
            `Earned ${reward.toFixed(8)} xCIS from mining!`
        );
    });

    // Listen for NFT minting events
    window.addEventListener('nftMinted', (event) => {
        console.log('NFT minted:', event.detail);
        const { address, nft, price, newBalance } = event.detail;
        
        // Update wallet display
        updateWalletDisplay({
            address: address,
            balances: {
                xCIS: newBalance
            }
        });

        // Update NFT collection display if on NFT page
        if (document.getElementById('nft-collection')) {
            updateNFTCollection(address);
        }

        // Show NFT minting notification
        showNotification(
            'NFT Minted Successfully',
            `Minted a ${nft.rarity} ${nft.type} NFT for ${price} xCIS!`
        );
    });
}

// Function to show notifications
function showNotification(title, message) {
    // Check if the browser supports notifications
    if (!("Notification" in window)) {
        console.log("This browser does not support notifications");
        return;
    }

    // Check if we have permission to show notifications
    if (Notification.permission === "granted") {
        new Notification(title, { body: message });
    } else if (Notification.permission !== "denied") {
        // Request permission
        Notification.requestPermission().then(permission => {
            if (permission === "granted") {
                new Notification(title, { body: message });
            }
        });
    }
}

// Function to update mining stats display
function updateMiningStats(stats) {
    const miningStatsElement = document.getElementById('mining-stats');
    if (miningStatsElement) {
        miningStatsElement.innerHTML = `
            <div class="stat">
                <span class="label">Last Reward:</span>
                <span class="value">${stats.reward.toFixed(8)} xCIS</span>
            </div>
            <div class="stat">
                <span class="label">Current Difficulty:</span>
                <span class="value">${stats.difficulty}</span>
            </div>
            <div class="stat">
                <span class="label">Balance:</span>
                <span class="value">${stats.balance.toFixed(8)} xCIS</span>
            </div>
        `;
    }
}

// Function to update NFT collection display
function updateNFTCollection(address) {
    if (!window.cispChain) {
        console.error('Blockchain not initialized');
        return;
    }

    const nftCollection = document.getElementById('nft-collection');
    if (!nftCollection) return;

    try {
        const nfts = window.cispChain.getNFTsOfAddress(address);
        if (!nfts || nfts.length === 0) {
            nftCollection.innerHTML = '<p>No NFTs in collection</p>';
            return;
        }

        nftCollection.innerHTML = nfts.map(nft => `
            <div class="nft-card ${nft.rarity.toLowerCase()}">
                <img src="${nft.imagePath}" alt="${nft.name}" onerror="this.src='nft-images/placeholder.png'">
                <div class="nft-info">
                    <h3>${nft.name}</h3>
                    <p class="rarity ${nft.rarity.toLowerCase()}">${nft.rarity}</p>
                    <p class="description">${nft.description}</p>
                    <p class="mint-price">Minted for ${nft.mintPrice || 0} xCIS</p>
                    <p class="mint-date">Minted on ${new Date(nft.mintedAt).toLocaleDateString()}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error updating NFT collection:', error);
        nftCollection.innerHTML = '<p>Error loading NFTs</p>';
    }
}

// Function to update all UI elements
function updateUIForAllPages() {
    if (!window.cispChain || !window.cispWallet) {
        console.error('System not initialized');
        return;
    }

    const currentWallet = window.cispWallet.getCurrentWallet();
    if (!currentWallet) {
        // Handle no wallet state
        updateWalletDisplay({
            isConnected: false,
            address: '',
            balances: { xCIS: 0, CIS: 0 }
        });
        return;
    }

    try {
        const address = currentWallet.address;
        const xCISBalance = window.cispChain.getBalanceXCIS(address);
        const CISBalance = window.cispChain.getBalanceCIS(address);

        updateWalletDisplay({
            isConnected: true,
            address: address,
            balances: {
                xCIS: xCISBalance,
                CIS: CISBalance
            }
        });

        // Update NFT collection if on NFT page
        if (document.getElementById('nft-collection')) {
            updateNFTCollection(address);
        }

        // Update mining stats if on mining page
        if (document.getElementById('mining-stats')) {
            const stats = window.cispChain.getMiningStats(address);
            updateMiningStats(stats);
        }
    } catch (error) {
        console.error('Error updating UI:', error);
        showToast('Error updating interface', 'error');
    }
}

// Handle wallet creation success
async function handleWalletCreation(walletData) {
    console.log('Handling wallet creation:', walletData);
    
    if (!walletData.success) {
        showToast(walletData.error || 'Failed to create wallet', 'error');
        return;
    }
    
    const { address, name, seedPhrase, nft, balance } = walletData;
    
    // Show seed phrase modal first
    await showSeedPhraseModal(name, seedPhrase);
    
    // Update wallet state
    const walletState = {
        isConnected: true,
        address: address,
        name: name,
        balances: balance
    };
    
    // Broadcast wallet state to update UI across pages
    broadcastWalletState(walletState);
    
    // Show welcome message with NFT details
    const welcomeMessage = `
        Welcome to Cosmic Space Protocol!
        Your wallet "${name}" has been created successfully.
        
        You've received:
        - ${balance.xCIS} xCIS tokens
        - A ${nft.rarity} ${nft.type} NFT
        
        Make sure to save your seed phrase securely!
    `;
    
    showToast(welcomeMessage, 'success', 10000);
}

// Show seed phrase modal with improved styling
function showSeedPhraseModal(walletName, seedPhrase) {
    return new Promise((resolve) => {
        // Remove any existing modals
        const existingModal = document.querySelector('.seed-phrase-modal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.className = 'modal seed-phrase-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 9999;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="
                background: #1a1a2e;
                padding: 2rem;
                border-radius: 10px;
                max-width: 500px;
                width: 90%;
                color: white;
                text-align: center;
                box-shadow: 0 0 20px rgba(0, 198, 255, 0.3);
            ">
                <h2>Important: Save Your Seed Phrase</h2>
                <p class="wallet-name">Wallet Name: ${walletName}</p>
                <div class="seed-phrase-container" style="
                    background: rgba(0, 0, 0, 0.3);
                    padding: 1rem;
                    border-radius: 8px;
                    margin: 1rem 0;
                ">
                    <p class="seed-phrase" style="
                        word-break: break-all;
                        font-family: monospace;
                        font-size: 1.1em;
                    ">${seedPhrase}</p>
                    <button onclick="copySeedPhrase('${seedPhrase}')" class="copy-btn" style="
                        background: #0066cc;
                        color: white;
                        border: none;
                        padding: 0.5rem 1rem;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 1rem;
                    ">
                        <i class="fas fa-copy"></i> Copy
                    </button>
                </div>
                <div class="warning" style="
                    color: #ff3366;
                    margin: 1rem 0;
                    font-weight: bold;
                ">
                    ⚠️ WARNING: Never share your seed phrase with anyone!
                    Store it securely offline. You will need it to recover your wallet.
                </div>
                <label class="checkbox-container" style="
                    display: block;
                    margin: 1rem 0;
                ">
                    <input type="checkbox" id="seedPhraseConfirm" onchange="toggleConfirmButton()">
                    <span>I confirm that I have saved my seed phrase securely</span>
                </label>
                <button onclick="acknowledgeSeedPhrase()" id="confirmButton" class="primary-btn" disabled style="
                    background: #00cc66;
                    color: white;
                    border: none;
                    padding: 1rem 2rem;
                    border-radius: 4px;
                    cursor: pointer;
                    opacity: 0.5;
                ">
                    Continue
                </button>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add function to toggle confirm button
        window.toggleConfirmButton = function() {
            const checkbox = document.getElementById('seedPhraseConfirm');
            const button = document.getElementById('confirmButton');
            if (checkbox && button) {
                button.disabled = !checkbox.checked;
                button.style.opacity = checkbox.checked ? '1' : '0.5';
            }
        };
        
        // Handle acknowledgment and redirection
        window.acknowledgeSeedPhrase = function() {
            const modal = document.querySelector('.seed-phrase-modal');
            if (modal) {
                modal.remove();
                // Redirect to home page after modal is closed
                setTimeout(() => {
                    window.location.href = '/';
                }, 1000);
                resolve();
            }
        };
    });
}

// Copy seed phrase to clipboard with feedback
window.copySeedPhrase = function(seedPhrase) {
    navigator.clipboard.writeText(seedPhrase)
        .then(() => {
            showToast('Seed phrase copied to clipboard', 'info');
        })
        .catch((error) => {
            console.error('Failed to copy:', error);
            showToast('Failed to copy seed phrase', 'error');
        });
};

// Broadcast wallet state changes
function broadcastWalletState(walletState) {
    console.log('Broadcasting wallet state:', walletState);
    
    // Store wallet state in localStorage
    if (walletState.isConnected) {
        localStorage.setItem('walletState', JSON.stringify(walletState));
    } else {
        localStorage.removeItem('walletState');
    }
    
    // Dispatch wallet changed event
    const event = new CustomEvent('walletChanged', {
        detail: walletState
    });
    window.dispatchEvent(event);
    
    // Update UI elements
    updateUIForAllPages();
}

// Check wallet state on page load
function checkWalletState() {
    const savedState = localStorage.getItem('walletState');
    if (savedState) {
        const walletState = JSON.parse(savedState);
        broadcastWalletState(walletState);
    }
}

// Function to update all pages with new wallet state
function updateAllPages(walletState) {
    console.log('Updating all pages with state:', walletState);
    
    if (!walletState) return;
    
    // Update wallet display
    updateWalletDisplay(walletState);
    
    // Update page specific elements
    updatePageSpecificElements(walletState);
    
    // Update NFT collection if on NFT page
    if (document.getElementById('nft-collection')) {
        updateNFTCollection(walletState.address);
    }
    
    // Update mining stats if on mining page
    if (document.getElementById('mining-stats')) {
        const stats = window.cispChain?.getMiningStats(walletState.address);
        if (stats) {
            updateMiningStats(stats);
        }
    }
    
    // Store state in localStorage
    if (walletState.isConnected) {
        localStorage.setItem('walletState', JSON.stringify(walletState));
    } else {
        localStorage.removeItem('walletState');
    }
} 