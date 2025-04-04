// walletConnect.js - Enhanced version

// Global wallet state
let currentWalletAddress = null;
let isWalletConnected = false;
let chainId = null;

// Web3 event listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeWalletListeners();
    checkPreviousConnection();
    updateUIForAllPages();
});

// Initialize wallet event listeners
function initializeWalletListeners() {
    // Removed external wallet connection handling as users will create their own wallets
}

// Check for previous connection
async function checkPreviousConnection() {
    if (typeof window.ethereum !== 'undefined') {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            if (accounts.length > 0) {
                currentWalletAddress = accounts[0];
                isWalletConnected = true;
                chainId = await window.ethereum.request({ method: 'eth_chainId' });
                updateUIForAllPages();
            }
        } catch (error) {
            console.error('Error checking existing connection:', error);
        }
    }
}

// Function to check if a crypto wallet is available
function isWalletAvailable() {
    const walletAvailable = typeof window.ethereum !== 'undefined';
    if (!walletAvailable) {
        showToast('No Web3 wallet detected. Please install MetaMask or another compatible wallet. Make sure to refresh the page after installation.', 'error');
    }
    return walletAvailable;
}

// Function to connect to the user's wallet
async function connectWallet() {
    if (!isWalletAvailable()) {
        showModal('Wallet Required', 
            `<p>MetaMask or another crypto wallet is not installed.</p>
            <p>To interact with the Cosmic Space Protocol, please install a Web3 wallet like MetaMask.</p>
            <a href="https://metamask.io/download.html" target="_blank" class="wallet-install-btn">Install MetaMask</a>`
        );
        return null;
    }

    try {
        // Show connecting animation
        showConnectingAnimation();
        
        // Request wallet connection
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        currentWalletAddress = accounts[0];
        isWalletConnected = true;
        
        // Get chain ID
        chainId = await window.ethereum.request({ method: 'eth_chainId' });
        
        // Hide connecting animation
        hideConnectingAnimation();

        // Check local storage for existing data
        let userData = JSON.parse(localStorage.getItem('xCIS_Users')) || {};
        
        if (!userData[currentWalletAddress]) {
            // If user is new, grant 100 xCIS coins as welcome bonus
            userData[currentWalletAddress] = { 
                balance: 100,
                cis: 0,
                mined: 0,
                miningPower: 1,
                staked: 0,
                lastLogin: Date.now(),
                transactions: [{
                    type: 'Welcome Bonus',
                    amount: 100,
                    timestamp: Date.now()
                }]
            };
            
            showToast('Welcome to Cosmic Space Protocol! You received 100 xCIS coins as welcome bonus.', 'success');
        } else {
            // Apply daily login bonus if not claimed today
            const lastLogin = userData[currentWalletAddress].lastLogin || 0;
            const now = Date.now();
            const oneDayMs = 24 * 60 * 60 * 1000;
            
            if ((now - lastLogin) > oneDayMs) {
                const dailyBonus = 10;
                userData[currentWalletAddress].balance += dailyBonus;
                userData[currentWalletAddress].lastLogin = now;
                
                // Record transaction
                if (!userData[currentWalletAddress].transactions) {
                    userData[currentWalletAddress].transactions = [];
                }
                
                userData[currentWalletAddress].transactions.push({
                    type: 'Daily Login',
                    amount: dailyBonus,
                    timestamp: now
                });
                
                showToast(`Welcome back! You received ${dailyBonus} xCIS daily login bonus.`, 'success');
            } else {
                showToast(`Connected to ${formatAddress(currentWalletAddress)}`, 'success');
            }
        }

        // Save user data to local storage
        localStorage.setItem('xCIS_Users', JSON.stringify(userData));

        // Update UI elements across all pages
        updateUIForAllPages();
        
        return currentWalletAddress;
    } catch (error) {
        hideConnectingAnimation();
        
        // Handle specific errors
        if (error.code === 4001) {
            // User rejected request
            showToast('Connection request rejected. Please approve the connection request or try again later.', 'error');
        } else {
        console.error('Error connecting wallet:', error);
            showToast('Failed to connect wallet. Please check your wallet extension and try again.', 'error');
        }
        
        return null;
    }
}

// Handle wallet disconnect
function handleDisconnect() {
    currentWalletAddress = null;
    isWalletConnected = false;
    updateUIForAllPages();
    showToast('Wallet disconnected', 'info');
}

// Update all UI elements based on wallet connection
function updateUIForAllPages() {
    // Update wallet connect buttons
    const walletButtons = document.querySelectorAll('.wallet-connect');
    if (walletButtons.length === 0) return; // Early exit if no buttons found
    walletButtons.forEach(button => {
        if (isWalletConnected) {
            button.innerHTML = `<i class="fas fa-wallet"></i> ${formatAddress(currentWalletAddress)}`;
            button.classList.add('connected');
        } else {
            button.innerHTML = `<i class="fas fa-wallet"></i> Connect Wallet`;
            button.classList.remove('connected');
        }
    });
    
    // Update balance displays if they exist
    const balanceDisplays = document.querySelectorAll('.balance-section');
    if (balanceDisplays.length === 0) return; // Early exit if no balance displays found
    if (balanceDisplays.length > 0 && isWalletConnected) {
        const userData = getUserData(currentWalletAddress);
        
        balanceDisplays.forEach(section => {
            const xCISElement = section.querySelector('p:nth-child(2)');
            const CISElement = section.querySelector('p:nth-child(3)');
            
            if (xCISElement) xCISElement.innerHTML = `xCIS: <span class="highlight">${userData.balance.toFixed(2)}</span>`;
            if (CISElement) CISElement.innerHTML = `CIS: <span class="highlight">${userData.cis.toFixed(2)}</span>`;
        });
    }
    
    // Update mining status if on mining page
    const miningStatus = document.getElementById('mining-status');
    if (miningStatus && isWalletConnected) {
        const userData = getUserData(currentWalletAddress);
        updateMiningUI(userData);
    }
}

// Function to get user data from localStorage
function getUserData(walletAddress = currentWalletAddress) {
    if (!walletAddress) return { balance: 0, cis: 0, mined: 0, miningPower: 1, staked: 0 };
    
    const userData = JSON.parse(localStorage.getItem('xCIS_Users')) || {};
    return userData[walletAddress] || { balance: 0, cis: 0, mined: 0, miningPower: 1, staked: 0 };
}

// Function to update user data
function updateUserData(data, walletAddress = currentWalletAddress) {
    if (!walletAddress) return false;
    
    const userData = JSON.parse(localStorage.getItem('xCIS_Users')) || {};
    
    if (!userData[walletAddress]) {
        userData[walletAddress] = { 
            balance: 0, 
            cis: 0, 
            mined: 0, 
            miningPower: 1, 
            staked: 0,
            transactions: []
        };
    }
    
    // Update the user data with new values
    Object.assign(userData[walletAddress], data);
    
    // Save updated data
    localStorage.setItem('xCIS_Users', JSON.stringify(userData));
    
    // Update UI
    updateUIForAllPages();
    
    return true;
}

// Function to get user balance
function getUserBalance(walletAddress = currentWalletAddress) {
    const userData = getUserData(walletAddress);
    return userData.balance || 0;
}

// Function to stake coins
function stakeCoins(amount, duration) {
    if (!isWalletConnected) {
        showToast('Please connect your wallet first', 'error');
        return false;
    }
    
    if (isNaN(amount) || amount <= 0 || amount > userData.balance) {
        showToast('Please enter a valid amount', 'error');
        return false;
    }

    const userData = getUserData();
    
    if (userData.balance < amount) {
        showToast('Insufficient balance to stake', 'error');
        return false;
    }

    // Calculate APY based on duration
    const rewardRate = calculateRewardRate(duration);
    const maturityDate = new Date(Date.now() + (duration * 24 * 60 * 60 * 1000));
    
    // Create stake record
    const stakeRecord = {
        amount: amount,
        duration: duration,
        startDate: Date.now(),
        maturityDate: maturityDate.getTime(),
        rewardRate: rewardRate,
        claimed: false
    };
    
    // Update user data
    const newUserData = {
        balance: userData.balance - amount,
        staked: (userData.staked || 0) + amount
    };
    
    if (!userData.stakes) userData.stakes = [];
    userData.stakes.push(stakeRecord);
    
    // Record transaction
    if (!userData.transactions) userData.transactions = [];
    userData.transactions.push({
        type: 'Stake',
        amount: amount,
        timestamp: Date.now(),
        details: `Staked ${amount} xCIS for ${duration} days at ${rewardRate}% APY`
    });
    
    // Save updated data
    updateUserData(newUserData);
    
    showToast(`Successfully staked ${amount} xCIS for ${duration} days`, 'success');
    
    // Animate staking effect
    animateTransaction('stake', amount);
    
    return true;
}

// Calculate reward rate based on staking duration
function calculateRewardRate(days) {
    // Base APY is 15%
    const baseAPY = 15;
    
    // Add 5% for each 30 days
    const bonusAPY = Math.floor(days / 30) * 5;
    
    return baseAPY + bonusAPY;
}

// Function to convert xCIS to CIS
function convertToCIS(amount) {
    if (!isWalletConnected) {
        showToast('Please connect your wallet first', 'error');
        return false;
    }

    if (isNaN(amount) || amount <= 0 || amount > userData.balance) {
        showToast('Please enter a valid amount', 'error');
        return false;
    }

    const userData = getUserData();
    
    if (userData.balance < amount) {
        showToast('Insufficient xCIS balance', 'error');
        return false;
    }

    // Conversion rate: 1 xCIS = 0.1 CIS
    const conversionRate = 0.1;
    const cisAmount = amount * conversionRate;
    
    // Update balances
    const newUserData = {
        balance: userData.balance - amount,
        cis: (userData.cis || 0) + cisAmount
    };
    
    // Record transaction
    if (!userData.transactions) userData.transactions = [];
    userData.transactions.push({
        type: 'Convert',
        amount: amount,
        timestamp: Date.now(),
        details: `Converted ${amount} xCIS to ${cisAmount} CIS`
    });
    
    // Save updated data
    updateUserData(newUserData);
    
    showToast(`Successfully converted ${amount} xCIS to ${cisAmount} CIS`, 'success');
    
    // Animate conversion effect
    animateTransaction('convert', amount);
    
    return true;
}

// Helper to format wallet address
function formatAddress(address) {
    if (!address) return '';
    return address.substring(0, 6) + '...' + address.substring(address.length - 4);
}

// Show connecting animation
function showConnectingAnimation() {
    // Check if the animation element already exists
    if (document.getElementById('connecting-animation')) return;
    
    const animation = document.createElement('div');
    animation.id = 'connecting-animation';
    animation.innerHTML = `
        <div class="connecting-spinner"></div>
        <p>Connecting to Wallet...</p>
    `;
    
    document.body.appendChild(animation);
    
    // Add styles if not already added
    if (!document.getElementById('wallet-animation-styles')) {
        const style = document.createElement('style');
        style.id = 'wallet-animation-styles';
        style.textContent = `
            #connecting-animation {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 9999;
                color: white;
                font-family: Arial, sans-serif;
            }
            .connecting-spinner {
                width: 50px;
                height: 50px;
                border: 5px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: #fff;
                animation: spin 1s ease-in-out infinite;
                margin-bottom: 20px;
            }
            @keyframes spin {
                to { transform: rotate(360deg); }
            }
            .wallet-animation {
                position: fixed;
                z-index: 9999;
                pointer-events: none;
                animation: flyAnimation 1.5s forwards ease-out;
            }
            @keyframes flyAnimation {
                0% { transform: translate(0, 0) scale(1); opacity: 1; }
                100% { transform: translate(0, -100px) scale(0.5); opacity: 0; }
            }
            .toast {
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 12px 20px;
                border-radius: 5px;
                color: white;
                font-family: Arial, sans-serif;
                z-index: 9999;
                animation: fadeInOut 4s forwards;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            .toast.success { background-color: #2ecc71; }
            .toast.error { background-color: #e74c3c; }
            .toast.info { background-color: #3498db; }
            @keyframes fadeInOut {
                0% { opacity: 0; transform: translateY(-20px); }
                10% { opacity: 1; transform: translateY(0); }
                90% { opacity: 1; transform: translateY(0); }
                100% { opacity: 0; transform: translateY(-20px); }
            }
            .wallet-install-btn {
                display: inline-block;
                background: linear-gradient(135deg, #0072ff, #00c6ff);
                color: white;
                text-decoration: none;
                padding: 10px 20px;
                border-radius: 5px;
                margin-top: 15px;
                font-weight: bold;
                transition: all 0.3s ease;
            }
            .wallet-install-btn:hover {
                transform: translateY(-3px);
                box-shadow: 0 5px 15px rgba(0, 114, 255, 0.4);
            }
            .modal {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            }
            .modal-content {
                background: #1e1e2f;
                padding: 30px;
                border-radius: 10px;
                max-width: 500px;
                text-align: center;
                color: white;
                box-shadow: 0 5px 30px rgba(0, 0, 0, 0.3);
            }
            .modal-title {
                font-size: 24px;
                margin-bottom: 15px;
                color: #00c6ff;
            }
            .modal-close {
                position: absolute;
                top: 10px;
                right: 10px;
                background: none;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
    }
}

// Hide connecting animation
function hideConnectingAnimation() {
    const animation = document.getElementById('connecting-animation');
    if (animation) {
        animation.remove();
    }
}

// Show toast notification
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 4000);
}

// Show modal
function showModal(title, content) {
    // Remove any existing modals
    const existingModal = document.querySelector('.modal');
    if (existingModal) existingModal.remove();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <button class="modal-close">&times;</button>
            <h3 class="modal-title">${title}</h3>
            <div class="modal-body">${content}</div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listener to close button
    modal.querySelector('.modal-close').addEventListener('click', () => {
        modal.remove();
    });
    
    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// Animate transaction effect
function animateTransaction(type, amount) {
    const walletBtn = document.querySelector('.wallet-connect');
    if (!walletBtn) return;
    
    // Get position of wallet button
    const walletRect = walletBtn.getBoundingClientRect();
    
    // Create animation element
    const animation = document.createElement('div');
    animation.className = 'wallet-animation';
    animation.style.top = `${walletRect.top + walletRect.height / 2}px`;
    animation.style.left = `${walletRect.left + walletRect.width / 2}px`;
    
    // Set animation content based on type
    if (type === 'stake') {
        animation.innerHTML = `<div style="color: #ff7eb3; font-weight: bold;">-${amount} xCIS</div>`;
    } else if (type === 'convert') {
        animation.innerHTML = `<div style="color: #00ffcc; font-weight: bold;">-${amount} xCIS</div>`;
    } else {
        animation.innerHTML = `<div style="color: #00c6ff; font-weight: bold;">${amount} xCIS</div>`;
    }
    
    document.body.appendChild(animation);
    
    // Remove animation after completion
    setTimeout(() => {
        if (document.body.contains(animation)) {
            document.body.removeChild(animation);
        }
    }, 1500);
}

// Update mining UI if we're on the mining page
function updateMiningUI(userData) {
    const miningStatus = document.getElementById('mining-status');
    const upgradeCost = document.getElementById('upgrade-cost');
    
    if (miningStatus) {
        const miningPower = userData.miningPower || 1;
        miningStatus.innerHTML = `
            <div>Coins Mined: <span class="highlight">0.00</span></div>
            <div>Mining Power: <span class="highlight">${miningPower.toFixed(1)}</span></div>
            <div>Difficulty: <span class="highlight">1.00</span></div>
        `;
    }
    
    if (upgradeCost) {
        const miningPower = userData.miningPower || 1;
        upgradeCost.innerText = `Upgrade Cost: ${Math.floor(miningPower * 10)} xCIS`;
    }
}

// Export functions for use in HTML
window.connectWallet = connectWallet;
window.stakeCoins = stakeCoins;
window.convertToCIS = convertToCIS;
window.getUserBalance = getUserBalance;
window.isWalletConnected = () => isWalletConnected;
window.getCurrentWallet = () => currentWalletAddress;
