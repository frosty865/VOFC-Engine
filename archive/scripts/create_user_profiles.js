const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserProfiles() {
  try {
    console.log('Creating user profiles for existing users...');
    
    // Get existing auth users
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }
    
    console.log('Found users:', users.users.length);
    
    // Create profiles for each user
    for (const user of users.users) {
      const email = user.email;
      let username, role;
      
      if (email === 'admin@vofc.gov') {
        username = 'admin';
        role = 'admin';
      } else if (email === 'spsa@vofc.gov') {
        username = 'spsa';
        role = 'spsa';
      } else if (email === 'psa@vofc.gov') {
        username = 'psa';
        role = 'psa';
      } else if (email === 'analyst@vofc.gov') {
        username = 'analyst';
        role = 'analyst';
      } else {
        continue; // Skip other users
      }
      
      console.log(`Creating profile for ${username} (${email})`);
      
      const { data, error } = await supabase
        .from('user_profiles')
        .insert({
          user_id: user.id,
          username: username,
          role: role,
          first_name: username.charAt(0).toUpperCase() + username.slice(1),
          last_name: 'User',
          organization: 'CISA',
          is_active: true
        });
      
      if (error) {
        console.error(`❌ Error creating profile for ${username}:`, error.message);
      } else {
        console.log(`✅ Created profile for ${username}`);
      }
    }
    
    console.log('User profiles creation completed!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createUserProfiles();


