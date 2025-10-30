# Crossmint NFT Integration - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### Step 1: Set Environment Variables

Add to `.env`:
```bash
CROSSMINT_API_KEY=sk_staging_xxxxx
CROSSMINT_ENVIRONMENT=staging
```

Get your API key from [Crossmint Console](https://staging.crossmint.com/console)

### Step 2: Run Database Migration

```bash
npm run db:push
```

### Step 3: Start Server

```bash
npm run dev
```

Look for: `✅ Crossmint Service initialized (staging)`

### Step 4: Create Your First NFT

1. **Navigate to Creator Dashboard → NFT Collections**
2. **Click "Create Collection"**
   - Name: "My Fan Badges"
   - Chain: "Polygon Amoy (Testnet)"
   - Token Type: "ERC-721 (NFT)"
3. **Click "Create Collection"** (takes ~30 seconds to deploy)
4. **Open your new collection**
5. **Click "Create Template"**
   - Step 1: Choose "Badges & Credentials" category
   - Step 2: Name: "Gold Member Badge", add image URL
   - Step 3: Mint Price: 500 points, Max Supply: 100
6. **Click "Create Template"**

Done! You can now mint this NFT to your fans.

---

## 📁 File Structure

### Backend
```
server/
├── crossmint-service.ts      # Crossmint API wrapper
├── crossmint-routes.ts        # API endpoints
└── index.ts                   # Service initialization

shared/
└── schema.ts                  # Database tables (lines 1799-2122)
```

### Frontend
```
client/src/
├── hooks/
│   ├── useCrossmint.ts           # NFT operations hooks
│   └── useDynamicWallets.ts       # Wallet address retrieval
├── pages/creator-dashboard/
│   └── nft-collections.tsx        # Main collections page
└── components/nft/
    └── NFTTemplateBuilder.tsx     # 3-step template wizard
```

### Documentation
```
docs/
├── CROSSMINT_NFT_INTEGRATION.md         # Full guide
├── API_NFT_ENDPOINTS.md                 # API reference
├── CROSSMINT_IMPLEMENTATION_SUMMARY.md  # What's built
└── NFT_QUICKSTART.md                    # This file
```

---

## 🎯 Common Tasks

### Mint NFT to User

```typescript
import { useMintNft } from '@/hooks/useCrossmint';
import { useDynamicWallets } from '@/hooks/useDynamicWallets';

const { mutate: mintNft } = useMintNft();
const { getPrimaryWalletForChain } = useDynamicWallets();

// Get user's wallet for the collection's chain
const walletAddress = getPrimaryWalletForChain('polygon-amoy');

// Mint NFT
mintNft({
  templateId: 'tpl_xxx',
  recipientUserId: 'user_123',
  recipientWalletAddress: walletAddress,
  mintReason: 'reward_redemption',
  contextData: { rewardId: 'reward_456' }
});
```

### Check Mint Status

```typescript
import { useMintStatus } from '@/hooks/useCrossmint';

const { data } = useMintStatus(actionId);

console.log('Status:', data?.mint?.status);
// 'pending' → 'processing' → 'success' or 'failed'

if (data?.mint?.status === 'success') {
  console.log('Token ID:', data.mint.tokenId);
  console.log('TX Hash:', data.mint.txHash);
}
```

### Batch Mint

```typescript
import { useBatchMintNft } from '@/hooks/useCrossmint';

const { mutate: batchMint } = useBatchMintNft();

batchMint({
  templateId: 'tpl_xxx',
  recipients: [
    { userId: 'user_1', walletAddress: '0xAbc...123' },
    { userId: 'user_2', walletAddress: '0xDef...456' },
    // ... up to 1000 recipients
  ],
  mintReason: 'campaign_reward'
});
```

---

## 🔗 API Endpoints

### Collections
- `POST /api/nft/collections` - Create
- `GET /api/nft/collections` - List all
- `GET /api/nft/collections/:id` - Get details
- `PUT /api/nft/collections/:id` - Update

### Templates
- `POST /api/nft/templates` - Create
- `GET /api/nft/templates?collectionId=xxx` - List
- `PUT /api/nft/templates/:id` - Update
- `DELETE /api/nft/templates/:id` - Archive

### Minting
- `POST /api/nft/mint` - Mint single
- `POST /api/nft/mint/batch` - Batch mint
- `GET /api/nft/mint/:actionId/status` - Check status
- `GET /api/nft/deliveries` - User's NFTs

---

## 🌐 Supported Chains

### Testnet (Recommended for Development)
- ✅ **Polygon Amoy** - `polygon-amoy`
- ✅ **Base Sepolia** - `base-sepolia`
- ✅ **Solana Devnet** - `solana`

### Mainnet
- ✅ **Polygon** - `polygon`
- ✅ **Base** - `base`
- ✅ **Solana** - `solana` (Standard & Compressed)
- ✅ **Arbitrum** - `arbitrum`
- ✅ **Optimism** - `optimism`
- ✅ **Ethereum** - `ethereum`

---

## 💡 Key Concepts

### Collections
- Smart contract deployed on-chain
- Container for NFT templates
- Creator-controlled (can transfer ownership)

### Templates
- Blueprint for NFTs to be minted
- Defines metadata, attributes, rarity
- Reusable (mint same template multiple times)

### Minting
- Creates NFT from template
- Sends to user's Dynamic wallet
- Tracked in database for delivery

### Dynamic Wallets
- All users have embedded EVM + Solana wallets
- No user action required
- NFTs appear automatically

---

## 🐛 Troubleshooting

### "Crossmint service not available"
```bash
# Check .env has CROSSMINT_API_KEY
# Restart server
npm run dev
```

### "No wallet found for chain"
```typescript
// Ensure chain name is correct
const wallet = getPrimaryWalletForChain('polygon-amoy'); // ✅
const wallet = getPrimaryWalletForChain('polygon'); // ❌ if using testnet
```

### "Mint operation timed out"
```typescript
// Some blockchains are slow during congestion
// Just retry - NFT won't double-mint
```

### Check Logs
```bash
# Server logs show all Crossmint API calls
npm run dev
# Look for "❌" or "⚠️" prefixes for errors
```

---

## 📚 Full Documentation

- **User Guide:** `docs/CROSSMINT_NFT_INTEGRATION.md`
- **API Reference:** `docs/API_NFT_ENDPOINTS.md`
- **Implementation:** `docs/CROSSMINT_IMPLEMENTATION_SUMMARY.md`

---

## 🎉 You're Ready!

You now have a complete NFT tokenization system integrated with your platform. Start creating collections and minting NFTs to your community!

Need help? Check the full documentation or review the implementation summary.

---

**Quick Links:**
- [Crossmint Console](https://staging.crossmint.com/console)
- [Crossmint Docs](https://docs.crossmint.com/minting/introduction)
- [Dynamic Labs Dashboard](https://app.dynamic.xyz/)

