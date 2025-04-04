const BlockchainSystem = require('../blockchain');
const Web3 = require('web3');

describe('BlockchainSystem', () => {
    let blockchainSystem;
    
    beforeEach(() => {
        blockchainSystem = new BlockchainSystem();
    });

    describe('initialization', () => {
        it('should initialize with default values', () => {
            expect(blockchainSystem.web3).toBeNull();
            expect(blockchainSystem.account).toBeNull();
            expect(blockchainSystem.isInitialized).toBeFalsy();
        });

        it('should initialize Web3 with MetaMask provider', async () => {
            global.window.ethereum = {
                request: jest.fn().mockResolvedValue(['0x123']),
                on: jest.fn()
            };

            await blockchainSystem.init();
            
            expect(blockchainSystem.web3).toBeInstanceOf(Web3);
            expect(blockchainSystem.isInitialized).toBeTruthy();
            expect(blockchainSystem.account).toBe('0x123');
        });

        it('should handle initialization errors', async () => {
            global.window.ethereum = {
                request: jest.fn().mockRejectedValue(new Error('MetaMask not found')),
                on: jest.fn()
            };

            await expect(blockchainSystem.init()).rejects.toThrow('MetaMask not found');
            expect(blockchainSystem.isInitialized).toBeFalsy();
        });
    });

    describe('account management', () => {
        beforeEach(async () => {
            global.window.ethereum = {
                request: jest.fn().mockResolvedValue(['0x123']),
                on: jest.fn()
            };
            await blockchainSystem.init();
        });

        it('should update account on change', () => {
            const newAccount = '0x456';
            blockchainSystem.handleAccountsChanged([newAccount]);
            expect(blockchainSystem.account).toBe(newAccount);
        });

        it('should handle disconnection', () => {
            blockchainSystem.handleDisconnect();
            expect(blockchainSystem.isInitialized).toBeFalsy();
            expect(blockchainSystem.web3).toBeNull();
            expect(blockchainSystem.account).toBeNull();
        });
    });

    describe('balance operations', () => {
        beforeEach(async () => {
            global.window.ethereum = {
                request: jest.fn().mockResolvedValue(['0x123']),
                on: jest.fn()
            };
            await blockchainSystem.init();
        });

        it('should fetch balance correctly', async () => {
            const mockBalance = '1000000000000000000'; // 1 ETH in wei
            blockchainSystem.web3.eth.getBalance = jest.fn().mockResolvedValue(mockBalance);

            const balance = await blockchainSystem.getBalance();
            expect(balance).toBe('1.0'); // Should convert wei to ETH
            expect(blockchainSystem.web3.eth.getBalance).toHaveBeenCalledWith(blockchainSystem.account);
        });

        it('should handle balance fetch errors', async () => {
            blockchainSystem.web3.eth.getBalance = jest.fn().mockRejectedValue(new Error('Network error'));

            await expect(blockchainSystem.getBalance()).rejects.toThrow('Network error');
        });
    });

    describe('event handling', () => {
        let mockCallback;

        beforeEach(async () => {
            mockCallback = jest.fn();
            global.window.ethereum = {
                request: jest.fn().mockResolvedValue(['0x123']),
                on: jest.fn(),
                removeListener: jest.fn()
            };
            await blockchainSystem.init();
        });

        it('should register event listeners', () => {
            blockchainSystem.on('accountsChanged', mockCallback);
            expect(global.window.ethereum.on).toHaveBeenCalledWith('accountsChanged', expect.any(Function));
        });

        it('should remove event listeners', () => {
            blockchainSystem.off('accountsChanged', mockCallback);
            expect(global.window.ethereum.removeListener).toHaveBeenCalledWith('accountsChanged', mockCallback);
        });
    });
}); 