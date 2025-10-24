#!/usr/bin/env node

/**
 * Production Issues Test Script
 * This script tests all the issues that were reported in production
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testProductionIssues() {
  console.log('🧪 Testing Production Issues Fixes...\n');
  
  let allTestsPassed = true;
  
  // Test 1: Favicon.ico (404 error)
  console.log('1️⃣ Testing favicon.ico availability...');
  try {
    const response = await fetch('http://localhost:3000/favicon.ico');
    if (response.status === 200) {
      console.log('✅ Favicon.ico is accessible (no 404 error)');
    } else {
      console.log(`❌ Favicon.ico returned status: ${response.status}`);
      allTestsPassed = false;
    }
  } catch (error) {
    console.log('❌ Error testing favicon.ico:', error.message);
    allTestsPassed = false;
  }
  
  // Test 2: Subsectors query (400 error)
  console.log('\n2️⃣ Testing subsectors query...');
  try {
    const { data: subsectors, error: subsectorsError } = await supabase
      .from('subsectors')
      .select('*')
      .order('name', { ascending: true });
    
    if (subsectorsError) {
      console.log('❌ Subsectors query failed:', subsectorsError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ Subsectors query successful');
      console.log(`   Found ${subsectors.length} subsectors`);
    }
  } catch (error) {
    console.log('❌ Error testing subsectors query:', error.message);
    allTestsPassed = false;
  }
  
  // Test 3: Options for Consideration query (400 error)
  console.log('\n3️⃣ Testing OFCs query...');
  try {
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('*, ofc_sources(*, sources(*))')
      .order('id', { ascending: true });
    
    if (ofcsError) {
      console.log('❌ OFCs query failed:', ofcsError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ OFCs query successful');
      console.log(`   Found ${ofcs.length} OFCs`);
      
      // Check if sources are properly linked
      const ofcsWithSources = ofcs.filter(ofc => ofc.ofc_sources && ofc.ofc_sources.length > 0);
      console.log(`   ${ofcsWithSources.length} OFCs have linked sources`);
    }
  } catch (error) {
    console.log('❌ Error testing OFCs query:', error.message);
    allTestsPassed = false;
  }
  
  // Test 4: Vulnerabilities query
  console.log('\n4️⃣ Testing vulnerabilities query...');
  try {
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (vulnError) {
      console.log('❌ Vulnerabilities query failed:', vulnError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ Vulnerabilities query successful');
      console.log(`   Found ${vulnerabilities.length} vulnerabilities`);
    }
  } catch (error) {
    console.log('❌ Error testing vulnerabilities query:', error.message);
    allTestsPassed = false;
  }
  
  // Test 5: Sectors query
  console.log('\n5️⃣ Testing sectors query...');
  try {
    const { data: sectors, error: sectorsError } = await supabase
      .from('sectors')
      .select('*')
      .order('name', { ascending: true });
    
    if (sectorsError) {
      console.log('❌ Sectors query failed:', sectorsError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ Sectors query successful');
      console.log(`   Found ${sectors.length} sectors`);
    }
  } catch (error) {
    console.log('❌ Error testing sectors query:', error.message);
    allTestsPassed = false;
  }
  
  // Test 6: Disciplines query
  console.log('\n6️⃣ Testing disciplines query...');
  try {
    const { data: disciplines, error: disciplinesError } = await supabase
      .from('disciplines')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    
    if (disciplinesError) {
      console.log('❌ Disciplines query failed:', disciplinesError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ Disciplines query successful');
      console.log(`   Found ${disciplines.length} active disciplines`);
    }
  } catch (error) {
    console.log('❌ Error testing disciplines query:', error.message);
    allTestsPassed = false;
  }
  
  // Test 7: Sources query with correct column names
  console.log('\n7️⃣ Testing sources query...');
  try {
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('reference_number, source_text')
      .limit(5);
    
    if (sourcesError) {
      console.log('❌ Sources query failed:', sourcesError.message);
      allTestsPassed = false;
    } else {
      console.log('✅ Sources query successful');
      console.log(`   Found ${sources.length} sources (showing first 5)`);
    }
  } catch (error) {
    console.log('❌ Error testing sources query:', error.message);
    allTestsPassed = false;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allTestsPassed) {
    console.log('🎉 ALL TESTS PASSED!');
    console.log('✅ Production issues have been resolved');
    console.log('\n📋 Summary of fixes:');
    console.log('   • Favicon.ico 404 error: FIXED');
    console.log('   • Subsectors 400 error: FIXED');
    console.log('   • OFCs 400 error: FIXED');
    console.log('   • Database schema: CORRECT');
    console.log('   • Column names: CORRECT');
    console.log('\n🚀 Your production server should now work without errors!');
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('⚠️  Please check the failed tests above and fix the issues');
  }
  console.log('='.repeat(50));
}

// Run the tests
testProductionIssues();
