#!/usr/bin/env node

/**
 * Setup Service Role Key for VOFC Engine
 * This script helps you get and configure the service role key
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

console.log('🔑 Setting up Service Role Key');
console.log('===============================\n');

// Check current status
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

console.log('📋 Current environment status:');
console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set');
console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Not set');
console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set');

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n🔧 Service role key is missing. Here\'s how to get it:\n');
  
  console.log('1. 🌐 Go to your Supabase Dashboard:');
  console.log('   https://supabase.com/dashboard\n');
  
  console.log('2. 🔍 Navigate to your project and go to:');
  console.log('   Settings > API\n');
  
  console.log('3. 📋 Copy the "service_role" key (not the anon key)\n');
  
  console.log('4. ✏️  Edit your .env.local file and replace:');
  console.log('   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here');
  console.log('   with your actual service role key\n');
  
  console.log('5. 🧪 Test the setup by running:');
  console.log('   node scripts/test-submission.js\n');
  
  console.log('⚠️  Important: The service role key bypasses RLS policies.');
  console.log('   Keep it secure and never commit it to version control.\n');
  
} else {
  console.log('\n✅ Service role key is configured!');
  console.log('🧪 Testing submission with service role key...\n');
  
  // Test the submission
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  async function testSubmission() {
    try {
      const testData = {
        type: 'vulnerability',
        data: JSON.stringify({
          vulnerability: 'Test vulnerability with service role key',
          discipline: 'Cybersecurity'
        }),
        status: 'pending_review',
        source: 'service_role_test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertData, error: insertError } = await supabase
        .from('submissions')
        .insert([testData])
        .select();
      
      if (insertError) {
        console.error('❌ Test submission failed:', insertError.message);
        console.log('\n🔧 The service role key might be incorrect or expired.');
        console.log('   Please check your Supabase dashboard for the correct key.');
      } else {
        console.log('✅ Test submission successful!');
        console.log('📊 Inserted data:', insertData);
        
        // Clean up test data
        if (insertData && insertData.length > 0) {
          const { error: deleteError } = await supabase
            .from('submissions')
            .delete()
            .eq('id', insertData[0].id);
          
          if (deleteError) {
            console.log('⚠️  Could not clean up test data:', deleteError.message);
          } else {
            console.log('🧹 Test data cleaned up');
          }
        }
        
        console.log('\n🎉 Service role key is working!');
        console.log('🎯 Your submission form should now work properly.');
      }
      
    } catch (error) {
      console.error('❌ Test error:', error.message);
    }
  }
  
  testSubmission();
}
