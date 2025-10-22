/**
 * VOFC Fetching Functions - Optimized with proper relationships
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database Schema Discovery Function - Query actual column information
export async function discoverDatabaseSchema() {
  try {
    // Query information_schema to get actual column names
    const { data: columns, error: columnsError } = await supabase
      .rpc('get_table_columns', {
        table_names: ['vulnerabilities', 'options_for_consideration', 'sources', 'vulnerability_ofc_links', 'ofc_sources', 'sectors', 'subsectors']
      });
    
    if (columnsError) {
      // Fallback: query each table directly to get column names
      const tables = [
        'vulnerabilities',
        'options_for_consideration', 
        'sources',
        'vulnerability_ofc_links',
        'ofc_sources',
        'sectors',
        'subsectors'
      ];
      
      const schema = {};
      
      for (const table of tables) {
        try {
          const { data, error } = await supabase
            .from(table)
            .select('*')
            .limit(1);
            
          if (error) {
            schema[table] = { error: error.message };
          } else {
            if (data && data.length > 0) {
              schema[table] = {
                exists: true,
                columns: Object.keys(data[0]),
                sampleData: data[0]
              };
            } else {
              schema[table] = {
                exists: true,
                columns: [],
                sampleData: null
              };
            }
          }
        } catch (err) {
          schema[table] = { error: err.message };
        }
      }
      
      return schema;
    } else {
      return columns;
    }
  } catch (error) {
    console.error('Error discovering schema:', error);
    return {};
  }
}

export async function fetchVOFC() {
  try {
    // Use basic select to see what columns actually exist
    const { data, error } = await supabase
      .from('options_for_consideration')
      .select('*');

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchVOFC:', error);
    throw error;
  }
}

export async function linkOFCtoSource(ofcId, referenceNumber) {
  // 1️⃣ Find the source UUID by its reference number
  const { data: source, error: sourceError } = await supabase
    .from('sources')
    .select('id')
    .eq('"reference number"', referenceNumber)
    .single();

  if (sourceError || !source) throw sourceError || new Error('Source not found');

  // 2️⃣ Link it to the OFC (duplicate-safe because of unique constraint)
  const { error: linkError } = await supabase
    .from('ofc_sources')
    .insert([{ ofc_id: ofcId, source_id: source.id }])
    .select();

  if (linkError && !linkError.message.includes('duplicate key')) throw linkError;

  return { success: true };
}


// Fixed fetchSubsectors function
export async function fetchSubsectors() {
  try {
    const { data, error } = await supabase
      .from('subsectors')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching subsectors:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSubsectors:', error);
    return [];
  }
}

// Direct sources table query to see its columns
export async function fetchSources() {
  try {
    const { data, error } = await supabase
      .from('sources')
      .select('*')
      .limit(1);

    if (error) {
      console.error('Error fetching sources:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSources:', error);
    return [];
  }
}

// Get vulnerability text by ID
export async function getVulnerabilityText(vulnerabilityId) {
  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('*')
      .eq('id', vulnerabilityId)
      .single();

    if (error) {
      console.error('Error fetching vulnerability text:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getVulnerabilityText:', error);
    return null;
  }
}

// Fetch subsectors by sector ID
export async function fetchSubsectorsBySector(sectorId) {
  try {
    const { data, error } = await supabase
      .from('subsectors')
      .select('id, name, sector_id, description')
      .eq('sector_id', sectorId)
      .order('name');

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in fetchSubsectorsBySector:', error);
    throw error;
  }
}

// Fetch vulnerabilities with their linked OFCs using manual joins
export async function fetchVulnerabilities() {
  try {
    // Get all vulnerabilities
    const { data: vulnerabilities, error: vulnError } = await supabase
      .from('vulnerabilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (vulnError) {
      console.error('❌ Error fetching vulnerabilities:', vulnError);
      return [];
    }

    // Get all vulnerability-OFC links
    const { data: links, error: linkError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*');

    if (linkError) {
      console.error('❌ Error fetching vulnerability-OFC links:', linkError);
      return vulnerabilities || [];
    }

    // Get all OFCs
    const { data: ofcs, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*');

    if (ofcError) {
      console.error('❌ Error fetching OFCs:', ofcError);
      return vulnerabilities || [];
    }

    // Get all OFC-Source links
    const { data: ofcSources, error: ofcSourceError } = await supabase
      .from('ofc_sources')
      .select('*');

    if (ofcSourceError) {
      console.error('❌ Error fetching OFC-Source links:', ofcSourceError);
      return vulnerabilities || [];
    }

    // Get all sources
    const { data: sources, error: sourceError } = await supabase
      .from('sources')
      .select('*');

    if (sourceError) {
      console.error('❌ Error fetching sources:', sourceError);
      return vulnerabilities || [];
    }


    // Build the complete data structure
    const vulnerabilitiesWithOFCs = vulnerabilities.map(vuln => {
      const vulnLinks = links.filter(link => link.vulnerability_id === vuln.id);
      
      const ofcsWithSources = vulnLinks.map(link => {
        const ofc = ofcs.find(o => o.id === link.ofc_id);
        if (!ofc) return null;
        
        const ofcSourceLinks = ofcSources.filter(os => os.ofc_id === ofc.id);
        const ofcSourcesData = ofcSourceLinks.map(sourceLink => 
          sources.find(s => s.id === sourceLink.source_id)
        ).filter(Boolean);
        
        return {
          ...ofc,
          sources: ofcSourcesData
        };
      }).filter(Boolean);

      return {
        ...vuln,
        ofcs: ofcsWithSources
      };
    });

    return vulnerabilitiesWithOFCs || [];
  } catch (error) {
    console.error('Error in fetchVulnerabilities:', error);
    return [];
  }
}

// Additional functions needed by the dashboard
// Get OFCs for a specific vulnerability
export async function getOFCsForVulnerability(vulnerabilityId) {
  try {
    // First, let's see what the vulnerability_ofc_links table structure looks like
    const { data: linkData, error: linkError } = await supabase
      .from('vulnerability_ofc_links')
      .select('*')
      .eq('vulnerability_id', vulnerabilityId);

    if (linkError) {
      console.error('Error fetching vulnerability OFC links:', linkError);
      return [];
    }

    // Now let's try to get the actual OFC data by joining with options_for_consideration
    const { data: ofcData, error: ofcError } = await supabase
      .from('vulnerability_ofc_links')
      .select(`
        ofc_id,
        options_for_consideration (
          id,
          option_text,
          discipline,
          sources
        )
      `)
      .eq('vulnerability_id', vulnerabilityId);

    if (ofcError) {
      console.error('Error fetching OFC details:', ofcError);
      // Return just the link data if the join fails
      return linkData || [];
    }

    return ofcData || [];
  } catch (error) {
    console.error('Error in getOFCsForVulnerability:', error);
    return [];
  }
}

export async function fetchVulnerabilityOFCLinks() {
  try {
    const { data, error } = await supabase
      .from('vulnerability_ofc_links')
      .select('*');

    if (error) {
      console.error('Error fetching vulnerability OFC links:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchVulnerabilityOFCLinks:', error);
    return [];
  }
}

export async function fetchSectors() {
  try {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .order('id');

    if (error) {
      console.error('Error fetching sectors:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchSectors:', error);
    return [];
  }
}

// No mock data - all data comes from the database











