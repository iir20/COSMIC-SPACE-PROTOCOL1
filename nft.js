class NFTSystem {
    constructor() {
        this.selectedNFTs = new Set();
        this.animationQueue = new Map();
        this.loadingStates = new Map();
    }

    createNFTCard(nft, type) {
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.dataset.tokenId = nft.tokenId;
        
        // Add rarity badge
        const rarityName = this.getRarityName(nft.rarity).toLowerCase();
        const categoryName = this.getCategoryName(nft.category);
        
        // Create card content with enhanced animation classes
        card.innerHTML = `
            <div class="rarity-badge ${rarityName}" data-aos="fade-right">
                ${this.getRarityName(nft.rarity)}
            </div>
            ${type === 'collection' ? `
                <div class="checkbox-wrapper" data-aos="fade-left">
                    <input type="checkbox" class="select-checkbox" value="${nft.tokenId}">
                    <span class="checkmark"></span>
                </div>
            ` : ''}
            <div class="image-container" data-aos="zoom-in">
                <img src="${this.getImagePath(nft.rarity, nft.category)}" 
                     alt="${categoryName} NFT"
                     loading="lazy">
                <div class="image-overlay"></div>
            </div>
            <div class="nft-info" data-aos="fade-up">
                <h3>${categoryName} #${nft.tokenId}</h3>
                <div class="info-grid">
                    <p>
                        <span>Category</span>
                        <span class="${rarityName}">${categoryName}</span>
                    </p>
                    <p>
                        <span>Rarity</span>
                        <span class="${rarityName}">${this.getRarityName(nft.rarity)}</span>
                    </p>
                    <p>
                        <span>Power</span>
                        <span>${this.formatPower(nft.power)}%</span>
                    </p>
                </div>
                ${this.getCardActionButtons(nft, type)}
            </div>
        `;
        
        // Add event listeners with enhanced interactions
        this.addCardEventListeners(card, nft, type);
        
        // Add card reveal animation
        setTimeout(() => card.classList.add('revealed'), 100);
        
        return card;
    }

    addCardEventListeners(card, nft, type) {
        // Checkbox handling with animation
        if (type === 'collection') {
            const checkbox = card.querySelector('.select-checkbox');
            checkbox.addEventListener('change', (e) => {
                const checkmark = card.querySelector('.checkmark');
                if (e.target.checked) {
                    this.selectedNFTs.add(nft.tokenId);
                    checkmark.classList.add('checked');
                    card.classList.add('selected');
                } else {
                    this.selectedNFTs.delete(nft.tokenId);
                    checkmark.classList.remove('checked');
                    card.classList.remove('selected');
                }
                this.updateBatchButtons();
            });
        }

        // Add hover effects
        card.addEventListener('mouseenter', () => {
            card.classList.add('hover');
        });

        card.addEventListener('mouseleave', () => {
            card.classList.remove('hover');
        });
    }

    getCardActionButtons(nft, type) {
        const buttons = {
            collection: `
                <div class="card-actions" data-aos="fade-up" data-aos-delay="100">
                    <button class="action-btn primary" onclick="nftSystem.showNFTActions('${nft.tokenId}')">
                        <i class="fas fa-cog"></i>
                        Actions
                    </button>
                </div>
            `,
            marketplace: nft.seller.toLowerCase() !== this.account.toLowerCase() ?
                `<div class="card-actions" data-aos="fade-up" data-aos-delay="100">
                    <button class="action-btn primary" onclick="nftSystem.buyNFT('${nft.tokenId}', '${nft.price}')">
                        <i class="fas fa-shopping-cart"></i>
                        Buy for ${this.formatPrice(nft.price)} xCIS
                    </button>
                </div>` :
                `<div class="card-actions">
                    <button class="action-btn disabled" disabled>Listed by you</button>
                </div>`,
            staking: `
                <div class="staking-info" data-aos="fade-up" data-aos-delay="100">
                    <p class="rewards-info">
                        <span>Pending Rewards</span>
                        <span class="reward-amount">${this.formatPrice(nft.pendingRewards)} xCIS</span>
                    </p>
                    <div class="card-actions">
                        <button class="action-btn secondary" onclick="nftSystem.claimRewards('${nft.tokenId}')">
                            <i class="fas fa-coins"></i>
                            Claim
                        </button>
                        <button class="action-btn primary" onclick="nftSystem.unstakeNFT('${nft.tokenId}')">
                            <i class="fas fa-unlock"></i>
                            Unstake
                        </button>
                    </div>
                </div>
            `
        };

        return buttons[type] || '';
    }

    showNFTActions(tokenId) {
        const nft = this.nfts.find(n => n.tokenId === tokenId);
        if (!nft) return;
        
        const modal = document.getElementById('nftActionsModal');
        modal.classList.add('show');
        
        const modalContent = `
            <div class="modal-header">
                <h2>NFT Actions</h2>
                <button class="close-btn" onclick="nftSystem.closeModal('nftActionsModal')">×</button>
            </div>
            <div class="modal-body">
                ${this.getModalContent(nft)}
            </div>
        `;
        
        modal.querySelector('.modal-content').innerHTML = modalContent;
        this.setupModalActions(nft);
    }

    getModalContent(nft) {
        return `
            <div class="nft-preview">
                <img src="${this.getImagePath(nft.rarity, nft.category)}" alt="NFT Preview">
                <div class="nft-details">
                    <h3>${this.getCategoryName(nft.category)} #${nft.tokenId}</h3>
                    <p class="rarity ${this.getRarityName(nft.rarity).toLowerCase()}">
                        ${this.getRarityName(nft.rarity)}
                    </p>
                </div>
            </div>
            <div class="action-grid">
                ${this.getActionButtons(nft)}
            </div>
        `;
    }

    setupModalActions(nft) {
        // Setup action button listeners
        document.getElementById('listNFTBtn')?.addEventListener('click', () => {
            this.showListingForm(nft.tokenId);
        });

        document.getElementById('stakeNFTBtn')?.addEventListener('click', () => {
            this.stakeNFT(nft.tokenId);
            this.closeModal('nftActionsModal');
        });
    }

    formatPrice(price) {
        return parseFloat(this.web3.utils.fromWei(price)).toFixed(2);
    }

    formatPower(power) {
        return power.toLocaleString('en-US', { maximumFractionDigits: 1 });
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    showLoadingState(elementId, loading = true) {
        const element = document.getElementById(elementId);
        if (!element) return;

        if (loading) {
            element.classList.add('loading');
            element.disabled = true;
        } else {
            element.classList.remove('loading');
            element.disabled = false;
        }
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.classList.add('show');
        }, 100);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
} 