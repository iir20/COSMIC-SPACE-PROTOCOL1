const ShareModal = require('../share-modal');

describe('ShareModal', () => {
    let shareModal;
    let mockModal;
    let mockCloseButton;
    let mockStatsContainer;
    let mockShareButtons;

    beforeEach(() => {
        // Setup mock DOM elements
        mockModal = {
            style: {},
            classList: {
                add: jest.fn(),
                remove: jest.fn()
            }
        };

        mockCloseButton = {
            addEventListener: jest.fn()
        };

        mockStatsContainer = {
            textContent: ''
        };

        mockShareButtons = {
            twitter: { addEventListener: jest.fn() },
            discord: { addEventListener: jest.fn() },
            telegram: { addEventListener: jest.fn() }
        };

        document.getElementById.mockImplementation((id) => {
            if (id === 'share-modal') return mockModal;
            if (id === 'modal-close') return mockCloseButton;
            if (id === 'mining-stats') return mockStatsContainer;
            if (id === 'twitter-share') return mockShareButtons.twitter;
            if (id === 'discord-share') return mockShareButtons.discord;
            if (id === 'telegram-share') return mockShareButtons.telegram;
            return null;
        });

        document.createElement.mockImplementation(() => ({
            style: {},
            classList: {
                add: jest.fn()
            },
            appendChild: jest.fn()
        }));

        // Mock window.open
        window.open = jest.fn();

        shareModal = new ShareModal();
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(shareModal.modal).toBe(mockModal);
            expect(shareModal.isVisible).toBeFalsy();
        });

        it('should create modal if not exists', () => {
            document.getElementById.mockReturnValue(null);
            shareModal = new ShareModal();
            expect(document.createElement).toHaveBeenCalled();
        });

        it('should setup event listeners', () => {
            shareModal.setupEventListeners();
            expect(mockCloseButton.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockShareButtons.twitter.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockShareButtons.discord.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
            expect(mockShareButtons.telegram.addEventListener).toHaveBeenCalledWith('click', expect.any(Function));
        });
    });

    describe('modal visibility', () => {
        it('should show modal', () => {
            shareModal.show();
            expect(shareModal.isVisible).toBeTruthy();
            expect(mockModal.style.display).toBe('block');
        });

        it('should hide modal', () => {
            shareModal.hide();
            expect(shareModal.isVisible).toBeFalsy();
            expect(mockModal.style.display).toBe('none');
        });

        it('should toggle modal visibility', () => {
            shareModal.show();
            expect(shareModal.isVisible).toBeTruthy();
            shareModal.hide();
            expect(shareModal.isVisible).toBeFalsy();
        });
    });

    describe('stats handling', () => {
        const mockStats = {
            hashRate: 1500000,
            totalMined: 100,
            lastReward: 10
        };

        it('should update stats display', () => {
            shareModal.updateStats(mockStats);
            expect(mockStatsContainer.textContent).toContain('100');
            expect(mockStatsContainer.textContent).toContain('1.50 MH/s');
        });

        it('should format stats correctly', () => {
            const text = shareModal.getShareText();
            expect(text).toContain('COSMIC');
            expect(text).toContain('mining');
        });
    });

    describe('sharing functionality', () => {
        beforeEach(() => {
            window.miningSystem = {
                totalMined: 100,
                lastReward: 10,
                hashRate: 1500000
            };
        });

        it('should share on Twitter', () => {
            shareModal.shareOnTwitter();
            expect(window.open).toHaveBeenCalledWith(
                expect.stringContaining('twitter.com/intent/tweet'),
                '_blank'
            );
        });

        it('should share on Discord', () => {
            shareModal.shareOnDiscord();
            expect(window.open).toHaveBeenCalledWith(
                expect.stringContaining('discord.com'),
                '_blank'
            );
        });

        it('should share on Telegram', () => {
            shareModal.shareOnTelegram();
            expect(window.open).toHaveBeenCalledWith(
                expect.stringContaining('t.me/share/url'),
                '_blank'
            );
        });

        it('should include correct stats in share text', () => {
            const shareText = shareModal.getShareText();
            expect(shareText).toContain('10 COSMIC');
            expect(shareText).toContain('100 total');
        });
    });

    describe('error handling', () => {
        it('should handle missing mining system gracefully', () => {
            window.miningSystem = undefined;
            expect(() => shareModal.updateStats()).not.toThrow();
        });

        it('should handle share button errors', () => {
            window.open = jest.fn().mockImplementation(() => {
                throw new Error('Popup blocked');
            });
            expect(() => shareModal.shareOnTwitter()).not.toThrow();
        });

        it('should handle missing DOM elements', () => {
            document.getElementById.mockReturnValue(null);
            expect(() => shareModal.updateStats()).not.toThrow();
        });
    });

    describe('event handling', () => {
        it('should handle window click outside modal', () => {
            const event = new Event('click');
            event.target = document.body;
            
            shareModal.show();
            window.dispatchEvent(event);
            
            expect(shareModal.isVisible).toBeFalsy();
        });

        it('should not close when clicking inside modal', () => {
            const event = new Event('click');
            event.target = mockModal;
            
            shareModal.show();
            window.dispatchEvent(event);
            
            expect(shareModal.isVisible).toBeTruthy();
        });

        it('should handle mining success event', () => {
            const event = new CustomEvent('miningSuccess', {
                detail: { reward: 10 }
            });
            
            document.dispatchEvent(event);
            expect(shareModal.isVisible).toBeTruthy();
        });
    });
}); 