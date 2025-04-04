/**
 * Wallet Balance Display Fix
 * 
 * This script fixes the issue with displaying wallet balances
 * by correctly handling the balance object structure.
 */

document.addEventListener('DOMContentLoaded', function() {
    console.log('Wallet Balance Fix script loaded');
    
    // Fix for the wallet balance display issue on home page
    function fixWalletBalanceDisplay() {
        try {
            // Find all wallet balance display elements
            const balanceDisplays = document.querySelectorAll('[data-wallet-balance]');
            
            if (balanceDisplays.length === 0) {
                console.log('No wallet balance displays found on this page');
                return;
            }
            
            console.log(`Found ${balanceDisplays.length} wallet balance display elements`);
            
            // Global update function for wallet balances
            window.updateWalletDisplay = function(wallet) {
                if (!wallet) {
                    console.log('No wallet provided to updateWalletDisplay');
                    return;
                }
                
                try {
                    console.log('Updating wallet display for wallet:', wallet);
                    
                    // Make sure the wallet has a balance object
                    if (!wallet.balance) {
                        wallet.balance = { CIS: 0, xCIS: 0 };
                    }
                    
                    // Update each balance display
                    balanceDisplays.forEach(element => {
                        const currencyType = element.getAttribute('data-currency-type') || 'CIS';
                        const balanceValue = typeof wallet.balance === 'object' ? 
                            (wallet.balance[currencyType] || 0) : 
                            (currencyType === 'CIS' ? wallet.balance : 0);
                        
                        // Format the balance nicely with 2 decimal places
                        let formattedBalance = '0.00';
                        if (typeof balanceValue === 'number') {
                            formattedBalance = balanceValue.toFixed(2);
                        } else if (typeof balanceValue === 'string' && !isNaN(parseFloat(balanceValue))) {
                            formattedBalance = parseFloat(balanceValue).toFixed(2);
                        }
                        
                        element.textContent = formattedBalance;
                    });
                    
                    // Also update any address displays
                    const addressDisplays = document.querySelectorAll('[data-wallet-address]');
                    addressDisplays.forEach(element => {
                        element.textContent = wallet.address || 'No Address';
                    });
                    
                    console.log('Wallet display updated successfully');
                } catch (error) {
                    console.error('Error updating wallet display:', error);
                }
            };
            
            // Override any existing update function
            if (window.updateWalletDisplay) {
                console.log('Replaced existing updateWalletDisplay function');
            }
            
            // Set up event listener for wallet changes
            window.addEventListener('walletChanged', function(event) {
                if (event.detail) {
                    window.updateWalletDisplay(event.detail);
                }
            });
            
            // Check if there's already a connected wallet
            if (window.cispWallet && typeof window.cispWallet.getCurrentWallet === 'function') {
                const currentWallet = window.cispWallet.getCurrentWallet();
                if (currentWallet) {
                    window.updateWalletDisplay(currentWallet);
                }
            }
            
            console.log('Wallet balance display fix applied');
        } catch (error) {
            console.error('Error applying wallet balance fix:', error);
        }
    }
    
    // Apply the fix immediately
    fixWalletBalanceDisplay();
    
    // Also apply it again after a delay to ensure everything is loaded
    setTimeout(fixWalletBalanceDisplay, 1000);
}); 