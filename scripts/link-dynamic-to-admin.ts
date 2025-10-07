/**
 * Link Dynamic User ID to Existing Admin Account
 * 
 * Usage:
 *   npm run link-admin <email> <dynamic-user-id>
 * 
 * This script links a Dynamic user ID to an existing admin account.
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";

async function linkDynamicToAdmin() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.error('\n❌ Usage: npm run link-admin <email> <dynamic-user-id>\n');
      console.error('Example: npm run link-admin admin@fandomly.com 8346873d-a9da-4ac7-9546-c352aa4dee92\n');
      process.exit(1);
    }

    const [email, dynamicUserId] = args;

    console.log('\n🔗 Linking Dynamic ID to Admin Account\n');
    console.log(`Email: ${email}`);
    console.log(`Dynamic User ID: ${dynamicUserId}\n`);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
      process.exit(1);
    }

    console.log(`✓ Found user: ${user.username || user.email}`);
    console.log(`  Current role: ${user.role}`);
    console.log(`  User ID: ${user.id}\n`);

    // Update with Dynamic ID
    await db
      .update(users)
      .set({ 
        dynamicUserId,
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    console.log('✅ Successfully linked Dynamic ID to admin account!\n');
    console.log('You can now log in with your Dynamic wallet.\n');

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

linkDynamicToAdmin();

