/**
 * Reset Database Script
 * 
 * Drops ALL tables, types, and extensions (except plpgsql) from the database,
 * then recreates the schema via drizzle-kit push. This gives a completely
 * fresh database — perfect for development/testing.
 * 
 * Usage:
 *   npx tsx scripts/reset-database.ts --confirm
 * 
 * Safety features:
 *   - Requires --confirm flag to execute
 *   - Only works in development (checks NODE_ENV) unless --force is used
 *   - Shows preview of what will be dropped
 */

import { db, pool } from "../server/db";
import { sql } from "drizzle-orm";
import { execSync } from "child_process";

async function getAllTables(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT tablename FROM pg_tables 
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return (result.rows as any[]).map(r => r.tablename);
}

async function getAllCustomTypes(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT t.typname 
    FROM pg_type t 
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' 
      AND t.typtype = 'e'
    ORDER BY t.typname
  `);
  return (result.rows as any[]).map(r => r.typname);
}

async function getAllViews(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT viewname FROM pg_views 
    WHERE schemaname = 'public'
    ORDER BY viewname
  `);
  return (result.rows as any[]).map(r => r.viewname);
}

async function getAllMaterializedViews(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT matviewname FROM pg_matviews 
    WHERE schemaname = 'public'
    ORDER BY matviewname
  `);
  return (result.rows as any[]).map(r => r.matviewname);
}

async function getAllFunctions(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT p.proname, pg_get_function_identity_arguments(p.oid) as args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
    ORDER BY p.proname
  `);
  return (result.rows as any[]).map(r => `${r.proname}(${r.args})`);
}

async function dropEverything(): Promise<void> {
  // Drop all tables with CASCADE (handles foreign keys, views, etc.)
  const tables = await getAllTables();
  if (tables.length > 0) {
    console.log(`\n🗑️  Dropping ${tables.length} tables...`);
    for (const table of tables) {
      try {
        await db.execute(sql.raw(`DROP TABLE IF EXISTS "${table}" CASCADE`));
        console.log(`  ✓ Dropped table: ${table}`);
      } catch (error: any) {
        console.error(`  ✗ Error dropping ${table}: ${error.message}`);
      }
    }
  } else {
    console.log('\n  No tables found.');
  }

  // Drop materialized views
  const matViews = await getAllMaterializedViews();
  if (matViews.length > 0) {
    console.log(`\n🗑️  Dropping ${matViews.length} materialized views...`);
    for (const view of matViews) {
      try {
        await db.execute(sql.raw(`DROP MATERIALIZED VIEW IF EXISTS "${view}" CASCADE`));
        console.log(`  ✓ Dropped materialized view: ${view}`);
      } catch (error: any) {
        console.error(`  ✗ Error dropping materialized view ${view}: ${error.message}`);
      }
    }
  }

  // Drop views
  const views = await getAllViews();
  if (views.length > 0) {
    console.log(`\n🗑️  Dropping ${views.length} views...`);
    for (const view of views) {
      try {
        await db.execute(sql.raw(`DROP VIEW IF EXISTS "${view}" CASCADE`));
        console.log(`  ✓ Dropped view: ${view}`);
      } catch (error: any) {
        console.error(`  ✗ Error dropping view ${view}: ${error.message}`);
      }
    }
  }

  // Drop custom enum types
  const types = await getAllCustomTypes();
  if (types.length > 0) {
    console.log(`\n🗑️  Dropping ${types.length} custom types...`);
    for (const typeName of types) {
      try {
        await db.execute(sql.raw(`DROP TYPE IF EXISTS "${typeName}" CASCADE`));
        console.log(`  ✓ Dropped type: ${typeName}`);
      } catch (error: any) {
        console.error(`  ✗ Error dropping type ${typeName}: ${error.message}`);
      }
    }
  }

  // Drop custom functions
  const functions = await getAllFunctions();
  if (functions.length > 0) {
    console.log(`\n🗑️  Dropping ${functions.length} functions...`);
    for (const func of functions) {
      try {
        await db.execute(sql.raw(`DROP FUNCTION IF EXISTS ${func} CASCADE`));
        console.log(`  ✓ Dropped function: ${func}`);
      } catch (error: any) {
        console.error(`  ✗ Error dropping function ${func}: ${error.message}`);
      }
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const confirmFlag = args.includes('--confirm');
  const forceFlag = args.includes('--force');
  
  console.log('\n╔══════════════════════════════════════════════════════════════╗');
  console.log('║           DATABASE FULL RESET (DROP + RECREATE)             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝\n');
  
  // Safety check: Only allow in development unless --force is used
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv === 'production' && !forceFlag) {
    console.error('❌ ERROR: Cannot run in production mode without --force flag');
    console.error('   This is a safety measure to prevent accidental data loss.\n');
    process.exit(1);
  }
  
  console.log(`Environment: ${nodeEnv}`);
  console.log(`Confirm flag: ${confirmFlag ? 'YES' : 'NO'}\n`);
  
  // Show what exists
  const tables = await getAllTables();
  const types = await getAllCustomTypes();
  const views = await getAllViews();
  const matViews = await getAllMaterializedViews();
  const functions = await getAllFunctions();
  
  console.log('📊 Current database objects:\n');
  console.log(`  Tables:             ${tables.length}`);
  console.log(`  Custom enum types:  ${types.length}`);
  console.log(`  Views:              ${views.length}`);
  console.log(`  Materialized views: ${matViews.length}`);
  console.log(`  Functions:          ${functions.length}`);
  
  const totalObjects = tables.length + types.length + views.length + matViews.length + functions.length;
  
  if (tables.length > 0) {
    console.log('\n  Tables to drop:');
    for (const t of tables) {
      console.log(`    - ${t}`);
    }
  }
  
  if (totalObjects === 0) {
    console.log('\n✅ Database is already empty. Running db:push to create schema...\n');
    try {
      execSync('npm run db:push', { stdio: 'inherit' });
      console.log('\n✅ Schema created successfully!\n');
    } catch (error) {
      console.error('\n❌ Failed to push schema. Run manually: npm run db:push\n');
    }
    await pool.end();
    process.exit(0);
  }
  
  if (!confirmFlag) {
    console.log('\n⚠️  DRY RUN MODE - Nothing will be changed');
    console.log('   To actually reset, run with --confirm flag:');
    console.log('   npx tsx scripts/reset-database.ts --confirm\n');
    await pool.end();
    process.exit(0);
  }
  
  console.log('\n⚠️  DROPPING everything and recreating schema from scratch...\n');
  
  // Drop everything
  await dropEverything();
  
  // Verify everything is gone
  const remainingTables = await getAllTables();
  const remainingTypes = await getAllCustomTypes();
  
  if (remainingTables.length === 0 && remainingTypes.length === 0) {
    console.log('\n✅ All database objects dropped successfully!');
  } else {
    console.log(`\n⚠️  Some objects remain: ${remainingTables.length} tables, ${remainingTypes.length} types`);
  }
  
  // Recreate schema via drizzle-kit push
  console.log('\n🔄 Recreating schema via drizzle-kit push...\n');
  try {
    execSync('npm run db:push', { stdio: 'inherit' });
    console.log('\n✅ Database fully reset and schema recreated!\n');
    console.log('🔄 You can now restart your application with a fresh database.\n');
  } catch (error) {
    console.error('\n❌ Schema push failed. You may need to run manually: npm run db:push\n');
  }
  
  await pool.end();
  process.exit(0);
}

main().catch(async (error) => {
  console.error('\n❌ Script failed:', error.message);
  await pool.end();
  process.exit(1);
});
