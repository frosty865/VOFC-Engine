/**
 * Fixed OFC Fetching Functions
 * This version avoids the problematic relationship query
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fixed fetchOFCs function that fetches OFCs and their sources separately
export async function fetchOFCs() {
  try {
    console.log('🔍 Fetching OFCs with simple query...');
    
    // First, fetch OFCs
    const { data: ofcs, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select('*')
      .order('created_at', { ascending: false });

    if (ofcError) {
      console.error('Error fetching OFCs:', ofcError);
      return [];
    }

    // Then, fetch OFC sources separately
    const { data: ofcSources, error: sourcesError } = await supabase
      .from('ofc_sources')
      .select('*');

    if (sourcesError) {
      console.warn('Could not fetch ofc_sources:', sourcesError.message);
      // Return OFCs without sources if the table doesn't exist
      console.log(`✅ Successfully fetched ${ofcs.length} OFCs (without sources)`);
      return ofcs || [];
    }

    // Merge sources into OFCs
    const ofcsWithSources = ofcs.map(ofc => {
      const sources = ofcSources.filter(s => s.ofc_id === ofc.id);
      return {
        ...ofc,
        sources: sources.length > 0 ? sources.map(s => s.source_id).join(', ') : null
      };
    });

    console.log(`✅ Successfully fetched ${ofcsWithSources.length} OFCs with sources`);
    return ofcsWithSources || [];
  } catch (error) {
    console.error('Error in fetchOFCs:', error);
    return [];
  }
}

// Fixed getOFCsForVulnerability function
export async function getOFCsForVulnerability(vulnerabilityId) {
  try {
    console.log(`🔍 Fetching OFCs for vulnerability ${vulnerabilityId}...`);
    
    const { data, error } = await supabase
      .from('options_for_consideration')
      .select('*')
      .eq('vulnerability_id', vulnerabilityId);

    if (error) {
      console.error('Error fetching OFCs for vulnerability:', error);
      return [];
    }

    console.log(`✅ Successfully fetched ${data.length} OFCs for vulnerability`);
    return data || [];
  } catch (error) {
    console.error('Error in getOFCsForVulnerability:', error);
    return [];
  }
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

// Fixed fetchVulnerabilities function
export async function fetchVulnerabilities() {
  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vulnerabilities:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchVulnerabilities:', error);
    return [];
  }
}

// Additional functions needed by the dashboard
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
