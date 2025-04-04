/**
 * Share Modal Component
 * 
 * This script initializes the share modal and handles various share options
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Safely initialize the share modal
    initializeShareModal();
});

/**
 * Initialize the share modal
 */
function initializeShareModal() {
    console.log('Initializing share modal');
    
    // Get necessary elements
    const shareModal = document.getElementById('shareModal');
    const closeShareModal = document.getElementById('closeShareModal');
    
    // Only proceed if share modal exists
    if (!shareModal) {
        console.log('Share modal not found - skipping initialization');
        return;
    }
    
    // Add close button handler if available
    if (closeShareModal) {
        closeShareModal.addEventListener('click', () => {
            shareModal.classList.remove('show');
            shareModal.classList.add('hide');
        });
    }
    
    // Close modal when clicking outside
    shareModal.addEventListener('click', (event) => {
        if (event.target === shareModal) {
            shareModal.classList.remove('show');
            shareModal.classList.add('hide');
        }
    });
    
    // Add open modal handler
    const shareButtons = document.querySelectorAll('.share-button');
    if (shareButtons.length > 0) {
        shareButtons.forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault();
                shareModal.classList.remove('hide');
                shareModal.classList.add('show');
            });
        });
    }
    
    // Initialize share buttons
    initializeShareButtons();
    
    console.log('Share modal initialized successfully');
}

/**
 * Initialize the social media share buttons
 */
function initializeShareButtons() {
    const twitterShare = document.getElementById('twitterShare');
    const facebookShare = document.getElementById('facebookShare');
    const telegramShare = document.getElementById('telegramShare');
    const copyLink = document.getElementById('copyLink');
    
    // Set up Twitter sharing
    if (twitterShare) {
        twitterShare.addEventListener('click', () => {
            const text = encodeURIComponent('Join me in the Cosmic Space Protocol!');
            const url = encodeURIComponent(window.location.href);
            window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
        });
    }
    
    // Set up Facebook sharing
    if (facebookShare) {
        facebookShare.addEventListener('click', () => {
            const url = encodeURIComponent(window.location.href);
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
        });
    }
    
    // Set up Telegram sharing
    if (telegramShare) {
        telegramShare.addEventListener('click', () => {
            const text = encodeURIComponent('Join me in the Cosmic Space Protocol!');
            const url = encodeURIComponent(window.location.href);
            window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
        });
    }
    
    // Set up copy link button
    if (copyLink) {
        copyLink.addEventListener('click', () => {
            const tempInput = document.createElement('input');
            document.body.appendChild(tempInput);
            tempInput.value = window.location.href;
            tempInput.select();
            document.execCommand('copy');
            document.body.removeChild(tempInput);
            
            // Show copy confirmation
            const confirmationElement = document.getElementById('linkCopied');
            if (confirmationElement) {
                confirmationElement.classList.add('show');
                setTimeout(() => {
                    confirmationElement.classList.remove('show');
                }, 2000);
            } else {
                alert('Link copied to clipboard!');
            }
        });
    }
}

// Add global access to modal functions
window.shareModal = {
    show: () => {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.remove('hide');
            modal.classList.add('show');
        }
    },
    hide: () => {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.remove('show');
            modal.classList.add('hide');
        }
    },
    toggle: () => {
        const modal = document.getElementById('shareModal');
        if (modal) {
            modal.classList.toggle('show');
            modal.classList.toggle('hide');
        }
    }
};

// Generate referral link
function generateReferralLink() {
    try {
        const walletAddress = window.walletManager?.getCurrentWallet()?.address;
        
        if (!walletAddress) {
            showReferralError('Please connect your wallet to generate a referral link');
            return;
        }
        
        const baseUrl = window.location.origin;
        const referralUrl = `${baseUrl}/?ref=${walletAddress}`;
        
        // Update UI
        const referralLinkElement = document.getElementById('referral-link');
        if (referralLinkElement) {
            referralLinkElement.value = referralUrl;
            referralLinkElement.classList.add('active');
        }
        
        // Update copy button text and style
        const copyButton = document.getElementById('copy-referral');
        if (copyButton) {
            copyButton.textContent = 'Copy Link';
            copyButton.classList.remove('copied');
            copyButton.classList.add('active');
        }
        
    } catch (error) {
        console.error('Error generating referral link:', error);
        showReferralError('Error generating referral link');
    }
}

// Copy referral link to clipboard
function copyReferralLink() {
    try {
        const referralLinkElement = document.getElementById('referral-link');
        
        if (!referralLinkElement || !referralLinkElement.value) {
            showReferralError('No referral link to copy');
            return;
        }
        
        // Copy to clipboard
        referralLinkElement.select();
        document.execCommand('copy');
        
        // Update button text and style
        const copyButton = document.getElementById('copy-referral');
        if (copyButton) {
            copyButton.textContent = 'Copied!';
            copyButton.classList.add('copied');
        }
        
        // Show success message
        showReferralMessage('Link copied to clipboard!');
        
    } catch (error) {
        console.error('Error copying referral link:', error);
        showReferralError('Error copying link to clipboard');
    }
}

// Show referral error message
function showReferralError(message) {
    const errorElement = document.getElementById('referral-error');
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            errorElement.style.display = 'none';
        }, 3000);
    }
}

// Show referral success message
function showReferralMessage(message) {
    const messageElement = document.getElementById('referral-message');
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        
        // Hide after 3 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const shareButton = document.querySelector('.share-button');
    const shareModal = document.querySelector('.share-modal');
    
    if (shareButton && shareModal) {
        shareButton.addEventListener('click', () => {
            shareModal.classList.toggle('active');
        });

        // Close modal when clicking outside
        document.addEventListener('click', (e) => {
            if (!shareModal.contains(e.target) && !shareButton.contains(e.target)) {
                shareModal.classList.remove('active');
            }
        });
    }
}); 