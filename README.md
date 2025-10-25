# FHE Rock Paper Scissors

A privacy-preserving, multiplayer Rock-Paper-Scissors game built on Ethereum using Fully Homomorphic Encryption (FHE) technology. Players can submit encrypted moves on-chain without revealing their choices until all players have committed, ensuring fairness and eliminating the possibility of cheating.

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Advantages](#advantages)
- [Technology Stack](#technology-stack)
- [Problems Solved](#problems-solved)
- [Architecture](#architecture)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Smart Contract Deployment](#smart-contract-deployment)
  - [Frontend Setup](#frontend-setup)
  - [Running Tests](#running-tests)
- [How It Works](#how-it-works)
- [Game Flow](#game-flow)
- [Smart Contract API](#smart-contract-api)
- [Project Structure](#project-structure)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [Future Roadmap](#future-roadmap)
- [Contributing](#contributing)
- [License](#license)
- [Support](#support)

## Overview

FHE Rock Paper Scissors is a decentralized application (dApp) that leverages **Fully Homomorphic Encryption (FHE)** to create a trustless, provably fair gaming experience. Unlike traditional blockchain games where moves must be revealed or hashed, FHE allows computation on encrypted data, enabling players to submit their choices in encrypted form and have the smart contract determine winners without ever exposing individual moves until the final reveal phase.

This project demonstrates the practical application of FHE in blockchain gaming, solving the long-standing problem of fair play in on-chain games where transaction ordering and front-running can create unfair advantages.

## Key Features

- **Privacy-Preserving Gameplay**: Player moves remain encrypted on-chain until the reveal phase
- **Multiplayer Support**: 2-4 players can participate in a single game
- **Trustless Architecture**: No trusted third party needed; encryption ensures fairness
- **State Management**: Comprehensive game state tracking (Open, Ready, Started, Revealing, Revealed)
- **On-Chain Verification**: All game logic executed and verified on Ethereum
- **Modern Web3 Frontend**: React-based UI with wallet integration via RainbowKit
- **Real-Time Updates**: Automatic game state polling and updates
- **Decryption Oracle Integration**: Leverages Zama's decryption oracle for secure reveal mechanism
- **Comprehensive Testing**: Full test suite including mock FHE environment

## Advantages

### 1. **Eliminates Cheating**
Traditional on-chain games suffer from front-running attacks where players can observe pending transactions and submit their moves accordingly. FHE encryption makes moves completely opaque, preventing any form of move manipulation or front-running.

### 2. **True Privacy**
Player choices remain confidential throughout the submission phase. Even blockchain explorers and miners cannot determine what move a player has made until the official reveal, maintaining game integrity.

### 3. **Provable Fairness**
All game logic is executed on-chain with cryptographic guarantees. The smart contract mathematically determines winners based on encrypted inputs, providing auditable and verifiable fairness.

### 4. **No Commit-Reveal Complexity**
Traditional solutions require complex commit-reveal schemes with multiple transactions and potential griefing vectors (players can refuse to reveal). FHE eliminates this complexity while maintaining security.

### 5. **Multiplayer Scalability**
Supports 2-4 players in a single game, enabling tournament-style play and more complex game dynamics than simple head-to-head matches.

### 6. **Gas Efficiency**
While FHE operations are computationally intensive, the architecture minimizes on-chain computation by batching decryption requests and using efficient state management.

### 7. **Educational Value**
Serves as a practical example of FHE technology in blockchain applications, demonstrating real-world use cases for privacy-preserving smart contracts.

## Technology Stack

### Smart Contracts
- **Solidity** (^0.8.24): Smart contract programming language
- **FHEVM** (@fhevm/solidity ^0.8.0): Zama's FHE library for Solidity
- **Hardhat** (^2.26.0): Ethereum development environment
- **Hardhat Deploy**: Deployment management and artifact tracking
- **TypeChain**: TypeScript bindings for smart contracts

### Blockchain & Cryptography
- **Zama FHEVM**: Fully Homomorphic Encryption Virtual Machine
- **Zama Decryption Oracle** (@zama-fhe/oracle-solidity): Secure decryption service
- **Zama Relayer SDK** (@zama-fhe/relayer-sdk): Client-side encryption utilities
- **Ethereum**: Blockchain platform (Sepolia testnet compatible)

### Frontend
- **React** (^19.1.1): UI library
- **TypeScript** (^5.8.3): Type-safe JavaScript
- **Vite** (^7.1.6): Build tool and development server
- **Wagmi** (^2.17.0): React hooks for Ethereum
- **Viem** (^2.37.6): TypeScript Ethereum library
- **RainbowKit** (^2.2.8): Wallet connection UI
- **TanStack Query** (^5.89.0): Async state management
- **Ethers.js** (^6.15.0): Ethereum wallet implementation

### Development Tools
- **ESLint**: Code linting for JavaScript/TypeScript
- **Prettier**: Code formatting
- **Solhint**: Solidity linting
- **Mocha & Chai**: Testing framework
- **Hardhat Network Helpers**: Testing utilities
- **Hardhat Gas Reporter**: Gas usage analysis

## Problems Solved

### 1. **Front-Running Attacks in Blockchain Games**
**Problem**: In traditional blockchain games, transactions are visible in the mempool before being mined. Malicious actors can observe an opponent's move and submit their own transaction with higher gas to get mined first, effectively cheating.

**Solution**: FHE encryption ensures moves are submitted in encrypted form. Even if a transaction is observed, the actual move (Rock, Paper, or Scissors) remains hidden, making front-running impossible.

### 2. **Trusted Third-Party Dependency**
**Problem**: Many online games require a trusted server to collect and verify moves, introducing centralization and potential manipulation.

**Solution**: The smart contract acts as a trustless arbiter. All game logic executes on-chain with cryptographic verification, eliminating the need for any trusted intermediary.

### 3. **Commit-Reveal Scheme Complexity**
**Problem**: Traditional solutions use commit-reveal schemes requiring multiple transactions and opening griefing attack vectors (players can commit but refuse to reveal).

**Solution**: FHE provides single-phase submission with automatic reveal via the decryption oracle, simplifying the user experience and eliminating griefing scenarios.

### 4. **Privacy in Public Blockchains**
**Problem**: Blockchains are inherently transparent, making it difficult to implement games requiring hidden information.

**Solution**: FHE enables computation on encrypted data, allowing smart contracts to process sensitive information without ever exposing it publicly until the appropriate reveal phase.

### 5. **Deterministic Winner Calculation**
**Problem**: Ensuring fair and verifiable winner determination in multiplayer scenarios with various game outcomes (ties, multiple winners).

**Solution**: Smart contract implements deterministic game theory logic that correctly handles all edge cases including draws, single winners, and multiple winner scenarios based on traditional Rock-Paper-Scissors rules.

### 6. **State Synchronization in Multiplayer Games**
**Problem**: Managing complex game state across multiple players with proper access control and state transitions.

**Solution**: Comprehensive state machine implementation (Open → Ready → Started → Revealing → Revealed) with role-based permissions ensuring only valid state transitions occur.

## Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (React)                     │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  RainbowKit  │  │  Wagmi/Viem │  │  Zama Relayer SDK│   │
│  │  (Wallet)    │  │  (Web3)     │  │  (Encryption)    │   │
│  └──────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ JSON-RPC / Web3 Provider
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Ethereum Network (Sepolia)                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │      FHEROckPaperScissors Smart Contract             │   │
│  │  ┌─────────────┐  ┌──────────────┐  ┌────────────┐  │   │
│  │  │ Game State  │  │ Player State │  │ FHE Logic  │  │   │
│  │  └─────────────┘  └──────────────┘  └────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                            │                                 │
│                            │ Decryption Request              │
│                            ▼                                 │
│  ┌──────────────────────────────────────────────────────┐   │
│  │         Zama Decryption Oracle                       │   │
│  │  (Handles encrypted data decryption & verification) │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Game Creation**: Host creates game with specified player count
2. **Player Joining**: Players join until capacity is reached (state: Open → Ready)
3. **Game Start**: Host initiates game start (state: Ready → Started)
4. **Move Submission**:
   - Players encrypt their moves client-side using Zama Relayer SDK
   - Encrypted moves submitted to smart contract with zero-knowledge proof
   - Contract stores encrypted moves without decrypting
5. **Automatic Reveal**:
   - When all moves submitted, contract requests batch decryption from oracle
   - State transitions to Revealing
   - Oracle decrypts all moves and returns results with cryptographic proof
6. **Winner Determination**:
   - Contract verifies oracle's proof
   - Applies Rock-Paper-Scissors game logic
   - Determines winner(s) or declares draw
   - State transitions to Revealed
   - Events emitted with results

## Prerequisites

- **Node.js**: Version 20 or higher
- **npm**: Version 7.0.0 or higher
- **Wallet**: MetaMask or compatible Web3 wallet
- **Testnet ETH**: Sepolia testnet ETH for deployment and testing
- **Git**: For cloning the repository

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/fhe-rps.git
cd fhe-rps
```

### 2. Install Smart Contract Dependencies

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

## Configuration

### Environment Variables

Create a `.env` file in the root directory:

```bash
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Infura API key for Sepolia access
INFURA_API_KEY=your_infura_api_key

# Optional: Etherscan API key for contract verification
ETHERSCAN_API_KEY=your_etherscan_api_key

# Optional: Custom RPC URL
SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY

# Decryption oracle address (default provided, can be customized)
DECRYPTION_ORACLE=0xa02Cda4Ca3a71D7C46997716F4283aa851C28812
```

### Hardhat Configuration

The project is pre-configured for Sepolia testnet. You can modify network settings in `hardhat.config.ts`:

```typescript
networks: {
  sepolia: {
    accounts: SEPOLIA_ACCOUNTS,
    chainId: 11155111,
    url: SEPOLIA_RPC_URL,
  },
}
```

### Frontend Configuration

Update contract address in `frontend/src/config/contracts.ts` after deployment:

```typescript
export const CONTRACT_ADDRESS: Address = '0xYourDeployedContractAddress';
```

## Usage

### Smart Contract Deployment

#### Deploy to Local Hardhat Network

```bash
# Terminal 1: Start local FHEVM-enabled node
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat deploy --network localhost
```

#### Deploy to Sepolia Testnet

```bash
# Compile contracts
npm run compile

# Deploy to Sepolia
npm run deploy:sepolia

# Verify on Etherscan (optional)
npm run verify:sepolia
```

The deployment script will output the contract address. Copy this address to your frontend configuration.

### Frontend Setup

```bash
cd frontend

# Development mode with hot reload
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The frontend will be available at `http://localhost:5173`

### Running Tests

#### Smart Contract Tests

```bash
# Run all tests on local Hardhat network
npm test

# Run tests with gas reporting
REPORT_GAS=true npm test

# Run tests on Sepolia testnet
npm run test:sepolia

# Generate coverage report
npm run coverage
```

#### Frontend Tests

```bash
cd frontend
npm run lint
```

## How It Works

### Encryption Process

1. **Client-Side Encryption**:
   - Player selects move (1: Rock, 2: Paper, 3: Scissors)
   - Frontend uses Zama Relayer SDK to create encrypted input
   - Move is encrypted using Zama's FHE scheme
   - Zero-knowledge proof generated to verify encryption validity

2. **On-Chain Storage**:
   - Encrypted move submitted to smart contract
   - Contract validates proof without decrypting
   - Move stored as `euint8` (encrypted 8-bit unsigned integer)
   - Access control applied (only player and contract can access)

3. **Batch Decryption**:
   - When all players submit moves, contract initiates decryption request
   - All encrypted moves sent to Zama's decryption oracle
   - Oracle decrypts using threshold cryptography
   - Returns plaintext moves with cryptographic proof

4. **Winner Calculation**:
   - Contract verifies decryption proof
   - Applies Rock-Paper-Scissors logic:
     - Rock (1) beats Scissors (3)
     - Paper (2) beats Rock (1)
     - Scissors (3) beats Paper (2)
   - Handles edge cases (all same move, all different moves)

### Game Theory Logic

The contract implements the following winner determination rules:

- **Two Different Moves**: One move wins (Paper > Rock > Scissors > Paper)
- **All Same Move**: Draw (no winners)
- **All Different Moves**: Draw (no winners)
- **Multiple Winners**: When multiple players choose the winning move

Example scenarios:
- Players: [Rock, Paper] → Winner: Paper
- Players: [Rock, Rock, Paper] → Winner: Paper
- Players: [Rock, Paper, Scissors] → Draw
- Players: [Rock, Rock] → Draw

## Game Flow

### Complete Game Lifecycle

```
1. CREATE GAME (State: Open)
   ├─ Host calls createGame(maxPlayers)
   ├─ Contract emits GameCreated event
   └─ Host automatically joins as first player

2. JOIN GAME (State: Open)
   ├─ Players call joinGame(gameId)
   ├─ Contract validates game state and capacity
   ├─ Contract emits PlayerJoined event
   └─ When full, state changes to Ready

3. START GAME (State: Ready → Started)
   ├─ Host calls startGame(gameId)
   ├─ Contract validates only host can start
   └─ Contract emits GameStarted event

4. SUBMIT MOVES (State: Started)
   ├─ Each player encrypts their move client-side
   ├─ Player calls submitMove(gameId, encryptedMove, proof)
   ├─ Contract validates and stores encrypted move
   ├─ Contract emits MoveSubmitted event
   └─ When all moves submitted, auto-transition to Revealing

5. DECRYPTION (State: Revealing)
   ├─ Contract calls FHE.requestDecryption()
   ├─ Contract emits RevealRequested event
   ├─ Decryption oracle processes request
   └─ Oracle calls handleDecryptionResult()

6. REVEAL & WINNER (State: Revealed)
   ├─ Contract verifies decryption proof
   ├─ Contract determines winner(s) based on game logic
   ├─ Contract emits GameRevealed event
   └─ Game complete, results visible
```

## Smart Contract API

### Core Functions

#### `createGame(uint8 maxPlayers) → uint256 gameId`
Creates a new game with specified maximum player count (2-4).

**Parameters**:
- `maxPlayers`: Number of players allowed (2-4)

**Returns**: Game ID for the newly created game

**Emits**: `GameCreated`, `PlayerJoined`

---

#### `joinGame(uint256 gameId)`
Join an existing open game.

**Parameters**:
- `gameId`: ID of the game to join

**Requirements**:
- Game must be in Open state
- Game must not be full
- Player must not already be joined

**Emits**: `PlayerJoined`, potentially `GameReady`

---

#### `startGame(uint256 gameId)`
Start a ready game (only callable by host).

**Parameters**:
- `gameId`: ID of the game to start

**Requirements**:
- Caller must be the game host
- Game must be in Ready state

**Emits**: `GameStarted`

---

#### `submitMove(uint256 gameId, externalEuint8 encryptedMove, bytes calldata inputProof)`
Submit an encrypted move for the current game.

**Parameters**:
- `gameId`: ID of the game
- `encryptedMove`: Encrypted move handle (1: Rock, 2: Paper, 3: Scissors)
- `inputProof`: Zero-knowledge proof for the encrypted input

**Requirements**:
- Game must be in Started state
- Player must be in the game
- Player must not have already submitted a move
- Encrypted move must be valid (1-3)

**Emits**: `MoveSubmitted`, potentially `RevealRequested`

---

#### `handleDecryptionResult(uint256 requestId, bytes calldata cleartexts, bytes calldata decryptionProof)`
Called by the decryption oracle to provide decrypted moves (internal, called by oracle).

**Parameters**:
- `requestId`: ID of the decryption request
- `cleartexts`: Decrypted move values
- `decryptionProof`: Cryptographic proof from KMS

**Requirements**:
- Caller must be the decryption oracle
- Request must be valid and pending

**Emits**: `GameRevealed`

---

### View Functions

#### `getGame(uint256 gameId) → GameInfo`
Returns comprehensive game information.

**Returns**:
- `host`: Address of game host
- `maxPlayers`: Maximum number of players
- `currentPlayers`: Current number of joined players
- `movesSubmitted`: Number of submitted moves
- `state`: Current game state (0-4)
- `players`: Array of player addresses
- `winners`: Array of winner addresses (empty until revealed)
- `revealedMoves`: Array of revealed moves (empty until revealed)
- `revealRequestId`: Oracle request ID for decryption

---

#### `getPlayerState(uint256 gameId, address player) → PlayerStateInfo`
Returns information about a specific player in a game.

**Returns**:
- `joined`: Whether player has joined
- `moveSubmitted`: Whether player has submitted their move
- `moveRevealed`: Whether player's move has been revealed
- `revealedMove`: The revealed move value (0 if not revealed)
- `encryptedMove`: The encrypted move handle

---

#### `totalGames() → uint256`
Returns the total number of games created.

---

### Events

```solidity
event GameCreated(uint256 indexed gameId, address indexed host, uint8 maxPlayers);
event PlayerJoined(uint256 indexed gameId, address indexed player);
event GameReady(uint256 indexed gameId);
event GameStarted(uint256 indexed gameId, address indexed starter);
event MoveSubmitted(uint256 indexed gameId, address indexed player);
event RevealRequested(uint256 indexed gameId, uint256 requestId);
event GameRevealed(uint256 indexed gameId, address[] winners, uint8 winningMove);
```

## Project Structure

```
fhe-rps/
├── contracts/
│   └── FHEROckPaperScissors.sol    # Main game contract with FHE logic
├── deploy/
│   └── deploy.ts                    # Hardhat deployment script
├── tasks/
│   ├── accounts.ts                  # Account management tasks
│   └── FHEROckPaperScissors.ts      # Contract interaction tasks
├── test/
│   ├── FHEROckPaperScissors.ts      # Local network tests
│   └── FHEROckPaperScissorsSepolia.ts # Sepolia testnet tests
├── frontend/
│   ├── src/
│   │   ├── home.tsx                 # Main game UI component
│   │   ├── config/
│   │   │   ├── contracts.ts         # Contract ABI and address
│   │   │   └── wagmi.ts             # Wagmi/Web3 configuration
│   │   ├── hooks/
│   │   │   ├── useEthersSigner.ts   # Ethers.js signer hook
│   │   │   └── useZamaInstance.ts   # Zama FHE instance hook
│   │   └── styles/
│   │       └── Home.css             # Styling
│   ├── index.html                   # HTML entry point
│   ├── package.json                 # Frontend dependencies
│   ├── vite.config.ts               # Vite build configuration
│   └── netlify.toml                 # Netlify deployment config
├── hardhat.config.ts                # Hardhat configuration
├── package.json                     # Root dependencies
├── tsconfig.json                    # TypeScript configuration
├── .gitignore                       # Git ignore rules
└── README.md                        # This file
```

## Development

### Smart Contract Development

#### Compile Contracts

```bash
npm run compile
```

This compiles all Solidity contracts and generates TypeScript types.

#### Run Local Node

```bash
npx hardhat node
```

Starts a local Hardhat network with FHEVM support.

#### Deploy Locally

```bash
npx hardhat deploy --network localhost
```

#### Custom Tasks

View available accounts:
```bash
npx hardhat accounts
```

Interact with deployed contract:
```bash
npx hardhat create-game --network sepolia --players 2
npx hardhat join-game --network sepolia --game-id 0
```

### Frontend Development

#### Development Server

```bash
cd frontend
npm run dev
```

Hot-reload development server at `http://localhost:5173`

#### Code Quality

```bash
npm run lint        # Lint TypeScript/React code
npm run build       # Production build with type checking
```

### Linting and Formatting

#### Solidity

```bash
npm run lint:sol              # Lint Solidity code
npm run prettier:write        # Format all files
```

#### TypeScript/JavaScript

```bash
npm run lint:ts               # Lint TypeScript code
npm run prettier:check        # Check formatting
```

## Testing

### Test Coverage

The project includes comprehensive test suites:

#### Unit Tests
- Game creation and initialization
- Player joining and capacity limits
- Game state transitions
- Move submission and validation
- Encrypted move storage and access control
- Winner determination logic
- Edge case handling (draws, ties, all same moves)

#### Integration Tests
- Full game lifecycle testing
- Decryption oracle integration
- Multi-player scenarios
- Error handling and reverts

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/FHEROckPaperScissors.ts

# Run with gas reporting
REPORT_GAS=true npm test

# Generate coverage report
npm run coverage
```

### Test Example

```typescript
it("reveals the winner after encrypted submissions", async function () {
  // Create and start game
  await contract.connect(host).createGame(2);
  await contract.connect(challenger).joinGame(0n);
  await contract.connect(host).startGame(0n);

  // Submit encrypted moves
  const hostInput = fhevm.createEncryptedInput(contractAddress, host.address);
  hostInput.add8(1); // Rock
  const hostEncrypted = await hostInput.encrypt();
  await contract.connect(host).submitMove(0n, hostEncrypted.handles[0], hostEncrypted.inputProof);

  const challengerInput = fhevm.createEncryptedInput(contractAddress, challenger.address);
  challengerInput.add8(2); // Paper
  const challengerEncrypted = await challengerInput.encrypt();
  await contract.connect(challenger).submitMove(0n, challengerEncrypted.handles[0], challengerEncrypted.inputProof);

  // Wait for decryption oracle
  await fhevm.awaitDecryptionOracle();

  // Verify results
  const game = await contract.getGame(0n);
  expect(game.winners).to.deep.equal([challenger.address]); // Paper beats Rock
  expect(game.revealedMoves.map(v => Number(v))).to.deep.equal([1, 2]);
});
```

## Deployment

### Sepolia Testnet Deployment

1. **Get Testnet ETH**:
   - Visit [Sepolia Faucet](https://sepoliafaucet.com/)
   - Obtain test ETH for deployment

2. **Configure Environment**:
   ```bash
   # Set private key
   export PRIVATE_KEY=your_private_key_without_0x

   # Set Infura API key
   export INFURA_API_KEY=your_infura_api_key
   ```

3. **Deploy Contract**:
   ```bash
   npm run deploy:sepolia
   ```

4. **Verify Contract** (optional):
   ```bash
   npm run verify:sepolia
   ```

5. **Update Frontend Configuration**:
   - Copy deployed contract address
   - Update `frontend/src/config/contracts.ts`:
     ```typescript
     export const CONTRACT_ADDRESS: Address = '0xYourDeployedAddress';
     ```

### Frontend Deployment

#### Netlify

The project includes Netlify configuration (`frontend/netlify.toml`):

```bash
cd frontend
npm run build

# Deploy to Netlify
netlify deploy --prod
```

#### Vercel

```bash
cd frontend
npm run build

# Deploy to Vercel
vercel --prod
```

#### Static Hosting

```bash
cd frontend
npm run build

# Output directory: frontend/dist
# Upload contents to any static hosting service
```

## Security Considerations

### Smart Contract Security

1. **Access Control**:
   - Only hosts can start games
   - Only oracle can call decryption callback
   - Players can only submit moves for games they've joined

2. **State Validation**:
   - Strict state machine enforcement
   - Prevents invalid state transitions
   - Validates all inputs (player count, move values)

3. **Cryptographic Security**:
   - Zero-knowledge proofs validate encrypted inputs
   - Decryption proofs verified by KMS signatures
   - No plaintext moves stored on-chain during gameplay

4. **Reentrancy Protection**:
   - Uses checks-effects-interactions pattern
   - No external calls during critical state changes

### Frontend Security

1. **Wallet Security**:
   - Never exposes private keys
   - All signing done in wallet
   - RainbowKit handles wallet security

2. **Input Validation**:
   - Validates all user inputs
   - Prevents invalid move submission
   - Checks game state before actions

3. **Environment Variables**:
   - Never commit `.env` files
   - Use environment variables for sensitive data

### Best Practices

1. **Private Key Management**:
   - Never hardcode private keys
   - Use environment variables or Hardhat vars
   - Use dedicated deployment wallets

2. **Testing**:
   - Always test on testnet before mainnet
   - Verify contract source code on Etherscan
   - Conduct security audits for production use

3. **User Education**:
   - Inform users about gas costs
   - Explain FHE decryption timing
   - Provide clear error messages

## Future Roadmap

### Phase 1: Core Enhancements (Q2 2025)

- [ ] **Tournament Mode**: Bracket-style tournaments with multiple games
- [ ] **Wagering System**: ETH or ERC-20 token betting with winner-takes-all
- [ ] **Leaderboard**: On-chain player statistics and rankings
- [ ] **Game History**: Per-player game history and statistics
- [ ] **Spectator Mode**: Allow non-players to watch games in progress

### Phase 2: Advanced Features (Q3 2025)

- [ ] **Time Limits**: Configurable time limits for move submission
- [ ] **Partial Reveals**: Progressive reveal system for dramatic effect
- [ ] **Multi-Round Games**: Best-of-N game series
- [ ] **Team Mode**: Team-based gameplay with alliances
- [ ] **Custom Game Rules**: Variants like Rock-Paper-Scissors-Lizard-Spock
- [ ] **NFT Integration**: Game result NFTs as achievements

### Phase 3: Scalability & UX (Q4 2025)

- [ ] **Layer 2 Integration**: Deploy on Optimism/Arbitrum for lower costs
- [ ] **Mobile App**: Native iOS/Android applications
- [ ] **Social Features**: Friend lists, private lobbies, chat
- [ ] **Advanced Analytics**: Detailed game statistics and insights
- [ ] **Matchmaking System**: Automated player matching by skill level
- [ ] **Gasless Transactions**: Meta-transactions for improved UX

### Phase 4: Ecosystem Growth (2026)

- [ ] **API & SDK**: Developer tools for building on top of the platform
- [ ] **DAO Governance**: Community-driven game rule modifications
- [ ] **Cross-Chain Support**: Bridge to other FHE-enabled chains
- [ ] **Game Templates**: Framework for creating other FHE-based games
- [ ] **Prize Pools**: Sponsored tournaments and competitions
- [ ] **Advanced FHE Features**: Leverage new FHE capabilities as they emerge

### Research & Innovation

- [ ] **Zero-Knowledge Proofs**: Enhanced privacy features
- [ ] **Threshold Encryption**: Distributed trust for reveals
- [ ] **MEV Protection**: Additional MEV resistance mechanisms
- [ ] **Cross-Game Reputation**: Reputation system across multiple games
- [ ] **AI Opponents**: On-chain AI players using FHE
- [ ] **Privacy-Preserving Analytics**: Aggregate statistics without revealing individual data

### Community Requests

We actively welcome community suggestions! Submit feature requests via:
- GitHub Issues
- Discord discussions
- Community governance (coming soon)

## Contributing

We welcome contributions from the community! Here's how you can help:

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/fhe-rps/issues)
2. Create a detailed bug report including:
   - Steps to reproduce
   - Expected behavior
   - Actual behavior
   - Environment details (browser, wallet, network)
   - Screenshots or error logs

### Feature Requests

1. Check existing feature requests
2. Create a new issue with the `enhancement` label
3. Describe the feature and its use case
4. Discuss implementation approach

### Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Ensure all tests pass (`npm test`)
6. Format code (`npm run prettier:write`)
7. Commit changes (`git commit -m 'Add amazing feature'`)
8. Push to branch (`git push origin feature/amazing-feature`)
9. Open a Pull Request

### Code Style

- Follow existing code conventions
- Use TypeScript for type safety
- Write clear comments for complex logic
- Include JSDoc documentation for public functions
- Follow Solidity style guide for smart contracts

### Testing Requirements

- Add tests for all new features
- Maintain >80% code coverage
- Test edge cases and error conditions
- Include integration tests for contract changes

## License

This project is licensed under the **BSD-3-Clause-Clear License**.

```
Copyright (c) 2025, FHE Rock Paper Scissors Contributors
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted (subject to the limitations in the disclaimer
below) provided that the following conditions are met:

* Redistributions of source code must retain the above copyright notice,
  this list of conditions and the following disclaimer.
* Redistributions in binary form must reproduce the above copyright notice,
  this list of conditions and the following disclaimer in the documentation
  and/or other materials provided with the distribution.
* Neither the name of the copyright holder nor the names of its contributors
  may be used to endorse or promote products derived from this software
  without specific prior written permission.

NO EXPRESS OR IMPLIED LICENSES TO ANY PARTY'S PATENT RIGHTS ARE GRANTED BY
THIS LICENSE.
```

See the [LICENSE](LICENSE) file for complete terms.

### Third-Party Licenses

This project uses open-source software:
- **Zama FHEVM**: BSD-3-Clause-Clear
- **Hardhat**: MIT License
- **React**: MIT License
- **OpenZeppelin Contracts**: MIT License

## Support

### Documentation

- **FHEVM Documentation**: [https://docs.zama.ai/fhevm](https://docs.zama.ai/fhevm)
- **Hardhat Documentation**: [https://hardhat.org/docs](https://hardhat.org/docs)
- **Zama Developer Guide**: [https://docs.zama.ai/protocol/solidity-guides](https://docs.zama.ai/protocol/solidity-guides)

### Community

- **GitHub Issues**: [Report bugs or request features](https://github.com/yourusername/fhe-rps/issues)
- **Zama Discord**: [https://discord.gg/zama](https://discord.gg/zama)
- **Zama Community**: [https://community.zama.ai](https://community.zama.ai)
- **Twitter/X**: [@ZamaFHE](https://twitter.com/ZamaFHE)

### Getting Help

1. **Read the Documentation**: Check this README and linked documentation
2. **Search Issues**: Your question might already be answered
3. **Ask in Discord**: Join the Zama Discord for real-time help
4. **Create an Issue**: For bugs or feature requests

### FAQ

**Q: How much does it cost to play a game?**
A: Gas costs vary by network. On Sepolia testnet, games cost ~500k-1M gas. On mainnet, expect higher costs during peak times.

**Q: How long does decryption take?**
A: The Zama decryption oracle typically processes requests within 30-60 seconds, depending on network conditions.

**Q: Can I play on mainnet?**
A: Currently optimized for Sepolia testnet. Mainnet deployment planned after additional auditing and optimization.

**Q: Is the encryption truly secure?**
A: Yes, Zama's FHE implementation provides cryptographic guarantees. Encrypted data cannot be decrypted without the proper keys held by the decryption network.

**Q: What happens if a player doesn't submit a move?**
A: Currently, games remain in the Started state. Future versions will include timeout mechanisms.

**Q: Can I create private games?**
A: All games are currently public. Private lobbies are planned for a future release.

---

**Built with ❤️ using [Zama FHEVM](https://www.zama.ai/fhevm) - Pioneering Privacy-Preserving Smart Contracts**

**Star this repository if you found it helpful! ⭐**
