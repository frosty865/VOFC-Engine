const { createClient } = require('@supabase/supabase-js');

// Use service role for API submissions to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSubmissions() {
  try {
    console.log('Checking submissions table...');
    
    // Check if submissions table exists and get count
    const { data: submissions, error } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching submissions:', error);
      return;
    }

    console.log(`\n📊 Total submissions found: ${submissions.length}`);
    
    if (submissions.length > 0) {
      console.log('\n📋 Recent submissions:');
      submissions.slice(0, 5).forEach((sub, index) => {
        console.log(`${index + 1}. ID: ${sub.id}`);
        console.log(`   Type: ${sub.type}`);
        console.log(`   Status: ${sub.status}`);
        console.log(`   Source: ${sub.source}`);
        console.log(`   Created: ${new Date(sub.created_at).toLocaleString()}`);
        console.log(`   Data: ${JSON.stringify(JSON.parse(sub.data), null, 2)}`);
        console.log('   ---');
      });
    } else {
      console.log('\n❌ No submissions found in database');
      console.log('💡 Try creating a submission using the bulk submission page:');
      console.log('   1. Go to http://localhost:3001/submit/bulk');
      console.log('   2. Select a sector');
      console.log('   3. Paste CSV data and submit');
    }

    // Check vulnerabilities table
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('count')
      .limit(1);

    if (!vulnError) {
      const { count: vulnCount } = await supabase
        .from('vulnerabilities')
        .select('*', { count: 'exact', head: true });
      console.log(`\n📊 Vulnerabilities in main table: ${vulnCount}`);
    }

    // Check OFCs table
    const { data: ofcs, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('count')
      .limit(1);

    if (!ofcError) {
      const { count: ofcCount } = await supabase
        .from('options_for_consideration')
        .select('*', { count: 'exact', head: true });
      console.log(`📊 OFCs in main table: ${ofcCount}`);
    }

  } catch (error) {
    console.error('Script error:', error);
  }
}

checkSubmissions();


