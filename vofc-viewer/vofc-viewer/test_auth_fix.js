const https = require('https');
const http = require('http');

// Test the authentication endpoint
async function testAuth() {
  const baseUrl = 'https://vofc-viewer-m80l5kf1b-matthew-frosts-projects-2f4ab76f.vercel.app';
  
  console.log('🧪 Testing Authentication Endpoint...');
  console.log('📍 URL:', `${baseUrl}/api/auth/login`);
  
  const testData = {
    email: 'testuser@vofc.gov',
    password: 'testpass123',
    action: 'signup'
  };
  
  console.log('📝 Test data:', testData);
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📊 Response status:', response.status);
    console.log('📊 Response ok:', response.ok);
    
    const responseText = await response.text();
    console.log('📝 Raw response:', responseText);
    
    if (responseText.trim() === '') {
      console.log('❌ Empty response received');
      return;
    }
    
    try {
      const result = JSON.parse(responseText);
      console.log('✅ JSON parsed successfully:', result);
    } catch (jsonError) {
      console.log('❌ JSON parsing failed:', jsonError.message);
      console.log('📝 Response was:', responseText);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test
testAuth();
