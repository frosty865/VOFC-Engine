#!/usr/bin/env node

/**
 * Test automatic processing of new submissions
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🧪 Testing Automatic Processing...');
console.log('===================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testAutomaticProcessing() {
  try {
    console.log('📝 Creating test submission...');
    
    // Create a test submission
    const testSubmission = {
      type: 'vulnerability',
      data: {
        vulnerability: 'Inadequate access controls for critical systems',
        discipline: 'Cybersecurity',
        sources: 'Test Source',
        id: 'test-id-123'
      },
      submitterEmail: 'test@example.com'
    };
    
    console.log('📤 Submitting test data...');
    console.log('   Vulnerability:', testSubmission.data.vulnerability);
    console.log('   Discipline:', testSubmission.data.discipline);
    
    // Submit to the API
    const response = await fetch('http://localhost:3000/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testSubmission)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error('❌ API Error:', errorData);
      return;
    }
    
    const result = await response.json();
    console.log('✅ Submission created successfully!');
    console.log('   Submission ID:', result.submission_id);
    console.log('   Status:', result.status);
    console.log('   Message:', result.message);
    
    // Wait a moment for processing to complete
    console.log('\n⏳ Waiting for automatic processing to complete...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if the submission was processed
    console.log('🔍 Checking processing results...');
    
    const { data: submission, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', result.submission_id)
      .single();
    
    if (fetchError) {
      console.error('❌ Error fetching submission:', fetchError);
      return;
    }
    
    const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
    
    console.log('\n📊 Processing Results:');
    console.log('======================');
    console.log('Submission ID:', submission.id.slice(0, 8) + '...');
    console.log('Status:', submission.status);
    console.log('Created:', new Date(submission.created_at).toLocaleString());
    console.log('Updated:', new Date(submission.updated_at).toLocaleString());
    
    if (data.enhanced_extraction) {
      console.log('\n✅ AUTOMATIC PROCESSING SUCCESSFUL!');
      console.log('===================================');
      console.log('📊 Total blocks:', data.extraction_stats?.total_blocks || 0);
      console.log('📊 OFCs found:', data.extraction_stats?.ofc_count || 0);
      console.log('📊 Vulnerabilities found:', data.extraction_stats?.vulnerability_count || 0);
      console.log('🕒 Parsed at:', data.parsed_at);
      console.log('🔧 Parser version:', data.parser_version);
      
      // Show sample extracted content
      if (data.enhanced_extraction.length > 0) {
        const firstRecord = data.enhanced_extraction[0];
        if (firstRecord.content && firstRecord.content.length > 0) {
          const sampleEntry = firstRecord.content[0];
          console.log('\n📝 Sample extracted content:');
          console.log('   Type:', sampleEntry.type);
          console.log('   Text:', sampleEntry.text.substring(0, 100) + '...');
          console.log('   Confidence:', sampleEntry.confidence);
        }
      }
      
      console.log('\n🎉 Automatic processing is working correctly!');
      console.log('   New submissions will now be automatically processed.');
      
    } else {
      console.log('\n⚠️ AUTOMATIC PROCESSING NOT DETECTED');
      console.log('====================================');
      console.log('The submission was created but not automatically processed.');
      console.log('This could be due to:');
      console.log('  • Enhanced parser not found');
      console.log('  • Python environment issues');
      console.log('  • Processing errors');
      console.log('  • Timing issues (processing may still be in progress)');
      
      console.log('\n🔧 Troubleshooting:');
      console.log('  • Check server logs for processing errors');
      console.log('  • Verify enhanced parser is available');
      console.log('  • Check Python environment');
      console.log('  • Try manual processing script');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    } else {
      console.log('❌ Server is not responding');
      return false;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('   Please start the development server: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🔍 Checking server status...');
  const serverRunning = await checkServer();
  
  if (!serverRunning) {
    console.log('\n❌ Cannot test automatic processing - server not running');
    console.log('   Please start the development server and try again');
    return;
  }
  
  console.log('\n🚀 Starting automatic processing test...');
  await testAutomaticProcessing();
  
  console.log('\n🎯 Test Complete!');
  console.log('==================');
  console.log('✅ If automatic processing worked, new submissions will be processed automatically');
  console.log('⚠️ If not, check the server logs and enhanced parser setup');
  console.log('📋 You can also run: node scripts/process-all-submissions.js for manual processing');
}

main();
