/**
 * Cosmic UI Enhancement System
 * 
 * This script adds various UI enhancements to the application, including:
 * - Parallax effects
 * - Particle effects
 * - Glow effects
 * - Scroll animations
 * - Tooltips
 * - Interactive cards
 */

class CosmicUI {
    constructor() {
        this.initialized = false;
        this.effects = {
            parallax: true,
            particles: true,
            glow: true,
            animations: true
        };
    }

    init() {
        if (this.initialized) return;
        
        console.log('Initializing Cosmic UI');
        
        // Initialize background effects
        this.initBackgroundEffects();
        
        // Initialize UI enhancements
        this.initUIEnhancements();
        
        // Initialize interactions
        this.initInteractions();
        
        this.initialized = true;
        console.log('Cosmic UI initialized');
    }

    initBackgroundEffects() {
        // Initialize star field
        this.initStarField();
        
        // Initialize aurora effect
        this.initAuroraEffect();
        
        // Initialize parallax effect
        if (this.effects.parallax) {
            this.initParallax();
        }
    }

    initStarField() {
        const starsContainer = document.getElementById('stars');
        if (!starsContainer) return;
        
        // Generate stars
        const starCount = Math.min(100, Math.floor(window.innerWidth * window.innerHeight / 1000));
        
        for (let i = 0; i < starCount; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            
            // Random position
            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;
            
            // Random size
            const size = Math.random();
            if (size < 0.6) {
                star.classList.add('tiny');
            } else if (size < 0.8) {
                star.classList.add('small');
            } else if (size < 0.95) {
                star.classList.add('medium');
            } else {
                star.classList.add('large');
            }
            
            // Random color
            const colors = ['white', 'blue', 'purple', 'yellow', 'cyan'];
            const colorClass = colors[Math.floor(Math.random() * colors.length)];
            if (colorClass !== 'white') {
                star.classList.add(colorClass);
            }
            
            // Random animation delay
            star.style.animationDelay = `${Math.random() * 4}s`;
            
            starsContainer.appendChild(star);
        }
    }

    initAuroraEffect() {
        const aurora = document.getElementById('aurora');
        if (!aurora) return;
        
        // Set up aurora glow animation
        aurora.style.opacity = '0.4';
        aurora.style.transition = 'all 5s ease-in-out';
        
        setInterval(() => {
            aurora.style.transform = `scale(${1 + Math.random() * 0.1})`;
            aurora.style.opacity = `${0.3 + Math.random() * 0.2}`;
        }, 5000);
    }

    initParallax() {
        document.addEventListener('mousemove', (e) => {
            const { clientX, clientY } = e;
            const centerX = window.innerWidth / 2;
            const centerY = window.innerHeight / 2;
            
            // Calculate movement
            const moveX = (clientX - centerX) / centerX;
            const moveY = (clientY - centerY) / centerY;

            // Apply parallax to background elements - with proper error handling
            const nebula = document.getElementById('nebula');
            if (nebula && nebula.style) {
                nebula.style.transform = `translate(${moveX * 20}px, ${moveY * 20}px)`;
            }
            
            const aurora = document.getElementById('aurora');
            if (aurora && aurora.style) {
                aurora.style.transform = `translate(${moveX * -15}px, ${moveY * -15}px)`;
            }
        });
    }

    initUIEnhancements() {
        // Add glass effect to cards
        document.querySelectorAll('.cosmic-card').forEach(card => {
            card.classList.add('glass-effect');
            if (this.effects.glow) {
                this.addGlowEffect(card);
            }
        });

        // Add hover effects to buttons
        document.querySelectorAll('.cosmic-button').forEach(button => {
            this.addButtonEffects(button);
        });

        // Initialize tooltips
        this.initTooltips();

        // Add scroll animations
        if (this.effects.animations) {
            this.initScrollAnimations();
        }
    }

    addGlowEffect(element) {
        element.addEventListener('mousemove', (e) => {
            const { left, top, width, height } = element.getBoundingClientRect();
            const x = e.clientX - left;
            const y = e.clientY - top;
            
            element.style.setProperty('--glow-x', `${x}px`);
            element.style.setProperty('--glow-y', `${y}px`);
        });
    }

    addButtonEffects(button) {
        // Add ripple effect
        button.addEventListener('click', (e) => {
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            
            const rect = button.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            
            button.appendChild(ripple);
            setTimeout(() => ripple.remove(), 1000);
        });

        // Add hover glow
        if (this.effects.glow) {
            this.addGlowEffect(button);
        }
    }

    initTooltips() {
        document.querySelectorAll('[data-tooltip]').forEach(element => {
            element.addEventListener('mouseenter', (e) => {
                const tooltip = document.createElement('div');
                tooltip.className = 'cosmic-tooltip';
                tooltip.textContent = element.dataset.tooltip;
                
                const rect = element.getBoundingClientRect();
                tooltip.style.left = rect.left + (rect.width / 2) + 'px';
                tooltip.style.top = rect.top - 10 + 'px';
                
                document.body.appendChild(tooltip);
                
                setTimeout(() => tooltip.classList.add('show'), 10);
                
                element.addEventListener('mouseleave', () => {
                    tooltip.classList.remove('show');
                    setTimeout(() => tooltip.remove(), 200);
                }, { once: true });
            });
        });
    }

    initScrollAnimations() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate');
                }
            });
        }, {
            threshold: 0.1
        });

        document.querySelectorAll('.animate-on-scroll').forEach(element => {
            observer.observe(element);
        });
    }

    initInteractions() {
        // Add interactive elements
        this.addParticleInteraction();
        this.addHoverEffects();
    }

    addParticleInteraction() {
        if (!this.effects.particles) return;

        document.addEventListener('click', (e) => {
            const particle = document.createElement('div');
            particle.className = 'cosmic-particle';
            
            particle.style.left = e.clientX + 'px';
            particle.style.top = e.clientY + 'px';
            
            document.body.appendChild(particle);
            
            setTimeout(() => particle.remove(), 1000);
        });
    }

    addHoverEffects() {
        // Add hover effects to cards
        document.querySelectorAll('.cosmic-card').forEach(card => {
            card.addEventListener('mousemove', (e) => {
                const { left, top, width, height } = card.getBoundingClientRect();
                const x = e.clientX - left;
                const y = e.clientY - top;
                
                const rotateX = (y - height / 2) / 20;
                const rotateY = (x - width / 2) / 20;
                
                card.style.transform = 
                    `perspective(1000px) rotateX(${-rotateX}deg) rotateY(${rotateY}deg)`;
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'none';
            });
        });
    }

    // Utility functions
    setEffect(effect, enabled) {
        if (this.effects.hasOwnProperty(effect)) {
            this.effects[effect] = enabled;
            
            // Re-initialize specific effect
            switch (effect) {
                case 'parallax':
                    if (enabled) this.initParallax();
                    break;
                case 'particles':
                    // Particles are handled per-interaction
                    break;
                case 'glow':
                    this.initUIEnhancements();
                    break;
                case 'animations':
                    if (enabled) this.initScrollAnimations();
                    break;
            }
        }
    }
}

// Initialize Cosmic UI
document.addEventListener('DOMContentLoaded', () => {
    window.cosmicUI = new CosmicUI();
    window.cosmicUI.init();
});

// Fix the invalid assignment by using a proper function
function updateUI(element, value) {
    if (!element) return;
    element.textContent = value;
}

// Use the function instead of direct assignment
document.querySelectorAll('.cosmic-value').forEach(element => {
    const value = element.dataset.value;
    if (value) {
        updateUI(element, value);
    }
}); 