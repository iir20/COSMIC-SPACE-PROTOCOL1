const HDWalletProvider = require('@truffle/hdwallet-provider');
const Web3 = require('web3');
const { infuraKey, mnemonic } = require('./secrets.json'); // Ensure you have a secrets.json file with your Infura key and mnemonic

const provider = new HDWalletProvider(
    mnemonic,
    `https://rinkeby.infura.io/v3/${infuraKey}`
);

const web3 = new Web3(provider);

module.exports = {
    networks: {
        development: {
            host: "127.0.0.1",
            port: 7545, // Ganache port
            network_id: "*", // Match any network id
        },
        rinkeby: {
            provider: () => provider,
            network_id: 4, // Rinkeby's id
            gas: 5500000, // Gas limit
        },
    },
    compilers: {
        solc: {
            version: "0.8.0", // Specify the Solidity version
        },
    },
};
