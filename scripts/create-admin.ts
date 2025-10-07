/**
 * Create Fandomly Admin Account
 * 
 * Usage:
 *   npm run create-admin <email>
 * 
 * This script promotes an existing user to Fandomly admin role.
 * If the user doesn't exist, it creates a new admin account.
 */

import { db } from "../server/db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createAdmin() {
  try {
    console.log('\n🔐 Fandomly Admin Account Setup\n');
    console.log('This script will create or promote a user to Fandomly Admin.\n');

    // Get email
    const email = await question('Enter email address: ');
    if (!email || !email.includes('@')) {
      console.error('❌ Invalid email address');
      process.exit(1);
    }

    // Check if user exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email)
    });

    if (existingUser) {
      console.log(`\n✓ Found existing user: ${existingUser.username || existingUser.email}`);
      
      if (existingUser.role === 'fandomly_admin') {
        console.log('⚠️  This user is already a Fandomly Admin!');
        const confirm = await question('\nContinue anyway? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
          console.log('Cancelled.');
          process.exit(0);
        }
      }

      // Promote to admin
      await db
        .update(users)
        .set({ 
          role: 'fandomly_admin',
          updatedAt: new Date()
        })
        .where(eq(users.id, existingUser.id));

      console.log('\n✅ User promoted to Fandomly Admin!');
      console.log(`   Email: ${email}`);
      console.log(`   User ID: ${existingUser.id}`);
      console.log(`   Role: fandomly_admin\n`);
      
    } else {
      console.log(`\n⚠️  No user found with email: ${email}`);
      const createNew = await question('Create new admin user? (yes/no): ');
      
      if (createNew.toLowerCase() !== 'yes') {
        console.log('Cancelled.');
        process.exit(0);
      }

      // Get username
      const username = await question('Enter username: ');
      if (!username) {
        console.error('❌ Username is required');
        process.exit(1);
      }

      // Create new admin user
      const [newUser] = await db
        .insert(users)
        .values({
          email,
          username,
          userType: 'creator', // Admins are typically creator accounts
          role: 'fandomly_admin',
          emailVerified: true, // Auto-verify admin emails
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      console.log('\n✅ New Fandomly Admin created!');
      console.log(`   Email: ${email}`);
      console.log(`   Username: ${username}`);
      console.log(`   User ID: ${newUser.id}`);
      console.log(`   Role: fandomly_admin\n`);
      console.log('⚠️  Note: User must complete authentication setup on first login.\n');
    }

    console.log('🎉 Admin setup complete!\n');
    console.log('The user can now access the admin dashboard at:');
    console.log('   /admin-dashboard\n');

  } catch (error) {
    console.error('\n❌ Error creating admin:', error);
    process.exit(1);
  } finally {
    rl.close();
    process.exit(0);
  }
}

createAdmin();

