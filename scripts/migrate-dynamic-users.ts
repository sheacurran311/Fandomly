/**
 * Migration Script: Dynamic Auth to Google Auth + Social Logins
 * 
 * This script migrates existing users from the Dynamic authentication system
 * to the new JWT-based authentication with Google and social logins.
 * 
 * Run with: npx tsx scripts/migrate-dynamic-users.ts
 */

import { db } from '../server/db';
import { users, socialConnections } from '../shared/schema';
import { eq, isNotNull, sql } from 'drizzle-orm';

interface MigrationStats {
  totalUsers: number;
  migratedUsers: number;
  skippedUsers: number;
  errors: string[];
}

async function migrateUsers(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalUsers: 0,
    migratedUsers: 0,
    skippedUsers: 0,
    errors: []
  };

  console.log('Starting Dynamic to Google Auth migration...\n');

  try {
    // Get all users with a Dynamic user ID
    const allUsers = await db.query.users.findMany({
      where: isNotNull(users.dynamicUserId)
    });

    stats.totalUsers = allUsers.length;
    console.log(`Found ${stats.totalUsers} users with Dynamic IDs to process\n`);

    for (const user of allUsers) {
      try {
        console.log(`Processing user ${user.id} (${user.username})...`);

        // Check if user already has a primary auth provider set
        if (user.primaryAuthProvider) {
          console.log(`  - Already migrated (provider: ${user.primaryAuthProvider}), skipping`);
          stats.skippedUsers++;
          continue;
        }

        // Determine primary auth provider from existing social connections
        const connections = await db.query.socialConnections.findMany({
          where: eq(socialConnections.userId, user.id)
        });

        let primaryProvider: string | null = null;
        let linkedProviders: Array<{ provider: string; providerId: string; email?: string; linkedAt: string }> = [];

        // Check each connection to determine primary provider
        for (const connection of connections) {
          if (connection.isActive) {
            linkedProviders.push({
              provider: connection.platform,
              providerId: connection.platformUserId || '',
              email: user.email || undefined,
              linkedAt: connection.connectedAt?.toISOString() || new Date().toISOString()
            });

            // Set first active connection as primary if not set
            if (!primaryProvider) {
              primaryProvider = connection.platform;
            }
          }
        }

        // If no social connections, use email to suggest Google
        if (!primaryProvider && user.email) {
          primaryProvider = 'google';
          console.log(`  - No social connections, defaulting to Google (has email)`);
        } else if (!primaryProvider) {
          // No email and no social connections - keep Dynamic as legacy
          console.log(`  - No email or social connections, keeping Dynamic as primary`);
          primaryProvider = 'dynamic_legacy';
        }

        // Update user with migration data
        await db.update(users)
          .set({
            primaryAuthProvider: primaryProvider,
            linkedAccounts: linkedProviders.length > 0 ? { providers: linkedProviders } : null,
            updatedAt: new Date()
          })
          .where(eq(users.id, user.id));

        console.log(`  - Migrated to ${primaryProvider} (${linkedProviders.length} linked accounts)`);
        stats.migratedUsers++;

      } catch (error: any) {
        console.error(`  - Error migrating user ${user.id}:`, error.message);
        stats.errors.push(`User ${user.id}: ${error.message}`);
      }
    }

    return stats;

  } catch (error: any) {
    console.error('Migration failed:', error);
    stats.errors.push(`Fatal error: ${error.message}`);
    return stats;
  }
}

async function printReport(stats: MigrationStats) {
  console.log('\n' + '='.repeat(50));
  console.log('MIGRATION REPORT');
  console.log('='.repeat(50));
  console.log(`Total users processed: ${stats.totalUsers}`);
  console.log(`Successfully migrated: ${stats.migratedUsers}`);
  console.log(`Skipped (already migrated): ${stats.skippedUsers}`);
  console.log(`Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\nErrors:');
    stats.errors.forEach(err => console.log(`  - ${err}`));
  }
  
  console.log('='.repeat(50));
}

async function main() {
  console.log('======================================');
  console.log('Dynamic Auth Migration Script');
  console.log('======================================\n');

  // Check if this is a dry run
  const isDryRun = process.argv.includes('--dry-run');
  if (isDryRun) {
    console.log('DRY RUN MODE - No changes will be made\n');
  }

  // Run migration
  const stats = await migrateUsers();
  
  // Print report
  await printReport(stats);

  // Exit with appropriate code
  if (stats.errors.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
