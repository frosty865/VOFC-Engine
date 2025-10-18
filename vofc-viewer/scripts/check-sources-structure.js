const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSourcesStructure() {
  console.log('🔍 Checking sources table structure...\n');

  try {
    // Get any source record to see the structure
    const { data: sourceData, error: sourceError } = await supabase
      .from('sources')
      .select('*')
      .limit(1);

    if (sourceError) {
      console.log('❌ Source query failed:', sourceError.message);
    } else {
      console.log('✅ Source query succeeded');
      console.log('📊 Source fields:', Object.keys(sourceData[0]));
      console.log('📊 Sample source data:', JSON.stringify(sourceData[0], null, 2));
    }

    // Check the ofc_sources relationship
    console.log('\n📊 Checking ofc_sources relationship...');
    const { data: ofcSourcesData, error: ofcSourcesError } = await supabase
      .from('ofc_sources')
      .select(`
        *,
        sources (
          *
        )
      `)
      .limit(1);

    if (ofcSourcesError) {
      console.log('❌ ofc_sources join failed:', ofcSourcesError.message);
    } else {
      console.log('✅ ofc_sources join succeeded');
      console.log('📊 Sample ofc_sources with sources:', JSON.stringify(ofcSourcesData[0], null, 2));
    }

  } catch (error) {
    console.error('❌ Sources structure check failed:', error);
  }
}

if (require.main === module) {
  checkSourcesStructure()
    .then(() => {
      console.log('\n✅ Sources structure check completed!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Sources structure check error:', error);
      process.exit(1);
    });
}

module.exports = { checkSourcesStructure };

