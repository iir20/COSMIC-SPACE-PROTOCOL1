/**
 * Cosmic Space Protocol - Mining Worker
 * Web Worker script for mining operations
 */

// Worker state
let isRunning = false;
let hashRate = 0;
let difficulty = 1;
let address = '';
let hashCounter = 0;
let lastReportTime = 0;
let miningInterval = null;

// Handle messages from main thread
self.onmessage = function(event) {
    const { type, data } = event.data;
    
    switch (type) {
        case 'start':
            startMining(data);
            break;
            
        case 'stop':
            stopMining();
            break;
            
        case 'updateSettings':
            updateSettings(data);
            break;
            
        default:
            console.log('Unknown message type:', type);
    }
};

// Start mining process
function startMining(settings) {
    if (isRunning) {
        console.log('Mining already in progress');
        return;
    }
    
    try {
        // Extract settings
        address = settings.address || 'UNKNOWN_WALLET';
        difficulty = settings.difficulty || 1;
        
        // Reset counters
        hashCounter = 0;
        lastReportTime = Date.now();
        
        // Set running flag
        isRunning = true;
        
        // Start mining loop
        console.log('Starting mining process with difficulty:', difficulty);
        
        // Report initial hash rate
        reportHashRate(0);
        
        // Start mining interval
        miningInterval = setInterval(mineBlock, 100);
    } catch (error) {
        console.error('Error starting mining:', error);
        self.postMessage({
            type: 'error',
            data: {
                message: 'Failed to start mining process',
                error: error.message
            }
        });
    }
}

// Stop mining process
function stopMining() {
    if (!isRunning) return;
    
    // Clear interval
    if (miningInterval) {
        clearInterval(miningInterval);
        miningInterval = null;
    }
    
    // Update flags
    isRunning = false;
    
    // Report final hash rate
    reportHashRate(0);
    
    console.log('Mining stopped');
}

// Update mining settings
function updateSettings(settings) {
    // Update only if running
    if (!isRunning) return;
    
    // Update settings
    if (settings.address) address = settings.address;
    if (settings.difficulty) difficulty = settings.difficulty;
    
    console.log('Mining settings updated:', settings);
}

// Mine a block (simulated)
function mineBlock() {
    if (!isRunning) return;
    
    // Simulate hashing multiple blocks
    const hashesPerCycle = Math.floor(Math.random() * 1000) + 500;
    hashCounter += hashesPerCycle;
    
    // Periodically report hash rate
    const now = Date.now();
    if (now - lastReportTime >= 2000) {
        // Calculate hash rate (hashes per second)
        const elapsed = (now - lastReportTime) / 1000;
        const currentHashRate = Math.floor(hashCounter / elapsed);
        
        // Report hash rate
        reportHashRate(currentHashRate);
        
        // Reset counters
        hashCounter = 0;
        lastReportTime = now;
    }
    
    // Occasionally find a block based on difficulty
    // Higher difficulty = less chance of finding a block
    const findProbability = 0.1 / Math.pow(difficulty, 0.5);
    if (Math.random() < findProbability) {
        // Generate a hash
        const hash = generateRandomHash();
        
        // Report the found block
        reportFoundBlock(hash);
    }
}

// Report current hash rate to main thread
function reportHashRate(rate) {
    hashRate = rate;
    
    self.postMessage({
        type: 'hashRate',
        data: rate
    });
}

// Report found block to main thread
function reportFoundBlock(hash) {
    const nonce = Math.floor(Math.random() * 1000000);
    
    self.postMessage({
        type: 'block',
        data: {
            hash: hash,
            nonce: nonce,
            miner: address,
            timestamp: Date.now(),
            difficulty: difficulty
        }
    });
}

// Generate a random hash (simulated)
function generateRandomHash() {
    const characters = '0123456789abcdef';
    let hash = '0x';
    
    // Generate 64 hex characters
    for (let i = 0; i < 64; i++) {
        hash += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    
    return hash;
}

// Log message
function log(message) {
    console.log('[Mining Worker]', message);
}

// Report initialization to main thread
self.postMessage({
    type: 'initialized',
    data: {
        timestamp: Date.now()
    }
}); 