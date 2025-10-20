const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSubmissionAPI() {
  console.log('🧪 Testing submission API...');
  
  try {
    // Test vulnerability submission
    const vulnerabilityData = {
      type: 'vulnerability',
      data: {
        vulnerability: 'Test vulnerability from script',
        discipline: 'Physical Security',
        source: 'Test Source',
        sector: 'Commercial Facilities',
        subsector: 'Commercial Facilities'
      }
    };

    console.log('📤 Sending vulnerability submission...');
    const response = await fetch('http://localhost:3000/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(vulnerabilityData)
    });

    const result = await response.json();
    console.log('📥 Response:', result);

    if (result.success) {
      console.log('✅ Vulnerability submission successful!');
      
      // Check if it was saved to database
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('type', 'vulnerability')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('🔍 Database check - vulnerability submissions:', submissions);
      console.log('🔍 Database error:', error);
    } else {
      console.log('❌ Vulnerability submission failed:', result.error);
    }

    // Test OFC submission
    const ofcData = {
      type: 'ofc',
      data: {
        option_text: 'Test OFC from script',
        discipline: 'Physical Security',
        source: 'Test Source',
        sector: 'Commercial Facilities',
        subsector: 'Commercial Facilities'
      }
    };

    console.log('📤 Sending OFC submission...');
    const ofcResponse = await fetch('http://localhost:3000/api/submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(ofcData)
    });

    const ofcResult = await ofcResponse.json();
    console.log('📥 OFC Response:', ofcResult);

    if (ofcResult.success) {
      console.log('✅ OFC submission successful!');
      
      // Check if it was saved to database
      const { data: ofcSubmissions, error: ofcError } = await supabase
        .from('submissions')
        .select('*')
        .eq('type', 'ofc')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('🔍 Database check - OFC submissions:', ofcSubmissions);
      console.log('🔍 Database error:', ofcError);
    } else {
      console.log('❌ OFC submission failed:', ofcResult.error);
    }

    // Check all submissions
    const { data: allSubmissions, error: allError } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('🔍 All submissions in database:', allSubmissions);
    console.log('🔍 All submissions error:', allError);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSubmissionAPI();

