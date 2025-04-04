/**
 * Enhanced Cosmic Effects for Cosmic Interstellar Space Protocol
 * 
 * This file provides advanced space-themed animations and visual effects
 * to enhance the user experience across all pages of the application.
 */

class EnhancedCosmicEffects {
    constructor() {
        this.isInitialized = false;
        this.particleContainer = null;
        this.animationFrameId = null;
        this.stars = [];
        this.nebulae = [];
        this.warpSpeed = false;
        this.mousePosition = { x: 0, y: 0 };
    }

    /**
     * Initialize the cosmic effects
     */
    init() {
        if (this.isInitialized) return;
        
        console.log('Initializing Enhanced Cosmic Effects');
        
        // Create canvas container for cosmic effects
        this.createEffectsContainer();
        
        // Generate stars
        this.generateStars(150);
        
        // Generate nebulae
        this.generateNebulae(3);
        
        // Add event listeners
        this.setupEventListeners();
        
        // Start animation loop
        this.startAnimationLoop();
        
        // Add CSS for additional effects
        this.injectStyles();
        
        // Apply page-specific enhancements
        this.applyPageSpecificEffects();
        
        this.isInitialized = true;
    }
    
    /**
     * Create the container for cosmic effects
     */
    createEffectsContainer() {
        // Create canvas element for stars
        this.particleContainer = document.createElement('canvas');
        this.particleContainer.className = 'cosmic-effects-canvas';
        this.particleContainer.style.position = 'fixed';
        this.particleContainer.style.top = '0';
        this.particleContainer.style.left = '0';
        this.particleContainer.style.width = '100%';
        this.particleContainer.style.height = '100%';
        this.particleContainer.style.pointerEvents = 'none';
        this.particleContainer.style.zIndex = '-1';
        
        // Add to body
        document.body.appendChild(this.particleContainer);
        
        // Set canvas size
        this.resizeCanvas();
    }
    
    /**
     * Generate stars for the background
     */
    generateStars(count = 100) {
        const canvas = this.particleContainer;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        this.stars = [];
        
        for (let i = 0; i < count; i++) {
            this.stars.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 1.5 + 0.5,
                color: this.getRandomStarColor(),
                speed: Math.random() * 0.05 + 0.01,
                blinking: Math.random() > 0.7,
                blinkState: 1.0,
                blinkRate: Math.random() * 0.02 + 0.005
            });
        }
    }
    
    /**
     * Generate nebulae for the background
     */
    generateNebulae(count = 2) {
        const canvas = this.particleContainer;
        const width = canvas.width;
        const height = canvas.height;
        
        this.nebulae = [];
        
        for (let i = 0; i < count; i++) {
            this.nebulae.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: Math.random() * 150 + 100,
                color: this.getRandomNebulaColor(),
                alpha: Math.random() * 0.2 + 0.05,
                speed: Math.random() * 0.001 + 0.0005,
                angle: Math.random() * Math.PI * 2,
                pulseRate: Math.random() * 0.005 + 0.001,
                pulseState: 0
            });
        }
    }
    
    /**
     * Start the animation loop
     */
    startAnimationLoop() {
        const render = () => {
            this.renderEffects();
            this.animationFrameId = requestAnimationFrame(render);
        };
        
        render();
    }
    
    /**
     * Render all cosmic effects
     */
    renderEffects() {
        const canvas = this.particleContainer;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        
        // Clear canvas
        ctx.clearRect(0, 0, width, height);
        
        // Render nebulae
        this.renderNebulae(ctx, width, height);
        
        // Render stars
        this.renderStars(ctx, width, height);
        
        // Render additional effects based on current page
        if (this.warpSpeed) {
            this.renderWarpEffect(ctx, width, height);
        }
    }
    
    /**
     * Render stars
     */
    renderStars(ctx, width, height) {
        // Update and render each star
        this.stars.forEach(star => {
            // Update position
            star.y += star.speed * (this.warpSpeed ? 5 : 1);
            
            // Wrap around if off screen
            if (star.y > height) {
                star.y = 0;
                star.x = Math.random() * width;
            }
            
            // Update blinking state if applicable
            if (star.blinking) {
                star.blinkState += star.blinkRate;
                if (star.blinkState > 1.0 || star.blinkState < 0.3) {
                    star.blinkRate *= -1;
                }
            }
            
            // Draw star
            ctx.beginPath();
            ctx.arc(star.x, star.y, star.radius * (star.blinking ? star.blinkState : 1), 0, Math.PI * 2);
            ctx.fillStyle = star.color;
            ctx.fill();
        });
    }
    
    /**
     * Render nebulae
     */
    renderNebulae(ctx, width, height) {
        this.nebulae.forEach(nebula => {
            // Update position slightly
            nebula.angle += nebula.speed;
            nebula.x += Math.cos(nebula.angle) * 0.2;
            nebula.y += Math.sin(nebula.angle) * 0.2;
            
            // Update pulse
            nebula.pulseState += nebula.pulseRate;
            if (nebula.pulseState > 1.0 || nebula.pulseState < 0) {
                nebula.pulseRate *= -1;
            }
            
            // Create gradient
            const gradient = ctx.createRadialGradient(
                nebula.x, nebula.y, 0,
                nebula.x, nebula.y, nebula.radius * (1 + nebula.pulseState * 0.2)
            );
            
            gradient.addColorStop(0, this.adjustAlpha(nebula.color, nebula.alpha * (0.7 + nebula.pulseState * 0.3)));
            gradient.addColorStop(1, this.adjustAlpha(nebula.color, 0));
            
            // Draw nebula
            ctx.beginPath();
            ctx.arc(nebula.x, nebula.y, nebula.radius * (1 + nebula.pulseState * 0.2), 0, Math.PI * 2);
            ctx.fillStyle = gradient;
            ctx.fill();
        });
    }
    
    /**
     * Render warp speed effect
     */
    renderWarpEffect(ctx, width, height) {
        const centerX = width / 2;
        const centerY = height / 2;
        
        for (let i = 0; i < 20; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * 100 + 50;
            const length = Math.random() * 50 + 10;
            
            const startX = centerX + Math.cos(angle) * distance;
            const startY = centerY + Math.sin(angle) * distance;
            const endX = startX + Math.cos(angle) * length;
            const endY = startY + Math.sin(angle) * length;
            
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.strokeStyle = this.getRandomStarColor();
            ctx.lineWidth = Math.random() * 1.5 + 0.5;
            ctx.stroke();
        }
    }
    
    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Resize canvas when window resizes
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Track mouse position for interactive effects
        document.addEventListener('mousemove', (e) => {
            this.mousePosition.x = e.clientX;
            this.mousePosition.y = e.clientY;
        });
        
        // Add click effect
        document.addEventListener('click', (e) => {
            this.createClickEffect(e.clientX, e.clientY);
        });
        
        // Toggle warp speed effect on page transition
        document.addEventListener('pagehide', () => {
            this.warpSpeed = true;
        });
        
        document.addEventListener('pageshow', () => {
            this.warpSpeed = false;
        });
    }
    
    /**
     * Create a visual effect on click
     */
    createClickEffect(x, y) {
        const clickEffect = document.createElement('div');
        clickEffect.className = 'cosmic-click-effect';
        clickEffect.style.position = 'fixed';
        clickEffect.style.left = `${x}px`;
        clickEffect.style.top = `${y}px`;
        clickEffect.style.transform = 'translate(-50%, -50%)';
        
        document.body.appendChild(clickEffect);
        
        // Remove after animation completes
        setTimeout(() => {
            clickEffect.remove();
        }, 1000);
    }
    
    /**
     * Resize canvas to match window size
     */
    resizeCanvas() {
        const canvas = this.particleContainer;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        
        // Regenerate stars and nebulae for new size
        this.generateStars(150);
        this.generateNebulae(3);
    }
    
    /**
     * Add hover effects to UI elements
     */
    enhanceUIElements() {
        // Add glow effect to buttons
        const buttons = document.querySelectorAll('button, .action-button, .cta-button');
        buttons.forEach(button => {
            if (!button.classList.contains('cosmic-enhanced')) {
                button.classList.add('cosmic-enhanced');
                button.addEventListener('mouseenter', () => {
                    this.createButtonGlowEffect(button);
                });
            }
        });
        
        // Add hover effects to cards
        const cards = document.querySelectorAll('.feature-card, .wallet-item, .nft-card');
        cards.forEach(card => {
            if (!card.classList.contains('cosmic-enhanced')) {
                card.classList.add('cosmic-enhanced');
                card.addEventListener('mouseenter', () => {
                    this.createCardTiltEffect(card);
                });
                card.addEventListener('mouseleave', () => {
                    this.removeCardTiltEffect(card);
                });
            }
        });
    }
    
    /**
     * Create a glow effect around a button
     */
    createButtonGlowEffect(button) {
        button.classList.add('cosmic-glow');
        
        // Remove effect after interaction
        const removeGlow = () => {
            button.classList.remove('cosmic-glow');
            button.removeEventListener('mouseleave', removeGlow);
            button.removeEventListener('click', removeGlow);
        };
        
        button.addEventListener('mouseleave', removeGlow);
        button.addEventListener('click', removeGlow);
    }
    
    /**
     * Create a tilt effect for cards
     */
    createCardTiltEffect(card) {
        card.style.transition = 'transform 0.3s ease';
        
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const percentX = (e.clientX - centerX) / (rect.width / 2);
            const percentY = (e.clientY - centerY) / (rect.height / 2);
            
            card.style.transform = `perspective(1000px) rotateX(${-percentY * 5}deg) rotateY(${percentX * 5}deg) scale(1.02)`;
        });
    }
    
    /**
     * Remove tilt effect from card
     */
    removeCardTiltEffect(card) {
        card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale(1)';
        card.removeEventListener('mousemove', () => {});
    }
    
    /**
     * Apply page-specific enhancements
     */
    applyPageSpecificEffects() {
        // Check current page and apply specific effects
        const currentPath = window.location.pathname;
        
        if (currentPath.includes('index.html') || currentPath.endsWith('/')) {
            this.enhanceHomePage();
        } else if (currentPath.includes('nft.html')) {
            this.enhanceNFTPage();
        } else if (currentPath.includes('home.html')) {
            this.enhanceDashboardPage();
        }
        
        // Enhance UI elements across all pages
        this.enhanceUIElements();
    }
    
    /**
     * Enhance the home/landing page
     */
    enhanceHomePage() {
        // Add floating elements to hero section
        const heroSection = document.querySelector('.hero-section');
        if (heroSection) {
            this.addFloatingElements(heroSection, 5);
        }
        
        // Add entrance animation to feature cards
        const featureCards = document.querySelectorAll('.feature-card');
        featureCards.forEach((card, index) => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            
            setTimeout(() => {
                card.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                card.style.opacity = '1';
                card.style.transform = 'translateY(0)';
            }, 300 + index * 150);
        });
    }
    
    /**
     * Enhance the NFT page
     */
    enhanceNFTPage() {
        // Add hover effects to NFT cards
        const nftCards = document.querySelectorAll('.nft-card');
        nftCards.forEach(card => {
            // Add glow effect based on rarity
            const rarity = card.getAttribute('data-rarity');
            if (rarity) {
                card.classList.add(`rarity-glow-${rarity.toLowerCase()}`);
            }
        });
        
        // Add animation to NFT mint button
        const mintButton = document.querySelector('[data-tab="mint"]');
        if (mintButton) {
            mintButton.classList.add('pulse-animation');
        }
    }
    
    /**
     * Enhance the dashboard/home page
     */
    enhanceDashboardPage() {
        // Add parallax effect to dashboard cards
        const dashboardCards = document.querySelectorAll('.dashboard-card');
        
        window.addEventListener('scroll', () => {
            const scrollY = window.scrollY;
            
            dashboardCards.forEach((card, index) => {
                card.style.transform = `translateY(${scrollY * (0.05 * (index % 3 + 1))}px)`;
            });
        });
        
        // Add pulse animation to mining button
        const miningStartButton = document.querySelector('#startMiningBtn');
        if (miningStartButton) {
            miningStartButton.classList.add('energy-pulse');
        }
    }
    
    /**
     * Add floating elements to container
     */
    addFloatingElements(container, count = 3) {
        for (let i = 0; i < count; i++) {
            const element = document.createElement('div');
            element.className = 'floating-cosmic-element';
            element.style.position = 'absolute';
            element.style.width = `${Math.random() * 50 + 20}px`;
            element.style.height = element.style.width;
            element.style.borderRadius = '50%';
            element.style.background = `radial-gradient(circle at center, ${this.getRandomNebulaColor()}, transparent)`;
            element.style.boxShadow = `0 0 ${Math.random() * 30 + 10}px ${this.getRandomNebulaColor()}`;
            element.style.left = `${Math.random() * 80 + 10}%`;
            element.style.top = `${Math.random() * 80 + 10}%`;
            element.style.opacity = `${Math.random() * 0.5 + 0.2}`;
            element.style.animation = `float ${Math.random() * 10 + 10}s infinite ${Math.random() * 5}s ease-in-out`;
            element.style.zIndex = '-1';
            
            container.appendChild(element);
        }
    }
    
    /**
     * Inject CSS for additional effects
     */
    injectStyles() {
        const styles = document.createElement('style');
        styles.textContent = `
            @keyframes float {
                0%, 100% { transform: translate(0, 0) rotate(0deg); }
                25% { transform: translate(5px, 15px) rotate(5deg); }
                50% { transform: translate(10px, -10px) rotate(-5deg); }
                75% { transform: translate(-10px, 10px) rotate(3deg); }
            }
            
            @keyframes pulse {
                0%, 100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(1.05); opacity: 1; }
            }
            
            @keyframes cosmic-click {
                0% { width: 0; height: 0; opacity: 0.5; }
                100% { width: 100px; height: 100px; opacity: 0; }
            }
            
            .cosmic-click-effect {
                position: fixed;
                border-radius: 50%;
                background: radial-gradient(circle at center, rgba(127, 0, 255, 0.8), transparent);
                pointer-events: none;
                z-index: 9999;
                animation: cosmic-click 1s forwards ease-out;
            }
            
            .cosmic-glow {
                box-shadow: 0 0 15px 5px rgba(127, 0, 255, 0.5);
            }
            
            .pulse-animation {
                animation: pulse 2s infinite ease-in-out;
            }
            
            .energy-pulse {
                position: relative;
            }
            
            .energy-pulse::after {
                content: '';
                position: absolute;
                top: -5px;
                left: -5px;
                right: -5px;
                bottom: -5px;
                border-radius: inherit;
                background: linear-gradient(135deg, #7f00ff, #e100ff);
                z-index: -1;
                opacity: 0.6;
                animation: pulse 2s infinite;
            }
            
            .rarity-glow-common {
                box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
            }
            
            .rarity-glow-uncommon {
                box-shadow: 0 0 15px rgba(69, 161, 98, 0.4);
            }
            
            .rarity-glow-rare {
                box-shadow: 0 0 20px rgba(32, 134, 227, 0.5);
            }
            
            .rarity-glow-epic {
                box-shadow: 0 0 25px rgba(146, 69, 230, 0.6);
            }
            
            .rarity-glow-legendary {
                box-shadow: 0 0 30px rgba(252, 186, 3, 0.7);
                animation: legendary-pulse 3s infinite;
            }
            
            @keyframes legendary-pulse {
                0%, 100% { box-shadow: 0 0 30px rgba(252, 186, 3, 0.7); }
                50% { box-shadow: 0 0 40px rgba(252, 186, 3, 0.9); }
            }
        `;
        
        document.head.appendChild(styles);
    }
    
    /**
     * Get a random star color
     */
    getRandomStarColor() {
        const colors = [
            '#ffffff', // White
            '#ffe9c4', // Yellowish
            '#d4fbff', // Blueish
            '#ffd6d6'  // Reddish
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Get a random nebula color
     */
    getRandomNebulaColor() {
        const colors = [
            '#7f00ff', // Purple
            '#e100ff', // Magenta
            '#00a1ff', // Blue
            '#ff5500'  // Orange
        ];
        
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    /**
     * Adjust alpha channel of a color
     */
    adjustAlpha(color, alpha) {
        // For hex colors
        if (color.startsWith('#')) {
            const r = parseInt(color.slice(1, 3), 16);
            const g = parseInt(color.slice(3, 5), 16);
            const b = parseInt(color.slice(5, 7), 16);
            return `rgba(${r}, ${g}, ${b}, ${alpha})`;
        }
        
        // For rgb colors
        if (color.startsWith('rgb')) {
            return color.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
        }
        
        // For rgba colors
        if (color.startsWith('rgba')) {
            return color.replace(/[\d\.]+\)$/, `${alpha})`);
        }
        
        return color;
    }
}

// Initialize and make globally available
const enhancedCosmicEffects = new EnhancedCosmicEffects();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    enhancedCosmicEffects.init();
});

// Make globally available
window.enhancedCosmicEffects = enhancedCosmicEffects; 