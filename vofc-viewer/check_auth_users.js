#!/usr/bin/env node

/**
 * Check Supabase Auth Users
 * This script checks what users exist in your Supabase Auth system
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

async function checkAuthUsers() {
  console.log('🔍 Checking Supabase Auth Users...\n');
  
  try {
    // List all users in Supabase Auth
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error listing users:', error.message);
      return;
    }
    
    console.log(`📊 Found ${users.users.length} user(s) in Supabase Auth:\n`);
    
    if (users.users.length === 0) {
      console.log('⚠️  No users found in Supabase Auth!');
      console.log('\n📝 You need to create users. Here are the options:');
      console.log('\n1. Create users via Supabase Dashboard:');
      console.log('   - Go to your Supabase project dashboard');
      console.log('   - Navigate to Authentication > Users');
      console.log('   - Click "Add user" and create these accounts:');
      console.log('     • Email: admin@vofc.gov, Password: Admin123!');
      console.log('     • Email: spsa@vofc.gov, Password: Admin123!');
      console.log('     • Email: psa@vofc.gov, Password: Admin123!');
      console.log('     • Email: analyst@vofc.gov, Password: Admin123!');
      console.log('\n2. Or run the create users script:');
      console.log('   node scripts/create_supabase_admin.py');
      return;
    }
    
    // Display users
    users.users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Last Sign In: ${user.last_sign_in_at || 'Never'}`);
      console.log(`   Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log('');
    });
    
    // Check for specific test users
    const testEmails = ['admin@vofc.gov', 'spsa@vofc.gov', 'psa@vofc.gov', 'analyst@vofc.gov'];
    const foundTestUsers = users.users.filter(user => testEmails.includes(user.email));
    
    console.log('🧪 Test Users Status:');
    testEmails.forEach(email => {
      const user = users.users.find(u => u.email === email);
      if (user) {
        console.log(`✅ ${email} - EXISTS`);
      } else {
        console.log(`❌ ${email} - MISSING`);
      }
    });
    
    if (foundTestUsers.length === 0) {
      console.log('\n⚠️  No test users found! You need to create them.');
      console.log('\n📝 To create test users, run:');
      console.log('   node scripts/create_supabase_admin.py');
    }
    
  } catch (error) {
    console.error('❌ Error checking auth users:', error.message);
  }
}

// Run the check
checkAuthUsers();
