# 🎮 RETRO ARCADE FHE BATTLE ZONE

<div align="center">

![Arcade Banner](https://img.shields.io/badge/ARCADE-BATTLE%20ZONE-ff00ff?style=for-the-badge&logo=game&logoColor=white)
![FHE](https://img.shields.io/badge/FHE-ENCRYPTED-00ffff?style=for-the-badge)
![Blockchain](https://img.shields.io/badge/BLOCKCHAIN-SEPOLIA-yellow?style=for-the-badge)

**A Fully Homomorphic Encrypted Blockchain Gaming Experience**

[🎯 Live Demo](https://frontend-virid-six-29.vercel.app) | [📖 Documentation](#documentation) | [🎮 Play Now](#getting-started)

</div>

---

## 🌟 What is Arcade Battle Zone?

**Arcade Battle Zone** is a revolutionary **privacy-first blockchain game** that brings the nostalgic arcade experience to Web3, powered by cutting-edge **Fully Homomorphic Encryption (FHE)** technology from Zama.

Play classic Rock-Paper-Scissors battles where **your moves are encrypted on-chain** - no one (not even miners!) can see your strategy until the official reveal. Experience true fair play in a trustless environment with stunning retro arcade aesthetics.

### 🎬 Cinematic Features

```
┌─────────────────────────────────────────┐
│  🕹️  RETRO ARCADE UI                    │
│  🎨  CRT Screen Effects & Neon Glows    │
│  🔊  Arcade Sound System                │
│  🎭  Cinematic Landing Page             │
│  🔐  Fully Encrypted Gameplay           │
│  ⛓️  On-Chain Verified Results          │
└─────────────────────────────────────────┘
```

---

## 🚀 Why This Game is Different

| Feature | Traditional Blockchain Games | **Arcade Battle Zone** |
|---------|------------------------------|------------------------|
| **Privacy** | ❌ Moves visible in mempool | ✅ Encrypted with FHE |
| **Fairness** | ❌ Front-running possible | ✅ Mathematically impossible |
| **Trust** | ❌ Centralized server needed | ✅ Fully on-chain trustless |
| **UX** | ❌ Complex Web3 UI | ✅ Nostalgic arcade experience |
| **Verification** | ❌ Trust the platform | ✅ Cryptographically provable |

---

## 🎯 Quick Start

### Prerequisites

- Node.js 20+
- MetaMask wallet
- Sepolia testnet ETH ([Get from faucet](https://sepoliafaucet.com))

### Installation

```bash
# Clone the repository
git clone https://github.com/Bethwl/arcade-battle-zone.git
cd arcade-battle-zone

# Install backend dependencies
npm install

# Install frontend dependencies
cd frontend && npm install
```

### Run Locally

```bash
# Terminal 1: Start local blockchain (optional)
npm run chain

# Terminal 2: Deploy contracts
npm run deploy:sepolia

# Terminal 3: Start frontend
cd frontend && npm run dev
```

Visit `http://localhost:5173` and **INSERT COIN** to start playing! 🕹️

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    ARCADE BATTLE ZONE                     │
├──────────────────────────────────────────────────────────┤
│                                                           │
│  ┌─────────────┐      ┌──────────────┐                  │
│  │  React UI   │──────│  RainbowKit  │                  │
│  │ (Arcade)    │      │  (Wallet)    │                  │
│  └─────────────┘      └──────────────┘                  │
│         │                     │                          │
│         └─────────┬───────────┘                          │
│                   │                                       │
│                   ▼                                       │
│         ┌──────────────────┐                             │
│         │  Zama FHE SDK    │                             │
│         │  (Encryption)    │                             │
│         └──────────────────┘                             │
│                   │                                       │
│                   ▼                                       │
├───────────────────────────────────────────────────────────┤
│                SEPOLIA TESTNET                            │
│  ┌──────────────────────────────────────────────┐        │
│  │  Smart Contract: FHEROckPaperScissors       │        │
│  │  Address: 0xf54c9c761495A2514606C1d4...     │        │
│  │                                               │        │
│  │  ┌────────────┐  ┌────────────┐             │        │
│  │  │ FHE Logic  │  │ Game State │             │        │
│  │  └────────────┘  └────────────┘             │        │
│  └──────────────────────────────────────────────┘        │
│                   │                                       │
│                   ▼                                       │
│  ┌──────────────────────────────────────────────┐        │
│  │       Zama Decryption Oracle                 │        │
│  │  Secure threshold decryption network         │        │
│  └──────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────┘
```

---

## 🎮 How to Play

### 1️⃣ Connect Wallet
Click "Connect Wallet" and switch to **Sepolia testnet**

### 2️⃣ Create or Join Game
- **Create New Game**: Choose 2-4 players
- **Join Existing**: Select from open games list

### 3️⃣ Make Your Move
Choose your weapon:
- ✊ **ROCK** - Crushes scissors
- ✋ **PAPER** - Covers rock
- ✌️ **SCISSORS** - Cuts paper

### 4️⃣ Encrypted Submission
Your move is **encrypted client-side** using FHE before hitting the blockchain

### 5️⃣ Reveal & Win
When all players submit, the oracle decrypts moves simultaneously - **NO CHEATING POSSIBLE!**

---

## 🔐 FHE Technology Explained

### What is Fully Homomorphic Encryption?

FHE allows computation on **encrypted data** without ever decrypting it. In Arcade Battle Zone:

1. **You encrypt** your move locally (Rock/Paper/Scissors)
2. **Smart contract** stores encrypted values on-chain
3. **No one can see** your move - not even the blockchain!
4. **Oracle decrypts** all moves simultaneously after everyone submits
5. **Smart contract** determines winner with cryptographic proof

### Security Guarantees

```solidity
// Your move is encrypted with Zama's FHE
euint8 encryptedMove = FHE.fromExternal(userInput, proof);

// Stored on-chain but INVISIBLE to everyone
FHE.allowThis(encryptedMove);
FHE.allow(encryptedMove, msg.sender);

// Decrypted only when all players commit
uint256 requestId = FHE.requestDecryption(allMoves);
```

---

## 🛠️ Tech Stack

### Blockchain Layer
- **Solidity** ^0.8.24 - Smart contract language
- **FHEVM** 0.8.0 - Zama's FHE library
- **Hardhat** - Development framework
- **Sepolia** - Ethereum testnet

### Frontend Layer
- **React** 19.1 - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Wagmi** - React hooks for Ethereum
- **RainbowKit** - Wallet connection UI

### Encryption Layer
- **Zama FHE SDK** - Client-side encryption
- **Zama Oracle** - Threshold decryption network
- **KMS Verifier** - Cryptographic proof verification

---

## 📁 Project Structure

```
arcade-battle-zone/
├── contracts/
│   └── FHEROckPaperScissors.sol    # Main game contract
├── deploy/
│   └── deploy.ts                    # Deployment script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── LandingPage.tsx     # Cinematic intro
│   │   │   ├── ArcadeButton.tsx    # Retro buttons
│   │   │   └── MoveSelector.tsx    # Game controls
│   │   ├── config/
│   │   │   ├── contracts.ts        # Contract ABI & address
│   │   │   └── wagmi.ts            # Web3 configuration
│   │   ├── hooks/
│   │   │   ├── useArcadeSound.ts   # Sound system
│   │   │   └── useZamaInstance.ts  # FHE encryption
│   │   ├── styles/
│   │   │   └── Home.css            # Arcade theme (800+ lines)
│   │   └── home.tsx                # Main game UI
│   └── public/
│       └── sounds/                  # Arcade sound effects
├── hardhat.config.ts               # Hardhat configuration
├── .env                            # Environment variables
└── README.md                       # This file
```

---

## 🎨 Design Philosophy

### Retro Arcade Aesthetics

Inspired by 1980s arcade cabinets:
- **CRT Screen Effects** - Scanlines, glow, phosphor trails
- **Neon Color Palette** - Cyan, magenta, yellow highlights
- **Pixel Perfect Fonts** - Press Start 2P, VT323
- **3D Arcade Buttons** - Depth shadows, press animations
- **Marquee Lighting** - Animated corner glows

### Responsive Design

```css
Desktop  → 3-column arcade cabinet layout
Tablet   → 2-column responsive grid
Mobile   → Single column touch-friendly
```

---

## 🚀 Deployment

### Deploy Smart Contract

```bash
# Configure .env file
PRIVATE_KEY=your_private_key
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY

# Deploy to Sepolia
npm run deploy:sepolia

# Verify on Etherscan (optional)
npm run verify:sepolia
```

### Deploy Frontend (Vercel)

```bash
cd frontend
npm run build

# Deploy to Vercel
vercel --prod
```

Or use the Vercel GitHub integration for automatic deployments.

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with gas reporting
REPORT_GAS=true npm test

# Test on Sepolia testnet
npm run test:sepolia

# Coverage report
npm run coverage
```

---

## 📊 Smart Contract API

### Core Functions

```solidity
// Create a new game (2-4 players)
function createGame(uint8 maxPlayers) external returns (uint256 gameId)

// Join an existing game
function joinGame(uint256 gameId) external

// Start the game (host only)
function startGame(uint256 gameId) external

// Submit encrypted move
function submitMove(
    uint256 gameId,
    externalEuint8 encryptedMove,
    bytes calldata inputProof
) external

// Get game information
function getGame(uint256 gameId) external view returns (...)
```

### Events

```solidity
event GameCreated(uint256 indexed gameId, address indexed host, uint8 maxPlayers)
event PlayerJoined(uint256 indexed gameId, address indexed player)
event GameStarted(uint256 indexed gameId, address indexed starter)
event MoveSubmitted(uint256 indexed gameId, address indexed player)
event GameRevealed(uint256 indexed gameId, address[] winners, uint8 winningMove)
```

---

## 🤝 Contributing

Contributions are welcome! Here's how to contribute:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the **BSD-3-Clause-Clear License**.

---

## 🙏 Acknowledgments

- **Zama** - For the amazing FHEVM technology
- **Ethereum Foundation** - For the Sepolia testnet
- **RainbowKit** - For wallet connection UX
- **The Arcade Era** - For endless inspiration

---

## 📞 Support & Contact

- **GitHub Issues**: [Report bugs](https://github.com/Bethwl/arcade-battle-zone/issues)
- **Zama Discord**: [https://discord.gg/zama](https://discord.gg/zama)
- **Documentation**: [Zama FHE Docs](https://docs.zama.ai/fhevm)

---

<div align="center">

### 🎮 INSERT COIN TO CONTINUE 🎮

**Built with ❤️ and FHE encryption**

[⭐ Star this repo](https://github.com/Bethwl/arcade-battle-zone) if you like it!

</div>
