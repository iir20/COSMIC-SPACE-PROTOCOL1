const WALLET_CONFIG = {
    CHAIN_ID: '0x1', // Mainnet
    RPC_URL: 'https://mainnet.infura.io/v3/YOUR-PROJECT-ID',
    BLOCK_EXPLORER: 'https://etherscan.io',
    TOKEN_CONTRACT: '0x...', // Your token contract address
    NFT_CONTRACT: '0x...', // Your NFT contract address
    MINING_CONTRACT: '0x...', // Your mining contract address
    STAKING_CONTRACT: '0x...', // Your staking contract address
    
    // Network configuration
    NETWORKS: {
        mainnet: {
            chainId: '0x1',
            chainName: 'Ethereum Mainnet',
            nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://mainnet.infura.io/v3/YOUR-PROJECT-ID'],
            blockExplorerUrls: ['https://etherscan.io']
        },
        testnet: {
            chainId: '0x5',
            chainName: 'Goerli Testnet',
            nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18
            },
            rpcUrls: ['https://goerli.infura.io/v3/YOUR-PROJECT-ID'],
            blockExplorerUrls: ['https://goerli.etherscan.io']
        }
    },
    
    // Contract ABIs
    ABIS: {
        TOKEN_ABI: [], // Your token contract ABI
        NFT_ABI: [], // Your NFT contract ABI
        MINING_ABI: [], // Your mining contract ABI
        STAKING_ABI: [] // Your staking contract ABI
    },
    
    // Storage keys
    STORAGE_KEYS: {
        WALLET_ADDRESS: 'COSMIC_WALLET_ADDRESS',
        WALLET_DATA: 'COSMIC_WALLET_DATA',
        MINING_STATE: 'COSMIC_MINING_STATE',
        STAKING_STATE: 'COSMIC_STAKING_STATE',
        NFT_STATE: 'COSMIC_NFT_STATE'
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WALLET_CONFIG;
} 