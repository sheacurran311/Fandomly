# Production Database Safeguards

## 🎯 Critical Rules for Production

### 1. **NEVER USE `drizzle-kit push` IN PRODUCTION**

**Current (Development):**
```bash
npm run db:push  # ❌ Dangerous - can drop tables!
```

**Production (Use Migrations):**
```bash
# Generate migration files
npx drizzle-kit generate

# Review migration SQL files in ./migrations/
# Then apply them:
npx drizzle-kit migrate
```

**Why?**
- `push` directly alters schema and can DROP columns/tables
- `migrate` uses versioned SQL files you can review and rollback
- Migrations create an audit trail of all schema changes

---

## 🗄️ **Neon Database Protection Features**

Your Neon PostgreSQL database has built-in protection:

### **1. Automatic Backups**
- Neon takes **continuous backups** (every 24 hours on free tier)
- Paid plans: Point-in-time recovery (PITR) to any second in last 7-30 days
- Access via Neon Console: https://console.neon.tech/

### **2. Branch Your Database (Staging)**
```bash
# In Neon Console, create branches:
- main (production) ← protected
- staging ← test deployments here
- development ← your current setup
```

**Benefits:**
- Test schema changes on staging branch first
- Instant copies (no data duplication cost)
- Safe to break staging without affecting production

### **3. Protected Branches**
In Neon Console:
1. Go to your project settings
2. Enable "Protected Branch" on `main`
3. Requires explicit approval for destructive operations
4. Can set IP allowlists (only allow production server IP)

---

## 🔐 **Access Control**

### **Separate Database Credentials**

**File: `.env.production` (Never commit!)**
```bash
# Production - Read/Write with restrictions
DATABASE_URL=postgresql://prod_user:***@prod-host/fandomly_prod

# Staging - Full access for testing
STAGING_DATABASE_URL=postgresql://staging_user:***@staging-host/fandomly_staging

# Development - Local or separate instance
DATABASE_URL=postgresql://dev_user:***@dev-host/fandomly_dev
```

### **Database User Permissions**

Create separate PostgreSQL users with limited permissions:

```sql
-- Production app user (limited permissions)
CREATE USER fandomly_app WITH PASSWORD 'secure_password';
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO fandomly_app;
-- NO DELETE or DROP permissions!

-- Admin user (for migrations only)
CREATE USER fandomly_admin WITH PASSWORD 'admin_password';
GRANT ALL PRIVILEGES ON DATABASE fandomly_prod TO fandomly_admin;
```

**In production, use `fandomly_app` user for runtime, `fandomly_admin` only for deployments.**

---

## 📊 **Monitoring & Alerts**

### **1. Set Up Database Monitoring**

**Tools:**
- Neon Console built-in metrics
- Datadog / New Relic for alerting
- Sentry for error tracking

**Alert on:**
- Large number of DELETE queries
- DROP/TRUNCATE operations
- Connection failures
- Sudden loss of data

### **2. Enable Query Logging**

In Neon settings, enable:
- **Slow query log** - catch performance issues
- **Connection log** - track who connects
- **DDL statement log** - log schema changes

---

## 🔄 **Backup Strategy**

### **Automated Backups**

**Option A: Neon Built-In**
- Automatic daily backups (included)
- Upgrade to Neon Pro for hourly backups

**Option B: pg_dump Automation**

Create a scheduled backup script:

```bash
#!/bin/bash
# File: scripts/backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"
BACKUP_FILE="$BACKUP_DIR/fandomly_backup_$DATE.sql"

# Dump database
pg_dump $DATABASE_URL > $BACKUP_FILE

# Compress
gzip $BACKUP_FILE

# Upload to S3 or cloud storage
aws s3 cp "$BACKUP_FILE.gz" s3://fandomly-backups/

# Keep only last 30 days locally
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE.gz"
```

**Schedule with cron:**
```bash
# Run every 6 hours
0 */6 * * * /app/scripts/backup-database.sh
```

### **Manual Backup Before Deployments**

```bash
# Before any deployment
npm run backup:create

# In package.json:
"scripts": {
  "backup:create": "pg_dump $DATABASE_URL > ./backups/pre-deploy-$(date +%s).sql"
}
```

---

## 🚀 **Deployment Best Practices**

### **Safe Deployment Process**

```bash
# 1. Create backup
npm run backup:create

# 2. Generate migration
npx drizzle-kit generate

# 3. Review migration SQL files
cat migrations/0001_new_migration.sql

# 4. Test on staging first
DATABASE_URL=$STAGING_DATABASE_URL npx drizzle-kit migrate

# 5. Verify staging works
npm run test:integration

# 6. Apply to production (with rollback plan)
DATABASE_URL=$PRODUCTION_DATABASE_URL npx drizzle-kit migrate

# 7. Health check
curl https://api.fandomly.com/health
```

### **Rollback Plan**

Keep migrations reversible:

```sql
-- migrations/0001_add_username.sql
ALTER TABLE users ADD COLUMN username TEXT;

-- migrations/0001_add_username_rollback.sql
ALTER TABLE users DROP COLUMN username;
```

---

## 🏗️ **Environment Separation**

### **Recommended Setup**

```
Production Database (Neon Main Branch)
├── Protected branch enabled
├── Automated backups (hourly)
├── Read replicas for scaling
├── Only production servers can connect
└── Separate admin credentials for migrations

Staging Database (Neon Staging Branch)
├── Mirrors production schema
├── Test data (anonymized production copy)
├── Deploy and test here first
└── Can be reset/rebuilt safely

Development Database (Neon Dev Branch or Local)
├── Your current setup
├── No sensitive data
├── Can be dropped/recreated freely
└── Fast iteration
```

---

## 🔧 **Neon-Specific Configuration**

### **1. Enable Connection Pooling**

In Neon, use **pooled connection** for production:

```bash
# Regular connection (for migrations)
DATABASE_URL=postgresql://user:pass@host/db

# Pooled connection (for app runtime)
DATABASE_POOLED_URL=postgresql://user:pass@host/db?pgbouncer=true
```

Update `server/db.ts`:

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.NODE_ENV === 'production'
  ? process.env.DATABASE_POOLED_URL!  // Use pooled in prod
  : process.env.DATABASE_URL!;

const client = postgres(connectionString, {
  max: process.env.NODE_ENV === 'production' ? 10 : 1,
  idle_timeout: 20,
  connect_timeout: 10,
});

export const db = drizzle(client);
```

### **2. Set Up Read Replicas**

For high-traffic production:
- Enable Neon Read Replicas in console
- Route SELECT queries to replicas
- Write queries go to primary

---

## 📋 **Pre-Production Checklist**

Before going live:

- [ ] Migrate from Neon Free to Neon Pro (production features)
- [ ] Enable Protected Branch on production database
- [ ] Set up separate database branches (dev/staging/prod)
- [ ] Create restricted database user for application runtime
- [ ] Configure automated daily backups
- [ ] Set up monitoring and alerts (Datadog/Sentry)
- [ ] Document rollback procedures
- [ ] Test backup restoration process
- [ ] Enable connection pooling
- [ ] Set up read replicas (if needed)
- [ ] Configure IP allowlist for production database
- [ ] Create disaster recovery runbook
- [ ] Switch from `drizzle-kit push` to `drizzle-kit migrate`
- [ ] Set up staging environment for testing
- [ ] Enable query logging and slow query monitoring

---

## 🆘 **Disaster Recovery**

### **If Data Loss Occurs**

**1. Stop the application immediately**
```bash
# Prevent more writes
heroku maintenance:on  # or equivalent
```

**2. Restore from Neon backup**
```bash
# In Neon Console:
1. Go to Branches
2. Find your production branch
3. Click "Restore" and select point-in-time
4. Choose timestamp before data loss
5. Restore to new branch
6. Update DATABASE_URL to restored branch
```

**3. Manual restore from pg_dump**
```bash
# Restore from backup file
psql $DATABASE_URL < backups/latest-backup.sql

# Or from S3
aws s3 cp s3://fandomly-backups/latest.sql.gz - | gunzip | psql $DATABASE_URL
```

**4. Verify data integrity**
```bash
# Check row counts
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM creators;"
```

**5. Resume application**
```bash
heroku maintenance:off
```

---

## 💰 **Neon Pricing for Production**

**Free Tier (Current):**
- ❌ 0.5 GB storage
- ❌ Daily backups only
- ❌ No point-in-time recovery
- ❌ No protected branches

**Pro Tier (Recommended for Production) - $19/month:**
- ✅ 10 GB storage included
- ✅ Hourly backups
- ✅ 7-day point-in-time recovery
- ✅ Protected branches
- ✅ Read replicas
- ✅ Higher connection limits
- ✅ Priority support

**Business Tier - $700/month:**
- ✅ 30-day point-in-time recovery
- ✅ Dedicated compute
- ✅ Custom retention policies
- ✅ SOC 2 compliance

---

## 🎓 **Training Your Team**

**Database Safety Rules:**

1. **NEVER** run these in production:
   - `DROP TABLE`
   - `TRUNCATE`
   - `DELETE FROM table` (without WHERE clause)
   - `drizzle-kit push`

2. **ALWAYS** do this:
   - Test schema changes in staging first
   - Use migrations (not push)
   - Create backup before deployment
   - Have rollback plan ready
   - Get code review for schema changes

3. **Access Control:**
   - Limit who has production database access
   - Use read-only credentials for analytics/reporting
   - Log all admin actions
   - Rotate credentials regularly

---

## 📚 **Additional Resources**

- [Neon Branching Docs](https://neon.tech/docs/guides/branching)
- [Drizzle Migrations](https://orm.drizzle.team/docs/migrations)
- [PostgreSQL Backup Best Practices](https://www.postgresql.org/docs/current/backup.html)
- [Database Reliability Engineering](https://www.oreilly.com/library/view/database-reliability-engineering/9781491925935/)

---

## ⚡ **Quick Reference**

```bash
# Development: Fast iteration
npm run db:push

# Production: Safe migrations
npx drizzle-kit generate
npx drizzle-kit migrate

# Backup before deploy
npm run backup:create

# Restore from backup
psql $DATABASE_URL < backup.sql

# Check Neon status
curl https://status.neon.tech/
```

