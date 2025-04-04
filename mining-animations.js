// Mining Animation System for CISP
class MiningAnimations {
    constructor() {
        this.isActive = false;
        this.particles = [];
        this.maxParticles = 30;
        this.animationFrame = null;
        this.progressBar = null;
        this.progressValue = 0;
        this.container = null;
    }

    init() {
        this.container = document.getElementById('mining-animation-container');
        this.progressBar = document.getElementById('mining-progress-bar');
        
        if (!this.container || !this.progressBar) {
            console.error('Mining animation elements not found');
            return false;
        }

        // Setup event listeners for mining events
        this.setupEventListeners();
        return true;
    }

    setupEventListeners() {
        // Listen for mining start/stop events
        window.addEventListener('miningStarted', () => this.startAnimations());
        window.addEventListener('miningStopped', () => this.stopAnimations());
        window.addEventListener('blockMined', (event) => this.triggerBlockSuccess(event.detail));
        window.addEventListener('miningStatsUpdated', (event) => this.updateStats(event.detail));
    }

    startAnimations() {
        if (this.isActive) return;
        this.isActive = true;

        // Clear existing animations
        this.clearAnimations();

        // Start particle system
        this.createParticles();
        this.animateParticles();

        // Start progress bar animation
        this.startProgressBar();

        // Add active class to container
        this.container.classList.add('mining-active');
    }

    stopAnimations() {
        if (!this.isActive) return;
        this.isActive = false;

        // Stop animations
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
            this.animationFrame = null;
        }

        // Clear particles
        this.clearParticles();

        // Reset progress bar
        this.resetProgressBar();

        // Remove active class
        this.container.classList.remove('mining-active');
    }

    createParticles() {
        const particleContainer = document.getElementById('mining-particles');
        if (!particleContainer) return;

        // Clear existing particles
        this.clearParticles();

        // Create new particles
        for (let i = 0; i < this.maxParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'mining-particle';
            
            // Random initial position
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.top = `${Math.random() * 100}%`;
            
            // Random size
            const size = 2 + Math.random() * 3;
            particle.style.width = `${size}px`;
            particle.style.height = `${size}px`;
            
            // Random animation delay
            particle.style.animationDelay = `${Math.random() * 2}s`;
            
            particleContainer.appendChild(particle);
            this.particles.push(particle);
        }
    }

    clearParticles() {
        const particleContainer = document.getElementById('mining-particles');
        if (particleContainer) {
            particleContainer.innerHTML = '';
        }
        this.particles = [];
    }

    animateParticles() {
        if (!this.isActive) return;

        this.particles.forEach(particle => {
            // Get current position
            const top = parseFloat(particle.style.top);
            
            // Move particle upward
            if (top <= -10) {
                // Reset particle to bottom when it goes off screen
                particle.style.top = '110%';
                particle.style.left = `${Math.random() * 100}%`;
            } else {
                // Move particle up
                particle.style.top = `${top - 0.5}%`;
            }
        });

        // Continue animation loop
        this.animationFrame = requestAnimationFrame(() => this.animateParticles());
    }

    startProgressBar() {
        if (!this.progressBar) return;
        this.updateProgressBar();
    }

    updateProgressBar() {
        if (!this.isActive || !this.progressBar) return;

        // Increment progress
        this.progressValue = (this.progressValue + 1) % 100;
        this.progressBar.style.width = `${this.progressValue}%`;

        // Schedule next update
        setTimeout(() => this.updateProgressBar(), 100);
    }

    resetProgressBar() {
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
        this.progressValue = 0;
    }

    triggerBlockSuccess(details) {
        // Create success flash animation
        const flash = document.createElement('div');
        flash.className = 'mining-success-flash';
        this.container.appendChild(flash);

        // Remove flash after animation
        setTimeout(() => this.container.removeChild(flash), 1000);

        // Update reward display with animation
        this.updateRewardDisplay(details.reward);
    }

    updateRewardDisplay(reward) {
        const rewardElement = document.querySelector('[data-mining="last-reward"]');
        if (!rewardElement) return;

        // Update value with animation
        rewardElement.textContent = reward.toFixed(4);
        rewardElement.classList.add('value-updated');
        
        // Remove animation class after transition
        setTimeout(() => rewardElement.classList.remove('value-updated'), 1000);
    }

    updateStats(stats) {
        // Update all stat elements with animations
        const statElements = {
            'hashrate': stats.hashRate,
            'total': stats.totalMined,
            'last-reward': stats.lastReward
        };

        for (const [key, value] of Object.entries(statElements)) {
            const element = document.querySelector(`[data-mining="${key}"]`);
            if (element) {
                const oldValue = parseFloat(element.textContent);
                const newValue = typeof value === 'number' ? value : parseFloat(value);

                if (oldValue !== newValue) {
                    element.classList.add('value-updated');
                    setTimeout(() => element.classList.remove('value-updated'), 1000);
                }
            }
        }
    }
}

// Initialize mining animations
window.miningAnimations = new MiningAnimations();

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.miningAnimations.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiningAnimations;
} 