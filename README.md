# The Praise Board — Tip Jar & Live Supporter Wall

A decentralized tipping dApp built for the "zero-to-one-tech-builder-series" Praise Board battle. Allows commuters to connect an Ethereum wallet, send a tip with an attached note, and see their message appear immediately on a live wall of supporters populated strictly from decoded contract event logs.

## Deployed contract
Sepolia: 0x5FbDB2315678afecb367f032d93F642f64180aa3

---

## 🏛️ Architecture & Verification Guarantees

### 1. Log-Driven Supporter Wall
- **Single Source of Truth**: The supporter wall is rendered strictly by decoding historical and real-time `TipReceived(address indexed sender, uint256 amount, string note, uint256 timestamp)` event logs via `viem`/`wagmi` (`getLogs` and `watchContractEvent`).
- **No Spoofing / Storage Getters**: No component state arrays, backend databases, or contract view getters are used to store or serve the wall entries.
- **Optimistic Reconciliation**: Any pending optimistic tip broadcast from the client is matched by transaction hash and replaced by the official decoded event log as soon as the block is mined.

### 2. On-Chain Security & Truthfulness
- **Contract-Enforced Limits**: Notes exceeding `MAX_NOTE_LENGTH` (280 bytes) revert on-chain with custom error `NoteTooLong()`.
- **Sender & Amount Integrity**: `amount` is derived directly from `msg.value` and `sender` from `msg.sender` inside `PraiseBoard.sol`. Caller-supplied arguments for sender or amount are strictly forbidden.
- **Checks-Effects-Interactions**: In `withdraw()`, internal tracked balance is zeroed (`_balance = 0`) *before* the external ETH transfer call, complemented by a `nonReentrant` guard.
- **Owner Access Control**: Only the contract `owner` set during construction can execute `withdraw()`, gated by `onlyOwner` and reverting with custom error `NotOwner()`.

### 3. Frontend & Wallet Exception UX
- **User Rejection Handling**: Rejection in wallet (`UserRejectedRequestError` / code `4001`) triggers a distinct notice: `"You declined the request in your wallet."`
- **Receipt Status Inspection**: Inspects `receipt.status === 'reverted'` via `publicClient.waitForTransactionReceipt()` to surface distinct on-chain failure notices.
- **Network Enforcement**: Detects non-Sepolia connections and provides a clear prompt/action to switch networks.

---

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Compile Smart Contracts
```bash
npx hardhat compile
```

### Run Hardhat Unit Tests
```bash
npx hardhat test
```

### Local Deployment
```bash
npx hardhat node
npx hardhat run scripts/deploy.ts --network localhost
```

### Sepolia Deployment via QuickNode
1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. Configure your `SEPOLIA_RPC_URL` and `DEPLOYER_PRIVATE_KEY` in `.env`.
3. Deploy to Sepolia:
   ```bash
   npx hardhat run scripts/deploy.ts --network sepolia
   ```

### Launch Frontend
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📁 Repository Layout
```
praise-board/
├── contracts/
│   └── PraiseBoard.sol          # Solidity 0.8.24 Tip Jar contract
├── scripts/
│   └── deploy.ts                # Hardhat deployment script
├── test/
│   └── PraiseBoard.test.ts      # Comprehensive test suite
├── app/                         # Next.js App Router frontend
│   ├── components/
│   │   ├── Navbar.tsx           # Wallet connect & owner withdraw UI
│   │   ├── TipForm.tsx          # Tip input, rejection & receipt handling
│   │   └── SupporterWall.tsx    # Event log-driven supporter wall
│   ├── contracts/
│   │   └── PraiseBoardABI.ts    # Contract ABI and address configuration
│   ├── hooks/
│   │   └── useSupporterWall.ts  # Log fetching, event subscription & reconciliation
│   ├── lib/
│   │   └── wagmi.ts             # Wagmi & Viem public client config
│   ├── page.tsx                 # Main layout
│   └── globals.css              # Custom styles & scrollbar
├── .env.example                 # Tracked environment variable placeholders
├── .gitignore                   # Gitignore configured to exclude .env
├── hardhat.config.ts            # Hardhat configuration
└── README.md                    # Project documentation & deployed address
```
