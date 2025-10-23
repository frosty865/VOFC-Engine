#!/usr/bin/env node

/**
 * Test submission after RLS fix
 * This script tests if submissions are working after fixing RLS policies
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

console.log('🧪 Testing submission after RLS fix...');
console.log('=====================================\n');

// Create Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function testSubmission() {
  try {
    console.log('📝 Testing submission insert...');
    
    const testData = {
      type: 'vulnerability',
      data: JSON.stringify({
        vulnerability: 'Test vulnerability after RLS fix',
        discipline: 'Cybersecurity',
        sector: 'Critical Infrastructure'
      }),
      status: 'pending_review',
      source: 'api_test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('submissions')
      .insert([testData])
      .select();
    
    if (insertError) {
      console.error('❌ Submission test failed:', insertError.message);
      console.log('\n🔧 RLS policies still need to be fixed.');
      console.log('   Run: node scripts/manual-rls-fix.js for instructions.');
      return false;
    } else {
      console.log('✅ Submission test successful!');
      console.log('📊 Inserted data:', insertData);
      
      // Clean up test data
      if (insertData && insertData.length > 0) {
        const { error: deleteError } = await supabase
          .from('submissions')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.log('⚠️  Could not clean up test data:', deleteError.message);
        } else {
          console.log('🧹 Test data cleaned up');
        }
      }
      
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
    return false;
  }
}

async function testAPIEndpoint() {
  try {
    console.log('\n🌐 Testing API endpoint...');
    
    const http = require('http');
    
    const postData = JSON.stringify({
      type: 'vulnerability',
      data: {
        vulnerability: 'Test vulnerability via API',
        discipline: 'Cybersecurity'
      },
      submitterEmail: 'test@example.com',
      submitted_by: 'test-user-123'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/submissions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    return new Promise((resolve) => {
      const req = http.request(options, (res) => {
        console.log('📡 API Status:', res.statusCode);
        
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        
        res.on('end', () => {
          console.log('📄 API Response:', data);
          
          if (res.statusCode === 201) {
            console.log('✅ API endpoint working!');
            resolve(true);
          } else {
            console.log('❌ API endpoint failed');
            resolve(false);
          }
        });
      });
      
      req.on('error', (e) => {
        console.error('❌ API request error:', e.message);
        resolve(false);
      });
      
      req.write(postData);
      req.end();
    });
    
  } catch (error) {
    console.error('❌ API test error:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Running submission tests...\n');
  
  const directTest = await testSubmission();
  const apiTest = await testAPIEndpoint();
  
  console.log('\n📊 Test Results:');
  console.log('================');
  console.log('Direct database test:', directTest ? '✅ PASS' : '❌ FAIL');
  console.log('API endpoint test:', apiTest ? '✅ PASS' : '❌ FAIL');
  
  if (directTest && apiTest) {
    console.log('\n🎉 All tests passed! Submissions are working properly.');
    console.log('🎯 You can now use the submission form at http://localhost:3000/submit');
  } else {
    console.log('\n⚠️  Some tests failed. Check the RLS policies in your Supabase dashboard.');
    console.log('📋 Run: node scripts/manual-rls-fix.js for detailed instructions.');
  }
}

// Run the tests
runTests();
