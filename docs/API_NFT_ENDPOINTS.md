# NFT API Endpoints Documentation

## Authentication

All NFT endpoints use Dynamic JWT authentication. Since the Dynamic environment ID is configured in Crossmint, authentication is seamless.

**Request Headers:**
```
x-dynamic-user-id: <dynamic-user-id>
```

The existing application authentication middleware (`server/middleware/rbac.ts`) handles:
1. Extracting Dynamic user ID from headers
2. Verifying user exists in database  
3. Attaching user info (id, role, permissions) to request
4. Admin routes additionally check `role: 'fandomly_admin'`

**No custom authentication middleware needed for Crossmint routes!**

---

## NFT Collections

### Create Collection

Create a new NFT collection and deploy smart contract.

```
POST /api/nft/collections
```

**Headers:**
```
Content-Type: application/json
Cookie: connect.sid=xxx
```

**Request Body:**
```json
{
  "name": "Fan Badges Collection",
  "description": "Exclusive badges for our community",
  "symbol": "BADGE",
  "chain": "polygon-amoy",
  "tokenType": "ERC721",
  "isCreatorOwned": true,
  "metadata": {
    "maxSupply": 10000,
    "royaltyPercentage": 5,
    "collectionImageUrl": "https://example.com/collection.png"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "collection": {
    "id": "col_abc123",
    "name": "Fan Badges Collection",
    "chain": "polygon-amoy",
    "contractAddress": null,
    "crossmintCollectionId": "cm_xyz789",
    "isActive": true,
    "createdAt": "2025-10-26T10:00:00Z"
  },
  "crossmint": {
    "actionId": "act_123456",
    "collectionId": "cm_xyz789"
  }
}
```

**Error Responses:**
- `400` - Missing required fields
- `401` - Unauthorized
- `403` - Not a creator
- `503` - Crossmint service unavailable

---

### Get All Collections

Fetch all collections for the authenticated creator.

```
GET /api/nft/collections
```

**Response:** `200 OK`
```json
{
  "collections": [
    {
      "id": "col_abc123",
      "name": "Fan Badges Collection",
      "description": "Exclusive badges",
      "chain": "polygon-amoy",
      "tokenType": "ERC721",
      "contractAddress": "0x1234...5678",
      "isActive": true,
      "metadata": {
        "totalSupply": 150,
        "maxSupply": 10000
      },
      "createdAt": "2025-10-26T10:00:00Z"
    }
  ]
}
```

---

### Get Collection Details

Fetch single collection with templates.

```
GET /api/nft/collections/:id
```

**Response:** `200 OK`
```json
{
  "collection": {
    "id": "col_abc123",
    "name": "Fan Badges Collection",
    "chain": "polygon-amoy",
    "contractAddress": "0x1234...5678",
    "metadata": { ... }
  },
  "templates": [
    {
      "id": "tpl_001",
      "name": "Gold Member Badge",
      "currentSupply": 50,
      "maxSupply": 100,
      "mintPrice": 500
    }
  ]
}
```

---

### Update Collection

Update collection metadata.

```
PUT /api/nft/collections/:id
```

**Request Body:**
```json
{
  "name": "Updated Collection Name",
  "description": "New description",
  "isActive": true,
  "metadata": {
    "collectionImageUrl": "https://new-image.com/image.png"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "collection": { ... }
}
```

---

## NFT Templates

### Create Template

Create an NFT template within a collection.

```
POST /api/nft/templates
```

**Request Body:**
```json
{
  "collectionId": "col_abc123",
  "name": "Gold Member Badge",
  "description": "Exclusive gold tier badge",
  "category": "badge_credential",
  "metadata": {
    "image": "ipfs://QmXxx.../badge.png",
    "attributes": [
      { "trait_type": "Tier", "value": "Gold" },
      { "trait_type": "Level", "value": "5" }
    ],
    "rarity": "rare"
  },
  "mintPrice": 500,
  "maxSupply": 100,
  "isDraft": false
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "template": {
    "id": "tpl_001",
    "collectionId": "col_abc123",
    "name": "Gold Member Badge",
    "currentSupply": 0,
    "maxSupply": 100,
    "mintPrice": 500,
    "isActive": true,
    "isDraft": false,
    "createdAt": "2025-10-26T11:00:00Z"
  }
}
```

---

### Get Templates

Fetch templates, optionally filtered by collection.

```
GET /api/nft/templates?collectionId=col_abc123
```

**Response:** `200 OK`
```json
{
  "templates": [
    {
      "id": "tpl_001",
      "name": "Gold Member Badge",
      "category": "badge_credential",
      "currentSupply": 25,
      "maxSupply": 100,
      "mintPrice": 500,
      "metadata": { ... }
    }
  ]
}
```

---

### Update Template

Update template configuration.

```
PUT /api/nft/templates/:id
```

**Request Body:**
```json
{
  "name": "Updated Badge Name",
  "isActive": true,
  "isDraft": false,
  "mintPrice": 600,
  "metadata": {
    "image": "ipfs://QmNew.../badge.png",
    "attributes": [ ... ]
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "template": { ... }
}
```

---

### Archive Template

Soft delete (mark inactive) a template.

```
DELETE /api/nft/templates/:id
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template archived"
}
```

---

## Minting Operations

### Mint Single NFT

Mint one NFT to a user.

```
POST /api/nft/mint
```

**Request Body:**
```json
{
  "templateId": "tpl_001",
  "recipientUserId": "user_123",
  "recipientWalletAddress": "0xAbCd...1234",
  "mintReason": "reward_redemption",
  "contextData": {
    "rewardId": "reward_456",
    "pointsSpent": 500
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "mint": {
    "id": "mint_789",
    "crossmintActionId": "act_cm123",
    "templateId": "tpl_001",
    "recipientUserId": "user_123",
    "status": "pending",
    "createdAt": "2025-10-26T12:00:00Z"
  },
  "crossmint": {
    "id": "nft_abc",
    "actionId": "act_cm123",
    "onChain": {
      "status": "pending",
      "chain": "polygon-amoy"
    }
  }
}
```

**Mint Reasons:**
- `reward_redemption` - User redeemed NFT as reward
- `task_completion` - Earned via task completion
- `badge_achievement` - Platform badge issued
- `direct_mint` - Manually minted by creator
- `admin_issued` - Issued by admin

---

### Batch Mint NFTs

Mint multiple NFTs to multiple users.

```
POST /api/nft/mint/batch
```

**Request Body:**
```json
{
  "templateId": "tpl_001",
  "recipients": [
    {
      "userId": "user_123",
      "walletAddress": "0xAbCd...1234"
    },
    {
      "userId": "user_456",
      "walletAddress": "0xEfGh...5678"
    }
  ],
  "mintReason": "campaign_reward",
  "contextData": {
    "campaignId": "camp_789"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "mints": [
    {
      "id": "mint_001",
      "recipientUserId": "user_123",
      "status": "pending"
    },
    {
      "id": "mint_002",
      "recipientUserId": "user_456",
      "status": "pending"
    }
  ],
  "total": 2
}
```

**Rate Limiting:**
- Maximum 1000 recipients per batch
- 10 requests per second limit
- Auto-throttled by Crossmint service

---

### Get Mint Status

Check status of a mint operation.

```
GET /api/nft/mint/:actionId/status
```

**Response:** `200 OK`
```json
{
  "mint": {
    "id": "mint_789",
    "crossmintActionId": "act_cm123",
    "status": "success",
    "tokenId": "42",
    "txHash": "0x9876...fedc",
    "contractAddress": "0x1234...5678",
    "completedAt": "2025-10-26T12:02:30Z"
  },
  "crossmint": {
    "actionId": "act_cm123",
    "status": "success",
    "data": {
      "chain": "polygon-amoy",
      "txId": "0x9876...fedc",
      "token": {
        "tokenId": "42",
        "contractAddress": "0x1234...5678"
      }
    }
  },
  "cached": false
}
```

**Mint Statuses:**
- `pending` - Submitted to blockchain
- `processing` - Being confirmed
- `success` - Minted successfully
- `failed` - Mint failed

---

### Get User's NFT Deliveries

Fetch all NFTs delivered to the authenticated user.

```
GET /api/nft/deliveries
```

**Response:** `200 OK`
```json
{
  "deliveries": [
    {
      "id": "del_001",
      "userId": "user_123",
      "tokenId": "42",
      "txHash": "0x9876...fedc",
      "chain": "polygon-amoy",
      "contractAddress": "0x1234...5678",
      "metadataSnapshot": {
        "name": "Gold Member Badge",
        "image": "ipfs://QmXxx.../badge.png",
        "attributes": [
          { "trait_type": "Tier", "value": "Gold" }
        ]
      },
      "isViewed": false,
      "deliveredAt": "2025-10-26T12:02:30Z"
    }
  ]
}
```

---

## Webhooks

### Crossmint Webhook Receiver

Receive mint status updates from Crossmint.

```
POST /api/nft/webhooks/crossmint
```

**Request Body (from Crossmint):**
```json
{
  "actionId": "act_cm123",
  "type": "nfts.create",
  "status": "success",
  "data": {
    "chain": "polygon-amoy",
    "txId": "0x9876...fedc",
    "token": {
      "tokenId": "42",
      "contractAddress": "0x1234...5678"
    }
  }
}
```

**Response:** `200 OK`
```json
{
  "received": true
}
```

**Webhook Configuration:**
1. Add webhook URL in Crossmint Console
2. Set `CROSSMINT_WEBHOOK_SECRET` in `.env`
3. Webhook verifies signature (implementation pending)

---

## Admin Badge Endpoints

### Create Badge Template

Create platform-wide badge template (admin only).

```
POST /api/admin/badges/templates
```

**Request Body:**
```json
{
  "name": "Task Master Badge",
  "description": "Complete 100 tasks",
  "category": "achievement",
  "requirementType": "task_completion",
  "requirementData": {
    "taskCount": 100
  },
  "imageUrl": "https://example.com/badge.png",
  "badgeColor": "#FFD700",
  "nftMetadata": {
    "attributes": [
      { "trait_type": "Type", "value": "Achievement" },
      { "trait_type": "Difficulty", "value": "Hard" }
    ],
    "rarity": "epic"
  },
  "collectionId": "col_platform_badges"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "badge": {
    "id": "badge_001",
    "name": "Task Master Badge",
    "category": "achievement",
    "requirementType": "task_completion",
    "totalIssued": 0,
    "isActive": true
  }
}
```

**Requirement Types:**
- `task_completion` - Complete X tasks
- `points_threshold` - Reach X points
- `referrals` - Refer X users
- `streak` - X day streak
- `manual` - Admin issued

---

### Get Badge Templates

Fetch all badge templates (admin only).

```
GET /api/admin/badges/templates
```

**Response:** `200 OK`
```json
{
  "badges": [
    {
      "id": "badge_001",
      "name": "Task Master Badge",
      "category": "achievement",
      "totalIssued": 42,
      "isActive": true
    }
  ]
}
```

---

### Get User's Badges

Fetch badges earned by a user.

```
GET /api/users/:userId/badges
```

**Response:** `200 OK`
```json
{
  "badges": [
    {
      "mint": {
        "id": "mint_badge_001",
        "status": "success",
        "tokenId": "15",
        "completedAt": "2025-10-26T10:30:00Z"
      },
      "badge": {
        "id": "badge_001",
        "name": "Task Master Badge",
        "imageUrl": "https://example.com/badge.png"
      },
      "delivery": {
        "txHash": "0xAbc...123",
        "deliveredAt": "2025-10-26T10:30:00Z"
      }
    }
  ]
}
```

---

## Rate Limits

- **Standard endpoints**: 100 requests/minute
- **Mint endpoints**: 10 requests/second
- **Batch mint**: 5 requests/minute (1000 recipients max per batch)
- **Webhooks**: No limit

---

## Error Codes

| Code | Description |
|------|-------------|
| `400` | Bad Request - Invalid parameters |
| `401` | Unauthorized - Not authenticated |
| `403` | Forbidden - Insufficient permissions |
| `404` | Not Found - Resource doesn't exist |
| `429` | Too Many Requests - Rate limit exceeded |
| `500` | Internal Server Error |
| `503` | Service Unavailable - Crossmint down |

**Error Response Format:**
```json
{
  "error": "Error title",
  "message": "Detailed error message"
}
```

---

## Testing

### Postman Collection

Import the Postman collection for testing:

```bash
# TODO: Export Postman collection
```

### cURL Examples

**Create Collection:**
```bash
curl -X POST http://localhost:5000/api/nft/collections \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d '{
    "name": "Test Collection",
    "chain": "polygon-amoy",
    "tokenType": "ERC721"
  }'
```

**Mint NFT:**
```bash
curl -X POST http://localhost:5000/api/nft/mint \
  -H "Content-Type: application/json" \
  -H "Cookie: connect.sid=YOUR_SESSION" \
  -d '{
    "templateId": "tpl_001",
    "recipientUserId": "user_123",
    "recipientWalletAddress": "0xAbCd...1234",
    "mintReason": "test_mint"
  }'
```

---

Last Updated: October 26, 2025

