#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 Testing Submission Review System...');
console.log('=====================================\n');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkSubmissionTables() {
  console.log('📊 Checking submission mirror tables...');
  const tables = [
    'submission_vulnerabilities',
    'submission_options_for_consideration',
    'submission_sources',
    'submission_vulnerability_ofc_links',
    'submission_ofc_sources'
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
      console.log(`❌ Table ${table}: ${error.message}`);
    } else {
      console.log(`✅ Table ${table}: Exists`);
    }
  }
}

async function checkRecentSubmissions() {
  console.log('\n📋 Checking recent submissions...');
  const { data: submissions, error } = await supabase
    .from('submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  if (error) {
    console.error('❌ Error fetching submissions:', error.message);
    return [];
  }

  console.log(`✅ Found ${submissions.length} recent submissions`);
  
  if (submissions.length > 0) {
    console.log('\n📄 Recent submissions:');
    submissions.forEach((s, index) => {
      const data = typeof s.data === 'string' ? JSON.parse(s.data) : s.data;
      console.log(`\n${index + 1}. Submission ${s.id.slice(0, 8)}...`);
      console.log(`   Type: ${s.type}`);
      console.log(`   Status: ${s.status}`);
      console.log(`   Created: ${s.created_at}`);
      console.log(`   Has enhanced_extraction: ${!!data.enhanced_extraction ? 'Yes' : 'No'}`);
      if (data.enhanced_extraction) {
        console.log(`   Enhanced extraction blocks: ${data.enhanced_extraction.length}`);
        console.log(`   OFC count: ${data.ofc_count}`);
        console.log(`   Vulnerability count: ${data.vulnerability_count}`);
      }
    });
  }
  
  return submissions;
}

async function testStructuredAPI(submissionId) {
  console.log('\n🔌 Testing structured data API...');
  if (!submissionId) {
    console.log('⚠️ No submission ID provided for API test.');
    return;
  }
  
  console.log(`Testing with submission: ${submissionId.slice(0, 8)}...`);
  try {
    const apiUrl = `http://localhost:3001/api/submissions/structured?submission_id=${submissionId}`;
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (response.ok && data.success) {
      console.log('✅ Structured API working');
      console.log(`   Vulnerabilities: ${data.structured_data.vulnerabilities.length}`);
      console.log(`   OFCs: ${data.structured_data.options_for_consideration.length}`);
      console.log(`   Sources: ${data.structured_data.sources.length}`);
      console.log(`   Links: ${data.structured_data.vulnerability_ofc_links.length}`);
    } else {
      console.error('❌ Structured API failed:', data.error || response.statusText);
    }
  } catch (error) {
    console.error('❌ Error calling structured API:', error.message);
  }
}

async function checkSubmissionData(submissionId) {
  console.log('\n🔍 Checking submission data structure...');
  
  // Check main submission
  const { data: submission, error: subError } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', submissionId)
    .single();

  if (subError) {
    console.error('❌ Error fetching submission:', subError.message);
    return;
  }

  console.log('✅ Main submission found');
  const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
  console.log(`   Type: ${submission.type}`);
  console.log(`   Status: ${submission.status}`);
  console.log(`   Has enhanced_extraction: ${!!data.enhanced_extraction ? 'Yes' : 'No'}`);
  
  if (data.enhanced_extraction) {
    console.log(`   Enhanced extraction blocks: ${data.enhanced_extraction.length}`);
    console.log(`   Parser version: ${data.parser_version}`);
    console.log(`   OFC count: ${data.ofc_count}`);
    console.log(`   Vulnerability count: ${data.vulnerability_count}`);
  }

  // Check mirror tables
  const { data: vulnerabilities, error: vulnError } = await supabase
    .from('submission_vulnerabilities')
    .select('*')
    .eq('submission_id', submissionId);

  if (vulnError) {
    console.log(`❌ Error fetching vulnerabilities: ${vulnError.message}`);
  } else {
    console.log(`✅ Found ${vulnerabilities.length} vulnerabilities in mirror table`);
  }

  const { data: ofcs, error: ofcError } = await supabase
    .from('submission_options_for_consideration')
    .select('*')
    .eq('submission_id', submissionId);

  if (ofcError) {
    console.log(`❌ Error fetching OFCs: ${ofcError.message}`);
  } else {
    console.log(`✅ Found ${ofcs.length} OFCs in mirror table`);
  }
}

async function main() {
  console.log('🚀 Starting submission review system test...\n');
  
  await checkSubmissionTables();
  const recentSubmissions = await checkRecentSubmissions();
  
  if (recentSubmissions && recentSubmissions.length > 0) {
    const testSubmission = recentSubmissions[0];
    await checkSubmissionData(testSubmission.id);
    await testStructuredAPI(testSubmission.id);
  }

  console.log('\n🎯 Test Complete!');
  console.log('==================');
  console.log('If submission review is not working:');
  console.log('1. Check if mirror tables exist');
  console.log('2. Verify submissions have enhanced_extraction data');
  console.log('3. Test structured API endpoint');
  console.log('4. Check admin page integration');
}

main().catch(console.error);
