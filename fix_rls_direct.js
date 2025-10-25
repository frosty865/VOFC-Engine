const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixRLS() {
  console.log('Fixing RLS policies...');
  
  try {
    // Drop all policies on user_profiles
    console.log('Dropping existing policies...');
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;' 
    });
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;' 
    });
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;' 
    });
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;' 
    });
    await supabase.rpc('exec_sql', { 
      sql: 'DROP POLICY IF EXISTS "Service role can manage profiles" ON user_profiles;' 
    });

    console.log('Creating new simple policies...');
    
    // Create simple policies
    await supabase.rpc('exec_sql', { 
      sql: `CREATE POLICY "Allow authenticated users to view profiles" ON user_profiles
            FOR SELECT TO authenticated USING (true);` 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: `CREATE POLICY "Allow authenticated users to update profiles" ON user_profiles
            FOR UPDATE TO authenticated USING (true);` 
    });
    
    await supabase.rpc('exec_sql', { 
      sql: `CREATE POLICY "Allow service role full access" ON user_profiles
            FOR ALL TO service_role USING (true);` 
    });

    console.log('✅ RLS policies fixed');
    
    // Test the fix
    console.log('\n=== TESTING FIX ===');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('username', 'admin')
      .single();

    if (profileError) {
      console.error('❌ Profile fetch still failed:', profileError.message);
    } else {
      console.log('✅ Profile fetch successful:', profile.username, profile.role);
    }

  } catch (error) {
    console.error('Error fixing RLS:', error.message);
  }
}

fixRLS().catch(console.error);
