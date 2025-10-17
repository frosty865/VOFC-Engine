const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkExistingSources() {
  console.log('🔍 Checking existing sources...\n');

  try {
    // Get all sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(10);

    if (sourcesError) {
      console.error('❌ Error fetching sources:', sourcesError);
      return false;
    }

    console.log(`📊 Found ${sources.length} sources in database`);
    console.log('\n📚 Sample sources:');
    
    sources.forEach((source, index) => {
      console.log(`\n${index + 1}. ${source.short_citation || source.authors}`);
      console.log(`   Title: ${source.title || 'N/A'}`);
      console.log(`   Publication: ${source.publication || 'N/A'}`);
      console.log(`   Year: ${source.year || 'N/A'}`);
      console.log(`   Reference: ${source.reference_number}`);
    });

    // Check if there are any existing links
    console.log('\n🔗 Checking for existing source links...');
    
    // Try to check if ofc_sources table exists by attempting to query it
    const { data: ofcLinks, error: ofcLinksError } = await supabase
      .from('ofc_sources')
      .select('*')
      .limit(1);

    if (ofcLinksError) {
      console.log('⚠️ ofc_sources table does not exist yet');
      console.log('   This means OFCs are not currently linked to sources');
    } else {
      console.log(`✅ Found ${ofcLinks.length} existing OFC-source links`);
    }

    // Check if vulnerability_sources table exists
    const { data: vulnLinks, error: vulnLinksError } = await supabase
      .from('vulnerability_sources')
      .select('*')
      .limit(1);

    if (vulnLinksError) {
      console.log('⚠️ vulnerability_sources table does not exist yet');
    } else {
      console.log(`✅ Found ${vulnLinks.length} existing vulnerability-source links`);
    }

    return true;

  } catch (error) {
    console.error('❌ Check failed:', error);
    return false;
  }
}

if (require.main === module) {
  checkExistingSources()
    .then(success => {
      if (success) {
        console.log('\n✅ Source check completed!');
        process.exit(0);
      } else {
        console.log('\n❌ Source check failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Source check error:', error);
      process.exit(1);
    });
}

module.exports = { checkExistingSources };
