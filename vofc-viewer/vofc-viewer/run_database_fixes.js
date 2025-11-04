#!/usr/bin/env node

/**
 * Database Fix Script for VOFC Engine Production Issues
 * 
 * This script helps fix the database schema issues causing 400 errors
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDatabaseFixes() {
  console.log('🔧 Starting database fixes...');
  
  try {
    // 1. Check if sources table has the problematic column names
    console.log('📋 Checking sources table structure...');
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(1);
    
    if (sourcesError) {
      console.error('❌ Error checking sources table:', sourcesError.message);
      return;
    }
    
    if (sources && sources.length > 0) {
      const columns = Object.keys(sources[0]);
      console.log('📊 Current sources table columns:', columns);
      
      // Check if we need to rename columns
      if (columns.includes('reference number') || columns.includes('source')) {
        console.log('⚠️  Found problematic column names. You need to run the SQL migration manually.');
        console.log('📝 Please execute the contents of sql/fix_column_names.sql in your Supabase dashboard');
        return;
      }
    }
    
    // 2. Check if sectors table exists
    console.log('📋 Checking sectors table...');
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*')
      .limit(1);
    
    if (sectorsError && sectorsError.code === 'PGRST116') {
      console.log('⚠️  Sectors table does not exist. Creating...');
      // You'll need to run the SQL manually for table creation
      console.log('📝 Please execute the contents of sql/missing_tables.sql in your Supabase dashboard');
    } else if (sectorsError) {
      console.error('❌ Error checking sectors table:', sectorsError.message);
    } else {
      console.log('✅ Sectors table exists');
    }
    
    // 3. Check if subsectors table exists
    console.log('📋 Checking subsectors table...');
    const { data: subsectors, error: subsectorsError } = await supabase
      .from('subsectors')
      .select('*')
      .limit(1);
    
    if (subsectorsError && subsectorsError.code === 'PGRST116') {
      console.log('⚠️  Subsectors table does not exist. Creating...');
      console.log('📝 Please execute the contents of sql/missing_tables.sql in your Supabase dashboard');
    } else if (subsectorsError) {
      console.error('❌ Error checking subsectors table:', subsectorsError.message);
    } else {
      console.log('✅ Subsectors table exists');
    }
    
    // 4. Test the queries that were failing
    console.log('🧪 Testing problematic queries...');
    
    // Test subsectors query
    try {
      const { data: subsectorsTest, error: subsectorsTestError } = await supabase
        .from('subsectors')
        .select('*')
        .order('name', { ascending: true });
      
      if (subsectorsTestError) {
        console.log('❌ Subsectors query still failing:', subsectorsTestError.message);
      } else {
        console.log('✅ Subsectors query working');
      }
    } catch (err) {
      console.log('❌ Subsectors query error:', err.message);
    }
    
    // Test OFCs query
    try {
      const { data: ofcsTest, error: ofcsTestError } = await supabase
        .from('options_for_consideration')
        .select('*, ofc_sources(*, sources(*))')
        .order('id', { ascending: true });
      
      if (ofcsTestError) {
        console.log('❌ OFCs query still failing:', ofcsTestError.message);
      } else {
        console.log('✅ OFCs query working');
      }
    } catch (err) {
      console.log('❌ OFCs query error:', err.message);
    }
    
    console.log('\n🎉 Database check complete!');
    console.log('\n📋 Next steps:');
    console.log('1. If tables are missing, run sql/missing_tables.sql');
    console.log('2. If column names are wrong, run sql/fix_column_names.sql');
    console.log('3. Restart your application');
    console.log('4. Test the frontend queries');
    
  } catch (error) {
    console.error('❌ Error running database fixes:', error.message);
  }
}

// Run the fixes
runDatabaseFixes();
