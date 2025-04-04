/**
 * Wallet Reconnect Fix
 * 
 * This script automatically runs on all pages to ensure wallet reconnection
 * and consistent state across the application.
 */

(function() {
    // Run this script immediately to avoid any visible delays
    console.log('Wallet reconnect fix running...'); // Log when the script starts
    
    // Retry count to limit reconnection attempts
    let retryCount = 0;
    const MAX_RETRIES = 5;
    
    // Reference to the DOMContentLoaded handler for cleanup
    let domContentLoadedHandler = null;
    
    // Check if the wallet system exists and provide user feedback
    function checkWalletSystem() {
        if (retryCount >= MAX_RETRIES) {
            console.log('Max retries reached, giving up on wallet reconnect'); // Log when max retries are reached
            
            // Clean up the event listener after max retries
            if (domContentLoadedHandler) {
                document.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
                domContentLoadedHandler = null;
            }
            
            return;
        }
        
        retryCount++;
        
        // Check if wallet system is loaded
        if (!window.cispWallet) {
            console.log('Wallet system not yet available, waiting...'); // Log when wallet system is not available
            setTimeout(checkWalletSystem, 500);
            return;
        }
        
        // Try reconnecting wallet
        reconnectWallet();
    }
    
    // Try to reconnect the wallet and provide user feedback

    function reconnectWallet() {
        try {
            // First check if wallet is already connected
            if (window.cispWallet.isWalletConnected && window.cispWallet.isWalletConnected()) {
                console.log('Wallet already connected:', window.cispWallet.getCurrentWallet().address);
                updateWalletUI(true);
                return;
            }
            
            // Check for wallet ID in storage
            const storedWalletId = sessionStorage.getItem('current_wallet_id') || localStorage.getItem('current_wallet_id');
            if (!storedWalletId) {
                console.log('No wallet ID found in storage, no reconnection needed'); // Log when no wallet ID is found
                updateWalletUI(false);
                return;
            }
            
            console.log('Found stored wallet ID:', storedWalletId);
            
            // Check if wallet system is initialized
            if (!window.cispWallet.isInitialized && window.cispWallet.init) {
                window.cispWallet.init().then(() => {
                    attemptReconnection(storedWalletId);
                });
            } else {
                attemptReconnection(storedWalletId);
            }
        } catch (error) {
            console.error('Error in reconnectWallet:', error); // Log errors in reconnectWallet
        }
    }
    
    // Attempt to reconnect with the stored wallet ID
    function attemptReconnection(walletId) {
        try {
            // Check if this wallet exists in our collection
            if (window.cispWallet.wallets && window.cispWallet.wallets.has && window.cispWallet.wallets.has(walletId)) {
                console.log('Reconnecting wallet:', walletId);
                
                // Connect wallet without notification
                if (window.cispWallet.connectWallet) {
                    // Use connect method if available
                    window.cispWallet.connectWallet(walletId);
                } else {
                    // Fallback method
                    window.cispWallet.currentWallet = window.cispWallet.wallets.get(walletId);
                    if (window.cispWallet._broadcastWalletChange) {
                        window.cispWallet._broadcastWalletChange();
                    }
                }
                
                updateWalletUI(true);
            } else {
                console.log('Wallet ID not found in collection:', walletId); // Log when wallet ID is not found
                updateWalletUI(false);
            }
        } catch (error) {
            console.error('Error in attemptReconnection:', error); // Log errors in attemptReconnection
        }
    }
    
    // Update UI based on wallet connection state and provide user feedback

    function updateWalletUI(isConnected) {
        try {
            // Find wallet connection elements
            const connectButtons = document.querySelectorAll('.connect-wallet-btn, [data-action="connect-wallet"]');
            const disconnectButtons = document.querySelectorAll('.disconnect-wallet-btn, [data-action="disconnect-wallet"]');
            const walletAddressElements = document.querySelectorAll('[data-wallet-address]');
            const walletRequiredElements = document.querySelectorAll('[data-requires-wallet]');
            const walletConnectedSections = document.querySelectorAll('[data-wallet-connected-only]');
            const walletDisconnectedSections = document.querySelectorAll('[data-wallet-disconnected-only]');
            
            if (isConnected && window.cispWallet.getCurrentWallet) {
                const currentWallet = window.cispWallet.getCurrentWallet();
                const address = currentWallet.address;
                
                // Update wallet address displays
                walletAddressElements.forEach(element => {
                    element.textContent = address;
                });
                
                // Show/hide connect/disconnect buttons
                connectButtons.forEach(button => {
                    button.style.display = 'none';
                });
                
                disconnectButtons.forEach(button => {
                    button.style.display = 'inline-block';
                });
                
                // Enable wallet required elements
                walletRequiredElements.forEach(element => {
                    element.classList.remove('wallet-required');
                    if (element.hasAttribute('disabled')) {
                        element.removeAttribute('disabled');
                    }
                });
                
                // Show wallet connected sections
                walletConnectedSections.forEach(section => {
                    section.style.display = '';
                });
                
                // Hide wallet disconnected sections
                walletDisconnectedSections.forEach(section => {
                    section.style.display = 'none';
                });
                
                // Remove connect wallet notifications
                if (window.notifications) {
                    const notificationsContainer = document.querySelector('.notifications-container');
                    if (notificationsContainer) {
                        const connectWarnings = notificationsContainer.querySelectorAll('.notification-warning, .notification-error');
                        connectWarnings.forEach(notification => {
                            if (notification.textContent.toLowerCase().includes('connect') && 
                                notification.textContent.toLowerCase().includes('wallet')) {
                                notification.remove();
                            }
                        });
                    }
                }
            } else {
                // Show/hide connect/disconnect buttons
                connectButtons.forEach(button => {
                    button.style.display = 'inline-block';
                });
                
                disconnectButtons.forEach(button => {
                    button.style.display = 'none';
                });
                
                // Disable wallet required elements
                walletRequiredElements.forEach(element => {
                    element.classList.add('wallet-required');
                    element.setAttribute('disabled', 'disabled');
                });
                
                // Hide wallet connected sections
                walletConnectedSections.forEach(section => {
                    section.style.display = 'none';
                });
                
                // Show wallet disconnected sections
                walletDisconnectedSections.forEach(section => {
                    section.style.display = '';
                });
                
                // Clear wallet address displays
                walletAddressElements.forEach(element => {
                    element.textContent = 'Not Connected';
                });
            }
        } catch (error) {
            console.error('Error updating wallet UI:', error); // Log errors in updating the wallet UI
        }
    }
    
    // Start the process
    checkWalletSystem();
    
    // Also listen for DOMContentLoaded to retry after page is fully loaded
    domContentLoadedHandler = function() {
        // Reset retry count and try again
        retryCount = 0;
        checkWalletSystem();
        
        // Remove the event listener after it fires once
        document.removeEventListener('DOMContentLoaded', domContentLoadedHandler);
        domContentLoadedHandler = null;
    };
    
    document.addEventListener('DOMContentLoaded', domContentLoadedHandler);
})();
