# 🛡️ Aegis Protocol - AI Agents as a Service

[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-blue)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.18.2-yellow)](https://hardhat.org/)
[![Polygon](https://img.shields.io/badge/Network-Polygon-purple)](https://polygon.technology/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/licenses/MIT)

Aegis Protocol is a decentralized "AI Agents as a Service" (AaaS) platform built on Polygon. It enables creators to deploy and monetize AI agents through a rental model, while users can access these agents on-demand with low-cost transactions.

## 🏗️ Architecture

The protocol consists of three main smart contracts deployed on Polygon:

1. **AgentNFT (ERC-721)**: Represents ownership of AI agents
2. **RentalContract**: Manages agent rental logic and payments
3. **X402CreditContract**: Handles pre-paid credits for AI inference

All state is managed on-chain for maximum decentralization and transparency.

## 📋 Prerequisites

- Node.js v20.x or higher
- npm or yarn
- MetaMask or any Web3 wallet
- MATIC tokens for deployment and transactions

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/aegis-protocol.git
cd aegis-protocol/AegisContracts
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Network RPC URLs
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
POLYGON_MAINNET_RPC_URL=https://polygon-rpc.com

# Your wallet private key (NEVER commit this!)
PRIVATE_KEY=0x...

# Polygonscan API key for contract verification
POLYGONSCAN_API_KEY=YOUR_API_KEY
```

### 4. Compile Contracts

```bash
npm run compile
```

### 5. Run Tests

```bash
npm test
```

All tests should pass with output similar to:
```
  Aegis Protocol
    ✓ AgentNFT tests (4 passing)
    ✓ RentalContract tests (6 passing)
    ✓ X402CreditContract tests (9 passing)
    ✓ End-to-End Flow (1 passing)

  20 passing (681ms)
```

## 🌐 Deployment

### Local Network (Hardhat)

1. Start a local Hardhat node:
```bash
npm run node
```

2. In a new terminal, deploy contracts:
```bash
npm run deploy:local
```

### Polygon Testnet (Amoy)

1. Get test MATIC from [Polygon Faucet](https://faucet.polygon.technology/)

2. Deploy to Amoy:
```bash
npm run deploy:amoy
```

### Polygon Mainnet

⚠️ **Warning**: This will deploy to mainnet and cost real MATIC!

```bash
npx hardhat run scripts/deploy.ts --network polygon
```

## 📝 Contract Verification

After deployment, verify your contracts on Polygonscan:

```bash
npx hardhat verify --network <network> <CONTRACT_ADDRESS> [constructor args]
```

Example:
```bash
npx hardhat verify --network amoy 0x123... 
npx hardhat verify --network amoy 0x456... "0x123..."
npx hardhat verify --network amoy 0x789... "1000000000000000"
```

## 🔧 Contract Interaction

Use the provided interaction scripts to work with deployed contracts:

### Mint an Agent NFT
```bash
npx hardhat run scripts/interact.ts --network localhost -- mint <creator_address> <token_uri>
```

### Set Rental Price
```bash
npx hardhat run scripts/interact.ts --network localhost -- set-price <token_id> <price_per_second>
```

### Rent an Agent
```bash
npx hardhat run scripts/interact.ts --network localhost -- rent <token_id> <duration_seconds>
```

### Purchase Credits
```bash
npx hardhat run scripts/interact.ts --network localhost -- purchase-credits <amount_in_matic>
```

### Check Status
```bash
# Check rental status
npx hardhat run scripts/interact.ts --network localhost -- check-rental <token_id> [user_address]

# Check credit balance
npx hardhat run scripts/interact.ts --network localhost -- check-credits [user_address]
```

## 📜 Smart Contract Documentation

### AgentNFT

ERC-721 token representing AI agent ownership.

**Key Functions:**
- `mintAgent(address creator, string memory tokenURI)`: Mint a new agent NFT
- Standard ERC-721 functions (transfer, approve, etc.)

### RentalContract

Manages agent rentals and payments.

**Key Functions:**
- `setRentalPrice(uint256 tokenId, uint256 pricePerSecond)`: Set rental price for an agent
- `rent(uint256 tokenId, uint256 durationInSeconds)`: Rent an agent
- `isRentalActive(uint256 tokenId, address user)`: Check if rental is active

### X402CreditContract

Pre-paid credit system for AI inference.

**Key Functions:**
- `purchaseCredits()`: Buy credits with MATIC
- `spendCredits(address user, uint256 amount, bytes32 nonce)`: Spend user's credits (owner only)
- `creditBalances(address)`: Check credit balance
- `withdraw()`: Withdraw accumulated MATIC (owner only)

## 🔄 End-to-End Flow

1. **Creator deploys an agent**: Agent NFT is minted with metadata stored on IPFS
2. **Creator sets rental terms**: Price per second is configured
3. **User rents the agent**: Payment goes directly to creator
4. **User purchases credits**: Pre-paid credits for AI inference
5. **User interacts with agent**: Credits are spent per interaction
6. **Rental expires**: After duration, rental becomes inactive

## 🧪 Testing

Run the full test suite:
```bash
npm test
```

Run with coverage:
```bash
npx hardhat coverage
```

Run specific tests:
```bash
npx hardhat test test/AegisProtocol.test.ts
```

## 📊 Gas Reports

Enable gas reporting by setting in `hardhat.config.ts`:
```typescript
gasReporter: {
  enabled: true,
  currency: 'USD',
  gasPrice: 30, // Polygon gas price in gwei
}
```

Then run tests:
```bash
npm test
```

## 🔒 Security Considerations

1. **Private Keys**: Never commit private keys. Use environment variables
2. **Ownership**: X402CreditContract owner should be a secure multisig or verifier service
3. **Nonces**: The system prevents replay attacks using nonces
4. **Payments**: All rental payments go directly to creators (no intermediary risk)
5. **Audits**: Consider professional audits before mainnet deployment

## 🛠️ Development

### Project Structure
```
AegisContracts/
├── contracts/          # Smart contracts
│   ├── AgentNFT.sol
│   ├── RentalContract.sol
│   └── X402CreditContract.sol
├── scripts/           # Deployment and interaction scripts
│   ├── deploy.ts
│   └── interact.ts
├── test/              # Test files
│   └── AegisProtocol.test.ts
├── deployments/       # Deployment artifacts (auto-generated)
└── hardhat.config.ts  # Hardhat configuration
```

### Common Commands
```bash
npm run compile       # Compile contracts
npm test             # Run tests
npm run node         # Start local node
npm run deploy:local # Deploy to local network
npm run clean        # Clean artifacts
```

## 🌟 Features

- ✅ **Fully On-Chain**: All state managed by smart contracts
- ✅ **Direct Payments**: Creators receive payments instantly
- ✅ **Replay Protection**: Nonce-based security for credit spending
- ✅ **Gas Optimized**: Optimized for Polygon's low fees
- ✅ **ERC-721 Compliant**: Standard NFT interface for agents
- ✅ **Flexible Pricing**: Creators set their own rental rates
- ✅ **Credit System**: Pre-paid credits for smooth UX

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- [Documentation](https://docs.aegisprotocol.com)
- [Website](https://aegisprotocol.com)
- [Discord](https://discord.gg/aegis)
- [Twitter](https://twitter.com/aegisprotocol)

## ⚠️ Disclaimer

This software is provided "as is", without warranty of any kind. Use at your own risk. Always audit smart contracts before deploying to mainnet.

---

Built with ❤️ by the Aegis Protocol Team
