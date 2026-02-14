/**
 * Migration Script: Profile Data → Program (Single Source of Truth)
 * 
 * This script migrates existing creator profile data into their loyalty program's
 * pageConfig, making the program the single source of truth for all fan-facing data.
 * 
 * What it migrates:
 * - creators.displayName → program.name (if program name is generic/empty)
 * - creators.bio → program.description (if empty)
 * - creators.imageUrl → program.pageConfig.logo (if empty)
 * - creators.brandColors → program.pageConfig.brandColors (if empty)
 * - creators.socialLinks → program.pageConfig.socialLinks (if empty)
 * - creators.typeSpecificData → program.pageConfig.creatorDetails (if empty)
 * - users.profileData.bannerImage → program.pageConfig.headerImage (if empty)
 * - users.profileData.location → program.pageConfig.location (if empty)
 * 
 * Run with: npx tsx scripts/migrate-profile-to-program.ts
 */

import { db } from '../server/db';
import { users, creators, loyaltyPrograms } from '../shared/schema';
import { eq, desc } from 'drizzle-orm';

interface MigrationStats {
  totalCreators: number;
  creatorsWithPrograms: number;
  creatorsWithoutPrograms: number;
  programsUpdated: number;
  programsCreated: number;
  errors: string[];
}

async function migrateProfileToProgram(): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalCreators: 0,
    creatorsWithPrograms: 0,
    creatorsWithoutPrograms: 0,
    programsUpdated: 0,
    programsCreated: 0,
    errors: [],
  };

  console.log('Starting Profile → Program migration...\n');

  // Get all creators with their user data
  const allCreators = await db.select({
    creator: creators,
    user: users,
  })
    .from(creators)
    .leftJoin(users, eq(creators.userId, users.id));

  stats.totalCreators = allCreators.length;
  console.log(`Found ${allCreators.length} creators to process.\n`);

  for (const { creator, user } of allCreators) {
    try {
      // Get the creator's most recent program
      const [existingProgram] = await db.select()
        .from(loyaltyPrograms)
        .where(eq(loyaltyPrograms.creatorId, creator.id))
        .orderBy(desc(loyaltyPrograms.createdAt))
        .limit(1);

      if (!existingProgram) {
        stats.creatorsWithoutPrograms++;
        console.log(`  ⏭️  Creator ${creator.displayName} (${creator.id}) has no program - skipping`);
        continue;
      }

      stats.creatorsWithPrograms++;
      const pageConfig = (existingProgram.pageConfig as any) || {};
      const profileData = (user?.profileData as any) || {};
      let needsUpdate = false;
      const updates: any = { ...pageConfig };

      // Migrate display name to program name (if program name is generic)
      const isGenericName = !existingProgram.name || 
        existingProgram.name.endsWith("'s Program") || 
        existingProgram.name === 'My Program';
      if (isGenericName && creator.displayName) {
        // Don't override the program name, but note it
        console.log(`  📝 Program "${existingProgram.name}" could use creator name "${creator.displayName}"`);
      }

      // Migrate bio to description
      if (!existingProgram.description && creator.bio) {
        needsUpdate = true;
        console.log(`  📝 Migrating bio for ${creator.displayName}`);
      }

      // Migrate creator image to pageConfig.logo
      if (!pageConfig.logo && creator.imageUrl) {
        updates.logo = creator.imageUrl;
        needsUpdate = true;
        console.log(`  🖼️  Migrating imageUrl to logo for ${creator.displayName}`);
      }

      // Migrate banner image from user profile to pageConfig.headerImage
      if (!pageConfig.headerImage && profileData.bannerImage) {
        updates.headerImage = profileData.bannerImage;
        needsUpdate = true;
        console.log(`  🖼️  Migrating bannerImage to headerImage for ${creator.displayName}`);
      }

      // Migrate brand colors
      if (!pageConfig.brandColors && creator.brandColors) {
        const bc = creator.brandColors as any;
        if (bc.primary || bc.secondary || bc.accent) {
          updates.brandColors = {
            primary: bc.primary || '#8B5CF6',
            secondary: bc.secondary || '#06B6D4',
            accent: bc.accent || '#10B981',
          };
          needsUpdate = true;
          console.log(`  🎨 Migrating brandColors for ${creator.displayName}`);
        }
      }

      // Migrate social links
      if (!pageConfig.socialLinks && creator.socialLinks) {
        const sl = creator.socialLinks as any;
        if (sl && Object.keys(sl).length > 0) {
          updates.socialLinks = sl;
          needsUpdate = true;
          console.log(`  🔗 Migrating socialLinks for ${creator.displayName}`);
        }
      }

      // Migrate type-specific data to creatorDetails
      if (!pageConfig.creatorDetails && creator.typeSpecificData) {
        const tsd = creator.typeSpecificData as any;
        if (tsd && Object.keys(tsd).length > 0) {
          updates.creatorDetails = tsd;
          needsUpdate = true;
          console.log(`  📋 Migrating typeSpecificData to creatorDetails for ${creator.displayName}`);
        }
      }

      // Migrate location
      if (!pageConfig.location && profileData.location) {
        updates.location = profileData.location;
        needsUpdate = true;
        console.log(`  📍 Migrating location for ${creator.displayName}`);
      }

      if (needsUpdate) {
        await db.update(loyaltyPrograms)
          .set({
            pageConfig: updates,
            // Also migrate bio to description if empty
            ...(!existingProgram.description && creator.bio ? { description: creator.bio } : {}),
            updatedAt: new Date(),
          })
          .where(eq(loyaltyPrograms.id, existingProgram.id));

        stats.programsUpdated++;
        console.log(`  ✅ Updated program for ${creator.displayName}`);
      } else {
        console.log(`  ✅ No migration needed for ${creator.displayName}`);
      }
    } catch (error) {
      const errorMsg = `Failed to migrate creator ${creator.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      stats.errors.push(errorMsg);
      console.error(`  ❌ ${errorMsg}`);
    }
  }

  return stats;
}

// Run migration
migrateProfileToProgram()
  .then((stats) => {
    console.log('\n========================================');
    console.log('Migration Complete!');
    console.log('========================================');
    console.log(`Total creators:          ${stats.totalCreators}`);
    console.log(`With programs:           ${stats.creatorsWithPrograms}`);
    console.log(`Without programs:        ${stats.creatorsWithoutPrograms}`);
    console.log(`Programs updated:        ${stats.programsUpdated}`);
    console.log(`Errors:                  ${stats.errors.length}`);
    if (stats.errors.length > 0) {
      console.log('\nErrors:');
      stats.errors.forEach(e => console.log(`  - ${e}`));
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
