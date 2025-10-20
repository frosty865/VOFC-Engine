const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function createUserProfilesTable() {
  try {
    console.log('Creating user_profiles table...');
    
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        -- Create user_profiles table to store additional user information
        CREATE TABLE IF NOT EXISTS public.user_profiles (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
            username VARCHAR(50) UNIQUE NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'psa',
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            organization VARCHAR(200),
            phone VARCHAR(20),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            created_by UUID REFERENCES auth.users(id),
            UNIQUE(user_id),
            UNIQUE(username)
        );

        -- Create indexes
        CREATE INDEX IF NOT EXISTS user_profiles_user_id_idx ON public.user_profiles(user_id);
        CREATE INDEX IF NOT EXISTS user_profiles_username_idx ON public.user_profiles(username);
        CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);
        CREATE INDEX IF NOT EXISTS user_profiles_active_idx ON public.user_profiles(is_active);

        -- Enable RLS
        ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

        -- Create RLS policies
        CREATE POLICY "Users can view own profile" ON public.user_profiles
            FOR SELECT USING (auth.uid() = user_id);

        CREATE POLICY "Admins and SPSAs can view all profiles" ON public.user_profiles
            FOR SELECT USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles up 
                    WHERE up.user_id = auth.uid() 
                    AND up.role IN ('admin', 'spsa')
                )
            );

        CREATE POLICY "Admins and SPSAs can manage profiles" ON public.user_profiles
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM public.user_profiles up 
                    WHERE up.user_id = auth.uid() 
                    AND up.role IN ('admin', 'spsa')
                )
            );
      `
    });

    if (error) {
      console.error('Error creating table:', error);
      return;
    }

    console.log('✅ user_profiles table created successfully!');
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createUserProfilesTable();


