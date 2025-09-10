#!/usr/bin/env node
/**
 * Clerk User Management Script
 * 
 * This script helps you manage user roles in Clerk for the Stock Ticker app.
 * Use this to assign admin roles to specific users.
 * 
 * Usage:
 *   node scripts/manage-clerk-users.cjs list
 *   node scripts/manage-clerk-users.cjs set-admin <email-or-user-id>
 *   node scripts/manage-clerk-users.cjs set-role <email-or-user-id> <role>
 *   node scripts/manage-clerk-users.cjs remove-role <email-or-user-id>
 * 
 * Make sure your CLERK_SECRET_KEY is set in .env.local
 */

const { createClerkClient } = require('@clerk/backend');
require('dotenv').config({ path: '.env.local' });

const clerkClient = createClerkClient({ 
  secretKey: process.env.CLERK_SECRET_KEY 
});

if (!process.env.CLERK_SECRET_KEY) {
  console.error('❌ Error: CLERK_SECRET_KEY not found in environment');
  console.error('Make sure you have CLERK_SECRET_KEY set in your .env.local file');
  process.exit(1);
}

async function listUsers() {
  try {
    console.log('📋 Fetching all users...\n');
    const usersResponse = await clerkClient.users.getUserList();
    const users = usersResponse.data || usersResponse;
    
    if (!users || users.length === 0) {
      console.log('No users found.');
      return;
    }

    console.log(`Found ${users.length} user(s):\n`);
    
    users.forEach((user, index) => {
      const role = user.publicMetadata?.role || 'user';
      const email = user.emailAddresses[0]?.emailAddress || 'No email';
      
      console.log(`${index + 1}. ${user.firstName || ''} ${user.lastName || ''}`.trim());
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${email}`);
      console.log(`   Username: ${user.username || 'Not set'}`);
      console.log(`   Role: ${role}`);
      console.log(`   Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error.message);
  }
}

async function findUser(emailOrId) {
  try {
    // Try to find by user ID first
    if (emailOrId.startsWith('user_')) {
      return await clerkClient.users.getUser(emailOrId);
    }
    
    // Otherwise, search by email
    const usersResponse = await clerkClient.users.getUserList();
    const users = usersResponse.data || usersResponse;
    return users.find(user =>
      user.emailAddresses.some(email => 
        email.emailAddress.toLowerCase() === emailOrId.toLowerCase()
      )
    );
  } catch (error) {
    return null;
  }
}

async function setUserRole(emailOrId, role) {
  try {
    const user = await findUser(emailOrId);
    
    if (!user) {
      console.error(`❌ User not found: ${emailOrId}`);
      return;
    }

    console.log(`🔄 Setting role for user: ${user.emailAddresses[0]?.emailAddress || user.id}`);
    console.log(`   Current role: ${user.publicMetadata?.role || 'user'}`);
    console.log(`   New role: ${role}`);

    await clerkClient.users.updateUser(user.id, {
      publicMetadata: {
        ...user.publicMetadata,
        role: role
      }
    });

    console.log(`✅ Successfully set role to '${role}'`);
  } catch (error) {
    console.error('❌ Error setting user role:', error.message);
  }
}

async function removeUserRole(emailOrId) {
  try {
    const user = await findUser(emailOrId);
    
    if (!user) {
      console.error(`❌ User not found: ${emailOrId}`);
      return;
    }

    console.log(`🔄 Removing role for user: ${user.emailAddresses[0]?.emailAddress || user.id}`);
    console.log(`   Current role: ${user.publicMetadata?.role || 'user'}`);

    const newMetadata = { ...user.publicMetadata };
    delete newMetadata.role;

    await clerkClient.users.updateUser(user.id, {
      publicMetadata: newMetadata
    });

    console.log(`✅ Successfully removed role (user will have default 'user' role)`);
  } catch (error) {
    console.error('❌ Error removing user role:', error.message);
  }
}

function showHelp() {
  console.log(`
📖 Clerk User Management for Stock Ticker

Commands:
  list                           - List all users and their roles
  set-admin <email-or-id>        - Set user as admin
  set-role <email-or-id> <role>  - Set custom role for user
  remove-role <email-or-id>      - Remove role from user (defaults to 'user')
  help                           - Show this help message

Examples:
  node scripts/manage-clerk-users.cjs list
  node scripts/manage-clerk-users.cjs set-admin john@example.com
  node scripts/manage-clerk-users.cjs set-role user_abc123 controller
  node scripts/manage-clerk-users.cjs remove-role john@example.com

Available Roles:
  - admin: Full access to all features including delete and restart
  - controller: Can manage stocks and settings but not delete or restart
  - user: Read-only access (default)

Note: Changes may take a few minutes to propagate in your app.
`);
}

// Main execution
async function main() {
  const command = process.argv[2];
  const arg1 = process.argv[3];
  const arg2 = process.argv[4];

  switch (command) {
    case 'list':
      await listUsers();
      break;
      
    case 'set-admin':
      if (!arg1) {
        console.error('❌ Error: Please provide email or user ID');
        console.error('Usage: node scripts/manage-clerk-users.cjs set-admin <email-or-id>');
        process.exit(1);
      }
      await setUserRole(arg1, 'admin');
      break;
      
    case 'set-role':
      if (!arg1 || !arg2) {
        console.error('❌ Error: Please provide email/ID and role');
        console.error('Usage: node scripts/manage-clerk-users.cjs set-role <email-or-id> <role>');
        process.exit(1);
      }
      await setUserRole(arg1, arg2);
      break;
      
    case 'remove-role':
      if (!arg1) {
        console.error('❌ Error: Please provide email or user ID');
        console.error('Usage: node scripts/manage-clerk-users.cjs remove-role <email-or-id>');
        process.exit(1);
      }
      await removeUserRole(arg1);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
      
    default:
      console.error(`❌ Unknown command: ${command || 'none'}`);
      showHelp();
      process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Script error:', error.message);
    process.exit(1);
  });
}

module.exports = {
  listUsers,
  setUserRole,
  removeUserRole,
  findUser
};
