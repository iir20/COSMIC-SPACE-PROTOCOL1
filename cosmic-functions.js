/**
 * Cosmic Functions
 * 
 * This file contains global functions referenced in HTML elements
 * to ensure they are properly defined and accessible.
 */

// Global function to create a new wallet
function createWallet() {
    try {
        // Check if wallet system is available
        if (!window.cispWallet) {
            console.error('Wallet system not available');
            if (window.notifications) {
                window.notifications.show('Wallet system not available. Please refresh the page.', 'error');
            }
            return;
        }

        // Get wallet creation form elements
        const walletNameInput = document.getElementById('walletName');
        const walletPasswordInput = document.getElementById('connectWalletPassword');
        
        // Validate inputs
        if (!walletNameInput || !walletPasswordInput) {
            console.error('Wallet creation form elements not found');
            if (window.notifications) {
                window.notifications.show('Wallet creation form not found. Please refresh the page.', 'error');
            }
            return;
        }

        const walletName = walletNameInput.value.trim();
        const walletPassword = walletPasswordInput.value.trim();

        // Validate input values
        if (!walletName) {
            if (window.notifications) {
                window.notifications.show('Please enter a wallet name', 'warning');
            }
            return;
        }

        if (!walletPassword || walletPassword.length < 6) {
            if (window.notifications) {
                window.notifications.show('Please enter a secure password (minimum 6 characters)', 'warning');
            }
            return;
        }

        // Create the wallet - use the correct method
        let newWallet;
        if (typeof window.cispWallet.createNewWallet === 'function') {
            newWallet = window.cispWallet.createNewWallet(walletName, walletPassword);
        } else if (typeof window.cispWallet.createWallet === 'function') {
            newWallet = window.cispWallet.createWallet(walletName, walletPassword);
        } else {
            console.error('No wallet creation method found');
            if (window.notifications) {
                window.notifications.show('Wallet creation method not available. Please refresh the page.', 'error');
            }
            return;
        }
        
        if (newWallet) {
            // Connect to the new wallet
            window.cispWallet.connectWallet(newWallet.address);
            
            // Show success notification
            if (window.notifications) {
                window.notifications.show('Wallet created successfully!', 'success');
            }
            
            // Hide wallet creation modal if it exists
            const walletModal = document.getElementById('wallet-creation-modal');
            if (walletModal) {
                walletModal.style.display = 'none';
            }
            
            // Show welcome message
            setTimeout(() => {
                if (window.notifications) {
                    window.notifications.show(`Welcome to Cosmic Space, ${walletName}! You've received a welcome bonus.`, 'success', 5000);
                }
            }, 1000);
            
            // Redirect to home page if not already there
            if (!window.location.pathname.includes('home.html')) {
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 2000);
            }
        } else {
            if (window.notifications) {
                window.notifications.show('Failed to create wallet. Please try again.', 'error');
            }
        }
    } catch (error) {
        console.error('Error creating wallet:', error);
        if (window.notifications) {
            window.notifications.show('Error creating wallet: ' + error.message, 'error');
        }
    }
}

// Global function to enter the Cosmos (main application)
function enterCosmos() {
    try {
        // Check if wallet is connected
        if (window.cispWallet && !window.cispWallet.getCurrentWallet()) {
            // Show wallet connection modal if it exists
            const walletModal = document.getElementById('wallet-modal');
            if (walletModal) {
                walletModal.style.display = 'flex';
            } else {
                // Otherwise show notification
                if (window.notifications) {
                    window.notifications.show('Please connect your wallet first', 'warning');
                }
            }
            return;
        }
        
        // Redirect to home page
        window.location.href = 'home.html';
    } catch (error) {
        console.error('Error entering Cosmos:', error);
        if (window.notifications) {
            window.notifications.show('Error entering Cosmos: ' + error.message, 'error');
        }
    }
}

// Global function to connect an existing wallet
function connectWallet() {
    try {
        // Check if wallet system is available
        if (!window.cispWallet) {
            console.error('Wallet system not available');
            if (window.notifications) {
                window.notifications.show('Wallet system not available. Please refresh the page.', 'error');
            }
            return;
        }

        // Get wallet connection form elements
        const walletAddressInput = document.getElementById('walletAddress');
        const walletPasswordInput = document.querySelector('#connect-wallet-form #connectWalletPassword');
        
        // Validate inputs
        if (!walletAddressInput || !walletPasswordInput) {
            console.error('Wallet connection form elements not found');
            if (window.notifications) {
                window.notifications.show('Wallet connection form not found. Please refresh the page.', 'error');
            }
            return;
        }

        const walletAddress = walletAddressInput.value.trim();
        const walletPassword = walletPasswordInput.value.trim();

        // Validate input values
        if (!walletAddress) {
            if (window.notifications) {
                window.notifications.show('Please enter a wallet address', 'warning');
            }
            return;
        }

        if (!walletPassword) {
            if (window.notifications) {
                window.notifications.show('Please enter your wallet password', 'warning');
            }
            return;
        }

        // Connect to the wallet
        const connected = window.cispWallet.connectWallet(walletAddress, walletPassword);
        
        if (connected) {
            // Show success notification
            if (window.notifications) {
                window.notifications.show('Wallet connected successfully!', 'success');
            }
            
            // Hide wallet connection modal if it exists
            const walletModal = document.getElementById('wallet-modal');
            if (walletModal) {
                walletModal.style.display = 'none';
            }
            
            // Redirect to home page if not already there
            if (!window.location.pathname.includes('home.html')) {
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 1000);
            }
        } else {
            if (window.notifications) {
                window.notifications.show('Failed to connect wallet. Please check your address and password.', 'error');
            }
        }
    } catch (error) {
        console.error('Error connecting wallet:', error);
        if (window.notifications) {
            window.notifications.show('Error connecting wallet: ' + error.message, 'error');
        }
    }
}

// Global function to disconnect wallet
function disconnectWallet() {
    try {
        // Check if wallet system is available
        if (!window.cispWallet) {
            console.error('Wallet system not available');
            return;
        }

        // Disconnect the wallet
        window.cispWallet.disconnectWallet();
        
        // Show notification
        if (window.notifications) {
            window.notifications.show('Wallet disconnected', 'info');
        }
        
        // Redirect to index page if not already there
        if (!window.location.pathname.includes('index.html') && !window.location.pathname.endsWith('/')) {
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        }
    } catch (error) {
        console.error('Error disconnecting wallet:', error);
        if (window.notifications) {
            window.notifications.show('Error disconnecting wallet: ' + error.message, 'error');
        }
    }
}

// Global function to show wallet details
function showWalletDetails() {
    try {
        // Check if wallet system is available
        if (!window.cispWallet) {
            console.error('Wallet system not available');
            return;
        }

        const currentWallet = window.cispWallet.getCurrentWallet();
        if (!currentWallet) {
            if (window.notifications) {
                window.notifications.show('No wallet connected', 'warning');
            }
            return;
        }

        // Show wallet details modal if it exists
        const walletDetailsModal = document.getElementById('wallet-details-modal');
        if (walletDetailsModal) {
            // Update wallet details in the modal
            const walletNameElement = walletDetailsModal.querySelector('.wallet-name');
            const walletAddressElement = walletDetailsModal.querySelector('.wallet-address');
            const walletBalanceElement = walletDetailsModal.querySelector('.wallet-balance');
            
            if (walletNameElement) {
                walletNameElement.textContent = currentWallet.name || 'My Wallet';
            }
            
            if (walletAddressElement) {
                walletAddressElement.textContent = currentWallet.address;
            }
            
            if (walletBalanceElement) {
                const totalBalance = (currentWallet.balance?.CIS || 0) + (currentWallet.balance?.xCIS || 0);
                walletBalanceElement.textContent = totalBalance.toLocaleString();
            }
            
            // Show the modal
            walletDetailsModal.style.display = 'flex';
        } else {
            // If no modal exists, show a notification with basic info
            if (window.notifications) {
                const address = currentWallet.address;
                const shortAddress = address.substring(0, 6) + '...' + address.substring(address.length - 4);
                window.notifications.show(`Wallet: ${shortAddress}`, 'info');
            }
        }
    } catch (error) {
        console.error('Error showing wallet details:', error);
        if (window.notifications) {
            window.notifications.show('Error showing wallet details: ' + error.message, 'error');
        }
    }
}

// Initialize these functions when the document is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Cosmic functions initialized');
}); 