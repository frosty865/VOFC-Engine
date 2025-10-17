const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkProfiles() {
  try {
    console.log('Checking user profiles...');
    
    const { data: profiles, error } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching profiles:', error.message);
      return;
    }
    
    console.log('✅ Found profiles:', profiles.length);
    profiles.forEach(profile => {
      console.log(`- ${profile.username} (${profile.role}) - User ID: ${profile.user_id}`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

checkProfiles();


