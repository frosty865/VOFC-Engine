const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkActualRelationships() {
  console.log('🔍 Checking actual data relationships...\n');

  try {
    // Check what columns exist in options_for_consideration
    console.log('📊 Checking options_for_consideration structure...');
    const { data: ofcData, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .limit(1);

    if (ofcError) {
      console.log('❌ OFC query failed:', ofcError.message);
    } else {
      console.log('✅ OFC query succeeded');
      console.log('📊 OFC columns:', Object.keys(ofcData[0]));
      console.log('📊 Sample OFC data:', JSON.stringify(ofcData[0], null, 2));
    }

    // Check if there's an ofc_sources table
    console.log('\n📊 Checking ofc_sources table...');
    const { data: ofcSourcesData, error: ofcSourcesError } = await supabase
      .from('ofc_sources')
      .select('*')
      .limit(3);

    if (ofcSourcesError) {
      console.log('❌ ofc_sources query failed:', ofcSourcesError.message);
    } else {
      console.log('✅ ofc_sources query succeeded');
      console.log(`📊 Found ${ofcSourcesData.length} OFC-source links`);
      console.log('📊 Sample ofc_sources data:', JSON.stringify(ofcSourcesData[0], null, 2));
    }

    // Check if we can join through ofc_sources
    console.log('\n📊 Testing join through ofc_sources...');
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
    console.error('❌ Relationship check failed:', error);
  }
}

if (require.main === module) {
  checkActualRelationships()
    .then(() => {
      console.log('\n✅ Relationship check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Relationship check error:', error);
      process.exit(1);
    });
}

module.exports = { checkActualRelationships };
