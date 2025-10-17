const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function confirmUsers() {
  try {
    console.log('Confirming users...');
    
    // Get all users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log('Found users:', users.users.length);
    
    // Confirm each user
    for (const user of users.users) {
      console.log(`Confirming user: ${user.email}`);
      
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true
      });
      
      if (error) {
        console.error(`❌ Error confirming ${user.email}:`, error.message);
      } else {
        console.log(`✅ Confirmed ${user.email}`);
      }
    }
    
    console.log('User confirmation completed!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

confirmUsers();


