// Mining Worker with Ethash implementation
let isRunning = false;
let difficulty = 0;
let miningPower = 1;
let contractAddr = null;
let wallet = null;
let startTime = null;
let hashCount = 0;
let targetHashRate = 0;
let lastSubmitTime = 0;
let ethash = null;

// Constants
const EPOCH_LENGTH = 30000; // blocks
const DAG_BYTES = 1024 * 1024 * 1024; // 1GB
const DATASET_BYTES_INIT = 1024 * 1024 * 1024; // 1GB
const CACHE_BYTES_INIT = 16 * 1024 * 1024; // 16MB
const MIX_BYTES = 128;
const HASH_BYTES = 64;
const DATASET_PARENTS = 256;
const CACHE_ROUNDS = 3;

// Initialize worker
self.onmessage = function(e) {
    const { type, data } = e.data;
    
    switch (type) {
        case 'init':
            initialize(data);
            break;
        case 'start':
            startMining();
            break;
        case 'stop':
            stopMining();
            break;
        case 'update_difficulty':
            updateDifficulty(data.difficulty);
            break;
        case 'update_power':
            updatePower(data.power);
            break;
    }
};

async function initialize(config) {
    try {
        contractAddr = config.contractAddr;
        wallet = config.wallet;
        difficulty = config.difficulty;
        miningPower = config.power;
        
        // Initialize Ethash parameters
        await initializeEthash();
        
        // Calculate initial target hash rate based on difficulty
        updateTargetHashRate();
        
        self.postMessage({ type: 'initialized' });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: 'Initialization error: ' + error.message
        });
    }
}

async function initializeEthash() {
    try {
        // Initialize cache and dataset for current epoch
        const epoch = Math.floor(Date.now() / (EPOCH_LENGTH * 15000));
        const seed = generateSeed(epoch);
        
        ethash = {
            cache: await generateCache(seed),
            dataset: null, // Will be generated on demand
            epoch: epoch,
            seed: seed
        };
        
        // Start dataset generation in background
        generateDataset();
    } catch (error) {
        throw new Error('Ethash initialization failed: ' + error.message);
    }
}

function startMining() {
    if (isRunning) return;
    
    isRunning = true;
    startTime = Date.now();
    hashCount = 0;
    lastSubmitTime = 0;
    
    mine();
}

function stopMining() {
    isRunning = false;
    self.postMessage({ type: 'stopped' });
}

function updateDifficulty(newDifficulty) {
    difficulty = newDifficulty;
    updateTargetHashRate();
}

function updatePower(newPower) {
    miningPower = newPower;
    updateTargetHashRate();
}

function updateTargetHashRate() {
    // Calculate target hash rate based on difficulty and mining power
    targetHashRate = (difficulty * miningPower) / 1000000;
}

async function mine() {
    try {
        if (!ethash || !ethash.cache) {
            throw new Error('Ethash not initialized');
        }
        
        while (isRunning) {
            // Generate nonce and calculate hash
            const nonce = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
            const blockNumber = Math.floor(Date.now() / 15000); // Approximate block number
            
            const { mixHash, result } = await hashimoto(
                blockNumber,
                ethash.cache,
                nonce,
                wallet
            );
            
            // Update hash count and report hash rate
            hashCount++;
            if (hashCount % 100 === 0) {
                const elapsed = (Date.now() - startTime) / 1000;
                const hashRate = hashCount / elapsed;
                self.postMessage({ type: 'hashrate', value: hashRate });
                
                // Adjust mining speed if needed
                if (hashRate > targetHashRate * 1.1) {
                    await sleep(1);
                }
            }
            
            // Check if hash meets target
            if (meetsTarget(result, difficulty)) {
                // Submit block
                const now = Date.now();
                if (now - lastSubmitTime >= 1000) { // Rate limit submissions
                    self.postMessage({
                        type: 'block_mined',
                        nonce: nonce,
                        hash: result,
                        mixHash: mixHash,
                        blockNumber: blockNumber
                    });
                    lastSubmitTime = now;
                }
            }
            
            // Check if epoch changed
            const currentEpoch = Math.floor(blockNumber / EPOCH_LENGTH);
            if (currentEpoch !== ethash.epoch) {
                await initializeEthash();
            }
            
            // Throttle mining based on power setting
            if (miningPower < 3) {
                await sleep(Math.max(1, Math.floor(10 / miningPower)));
            }
        }
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: 'Mining error: ' + error.message
        });
        stopMining();
    }
}

// Ethash implementation
async function hashimoto(blockNumber, cache, nonce, addr) {
    const n = Math.floor(DAG_BYTES / HASH_BYTES);
    const w = Math.floor(MIX_BYTES / HASH_BYTES);
    const mixhashes = Math.floor(MIX_BYTES / HASH_BYTES);
    
    // Initial hash
    const s = await sha3(
        new Uint8Array([
            ...hexToBytes(addr),
            ...numberToBytes(nonce),
            ...numberToBytes(blockNumber)
        ])
    );
    
    // Mix
    let mix = new Uint8Array(MIX_BYTES);
    for (let i = 0; i < mixhashes; i++) {
        mix.set(s, i * HASH_BYTES);
    }
    
    // Generate dataset items and mix
    for (let i = 0; i < DATASET_PARENTS; i++) {
        const p = fnv(i ^ s[0], mix[i % w]) % n;
        const item = calcDatasetItem(cache, p);
        mix = fnvVector(mix, item);
    }
    
    // Compress mix
    const cmix = new Uint8Array(MIX_BYTES / 4);
    for (let i = 0; i < mix.length; i += 4) {
        cmix[i / 4] = fnv(fnv(fnv(mix[i], mix[i + 1]), mix[i + 2]), mix[i + 3]);
    }
    
    // Final hash
    const result = await sha3(new Uint8Array([...s, ...cmix]));
    
    return {
        mixHash: bytesToHex(cmix),
        result: bytesToHex(result)
    };
}

async function generateCache(seed) {
    const n = Math.floor(CACHE_BYTES_INIT / HASH_BYTES);
    const cache = new Uint8Array(n * HASH_BYTES);
    
    // Generate initial cache
    let currentHash = await sha3(seed);
    cache.set(currentHash, 0);
    
    for (let i = 1; i < n; i++) {
        currentHash = await sha3(currentHash);
        cache.set(currentHash, i * HASH_BYTES);
    }
    
    // Perform cache rounds
    for (let i = 0; i < CACHE_ROUNDS; i++) {
        for (let j = 0; j < n; j++) {
            const v = new Uint32Array(cache.buffer, j * HASH_BYTES, HASH_BYTES / 4)[0] % n;
            const newData = await sha3(xorBytes(
                cache.slice(j * HASH_BYTES, (j + 1) * HASH_BYTES),
                cache.slice(v * HASH_BYTES, (v + 1) * HASH_BYTES)
            ));
            cache.set(newData, j * HASH_BYTES);
        }
    }
    
    return cache;
}

async function generateDataset() {
    if (!ethash || !ethash.cache) return;
    
    try {
        const n = Math.floor(DATASET_BYTES_INIT / HASH_BYTES);
        ethash.dataset = new Uint8Array(n * HASH_BYTES);
        
        for (let i = 0; i < n; i++) {
            const item = calcDatasetItem(ethash.cache, i);
            ethash.dataset.set(item, i * HASH_BYTES);
            
            // Report progress every 1%
            if (i % Math.floor(n / 100) === 0) {
                self.postMessage({
                    type: 'dataset_progress',
                    progress: Math.floor((i / n) * 100)
                });
            }
        }
        
        self.postMessage({ type: 'dataset_generated' });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: 'Dataset generation failed: ' + error.message
        });
    }
}

// Utility functions
function generateSeed(epoch) {
    return new Uint8Array(32).map(() => Math.floor(Math.random() * 256));
}

async function sha3(data) {
    const buffer = await crypto.subtle.digest('SHA-256', data);
    return new Uint8Array(buffer);
}

function fnv(v1, v2) {
    return ((v1 * 0x01000193) ^ v2) >>> 0;
}

function fnvVector(v1, v2) {
    const result = new Uint8Array(v1.length);
    for (let i = 0; i < v1.length; i++) {
        result[i] = fnv(v1[i], v2[i]);
    }
    return result;
}

function meetsTarget(hash, difficulty) {
    const target = '0'.repeat(difficulty);
    return hash.startsWith(target);
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
}

function numberToBytes(n) {
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = (n >> (8 * i)) & 0xff;
    }
    return bytes;
}

function xorBytes(a, b) {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i];
    }
    return result;
}

function calcDatasetItem(cache, i) {
    const n = Math.floor(cache.length / HASH_BYTES);
    const r = HASH_BYTES / HASH_BYTES;
    
    let mix = new Uint8Array(HASH_BYTES);
    const data = new Uint8Array([...numberToBytes(i)]);
    mix = sha3(data);
    
    for (let j = 0; j < DATASET_PARENTS; j++) {
        const cacheIndex = fnv(i ^ j, mix[j % r]) % n;
        mix = fnvVector(mix, cache.slice(cacheIndex * HASH_BYTES, (cacheIndex + 1) * HASH_BYTES));
    }
    
    return mix;
} 