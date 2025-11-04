// Storage bucket diagnostic script
// Run this to check if storage buckets are properly configured

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function diagnoseStorageBuckets() {
  console.log('🔍 Diagnosing Supabase Storage Buckets...\n');

  try {
    // Check if buckets exist
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError);
      return;
    }

    console.log('📦 Available buckets:');
    buckets.forEach(bucket => {
      console.log(`  - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
    });

    // Check required buckets
    const requiredBuckets = ['documents', 'Parsed', 'processed-documents'];
    const existingBuckets = buckets.map(b => b.name);
    
    console.log('\n🔍 Checking required buckets:');
    requiredBuckets.forEach(bucketName => {
      if (existingBuckets.includes(bucketName)) {
        console.log(`  ✅ ${bucketName} - exists`);
      } else {
        console.log(`  ❌ ${bucketName} - missing`);
      }
    });

    // Test file upload to documents bucket
    console.log('\n🧪 Testing file upload to documents bucket...');
    const testFileName = `test-${Date.now()}.pdf`;
    const testContent = Buffer.from('Test PDF content');
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testContent, {
        contentType: 'application/pdf',
        cacheControl: '3600'
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError);
    } else {
      console.log('✅ Upload test successful:', uploadData.path);
      
      // Clean up test file
      await supabase.storage.from('documents').remove([testFileName]);
      console.log('🧹 Test file cleaned up');
    }

    // Test JSON upload to Parsed bucket
    console.log('\n🧪 Testing JSON upload to Parsed bucket...');
    const testJsonFileName = `test-${Date.now()}.json`;
    const testJsonContent = JSON.stringify({ test: 'data' });
    
    const { data: jsonUploadData, error: jsonUploadError } = await supabase.storage
      .from('Parsed')
      .upload(testJsonFileName, Buffer.from(testJsonContent, 'utf8'), {
        contentType: 'application/json',
        cacheControl: '3600'
      });

    if (jsonUploadError) {
      console.error('❌ JSON upload test failed:', jsonUploadError);
    } else {
      console.log('✅ JSON upload test successful:', jsonUploadData.path);
      
      // Clean up test file
      await supabase.storage.from('Parsed').remove([testJsonFileName]);
      console.log('🧹 Test JSON file cleaned up');
    }

    // Check bucket policies
    console.log('\n🔒 Checking bucket policies...');
    const { data: policies, error: policiesError } = await supabase.rpc('get_storage_policies');
    
    if (policiesError) {
      console.log('⚠️ Could not retrieve policies (this is normal if RLS is not enabled)');
    } else {
      console.log('📋 Storage policies:', policies);
    }

  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

// Run diagnostics
diagnoseStorageBuckets();
