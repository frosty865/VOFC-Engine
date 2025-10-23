const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testOFCQuery() {
  console.log('🧪 Testing OFC query with sources...\n');

  try {
    // Test the original query (without sources)
    console.log('📊 Testing basic OFC query...');
    const { data: basicData, error: basicError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(3);

    if (basicError) {
      console.log('❌ Basic query failed:', basicError.message);
    } else {
      console.log('✅ Basic query succeeded');
      console.log(`📊 Found ${basicData.length} OFCs`);
      console.log('📊 Sample OFC:', JSON.stringify(basicData[0], null, 2));
    }

    // Test the sources query
    console.log('\n📊 Testing OFC query with sources...');
    const { data: sourcesData, error: sourcesError } = await supabase
      .from('options_for_consideration')
      .select(`
        *,
        sources!sources (
          reference_number,
          authors,
          title,
          publication,
          year,
          formatted_citation,
          short_citation
        )
      `)
      .limit(3);

    if (sourcesError) {
      console.log('❌ Sources query failed:', sourcesError.message);
    } else {
      console.log('✅ Sources query succeeded');
      console.log(`📊 Found ${sourcesData.length} OFCs with sources`);
      console.log('📊 Sample OFC with sources:', JSON.stringify(sourcesData[0], null, 2));
    }

    // Test alternative join syntax
    console.log('\n📊 Testing alternative join syntax...');
    const { data: altData, error: altError } = await supabase
      .from('options_for_consideration')
      .select(`
        *,
        sources (
          reference_number,
          authors,
          title,
          publication,
          year,
          formatted_citation,
          short_citation
        )
      `)
      .limit(3);

    if (altError) {
      console.log('❌ Alternative query failed:', altError.message);
    } else {
      console.log('✅ Alternative query succeeded');
      console.log(`📊 Found ${altData.length} OFCs with alternative syntax`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

if (require.main === module) {
  testOFCQuery()
    .then(() => {
      console.log('\n✅ OFC query test completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ OFC query test error:', error);
      process.exit(1);
    });
}

module.exports = { testOFCQuery };

