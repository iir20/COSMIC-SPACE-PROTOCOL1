/**
 * NFT Collection Page Fix
 * 
 * This script automatically runs when the NFT Collection page loads
 * and ensures that NFTs are properly displayed.
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('NFT Collection Page Fix loaded');
    
    // Try to fix the NFT collection display issues
    function fixNFTCollectionDisplay() {
        try {
            // Check if we are on the NFT collection page
            const collectionContainer = document.getElementById('nft-collection');
            if (!collectionContainer) {
                console.log('Not on NFT collection page, skipping fixes');
                return;
            }
            
            console.log('Detected NFT collection page, applying fixes...');
            
            // Create a loading message if collection is empty
            if (collectionContainer.children.length === 0) {
                collectionContainer.innerHTML = '<div class="loading-nfts">Loading your NFT collection...</div>';
            }
            
            // First, make sure all systems are initialized
            const walletReady = window.cispWallet && window.cispWallet.isInitialized;
            const nftSystemReady = window.nftSystem && typeof window.nftSystem.loadState === 'function';
            
            // If the wallet or NFT system is not ready, wait and try again
            if (!walletReady || !nftSystemReady) {
                console.log('Waiting for wallet and NFT systems to initialize...');
                setTimeout(fixNFTCollectionDisplay, 500);
                return;
            }
            
            // First, try to ensure wallet is connected if we have a stored wallet ID
            const storedWalletId = sessionStorage.getItem('current_wallet_id') || localStorage.getItem('current_wallet_id');
            if (storedWalletId && !window.cispWallet.isWalletConnected()) {
                if (window.cispWallet.wallets.has(storedWalletId)) {
                    console.log(`Reconnecting wallet: ${storedWalletId}`);
                    window.cispWallet.currentWallet = window.cispWallet.wallets.get(storedWalletId);
                    window.cispWallet._broadcastWalletChange();
                }
            }
            
            // Now check if wallet is connected
            if (!window.cispWallet.isWalletConnected()) {
                console.log('No wallet connected, displaying connect message');
                collectionContainer.innerHTML = '<div class="empty-collection">Please connect your wallet to view your NFTs</div>';
                
                // Also add a connect wallet button for convenience
                const connectButton = document.createElement('button');
                connectButton.className = 'connect-wallet-btn';
                connectButton.textContent = 'Connect Wallet';
                connectButton.onclick = () => {
                    // Show the wallet selection modal if available
                    const walletModal = document.getElementById('wallet-modal');
                    if (walletModal) {
                        walletModal.style.display = 'flex';
                    } else {
                        // Otherwise try to connect the first available wallet
                        const wallets = window.cispWallet.getAllWallets();
                        if (wallets.length > 0) {
                            window.cispWallet.connectWallet(wallets[0].address);
                        } else {
                            // Create a new wallet if none exists
                            window.cispWallet.createWallet();
                        }
                    }
                };
                collectionContainer.appendChild(connectButton);
                return;
            }
            
            // If we got here, wallet is connected, now load the NFTs
            console.log('Wallet connected, loading NFTs...');
            const address = window.cispWallet.currentWallet.address;
            
            // Force reload NFT state to ensure we have latest data
            window.nftSystem.loadState();
            
            // Check if user has any NFTs, if not, create a welcome NFT
            const userNFTs = window.nftSystem.getNFTsByOwner(address);
            if (!userNFTs || userNFTs.length === 0) {
                console.log('User has no NFTs, creating welcome NFT...');
                createWelcomeNFT(address);
                return; // Function will be called again after NFT creation
            }
            
            // Check if NFT system has display function
            if (typeof window.nftSystem.displayUserNFTs === 'function') {
                console.log('Using displayUserNFTs function to show NFTs');
                window.nftSystem.displayUserNFTs(collectionContainer, address);
            } else {
                // Fallback method: manually display NFTs
                console.log('Using fallback method to display NFTs');
                displayNFTsFallback(collectionContainer, address);
            }
        } catch (error) {
            console.error('Error fixing NFT collection display:', error);
        }
    }
    
    // Function to create welcome NFT for new users
    async function createWelcomeNFT(address) {
        try {
            console.log('Creating welcome NFT for', address);
            
            if (!window.nftSystem || !window.nftSystem.mintRandomNFT) {
                console.error('NFT system not available or missing mintRandomNFT function');
                return;
            }
            
            // Create a welcome NFT
            const welcomeNFT = await window.nftSystem.mintRandomNFT(address);
            console.log('Created welcome NFT:', welcomeNFT);
            
            // Notify the user
            if (window.notifications) {
                window.notifications.show('success', 'Welcome NFT created! Check your collection.');
            }
            
            // Reload the collection page
            setTimeout(fixNFTCollectionDisplay, 500);
        } catch (error) {
            console.error('Error creating welcome NFT:', error);
        }
    }
    
    // Fallback function to display NFTs if the NFT system doesn't have a display function
    function displayNFTsFallback(container, ownerAddress) {
        try {
            container.innerHTML = '';
            
            // Get NFTs for current wallet
            const userNFTs = Array.from(window.nftSystem.nfts.values())
                .filter(nft => nft.owner === ownerAddress);
                
            console.log(`Found ${userNFTs.length} NFTs for address ${ownerAddress}`);
            
            if (userNFTs.length === 0) {
                container.innerHTML = '<div class="empty-collection">No NFTs found in your collection</div>';
                return;
            }
            
            // Create a grid to display NFTs
            const nftGrid = document.createElement('div');
            nftGrid.className = 'nft-grid';
            container.appendChild(nftGrid);
            
            // Display each NFT
            userNFTs.forEach(nft => {
                // Create NFT card
                const nftCard = document.createElement('div');
                nftCard.className = `nft-card ${nft.rarity.toLowerCase()}`;
                nftCard.setAttribute('data-nft-id', nft.id);
                
                // Create NFT image
                const nftImage = document.createElement('img');
                nftImage.src = nft.imagePath || nft.image || `assets/nfts/${nft.category.toLowerCase()}_${nft.rarity.toLowerCase()}.png`;
                nftImage.alt = nft.name;
                nftImage.className = 'nft-image';
                nftCard.appendChild(nftImage);
                
                // Create NFT details
                const nftDetails = document.createElement('div');
                nftDetails.className = 'nft-details';
                
                const nftName = document.createElement('h3');
                nftName.textContent = nft.name;
                nftDetails.appendChild(nftName);
                
                const nftRarity = document.createElement('div');
                nftRarity.className = 'nft-rarity';
                nftRarity.textContent = nft.rarity;
                nftDetails.appendChild(nftRarity);
                
                const nftCategory = document.createElement('div');
                nftCategory.className = 'nft-category';
                nftCategory.textContent = nft.category;
                nftDetails.appendChild(nftCategory);
                
                nftCard.appendChild(nftDetails);
                nftGrid.appendChild(nftCard);
                
                // Add click event to show NFT details
                nftCard.addEventListener('click', () => {
                    showNFTDetails(nft);
                });
            });
        } catch (error) {
            console.error('Error in displayNFTsFallback:', error);
            container.innerHTML = '<div class="error-message">Error loading your NFT collection</div>';
        }
    }
    
    // Function to show NFT details
    function showNFTDetails(nft) {
        try {
            // Check if there's a modal already
            let modalElement = document.getElementById('nft-detail-modal');
            if (!modalElement) {
                // Create modal if it doesn't exist
                modalElement = document.createElement('div');
                modalElement.id = 'nft-detail-modal';
                modalElement.className = 'modal';
                document.body.appendChild(modalElement);
            }
            
            // Clear existing content
            modalElement.innerHTML = '';
            
            // Create modal content
            const modalContent = document.createElement('div');
            modalContent.className = 'modal-content';
            
            // Close button
            const closeBtn = document.createElement('span');
            closeBtn.className = 'close-modal';
            closeBtn.innerHTML = '&times;';
            closeBtn.onclick = () => {
                modalElement.style.display = 'none';
            };
            modalContent.appendChild(closeBtn);
            
            // NFT Image
            const nftImage = document.createElement('img');
            nftImage.src = nft.imagePath || nft.image || `assets/nfts/${nft.category.toLowerCase()}_${nft.rarity.toLowerCase()}.png`;
            nftImage.alt = nft.name;
            nftImage.className = 'nft-detail-image';
            modalContent.appendChild(nftImage);
            
            // NFT details
            const detailsDiv = document.createElement('div');
            detailsDiv.className = 'nft-detail-info';
            
            const nftName = document.createElement('h2');
            nftName.className = 'nft-detail-name';
            nftName.textContent = nft.name;
            detailsDiv.appendChild(nftName);
            
            const nftInfo = document.createElement('div');
            nftInfo.className = 'nft-detail-meta';
            nftInfo.innerHTML = `
                <p><strong>Category:</strong> ${nft.category}</p>
                <p><strong>Rarity:</strong> <span class="rarity-${nft.rarity.toLowerCase()}">${nft.rarity}</span></p>
                <p><strong>ID:</strong> ${nft.id}</p>
                <p><strong>Minted:</strong> ${new Date(nft.createdAt || nft.mintedAt).toLocaleString()}</p>
            `;
            detailsDiv.appendChild(nftInfo);
            
            // Attributes
            if (nft.attributes && Object.keys(nft.attributes).length > 0) {
                const attributesTitle = document.createElement('h3');
                attributesTitle.textContent = 'Attributes';
                detailsDiv.appendChild(attributesTitle);
                
                const attributesDiv = document.createElement('div');
                attributesDiv.className = 'nft-attributes';
                
                for (const [key, value] of Object.entries(nft.attributes)) {
                    const attribute = document.createElement('div');
                    attribute.className = 'nft-attribute';
                    attribute.innerHTML = `
                        <span class="attribute-name">${key}:</span>
                        <span class="attribute-value">${value}</span>
                    `;
                    attributesDiv.appendChild(attribute);
                }
                
                detailsDiv.appendChild(attributesDiv);
            }
            
            modalContent.appendChild(detailsDiv);
            modalElement.appendChild(modalContent);
            
            // Show the modal
            modalElement.style.display = 'flex';
            
            // Close when clicking outside the modal
            window.onclick = function(event) {
                if (event.target === modalElement) {
                    modalElement.style.display = "none";
                }
            };
        } catch (error) {
            console.error('Error showing NFT details:', error);
            if (window.notifications) {
                window.notifications.show('error', 'Error showing NFT details');
            }
        }
    }
    
    // Run the fix immediately and then again after a delay to ensure systems are loaded
    fixNFTCollectionDisplay();
    setTimeout(fixNFTCollectionDisplay, 1000);
    
    // Also add a refresh button to the page if it exists
    const refreshButton = document.querySelector('.refresh-nfts-button');
    if (refreshButton) {
        refreshButton.addEventListener('click', fixNFTCollectionDisplay);
    } else {
        // Create a refresh button if it doesn't exist
        const collectionHeader = document.querySelector('.collection-header');
        if (collectionHeader) {
            const newRefreshButton = document.createElement('button');
            newRefreshButton.className = 'refresh-nfts-button';
            newRefreshButton.innerHTML = '🔄 Refresh';
            newRefreshButton.addEventListener('click', fixNFTCollectionDisplay);
            collectionHeader.appendChild(newRefreshButton);
        }
    }
}); 