const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUserPasswords() {
  try {
    console.log('Testing different password combinations...\n');
    
    const testPasswords = [
      'Admin123!',
      'admin123!',
      'ADMIN123!',
      'Admin123',
      'admin123',
      'Admin123!',
      'SPSA123!',
      'PSA123!',
      'Analyst123!'
    ];
    
    for (const password of testPasswords) {
      console.log(`Testing password: "${password}"`);
      
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: 'admin@vofc.gov',
          password: password
        });
        
        if (error) {
          console.log(`❌ Failed: ${error.message}`);
        } else {
          console.log(`✅ SUCCESS with password: "${password}"`);
          console.log(`User: ${data.user?.email}`);
          break;
        }
      } catch (err) {
        console.log(`❌ Error: ${err.message}`);
      }
    }
    
    console.log('\nTesting with service key to check user status...');
    
    // Get user details with service key
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    const adminUser = users.users.find(u => u.email === 'admin@vofc.gov');
    if (adminUser) {
      console.log('Admin user found:');
      console.log('- Email:', adminUser.email);
      console.log('- Email confirmed:', adminUser.email_confirmed_at ? 'Yes' : 'No');
      console.log('- Created at:', adminUser.created_at);
      console.log('- Last sign in:', adminUser.last_sign_in_at);
    } else {
      console.log('Admin user not found!');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserPasswords();


