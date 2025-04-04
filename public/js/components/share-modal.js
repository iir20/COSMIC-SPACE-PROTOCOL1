/**
 * Share Modal Component
 */
class ShareModal {
    constructor() {
        this.modal = null;
        this.isInitialized = false;
    }

    init() {
        try {
            // Create modal element if it doesn't exist
            if (!document.getElementById('share-modal')) {
                this.createModal();
            }

            // Set up event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            console.log('Share modal initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize share modal:', error);
            return false;
        }
    }

    createModal() {
        // Create modal container
        const modal = document.createElement('div');
        modal.id = 'share-modal';
        modal.className = 'share-modal';
        modal.style.display = 'none';

        // Create modal content
        modal.innerHTML = `
            <div class="share-modal-content">
                <div class="share-modal-header">
                    <h3>Share Your Mining Success</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="share-modal-body">
                    <div class="share-stats">
                        <div class="stat-item">
                            <span class="stat-label">Total Mined</span>
                            <span class="stat-value" id="share-total-mined">0.0000 xCIS</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Last Reward</span>
                            <span class="stat-value" id="share-last-reward">0.0000 xCIS</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Mining Power</span>
                            <span class="stat-value" id="share-mining-power">50</span>
                        </div>
                    </div>
                    <div class="share-buttons">
                        <button class="share-button twitter">
                            <i class="fab fa-twitter"></i>
                            Share on Twitter
                        </button>
                        <button class="share-button discord">
                            <i class="fab fa-discord"></i>
                            Share on Discord
                        </button>
                        <button class="share-button telegram">
                            <i class="fab fa-telegram"></i>
                            Share on Telegram
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Add modal to document
        document.body.appendChild(modal);
        this.modal = modal;
    }

    setupEventListeners() {
        if (!this.modal) return;

        // Close button
        const closeButton = this.modal.querySelector('.close-modal');
        if (closeButton) {
            closeButton.addEventListener('click', () => this.hide());
        }

        // Share buttons
        const twitterButton = this.modal.querySelector('.share-button.twitter');
        const discordButton = this.modal.querySelector('.share-button.discord');
        const telegramButton = this.modal.querySelector('.share-button.telegram');

        if (twitterButton) {
            twitterButton.addEventListener('click', () => this.shareOnTwitter());
        }
        if (discordButton) {
            discordButton.addEventListener('click', () => this.shareOnDiscord());
        }
        if (telegramButton) {
            telegramButton.addEventListener('click', () => this.shareOnTelegram());
        }

        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target === this.modal) {
                this.hide();
            }
        });

        // Listen for mining success
        window.addEventListener('blockMined', (event) => {
            this.updateStats(event.detail);
        });
    }

    show() {
        if (this.modal) {
            this.modal.style.display = 'flex';
            this.updateStats();
        }
    }

    hide() {
        if (this.modal) {
            this.modal.style.display = 'none';
        }
    }

    updateStats(stats = {}) {
        if (!this.modal) return;

        const totalMinedElement = this.modal.querySelector('#share-total-mined');
        const lastRewardElement = this.modal.querySelector('#share-last-reward');
        const miningPowerElement = this.modal.querySelector('#share-mining-power');

        if (totalMinedElement && window.miningSystem) {
            totalMinedElement.textContent = `${window.miningSystem.totalMined.toFixed(4)} xCIS`;
        }
        if (lastRewardElement && window.miningSystem) {
            lastRewardElement.textContent = `${window.miningSystem.lastReward.toFixed(4)} xCIS`;
        }
        if (miningPowerElement && window.miningSystem) {
            miningPowerElement.textContent = window.miningSystem.miningPower;
        }
    }

    shareOnTwitter() {
        const text = this.getShareText();
        const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    shareOnDiscord() {
        const text = this.getShareText();
        // Implement Discord sharing logic
        console.log('Sharing on Discord:', text);
    }

    shareOnTelegram() {
        const text = this.getShareText();
        const url = `https://t.me/share/url?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    }

    getShareText() {
        if (!window.miningSystem) return '';

        return `🚀 Just mined ${window.miningSystem.lastReward.toFixed(4)} xCIS tokens on Cosmic Space Protocol! Total mined: ${window.miningSystem.totalMined.toFixed(4)} xCIS 💫 #CosmicSpaceProtocol #xCIS #Mining`;
    }
}

// Initialize share modal when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.shareModal = new ShareModal();
    window.shareModal.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShareModal;
} 