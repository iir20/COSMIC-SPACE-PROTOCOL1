// Mock Web3
jest.mock('web3');

// Mock socket.io-client
jest.mock('socket.io-client');

// Mock window object
global.window = {
    ethereum: {
        request: jest.fn(),
        on: jest.fn(),
        removeListener: jest.fn()
    }
};

// Mock localStorage
global.localStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn()
};

// Mock document object
global.document = {
    getElementById: jest.fn(),
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(),
    createElement: jest.fn(() => ({
        style: {},
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        },
        appendChild: jest.fn()
    }))
};

// Mock console methods
global.console = {
    ...console,
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// Mock crypto-js
jest.mock('crypto-js', () => ({
    SHA256: jest.fn(),
    enc: {
        Hex: {
            stringify: jest.fn()
        }
    }
}));

// Reset all mocks before each test
beforeEach(() => {
 