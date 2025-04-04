/**
 * Cosmic Space Protocol - NFT Marketplace System
 */

class NFTMarketplace {
    constructor() {
        this.listings = new Map();
        this.priceHistory = new Map();
        this.initialized = false;
        this.eventListeners = new Set();
        this.trendingCache = null;
        this.trendingCacheTime = 0;
        this.TRENDING_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
    }

    async initialize() {
        if (this.initialized) return true;

        try {
            console.log('Initializing NFT Marketplace...');
            
            // Load existing listings from storage
            await this.loadListings();
            
            // Set up event listeners
            this.setupEventListeners();
            
            this.initialized = true;
            console.log('NFT Marketplace initialized successfully');
            
            // Register globally
            window.nftMarketplace = this;
            
            return true;
        } catch (error) {
            console.error('Failed to initialize NFT Marketplace:', error);
            return false;
        }
    }

    async loadListings() {
        try {
            const stored = localStorage.getItem('nft_listings');
            if (stored) {
                const parsed = JSON.parse(stored);
                this.listings = new Map(Object.entries(parsed));
            }

            const storedHistory = localStorage.getItem('nft_price_history');
            if (storedHistory) {
                this.priceHistory = new Map(Object.entries(JSON.parse(storedHistory)));
            }
        } catch (error) {
            console.error('Error loading listings:', error);
        }
    }

    async listNFT(tokenId, price, metadata) {
        try {
            if (!window.cispWallet?.getCurrentWallet()) {
                throw new Error('Please connect your wallet first');
            }
            
            const listing = {
                tokenId,
                price,
                seller: window.cispWallet.getCurrentWallet().address,
                metadata,
                timestamp: Date.now()
            };

            this.listings.set(tokenId, listing);
            this.saveToPersistentStorage();
            this.notifyListeners('listing', listing);

            return true;
        } catch (error) {
            console.error('Error listing NFT:', error);
            throw error;
        }
    }

    async cancelListing(tokenId) {
        try {
            if (!this.listings.has(tokenId)) {
                throw new Error('Listing not found');
            }

            const listing = this.listings.get(tokenId);
            if (listing.seller !== window.cispWallet?.getCurrentWallet()?.address) {
                throw new Error('Only the seller can cancel the listing');
            }

            this.listings.delete(tokenId);
            this.saveToPersistentStorage();
            this.notifyListeners('cancel', { tokenId });

            return true;
        } catch (error) {
            console.error('Error canceling listing:', error);
            throw error;
        }
    }

    async buyNFT(tokenId) {
        try {
            if (!window.cispWallet?.getCurrentWallet()) {
                throw new Error('Please connect your wallet first');
            }

            const listing = this.listings.get(tokenId);
            if (!listing) {
                throw new Error('NFT not found');
            }

            const buyer = window.cispWallet.getCurrentWallet().address;
            if (buyer === listing.seller) {
                throw new Error('You cannot buy your own NFT');
            }

            // Check buyer's balance
            const balance = await window.cispWallet.getBalance('xcis');
            if (balance < listing.price) {
                throw new Error('Insufficient balance');
            }

            // Record price history
            this.recordPriceHistory(tokenId, listing.price);

            // Process transaction
            await this.processTransaction(buyer, listing.seller, listing.price);

            // Transfer NFT ownership
            await window.nftSystem.transferNFT(listing.seller, buyer, tokenId);

            // Remove listing
            this.listings.delete(tokenId);
            this.saveToPersistentStorage();

            // Notify listeners
            this.notifyListeners('sale', {
                tokenId,
                price: listing.price,
                buyer,
                seller: listing.seller
            });
            
            return true;
        } catch (error) {
            console.error('Error buying NFT:', error);
            throw error;
        }
    }

    async processTransaction(buyer, seller, amount) {
        try {
            // Transfer xCIS tokens
            await window.cispWallet.transferXCIS(seller, amount);
            
            // Update balances
            await window.cispWallet.updateBalances();
            
            return true;
        } catch (error) {
            console.error('Transaction failed:', error);
            throw error;
        }
    }

    recordPriceHistory(tokenId, price) {
        if (!this.priceHistory.has(tokenId)) {
            this.priceHistory.set(tokenId, []);
        }
        
        const history = this.priceHistory.get(tokenId);
        history.push({
            price,
            timestamp: Date.now()
        });
        
        // Keep only last 10 price points
        if (history.length > 10) {
            history.shift();
        }
        
        this.saveToPersistentStorage();
    }

    async getTrendingNFTs() {
        // Return cached results if available
        if (this.trendingCache && Date.now() - this.trendingCacheTime < this.TRENDING_CACHE_DURATION) {
            return this.trendingCache;
        }

        // Calculate trending based on recent sales and price changes
        const trending = Array.from(this.listings.entries())
            .map(([tokenId, listing]) => {
                const history = this.priceHistory.get(tokenId) || [];
                const recentViews = listing.metadata.views || 0;
                const priceChange = this.calculatePriceChange(history);
                
                return {
                    tokenId,
                    listing,
                    score: this.calculateTrendingScore(recentViews, priceChange, history.length)
                };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 6)
            .map(item => ({
                tokenId: item.tokenId,
                ...item.listing
            }));

        // Cache results
        this.trendingCache = trending;
        this.trendingCacheTime = Date.now();

        return trending;
    }

    calculatePriceChange(history) {
        if (history.length < 2) return 0;
        const latest = history[history.length - 1].price;
        const previous = history[history.length - 2].price;
        return ((latest - previous) / previous) * 100;
    }

    calculateTrendingScore(views, priceChange, salesCount) {
        // Weight different factors to determine trending score
        const viewWeight = 0.4;
        const priceWeight = 0.3;
        const salesWeight = 0.3;

        return (
            views * viewWeight +
            Math.abs(priceChange) * priceWeight +
            salesCount * salesWeight
        );
    }

    getListings(filters = {}) {
        let results = Array.from(this.listings.values());

        // Apply filters
        if (filters.minPrice) {
            results = results.filter(item => item.price >= filters.minPrice);
        }
        if (filters.maxPrice) {
            results = results.filter(item => item.price <= filters.maxPrice);
        }
        if (filters.rarity) {
            results = results.filter(item => item.metadata.rarity === filters.rarity);
        }
        if (filters.type) {
            results = results.filter(item => item.metadata.type === filters.type);
        }

        // Apply sorting
        if (filters.sortBy) {
            switch (filters.sortBy) {
                case 'price_asc':
                    results.sort((a, b) => a.price - b.price);
                    break;
                case 'price_desc':
                    results.sort((a, b) => b.price - a.price);
                    break;
                case 'recent':
                    results.sort((a, b) => b.timestamp - a.timestamp);
                    break;
            }
        }

        return results;
    }

    getPriceHistory(tokenId) {
        return this.priceHistory.get(tokenId) || [];
    }

    setupEventListeners() {
        window.addEventListener('walletChanged', () => {
            this.notifyListeners('walletChanged', {
                address: window.cispWallet?.getCurrentWallet()?.address
            });
        });
    }

    addListener(callback) {
        this.eventListeners.add(callback);
    }

    removeListener(callback) {
        this.eventListeners.delete(callback);
    }

    notifyListeners(event, data) {
        this.eventListeners.forEach(callback => {
            try {
                callback(event, data);
            } catch (error) {
                console.error('Error in marketplace event listener:', error);
                    }
                });
            }

    saveToPersistentStorage() {
        try {
            localStorage.setItem('nft_listings', JSON.stringify(Object.fromEntries(this.listings)));
            localStorage.setItem('nft_price_history', JSON.stringify(Object.fromEntries(this.priceHistory)));
        } catch (error) {
            console.error('Error saving to storage:', error);
        }
    }
}

// Initialize marketplace
const marketplace = new NFTMarketplace();
window.nftMarketplace = marketplace;

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    marketplace.initialize().catch(error => {
        console.error('Failed to initialize NFT marketplace:', error);
    });
}); 