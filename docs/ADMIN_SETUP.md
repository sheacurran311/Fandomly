# 🔐 Fandomly Admin Account Setup

This guide explains how to create and manage Fandomly admin accounts.

## Quick Start

### Option 1: Promote Existing User by Dynamic ID (Easiest)

If you've already registered with Dynamic wallet:

```bash
npm run promote-admin <your-dynamic-user-id>
```

Example:
```bash
npm run promote-admin 8346873d-a9da-4ac7-9546-c352aa4dee92
```

### Option 2: Create Admin by Email

```bash
npm run create-admin
```

Follow the interactive prompts to:
1. Enter the email address
2. Promote an existing user OR create a new admin account
3. Confirm the changes

### List All Admins

```bash
npm run list-admins
```

This displays all users with the `fandomly_admin` role.

---

## Methods to Create Admin Accounts

### Method 1: Promote by Dynamic ID (Fastest)

**Best for**: Users who've already connected with Dynamic wallet

```bash
npm run promote-admin <dynamic-user-id>
```

**Features**:
- Instant promotion
- No email required
- Works with any connected wallet user
- Perfect for post-onboarding promotion

**Example**:
```
🔑 Promoting User to Fandomly Admin

Dynamic User ID: 8346873d-a9da-4ac7-9546-c352aa4dee92

✓ Found user: sheacurran
  Current role: customer_admin
  Current user type: creator
  User ID: a4bcfc74-5833-42a9-b2ce-f979f233239c

✅ Successfully promoted user to Fandomly Admin!

You can now access the admin dashboard at /admin-dashboard
```

**How to find your Dynamic User ID**:
1. Open browser console (F12)
2. Look for logs like: `[Auth] Set Dynamic user ID: <your-id>`
3. Or check the auth router logs

---

### Method 2: Interactive Email Script

**Best for**: Creating new admin accounts or promoting by email

```bash
npm run create-admin
```

**Features**:
- Interactive prompts
- Promotes existing users or creates new ones
- Prevents accidental overwrites
- Auto-verifies email for admin accounts

**Example**:
```
🔐 Fandomly Admin Account Setup

Enter email address: admin@fandomly.com
✓ Found existing user: admin_user

User promoted to Fandomly Admin!
   Email: admin@fandomly.com
   User ID: cm4xyz123
   Role: fandomly_admin
```

---

### Method 3: Direct Database Update

For advanced users with database access:

```sql
UPDATE users 
SET role = 'fandomly_admin', 
    updated_at = NOW()
WHERE email = 'admin@fandomly.com';
```

⚠️ **Warning**: Only use this if you understand database operations.

---

### Method 4: Seed Script (Development)

Add to your database seed file:

```typescript
await db.insert(users).values({
  email: 'admin@fandomly.com',
  username: 'fandomly_admin',
  userType: 'creator',
  role: 'fandomly_admin',
  emailVerified: true,
});
```

---

## Admin Role Hierarchy

Fandomly uses a three-tier role system:

| Role | Access Level | Capabilities |
|------|--------------|--------------|
| `fandomly_admin` | **Platform-wide** | Full control, admin dashboard, platform tasks |
| `customer_admin` | Creator/Tenant | Manage their creator account and tenant |
| `customer_end_user` | Basic | Fan or regular creator account |

---

## Admin Dashboard Access

Once an admin account is created, the user can access:

**URL**: `/admin-dashboard`

**Features**:
- Platform overview and KPIs
- User management (fans, creators, admins)
- Creator and tenant monitoring
- Platform tasks management
- Referral tracking
- Revenue analytics
- System settings

---

## Security Best Practices

### 1. **Limit Admin Accounts**
- Only create admin accounts for trusted team members
- Use separate accounts for different team members
- Never share admin credentials

### 2. **Monitor Admin Activity**
```bash
# Check all admin accounts
npm run list-admins
```

### 3. **Regular Audits**
- Review admin accounts quarterly
- Remove inactive admin accounts
- Check admin access logs

### 4. **Email Verification**
- Admin emails are auto-verified by the script
- Use company email addresses (e.g., @fandomly.com)
- Enable 2FA when available

---

## Troubleshooting

### "No user found with email"

**Solution**: The script will offer to create a new admin account. Choose `yes` and provide a username.

### "User is already a Fandomly Admin"

**Info**: The user already has admin access. You can continue to re-apply the role if needed.

### "Authentication required" when accessing admin dashboard

**Solutions**:
1. Ensure you're logged in with the admin account
2. Check that `role` is set to `fandomly_admin` in the database
3. Clear browser cookies and log in again

### Script fails with database error

**Solutions**:
1. Check database connection in `.env`
2. Ensure database is running
3. Run `npm run db:push` to sync schema

---

## Removing Admin Access

To revoke admin access from a user:

```bash
# Option 1: Use the script (future feature)
npm run remove-admin

# Option 2: Manual database update
# UPDATE users SET role = 'customer_admin' WHERE email = 'user@example.com';
```

---

## Environment-Specific Admins

### Development
```bash
npm run create-admin
# Use test emails like: admin@test.com
```

### Staging
```bash
NODE_ENV=staging npm run create-admin
# Use staging emails like: admin@staging.fandomly.com
```

### Production
```bash
NODE_ENV=production npm run create-admin
# Use verified company emails only
```

---

## FAQs

**Q: Can a fan account be promoted to admin?**  
A: Yes, but they'll also need creator capabilities. The script handles this automatically.

**Q: How many admin accounts should we have?**  
A: Start with 1-2 for founders, then add as needed (typically 3-5 for a small team).

**Q: Can admins still use creator features?**  
A: Yes! Admins have all permissions, including creator capabilities.

**Q: Do admins need a tenant?**  
A: Not required for admin dashboard access, but needed for creator-specific features.

---

## Support

If you encounter issues:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review database logs
3. Verify your `.env` configuration
4. Contact the development team

---

## Changelog

- **v1.0** - Initial admin creation scripts
  - Interactive `create-admin` script
  - `list-admins` utility
  - Role-based access control

