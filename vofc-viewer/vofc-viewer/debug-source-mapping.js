import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseKey = 'sb_publishable_QuEn3h16DCAw3Jt_msFIiw_qBYy2Qzl';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugSourceMapping() {
  console.log('🔍 Debugging source mapping...');
  
  try {
    // Check ofc_sources table
    const { data: ofcSources, error: ofcSourcesError } = await supabase
      .from('ofc_sources')
      .select('*')
      .limit(10);

    if (ofcSourcesError) {
      console.error('Error fetching ofc_sources:', ofcSourcesError);
    } else {
      console.log('📊 ofc_sources sample:', ofcSources);
    }

    // Check sources table
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('*')
      .limit(10);

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
    } else {
      console.log('📊 sources sample:', sources);
    }

    // Check for any source_id in ofc_sources that doesn't exist in sources
    const { data: allOfcSources, error: allOfcSourcesError } = await supabase
      .from('ofc_sources')
      .select('source_id');

    const { data: allSources, error: allSourcesError } = await supabase
      .from('sources')
      .select('id');

    if (!allOfcSourcesError && !allSourcesError) {
      const sourceIds = new Set(allSources.map(s => s.id));
      const invalidLinks = allOfcSources.filter(link => !sourceIds.has(link.source_id));
      
      console.log(`📊 Total ofc_sources links: ${allOfcSources.length}`);
      console.log(`📊 Total sources: ${allSources.length}`);
      console.log(`📊 Invalid source_id links: ${invalidLinks.length}`);
      
      if (invalidLinks.length > 0) {
        console.log('❌ Invalid source_id values:', invalidLinks.slice(0, 5));
      }
    }

  } catch (error) {
    console.error('Error during debug:', error);
  }
}

debugSourceMapping();

