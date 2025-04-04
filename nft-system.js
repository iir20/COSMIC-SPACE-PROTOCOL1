/**
 * Cosmic Space Protocol - NFT System
 * This file handles NFT creation, management and display functionality
 */

class NFTSystem {
    constructor() {
        this.nfts = new Map();
        this.isInitialized = false;
        this.categories = [
            'Planet', 
            'Star', 
            'Galaxy', 
            'Nebula', 
            'BlackHole', 
            'Comet', 
            'Asteroid', 
            'Satellite'
        ];
        this.rarityLevels = {
            'COMMON': { chance: 50, boost: 1, color: '#B0B0B0' },
            'UNCOMMON': { chance: 30, boost: 1.5, color: '#55AA55' },
            'RARE': { chance: 15, boost: 2, color: '#5555FF' },
            'EPIC': { chance: 4, boost: 3, color: '#AA55AA' },
            'LEGENDARY': { chance: 1, boost: 5, color: '#FFAA00' }
        };
        this.mintingHistory = [];
        
        // Load state when constructor is called
        this.init();
    }

    async init() {
        try {
            if (this.isInitialized) {
                console.log('NFT System already initialized');
                return;
            }

            await this.loadState();
            this.validateLoadedNFTs();
            
            console.log('NFT System initialized with', this.nfts.size, 'NFTs');
            this.isInitialized = true;
            
            // Dispatch event when NFT system is ready
            window.dispatchEvent(new CustomEvent('nft-system:initialized', {
                detail: { count: this.nfts.size }
            }));
        } catch (error) {
            console.error('Error initializing NFT system:', error);
        }
    }

    loadState() {
        try {
            const savedState = localStorage.getItem('nft_system');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                
                // Handle different storage formats
                if (Array.isArray(parsed)) {
                    this.nfts = new Map(parsed);
                } else if (typeof parsed === 'object') {
                    // Convert object to map
                    this.nfts = new Map();
                    Object.entries(parsed).forEach(([id, nft]) => {
                        this.nfts.set(id, nft);
                    });
                }
                
                console.log(`Loaded ${this.nfts.size} NFTs from storage`);
            } else {
                console.log('No saved NFTs found in storage');
                this.nfts = new Map();
            }
        } catch (error) {
            console.error('Error loading NFTs from storage:', error);
            this.nfts = new Map();
        }
        
        // Validate loaded NFTs
        this.validateLoadedNFTs();
    }

    validateLoadedNFTs() {
        let invalidCount = 0;
        let fixedCount = 0;
        
        for (const [id, nft] of this.nfts.entries()) {
            // Check for required fields
            if (!nft.id || !nft.owner || !nft.category || !nft.rarity) {
                console.warn(`Invalid NFT found with ID ${id}, removing it`);
                this.nfts.delete(id);
                invalidCount++;
                continue;
            }
            
            // Ensure attributes are in correct format
            if (!nft.attributes || !Array.isArray(nft.attributes)) {
                nft.attributes = this._generateAttributes(nft.category);
                fixedCount++;
            }
            
            // Ensure image path is set
            if (!nft.image) {
                nft.image = this._getImagePath(nft.category);
                fixedCount++;
            }
            
            // Ensure metadata is set
            if (!nft.metadata) {
                nft.metadata = {
                    description: this._generateDescription(nft.category, nft.rarity),
                    external_url: `https://cosmic-space-protocol.io/nft/${nft.id}`,
                    background_color: this._getBackgroundColor(nft.rarity)
                };
                fixedCount++;
            }
        }
        
        if (invalidCount > 0 || fixedCount > 0) {
            console.log(`Removed ${invalidCount} invalid NFTs and fixed ${fixedCount} NFTs during validation`);
            this.saveState(); // Save cleaned state
        }
    }

    saveState() {
        try {
            localStorage.setItem('nft_system', JSON.stringify(Array.from(this.nfts.entries())));
            
            // Dispatch event for cross-page synchronization
            document.dispatchEvent(new CustomEvent('nft:stateUpdated', { 
                detail: { count: this.nfts.size }
            }));
        } catch (error) {
            console.error('Error saving NFT state:', error);
        }
    }

    async mintRandomNFT(ownerAddress) {
        if (!ownerAddress) {
            console.error('Owner address is required to mint an NFT');
            throw new Error('Owner address is required');
        }
        
        // Pick random category
        const category = this.categories[Math.floor(Math.random() * this.categories.length)];
        
        // Determine rarity based on probabilities
        const rarity = this._determineRarity();
        
        // Mint the NFT
        return this.mintNFT(ownerAddress, category, rarity, true);
    }

    async mintNFT(ownerAddress, category = 'random', rarity = null, isWelcome = false) {
        try {
        if (!ownerAddress) {
            throw new Error('Owner address is required');
        }
            
            // Make sure the system is initialized
            if (!this.isInitialized) {
                await this.init();
        }
        
        const nftId = 'NFT' + Date.now() + Math.random().toString(36).substr(2, 9);
        
        // Determine category and rarity
        let finalCategory = category === 'random' ? 
            this.categories[Math.floor(Math.random() * this.categories.length)] : 
            category;

        const finalRarity = rarity || this._determineRarity();
        
        // Check if category is valid, if not default to Planet
        if (!this.categories.includes(finalCategory)) {
            console.warn(`Invalid category ${finalCategory}, defaulting to Planet`);
            finalCategory = 'Planet';
        }

        // Generate NFT data
        const nft = {
            id: nftId,
            name: this._generateName(finalCategory),
            category: finalCategory,
            rarity: finalRarity,
            owner: ownerAddress,
            createdAt: Date.now(),
            isWelcome: isWelcome,
            image: this._getImagePath(finalCategory),
            attributes: this._generateAttributes(finalCategory),
            metadata: {
                description: this._generateDescription(finalCategory, finalRarity),
                external_url: `https://cosmic-space-protocol.io/nft/${nftId}`,
                animation_url: isWelcome ? this._getAnimationPath(finalCategory) : null,
                background_color: this._getBackgroundColor(finalRarity)
            }
        };

        // Store the NFT
        this.nfts.set(nftId, nft);
        
        // Save updated state
        this.saveState();
        
        // Dispatch mint event
            window.dispatchEvent(new CustomEvent('nft:minted', {
            detail: {
                nftId: nftId,
                owner: ownerAddress,
                nft: nft
            }
        }));
        
        console.log(`Minted ${finalRarity} ${finalCategory} NFT for ${ownerAddress}: ${nft.name}`);
        
        return nft;
        } catch (error) {
            console.error('Error minting NFT:', error);
            throw error;
        }
    }

    _determineRarity() {
        const rand = Math.random() * 100;
        let cumulativeChance = 0;
        
        for (const [rarity, data] of Object.entries(this.rarityLevels)) {
            cumulativeChance += data.chance;
            if (rand <= cumulativeChance) {
                return rarity;
            }
        }
        
        return 'COMMON'; // Default fallback
    }

    _generateName(category) {
        // Array of cosmic prefixes
        const prefixes = [
            'Cosmic', 'Astral', 'Celestial', 'Nebulous', 'Stellar', 
            'Galactic', 'Interstellar', 'Solar', 'Lunar', 'Quantum',
            'Void', 'Nova', 'Pulsar', 'Neutron', 'Quasar', 'Dark',
            'Radiant', 'Glowing', 'Ancient', 'Primordial', 'Eternal'
        ];
        
        // Category-specific name components
        const componentsByCategory = {
            Planet: ['World', 'Sphere', 'Globe', 'Orb', 'Terra', 'Prime',
                     'Haven', 'Eden', 'Paradise', 'Sanctuary', 'Oasis'],
            Star: ['Sun', 'Light', 'Beacon', 'Illuminator', 'Furnace',
                   'Torch', 'Radiance', 'Brilliance', 'Flare', 'Luminary'],
            Galaxy: ['Cluster', 'Formation', 'Spiral', 'Collection', 'System',
                    'Network', 'Web', 'Expanse', 'Realm', 'Domain'],
            Nebula: ['Cloud', 'Mist', 'Veil', 'Shroud', 'Curtain',
                    'Weave', 'Tapestry', 'Void', 'Expanse', 'Dream'],
            BlackHole: ['Devourer', 'Singularity', 'Vortex', 'Abyss', 'Void',
                       'Maw', 'Gateway', 'Portal', 'Breach', 'Rift'],
            Comet: ['Traveler', 'Voyager', 'Messenger', 'Herald', 'Wanderer',
                   'Streaker', 'Pathfinder', 'Harbinger', 'Omen', 'Portent'],
            Asteroid: ['Fragment', 'Shard', 'Remnant', 'Chunk', 'Boulder',
                      'Splinter', 'Relic', 'Piece', 'Monolith', 'Rock'],
            Satellite: ['Observer', 'Watcher', 'Sentinel', 'Guardian', 'Monitor',
                       'Overseer', 'Scout', 'Spy', 'Lookout', 'Eye']
        };
        
        // Use category-specific components or default to generic ones
        const components = componentsByCategory[category] || ['Entity', 'Object', 'Body', 'Mass', 'Form'];
        
        // Add some numerical suffixes
        const suffixes = ['', '', '', '', '', 
                        '-' + Math.floor(Math.random() * 1000),
                        ' ' + String.fromCharCode(65 + Math.floor(Math.random() * 26)),
                        '-' + Math.floor(Math.random() * 10) + Math.floor(Math.random() * 10),
                        ' Prime', ' Alpha', ' Beta', ' Omega'];
        
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const component = components[Math.floor(Math.random() * components.length)];
        const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
        
        return `${prefix} ${component}${suffix}`;
    }

    _getImagePath(category) {
        // Default image paths based on category 
        // Assumes images are organized in nft-images folder by category
        const categoryFolder = category.toLowerCase();
        
        // Random number for image selection (assuming we have 5 images per category)
        const randomNum = Math.floor(Math.random() * 5) + 1;
        
        return `nft-images/${categoryFolder}/${categoryFolder}${randomNum}.png`;
    }

    _getAnimationPath(category) {
        // For welcome NFTs, we might want to provide a special animation
        return `nft-images/animations/${category.toLowerCase()}_welcome.webm`;
    }

    _getBackgroundColor(rarity) {
        // Return a hex color based on rarity
        return this.rarityLevels[rarity]?.color || '#000000';
    }

    _generateDescription(category, rarity) {
        const descriptions = {
            Planet: [
                "A mysterious cosmic world shrouded in mystery and wonder.",
                "An inhabitable planet with unique atmospheric conditions.",
                "A rocky world with potential for resource exploitation.",
                "An exotic planet with rare cosmic elements.",
                "A world with peculiar gravitational properties."
            ],
            Star: [
                "A brilliant cosmic light source illuminating the darkness of space.",
                "A star with unusual energy emissions and radiation patterns.",
                "A stellar body with extreme temperature and luminosity.",
                "A star in a unique phase of its life cycle.",
                "A beacon of energy in the cosmic void."
            ],
            Galaxy: [
                "A vast collection of star systems and cosmic matter.",
                "A spiral formation of stars, planets, and dark matter.",
                "A galaxy with unusual structural properties.",
                "A cosmic neighborhood containing billions of stars.",
                "An ancient gathering of stellar bodies and planetary systems."
            ],
            Nebula: [
                "A colorful cloud of cosmic gas and dust particles.",
                "A birthing ground for new stars and planetary systems.",
                "A spectacular display of light and color in the void of space.",
                "A remnant of stellar explosions and cosmic events.",
                "A misty formation of interstellar medium."
            ],
            BlackHole: [
                "A gravitational singularity devouring everything in its path.",
                "A cosmic vortex with extreme space-time distortion properties.",
                "A mysterious rift in the fabric of space and time.",
                "A massive collapsed star creating a point of infinite density.",
                "A cosmic phenomenon that bends light and matter around it."
            ],
            Comet: [
                "A traveling ice body visiting from the outer regions of the solar system.",
                "A cosmic messenger carrying ancient stellar material.",
                "A fast-moving celestial body with a distinctive tail.",
                "A time capsule from the early formation of the cosmos.",
                "A harbinger of change in cosmic cycles."
            ],
            Asteroid: [
                "A rocky remnant from the formation of the solar system.",
                "A mineral-rich cosmic body with exploitation potential.",
                "A wandering space rock in an elliptical orbit.",
                "A fragment of a larger planetary body.",
                "A potential danger and opportunity for cosmic explorers."
            ],
            Satellite: [
                "An artificial construct orbiting around a larger cosmic body.",
                "A monitoring station gathering data from its orbital position.",
                "A technological marvel designed for space observation.",
                "A communication relay point in the vastness of space.",
                "A strategic asset for cosmic exploration and research."
            ]
        };
        
        // Get descriptions for the category or use default
        const categoryDescriptions = descriptions[category] || [
            "A mysterious cosmic entity of unknown origin and properties.",
            "An unusual formation in the vastness of space.",
            "A cosmic anomaly defying conventional classification.",
            "A unique discovery in the cosmic exploration journey.",
            "A remarkable object of scientific and aesthetic interest."
        ];
        
        // Pick a random description
        const baseDesc = categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
        
        // Add rarity-specific text
        const rarityText = {
            COMMON: "A fairly common specimen in the universe.",
            UNCOMMON: "A somewhat rare find in cosmic explorations.",
            RARE: "A rare discovery with unique properties.",
            EPIC: "An extraordinarily rare cosmic phenomenon.",
            LEGENDARY: "An almost mythical entity in the cosmos, spoken of in legends."
        };
        
        return `${baseDesc} ${rarityText[rarity] || ''}`;
    }

    _generateAttributes(category) {
        // Default attributes all NFTs should have
        const baseAttributes = [
            {
                trait_type: "Rarity",
                value: this._determineRarity()
            },
            {
                trait_type: "Category",
                value: category
            },
            {
                trait_type: "Age",
                value: `${Math.floor(Math.random() * 10000)} million years`
            }
        ];
        
        // Category-specific attributes
        const categoryAttributes = {
            Planet: [
                {
                    trait_type: "Size",
                    value: ["Tiny", "Small", "Medium", "Large", "Massive"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Type",
                    value: ["Rocky", "Gas Giant", "Ice World", "Ocean World", "Lava World", "Desert World"][Math.floor(Math.random() * 6)]
                },
                {
                    trait_type: "Atmosphere",
                    value: ["None", "Thin", "Earth-like", "Dense", "Exotic"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Habitability",
                    value: ["Uninhabitable", "Hostile", "Challenging", "Suitable", "Ideal"][Math.floor(Math.random() * 5)]
                }
            ],
            Star: [
                {
                    trait_type: "Class",
                    value: ["O", "B", "A", "F", "G", "K", "M", "Exotic"][Math.floor(Math.random() * 8)]
                },
                {
                    trait_type: "Temperature",
                    value: `${Math.floor(Math.random() * 30000) + 2000}K`
                },
                {
                    trait_type: "Size",
                    value: ["Dwarf", "Main Sequence", "Giant", "Supergiant", "Hypergiant"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Stability",
                    value: ["Unstable", "Variable", "Stable", "Extremely Stable"][Math.floor(Math.random() * 4)]
                }
            ],
            Galaxy: [
                {
                    trait_type: "Type",
                    value: ["Spiral", "Elliptical", "Irregular", "Ring", "Lenticular"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Size",
                    value: ["Dwarf", "Standard", "Giant", "Supergiant"][Math.floor(Math.random() * 4)]
                },
                {
                    trait_type: "Star Count",
                    value: `${Math.floor(Math.random() * 900) + 100} billion`
                },
                {
                    trait_type: "Activity",
                    value: ["Dormant", "Low", "Active", "Highly Active"][Math.floor(Math.random() * 4)]
                }
            ],
            Nebula: [
                {
                    trait_type: "Type",
                    value: ["Emission", "Reflection", "Dark", "Planetary", "Supernova Remnant"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Composition",
                    value: ["Hydrogen", "Helium", "Oxygen", "Nitrogen", "Mixed"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Luminosity",
                    value: ["Dim", "Moderate", "Bright", "Brilliant"][Math.floor(Math.random() * 4)]
                },
                {
                    trait_type: "Color Spectrum",
                    value: ["Monochromatic", "Dual-tone", "Multi-spectral", "Full Spectrum"][Math.floor(Math.random() * 4)]
                }
            ],
            BlackHole: [
                {
                    trait_type: "Type",
                    value: ["Stellar", "Intermediate", "Supermassive", "Primordial", "Quantum"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Mass",
                    value: `${Math.floor(Math.random() * 1000) + 1} solar masses`
                },
                {
                    trait_type: "Rotation",
                    value: ["Non-rotating", "Slow", "Moderate", "Fast", "Extreme"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Activity",
                    value: ["Dormant", "Feeding", "Ejecting", "Merging"][Math.floor(Math.random() * 4)]
                }
            ],
            Comet: [
                {
                    trait_type: "Composition",
                    value: ["Icy", "Rocky", "Mixed", "Exotic"][Math.floor(Math.random() * 4)]
                },
                {
                    trait_type: "Orbit Period",
                    value: `${Math.floor(Math.random() * 900) + 50} years`
                },
                {
                    trait_type: "Tail Length",
                    value: ["Short", "Medium", "Long", "Spectacular"][Math.floor(Math.random() * 4)]
                },
                {
                    trait_type: "Origin",
                    value: ["Kuiper Belt", "Oort Cloud", "Intergalactic", "Unknown"][Math.floor(Math.random() * 4)]
                }
            ],
            Asteroid: [
                {
                    trait_type: "Composition",
                    value: ["Carbonaceous", "Silicaceous", "Metallic", "Mixed"][Math.floor(Math.random() * 4)]
                },
                {
                    trait_type: "Size",
                    value: `${Math.floor(Math.random() * 1000) + 1} km`
                },
                {
                    trait_type: "Shape",
                    value: ["Spherical", "Elliptical", "Irregular", "Oblong"][Math.floor(Math.random() * 4)]
                },
                {
                    trait_type: "Resource Value",
                    value: ["Low", "Moderate", "High", "Exceptional"][Math.floor(Math.random() * 4)]
                }
            ],
            Satellite: [
                {
                    trait_type: "Type",
                    value: ["Natural", "Artificial", "Hybrid", "Unknown"][Math.floor(Math.random() * 4)]
                },
                {
                    trait_type: "Function",
                    value: ["Observation", "Communication", "Research", "Defense", "Multi-purpose"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Technology Level",
                    value: ["Basic", "Standard", "Advanced", "Cutting-edge", "Alien"][Math.floor(Math.random() * 5)]
                },
                {
                    trait_type: "Orbit",
                    value: ["Low", "Medium", "High", "Geostationary", "Irregular"][Math.floor(Math.random() * 5)]
                }
            ]
        };
        
        // Get attributes for the specific category or use empty array if category not found
        const specificAttributes = categoryAttributes[category] || [];
        
        return [...baseAttributes, ...specificAttributes];
    }

    getNFTsByOwner(ownerAddress) {
        if (!ownerAddress) return [];
        
        const ownedNFTs = [];
        this.nfts.forEach(nft => {
            if (nft.owner === ownerAddress) {
                ownedNFTs.push(nft);
            }
        });
        
        return ownedNFTs;
    }

    getNFT(nftId) {
        return this.nfts.get(nftId);
    }

    isOwner(nftId, address) {
        const nft = this.getNFT(nftId);
        return nft && nft.owner === address;
    }

    transferNFT(nftId, fromAddress, toAddress) {
        if (!fromAddress || !toAddress) {
            throw new Error('From and To addresses are required');
        }
        
        const nft = this.getNFT(nftId);
        
        if (!nft) {
            throw new Error(`NFT with ID ${nftId} not found`);
        }
        
        if (nft.owner !== fromAddress) {
            throw new Error('You do not own this NFT');
        }
        
        // Transfer ownership
        nft.owner = toAddress;
        nft.lastTransferTime = Date.now();
        
        // Save state
        this.saveState();
        
        // Dispatch transfer event
        document.dispatchEvent(new CustomEvent('nft:transferred', {
            detail: {
                nftId,
                fromAddress,
                toAddress,
                nft
            }
        }));
        
        return nft;
    }

    getTotalNFTCount() {
        return this.nfts.size;
    }

    getOwnedNFTCount(address) {
        if (!address) return 0;
        
        let count = 0;
        this.nfts.forEach(nft => {
            if (nft.owner === address) {
                count++;
            }
        });
        
        return count;
    }

    /**
     * Preload NFT images for all categories and rarities
     * This function is used by the NFT page to ensure images are loaded before displaying
     */
    loadNFTImages() {
        console.log('Preloading NFT images for all categories and rarities');
        
        // Define image format based on categories and rarities
        for (const category of this.categories) {
            for (const rarity of Object.keys(this.rarityLevels)) {
                for (let i = 1; i <= 5; i++) {
                    const imgPath = `nft-images/${category.toLowerCase()}/${category.toLowerCase()}${i}.png`;
                    
                    // Create an image element to preload
                    const img = new Image();
                    img.src = imgPath;
                    
                    // Log errors for missing images but don't throw
                    img.onerror = () => {
                        console.warn(`Could not load NFT image: ${imgPath}`);
                    };
                }
            }
        }
        
        return true;
    }
    
    /**
     * Display an NFT card in the provided container
     * @param {Object} nft - The NFT object to display
     * @param {HTMLElement} container - The container to append the card to
     * @param {Object} options - Additional options for display (listing, auction, etc.)
     */
    displayNFTCard(nft, container, options = {}) {
        if (!nft || !container) return;
        
        const card = document.createElement('div');
        card.className = 'nft-card';
        card.setAttribute('data-nft-id', nft.id);
        card.setAttribute('data-rarity', nft.rarity);
        
        // Add rarity class for styling
        card.classList.add(`rarity-${nft.rarity.toLowerCase()}`);
        
        // Check if it's being sold or auctioned
        const listing = options.listing;
        const auction = options.auction;
        
        // Create HTML for the card
        card.innerHTML = `
            <div class="nft-image">
                <img src="${nft.image || this._getImagePath(nft.category)}" 
                     alt="${nft.name}"
                     onerror="this.src='nft-images/placeholder.png'">
                <div class="nft-rarity ${nft.rarity.toLowerCase()}">
                    ${nft.rarity}
                </div>
                ${listing ? `<div class="nft-price">
                    <i class="fas fa-tag"></i> ${listing.price} xCIS
                </div>` : ''}
                ${auction ? `<div class="nft-price auction">
                    <i class="fas fa-gavel"></i> ${auction.currentPrice} xCIS
                </div>` : ''}
            </div>
            <div class="nft-info">
                <h3 class="nft-name">${nft.name}</h3>
                <p class="nft-category">${nft.category}</p>
            </div>
            <div class="nft-footer">
                <button class="action-button" onclick="showNFTDetails('${nft.id}')">
                    <i class="fas fa-info-circle"></i> Details
                </button>
            </div>
        `;
        
        // Add to container
        container.appendChild(card);
        
        return card;
    }
    
    /**
     * Display detailed view of an NFT
     * @param {Object} nft - The NFT object to display
     * @param {Object} listing - Optional listing info if NFT is for sale
     * @param {Object} auction - Optional auction info if NFT is being auctioned
     */
    showNFTDetails(nft, listing = null, auction = null) {
        if (!nft) return;
        
        // Create modal element
        const modal = document.createElement('div');
        modal.className = 'nft-modal';
        
        // Determine if current user is the owner
        const isOwner = window.cispWallet?.currentWallet?.address === nft.owner;
        
        // Create HTML for attributes
        const attributesHTML = nft.attributes.map(attr => `
            <div class="nft-attribute">
                <span class="attribute-name">${attr.trait_type}</span>
                <span class="attribute-value">${attr.value}</span>
            </div>
        `).join('');
        
        // Create HTML for the modal
        modal.innerHTML = `
            <div class="nft-modal-content">
                <button class="close-button"><i class="fas fa-times"></i></button>
                <div class="nft-detail-view">
                    <div class="nft-detail-image">
                        <img src="${nft.image || this._getImagePath(nft.category)}" 
                             alt="${nft.name}"
                             onerror="this.src='nft-images/placeholder.png'">
                        <div class="nft-rarity ${nft.rarity.toLowerCase()}">
                            ${nft.rarity}
                        </div>
                    </div>
                    <div class="nft-detail-info">
                        <h2>${nft.name}</h2>
                        <p class="nft-category">${nft.category}</p>
                        <p class="nft-owner">
                            Owned by: 
                            <span class="address">${this._formatAddress(nft.owner)}</span>
                        </p>
                        
                        <div class="nft-description">
                            <h3>Description</h3>
                            <p>${nft.metadata?.description || 'No description available.'}</p>
                        </div>
                        
                        <div class="nft-attributes">
                            <h3>Attributes</h3>
                            <div class="attributes-container">
                                ${attributesHTML}
                            </div>
                        </div>
                        
                        <div class="nft-actions">
                            ${this._getActionButtons(nft, isOwner, listing, auction)}
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to document
        document.body.appendChild(modal);
        
        // Set up event listeners
        modal.querySelector('.close-button').addEventListener('click', () => {
            modal.remove();
        });
        
        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }
    
    /**
     * Generate HTML for action buttons based on NFT status
     * @private
     */
    _getActionButtons(nft, isOwner, listing, auction) {
        if (isOwner) {
            if (listing || auction) {
                return `
                    <p>This NFT is currently ${listing ? 'listed for sale' : 'up for auction'}.</p>
                    <button class="action-button secondary" onclick="cancel${listing ? 'Listing' : 'Auction'}('${nft.id}')">
                        <i class="fas fa-times"></i> Cancel ${listing ? 'Listing' : 'Auction'}
                    </button>
                `;
            } else {
                return `
                    <button class="action-button" onclick="showListingModal('${nft.id}')">
                        <i class="fas fa-tag"></i> Sell NFT
                    </button>
                `;
            }
        } else {
            if (listing) {
                return `
                    <p class="price">Price: ${listing.price} xCIS</p>
                    <button class="action-button primary" onclick="buyNFT('${nft.id}')">
                        <i class="fas fa-shopping-cart"></i> Buy Now
                    </button>
                `;
            } else if (auction) {
                return `
                    <p>Current Bid: ${auction.currentPrice} xCIS</p>
                    <p>Ends in: <span class="auction-timer" data-end="${auction.endTime}"></span></p>
                    <div class="bid-form">
                        <input type="number" id="bid-amount-${nft.id}" 
                               min="${this._getMinimumBid(auction)}" 
                               step="0.1" 
                               placeholder="Bid amount">
                        <button class="action-button primary" onclick="placeBid('${nft.id}')">
                            <i class="fas fa-gavel"></i> Place Bid
                        </button>
                    </div>
                `;
            } else {
                return `
                    <p>This NFT is not currently for sale.</p>
                `;
            }
        }
    }
    
    /**
     * Format address for display
     * @private
     */
    _formatAddress(address) {
        if (!address) return '';
        return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    
    /**
     * Calculate minimum bid for an auction
     * @private
     */
    _getMinimumBid(auction) {
        if (!auction) return 0;
        return auction.currentPrice * 1.05; // 5% increase
    }

    /**
     * Generate image path for an NFT
     * @param {Object} nft - The NFT object
     * @returns {string} - The image path
     */
    getImagePath(nft) {
        if (!nft) return 'nft-images/placeholder.png';
        
        // Check if the NFT has a custom image path
        if (nft.imagePath) {
            return nft.imagePath;
        }
        
        // Generate path based on category and rarity
        try {
            const category = nft.category ? nft.category.toLowerCase() : 'unknown';
            const rarity = nft.rarity ? nft.rarity.toLowerCase() : 'common';
            
            // First try the specific image
            const specificPath = `nft-images/${category}/${rarity}.png`;
            
            // Fallback to category image
            const categoryPath = `nft-images/${category}.png`;
            
            // Fallback to rarity image
            const rarityPath = `nft-images/${rarity}.png`;
            
            // Final fallback
            const fallbackPath = 'nft-images/placeholder.png';
            
            // Return the path (the actual image check will be done by the img tag's onerror)
            return specificPath;
        } catch (error) {
            console.error('Error generating NFT image path:', error);
            return 'nft-images/placeholder.png';
        }
    }

    /**
     * Render an NFT card
     * @param {Object} nft - The NFT object
     * @returns {HTMLElement} - The NFT card element
     */
    renderNFTCard(nft) {
        if (!nft) return null;
        
        try {
            const nftCard = document.createElement('div');
            nftCard.className = `nft-card ${nft.rarity.toLowerCase()}`;
            nftCard.dataset.nftId = nft.id;
            
            // Get image path
            const imagePath = this.getImagePath(nft);
            
            nftCard.innerHTML = `
                <div class="nft-image-container">
                    <img src="${imagePath}" alt="${nft.name}" class="nft-image" 
                         onerror="this.onerror=null; this.src='nft-images/placeholder.png';">
                    <div class="nft-rarity-badge ${nft.rarity.toLowerCase()}">${nft.rarity}</div>
                </div>
                <div class="nft-details">
                    <h3 class="nft-name">${nft.name}</h3>
                    <p class="nft-category">${nft.category}</p>
                    <div class="nft-attributes">
                        ${this._renderAttributes(nft.attributes)}
                    </div>
                </div>
            `;
            
            // Add click event to show NFT details
            nftCard.addEventListener('click', () => {
                this.showNFTDetails(nft);
            });
            
            return nftCard;
        } catch (error) {
            console.error('Error rendering NFT card:', error);
            return null;
        }
    }

    /**
     * Render NFT attributes
     * @param {Object} attributes - The NFT attributes
     * @returns {string} - HTML string of attributes
     */
    _renderAttributes(attributes) {
        if (!attributes || Object.keys(attributes).length === 0) {
            return '<p class="no-attributes">No attributes</p>';
        }
        
        let html = '';
        for (const [key, value] of Object.entries(attributes)) {
            html += `<div class="nft-attribute"><span class="attribute-name">${key}:</span> <span class="attribute-value">${value}</span></div>`;
        }
        return html;
    }

    /**
     * Clean up resources to prevent memory leaks
     */
    cleanup() {
        try {
            console.log('Cleaning up NFT system resources');
            
            // Save state before cleanup
            this.saveState();
            
            // Remove any event listeners
            document.removeEventListener('nft:minted', this._handleNFTMinted);
            document.removeEventListener('nft:transferred', this._handleNFTTransferred);
            window.removeEventListener('storage', this._handleStorageChange);
            
            // Clear any timers
            if (this.autoSaveInterval) {
                clearInterval(this.autoSaveInterval);
                this.autoSaveInterval = null;
            }
            
            // Reset important state
            this.isInitialized = false;
            
            console.log('NFT system cleanup complete');
        } catch (error) {
            console.error('Error during NFT system cleanup:', error);
        }
    }

    /**
     * Improved error handling for NFT operations
     * @param {Function} operation - The operation to perform
     * @param {string} errorMessage - The error message prefix
     * @param {Object} defaultReturn - The default return value on error
     * @returns {Promise<any>} - The result of the operation
     */
    async _safeOperation(operation, errorMessage, defaultReturn = null) {
        try {
            return await operation();
        } catch (error) {
            console.error(`${errorMessage}:`, error);
            if (window.notifications) {
                window.notifications.show(error.message || errorMessage, 'error');
            }
            return defaultReturn;
        }
    }

    /**
     * Safely mint an NFT with error handling
     * @param {string} ownerAddress - Address of the owner
     * @param {string} category - NFT category
     * @param {string} rarity - NFT rarity
     * @param {boolean} isWelcome - Whether this is a welcome NFT
     * @returns {Promise<Object|null>} - The minted NFT or null on error
     */
    async safeMintNFT(ownerAddress, category = 'random', rarity = null, isWelcome = false) {
        try {
            if (!this.isInitialized) {
                await this.init(); 
            }
            
            if (!ownerAddress && window.cispWallet) {
                const currentWallet = window.cispWallet.getCurrentWallet();
                if (currentWallet) {
                    ownerAddress = currentWallet.address;
                } else {
                    throw new Error('Please connect your wallet to mint an NFT');
                }
            }
            
            return await this.mintNFT(ownerAddress, category, rarity, isWelcome);
        } catch (error) {
            console.error('Error in safeMintNFT:', error);
            if (window.notifications) {
                window.notifications.show(error.message || 'Failed to mint NFT', 'error');
            }
            return null;
        }
    }

    /**
     * Safely transfer an NFT with error handling
     * @param {string} nftId - ID of the NFT
     * @param {string} fromAddress - Address of the sender
     * @param {string} toAddress - Address of the recipient
     * @returns {Promise<Object|null>} - The transferred NFT or null on error
     */
    async safeTransferNFT(nftId, fromAddress, toAddress) {
        try {
            if (!this.isInitialized) {
                await this.init();
            }
            
            return await this.transferNFT(nftId, fromAddress, toAddress);
        } catch (error) {
            console.error('Error in safeTransferNFT:', error);
            if (window.notifications) {
                window.notifications.show(error.message || 'Failed to transfer NFT', 'error');
            }
            return false;
        }
    }

    // Add minting history functionality
    getMintingHistory(address) {
        if (!address) {
            return this.mintingHistory || [];
        }
        
        return (this.mintingHistory || []).filter(item => item.owner === address);
    }

    // Add minting record to history
    addMintRecord(nft, cost) {
        const record = {
            id: nft.id,
            name: nft.name,
            type: nft.type,
            rarity: nft.rarity,
            timestamp: Date.now(),
            cost: cost,
            owner: nft.owner
        };
        
        this.mintingHistory.push(record);
        
        // Save to local storage
        this.saveMintingHistory();
        
        return record;
    }
    
    // Save minting history to localStorage
    saveMintingHistory() {
        try {
            localStorage.setItem('nft_minting_history', JSON.stringify(this.mintingHistory));
        } catch (error) {
            console.error('Error saving minting history:', error);
        }
    }
    
    // Load minting history from localStorage
    loadMintingHistory() {
        try {
            const history = localStorage.getItem('nft_minting_history');
            if (history) {
                this.mintingHistory = JSON.parse(history);
                console.log(`Loaded ${this.mintingHistory.length} minting records from storage`);
            }
        } catch (error) {
            console.error('Error loading minting history:', error);
            this.mintingHistory = [];
        }
    }

    // Add the initialize method to maintain compatibility
    async initialize() {
        return this.init();
    }

    // Add getNFTs method for compatibility 
    getNFTs() {
        return Array.from(this.nfts.values());
    }
}

// Make the NFT system available globally
window.nftSystem = new NFTSystem();
console.log('NFT System globally registered as window.nftSystem');

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.nftSystem) {
        window.nftSystem.initialize().catch(error => {
            console.error('Failed to initialize NFT system:', error);
        });
    }
});

// Export for module usage
if (typeof module !== 'undefined') {
    module.exports = { NFTSystem };
} 