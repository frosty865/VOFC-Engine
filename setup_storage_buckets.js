#!/usr/bin/env node

/**
 * Setup Supabase Storage Buckets
 * This script creates the necessary storage buckets for document storage
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupStorageBuckets() {
  console.log('🪣 Setting up Supabase Storage Buckets...\n');
  
  const buckets = [
    {
      name: 'documents',
      description: 'Document submissions for processing',
      public: false,
      fileSizeLimit: 10485760, // 10MB
      allowedMimeTypes: [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ]
    },
    {
      name: 'processed-documents',
      description: 'Processed documents and extracted content',
      public: false,
      fileSizeLimit: 5242880, // 5MB
      allowedMimeTypes: ['application/json', 'text/plain']
    }
  ];
  
  try {
    for (const bucketConfig of buckets) {
      console.log(`📦 Creating bucket: ${bucketConfig.name}`);
      
      // Check if bucket already exists
      const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error(`❌ Error listing buckets: ${listError.message}`);
        continue;
      }
      
      const bucketExists = existingBuckets.some(bucket => bucket.name === bucketConfig.name);
      
      if (bucketExists) {
        console.log(`✅ Bucket '${bucketConfig.name}' already exists`);
        continue;
      }
      
      // Create the bucket
      const { data: bucket, error: createError } = await supabase.storage.createBucket(
        bucketConfig.name,
        {
          public: bucketConfig.public,
          fileSizeLimit: bucketConfig.fileSizeLimit,
          allowedMimeTypes: bucketConfig.allowedMimeTypes
        }
      );
      
      if (createError) {
        console.error(`❌ Error creating bucket '${bucketConfig.name}': ${createError.message}`);
        continue;
      }
      
      console.log(`✅ Created bucket: ${bucketConfig.name}`);
      console.log(`   Description: ${bucketConfig.description}`);
      console.log(`   Public: ${bucketConfig.public}`);
      console.log(`   File size limit: ${bucketConfig.fileSizeLimit} bytes`);
      console.log(`   Allowed MIME types: ${bucketConfig.allowedMimeTypes.join(', ')}`);
      console.log('');
    }
    
    console.log('🎉 Storage buckets setup complete!');
    console.log('\n📋 Next steps:');
    console.log('1. Update the documents API to use Supabase Storage');
    console.log('2. Test document upload functionality');
    console.log('3. Configure RLS policies for bucket access');
    
  } catch (error) {
    console.error('❌ Error setting up storage buckets:', error.message);
  }
}

// Run the setup
setupStorageBuckets();
