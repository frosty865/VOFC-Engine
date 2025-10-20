/**
 * VOFC Fetching Functions - Optimized with proper relationships
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Optimized fetchOFCs function using proper relationships
export async function fetchOFCs() {
  try {
    console.log('🔍 Fetching OFCs with relationship query...');
    
    // Try using the database function first (most efficient)
    const { data: ofcsWithSources, error: functionError } = await supabase
      .rpc('get_ofcs_with_sources');

    if (!functionError && ofcsWithSources) {
      console.log(`✅ Successfully fetched ${ofcsWithSources.length} OFCs with sources using function`);
      return ofcsWithSources;
    }

    // Fallback to view if function doesn't exist
    const { data: viewData, error: viewError } = await supabase
      .from('ofcs_with_sources')
      .select('*')
      .order('created_at', { ascending: false });

    if (!viewError && viewData) {
      console.log(`✅ Successfully fetched ${viewData.length} OFCs with sources using view`);
      return viewData;
    }

    // Final fallback to manual join
    const { data: ofcs, error: ofcError } = await supabase
      .from('options_for_consideration')
      .select(`
        *,
        ofc_sources!inner(source_id)
      `)
      .order('created_at', { ascending: false });

    if (ofcError) {
      console.error('Error fetching OFCs with relationships:', ofcError);
      
      // Last resort: simple query without relationships
      const { data: simpleOfcs, error: simpleError } = await supabase
        .from('options_for_consideration')
        .select('*')
        .order('created_at', { ascending: false });

      if (simpleError) {
        console.error('Error fetching OFCs:', simpleError);
        return [];
      }

      console.log(`✅ Successfully fetched ${simpleOfcs.length} OFCs (simple query)`);
      return simpleOfcs || [];
    }

    console.log(`✅ Successfully fetched ${ofcs.length} OFCs with relationship join`);
    return ofcs || [];
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

// Optimized fetchVulnerabilities function using proper relationships
export async function fetchVulnerabilities() {
  try {
    console.log('🔍 Fetching vulnerabilities with relationship query...');
    
    // Try using the database function first (most efficient)
    const { data: vulnsWithOfcs, error: functionError } = await supabase
      .rpc('get_vulnerabilities_with_ofcs');

    if (!functionError && vulnsWithOfcs) {
      console.log(`✅ Successfully fetched ${vulnsWithOfcs.length} vulnerabilities with OFCs using function`);
      return vulnsWithOfcs;
    }

    // Fallback to view if function doesn't exist
    const { data: viewData, error: viewError } = await supabase
      .from('vulnerabilities_with_ofcs')
      .select('*')
      .order('created_at', { ascending: false });

    if (!viewError && viewData) {
      console.log(`✅ Successfully fetched ${viewData.length} vulnerabilities with OFCs using view`);
      return viewData;
    }

    // Final fallback to simple query
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching vulnerabilities:', error);
      return [];
    }

    console.log(`✅ Successfully fetched ${data.length} vulnerabilities (simple query)`);
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











