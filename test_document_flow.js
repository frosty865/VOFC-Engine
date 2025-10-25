// Test document processing flow
const testDocumentFlow = async () => {
  console.log('🧪 Testing Document Processing Flow...');
  
  // Test 1: Check if parse-metadata endpoint exists
  try {
    const response = await fetch('https://vofc-viewer-94cyhexxn-matthew-frosts-projects-2f4ab76f.vercel.app/api/documents/parse-metadata', {
      method: 'POST',
      body: new FormData() // Empty form data to test endpoint
    });
    
    console.log('📄 Parse-metadata endpoint status:', response.status);
    if (response.status === 400) {
      console.log('✅ Parse-metadata endpoint exists (returning 400 for missing file - expected)');
    } else {
      console.log('❌ Parse-metadata endpoint issue:', response.status);
    }
  } catch (error) {
    console.log('❌ Parse-metadata endpoint error:', error.message);
  }
  
  // Test 2: Check if submit endpoint exists
  try {
    const response = await fetch('https://vofc-viewer-94cyhexxn-matthew-frosts-projects-2f4ab76f.vercel.app/api/documents/submit', {
      method: 'POST',
      body: new FormData() // Empty form data to test endpoint
    });
    
    console.log('📤 Submit endpoint status:', response.status);
    if (response.status === 400) {
      console.log('✅ Submit endpoint exists (returning 400 for missing data - expected)');
    } else {
      console.log('❌ Submit endpoint issue:', response.status);
    }
  } catch (error) {
    console.log('❌ Submit endpoint error:', error.message);
  }
  
  // Test 3: Check if process endpoint exists
  try {
    const response = await fetch('https://vofc-viewer-94cyhexxn-matthew-frosts-projects-2f4ab76f.vercel.app/api/documents/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: 'test.pdf' })
    });
    
    console.log('⚙️ Process endpoint status:', response.status);
    if (response.status === 404) {
      console.log('✅ Process endpoint exists (returning 404 for missing file - expected)');
    } else {
      console.log('❌ Process endpoint issue:', response.status);
    }
  } catch (error) {
    console.log('❌ Process endpoint error:', error.message);
  }
  
  console.log('🏁 Document flow test completed');
};

// Run the test
testDocumentFlow();
