require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function testBucketUpload() {
  try {
    console.log('🧪 Testing bucket upload with different approaches...\n');
    
    const testData = 'Test document content for processing';
    const buffer = Buffer.from(testData, 'utf8');
    
    // Test 1: Upload to processed-documents bucket
    console.log('1️⃣ Testing processed-documents bucket...');
    const { error: processedError } = await supabase.storage
      .from('processed-documents')
      .upload('test-document.txt', buffer, {
        contentType: 'text/plain'
      });
    
    if (processedError) {
      console.log('❌ processed-documents failed:', processedError.message);
    } else {
      console.log('✅ processed-documents succeeded');
    }
    
    // Test 2: Upload to Parsed bucket
    console.log('\n2️⃣ Testing Parsed bucket...');
    const { error: parsedError } = await supabase.storage
      .from('Parsed')
      .upload('test-document.txt', buffer, {
        contentType: 'text/plain'
      });
    
    if (parsedError) {
      console.log('❌ Parsed failed:', parsedError.message);
    } else {
      console.log('✅ Parsed succeeded');
    }
    
    // Test 3: Upload to documents bucket
    console.log('\n3️⃣ Testing documents bucket...');
    const { error: documentsError } = await supabase.storage
      .from('documents')
      .upload('test-document.txt', buffer, {
        contentType: 'text/plain'
      });
    
    if (documentsError) {
      console.log('❌ documents failed:', documentsError.message);
    } else {
      console.log('✅ documents succeeded');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testBucketUpload();
