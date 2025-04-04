# CISP Blockchain Specifications

## Consensus Mechanism
- **Type**: Proof of Stake (PoS)
- **Block Time**: 15 seconds

## Block Structure
- **Block Header**:
  - Previous Block Hash
  - Merkle Root
  - Timestamp
  - Nonce
  - Validator Address

- **Transactions**:
  - Sender Address
  - Receiver Address
  - Amount
  - Signature

## Network Parameters
- **Chain ID**: 1001
- **Token Name**: xCISP Token
- **Token Symbol**: xCISP
- **Decimals**: 18

## Smart Contracts
- **Token Contract**: ERC20 compliant
- **Staking Contract**: Allows users to stake tokens and earn rewards
- **Mining Contract**: Manages the mining process and rewards distribution

## Additional Features
- **Governance**: Community voting on protocol upgrades
- **Interoperability**: Ability to interact with other blockchains
