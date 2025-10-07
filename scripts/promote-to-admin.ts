/**
 * Promote User to Fandomly Admin by Dynamic ID
 * 
 * Usage:
 *   npm run promote-admin <dynamic-user-id>
 * 
 * This script promotes an existing user to Fandomly admin role.
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function promoteToAdmin() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('\n❌ Usage: npm run promote-admin <dynamic-user-id>\n');
      console.error('Example: npm run promote-admin 8346873d-a9da-4ac7-9546-c352aa4dee92\n');
      process.exit(1);
    }

    const [dynamicUserId] = args;

    console.log('\n🔑 Promoting User to Fandomly Admin\n');
    console.log(`Dynamic User ID: ${dynamicUserId}\n`);

    // Find user by Dynamic ID
    const user = await db.query.users.findFirst({
      where: eq(users.dynamicUserId, dynamicUserId)
    });

    if (!user) {
      console.error(`❌ No user found with Dynamic ID: ${dynamicUserId}`);
      console.error('\nMake sure the user has completed registration.\n');
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.username || user.email || 'Unknown'}`);
    console.log(`  Current role: ${user.role}`);
    console.log(`  Current user type: ${user.userType}`);
    console.log(`  User ID: ${user.id}\n`);

    if (user.role === 'fandomly_admin') {
      console.log('✅ User is already a Fandomly admin!\n');
      process.exit(0);
    }

    // Promote to admin
    await db
      .update(users)
      .set({ 
        role: 'fandomly_admin',
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    console.log('✅ Successfully promoted user to Fandomly Admin!\n');
    console.log('You can now access the admin dashboard at /admin-dashboard\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

promoteToAdmin();

