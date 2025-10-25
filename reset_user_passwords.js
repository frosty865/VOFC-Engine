const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetUserPasswords() {
  console.log('Resetting user passwords...');
  
  const users = [
    'admin@vofc.gov',
    'spsa@vofc.gov', 
    'psa@vofc.gov',
    'analyst@vofc.gov'
  ];

  for (const email of users) {
    try {
      console.log(`Resetting password for: ${email}`);
      
      // Get the user first
      const { data: userData, error: getUserError } = await supabase.auth.admin.getUserByEmail(email);
      
      if (getUserError) {
        console.error(`Error getting user ${email}:`, getUserError.message);
        continue;
      }

      if (!userData.user) {
        console.error(`User not found: ${email}`);
        continue;
      }

      // Update the user's password
      const { data, error } = await supabase.auth.admin.updateUserById(
        userData.user.id,
        {
          password: 'Admin123!',
          email_confirm: true
        }
      );

      if (error) {
        console.error(`Error updating password for ${email}:`, error.message);
      } else {
        console.log(`✅ Password reset for ${email}`);
      }
    } catch (err) {
      console.error(`Exception resetting ${email}:`, err.message);
    }
  }

  // Test login for one user
  console.log('\n=== TESTING LOGIN ===');
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });

    if (error) {
      console.error('Login test failed:', error.message);
    } else {
      console.log('✅ Login test successful:', data.user.email);
    }
  } catch (err) {
    console.error('Login test exception:', err.message);
  }
}

resetUserPasswords().catch(console.error);
