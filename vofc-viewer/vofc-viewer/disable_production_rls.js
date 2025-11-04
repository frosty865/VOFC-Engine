require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function disableProductionRLS() {
  try {
    console.log('🔧 Disabling RLS on production user_profiles table...');
    
    // Since we can't execute DDL through the client, we need to provide the SQL
    // for manual execution in the Supabase dashboard
    
    console.log('📋 MANUAL STEPS REQUIRED:');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Execute this SQL:');
    console.log('');
    console.log('-- Disable RLS on user_profiles');
    console.log('ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;');
    console.log('');
    console.log('-- Drop all existing policies');
    console.log('DROP POLICY IF EXISTS "users_can_read_own_profile" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "admin_can_read_all_profiles" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "admin_can_update_all_profiles" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "admin_can_insert_profiles" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_select_policy" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_insert_policy" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_update_policy" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_delete_policy" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_admin_policy" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_self_policy" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_authenticated_policy" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_own_read" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_own_update" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_admin_read" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_admin_update" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_admin_insert" ON public.user_profiles;');
    console.log('DROP POLICY IF EXISTS "user_profiles_admin_delete" ON public.user_profiles;');
    console.log('');
    console.log('-- Re-enable RLS with simple policy');
    console.log('ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;');
    console.log('CREATE POLICY "allow_all_authenticated" ON public.user_profiles FOR ALL USING (auth.role() = \'authenticated\');');
    console.log('');
    console.log('4. After executing the SQL, test the login again');
    
    // Test current state
    console.log('\n🧪 Testing current state...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Current query failed:', profilesError.message);
      if (profilesError.message.includes('infinite recursion')) {
        console.log('🚨 RLS recursion confirmed - manual fix required');
      }
    } else {
      console.log('✅ Current query successful:', profiles.length, 'profiles');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

disableProductionRLS();
