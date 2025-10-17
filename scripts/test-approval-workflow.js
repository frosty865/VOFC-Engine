// Test the complete approval workflow
const BASE_URL = 'http://localhost:3001';

async function testCompleteWorkflow() {
  try {
    console.log('=== Testing Complete Approval Workflow ===\n');
    
    // 1. Create a test submission
    console.log('1. Creating test submission...');
    const submissionData = {
      type: 'vulnerability',
      data: {
        vulnerability: 'Test vulnerability for approval workflow',
        discipline: 'Test Discipline',
        sector: 'Test Sector',
        source: 'Workflow Test'
      }
    };
    
    const createResponse = await fetch(`${BASE_URL}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(submissionData)
    });
    
    const createResult = await createResponse.json();
    console.log('Create result:', createResult);
    
    if (!createResult.success) {
      console.error('Failed to create submission');
      return;
    }
    
    const submissionId = createResult.submission_id;
    console.log(`✅ Submission created with ID: ${submissionId}\n`);
    
    // 2. Check submission status
    console.log('2. Checking submission status...');
    const statusResponse = await fetch(`${BASE_URL}/api/submissions/${submissionId}`);
    const statusResult = await statusResponse.json();
    console.log('Status result:', statusResult);
    console.log(`✅ Submission status: ${statusResult.submission.status}\n`);
    
    // 3. Test approval (this would normally be done by SPSA in the admin panel)
    console.log('3. Testing approval workflow...');
    const approveResponse = await fetch(`${BASE_URL}/api/submissions/${submissionId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'approve',
        comments: 'Approved by automated test',
        processedBy: '00000000-0000-0000-0000-000000000000'
      })
    });
    
    const approveResult = await approveResponse.json();
    console.log('Approve result:', approveResult);
    
    if (approveResult.success) {
      console.log('✅ Submission approved successfully!');
    } else {
      console.log('❌ Approval failed:', approveResult.error);
    }
    
    // 4. Check final status
    console.log('\n4. Checking final status...');
    const finalStatusResponse = await fetch(`${BASE_URL}/api/submissions/${submissionId}`);
    const finalStatusResult = await finalStatusResponse.json();
    console.log('Final status:', finalStatusResult.submission.status);
    
    // 5. Check health to see if vulnerability was added
    console.log('\n5. Checking database stats...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    const healthResult = await healthResponse.json();
    console.log('Database stats:', healthResult.stats);
    
    console.log('\n=== Workflow Test Complete ===');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testCompleteWorkflow();
