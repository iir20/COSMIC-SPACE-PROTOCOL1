class NFTCollectionManager {
    constructor() {
        this.nftContract = null;
        this.currentTab = 'collection';
        this.selectedNFTs = new Set();
        this.nfts = [];
        this.isLoading = false;
        this.initializeUI();
    }

    async initializeUI() {
        try {
            // Initialize tab switching
            const tabs = document.querySelectorAll('.tab-button');
            tabs.forEach(tab => {
                tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
            });

            // Initialize collection actions
            document.getElementById('select-all')?.addEventListener('click', () => this.toggleSelectAll());
            document.getElementById('batch-stake')?.addEventListener('click', () => this.batchStake());
            document.getElementById('batch-list')?.addEventListener('click', () => this.batchList());
            document.getElementById('refresh-collection')?.addEventListener('click', () => this.refreshCollection());

            // Listen for wallet changes
            window.walletManager.addWalletChangeListener(async (walletState) => {
                if (walletState.isConnected) {
                    this.nftContract = window.walletManager.getContract('nft');
                    await this.loadCollectionData(walletState.address);
                } else {
                    this.clearCollectionData();
                }
            });

            // Load initial data if wallet is connected
            if (window.walletManager.isWalletConnected()) {
                this.nftContract = window.walletManager.getContract('nft');
                await this.loadCollectionData(window.walletManager.getAccount());
            }

            console.log('NFT Collection Manager initialized');
        } catch (error) {
            console.error('Error initializing NFT Collection Manager:', error);
            this.showError('Failed to initialize NFT collection');
        }
    }

    async loadCollectionData(address) {
        if (!address || !this.nftContract) return;

        try {
            this.isLoading = true;
            this.updateLoadingState(true);

            // Get NFTs owned by address
            const balance = await this.nftContract.methods.balanceOf(address).call();
            this.nfts = [];

            for (let i = 0; i < balance; i++) {
                const tokenId = await this.nftContract.methods.tokenOfOwnerByIndex(address, i).call();
                const tokenURI = await this.nftContract.methods.tokenURI(tokenId).call();
                const metadata = await this.fetchMetadata(tokenURI);

                this.nfts.push({
                    id: tokenId,
                    ...metadata,
                    owner: address
                });
            }

            // Update UI
            this.renderCollection();
            this.updateStats();
        } catch (error) {
            console.error('Error loading collection data:', error);
            this.showError('Failed to load NFT collection');
        } finally {
            this.isLoading = false;
            this.updateLoadingState(false);
        }
    }

    async fetchMetadata(uri) {
        try {
            const response = await fetch(uri);
            return await response.json();
        } catch (error) {
            console.error('Error fetching NFT metadata:', error);
            return {
                name: 'Unknown NFT',
                description: 'Metadata unavailable',
                image: 'placeholder.png'
            };
        }
    }

    renderCollection() {
        const container = document.querySelector('.nft-grid');
        if (!container) return;

        if (this.nfts.length === 0) {
            container.innerHTML = '<p class="no-nfts">No NFTs found in your collection</p>';
            return;
        }

        container.innerHTML = this.nfts.map(nft => this.createNFTCard(nft)).join('');

        // Add click handlers
        container.querySelectorAll('.nft-card').forEach(card => {
            card.addEventListener('click', () => {
                const nftId = card.dataset.nftId;
                this.toggleNFTSelection(nftId);
            });
        });
    }

    createNFTCard(nft) {
        return `
            <div class="nft-card ${nft.rarity?.toLowerCase() || ''}" data-nft-id="${nft.id}">
                <div class="nft-image-container">
                    <img src="${nft.image}" alt="${nft.name}" loading="lazy">
                    <div class="nft-overlay">
                        <div class="nft-actions">
                            <button class="action-button stake">Stake</button>
                            <button class="action-button list">List</button>
                        </div>
                    </div>
                </div>
                <div class="nft-info">
                    <h3>${nft.name}</h3>
                    <div class="nft-rarity">${nft.rarity || 'Common'}</div>
                    ${this.renderAttributes(nft.attributes)}
                </div>
            </div>
        `;
    }

    renderAttributes(attributes) {
        if (!attributes || attributes.length === 0) return '';

        return `
            <div class="nft-attributes">
                ${Object.entries(attributes).map(([key, value]) => `
                    <div class="attribute">
                        <span class="label">${key}</span>
                        <span class="value">${value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    toggleNFTSelection(nftId) {
        const card = document.querySelector(`[data-nft-id="${nftId}"]`);
        if (!card) return;

        if (this.selectedNFTs.has(nftId)) {
            this.selectedNFTs.delete(nftId);
            card.classList.remove('selected');
        } else {
            this.selectedNFTs.add(nftId);
            card.classList.add('selected');
        }

        this.updateActionButtons();
    }

    toggleSelectAll() {
        const allSelected = this.nfts.length === this.selectedNFTs.size;

        if (allSelected) {
            this.selectedNFTs.clear();
        } else {
            this.nfts.forEach(nft => this.selectedNFTs.add(nft.id));
        }

        this.renderCollection();
        this.updateActionButtons();
    }

    async batchStake() {
        if (this.selectedNFTs.size === 0) return;

        try {
            const stakingContract = window.walletManager.getContract('staking');
            if (!stakingContract) throw new Error('Staking contract not initialized');

            const nftIds = Array.from(this.selectedNFTs);
            await stakingContract.methods.batchStake(nftIds).send({
                from: window.walletManager.getAccount()
            });

            this.showSuccess('NFTs staked successfully!');
            await this.loadCollectionData(window.walletManager.getAccount());
        } catch (error) {
            console.error('Error staking NFTs:', error);
            this.showError('Failed to stake NFTs');
        }
    }

    async batchList() {
        if (this.selectedNFTs.size === 0) return;

        try {
            const marketplaceContract = window.walletManager.getContract('marketplace');
            if (!marketplaceContract) throw new Error('Marketplace contract not initialized');

            // Show listing modal
            this.showListingModal(Array.from(this.selectedNFTs));
        } catch (error) {
            console.error('Error preparing NFT listing:', error);
            this.showError('Failed to prepare NFT listing');
        }
    }

    updateActionButtons() {
        const batchStakeBtn = document.getElementById('batch-stake');
        const batchListBtn = document.getElementById('batch-list');
        const selectAllBtn = document.getElementById('select-all');

        if (batchStakeBtn) {
            batchStakeBtn.disabled = this.selectedNFTs.size === 0;
        }

        if (batchListBtn) {
            batchListBtn.disabled = this.selectedNFTs.size === 0;
        }

        if (selectAllBtn) {
            selectAllBtn.textContent = this.nfts.length === this.selectedNFTs.size ? 'Deselect All' : 'Select All';
        }
    }

    updateStats() {
        const statsContainer = document.querySelector('.collection-stats');
        if (!statsContainer) return;

        const stats = {
            total: this.nfts.length,
            common: this.nfts.filter(nft => nft.rarity?.toLowerCase() === 'common').length,
            rare: this.nfts.filter(nft => nft.rarity?.toLowerCase() === 'rare').length,
            epic: this.nfts.filter(nft => nft.rarity?.toLowerCase() === 'epic').length,
            legendary: this.nfts.filter(nft => nft.rarity?.toLowerCase() === 'legendary').length
        };

        statsContainer.innerHTML = `
            <div class="stat-item">
                <span class="stat-label">Total NFTs</span>
                <span class="stat-value">${stats.total}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Common</span>
                <span class="stat-value">${stats.common}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Rare</span>
                <span class="stat-value">${stats.rare}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Epic</span>
                <span class="stat-value">${stats.epic}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Legendary</span>
                <span class="stat-value">${stats.legendary}</span>
            </div>
        `;
    }

    updateLoadingState(isLoading) {
        const container = document.querySelector('.nft-grid');
        if (!container) return;

        if (isLoading) {
            container.innerHTML = `
                <div class="nft-loading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading your NFT collection...</p>
                </div>
            `;
        }
    }

    clearCollectionData() {
        this.nfts = [];
        this.selectedNFTs.clear();
        
        const container = document.querySelector('.nft-grid');
        if (container) {
            container.innerHTML = '<p class="no-nfts">Please connect your wallet to view your NFTs</p>';
        }

        this.updateStats();
        this.updateActionButtons();
    }

    showError(message) {
        if (window.notifications) {
            window.notifications.show(message, 'error');
        }
    }

    showSuccess(message) {
        if (window.notifications) {
            window.notifications.show(message, 'success');
        }
    }
}

// Initialize the manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.nftManager = new NFTCollectionManager();
}); 