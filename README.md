# Cosmic Space Protocol Mining Interface

A modern, interactive web interface for mining xCIS tokens on the Cosmic Space Protocol network.

## Features

- Real-time mining visualization with particle effects
- Live mining statistics tracking
- Adjustable mining power with visual feedback
- Blockchain integration through Web3.js
- Reward claiming system
- Social sharing capabilities
- Responsive design for all devices

## Prerequisites

- Node.js >= 14.0.0
- NPM >= 6.0.0
- MetaMask browser extension
- Modern web browser with JavaScript enabled

## Installation

1. Clone the repository:
```bash
git clone https://github.com/your-username/cosmic-space-protocol.git
cd cosmic-space-protocol
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and add your configuration:
```env
PORT=8001
NODE_ENV=development
```

4. Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:8001`

## Project Structure

```
cosmic-space-protocol/
├── public/
│   ├── css/
│   │   ├── styles.css
│   │   └── mining-animations.css
│   ├── js/
│   │   ├── lib/
│   │   │   └── blockchain.js
│   │   ├── components/
│   │   │   ├── mining-system.js
│   │   │   ├── mining-animations.js
│   │   │   ├── wallet-sync.js
│   │   │   ├── transaction-handler.js
│   │   │   └── share-modal.js
│   │   └── utils/
│   ├── assets/
│   │   └── logo.svg
│   └── images/
├── server.js
├── package.json
├── README.md
└── .env
```

## Components

### Mining System
- Handles core mining operations
- Manages mining power and rewards
- Integrates with blockchain

### Mining Animations
- Provides visual feedback for mining operations
- Particle effects and progress animations
- Success indicators

### Wallet Sync
- Manages wallet connections
- Handles account changes
- Tracks balances

### Transaction Handler
- Manages blockchain transactions
- Handles gas estimation
- Tracks transaction status

### Share Modal
- Social sharing functionality
- Mining statistics display
- Platform-specific sharing

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please join our Discord server or Telegram group:
- Discord: https://discord.gg/cosmicspace
- Telegram: https://t.me/cosmicspaceprotocol
- Twitter: https://twitter.com/CosmicSpaceP 