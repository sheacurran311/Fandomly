/**
 * List all Fandomly Admin accounts
 * 
 * Usage:
 *   npm run list-admins
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function listAdmins() {
  try {
    console.log('\n👥 Fandomly Admin Accounts\n');

    const admins = await db.query.users.findMany({
      where: eq(users.role, 'fandomly_admin'),
      orderBy: (users, { desc }) => [desc(users.createdAt)]
    });

    if (admins.length === 0) {
      console.log('⚠️  No admin accounts found.\n');
      console.log('Create one with: npm run create-admin\n');
      process.exit(0);
    }

    console.log(`Found ${admins.length} admin account(s):\n`);

    admins.forEach((admin, index) => {
      console.log(`${index + 1}. ${admin.username || '(no username)'}`);
      console.log(`   Email: ${admin.email}`);
      console.log(`   User ID: ${admin.id}`);
      console.log(`   Created: ${admin.createdAt?.toLocaleDateString()}`);
      console.log(`   Last Login: ${admin.lastLoginAt?.toLocaleDateString() || 'Never'}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error listing admins:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

listAdmins();

