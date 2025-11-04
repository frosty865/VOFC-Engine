#!/usr/bin/env node

/**
 * Database Reindexing Script
 * Recreates all database indexes for optimal performance
 * Run this from the root directory: node scripts/reindex-database.js
 */

// Try multiple env file locations
const envPaths = [
  './vofc-viewer/.env.local',
  './vofc-viewer/.env',
  './.env.local',
  './.env'
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    const result = require('dotenv').config({ path: envPath });
    if (result && !result.error && Object.keys(result.parsed || {}).length > 0) {
      envLoaded = true;
      break;
    }
  } catch (e) {
    // Continue to next path
  }
}

// Also try loading from process.env directly (might be set externally)

const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Reindexing Database...');
console.log('=====================================\n');

// Create Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  console.error('❌ Error: NEXT_PUBLIC_SUPABASE_URL is required');
  console.error('   Please set it in vofc-viewer/.env.local');
  process.exit(1);
}

if (!supabaseKey) {
  console.error('❌ Error: SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
  console.error('   Please set it in vofc-viewer/.env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Execute SQL using Supabase RPC or pg module
let pgClient = null;

async function getPgClient() {
  if (pgClient) return pgClient;
  
  // Try to use pg module with connection string from env
  // Check multiple possible env var names
  const dbUrl = process.env.DATABASE_URL || 
                process.env.SUPABASE_DB_URL || 
                process.env.POSTGRES_URL ||
                process.env.POSTGRES_CONNECTION_STRING;
  
  if (!dbUrl) {
    console.log('⚠️  No DATABASE_URL found in environment variables');
    console.log('   Please set DATABASE_URL in vofc-viewer/.env.local');
    console.log('   Format: postgresql://postgres:[password]@db.[project-ref].supabase.co:5432/postgres\n');
    return null;
  }
  
  try {
    const { Client } = require('pg');
    pgClient = new Client({ connectionString: dbUrl });
    await pgClient.connect();
    console.log('✅ Connected to database via pg module\n');
    return pgClient;
  } catch (e) {
    console.error(`❌ Could not connect via pg module: ${e.message}`);
    console.log('⚠️  Will try RPC method (may require exec function)\n');
    return null;
  }
}

async function executeSQL(sql) {
  // Try pg module first
  const client = await getPgClient();
  if (client) {
    try {
      await client.query(sql);
      return { error: null };
    } catch (error) {
      return { error };
    }
  }
  
  // Fallback to Supabase RPC (requires exec function to be created)
  try {
    const { error } = await supabase.rpc('exec', { sql });
    return { error };
  } catch (error) {
    return { error };
  }
}

async function closeConnection() {
  if (pgClient) {
    await pgClient.end();
    pgClient = null;
  }
}

// All indexes to create/recreate
const INDEXES = [
  // Submission vulnerabilities indexes
  'DROP INDEX IF EXISTS idx_submission_vulnerabilities_submission_id CASCADE;',
  'CREATE INDEX idx_submission_vulnerabilities_submission_id ON submission_vulnerabilities(submission_id);',
  
  'DROP INDEX IF EXISTS idx_submission_vulnerabilities_discipline CASCADE;',
  'CREATE INDEX idx_submission_vulnerabilities_discipline ON submission_vulnerabilities(discipline) WHERE discipline IS NOT NULL;',
  
  'DROP INDEX IF EXISTS idx_submission_vulnerabilities_created_at CASCADE;',
  'CREATE INDEX idx_submission_vulnerabilities_created_at ON submission_vulnerabilities(created_at DESC);',
  
  'DROP INDEX IF EXISTS idx_submission_vulnerabilities_sector CASCADE;',
  'CREATE INDEX idx_submission_vulnerabilities_sector ON submission_vulnerabilities(sector) WHERE sector IS NOT NULL;',
  
  'DROP INDEX IF EXISTS idx_submission_vulnerabilities_subsector CASCADE;',
  'CREATE INDEX idx_submission_vulnerabilities_subsector ON submission_vulnerabilities(subsector) WHERE subsector IS NOT NULL;',
  
  'DROP INDEX IF EXISTS idx_submission_vulnerabilities_question CASCADE;',
  'CREATE INDEX idx_submission_vulnerabilities_question ON submission_vulnerabilities USING gin(to_tsvector(\'english\', question)) WHERE question IS NOT NULL;',
  
  // Submission OFCs indexes
  'DROP INDEX IF EXISTS idx_submission_ofcs_submission_id CASCADE;',
  'CREATE INDEX idx_submission_ofcs_submission_id ON submission_options_for_consideration(submission_id);',
  
  'DROP INDEX IF EXISTS idx_submission_ofcs_discipline CASCADE;',
  'CREATE INDEX idx_submission_ofcs_discipline ON submission_options_for_consideration(discipline) WHERE discipline IS NOT NULL;',
  
  'DROP INDEX IF EXISTS idx_submission_ofcs_vulnerability_id CASCADE;',
  'CREATE INDEX idx_submission_ofcs_vulnerability_id ON submission_options_for_consideration(vulnerability_id) WHERE vulnerability_id IS NOT NULL;',
  
  // Submission sources indexes
  'DROP INDEX IF EXISTS idx_submission_sources_submission_id CASCADE;',
  'CREATE INDEX idx_submission_sources_submission_id ON submission_sources(submission_id);',
  
  'DROP INDEX IF EXISTS idx_submission_sources_reference_number CASCADE;',
  'CREATE INDEX idx_submission_sources_reference_number ON submission_sources(reference_number) WHERE reference_number IS NOT NULL;',
  
  // Submission links indexes
  'DROP INDEX IF EXISTS idx_submission_vuln_ofc_links_submission_id CASCADE;',
  'CREATE INDEX idx_submission_vuln_ofc_links_submission_id ON submission_vulnerability_ofc_links(submission_id);',
  
  'DROP INDEX IF EXISTS idx_submission_vuln_ofc_links_vulnerability_id CASCADE;',
  'CREATE INDEX idx_submission_vuln_ofc_links_vulnerability_id ON submission_vulnerability_ofc_links(vulnerability_id);',
  
  'DROP INDEX IF EXISTS idx_submission_vuln_ofc_links_ofc_id CASCADE;',
  'CREATE INDEX idx_submission_vuln_ofc_links_ofc_id ON submission_vulnerability_ofc_links(ofc_id);',
  
  // Submission OFC sources indexes
  'DROP INDEX IF EXISTS idx_submission_ofc_sources_submission_id CASCADE;',
  'CREATE INDEX idx_submission_ofc_sources_submission_id ON submission_ofc_sources(submission_id);',
  
  'DROP INDEX IF EXISTS idx_submission_ofc_sources_ofc_id CASCADE;',
  'CREATE INDEX idx_submission_ofc_sources_ofc_id ON submission_ofc_sources(ofc_id);',
  
  'DROP INDEX IF EXISTS idx_submission_ofc_sources_source_id CASCADE;',
  'CREATE INDEX idx_submission_ofc_sources_source_id ON submission_ofc_sources(source_id);',
  
  // Submissions table indexes
  'DROP INDEX IF EXISTS idx_submissions_type_status CASCADE;',
  'CREATE INDEX idx_submissions_type_status ON submissions(type, status);',
  
  'DROP INDEX IF EXISTS idx_submissions_created_at CASCADE;',
  'CREATE INDEX idx_submissions_created_at ON submissions(created_at DESC);',
  
  'DROP INDEX IF EXISTS idx_submissions_reviewed_at CASCADE;',
  'CREATE INDEX idx_submissions_reviewed_at ON submissions(reviewed_at) WHERE reviewed_at IS NOT NULL;',
  
  'DROP INDEX IF EXISTS idx_submissions_reviewed_by CASCADE;',
  'CREATE INDEX idx_submissions_reviewed_by ON submissions(reviewed_by) WHERE reviewed_by IS NOT NULL;',
  
  'DROP INDEX IF EXISTS idx_submissions_status CASCADE;',
  'CREATE INDEX idx_submissions_status ON submissions(status);',
  
  // Vulnerabilities table indexes
  'DROP INDEX IF EXISTS idx_vulnerabilities_discipline CASCADE;',
  'CREATE INDEX idx_vulnerabilities_discipline ON vulnerabilities(discipline) WHERE discipline IS NOT NULL;',
  
  // User profiles indexes
  'DROP INDEX IF EXISTS idx_user_profiles_user_id CASCADE;',
  'CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);',
  
  'DROP INDEX IF EXISTS idx_user_profiles_role CASCADE;',
  'CREATE INDEX idx_user_profiles_role ON user_profiles(role);',
  
  // User groups indexes
  'DROP INDEX IF EXISTS idx_user_groups_name CASCADE;',
  'CREATE INDEX idx_user_groups_name ON user_groups(name);',
];

async function reindexDatabase() {
  try {
    console.log(`📊 Recreating ${INDEXES.length / 2} indexes...\n`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < INDEXES.length; i += 2) {
      const dropIndex = INDEXES[i];
      const createIndex = INDEXES[i + 1];
      
      // Extract index name for logging
      const indexMatch = createIndex.match(/CREATE INDEX (\w+) ON/);
      const indexName = indexMatch ? indexMatch[1] : 'unknown';
      
      try {
        // Drop existing index (if exists)
        const dropResult = await executeSQL(dropIndex);
        
        // Create new index
        const { error } = await executeSQL(createIndex);
        
        if (error) {
          console.error(`❌ Error creating ${indexName}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ Created ${indexName}`);
          successCount++;
        }
      } catch (err) {
        console.error(`❌ Error with ${indexName}: ${err.message}`);
        errorCount++;
      }
    }
    
    console.log('\n=====================================');
    console.log(`✅ Successfully created: ${successCount} indexes`);
    if (errorCount > 0) {
      console.log(`❌ Errors: ${errorCount} indexes`);
    }
    console.log('=====================================\n');
    
    // Analyze tables for query planner
    console.log('📈 Analyzing tables for query planner...\n');
    
    const tables = [
      'submissions',
      'submission_vulnerabilities',
      'submission_options_for_consideration',
      'submission_sources',
      'submission_vulnerability_ofc_links',
      'submission_ofc_sources',
      'vulnerabilities',
      'options_for_consideration',
      'user_profiles',
      'user_groups'
    ];
    
    for (const table of tables) {
      try {
        const { error } = await executeSQL(`ANALYZE ${table};`);
        
        if (error) {
          console.error(`⚠️  Error analyzing ${table}: ${error.message}`);
        } else {
          console.log(`✅ Analyzed ${table}`);
        }
      } catch (err) {
        console.error(`⚠️  Error analyzing ${table}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Reindexing complete!');
    
    // Close database connection
    await closeConnection();
    
  } catch (error) {
    console.error('❌ Fatal error during reindexing:', error);
    await closeConnection();
    process.exit(1);
  }
}

// Run the reindexing
reindexDatabase().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

