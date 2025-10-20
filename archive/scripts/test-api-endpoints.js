// Using built-in fetch (Node.js 18+)

const BASE_URL = 'http://localhost:3001';

async function testHealthEndpoint() {
  try {
    console.log('Testing GET /api/health...');
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    console.log('Health check response:', data);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return false;
  }
}

async function testSubmissionEndpoint() {
  try {
    console.log('Testing POST /api/submissions...');
    const submissionData = {
      type: 'vulnerability',
      data: {
        vulnerability: 'Test vulnerability from API',
        discipline: 'Test Discipline',
        sector: 'Test Sector',
        source: 'API Test'
      }
    };
    
    const response = await fetch(`${BASE_URL}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    });
    
    const data = await response.json();
    console.log('Submission response:', data);
    
    if (response.ok && data.submission_id) {
      return data.submission_id;
    }
    return null;
  } catch (error) {
    console.error('Submission test failed:', error.message);
    return null;
  }
}

async function testSubmissionStatusEndpoint(submissionId) {
  if (!submissionId) {
    console.log('No submission ID to test status endpoint');
    return false;
  }
  
  try {
    console.log(`Testing GET /api/submissions/${submissionId}...`);
    const response = await fetch(`${BASE_URL}/api/submissions/${submissionId}`);
    const data = await response.json();
    console.log('Submission status response:', data);
    return response.ok;
  } catch (error) {
    console.error('Submission status test failed:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Starting API endpoint tests...\n');
  
  const healthOk = await testHealthEndpoint();
  console.log(`Health endpoint: ${healthOk ? 'PASS' : 'FAIL'}\n`);
  
  const submissionId = await testSubmissionEndpoint();
  console.log(`Submission endpoint: ${submissionId ? 'PASS' : 'FAIL'}\n`);
  
  const statusOk = await testSubmissionStatusEndpoint(submissionId);
  console.log(`Submission status endpoint: ${statusOk ? 'PASS' : 'FAIL'}\n`);
  
  console.log('API endpoint tests completed!');
}

runTests();
