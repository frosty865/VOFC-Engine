#!/usr/bin/env node

/**
 * Reset Test User Passwords
 * This script resets the passwords for all test users in Supabase Auth
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function resetTestPasswords() {
  console.log('🔐 Resetting Test User Passwords...\n');
  
  const testUsers = [
    { email: 'admin@vofc.gov', password: 'Admin123!', role: 'admin', name: 'Administrator' },
    { email: 'spsa@vofc.gov', password: 'Admin123!', role: 'spsa', name: 'Senior PSA' },
    { email: 'psa@vofc.gov', password: 'Admin123!', role: 'psa', name: 'PSA' },
    { email: 'analyst@vofc.gov', password: 'Admin123!', role: 'analyst', name: 'Analyst' }
  ];
  
  try {
    // First, get all existing users
    const { data: users, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error('❌ Error listing users:', listError.message);
      return;
    }
    
    console.log(`📊 Found ${users.users.length} existing users\n`);
    
    // Reset passwords for each test user
    for (const testUser of testUsers) {
      console.log(`🔄 Resetting password for ${testUser.email}...`);
      
      // Find the user ID
      const existingUser = users.users.find(u => u.email === testUser.email);
      
      if (!existingUser) {
        console.log(`❌ User ${testUser.email} not found, creating new user...`);
        
        try {
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: testUser.email,
            password: testUser.password,
            email_confirm: true,
            user_metadata: {
              role: testUser.role,
              name: testUser.name
            }
          });
          
          if (createError) {
            console.log(`❌ Failed to create ${testUser.email}: ${createError.message}`);
          } else {
            console.log(`✅ Created ${testUser.email} with password: ${testUser.password}`);
          }
        } catch (createErr) {
          console.log(`❌ Error creating ${testUser.email}: ${createErr.message}`);
        }
      } else {
        console.log(`📝 Updating password for existing user ${testUser.email}...`);
        
        try {
          const { data: updatedUser, error: updateError } = await supabase.auth.admin.updateUserById(
            existingUser.id,
            {
              password: testUser.password,
              email_confirm: true,
              user_metadata: {
                role: testUser.role,
                name: testUser.name
              }
            }
          );
          
          if (updateError) {
            console.log(`❌ Failed to update ${testUser.email}: ${updateError.message}`);
          } else {
            console.log(`✅ Updated ${testUser.email} with password: ${testUser.password}`);
          }
        } catch (updateErr) {
          console.log(`❌ Error updating ${testUser.email}: ${updateErr.message}`);
        }
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🎉 Password reset complete!');
    console.log('\n📋 Test User Credentials:');
    testUsers.forEach(user => {
      console.log(`   ${user.email} / ${user.password} (${user.role})`);
    });
    
    console.log('\n🧪 You can now test login with any of these credentials.');
    
  } catch (error) {
    console.error('❌ Error resetting passwords:', error.message);
  }
}

// Run the password reset
resetTestPasswords();
