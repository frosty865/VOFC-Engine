// Test script to verify MIME type fix
const testJSONUpload = async () => {
  console.log('🧪 Testing JSON Upload Fix...');
  
  try {
    // Test the process endpoint with a sample document
    const response = await fetch('/api/documents/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: 'test-document.pdf'
      }),
    });
    
    const data = await response.json();
    console.log('Process endpoint status:', response.status);
    console.log('Process endpoint response:', data);
    
    if (response.status === 500 && data.error?.includes('mime type')) {
      console.log('❌ MIME type error still present');
    } else if (response.status === 200) {
      console.log('✅ JSON upload working properly');
    } else {
      console.log('⚠️ Different error:', data.error);
    }
  } catch (error) {
    console.error('Test error:', error);
  }
};

const testVOFCProcessing = async () => {
  console.log('🧪 Testing VOFC Processing Fix...');
  
  try {
    // Test the process-vofc endpoint
    const response = await fetch('/api/documents/process-vofc', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: 'test-document.pdf'
      }),
    });
    
    const data = await response.json();
    console.log('VOFC process endpoint status:', response.status);
    console.log('VOFC process endpoint response:', data);
    
    if (response.status === 500 && data.message?.includes('mime type')) {
      console.log('❌ MIME type error still present in VOFC processing');
    } else if (response.status === 200) {
      console.log('✅ VOFC JSON upload working properly');
    } else {
      console.log('⚠️ Different error:', data.message);
    }
  } catch (error) {
    console.error('VOFC test error:', error);
  }
};

// Run tests
console.log('🔧 Running MIME Type Fix Verification...');
testJSONUpload();
testVOFCProcessing();
