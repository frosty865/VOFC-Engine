// Test script to verify the fixes
const testAuth = async () => {
  console.log('🔐 Testing Authentication Fix...');
  
  try {
    const response = await fetch('/api/auth/verify', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    console.log('Auth status:', response.status);
    
    if (response.status === 401) {
      console.log('❌ Auth still failing - need to check Supabase configuration');
    } else {
      console.log('✅ Auth working properly');
    }
  } catch (error) {
    console.error('Auth test error:', error);
  }
};

const testBatchProcessing = async () => {
  console.log('📦 Testing Batch Processing Fix...');
  
  try {
    const response = await fetch('/api/documents/process-batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filenames: ['test-document.pdf']
      }),
    });
    
    const data = await response.json();
    console.log('Batch processing status:', response.status);
    console.log('Batch processing response:', data);
    
    if (response.status === 500) {
      console.log('❌ Batch processing still failing');
    } else {
      console.log('✅ Batch processing working properly');
    }
  } catch (error) {
    console.error('Batch processing test error:', error);
  }
};

// Run tests
console.log('🧪 Running Fix Verification Tests...');
testAuth();
testBatchProcessing();
