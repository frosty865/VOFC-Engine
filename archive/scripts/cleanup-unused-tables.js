#!/usr/bin/env node

/**
 * Cleanup script to remove unused user tables
 * This script removes old user tables that are no longer needed
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

async function cleanupUnusedTables() {
  console.log('🧹 Cleaning up unused user tables...\n');

  try {
    // 1. Check what tables exist
    console.log('📋 Checking existing tables...');
    
    const tablesToCheck = [
      'user_profiles',
      'user_sessions_old',
      'auth_users',
      'profiles'
    ];

    const existingTables = [];
    
    for (const tableName of tablesToCheck) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (!error) {
          existingTables.push(tableName);
          console.log(`✅ Found table: ${tableName}`);
        }
      } catch (err) {
        console.log(`❌ Table ${tableName} not found or inaccessible`);
      }
    }

    if (existingTables.length === 0) {
      console.log('✅ No unused tables found to clean up');
      return;
    }

    console.log(`\n📊 Found ${existingTables.length} tables to potentially clean up:`);
    existingTables.forEach(table => console.log(`   - ${table}`));

    // 2. Drop unused tables
    console.log('\n🗑️  Dropping unused tables...');
    
    for (const tableName of existingTables) {
      try {
        // Drop the table using SQL
        const { error } = await supabase.rpc('exec', {
          sql: `DROP TABLE IF EXISTS ${tableName} CASCADE;`
        });

        if (error) {
          console.log(`⚠️  Could not drop ${tableName}: ${error.message}`);
        } else {
          console.log(`✅ Dropped table: ${tableName}`);
        }
      } catch (err) {
        console.log(`❌ Error dropping ${tableName}: ${err.message}`);
      }
    }

    // 3. Verify cleanup
    console.log('\n🔍 Verifying cleanup...');
    
    for (const tableName of existingTables) {
      try {
        const { error } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);
        
        if (error) {
          console.log(`✅ Table ${tableName} successfully removed`);
        } else {
          console.log(`⚠️  Table ${tableName} still exists`);
        }
      } catch (err) {
        console.log(`✅ Table ${tableName} successfully removed`);
      }
    }

    console.log('\n🎉 Cleanup completed!');
    console.log('\n📋 Current user tables:');
    console.log('   - vofc_users (active)');
    console.log('   - user_sessions (active)');
    console.log('   - backup_metadata (active)');

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
    process.exit(1);
  }
}

// Run cleanup
if (require.main === module) {
  cleanupUnusedTables()
    .then(() => {
      console.log('\n✅ Cleanup completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Cleanup error:', error);
      process.exit(1);
    });
}

module.exports = { cleanupUnusedTables };
