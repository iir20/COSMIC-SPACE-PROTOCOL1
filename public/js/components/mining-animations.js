/**
 * Mining Animations Component
 */
class MiningAnimations {
    constructor() {
        this.container = null;
        this.particles = [];
        this.isAnimating = false;
        this.progressBar = null;
        this.progress = 0;
        this.maxParticles = 50;
    }

    init() {
        try {
            // Get animation container
            this.container = document.getElementById('mining-animation-container');
            if (!this.container) {
                throw new Error('Mining animation container not found');
            }

            // Get progress bar
            this.progressBar = document.getElementById('mining-progress-bar');
            if (!this.progressBar) {
                throw new Error('Mining progress bar not found');
            }

            // Set up event listeners
            this.setupEventListeners();

            console.log('Mining animations initialized');
            return true;
        } catch (error) {
            console.error('Failed to initialize mining animations:', error);
            return false;
        }
    }

    setupEventListeners() {
        // Listen for mining events
        window.addEventListener('miningStarted', () => this.startAnimation());
        window.addEventListener('miningStopped', () => this.stopAnimation());
        window.addEventListener('blockMined', (event) => this.triggerSuccessAnimation(event.detail.reward));
        window.addEventListener('miningStats', (event) => this.updateStats(event.detail));
    }

    startAnimation() {
        if (this.isAnimating) return;
        this.isAnimating = true;
        this.createParticles();
        this.animate();
    }

    stopAnimation() {
        this.isAnimating = false;
        this.clearParticles();
        this.resetProgress();
    }

    createParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            const particle = document.createElement('div');
            particle.className = 'mining-particle';
            this.setParticlePosition(particle);
            this.container.appendChild(particle);
            this.particles.push(particle);
        }
    }

    setParticlePosition(particle) {
        const x = Math.random() * this.container.offsetWidth;
        const y = Math.random() * this.container.offsetHeight;
        const size = Math.random() * 4 + 2;
        const duration = Math.random() * 2 + 1;
        const delay = Math.random() * 2;

        particle.style.left = `${x}px`;
        particle.style.top = `${y}px`;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.animation = `particleFloat ${duration}s ${delay}s infinite`;
    }

    clearParticles() {
        this.particles.forEach(particle => {
            if (particle.parentNode) {
                particle.parentNode.removeChild(particle);
            }
        });
        this.particles = [];
    }

    animate() {
        if (!this.isAnimating) return;

        // Update progress
        this.progress = (this.progress + 1) % 100;
        if (this.progressBar) {
            this.progressBar.style.width = `${this.progress}%`;
        }

        // Reposition particles that have completed their animation
        this.particles.forEach(particle => {
            const rect = particle.getBoundingClientRect();
            if (rect.top < 0 || rect.left > this.container.offsetWidth) {
                this.setParticlePosition(particle);
            }
        });

        requestAnimationFrame(() => this.animate());
    }

    triggerSuccessAnimation(reward) {
        // Create success flash
        const flash = document.createElement('div');
        flash.className = 'mining-success-flash';
        this.container.appendChild(flash);

        // Remove flash after animation
        setTimeout(() => {
            if (flash.parentNode) {
                flash.parentNode.removeChild(flash);
            }
        }, 500);

        // Update reward display with animation
        const rewardElement = document.querySelector('[data-mining="last-reward"]');
        if (rewardElement) {
            rewardElement.textContent = `${reward.toFixed(4)} xCIS`;
            rewardElement.classList.add('value-updated');
            setTimeout(() => rewardElement.classList.remove('value-updated'), 500);
        }
    }

    updateStats(stats) {
        // Update hash rate with animation
        const hashRateElement = document.querySelector('[data-mining="hashrate"]');
        if (hashRateElement) {
            hashRateElement.textContent = this.formatHashRate(stats.hashRate);
            hashRateElement.classList.add('value-updated');
            setTimeout(() => hashRateElement.classList.remove('value-updated'), 500);
        }

        // Update total mined with animation
        const totalElement = document.querySelector('[data-mining="total"]');
        if (totalElement) {
            totalElement.textContent = `${stats.totalMined.toFixed(4)} xCIS`;
            totalElement.classList.add('value-updated');
            setTimeout(() => totalElement.classList.remove('value-updated'), 500);
        }
    }

    formatHashRate(value) {
        if (value >= 1e9) return `${(value / 1e9).toFixed(2)} GH/s`;
        if (value >= 1e6) return `${(value / 1e6).toFixed(2)} MH/s`;
        if (value >= 1e3) return `${(value / 1e3).toFixed(2)} KH/s`;
        return `${value.toFixed(2)} H/s`;
    }

    resetProgress() {
        this.progress = 0;
        if (this.progressBar) {
            this.progressBar.style.width = '0%';
        }
    }
}

// Initialize mining animations when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.miningAnimations = new MiningAnimations();
    window.miningAnimations.init();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MiningAnimations;
} 