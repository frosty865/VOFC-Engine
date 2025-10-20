const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  console.log('NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl);
  console.log('SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTable() {
  try {
    console.log('Creating submissions table...');
    
    // Create table
    const { error: createError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.submissions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR(20) NOT NULL CHECK (type IN ('vulnerability', 'ofc')),
            data JSONB NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'approved', 'rejected', 'processed')),
            source VARCHAR(50) DEFAULT 'api_submission',
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW(),
            processed_by UUID REFERENCES auth.users(id),
            processed_at TIMESTAMPTZ
        );
      `
    });
    
    if (createError) {
      console.error('Error creating table:', createError);
      return;
    }
    
    // Create indexes
    const { error: indexError } = await supabase.rpc('exec', {
      sql: `
        CREATE INDEX IF NOT EXISTS submissions_type_idx ON public.submissions(type);
        CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions(status);
        CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON public.submissions(created_at);
        CREATE INDEX IF NOT EXISTS submissions_source_idx ON public.submissions(source);
      `
    });
    
    if (indexError) {
      console.error('Error creating indexes:', indexError);
    }
    
    // Enable RLS
    const { error: rlsError } = await supabase.rpc('exec', {
      sql: `ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;`
    });
    
    if (rlsError) {
      console.error('Error enabling RLS:', rlsError);
    }
    
    console.log('Submissions table created successfully!');
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createTable();


