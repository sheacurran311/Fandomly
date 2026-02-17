/**
 * Promote User to Fandomly Admin by email
 * 
 * Usage:
 *   npm run promote-admin <email>
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
      console.error('\n❌ Usage: npm run promote-admin <email>\n');
      console.error('Example: npm run promote-admin admin@example.com\n');
      process.exit(1);
    }

    const [email] = args;

    console.log('\n🔑 Promoting User to Fandomly Admin\n');
    console.log(`Email: ${email}\n`);

    // Find user by email
    const user = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (!user) {
      console.error(`❌ No user found with email: ${email}`);
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
