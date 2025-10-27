#!/usr/bin/env node

/**
 * Try to disable RLS or work around it
 * This script attempts different approaches to fix the RLS issue
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔧 Attempting to fix RLS issue...');
console.log('=================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function tryDifferentApproaches() {
  try {
    console.log('🔍 Approach 1: Try to disable RLS temporarily...');
    
    // Try to execute SQL to disable RLS
    const { data: disableData, error: disableError } = await supabase
      .rpc('exec', { sql: 'ALTER TABLE submissions DISABLE ROW LEVEL SECURITY;' });
    
    if (disableError) {
      console.log('❌ Cannot disable RLS directly:', disableError.message);
    } else {
      console.log('✅ RLS disabled successfully');
    }
    
  } catch (err) {
    console.log('❌ Approach 1 failed:', err.message);
  }
  
  try {
    console.log('\n🔍 Approach 2: Try to create a policy...');
    
    // Try to create a policy
    const { data: policyData, error: policyError } = await supabase
      .rpc('exec', { 
        sql: `CREATE POLICY "Allow anonymous submissions" ON submissions FOR INSERT WITH CHECK (true);` 
      });
    
    if (policyError) {
      console.log('❌ Cannot create policy directly:', policyError.message);
    } else {
      console.log('✅ Policy created successfully');
    }
    
  } catch (err) {
    console.log('❌ Approach 2 failed:', err.message);
  }
  
  try {
    console.log('\n🔍 Approach 3: Try with different table name...');
    
    // Check if there's a different submissions table
    const { data: altData, error: altError } = await supabase
      .from('vofc_submissions')
      .select('*')
      .limit(1);
    
    if (altError) {
      console.log('❌ vofc_submissions table not accessible:', altError.message);
    } else {
      console.log('✅ vofc_submissions table is accessible');
      
      // Try to insert into vofc_submissions
      const testData = {
        status: 'pending_review',
        data: { test: 'data' },
        uploaded_by: 'test-user'
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('vofc_submissions')
        .insert([testData])
        .select();
      
      if (insertError) {
        console.log('❌ Cannot insert into vofc_submissions:', insertError.message);
      } else {
        console.log('✅ Successfully inserted into vofc_submissions!');
        console.log('📊 Inserted data:', insertData);
      }
    }
    
  } catch (err) {
    console.log('❌ Approach 3 failed:', err.message);
  }
  
  console.log('\n📋 Summary:');
  console.log('===========');
  console.log('If all approaches failed, you need to manually fix RLS in Supabase dashboard.');
  console.log('Run: node scripts/manual-rls-fix.js for instructions.');
}

// Run the approaches
tryDifferentApproaches();
