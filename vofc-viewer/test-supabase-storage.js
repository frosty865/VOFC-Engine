// test-supabase-storage.js
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

console.log('🔍 Testing Supabase connection...')
const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function testConnection() {
  try {
    // Step 1: List buckets
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
    if (bucketError) throw bucketError
    console.log('🪣 Buckets found:', buckets.map(b => b.name).join(', ') || '(none)')

    // Step 2: Ensure "documents" bucket exists
    const bucketExists = buckets.some(b => b.name === 'documents')
    if (!bucketExists) {
      console.log('⚠️ "documents" bucket not found. Attempting to create...')
      const { error: createError } = await supabase.storage.createBucket('documents', { public: false })
      if (createError) throw createError
      console.log('✅ Bucket "documents" created successfully.')
    } else {
      console.log('✅ "documents" bucket already exists.')
    }

    // Step 3: Upload a small test file
    const testFile = Buffer.from('Hello, Supabase storage test!')
    const testFileName = `test_${Date.now()}.txt`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(testFileName, testFile, { 
        cacheControl: '3600', 
        upsert: false,
        contentType: 'text/plain'
      })

    if (uploadError) throw uploadError
    console.log('📄 Uploaded file successfully:', uploadData.path)

    // Step 4: List uploaded file
    const { data: files, error: listError } = await supabase.storage.from('documents').list('', { limit: 5 })
    if (listError) throw listError
    console.log('📂 Recent files in "documents":', files.map(f => f.name).join(', '))

    // Step 5: Cleanup test file
    await supabase.storage.from('documents').remove([testFileName])
    console.log('🧹 Test file removed successfully.')

    console.log('✅ Supabase storage service role key works correctly.')
  } catch (err) {
    console.error('❌ Supabase storage test failed:')
    console.error(err)
  }
}

testConnection()
