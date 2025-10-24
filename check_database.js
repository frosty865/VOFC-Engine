#!/usr/bin/env node

/**
 * Database Structure Checker
 * This script checks the actual database structure and provides the correct fix
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

async function checkDatabaseStructure() {
  console.log('🔍 Checking database structure...');
  
  try {
    // Check sources table structure
    console.log('\n📋 Checking sources table...');
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(1);
    
    if (sourcesError) {
      console.error('❌ Error accessing sources table:', sourcesError.message);
    } else if (sources && sources.length > 0) {
      const columns = Object.keys(sources[0]);
      console.log('✅ Sources table columns:', columns);
      
      // Check for problematic column names
      const hasOldColumns = columns.includes('reference number') || columns.includes('source');
      const hasNewColumns = columns.includes('reference_number') && columns.includes('source_text');
      
      if (hasOldColumns && !hasNewColumns) {
        console.log('⚠️  Found old column names. Need to rename columns.');
        console.log('📝 Run this SQL in your Supabase dashboard:');
        console.log('   ALTER TABLE sources RENAME COLUMN "reference number" TO reference_number;');
        console.log('   ALTER TABLE sources RENAME COLUMN "source" TO source_text;');
      } else if (hasNewColumns) {
        console.log('✅ Sources table has correct column names');
      } else {
        console.log('❓ Unexpected column structure. Please check manually.');
      }
    } else {
      console.log('⚠️  Sources table is empty or doesn\'t exist');
    }
    
    // Check if sectors table exists
    console.log('\n📋 Checking sectors table...');
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*')
      .limit(1);
    
    if (sectorsError && sectorsError.code === 'PGRST116') {
      console.log('⚠️  Sectors table does not exist');
      console.log('📝 Run the contents of sql/safe_database_fix.sql to create missing tables');
    } else if (sectorsError) {
      console.error('❌ Error accessing sectors table:', sectorsError.message);
    } else {
      console.log('✅ Sectors table exists');
    }
    
    // Check if subsectors table exists
    console.log('\n📋 Checking subsectors table...');
    const { data: subsectors, error: subsectorsError } = await supabase
      .from('subsectors')
      .select('*')
      .limit(1);
    
    if (subsectorsError && subsectorsError.code === 'PGRST116') {
      console.log('⚠️  Subsectors table does not exist');
      console.log('📝 Run the contents of sql/safe_database_fix.sql to create missing tables');
    } else if (subsectorsError) {
      console.error('❌ Error accessing subsectors table:', subsectorsError.message);
    } else {
      console.log('✅ Subsectors table exists');
    }
    
    // Test the problematic queries
    console.log('\n🧪 Testing problematic queries...');
    
    // Test subsectors query
    console.log('\n📋 Testing subsectors query...');
    try {
      const { data: subsectorsTest, error: subsectorsTestError } = await supabase
        .from('subsectors')
        .select('*')
        .order('name', { ascending: true });
      
      if (subsectorsTestError) {
        console.log('❌ Subsectors query failing:', subsectorsTestError.message);
        if (subsectorsTestError.message.includes('relation "subsectors" does not exist')) {
          console.log('💡 Solution: Run sql/safe_database_fix.sql to create the subsectors table');
        }
      } else {
        console.log('✅ Subsectors query working');
        console.log(`   Found ${subsectorsTest.length} subsectors`);
      }
    } catch (err) {
      console.log('❌ Subsectors query error:', err.message);
    }
    
    // Test OFCs query with proper column names
    console.log('\n📋 Testing OFCs query...');
    try {
      // First test basic OFCs query
      const { data: ofcsBasic, error: ofcsBasicError } = await supabase
        .from('options_for_consideration')
        .select('*')
        .order('id', { ascending: true })
        .limit(5);
      
      if (ofcsBasicError) {
        console.log('❌ Basic OFCs query failing:', ofcsBasicError.message);
      } else {
        console.log('✅ Basic OFCs query working');
        console.log(`   Found ${ofcsBasic.length} OFCs`);
      }
      
      // Test the complex query that was failing
      const { data: ofcsComplex, error: ofcsComplexError } = await supabase
        .from('options_for_consideration')
        .select('*, ofc_sources(*, sources(*))')
        .order('id', { ascending: true })
        .limit(5);
      
      if (ofcsComplexError) {
        console.log('❌ Complex OFCs query failing:', ofcsComplexError.message);
        if (ofcsComplexError.message.includes('column') && ofcsComplexError.message.includes('does not exist')) {
          console.log('💡 Solution: The sources table has wrong column names. Check the column rename instructions above.');
        }
      } else {
        console.log('✅ Complex OFCs query working');
      }
      
    } catch (err) {
      console.log('❌ OFCs query error:', err.message);
    }
    
    console.log('\n🎉 Database structure check complete!');
    console.log('\n📋 Summary of fixes needed:');
    console.log('1. If sources table has old column names, rename them');
    console.log('2. If sectors/subsectors tables are missing, run sql/safe_database_fix.sql');
    console.log('3. Restart your application after making changes');
    
  } catch (error) {
    console.error('❌ Error checking database structure:', error.message);
  }
}

// Run the check
checkDatabaseStructure();
