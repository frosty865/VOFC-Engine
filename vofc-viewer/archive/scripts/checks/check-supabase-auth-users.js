const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSupabaseAuthUsers() {
  try {
    console.log('🔍 Checking Supabase Auth users...\n');
    
    // List all users in Supabase Auth
    const { data: users, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return;
    }
    
    console.log(`✅ Found ${users.users.length} user(s) in Supabase Auth:\n`);
    
    users.users.forEach((user, index) => {
      console.log(`${index + 1}. User:`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.email}`);
      console.log(`   - Email Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'}`);
      console.log(`   - Created: ${user.created_at}`);
      console.log(`   - Last Sign In: ${user.last_sign_in_at || 'Never'}`);
      console.log(`   - Role: ${user.role || 'No role set'}`);
      console.log('');
    });
    
    // Check if there are any users with common email patterns
    const commonEmails = [
      'admin@vofc.gov',
      'admin@vofc.com',
      'spsa@vofc.gov',
      'spsa@vofc.com',
      'test@vofc.gov',
      'test@vofc.com'
    ];
    
    console.log('🔍 Checking for common email patterns...');
    const foundEmails = users.users.map(u => u.email).filter(email => 
      commonEmails.some(pattern => email.includes(pattern.split('@')[0]))
    );
    
    if (foundEmails.length > 0) {
      console.log('✅ Found users with common patterns:');
      foundEmails.forEach(email => console.log(`   - ${email}`));
    } else {
      console.log('❌ No users found with common email patterns');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkSupabaseAuthUsers();
