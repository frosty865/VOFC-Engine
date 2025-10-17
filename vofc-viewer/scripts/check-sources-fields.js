const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSourcesFields() {
  console.log('🔍 Checking sources table fields...\n');

  try {
    // Get a sample source record
    const { data: sourceData, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .eq('reference_number', 1)
      .single();

    if (sourceError) {
      console.log('❌ Source query failed:', sourceError.message);
    } else {
      console.log('✅ Source query succeeded');
      console.log('📊 Source fields:', Object.keys(sourceData));
      console.log('📊 Sample source data:', JSON.stringify(sourceData, null, 2));
    }

    // Test the correct join
    console.log('\n📊 Testing correct join...');
    const { data: joinData, error: joinError } = await supabase
      .from('options_for_consideration')
      .select(`
        *,
        ofc_sources (
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
        )
      `)
      .limit(3);

    if (joinError) {
      console.log('❌ Join query failed:', joinError.message);
    } else {
      console.log('✅ Join query succeeded');
      console.log(`📊 Found ${joinData.length} OFCs with joined sources`);
      console.log('📊 Sample joined data:', JSON.stringify(joinData[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Sources fields check failed:', error);
  }
}

if (require.main === module) {
  checkSourcesFields()
    .then(() => {
      console.log('\n✅ Sources fields check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Sources fields check error:', error);
      process.exit(1);
    });
}

module.exports = { checkSourcesFields };
