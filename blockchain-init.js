/**
 * Initialize blockchain and register with coordinator
 */
document.addEventListener('DOMContentLoaded', () => {
    // Create blockchain instance if not exists
    if (!window.blockchain) {
        window.blockchain = new Blockchain();
    }
    
    // Register with coordinator
    window.registerSystem('blockchain', window.blockchain);
}); 