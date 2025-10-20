const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createSubmissionsTable() {
  try {
    console.log('Creating submissions table...');
    
    // First, let's try to create a simple test record to see if the table exists
    const testData = {
      type: 'vulnerability',
      data: { test: 'data' },
      status: 'pending_review',
      source: 'test'
    };
    
    const { data, error } = await supabase
      .from('submissions')
      .insert([testData])
      .select();
    
    if (error) {
      console.log('Table does not exist, need to create it manually in Supabase dashboard');
      console.log('Error:', error.message);
      console.log('\nPlease run this SQL in your Supabase SQL editor:');
      console.log(`
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

CREATE INDEX IF NOT EXISTS submissions_type_idx ON public.submissions(type);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions(status);
CREATE INDEX IF NOT EXISTS submissions_created_at_idx ON public.submissions(created_at);
CREATE INDEX IF NOT EXISTS submissions_source_idx ON public.submissions(source);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
      `);
    } else {
      console.log('Submissions table exists and is working!');
      console.log('Test record created:', data);
    }
    
  } catch (err) {
    console.error('Error:', err.message);
  }
}

createSubmissionsTable();


