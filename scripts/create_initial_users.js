const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.error('Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createInitialUsers() {
  console.log('Creating initial users...\n');
  
  const initialUsers = [
    {
      username: 'admin',
      email: 'admin@vofc.gov',
      password: 'Admin123!',
      role: 'admin',
      first_name: 'System',
      last_name: 'Administrator',
      organization: 'CISA'
    },
    {
      username: 'spsa',
      email: 'spsa@vofc.gov',
      password: 'SPSA123!',
      role: 'spsa',
      first_name: 'SPSA',
      last_name: 'User',
      organization: 'CISA'
    },
    {
      username: 'psa',
      email: 'psa@vofc.gov',
      password: 'PSA123!',
      role: 'psa',
      first_name: 'PSA',
      last_name: 'User',
      organization: 'CISA'
    },
    {
      username: 'analyst',
      email: 'analyst@vofc.gov',
      password: 'Analyst123!',
      role: 'analyst',
      first_name: 'Analyst',
      last_name: 'User',
      organization: 'CISA'
    }
  ];

  for (const userData of initialUsers) {
    try {
      console.log(`Creating user: ${userData.email} (${userData.role})`);
      
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError) {
        console.error(`❌ Error creating auth user for ${userData.email}:`, authError.message);
        continue;
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: authData.user.id,
          username: userData.username,
          role: userData.role,
          first_name: userData.first_name,
          last_name: userData.last_name,
          organization: userData.organization,
          is_active: true
        });

      if (profileError) {
        console.error(`❌ Error creating profile for ${userData.email}:`, profileError.message);
        continue;
      }

      console.log(`✅ Successfully created user: ${userData.email}`);
      
    } catch (error) {
      console.error(`❌ Error creating user ${userData.email}:`, error.message);
    }
  }

  console.log('\nInitial users creation completed!');
  console.log('\nDefault credentials:');
  console.log('Admin: admin / Admin123!');
  console.log('SPSA: spsa / SPSA123!');
  console.log('PSA: psa / PSA123!');
  console.log('Analyst: analyst / Analyst123!');
}

createInitialUsers();
