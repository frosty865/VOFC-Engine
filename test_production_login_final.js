const https = require('https');

function testProductionLogin() {
  console.log('Testing production login...');
  
  const postData = JSON.stringify({
    email: 'admin@vofc.gov',
    password: 'Admin123!'
  });

  const options = {
    hostname: 'vofc-viewer-kktn56rjw-matthew-frosts-projects-2f4ab76f.vercel.app',
    port: 443,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('Response:', data);
      
      try {
        const response = JSON.parse(data);
        if (response.success) {
          console.log('✅ LOGIN SUCCESSFUL!');
          console.log('User:', response.user);
        } else {
          console.log('❌ LOGIN FAILED:', response.error);
        }
      } catch (e) {
        console.log('❌ Invalid JSON response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.error('Request error:', e.message);
  });

  req.write(postData);
  req.end();
}

testProductionLogin();
