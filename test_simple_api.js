const https = require('https');

// Test a simple API endpoint without authentication
async function testSimpleAPI() {
  const baseUrl = 'https://vofc-viewer-m80l5kf1b-matthew-frosts-projects-2f4ab76f.vercel.app';
  
  console.log('🧪 Testing Simple API Endpoints...');
  
  // Test endpoints that should work without auth
  const testEndpoints = [
    { path: '/api/health', method: 'GET', description: 'Health check' },
    { path: '/api/auth/login', method: 'POST', description: 'Login endpoint', hasBody: true }
  ];
  
  for (const endpoint of testEndpoints) {
    try {
      console.log(`\n🔍 Testing: ${endpoint.method} ${endpoint.path}`);
      
      const options = {
        method: endpoint.method,
        headers: {
          'Content-Type': 'application/json',
        }
      };
      
      if (endpoint.hasBody) {
        options.body = JSON.stringify({ 
          email: 'test@vofc.gov', 
          password: 'testpass123',
          action: 'signup'
        });
      }
      
      const response = await fetch(`${baseUrl}${endpoint.path}`, options);
      
      console.log(`📊 Status: ${response.status} ${response.statusText}`);
      console.log(`📊 OK: ${response.ok}`);
      
      const responseText = await response.text();
      console.log(`📝 Response length: ${responseText.length}`);
      
      if (responseText.includes('<html>') || responseText.includes('<!DOCTYPE')) {
        console.log('❌ HTML response detected (authentication redirect)');
        console.log('📄 Response preview:', responseText.substring(0, 200));
      } else {
        console.log('✅ JSON response expected');
        try {
          const json = JSON.parse(responseText);
          console.log('📄 JSON keys:', Object.keys(json));
        } catch (e) {
          console.log('❌ Not valid JSON:', e.message);
        }
      }
      
    } catch (error) {
      console.error('❌ Request failed:', error.message);
    }
  }
}

testSimpleAPI().catch(console.error);
