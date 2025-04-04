/**
 * Page Synchronization System
 * Ensures all pages use the same data and state
 */
document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing page synchronization...');
    
    // Listen for coordination system events
    window.addEventListener('systemInitialized', (event) => {
        const { name } = event.detail;
        updatePageStatus(name, 'initialized');
    });
    
    window.addEventListener('systemInitializationError', (event) => {
        const { name, error } = event.detail;
        updatePageStatus(name, 'error', error.message);
    });
    
    window.addEventListener('allSystemsInitialized', () => {
        updatePageStatus('all', 'initialized');
    });

    // Set up cross-page storage synchronization
    window.addEventListener('storage', (event) => {
        console.log('Storage event detected:', event);
        
        // Handle storage events from other tabs/pages
        if (event.key && event.key.startsWith('cosmic:')) {
            const systemName = event.key.split(':')[1];
            console.log(`Synchronized data for system: ${systemName}`);
            
            // Trigger UI update
            updatePageForSystem(systemName);
        }
    });
    
    // Update page elements based on system status
    function updatePageStatus(systemName, status, message) {
        const statusIndicators = document.querySelectorAll(`[data-system="${systemName}"]`);
        
        statusIndicators.forEach(indicator => {
            indicator.classList.remove('initializing', 'initialized', 'error');
            indicator.classList.add(status);
            
            if (message && indicator.querySelector('.status-message')) {
                indicator.querySelector('.status-message').textContent = message;
            }
        });
        
        // If all systems initialized, update page state
        if (systemName === 'all' && status === 'initialized') {
            document.body.classList.add('systems-ready');
            updateAllPageContent();
        }
    }
    
    // Function to update specific system UI
    function updatePageForSystem(systemName) {
        switch(systemName) {
            case 'wallet':
                if (window.updateWalletDisplay && window.coordinator.isSystemInitialized('wallet')) {
                    const walletData = window.walletManager.getCurrentWallet();
                    if (walletData) {
                        window.updateWalletDisplay(walletData);
                    }
                }
                break;
                
            case 'mining':
                if (window.updateMiningStatus && window.coordinator.isSystemInitialized('mining')) {
                    window.updateMiningStatus();
                }
                break;
                
            case 'nft':
                if (window.updateNFTDisplays && window.coordinator.isSystemInitialized('nft')) {
                    window.updateNFTDisplays();
                }
                break;
                
            case 'staking':
                if (window.updateStakingStatus && window.coordinator.isSystemInitialized('staking')) {
                    window.updateStakingStatus();
                }
                break;
                
            default:
                updateAllPageContent();
        }
    }
    
    // Function to update all page content based on current state
    function updateAllPageContent() {
        // Determine current page type
        const currentPage = getCurrentPageType();
        console.log(`Updating content for page type: ${currentPage}`);
        
        // Update wallet display (common to all pages)
        if (window.updateWalletDisplay && window.coordinator.isSystemInitialized('wallet')) {
            const walletData = window.walletManager.getCurrentWallet();
            if (walletData) {
                window.updateWalletDisplay(walletData);
            }
        }
        
        // Update page-specific content
        switch(currentPage) {
            case 'mining':
                if (window.updateMiningStatus && window.coordinator.isSystemInitialized('mining')) {
                    window.updateMiningStatus();
                }
                break;
                
            case 'staking':
                if (window.updateStakingStatus && window.coordinator.isSystemInitialized('staking')) {
                    window.updateStakingStatus();
                }
                break;
                
            case 'nft':
                if (window.updateNFTDisplays && window.coordinator.isSystemInitialized('nft')) {
                    window.updateNFTDisplays();
                }
                break;
                
            case 'convert':
                if (window.updateConvertUI && window.coordinator.isSystemInitialized('wallet')) {
                    window.updateConvertUI();
                }
                break;
        }
        
        console.log('All page content updated with latest state');
    }
    
    // Helper function to determine current page type
    function getCurrentPageType() {
        const path = window.location.pathname;
        
        if (path.includes('mining')) return 'mining';
        if (path.includes('staking')) return 'staking';
        if (path.includes('nft')) return 'nft';
        if (path.includes('convert')) return 'convert';
        
        return 'home';
    }
}); 