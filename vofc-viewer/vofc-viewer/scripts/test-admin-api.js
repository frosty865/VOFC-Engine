#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });

console.log('🔍 Testing Admin API Endpoint...');
console.log('================================\n');

async function testAdminAPI() {
  console.log('🧪 Testing /api/admin/submissions endpoint...');
  
  try {
    const response = await fetch('http://localhost:3001/api/admin/submissions');
    
    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers: ${response.headers.get('content-type')}`);
    
    const responseText = await response.text();
    console.log(`📊 Response Length: ${responseText.length} characters`);
    
    if (response.headers.get('content-type')?.includes('application/json')) {
      console.log('✅ Response is JSON');
      try {
        const data = JSON.parse(responseText);
        console.log('✅ JSON parsing successful');
        console.log(`📋 Data structure:`, Object.keys(data));
        
        if (data.success) {
          console.log('✅ API returned success');
          console.log(`📊 Vulnerability submissions: ${data.vulnerabilitySubmissions?.length || 0}`);
          console.log(`📊 OFC submissions: ${data.ofcSubmissions?.length || 0}`);
          console.log(`📊 Total submissions: ${data.allSubmissions?.length || 0}`);
        } else {
          console.log('❌ API returned error:', data.error);
        }
      } catch (parseError) {
        console.log('❌ JSON parsing failed:', parseError.message);
        console.log('📄 Response preview:', responseText.substring(0, 200));
      }
    } else {
      console.log('❌ Response is not JSON');
      console.log('📄 Response preview:', responseText.substring(0, 200));
      
      if (responseText.includes('<!DOCTYPE')) {
        console.log('🔍 This is an HTML error page (likely 404 or server error)');
      }
    }
    
  } catch (error) {
    console.log('❌ Network error:', error.message);
    console.log('💡 Make sure the Next.js dev server is running: npm run dev');
  }
}

async function testServerHealth() {
  console.log('\n🏥 Testing server health...');
  
  try {
    const response = await fetch('http://localhost:3001/api/health');
    if (response.ok) {
      console.log('✅ Health endpoint working');
    } else {
      console.log('❌ Health endpoint failed:', response.status);
    }
  } catch (error) {
    console.log('❌ Cannot reach server:', error.message);
    console.log('💡 Start the server with: npm run dev');
  }
}

async function main() {
  console.log('🚀 Starting admin API test...\n');
  
  await testServerHealth();
  await testAdminAPI();
  
  console.log('\n🎯 Test Complete!');
  console.log('================');
  console.log('If the API is not working:');
  console.log('1. Start the dev server: npm run dev');
  console.log('2. Check for any build errors');
  console.log('3. Verify environment variables are set');
  console.log('4. Check the browser console for errors');
}

main().catch(console.error);
