const fs = require('fs');
const path = require('path');

// Create directory structure
const directories = [
    'src',
    'src/components',
    'src/styles',
    'src/scripts',
    'src/contracts',
    'src/assets',
    'src/assets/images',
    'src/assets/sounds',
    'public',
    'docs'
];

// File mappings
const fileMapping = {
    // Components
    'src/components': [
        'balance-widget-template.html',
        'nft-collection.html',
        'nft-marketplace.html',
        'nft-mint.html',
        'nft-staking.html'
    ],
    // Styles
    'src/styles': [
        'balance-styles.css',
        'cosmic-background.css',
        'mining-animations.css',
        'nft.css',
        'shared-components.css',
        'staking.css',
        'styles.css',
        'styles-mining.css',
        'styles-nft.css'
    ],
    // Scripts
    'src/scripts': [
        'blockchain.js',
        'mining-system.js',
        'nft-system.js',
        'staking-system.js',
        'wallet-sync.js',
        'transaction-handler.js',
        'mining-animations.js',
        'cosmic-integration.js',
        'global-state-sync.js'
    ],
    // Contracts
    'src/contracts': [
        'contracts/*'
    ],
    // Public
    'public': [
        'index.html',
        'mining.html',
        'staking.html',
        'nft.html',
        'CONVERT.html',
        'blockchainscan.html'
    ],
    // Documentation
    'docs': [
        'setup-development-environment.md',
        'cisp-blockchain-specifications.md',
        'INSTALL_GIT.md'
    ]
};

// Create directories
directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`Created directory: ${dir}`);
    }
});

// Move files
Object.entries(fileMapping).forEach(([targetDir, files]) => {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            const targetPath = path.join(targetDir, path.basename(file));
            fs.renameSync(file, targetPath);
            console.log(`Moved ${file} to ${targetPath}`);
        }
    });
});

console.log('Project organization complete!'); 