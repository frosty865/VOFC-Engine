const { createClient } = require('@supabase/supabase-js');

// Use production environment variables
const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseServiceKey = 'sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function linkSourcesToOFCs() {
  console.log('🔗 Linking sources to OFCs...\n');

  try {
    // Get some sample OFCs
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('id, option_text, discipline')
      .limit(10);

    if (ofcsError) {
      console.error('❌ Error fetching OFCs:', ofcsError);
      return false;
    }

    console.log(`📊 Found ${ofcs.length} OFCs to link`);

    // Get available sources
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('id, title, organization');

    if (sourcesError) {
      console.error('❌ Error fetching sources:', sourcesError);
      return false;
    }

    console.log(`📊 Found ${sources.length} available sources`);

    // Link each OFC to a random source
    let linkedCount = 0;
    for (const ofc of ofcs) {
      const randomSource = sources[Math.floor(Math.random() * sources.length)];
      
      const { error: linkError } = await supabase
        .from('ofc_sources')
        .insert({
          ofc_id: ofc.id,
          source_id: randomSource.id,
          page_number: Math.floor(Math.random() * 100) + 1,
          section: `Section ${Math.floor(Math.random() * 10) + 1}`,
          quote: `"${ofc.option_text.substring(0, 50)}..."` // Sample quote
        });

      if (linkError) {
        console.warn(`⚠️ Failed to link OFC ${ofc.id} to source ${randomSource.id}:`, linkError.message);
      } else {
        linkedCount++;
        console.log(`✅ Linked OFC "${ofc.option_text.substring(0, 30)}..." to source "${randomSource.title}"`);
      }
    }

    console.log(`\n🎉 Successfully linked ${linkedCount} OFCs to sources!`);

    // Verify the links
    const { data: links, error: linksError } = await supabase
      .from('ofc_sources')
      .select(`
        *,
        sources (
          id,
          title,
          organization
        )
      `)
      .limit(5);

    if (linksError) {
      console.error('❌ Error verifying links:', linksError);
    } else {
      console.log('\n📊 Sample links created:');
      links.forEach(link => {
        console.log(`- OFC linked to: ${link.sources?.title} (${link.sources?.organization})`);
      });
    }

    return true;

  } catch (error) {
    console.error('❌ Linking failed:', error);
    return false;
  }
}

if (require.main === module) {
  linkSourcesToOFCs()
    .then(success => {
      if (success) {
        console.log('\n✅ Source linking completed successfully!');
        process.exit(0);
      } else {
        console.log('\n❌ Source linking failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Linking error:', error);
      process.exit(1);
    });
}

module.exports = { linkSourcesToOFCs };
