#!/usr/bin/env node

/**
 * Debug script to check submission mirror tables and data
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Debugging Submission Data...');
console.log('================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSubmissionTables() {
  try {
    console.log('📊 Checking submission mirror tables...');
    
    // Check if tables exist and get counts
    const tables = [
      'submission_vulnerabilities',
      'submission_options_for_consideration', 
      'submission_sources',
      'submission_vulnerability_ofc_links',
      'submission_ofc_sources'
    ];
    
    for (const table of tables) {
      try {
        const { data, error, count } = await supabase
          .from(table)
          .select('*', { count: 'exact' })
          .limit(5);
        
        if (error) {
          console.log(`❌ Table ${table}: ${error.message}`);
        } else {
          console.log(`✅ Table ${table}: ${count} records`);
          if (data && data.length > 0) {
            console.log(`   Sample record:`, JSON.stringify(data[0], null, 2));
          }
        }
      } catch (err) {
        console.log(`❌ Table ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking tables:', error);
  }
}

async function checkMainSubmissions() {
  try {
    console.log('\n📋 Checking main submissions table...');
    
    const { data: submissions, error, count } = await supabase
      .from('submissions')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (error) {
      console.log(`❌ Error fetching submissions: ${error.message}`);
      return;
    }
    
    console.log(`✅ Main submissions table: ${count} records`);
    
    if (submissions && submissions.length > 0) {
      console.log('\n📄 Recent submissions:');
      submissions.forEach((submission, index) => {
        console.log(`\n${index + 1}. Submission ${submission.id.slice(0, 8)}...`);
        console.log(`   Type: ${submission.type}`);
        console.log(`   Status: ${submission.status}`);
        console.log(`   Created: ${submission.created_at}`);
        console.log(`   Has enhanced_extraction: ${submission.data && JSON.parse(submission.data).enhanced_extraction ? 'Yes' : 'No'}`);
        
        if (submission.data) {
          const data = JSON.parse(submission.data);
          if (data.enhanced_extraction) {
            console.log(`   Enhanced extraction blocks: ${data.enhanced_extraction.length}`);
            console.log(`   OFC count: ${data.ofc_count || 0}`);
            console.log(`   Vulnerability count: ${data.vulnerability_count || 0}`);
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error checking main submissions:', error);
  }
}

async function checkStructuredDataAPI() {
  try {
    console.log('\n🔌 Testing structured data API...');
    
    // Get a recent submission
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('id')
      .limit(1);
    
    if (error || !submissions || submissions.length === 0) {
      console.log('❌ No submissions found to test API');
      return;
    }
    
    const submissionId = submissions[0].id;
    console.log(`Testing with submission: ${submissionId.slice(0, 8)}...`);
    
    // Test the structured API endpoint
    const response = await fetch(`http://localhost:3001/api/submissions/structured?submission_id=${submissionId}`);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ Structured API working');
      console.log(`   Vulnerabilities: ${result.structured_data.vulnerabilities?.length || 0}`);
      console.log(`   OFCs: ${result.structured_data.options_for_consideration?.length || 0}`);
      console.log(`   Sources: ${result.structured_data.sources?.length || 0}`);
      console.log(`   Links: ${result.structured_data.vulnerability_ofc_links?.length || 0}`);
    } else {
      console.log('❌ Structured API error:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Error testing structured API:', error);
  }
}

async function main() {
  console.log('🚀 Starting submission data debug...\n');
  
  await checkSubmissionTables();
  await checkMainSubmissions();
  await checkStructuredDataAPI();
  
  console.log('\n🎯 Debug Complete!');
  console.log('==================');
  console.log('If no data in mirror tables, the issue might be:');
  console.log('1. Submission mirror tables not created');
  console.log('2. Automatic population not working');
  console.log('3. Migration not run');
  console.log('4. API endpoint not working');
}

main().catch(console.error);
