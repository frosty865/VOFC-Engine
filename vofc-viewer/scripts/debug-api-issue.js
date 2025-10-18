const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

console.log('🔍 Debugging API Issue...\n');

// Check different environment file locations
const envPaths = [
  './.env',
  '../.env',
  './.env.local',
  '../.env.local'
];

console.log('📁 Checking for environment files:');
for (const envPath of envPaths) {
  const fullPath = path.resolve(envPath);
  const exists = fs.existsSync(fullPath);
  console.log(`   ${exists ? '✅' : '❌'} ${fullPath}`);
  
  if (exists) {
    require('dotenv').config({ path: envPath });
    console.log(`   📋 Loaded from: ${envPath}`);
  }
}

console.log('\n🔑 Environment Variables:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log(`   URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
}

if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log(`   Anon Key: ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`);
}

if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log(`   Service Key: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 20)}...`);
}

// Test connection with different key combinations
console.log('\n🧪 Testing Supabase Connections:');

// Test 1: Anon Key
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.log('\n📋 Test 1: Using Anon Key');
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  testConnection(supabaseAnon, 'Anon Key');
}

// Test 2: Service Role Key
if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n📋 Test 2: Using Service Role Key');
  const supabaseService = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  testConnection(supabaseService, 'Service Role Key');
}

async function testConnection(supabase, keyType) {
  try {
    console.log(`   Testing ${keyType} connection...`);
    
    // Test 1: Simple table query
    const { data, error } = await supabase
      .from('vofc_users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ ${keyType} Error: ${error.message}`);
      console.log(`   📋 Error Code: ${error.code}`);
      console.log(`   📋 Error Details: ${error.details}`);
      console.log(`   📋 Error Hint: ${error.hint}`);
    } else {
      console.log(`   ✅ ${keyType} Success: Found ${data ? data.length : 0} users`);
    }
    
    // Test 2: Check if we can access other tables
    const tables = ['questions', 'assessment_questions', 'vulnerabilities', 'options_for_consideration'];
    
    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table)
          .select('*')
          .limit(1);
        
        if (tableError) {
          console.log(`   📋 ${table}: ${tableError.message} (${tableError.code})`);
        } else {
          console.log(`   ✅ ${table}: Accessible (${tableData ? tableData.length : 0} records)`);
        }
      } catch (err) {
        console.log(`   ❌ ${table}: ${err.message}`);
      }
    }
    
  } catch (error) {
    console.log(`   ❌ ${keyType} Connection Error: ${error.message}`);
  }
}
