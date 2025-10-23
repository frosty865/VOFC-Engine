#!/usr/bin/env node

/**
 * Sub-discipline Migration Runner
 * This script runs the complete migration to add sub-discipline support
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runMigration() {
  console.log('🚀 Starting Sub-discipline Migration...');
  console.log('=====================================\n');

  try {
    // Step 1: Read and execute the schema migration
    console.log('📋 Step 1: Adding sub-discipline schema...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'sql', 'add_subdisciplines_schema.sql'), 'utf8');
    
    const { data: schemaResult, error: schemaError } = await supabase.rpc('exec_sql', {
      sql: schemaSQL
    });
    
    if (schemaError) {
      console.error('❌ Schema migration failed:', schemaError);
      return;
    }
    
    console.log('✅ Schema migration completed');

    // Step 2: Read and execute the data migration
    console.log('\n📋 Step 2: Migrating existing data...');
    const dataSQL = fs.readFileSync(path.join(__dirname, '..', 'sql', 'migrate_existing_data_to_subdisciplines.sql'), 'utf8');
    
    const { data: dataResult, error: dataError } = await supabase.rpc('exec_sql', {
      sql: dataSQL
    });
    
    if (dataError) {
      console.error('❌ Data migration failed:', dataError);
      return;
    }
    
    console.log('✅ Data migration completed');

    // Step 3: Run the content-based assignment
    console.log('\n📋 Step 3: Assigning sub-disciplines based on content...');
    const { data: assignmentResult, error: assignmentError } = await supabase.rpc('assign_subdisciplines_by_content');
    
    if (assignmentError) {
      console.error('❌ Content assignment failed:', assignmentError);
      return;
    }
    
    console.log('✅ Content assignment completed:', assignmentResult);

    // Step 4: Update submission tables
    console.log('\n📋 Step 4: Updating submission tables...');
    const { data: submissionResult, error: submissionError } = await supabase.rpc('update_submission_tables_subdisciplines');
    
    if (submissionError) {
      console.error('❌ Submission tables update failed:', submissionError);
      return;
    }
    
    console.log('✅ Submission tables updated:', submissionResult);

    // Step 5: Get final statistics
    console.log('\n📋 Step 5: Getting migration statistics...');
    const { data: stats, error: statsError } = await supabase.rpc('get_subdiscipline_migration_stats');
    
    if (statsError) {
      console.error('❌ Statistics retrieval failed:', statsError);
      return;
    }
    
    console.log('✅ Migration statistics:', stats);

    // Step 6: Verify Physical Security sub-disciplines
    console.log('\n📋 Step 6: Verifying Physical Security sub-disciplines...');
    const { data: physicalSecuritySubdisciplines, error: psError } = await supabase.rpc('get_physical_security_subdisciplines');
    
    if (psError) {
      console.error('❌ Physical Security sub-disciplines verification failed:', psError);
      return;
    }
    
    console.log('✅ Physical Security sub-disciplines:', physicalSecuritySubdisciplines);

    // Step 7: Test the new discipline structure
    console.log('\n📋 Step 7: Testing new discipline structure...');
    const { data: allDisciplines, error: disciplinesError } = await supabase.rpc('get_all_disciplines_for_frontend');
    
    if (disciplinesError) {
      console.error('❌ Discipline structure test failed:', disciplinesError);
      return;
    }
    
    console.log('✅ All disciplines with sub-disciplines:', allDisciplines);

    console.log('\n🎉 Migration completed successfully!');
    console.log('=====================================');
    console.log('✅ Sub-discipline schema added');
    console.log('✅ Existing data migrated');
    console.log('✅ Content-based assignment completed');
    console.log('✅ Submission tables updated');
    console.log('✅ Physical Security sub-disciplines created');
    console.log('✅ Database ready for sub-discipline support');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Helper function to execute SQL directly
async function executeSQL(sql) {
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) throw error;
  return data;
}

// Run the migration
runMigration().catch(console.error);

