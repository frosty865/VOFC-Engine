const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSupabasePasswords() {
  const testPasswords = [
    'Admin123!',
    'admin123!',
    'ADMIN123!',
    'Admin123',
    'admin123',
    'SPSA123!',
    'PSA123!',
    'Analyst123!',
    'password',
    'Password123!',
    'Vofc123!',
    'VOFC123!'
  ];
  
  const testEmails = [
    'admin@vofc.gov',
    'spsa@vofc.gov',
    'psa@vofc.gov',
    'analyst@vofc.gov'
  ];
  
  console.log('🔐 Testing Supabase Auth credentials...\n');
  
  for (const email of testEmails) {
    console.log(`\n📧 Testing email: ${email}`);
    console.log('─'.repeat(50));
    
    for (const password of testPasswords) {
      try {
        console.log(`   Testing password: "${password}"`);
        
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email,
          password: password
        });
        
        if (error) {
          console.log(`   ❌ Failed: ${error.message}`);
        } else {
          console.log(`   ✅ SUCCESS! Email: ${email}, Password: "${password}"`);
          console.log(`   User ID: ${data.user?.id}`);
          console.log(`   Email: ${data.user?.email}`);
          return; // Stop on first success
        }
      } catch (err) {
        console.log(`   ❌ Error: ${err.message}`);
      }
    }
  }
  
  console.log('\n❌ No valid credentials found');
}

testSupabasePasswords().catch(console.error);
