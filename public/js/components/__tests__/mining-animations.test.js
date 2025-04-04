const MiningAnimations = require('../mining-animations');

describe('MiningAnimations', () => {
    let miningAnimations;
    let mockContainer;
    let mockProgressBar;

    beforeEach(() => {
        // Setup mock DOM elements
        mockContainer = {
            appendChild: jest.fn(),
            querySelectorAll: jest.fn().mockReturnValue([]),
            getBoundingClientRect: jest.fn().mockReturnValue({
                width: 800,
                height: 600
            })
        };

        mockProgressBar = {
            style: {},
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            }
        };

        document.getElementById.mockImplementation((id) => {
            if (id === 'animation-container') return mockContainer;
            if (id === 'mining-progress') return mockProgressBar;
            return null;
        });

        miningAnimations = new MiningAnimations();
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(miningAnimations.container).toBe(mockContainer);
            expect(miningAnimations.progressBar).toBe(mockProgressBar);
            expect(miningAnimations.isAnimating).toBeFalsy();
        });

        it('should throw error if container not found', () => {
            document.getElementById.mockReturnValue(null);
            expect(() => new MiningAnimations()).toThrow('Animation container not found');
        });

        it('should setup event listeners on init', () => {
            const mockAddEventListener = jest.fn();
            document.addEventListener = mockAddEventListener;

            miningAnimations.setupEventListeners();
            expect(mockAddEventListener).toHaveBeenCalledWith('miningStarted', expect.any(Function));
            expect(mockAddEventListener).toHaveBeenCalledWith('miningStopped', expect.any(Function));
            expect(mockAddEventListener).toHaveBeenCalledWith('statsUpdate', expect.any(Function));
        });
    });

    describe('animation control', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should start animation', () => {
            miningAnimations.startAnimation();
            expect(miningAnimations.isAnimating).toBeTruthy();
            expect(mockContainer.appendChild).toHaveBeenCalled();
        });

        it('should stop animation', () => {
            miningAnimations.startAnimation();
            miningAnimations.stopAnimation();
            expect(miningAnimations.isAnimating).toBeFalsy();
        });

        it('should create particles', () => {
            miningAnimations.createParticles(5);
            expect(mockContainer.appendChild).toHaveBeenCalledTimes(5);
        });

        it('should clear particles', () => {
            const mockParticles = [
                { remove: jest.fn() },
                { remove: jest.fn() }
            ];
            mockContainer.querySelectorAll.mockReturnValue(mockParticles);

            miningAnimations.clearParticles();
            mockParticles.forEach(particle => {
                expect(particle.remove).toHaveBeenCalled();
            });
        });
    });

    describe('progress handling', () => {
        it('should update progress bar', () => {
            miningAnimations.updateProgress(50);
            expect(mockProgressBar.style.width).toBe('50%');
        });

        it('should reset progress', () => {
            miningAnimations.resetProgress();
            expect(mockProgressBar.style.width).toBe('0%');
        });

        it('should trigger success animation', () => {
            const mockReward = 10;
            miningAnimations.triggerSuccessAnimation(mockReward);
            expect(mockProgressBar.classList.add).toHaveBeenCalledWith('success-flash');
        });
    });

    describe('stats handling', () => {
        it('should format hash rate correctly', () => {
            expect(miningAnimations.formatHashRate(1500000)).toBe('1.50 MH/s');
            expect(miningAnimations.formatHashRate(2500)).toBe('2.50 KH/s');
            expect(miningAnimations.formatHashRate(100)).toBe('100 H/s');
        });

        it('should update stats display', () => {
            const mockStats = {
                hashRate: 1500000,
                totalMined: 100
            };

            const mockHashRateElement = { textContent: '' };
            const mockTotalMinedElement = { textContent: '' };

            document.getElementById.mockImplementation((id) => {
                if (id === 'hash-rate') return mockHashRateElement;
                if (id === 'total-mined') return mockTotalMinedElement;
                return null;
            });

            miningAnimations.updateStats(mockStats);
            expect(mockHashRateElement.textContent).toBe('1.50 MH/s');
            expect(mockTotalMinedElement.textContent).toBe('100');
        });
    });

    describe('particle positioning', () => {
        it('should set random particle position', () => {
            const mockParticle = { style: {} };
            miningAnimations.setParticlePosition(mockParticle);
            
            expect(typeof parseFloat(mockParticle.style.left)).toBe('number');
            expect(typeof parseFloat(mockParticle.style.top)).toBe('number');
        });

        it('should keep particles within container bounds', () => {
            const mockParticle = { style: {} };
            miningAnimations.setParticlePosition(mockParticle);
            
            const left = parseFloat(mockParticle.style.left);
            const top = parseFloat(mockParticle.style.top);
            
            expect(left).toBeGreaterThanOrEqual(0);
            expect(left).toBeLessThanOrEqual(800);
            expect(top).toBeGreaterThanOrEqual(0);
            expect(top).toBeLessThanOrEqual(600);
        });
    });

    describe('error handling', () => {
        it('should handle animation errors gracefully', () => {
            mockContainer.appendChild.mockImplementation(() => {
                throw new Error('DOM error');
            });

            expect(() => miningAnimations.createParticles(1)).not.toThrow();
        });

        it('should handle missing stats elements', () => {
            document.getElementById.mockReturnValue(null);
            expect(() => miningAnimations.updateStats({ hashRate: 100, totalMined: 10 })).not.toThrow();
        });
    });
}); 