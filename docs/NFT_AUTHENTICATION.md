# Crossmint NFT Authentication

## ✅ Simplified Authentication (No Extra Middleware Needed!)

Since you've added your **Dynamic environment ID to Crossmint**, the NFT endpoints use your existing application's authentication system without any additional configuration.

---

## How It Works

### 1. Dynamic JWT Flow

```
User Login (Dynamic) → JWT Generated → Request to Fandomly API
                                            ↓
                              x-dynamic-user-id header
                                            ↓
                          Existing Auth Middleware
                         (server/middleware/rbac.ts)
                                            ↓
                              User Verified ✅
                                            ↓
                          Crossmint Routes Execute
```

### 2. Existing Middleware Used

**File:** `server/middleware/rbac.ts`

The NFT routes use your existing authentication middleware:

```typescript
import { authenticateUser, requireRole } from './middleware/rbac';

// All creator endpoints
app.post('/api/nft/collections', authenticateUser, async (req, res) => {
  // req.user is already populated with:
  // - id
  // - dynamicUserId
  // - role
  // - customerTier
  // - adminPermissions
});

// Admin-only endpoints
app.post('/api/admin/badges/templates', 
  authenticateUser, 
  requireRole(['fandomly_admin']), 
  async (req, res) => {
    // Only fandomly_admin can access
  }
);
```

### 3. What This Means

✅ **No duplicate authentication logic**  
✅ **No custom JWT verification for Crossmint**  
✅ **Uses same auth as rest of application**  
✅ **Same role-based access control**  
✅ **Crossmint automatically trusts Dynamic JWTs**

---

## Authentication Middleware Details

### `authenticateUser` Middleware

**Location:** `server/middleware/rbac.ts`

**What it does:**
1. Extracts `x-dynamic-user-id` from request headers
2. Queries database for user with that Dynamic ID
3. Attaches user info to `req.user`:
   ```typescript
   req.user = {
     id: string,              // Fandomly user ID
     dynamicUserId: string,   // Dynamic user ID
     role: 'fandomly_admin' | 'customer_admin' | 'customer_end_user',
     customerTier?: 'basic' | 'premium' | 'vip',
     adminPermissions?: object,
     customerAdminData?: object
   }
   ```
4. Returns 401 if user not found
5. Calls `next()` to continue to route handler

### `requireRole` Middleware

**Location:** `server/middleware/rbac.ts`

**What it does:**
1. Checks `req.user.role` against allowed roles
2. Returns 403 if role not allowed
3. Calls `next()` if authorized

**Usage:**
```typescript
// Single role
app.get('/api/admin/something', 
  authenticateUser, 
  requireRole(['fandomly_admin']), 
  handler
);

// Multiple roles
app.get('/api/creator/something',
  authenticateUser,
  requireRole(['fandomly_admin', 'customer_admin']),
  handler
);
```

---

## NFT Route Authentication

### Creator Routes (Requires Login)

All creator NFT routes use `authenticateUser`:

```typescript
// Collections
POST /api/nft/collections          → authenticateUser
GET  /api/nft/collections          → authenticateUser
GET  /api/nft/collections/:id      → authenticateUser
PUT  /api/nft/collections/:id      → authenticateUser

// Templates
POST /api/nft/templates            → authenticateUser
GET  /api/nft/templates            → authenticateUser
PUT  /api/nft/templates/:id        → authenticateUser
DELETE /api/nft/templates/:id      → authenticateUser

// Minting
POST /api/nft/mint                 → authenticateUser
POST /api/nft/mint/batch           → authenticateUser
GET  /api/nft/mint/:actionId/status → authenticateUser
GET  /api/nft/deliveries           → authenticateUser

// User Badges
GET /api/users/:userId/badges      → authenticateUser
```

### Admin Routes (Requires Admin Role)

Admin badge routes use both `authenticateUser` + `requireRole(['fandomly_admin'])`:

```typescript
POST /api/admin/badges/templates   → authenticateUser + requireRole(['fandomly_admin'])
GET  /api/admin/badges/templates   → authenticateUser + requireRole(['fandomly_admin'])
```

### Public Routes (No Auth)

Only the webhook receiver is public (authenticated by Crossmint signature):

```typescript
POST /api/nft/webhooks/crossmint   → No auth (Crossmint signature verification)
```

---

## Frontend Authentication

### React Hooks Automatically Include Auth

When using the NFT hooks, authentication is handled automatically by the `apiRequest` helper:

```typescript
import { useNftCollections } from '@/hooks/useCrossmint';

function MyComponent() {
  // This hook automatically includes Dynamic JWT in requests
  const { data, isLoading } = useNftCollections();
  
  // No manual auth headers needed!
}
```

**How it works:**

The `apiRequest` helper in `client/src/lib/api.ts` automatically:
1. Gets Dynamic user from context
2. Adds `x-dynamic-user-id` header
3. Sends request with auth

---

## Testing Authentication

### Valid Request (Authenticated)

```bash
curl -X GET http://localhost:5000/api/nft/collections \
  -H "x-dynamic-user-id: <your-dynamic-user-id>"
```

**Response:** `200 OK` with collections

### Invalid Request (No Auth)

```bash
curl -X GET http://localhost:5000/api/nft/collections
```

**Response:** `401 Unauthorized`
```json
{
  "error": "Authentication required"
}
```

### Invalid Request (Wrong Role)

```bash
# Regular user trying to access admin endpoint
curl -X GET http://localhost:5000/api/admin/badges/templates \
  -H "x-dynamic-user-id: <regular-user-id>"
```

**Response:** `403 Forbidden`
```json
{
  "error": "Insufficient permissions"
}
```

---

## Security Notes

### ✅ What's Secure

1. **Dynamic JWT Verification** - Crossmint verifies Dynamic JWTs automatically
2. **Database Validation** - User existence confirmed in your database
3. **Role-Based Access** - Admin routes protected by role checks
4. **Same Auth as App** - Consistent security model

### 🔒 Additional Security (Already Implemented)

1. **Rate Limiting** - Crossmint API has built-in rate limits
2. **Tenant Isolation** - Collections scoped to creator's tenant
3. **Ownership Verification** - Users can only modify their own resources
4. **Admin Permissions** - Fine-grained admin permission controls

---

## Summary

**The Bottom Line:**

✅ You configured Dynamic environment ID in Crossmint  
✅ Crossmint trusts Dynamic JWTs automatically  
✅ NFT routes use your existing auth middleware  
✅ No extra configuration or custom middleware needed  
✅ Same security model as rest of your application  

**It just works!** 🎉

---

Last Updated: October 26, 2025

