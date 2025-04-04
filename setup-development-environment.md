# Setting Up Development Environment for CISP Blockchain

## Prerequisites
- **Node.js**: Ensure you have Node.js installed. Download from [Node.js Official Site](https://nodejs.org/).
- **npm**: Comes with Node.js, used for package management.

## Install Blockchain Framework
1. **Truffle**: A popular framework for Ethereum development.
   ```bash
   npm install -g truffle
   ```

2. **Ganache**: A personal blockchain for Ethereum development.
   - Download Ganache from [Truffle Suite](https://www.trufflesuite.com/ganache).

## Initialize Truffle Project
1. Create a new directory for the CISP blockchain project.
   ```bash
   mkdir cisp-blockchain
   cd cisp-blockchain
   truffle init
   ```

## Install Additional Dependencies
- **Web3.js**: A library to interact with the Ethereum blockchain.
   ```bash
   npm install web3
   ```

- **OpenZeppelin Contracts**: A library for secure smart contract development.
   ```bash
   npm install @openzeppelin/contracts
   ```

## Development Workflow
1. Write smart contracts in the `contracts` directory.
2. Compile contracts using:
   ```bash
   truffle compile
   ```

3. Deploy contracts to the local blockchain using:
   ```bash
   truffle migrate
   ```

4. Run tests using:
   ```bash
   truffle test
   ```

5. Interact with the deployed contracts using a JavaScript file in the `scripts` directory.
