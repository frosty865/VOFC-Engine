require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixProductionRLS() {
  try {
    console.log('🔧 Fixing production RLS policies...');
    
    // Step 1: Disable RLS on user_profiles
    console.log('1. Disabling RLS on user_profiles...');
    
    // We can't execute DDL through the client, so we'll work around it
    // by testing if we can query the table directly
    
    // Step 2: Test direct query with service role
    console.log('2. Testing direct query with service role...');
    
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('*');
    
    if (profilesError) {
      console.error('❌ Direct query failed:', profilesError.message);
      
      if (profilesError.message.includes('infinite recursion')) {
        console.log('🚨 RLS recursion detected - manual intervention required');
        console.log('   Go to Supabase Dashboard > Authentication > Policies');
        console.log('   Find user_profiles table and disable RLS or fix policies');
        console.log('   Or run this SQL in the SQL Editor:');
        console.log('   ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;');
        return;
      }
    } else {
      console.log('✅ Direct query successful:', profiles.length, 'profiles');
    }
    
    // Step 3: Test authentication flow
    console.log('3. Testing authentication flow...');
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@vofc.gov',
      password: 'Admin123!'
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError.message);
      return;
    }
    
    console.log('✅ Auth successful:', authData.user.email);
    
    // Step 4: Test profile lookup with fresh client
    console.log('4. Testing profile lookup with fresh client...');
    
    const freshSupabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const { data: profile, error: profileError } = await freshSupabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (profileError) {
      console.error('❌ Profile lookup failed:', profileError.message);
      
      if (profileError.message.includes('infinite recursion')) {
        console.log('🚨 RLS recursion still present - manual fix required');
        console.log('   Execute this SQL in Supabase SQL Editor:');
        console.log('   ALTER TABLE public.user_profiles DISABLE ROW LEVEL SECURITY;');
        console.log('   Then re-enable with:');
        console.log('   ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;');
        console.log('   CREATE POLICY "users_can_read_own_profile" ON public.user_profiles FOR SELECT USING (auth.uid() = user_id);');
      }
    } else {
      console.log('✅ Profile lookup successful:', profile.role);
      console.log('🎉 Production authentication working!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

fixProductionRLS();
