import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseKey = 'sb_publishable_QuEn3h16DCAw3Jt_msFIiw_qBYy2Qzl';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanupInvalidCitations() {
  console.log('🔍 Checking for invalid citations in OFCs...');
  
  try {
    // Get all OFCs with sources field
    const { data: ofcs, error: ofcsError } = await supabase
      .from('options_for_consideration')
      .select('id, sources')
      .not('sources', 'is', null);

    if (ofcsError) {
      console.error('Error fetching OFCs:', ofcsError);
      return;
    }

    console.log(`Found ${ofcs.length} OFCs with sources field`);

    // Get valid source reference numbers
    const { data: sources, error: sourcesError } = await supabase
      .from('sources')
      .select('reference_number');

    if (sourcesError) {
      console.error('Error fetching sources:', sourcesError);
      return;
    }

    const validSourceIds = new Set(sources.map(s => s.reference_number));
    console.log(`Valid source reference numbers: 1-${Math.max(...sources.map(s => s.reference_number))}`);

    let invalidCitations = 0;
    let cleanedOFCs = 0;

    for (const ofc of ofcs) {
      if (!ofc.sources) continue;

      // Extract citation numbers from sources field
      const citationMatches = ofc.sources.match(/\[cite:\s*(\d+)\]/g);
      if (!citationMatches) continue;

      const citationNumbers = citationMatches.map(match => {
        const num = match.match(/\[cite:\s*(\d+)\]/);
        return num ? parseInt(num[1]) : null;
      }).filter(num => num !== null);

      const invalidCitations = citationNumbers.filter(num => !validSourceIds.has(num));
      
      if (invalidCitations.length > 0) {
        console.log(`OFC ${ofc.id}: Invalid citations ${invalidCitations.join(', ')}`);
        
        // Remove invalid citations from sources field
        let cleanedSources = ofc.sources;
        invalidCitations.forEach(invalidNum => {
          const regex = new RegExp(`\\[cite:\\s*${invalidNum}\\]`, 'g');
          cleanedSources = cleanedSources.replace(regex, '');
        });
        
        // Clean up extra spaces and commas
        cleanedSources = cleanedSources.replace(/,\s*,/g, ',');
        cleanedSources = cleanedSources.replace(/,\s*$/, '');
        cleanedSources = cleanedSources.replace(/^\s*,/, '');
        
        // Update the OFC
        const { error: updateError } = await supabase
          .from('options_for_consideration')
          .update({ sources: cleanedSources })
          .eq('id', ofc.id);

        if (updateError) {
          console.error(`Error updating OFC ${ofc.id}:`, updateError);
        } else {
          console.log(`✅ Cleaned OFC ${ofc.id}: "${ofc.sources}" → "${cleanedSources}"`);
          cleanedOFCs++;
        }
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`- OFCs with sources field: ${ofcs.length}`);
    console.log(`- OFCs cleaned: ${cleanedOFCs}`);
    console.log(`- Invalid citations removed: ${invalidCitations}`);

  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

cleanupInvalidCitations();
