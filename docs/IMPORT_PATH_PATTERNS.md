# Import Path Patterns - Server Directory Structure

## Overview
After the server reorganization, all files are organized into subdirectories. This document defines the correct import patterns to prevent future import path issues.

## Directory Structure
```
server/
├── core/           # Core functionality (storage, db access)
├── routes/         # API route handlers (organized by feature)
│   ├── admin/
│   ├── media/
│   ├── nft/
│   ├── points/
│   ├── programs/
│   ├── social/
│   ├── tasks/
│   └── user/
├── services/       # Business logic services (organized by domain)
│   ├── nft/
│   ├── points/
│   ├── rewards/
│   ├── social/
│   └── verification/
├── middleware/     # Express middleware
├── webhooks/       # Webhook handlers
├── config/         # Configuration files
├── lib/            # Third-party integrations
├── utils/          # Utility functions
├── db.ts           # Database connection
└── index.ts        # Server entry point
```

## Import Path Rules

### From `routes/**/`  (depth 2)
Files in `routes/admin/`, `routes/tasks/`, etc.

| Import Type | Correct Path | Example |
|-------------|--------------|---------|
| Database | `../../db` | `import { db } from '../../db';` |
| Core (storage, etc.) | `../../core/*` | `import { storage } from '../../core/storage';` |
| Middleware | `../../middleware/*` | `import { authenticateUser } from '../../middleware/rbac';` |
| Services | `../../services/*` | `import { pointsService } from '../../services/points/points-service';` |
| Shared schema | `@shared/schema` | `import { users } from '@shared/schema';` |

### From `services/*/` (depth 2)
Files in `services/points/`, `services/rewards/`, etc.

| Import Type | Correct Path | Example |
|-------------|--------------|---------|
| Database | `../../db` | `import { db } from '../../db';` |
| Core | `../../core/*` | `import { storage } from '../../core/storage';` |
| Other services | `../*/` or `../../services/*/` | `import { pointsService } from '../points/points-service';` |
| Shared schema | `@shared/schema` | `import { tasks } from '@shared/schema';` |

### From `services/` (depth 1)
Files directly in `services/`

| Import Type | Correct Path | Example |
|-------------|--------------|---------|
| Database | `../db` | `import { db } from '../db';` |
| Core | `../core/*` | `import { storage } from '../core/storage';` |
| Subdirectory services | `./*/` | `import { badgeService } from './rewards/badge-rewards-service';` |

### From `middleware/`, `webhooks/`, `utils/` (depth 1)

| Import Type | Correct Path | Example |
|-------------|--------------|---------|
| Database | `../db` | `import { db } from '../db';` |
| Core | `../core/*` | `import { storage } from '../core/storage';` |
| Services | `../services/*` | `import { pointsService } from '../services/points/points-service';` |

### From `core/` (depth 1)

| Import Type | Correct Path | Example |
|-------------|--------------|---------|
| Database | `../db` | `import { db } from '../db';` |
| Other core files | `./*` | `import { storageClient } from './storage-client';` |
| Shared schema | `@shared/schema` | `import { users } from '@shared/schema';` |

### From `server/` (root level)

| Import Type | Correct Path | Example |
|-------------|--------------|---------|
| Database | `./db` | `import { db } from './db';` |
| Core | `./core/*` | `import { storage } from './core/storage';` |
| Routes | `./routes/*` | `import { registerRoutes } from './routes/main';` |

## Dynamic Imports

### Before Reorganization (INCORRECT)
```typescript
const { db } = await import('./db');
const { storage } = await import('./storage');
```

### After Reorganization (CORRECT)
From `routes/**`:
```typescript
const { db } = await import('../../db');
const { storage } = await import('../../core/storage');
```

From `services/**`:
```typescript
const { db } = await import('../../db');
const { storage } = await import('../../core/storage');
```

## Common Mistakes

### ❌ Wrong: Too few `../`
```typescript
// From routes/tasks/task-routes.ts
import { storage } from '../core/storage'; // WRONG - only goes up 1 level
```

### ✅ Correct
```typescript
// From routes/tasks/task-routes.ts
import { storage } from '../../core/storage'; // CORRECT - goes up 2 levels
```

### ❌ Wrong: Too many `../`
```typescript
// From services/points/points-service.ts
import { db } from '../../../db'; // WRONG - goes up 3 levels
```

### ✅ Correct
```typescript
// From services/points/points-service.ts
import { db } from '../../db'; // CORRECT - goes up 2 levels
```

### ❌ Wrong: Dynamic imports with old paths
```typescript
// From routes/main.ts
const { db } = await import('./db'); // WRONG - db is not in routes/
```

### ✅ Correct
```typescript
// From routes/main.ts
const { db } = await import('../db'); // CORRECT
// OR import at top:
import { db } from '../db';
```

## Validation

### Automated Import Validation
Run this script to validate all import paths:
```bash
npm run validate-imports
```

This will:
- Scan all `.ts` files in `server/`
- Check if all relative imports can be resolved
- Report broken imports with suggested fixes
- Exit with code 1 if any issues found

### Manual Check
To manually verify an import path is correct:
1. Count the depth of your file: `routes/tasks/` = 2 levels deep
2. Count up to `server/`: 2 levels = `../../`
3. Add the target path: `../../db` or `../../core/storage`

## Prevention

### Pre-commit Hook
Add to `.husky/pre-commit` or similar:
```bash
npm run validate-imports
```

### CI/CD
Add to GitHub Actions or similar:
```yaml
- name: Validate imports
  run: npm run validate-imports
```

### IDE Configuration
Configure your IDE to use absolute imports for `@shared/*`:
```json
{
  "compilerOptions": {
    "paths": {
      "@shared/*": ["./shared/*"]
    }
  }
}
```

## Quick Reference Chart

| Your file location | To import `db` | To import `storage` | To import middleware |
|-------------------|----------------|---------------------|----------------------|
| `routes/tasks/` | `../../db` | `../../core/storage` | `../../middleware/rbac` |
| `routes/admin/` | `../../db` | `../../core/storage` | `../../middleware/rbac` |
| `services/points/` | `../../db` | `../../core/storage` | N/A (services don't use middleware) |
| `services/` | `../db` | `../core/storage` | N/A |
| `middleware/` | `../db` | `../core/storage` | `./*` (same dir) |
| `core/` | `../db` | `./*` (same dir) | N/A |
| `server/index.ts` | `./db` | `./core/storage` | `./middleware/rbac` |

## Troubleshooting

### Error: "Cannot find module"
1. Run `npm run validate-imports` to identify all broken imports
2. Check the depth of your file vs. the target file
3. Use the Quick Reference Chart above
4. Test with `npm run check` (TypeScript compilation)

### Error: "Module not found" at runtime
- This usually means a dynamic import has the wrong path
- Search for `await import(` in your file
- Update to use the correct relative path based on file depth

## Files Fixed During Reorganization

The following files had their imports corrected:
- `server/routes/main.ts` - storage-client imports (lines 102, 145)
- `server/routes/admin/admin-routes.ts` - storage import
- `server/routes/admin/audit-routes.ts` - storage import
- `server/routes/tasks/task-completion-routes.ts` - storage import
- `server/services/check-in-service.ts` - db import
- `server/services/rewards/rewards-service.ts` - storage import
- `server/routes/social/social-connection-routes.ts` - storage dynamic imports
- `server/utils/validation-helpers.ts` - jsonbSchemas import
- `server/routes/main.ts` - 12 dynamic db imports

## Summary

**Golden Rule:** Count the directory levels from your file to `server/`, then use that many `../` to go up, then add the path down to your target.

Example:
- Your file: `server/routes/tasks/task-routes.ts` (2 levels deep)
- Target: `server/db.ts`
- Path: `../../db` (2 levels up)

Use `npm run validate-imports` frequently to catch issues early!

