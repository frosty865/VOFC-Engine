const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: './.env.local' });

console.log('🔍 Testing Supabase API Keys...\n');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('📋 Environment Check:');
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Anon Key Length: ${anonKey ? anonKey.length : 'Missing'}`);
console.log(`   Service Key Length: ${serviceKey ? serviceKey.length : 'Missing'}`);

// Check if keys look like JWT tokens
if (anonKey) {
  const anonParts = anonKey.split('.');
  console.log(`   Anon Key Parts: ${anonParts.length} (should be 3 for JWT)`);
  console.log(`   Anon Key Starts with: ${anonKey.substring(0, 10)}...`);
}

if (serviceKey) {
  const serviceParts = serviceKey.split('.');
  console.log(`   Service Key Parts: ${serviceParts.length} (should be 3 for JWT)`);
  console.log(`   Service Key Starts with: ${serviceKey.substring(0, 10)}...`);
}

// Test with a simple health check
console.log('\n🧪 Testing Supabase Health Check:');

if (supabaseUrl && anonKey) {
  try {
    const supabase = createClient(supabaseUrl, anonKey);
    
    // Try a simple health check
    console.log('   Testing health endpoint...');
    const healthUrl = `${supabaseUrl}/rest/v1/`;
    
    fetch(healthUrl, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`
      }
    })
    .then(response => {
      console.log(`   Health Check Status: ${response.status}`);
      if (response.ok) {
        console.log('   ✅ Supabase is accessible');
      } else {
        console.log(`   ❌ Health check failed: ${response.statusText}`);
      }
    })
    .catch(error => {
      console.log(`   ❌ Health check error: ${error.message}`);
    });
    
  } catch (error) {
    console.log(`   ❌ Connection error: ${error.message}`);
  }
}

// Test the specific project URL format
console.log('\n🔍 URL Analysis:');
if (supabaseUrl) {
  const urlParts = supabaseUrl.split('.');
  console.log(`   URL Parts: ${urlParts.length}`);
  console.log(`   Domain: ${urlParts[1] || 'Unknown'}`);
  console.log(`   Project Ref: ${urlParts[0]?.split('//')[1] || 'Unknown'}`);
  
  // Expected format: https://[project-ref].supabase.co
  if (urlParts.length !== 3 || urlParts[1] !== 'supabase' || urlParts[2] !== 'co') {
    console.log('   ⚠️  URL format might be incorrect');
    console.log('   Expected: https://[project-ref].supabase.co');
  } else {
    console.log('   ✅ URL format looks correct');
  }
}

console.log('\n📋 Recommendations:');
console.log('1. Check your Supabase dashboard for the correct API keys');
console.log('2. Verify the project URL in your Supabase dashboard');
console.log('3. Make sure the keys are not expired');
console.log('4. Check if RLS policies are blocking access');
console.log('5. Try regenerating the API keys in Supabase dashboard');
