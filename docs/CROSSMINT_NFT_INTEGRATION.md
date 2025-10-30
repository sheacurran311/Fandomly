# Crossmint NFT Integration Guide

## Overview

Fandomly has integrated Crossmint's NFT tokenization API to enable creators to mint and distribute NFTs to their communities. This integration supports EVM chains (Polygon, Base, Arbitrum, Optimism) and Solana (including compressed NFTs).

**Key Features:**
- ✅ Creator-controlled NFT collections with full ownership
- ✅ Fandomly-issued platform badges (credentials)
- ✅ Multi-chain support (EVM + Solana)
- ✅ Solana compressed NFTs for cost optimization
- ✅ Automatic delivery to Dynamic embedded wallets
- ✅ Snag-inspired template builder UI
- ✅ Integrated with rewards & task completion systems

---

## Architecture

### Backend Components

**1. Database Schema** (`shared/schema.ts`)
- `nft_collections` - NFT collection contracts
- `nft_templates` - Creator-defined NFT templates
- `fandomly_badge_templates` - Platform badge templates
- `nft_mints` - Mint operation tracking
- `nft_deliveries` - Successful NFT deliveries

**2. Crossmint Service** (`server/crossmint-service.ts`)
- Collection creation on any supported chain
- Single & batch NFT minting
- Compressed NFT support for Solana
- Mint status polling & monitoring
- NFT metadata management

**3. API Routes** (`server/crossmint-routes.ts`)
- `/api/nft/collections` - Collection CRUD
- `/api/nft/templates` - Template CRUD
- `/api/nft/mint` - Single mint operations
- `/api/nft/mint/batch` - Batch minting
- `/api/nft/mint/:actionId/status` - Status tracking
- `/api/nft/webhooks/crossmint` - Webhook receiver
- `/api/admin/badges/*` - Admin badge management

### Frontend Components

**1. NFT Collections Page** (`client/src/pages/creator-dashboard/nft-collections.tsx`)
- View all creator collections
- Create new collections
- Chain & token type selection
- Collection stats & management

**2. NFT Template Builder** (`client/src/components/nft/NFTTemplateBuilder.tsx`)
- 3-step wizard (Category → Metadata → Supply)
- Snag-inspired category selection
- Attribute builder
- Supply & pricing configuration

**3. Custom Hooks** (`client/src/hooks/`)
- `useCrossmint.ts` - NFT operations (collections, templates, minting)
- `useDynamicWallets.ts` - Wallet address retrieval from Dynamic

---

## Setup Instructions

### 1. Environment Variables

Add to your `.env` file:

```bash
# Crossmint Configuration
CROSSMINT_API_KEY=sk_staging_xxxxx
CROSSMINT_ENVIRONMENT=staging  # or 'www' for production
CROSSMINT_PROJECT_ID=your-project-id
CROSSMINT_WEBHOOK_SECRET=your-webhook-secret
```

### 2. Database Migration

Run the migration to create NFT tables:

```bash
npm run db:push
```

This will create:
- `nft_collections`
- `nft_templates`
- `fandomly_badge_templates`
- `nft_mints`
- `nft_deliveries`

### 3. Initialize Crossmint Service

The service is automatically initialized in `server/index.ts`:

```typescript
initializeCrossmintService();
```

### 4. Get Crossmint API Key

1. Sign up at [Crossmint Console](https://staging.crossmint.com/console)
2. Create a new project
3. Generate API key with scopes: `nfts.create`, `nfts.read`
4. Add key to `.env`

---

## Usage Guide

### For Creators

#### Creating an NFT Collection

1. Navigate to **Creator Dashboard → NFT Collections**
2. Click **Create Collection**
3. Enter collection details:
   - **Name**: Collection name (e.g., "Fan Badges")
   - **Description**: Optional description
   - **Symbol**: Token symbol (e.g., "BADGE")
   - **Chain**: Select blockchain (Polygon, Base, Solana, etc.)
   - **Token Type**: ERC-721, ERC-1155, Solana, or Solana Compressed
4. Click **Create Collection**
5. Collection deploys on-chain (takes 30-60 seconds)

#### Creating NFT Templates

1. Open your collection
2. Click **Create Template**
3. **Step 1 - Category**: Choose category (Badges, Art, Collectibles, etc.)
4. **Step 2 - Metadata**:
   - Name & description
   - Image URL (IPFS or hosted)
   - Rarity level
   - Attributes (trait_type & value pairs)
5. **Step 3 - Supply**:
   - Mint price (in points, 0 = free)
   - Max supply (leave empty for unlimited)
   - Draft mode toggle
6. Click **Create Template**

#### Minting NFTs

**Single Mint:**
```typescript
const { mutate: mintNft } = useMintNft();

mintNft({
  templateId: 'template-id',
  recipientUserId: 'user-id',
  recipientWalletAddress: walletAddress, // From Dynamic
  mintReason: 'reward_redemption',
  contextData: { rewardId: 'reward-123' }
});
```

**Batch Mint:**
```typescript
const { mutate: batchMint } = useBatchMintNft();

batchMint({
  templateId: 'template-id',
  recipients: [
    { userId: 'user-1', walletAddress: '0x...' },
    { userId: 'user-2', walletAddress: '0x...' }
  ],
  mintReason: 'task_completion'
});
```

### For Platform Admins

#### Creating Fandomly Badge Templates

1. Navigate to **Admin Dashboard → Badges**
2. Click **Create Badge Template**
3. Configure:
   - Badge name & description
   - Category (achievement, milestone, special, event)
   - Requirement type (task_completion, points_threshold, referrals, etc.)
   - Image URL
   - NFT attributes
4. Link to Fandomly's platform collection
5. Click **Create Badge**

#### Issuing Badges

Badges are automatically issued when users meet requirements, or manually via:

```typescript
POST /api/admin/badges/issue
{
  badgeTemplateId: 'badge-template-id',
  recipientUserId: 'user-id',
  recipientWalletAddress: '0x...'
}
```

---

## Chain Support

### Testnet Chains (Recommended for Development)

| Chain | Identifier | Best For | Gas Costs |
|-------|-----------|----------|-----------|
| **Polygon Amoy** | `polygon-amoy` | EVM testing | Very low |
| **Base Sepolia** | `base-sepolia` | Base testing | Very low |
| **Solana Devnet** | `solana` | Solana testing | Nearly free |

### Mainnet Chains

| Chain | Identifier | Best For | Gas Costs |
|-------|-----------|----------|-----------|
| **Polygon** | `polygon` | Production EVM | Low |
| **Base** | `base` | Production EVM | Very low |
| **Solana** | `solana` | High volume | Nearly free |
| **Arbitrum** | `arbitrum` | Production EVM | Very low |
| **Optimism** | `optimism` | Production EVM | Very low |

### Solana Compressed NFTs

For **high-volume** NFT distribution (thousands of badges), use Solana Compressed NFTs:

**Benefits:**
- **99% cheaper** than standard NFTs
- **Thousands per second** throughput
- Fully compatible with Solana wallets

**Usage:**
```typescript
// When creating collection, select:
tokenType: 'SOLANA_COMPRESSED'
```

---

## Integration with Existing Features

### 1. Rewards System Integration

NFT templates can be set as rewards:

```typescript
// In reward creation/update
rewardType: 'nft'
rewardData: {
  nftTemplateId: 'template-id',
  collectionId: 'collection-id'
}
```

When user redeems NFT reward:
1. Points are deducted
2. NFT is minted to user's Dynamic wallet
3. Delivery record is created
4. User receives notification

### 2. Task Completion Badges

Automatically issue badges when tasks are completed:

```typescript
// In task completion handler
if (task.autoIssueBadge && task.badgeTemplateId) {
  await mintBadge({
    badgeTemplateId: task.badgeTemplateId,
    recipientUserId: user.id,
    recipientWalletAddress: getPrimaryWalletForChain(user, 'polygon'),
    mintReason: 'task_completion',
    contextData: { taskId: task.id }
  });
}
```

### 3. Dynamic Wallet Integration

All Fandomly users have embedded wallets from Dynamic:
- **EVM wallets** - For Ethereum, Polygon, Base, Arbitrum, Optimism
- **Solana wallets** - For Solana NFTs

**Getting User's Wallet Address:**
```typescript
const { getPrimaryWalletForChain } = useDynamicWallets();

const evmAddress = getPrimaryWalletForChain('polygon');
const solanaAddress = getPrimaryWalletForChain('solana');
```

---

## API Reference

### Collections

**Create Collection**
```
POST /api/nft/collections
{
  name: string,
  description?: string,
  symbol?: string,
  chain: string,
  tokenType?: 'ERC721' | 'ERC1155' | 'SOLANA' | 'SOLANA_COMPRESSED',
  isCreatorOwned?: boolean,
  metadata?: object
}
```

**Get Collections**
```
GET /api/nft/collections
```

**Get Collection Details**
```
GET /api/nft/collections/:id
```

### Templates

**Create Template**
```
POST /api/nft/templates
{
  collectionId: string,
  name: string,
  description?: string,
  category: string,
  metadata: {
    image: string,
    attributes: Array<{trait_type, value}>,
    rarity?: string
  },
  mintPrice?: number,
  maxSupply?: number,
  isDraft?: boolean
}
```

**Get Templates**
```
GET /api/nft/templates?collectionId=xxx
```

### Minting

**Mint Single NFT**
```
POST /api/nft/mint
{
  templateId: string,
  recipientUserId: string,
  recipientWalletAddress: string,
  mintReason?: string,
  contextData?: object
}
```

**Batch Mint**
```
POST /api/nft/mint/batch
{
  templateId: string,
  recipients: Array<{userId, walletAddress}>,
  mintReason?: string
}
```

**Get Mint Status**
```
GET /api/nft/mint/:actionId/status
```

---

## Troubleshooting

### Common Issues

**1. "Crossmint service not available"**
- Check `CROSSMINT_API_KEY` is set in `.env`
- Restart server after adding env vars

**2. "No wallet found for chain"**
- Ensure user has connected wallet in Dynamic
- Check chain is supported (EVM or Solana)

**3. "Mint operation timed out"**
- Check blockchain network status
- Try again - some blockchains can be slow during congestion

**4. "Template supply limit reached"**
- Check `maxSupply` on template
- Create new template or update existing one

### Debugging Mint Operations

Check mint status:
```typescript
const { data } = useMintStatus(actionId);
console.log('Mint status:', data?.mint?.status);
console.log('Token ID:', data?.mint?.tokenId);
console.log('TX Hash:', data?.mint?.txHash);
```

View Crossmint logs:
```bash
# Server logs show Crossmint API calls
npm run dev
# Watch for "Crossmint" prefixed logs
```

---

## Best Practices

### 1. Chain Selection

- **Development**: Use testnets (Polygon Amoy, Base Sepolia)
- **Low-cost production**: Use Polygon or Base
- **High volume**: Use Solana Compressed NFTs
- **Brand preference**: Choose chain based on your community

### 2. Supply Management

- **Limited editions**: Set `maxSupply`
- **Unlimited badges**: Leave `maxSupply` empty
- **Point-gated**: Set `mintPrice` > 0
- **Free mints**: Set `mintPrice` = 0

### 3. Metadata

- **Images**: Use IPFS for permanence (e.g., `ipfs://Qm...`)
- **Attributes**: Add meaningful traits (Level, Rarity, Type, etc.)
- **Descriptions**: Be clear and concise

### 4. Gas Costs

- **Polygon/Base**: ~$0.001 per mint
- **Solana**: ~$0.00001 per mint
- **Solana Compressed**: ~$0.0000001 per mint

### 5. Testing Flow

1. Create collection on testnet
2. Create 2-3 test templates
3. Mint to test users
4. Verify in Dynamic wallet
5. Check on blockchain explorer
6. Test batch minting
7. Move to mainnet

---

## Next Steps

### Remaining Components to Build

1. **NFT Gallery Component** - Display user's NFTs in portfolio
2. **Mint Distribution Interface** - UI for bulk minting to fans
3. **Admin Badge Management** - Full CRUD for Fandomly badges
4. **NFT Marketplace Integration** - Show NFTs in creator stores

### Future Enhancements

- Secondary market support
- NFT staking/rewards
- Dynamic NFT metadata updates
- Cross-chain bridging
- Gasless minting for fans

---

## Support & Resources

- [Crossmint Documentation](https://docs.crossmint.com/minting/introduction)
- [Crossmint Console](https://staging.crossmint.com/console)
- [Fandomly Integration Status](/docs/PROJECT_STATUS.md)
- [Snag/Kazm Inspiration](/docs/SNAG_KAZM_INSPIRATION.md)

---

**Implementation Status**: ✅ Backend Complete | ⚡ Frontend In Progress

Last Updated: October 26, 2025

