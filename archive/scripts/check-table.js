#!/usr/bin/env node
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTable() {
  console.log('🔍 Checking vofc_users table structure...\n');
  
  try {
    // Try to get table info
    const { data, error } = await supabase
      .from('vofc_users')
      .select('*', { head: true, count: 'exact' });
    
    if (error) {
      console.error('❌ Error accessing table:', error);
      return;
    }
    
    console.log('✅ Table exists and is accessible');
    console.log(`📊 Current record count: ${data?.length || 0}`);
    
    // Try to get one record to see the structure
    const { data: sampleData, error: sampleError } = await supabase
      .from('vofc_users')
      .select('*')
      .limit(1);
    
    if (sampleError) {
      console.error('❌ Error getting sample data:', sampleError);
    } else if (sampleData && sampleData.length > 0) {
      console.log('📋 Sample record structure:');
      console.log(JSON.stringify(sampleData[0], null, 2));
    } else {
      console.log('📋 Table is empty - no sample data available');
    }
    
    // Try to insert a test record without agency
    console.log('\n🧪 Testing insert without agency column...');
    const testUser = {
      username: 'test_user',
      password_hash: 'test_hash',
      full_name: 'Test User',
      role: 'admin'
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('vofc_users')
      .insert([testUser])
      .select();
    
    if (insertError) {
      console.error('❌ Insert error:', insertError);
    } else {
      console.log('✅ Insert successful:', insertData);
      
      // Clean up test record
      const { error: deleteError } = await supabase
        .from('vofc_users')
        .delete()
        .eq('username', 'test_user');
      
      if (deleteError) {
        console.log('⚠️  Could not clean up test record:', deleteError);
      } else {
        console.log('🧹 Test record cleaned up');
      }
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message);
  }
}

checkTable().catch(console.error);

