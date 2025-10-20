const { createClient } = require('@supabase/supabase-js');

// Use service role for API submissions to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createTestSubmission() {
  try {
    console.log('Creating test vulnerability submission...');
    
    const testSubmission = {
      type: 'vulnerability',
      data: JSON.stringify({
        vulnerability: 'Test vulnerability for admin page verification',
        discipline: 'Physical Security',
        source: 'Test Source',
        sector_id: 1,
        subsector_id: 1
      }),
      status: 'pending_review',
      source: 'test_script'
    };

    const { data, error } = await supabase
      .from('submissions')
      .insert([testSubmission])
      .select();

    if (error) {
      console.error('Error creating test submission:', error);
      return;
    }

    console.log('✅ Test vulnerability submission created:', data[0].id);

    // Create test OFC submission
    console.log('Creating test OFC submission...');
    
    const testOFCSubmission = {
      type: 'ofc',
      data: JSON.stringify({
        option_text: 'Test option for consideration for admin page verification',
        discipline: 'Physical Security',
        source: 'Test Source',
        sector_id: 1,
        subsector_id: 1
      }),
      status: 'pending_review',
      source: 'test_script'
    };

    const { data: ofcData, error: ofcError } = await supabase
      .from('submissions')
      .insert([testOFCSubmission])
      .select();

    if (ofcError) {
      console.error('Error creating test OFC submission:', ofcError);
      return;
    }

    console.log('✅ Test OFC submission created:', ofcData[0].id);

    // Verify submissions exist
    const { data: allSubmissions, error: fetchError } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Error fetching submissions:', fetchError);
      return;
    }

    console.log(`\n📊 Total submissions in database: ${allSubmissions.length}`);
    console.log('Recent submissions:');
    allSubmissions.slice(0, 3).forEach((sub, index) => {
      console.log(`${index + 1}. ${sub.type} - ${sub.status} - ${new Date(sub.created_at).toLocaleString()}`);
    });

  } catch (error) {
    console.error('Script error:', error);
  }
}

createTestSubmission();


