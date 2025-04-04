const MiningSystem = require('../mining-system');
const CryptoJS = require('crypto-js');

describe('MiningSystem', () => {
    let miningSystem;
    const mockBlockchainSystem = {
        account: '0x123',
        isInitialized: true,
        web3: {
            eth: {
                getBalance: jest.fn()
            }
        }
    };

    beforeEach(() => {
        miningSystem = new MiningSystem(mockBlockchainSystem);
        // Reset mock implementations
        CryptoJS.SHA256.mockImplementation(data => ({
            toString: () => '000000hash'
        }));
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(miningSystem.isMining).toBeFalsy();
            expect(miningSystem.difficulty).toBe(4);
            expect(miningSystem.hashRate).toBe(0);
            expect(miningSystem.totalMined).toBe(0);
        });

        it('should validate blockchain system on init', () => {
            const invalidBlockchainSystem = { isInitialized: false };
            expect(() => new MiningSystem(invalidBlockchainSystem)).toThrow('Invalid blockchain system');
        });
    });

    describe('mining operations', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should start mining successfully', () => {
            miningSystem.startMining();
            expect(miningSystem.isMining).toBeTruthy();
            expect(miningSystem.miningInterval).toBeDefined();
        });

        it('should stop mining successfully', () => {
            miningSystem.startMining();
            miningSystem.stopMining();
            expect(miningSystem.isMining).toBeFalsy();
            expect(miningSystem.miningInterval).toBeNull();
        });

        it('should calculate hash rate correctly', () => {
            miningSystem.startMining();
            miningSystem.updateHashRate(1000); // 1000 hashes in last second
            expect(miningSystem.hashRate).toBe(1000);
        });

        it('should emit mining stats update', () => {
            const mockCallback = jest.fn();
            miningSystem.on('statsUpdate', mockCallback);
            
            miningSystem.updateStats();
            
            expect(mockCallback).toHaveBeenCalledWith({
                hashRate: miningSystem.hashRate,
                totalMined: miningSystem.totalMined,
                difficulty: miningSystem.difficulty
            });
        });
    });

    describe('block mining', () => {
        it('should mine a valid block', () => {
            const mockData = {
                timestamp: Date.now(),
                previousHash: '000000previous',
                data: 'test data'
            };

            const result = miningSystem.mineBlock(mockData);
            expect(result.hash.startsWith('000000')).toBeTruthy();
            expect(result.nonce).toBeDefined();
        });

        it('should validate block hash difficulty', () => {
            const mockBlock = {
                hash: '000000hash',
                nonce: 12345
            };

            expect(miningSystem.isValidHash(mockBlock.hash)).toBeTruthy();
        });

        it('should handle mining rewards', () => {
            const mockReward = 10;
            miningSystem.handleMiningSuccess(mockReward);
            expect(miningSystem.totalMined).toBe(mockReward);
        });
    });

    describe('event handling', () => {
        it('should register and trigger event listeners', () => {
            const mockCallback = jest.fn();
            miningSystem.on('blockMined', mockCallback);

            const mockBlock = { hash: '000000hash', nonce: 12345 };
            miningSystem.emit('blockMined', mockBlock);

            expect(mockCallback).toHaveBeenCalledWith(mockBlock);
        });

        it('should remove event listeners', () => {
            const mockCallback = jest.fn();
            miningSystem.on('blockMined', mockCallback);
            miningSystem.off('blockMined', mockCallback);

            miningSystem.emit('blockMined', {});
            expect(mockCallback).not.toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        it('should handle mining errors gracefully', () => {
            CryptoJS.SHA256.mockImplementation(() => {
                throw new Error('Hash calculation failed');
            });

            expect(() => miningSystem.mineBlock({})).toThrow('Hash calculation failed');
        });

        it('should handle invalid difficulty values', () => {
            expect(() => miningSystem.setDifficulty(-1)).toThrow('Invalid difficulty value');
            expect(() => miningSystem.setDifficulty(0)).toThrow('Invalid difficulty value');
        });
    });
}); 