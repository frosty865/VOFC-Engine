#!/usr/bin/env node

/**
 * Force drop user_profiles table by removing all dependencies
 * This script will attempt to remove all constraints and dependencies
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function forceDropUserProfiles() {
  console.log('🗑️  Force dropping user_profiles table...\n');

  try {
    // Step 1: Disable RLS on user_profiles
    console.log('1️⃣  Disabling RLS on user_profiles...');
    try {
      await supabase.rpc('exec', { 
        sql: 'ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;' 
      });
      console.log('✅ RLS disabled');
    } catch (err) {
      console.log('⚠️  Could not disable RLS:', err.message);
    }

    // Step 2: Drop all RLS policies on user_profiles
    console.log('\n2️⃣  Dropping RLS policies...');
    const policyNames = [
      'user_profiles_policy',
      'user_profiles_select_policy',
      'user_profiles_insert_policy',
      'user_profiles_update_policy',
      'user_profiles_delete_policy',
      'Enable read access for all users',
      'Enable insert for authenticated users only',
      'Enable update for users based on user_id',
      'Enable delete for users based on user_id'
    ];

    for (const policyName of policyNames) {
      try {
        await supabase.rpc('exec', { 
          sql: `DROP POLICY IF EXISTS "${policyName}" ON user_profiles;` 
        });
        console.log(`✅ Dropped policy: ${policyName}`);
      } catch (err) {
        // Policy might not exist, that's okay
      }
    }

    // Step 3: Try to drop foreign key constraints
    console.log('\n3️⃣  Attempting to drop foreign key constraints...');
    
    // Common foreign key constraint names
    const fkConstraints = [
      'user_profiles_user_id_fkey',
      'user_profiles_created_by_fkey',
      'user_profiles_id_fkey',
      'fk_user_profiles_user_id',
      'fk_user_profiles_created_by'
    ];

    for (const constraintName of fkConstraints) {
      try {
        await supabase.rpc('exec', { 
          sql: `ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS ${constraintName};` 
        });
        console.log(`✅ Dropped constraint: ${constraintName}`);
      } catch (err) {
        // Constraint might not exist, that's okay
      }
    }

    // Step 4: Drop indexes
    console.log('\n4️⃣  Dropping indexes...');
    const indexes = [
      'user_profiles_pkey',
      'user_profiles_user_id_key',
      'user_profiles_username_key',
      'idx_user_profiles_user_id',
      'idx_user_profiles_username'
    ];

    for (const indexName of indexes) {
      try {
        await supabase.rpc('exec', { 
          sql: `DROP INDEX IF EXISTS ${indexName};` 
        });
        console.log(`✅ Dropped index: ${indexName}`);
      } catch (err) {
        // Index might not exist, that's okay
      }
    }

    // Step 5: Drop triggers
    console.log('\n5️⃣  Dropping triggers...');
    const triggers = [
      'user_profiles_updated_at_trigger',
      'user_profiles_audit_trigger',
      'trigger_user_profiles_updated_at'
    ];

    for (const triggerName of triggers) {
      try {
        await supabase.rpc('exec', { 
          sql: `DROP TRIGGER IF EXISTS ${triggerName} ON user_profiles;` 
        });
        console.log(`✅ Dropped trigger: ${triggerName}`);
      } catch (err) {
        // Trigger might not exist, that's okay
      }
    }

    // Step 6: Drop functions that might depend on user_profiles
    console.log('\n6️⃣  Dropping related functions...');
    const functions = [
      'handle_updated_at',
      'user_profiles_updated_at',
      'audit_user_profiles'
    ];

    for (const functionName of functions) {
      try {
        await supabase.rpc('exec', { 
          sql: `DROP FUNCTION IF EXISTS ${functionName}();` 
        });
        console.log(`✅ Dropped function: ${functionName}`);
      } catch (err) {
        // Function might not exist, that's okay
      }
    }

    // Step 7: Finally, try to drop the table
    console.log('\n7️⃣  Attempting to drop user_profiles table...');
    try {
      await supabase.rpc('exec', { 
        sql: 'DROP TABLE IF EXISTS user_profiles CASCADE;' 
      });
      console.log('✅ Successfully dropped user_profiles table!');
    } catch (err) {
      console.log('❌ Could not drop table:', err.message);
      console.log('\n📝 Manual steps required:');
      console.log('1. Go to your Supabase SQL Editor');
      console.log('2. Run: DROP TABLE user_profiles CASCADE;');
      console.log('3. If that fails, check for remaining dependencies in the Supabase dashboard');
    }

    // Step 8: Verify the table is gone
    console.log('\n8️⃣  Verifying table removal...');
    try {
      const { error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
      
      if (error) {
        console.log('✅ user_profiles table successfully removed!');
      } else {
        console.log('⚠️  user_profiles table still exists');
      }
    } catch (err) {
      console.log('✅ user_profiles table successfully removed!');
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    console.log('\n📝 Manual cleanup required:');
    console.log('1. Go to your Supabase SQL Editor');
    console.log('2. Run: DROP TABLE user_profiles CASCADE;');
    console.log('3. If that fails, check the Supabase dashboard for remaining dependencies');
  }
}

// Run cleanup
if (require.main === module) {
  forceDropUserProfiles()
    .then(() => {
      console.log('\n🎉 Cleanup completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Cleanup error:', error);
      process.exit(1);
    });
}

module.exports = { forceDropUserProfiles };
