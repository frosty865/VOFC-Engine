// Enhanced error handling for document processing
// This script helps diagnose and fix upload/processing issues

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testDocumentProcessing() {
  console.log('🧪 Testing Document Processing Pipeline...\n');

  try {
    // Step 1: Test PDF upload to documents bucket
    console.log('1️⃣ Testing PDF upload to documents bucket...');
    const testPdfName = `test-document-${Date.now()}.pdf`;
    const testPdfContent = Buffer.from('Test PDF content for processing');
    
    const { data: pdfUpload, error: pdfError } = await supabase.storage
      .from('documents')
      .upload(testPdfName, testPdfContent, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (pdfError) {
      console.error('❌ PDF upload failed:', pdfError);
      return;
    }
    console.log('✅ PDF uploaded successfully:', pdfUpload.path);

    // Step 2: Test JSON upload to Parsed bucket
    console.log('\n2️⃣ Testing JSON upload to Parsed bucket...');
    const testJsonName = `test-result-${Date.now()}.json`;
    const testJsonContent = JSON.stringify({
      vulnerabilities: [
        { id: 'test-1', text: 'Test vulnerability', discipline: 'General', source: 'Test' }
      ],
      options_for_consideration: [
        { id: 'test-ofc-1', text: 'Test OFC', discipline: 'General', source: 'Test' }
      ]
    });
    
    const { data: jsonUpload, error: jsonError } = await supabase.storage
      .from('Parsed')
      .upload(testJsonName, Buffer.from(testJsonContent, 'utf8'), {
        contentType: 'application/json',
        cacheControl: '3600'
      });

    if (jsonError) {
      console.error('❌ JSON upload failed:', jsonError);
      console.log('\n🔧 Possible fixes:');
      console.log('1. Check if Parsed bucket exists');
      console.log('2. Verify bucket permissions');
      console.log('3. Ensure RLS policies allow service role uploads');
    } else {
      console.log('✅ JSON uploaded successfully:', jsonUpload.path);
    }

    // Step 3: Test the actual processing API
    console.log('\n3️⃣ Testing document processing API...');
    try {
      const response = await fetch('/api/documents/process-vofc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fileName: testPdfName
        })
      });

      const result = await response.json();
      
      if (response.ok) {
        console.log('✅ Processing API successful:', result);
      } else {
        console.error('❌ Processing API failed:', result);
      }
    } catch (apiError) {
      console.error('❌ Processing API error:', apiError.message);
    }

    // Cleanup
    console.log('\n🧹 Cleaning up test files...');
    await supabase.storage.from('documents').remove([testPdfName]);
    if (!jsonError) {
      await supabase.storage.from('Parsed').remove([testJsonName]);
    }
    console.log('✅ Cleanup completed');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testDocumentProcessing();
