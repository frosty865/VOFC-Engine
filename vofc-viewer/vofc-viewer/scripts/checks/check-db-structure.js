const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Set' : 'Missing');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Checking database structure...\n');
    
    // Check if vofc_users table exists
    console.log('1. Checking vofc_users table...');
    const { data: users, error: usersError } = await supabase
      .from('vofc_users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ vofc_users table error:', usersError.message);
      
      // Check if it's a "relation does not exist" error
      if (usersError.message.includes('relation "vofc_users" does not exist')) {
        console.log('   → The vofc_users table does not exist in the database');
        console.log('   → This explains why authentication is failing');
        return;
      }
    } else {
      console.log('✅ vofc_users table exists');
      console.log('   → Found', users.length, 'user(s)');
      if (users.length > 0) {
        console.log('   → Sample user:', users[0]);
      }
    }
    
    // Check what tables do exist
    console.log('\n2. Checking what tables exist...');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .order('table_name');
    
    if (tablesError) {
      console.log('❌ Error checking tables:', tablesError.message);
    } else {
      console.log('✅ Available tables:');
      tables.forEach(table => {
        console.log('   →', table.table_name);
      });
    }
    
    // Check if there are any auth-related tables
    console.log('\n3. Checking for auth-related tables...');
    const authTables = tables?.filter(t => 
      t.table_name.includes('auth') || 
      t.table_name.includes('user') || 
      t.table_name.includes('session')
    );
    
    if (authTables && authTables.length > 0) {
      console.log('✅ Found auth-related tables:');
      authTables.forEach(table => {
        console.log('   →', table.table_name);
      });
    } else {
      console.log('❌ No auth-related tables found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkDatabaseStructure();
