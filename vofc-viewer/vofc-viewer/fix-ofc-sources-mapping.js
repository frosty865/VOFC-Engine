import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseKey = 'sb_publishable_QuEn3h16DCAw3Jt_msFIiw_qBYy2Qzl';
const supabase = createClient(supabaseUrl, supabaseKey);

async function fixOFCSourcesMapping() {
  console.log('🔧 Fixing OFC sources mapping...');
  
  try {
    // Get all ofc_sources links
    const { data: ofcSources, error: ofcSourcesError } = await supabase
      .from('ofc_sources')
      .select('*');

    if (ofcSourcesError) {
      console.error('Error fetching ofc_sources:', ofcSourcesError);
      return;
    }

    console.log(`Found ${ofcSources.length} ofc_sources links`);

    // Get all sources to create mapping
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('reference_number');

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
      return;
    }

    const validReferenceNumbers = new Set(sources.map(s => s.reference_number));
    console.log(`Valid reference numbers: 1-${Math.max(...sources.map(s => s.reference_number))}`);

    // Delete all existing ofc_sources links
    const { error: deleteError } = await supabase
      .from('ofc_sources')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

    if (deleteError) {
      console.error('Error deleting existing ofc_sources:', deleteError);
      return;
    }

    console.log('✅ Deleted all existing ofc_sources links');

    // Get all OFCs that have sources field with citations
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('id, sources')
      .not('sources', 'is', null);

    if (ofcsError) {
      console.error('Error fetching OFCs:', ofcsError);
      return;
    }

    console.log(`Found ${ofcs.length} OFCs with sources field`);

    let linksCreated = 0;

    // Process each OFC and create proper ofc_sources links
    for (const ofc of ofcs) {
      if (!ofc.sources) continue;

      // Extract citation numbers from sources field
      const citationMatches = ofc.sources.match(/\[cite:\s*([\d,\s]+)\]/g);
      if (!citationMatches) continue;

      const citationNumbers = citationMatches.map(match => {
        const content = match.match(/\[cite:\s*([\d,\s]+)\]/);
        if (!content) return [];
        
        // Split by comma and extract numbers
        return content[1].split(',').map(num => parseInt(num.trim())).filter(num => !isNaN(num));
      }).flat().filter(num => validReferenceNumbers.has(num));

      // Create ofc_sources links for valid citations
      for (const refNum of citationNumbers) {
        const { error: insertError } = await supabase
          .from('ofc_sources')
          .insert({
            ofc_id: ofc.id,
            source_id: refNum
          });

        if (insertError) {
          console.error(`Error creating link for OFC ${ofc.id}, source ${refNum}:`, insertError);
        } else {
          linksCreated++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- OFCs processed: ${ofcs.length}`);
    console.log(`- New ofc_sources links created: ${linksCreated}`);

  } catch (error) {
    console.error('Error during fix:', error);
  }
}

fixOFCSourcesMapping();
