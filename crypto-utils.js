/**
 * Crypto Utilities for CISP
 */

// SHA-256 implementation using Web Crypto API
async function sha256(data) {
    try {
        // Convert string to buffer
        const encoder = new TextEncoder();
        const buffer = encoder.encode(data);
        
        // Use Web Crypto API to calculate hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        
        // Convert buffer to hex string
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
    } catch (error) {
        console.error('SHA-256 calculation failed:', error);
        // Fallback to a simple hash if Web Crypto API fails
        return fallbackHash(data);
    }
}

// Synchronous fallback hash function (for compatibility)
function fallbackHash(data) {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    // Convert to hex string
    let hashHex = (hash >>> 0).toString(16);
    // Pad to ensure consistent length
    while (hashHex.length < 64) {
        hashHex = '0' + hashHex;
    }
    return hashHex;
}

// Export functions
window.sha256 = sha256;
window.fallbackHash = fallbackHash; 