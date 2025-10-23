// Test script to check OFC sources
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSources() {
  console.log('🔍 Testing OFC sources...');
  
  // Test 1: Check if ofc_sources table exists
  try {
    const { data: sources, error } = await supabase
      .from('ofc_sources')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('❌ ofc_sources table error:', error.message);
    } else {
      console.log('✅ ofc_sources table exists:', sources.length, 'records');
      console.log('Sample sources:', sources);
    }
  } catch (err) {
    console.error('❌ ofc_sources table not accessible:', err.message);
  }
  
  // Test 2: Check options_for_consideration table
  try {
    const { data: ofcs, error } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ options_for_consideration table error:', error.message);
    } else {
      console.log('✅ options_for_consideration table exists:', ofcs.length, 'records');
      console.log('Sample OFCs:', ofcs.map(o => ({ id: o.id, option_text: o.option_text?.substring(0, 50) })));
    }
  } catch (err) {
    console.error('❌ options_for_consideration table not accessible:', err.message);
  }
  
  // Test 3: Check if sources table exists
  try {
    const { data: sources, error } = await supabase
      .from('sources')
      .select('*')
      .limit(3);
    
    if (error) {
      console.error('❌ sources table error:', error.message);
    } else {
      console.log('✅ sources table exists:', sources.length, 'records');
      console.log('Sample sources:', sources);
    }
  } catch (err) {
    console.error('❌ sources table not accessible:', err.message);
  }
}

testSources();














