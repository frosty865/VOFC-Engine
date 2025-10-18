const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: './.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔍 Environment check:');
console.log('   URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('   Service Key:', supabaseServiceKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function auditDatabaseSchema() {
  console.log('\n🔍 AUDITING DATABASE SCHEMA...\n');

  try {
    // List of tables to check
    const tablesToCheck = [
      'vofc_users',
      'user_sessions', 
      'user_permissions',
      'vulnerabilities',
      'options_for_consideration',
      'questions',
      'assessment_questions',
      'sources',
      'ofc_sources',
      'vulnerability_ofc_links',
      'sectors',
      'subsectors',
      'submissions',
      'rejected_submissions',
      'staging_vofc_records',
      'source_documents',
      'ingestion_jobs',
      'validation_log',
      'backup_metadata',
      'backup_verification_logs',
      'backup_schedules'
    ];

    console.log('📋 CHECKING TABLE EXISTENCE AND STRUCTURE...\n');

    const tableResults = {};

    for (const tableName of tablesToCheck) {
      try {
        console.log(`🔍 Checking table: ${tableName}`);
        
        // Try to get table info by attempting a simple select
        const { data, error, count } = await supabase
          .from(tableName)
          .select('*', { count: 'exact', head: true });

        if (error) {
          console.log(`   ❌ ${tableName}: ${error.message}`);
          tableResults[tableName] = { exists: false, error: error.message };
        } else {
          console.log(`   ✅ ${tableName}: EXISTS (${count || 0} records)`);
          tableResults[tableName] = { exists: true, count: count || 0 };
        }
      } catch (err) {
        console.log(`   ❌ ${tableName}: ${err.message}`);
        tableResults[tableName] = { exists: false, error: err.message };
      }
    }

    console.log('\n📊 SUMMARY REPORT...\n');

    const existingTables = Object.entries(tableResults).filter(([_, result]) => result.exists);
    const missingTables = Object.entries(tableResults).filter(([_, result]) => !result.exists);

    console.log(`✅ EXISTING TABLES (${existingTables.length}):`);
    existingTables.forEach(([tableName, result]) => {
      console.log(`   📋 ${tableName}: ${result.count} records`);
    });

    console.log(`\n❌ MISSING TABLES (${missingTables.length}):`);
    missingTables.forEach(([tableName, result]) => {
      console.log(`   📋 ${tableName}: ${result.error}`);
    });

    // Check for RLS policies
    console.log('\n🔒 CHECKING RLS POLICIES...\n');
    
    try {
      const { data: policies, error: policyError } = await supabase
        .rpc('get_rls_policies');

      if (policyError) {
        console.log('❌ Could not check RLS policies:', policyError.message);
      } else {
        console.log(`✅ Found ${policies?.length || 0} RLS policies`);
      }
    } catch (err) {
      console.log('❌ RLS check failed:', err.message);
    }

    // Check for functions
    console.log('\n⚙️ CHECKING FUNCTIONS...\n');
    
    try {
      const { data: functions, error: functionError } = await supabase
        .rpc('get_functions');

      if (functionError) {
        console.log('❌ Could not check functions:', functionError.message);
      } else {
        console.log(`✅ Found ${functions?.length || 0} functions`);
      }
    } catch (err) {
      console.log('❌ Function check failed:', err.message);
    }

    console.log('\n🎯 RECOMMENDATIONS FOR SCHEMA OVERHAUL...\n');
    
    if (missingTables.length > 0) {
      console.log('📋 MISSING TABLES TO CREATE:');
      missingTables.forEach(([tableName, _]) => {
        console.log(`   • ${tableName}`);
      });
    }

    if (existingTables.length > 0) {
      console.log('\n📋 EXISTING TABLES TO REVIEW:');
      existingTables.forEach(([tableName, result]) => {
        console.log(`   • ${tableName} (${result.count} records)`);
      });
    }

    console.log('\n🔧 NEXT STEPS:');
    console.log('   1. Review missing tables and create them');
    console.log('   2. Review existing table structures');
    console.log('   3. Update RLS policies');
    console.log('   4. Create/update functions');
    console.log('   5. Migrate data if needed');

  } catch (error) {
    console.error('❌ Error auditing database schema:', error);
  }
}

if (require.main === module) {
  auditDatabaseSchema()
    .then(() => {
      console.log('\n✅ Database audit completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Script error:', error);
      process.exit(1);
    });
}
