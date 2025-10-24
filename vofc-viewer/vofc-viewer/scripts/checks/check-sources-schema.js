const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSourcesSchema() {
  console.log('🔍 Checking sources table schema...\n');

  try {
    // Get a sample record to see the structure
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(1);

    if (sourcesError) {
      console.error('❌ Error fetching sources:', sourcesError);
      return false;
    }

    if (sources && sources.length > 0) {
      console.log('📊 Sources table structure:');
      console.log(JSON.stringify(sources[0], null, 2));
    } else {
      console.log('📊 No sources found in table');
    }

    // Check if ofc_sources table exists
    const { data: ofcSources, error: ofcSourcesError } = await supabase
      .from('ofc_sources')
      .select('*')
      .limit(1);

    if (ofcSourcesError) {
      console.log('⚠️ ofc_sources table error:', ofcSourcesError.message);
    } else {
      console.log('✅ ofc_sources table exists');
      if (ofcSources && ofcSources.length > 0) {
        console.log('📊 ofc_sources structure:');
        console.log(JSON.stringify(ofcSources[0], null, 2));
      }
    }

    return true;

  } catch (error) {
    console.error('❌ Schema check failed:', error);
    return false;
  }
}

if (require.main === module) {
  checkSourcesSchema()
    .then(success => {
      if (success) {
        console.log('\n✅ Schema check completed!');
        process.exit(0);
      } else {
        console.log('\n❌ Schema check failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Schema check error:', error);
      process.exit(1);
    });
}

module.exports = { checkSourcesSchema };

