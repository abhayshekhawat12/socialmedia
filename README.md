# BlockSocial - Decentralized Social Media Platform with Proof-of-Creation

BlockSocial is a modern, production-grade **Decentralized Social Media Platform** inspired by Instagram, powered by an original Web3 visual identity and a unique core USP: **Proof-of-Creation**.

---

## 🌟 Core Features & USP

1. **Proof-of-Creation Engine**
   - Every original post generates a cryptographic content fingerprint (Keccak-256) of its media and metadata anchored directly on Ethereum EVM smart contracts.
   - Anyone can inspect and verify content provenance and original creator ownership.

2. **Web3 Wallet Authentication & Identity**
   - Wallet connection via MetaMask / EVM browser wallets.
   - EIP-191 signature challenge authentication (`personal_sign`).
   - Web3 profile ID generation and metadata registration on-chain.

3. **Decentralized IPFS Storage**
   - Uploaded photos and videos are stored permanently across peer-to-peer IPFS nodes with content addressing (CIDs).

4. **Creator Social Asset NFTs**
   - Creators can optionally mint verified social posts into ERC721 NFTs stored on-chain with custom token URIs.

5. **Creator Analytics Dashboard**
   - Interactive SVG engagement charts tracking views, likes, comments, verified content counts, and portfolio NFTs.

---

## 🏗️ Hybrid Architecture

- **Smart Contracts (EVM)**: Identity registration, Proof-of-Creation content hashing registry (`ProofOfCreation.sol`), and ERC721 NFT minting (`SocialNFT.sol`).
- **Database (Prisma + SQLite)**: Lightning-fast social queries (Feed, Likes, Comments, Followers, Notifications, Search, Analytics).
- **IPFS Storage**: Peer-to-peer storage of images, video media, and metadata JSON files.

---

## 🚀 Quickstart Guide

### 1. Installation
```bash
npm install
```

### 2. Database Initialization
```bash
npx prisma db push
```

### 3. Compile & Test Smart Contracts
```bash
npx hardhat test
```

### 4. Deploy Smart Contracts to Local Hardhat Network
In terminal 1:
```bash
npx hardhat node
```
In terminal 2:
```bash
npx hardhat run scripts/deploy.ts --network localhost
```

### 5. Launch Development Server
```bash
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Smart Contract Testing Suite

The Hardhat test suite (`test/ProofOfCreation.test.ts`) verifies:
- Web3 Profile registration and metadata CID update.
- Proof-of-Creation cryptographic hashing and on-chain registration.
- Duplicate content hash prevention.
- ERC721 NFT minting and owner verification.

Run tests:
```bash
npx hardhat test
```

---

## 📁 Project Structure

```
/contracts
  ├── ProofOfCreation.sol    # Web3 profiles & Proof-of-Creation registry
  ├── SocialNFT.sol          # OpenZeppelin ERC721 post NFT mint contract
  └── SocialMedia.sol        # Content DNA & Royalty engine contract
/prisma
  └── schema.prisma          # Database models (User, Profile, Post, Comment, Like, Follow, etc.)
/app
  ├── page.tsx               # Landing Page with Web3 Hero & USP breakdown
  ├── wallet/page.tsx        # Wallet Login & Signature challenge portal
  ├── feed/page.tsx          # Home Feed with Stories bar & post cards
  ├── create/page.tsx        # Create Post with IPFS upload & proof anchoring
  ├── explore/page.tsx       # Search, trending creators, hashtags & posts
  ├── profile/page.tsx       # Web3 Profile page (Posts, NFTs, Verifications)
  ├── post/[id]/page.tsx     # Post details & Proof-of-Creation cryptographic inspector
  ├── notifications/page.tsx # Notifications center
  ├── settings/page.tsx      # Account, wallet & theme settings
  └── dashboard/page.tsx     # Creator Analytics Dashboard with SVG charts
/components
  ├── Navbar.tsx             # Responsive header with wallet & search
  ├── Sidebar.tsx            # Navigation sidebar
  ├── PostCard.tsx           # Feed post card component
  ├── ProofOfCreationBadge.tsx # Interactive verification modal
  ├── NFTBadge.tsx           # NFT token status modal
  └── AnalyticsCharts.tsx    # Interactive SVG analytics charts
/lib
  ├── web3Context.tsx        # Web3 wallet provider & signature auth
  ├── themeContext.tsx       # Light & Dark theme toggle
  ├── contract-helper.ts     # Ethers v6 contract wrappers & hashing
  ├── prisma.ts              # Singleton Prisma DB client
  └── ipfs.ts                # IPFS gateway resolver & uploader
```
