import { supabase } from './client.js';

/**
 * Prebuilt query wrappers for common VOFC operations
 */

// Complex queries for dashboard
export async function getVulnerabilitiesWithOFCs(filters = {}) {
  try {
    let query = supabase
      .from('vulnerabilities')
      .select(`
        *,
        vulnerability_ofc_links!inner(
          ofc_id,
          options_for_consideration!inner(
            *,
            ofc_sources(
              source_id,
              sources(*)
            )
          )
        )
      `);
    
    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline);
    }
    
    if (filters.search) {
      query = query.ilike('vulnerability', `%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch vulnerabilities with OFCs: ${error.message}`);
    }
    
    // Transform the data structure
    const transformedData = data?.map(vuln => {
      const ofcs = vuln.vulnerability_ofc_links?.map(link => {
        const ofc = link.options_for_consideration;
        return {
          ...ofc,
          sources: ofc.ofc_sources?.map(os => os.sources) || []
        };
      }) || [];
      
      return {
        ...vuln,
        ofcs: ofcs
      };
    }) || [];
    
    return {
      success: true,
      data: transformedData,
      count: transformedData.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getOFCsWithSources(filters = {}) {
  try {
    let query = supabase
      .from('options_for_consideration')
      .select(`
        *,
        ofc_sources(
          source_id,
          sources(*)
        )
      `);
    
    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline);
    }
    
    if (filters.vulnerability_id) {
      query = query.eq('vulnerability_id', filters.vulnerability_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch OFCs with sources: ${error.message}`);
    }
    
    // Transform the data structure
    const transformedData = data?.map(ofc => ({
      ...ofc,
      sources: ofc.ofc_sources?.map(os => os.sources) || []
    })) || [];
    
    return {
      success: true,
      data: transformedData,
      count: transformedData.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Search and filtering
export async function searchVulnerabilities(searchTerm, filters = {}) {
  try {
    let query = supabase
      .from('vulnerabilities')
      .select('*')
      .ilike('vulnerability', `%${searchTerm}%`);
    
    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to search vulnerabilities: ${error.message}`);
    }
    
    return {
      success: true,
      data: data || [],
      count: data?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function searchOFCs(searchTerm, filters = {}) {
  try {
    let query = supabase
      .from('options_for_consideration')
      .select('*')
      .ilike('option_text', `%${searchTerm}%`);
    
    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to search OFCs: ${error.message}`);
    }
    
    return {
      success: true,
      data: data || [],
      count: data?.length || 0
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Analytics and reporting
export async function getDisciplineStats() {
  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('discipline')
      .not('discipline', 'is', null);
    
    if (error) {
      throw new Error(`Failed to fetch discipline stats: ${error.message}`);
    }
    
    // Count disciplines
    const disciplineCounts = data?.reduce((acc, item) => {
      const discipline = item.discipline;
      acc[discipline] = (acc[discipline] || 0) + 1;
      return acc;
    }, {}) || {};
    
    return {
      success: true,
      data: disciplineCounts
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getRecentActivity(limit = 10) {
  try {
    const [vulnsResult, ofcsResult] = await Promise.all([
      supabase
        .from('vulnerabilities')
        .select('id, vulnerability, created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
      supabase
        .from('options_for_consideration')
        .select('id, option_text, created_at')
        .order('created_at', { ascending: false })
        .limit(limit)
    ]);
    
    if (vulnsResult.error) {
      throw new Error(`Failed to fetch recent vulnerabilities: ${vulnsResult.error.message}`);
    }
    
    if (ofcsResult.error) {
      throw new Error(`Failed to fetch recent OFCs: ${ofcsResult.error.message}`);
    }
    
    // Combine and sort by creation date
    const allActivity = [
      ...(vulnsResult.data || []).map(item => ({ ...item, type: 'vulnerability' })),
      ...(ofcsResult.data || []).map(item => ({ ...item, type: 'ofc' }))
    ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
    return {
      success: true,
      data: allActivity.slice(0, limit)
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Data integrity checks
export async function checkDataIntegrity() {
  try {
    const [vulnsResult, ofcsResult, linksResult, sourcesResult] = await Promise.all([
      supabase.from('vulnerabilities').select('id', { count: 'exact', head: true }),
      supabase.from('options_for_consideration').select('id', { count: 'exact', head: true }),
      supabase.from('vulnerability_ofc_links').select('id', { count: 'exact', head: true }),
      supabase.from('sources').select('id', { count: 'exact', head: true })
    ]);
    
    const stats = {
      vulnerabilities: vulnsResult.count || 0,
      ofcs: ofcsResult.count || 0,
      links: linksResult.count || 0,
      sources: sourcesResult.count || 0
    };
    
    // Check for orphaned records
    const orphanedOFCs = await supabase
      .from('options_for_consideration')
      .select('id')
      .not('vulnerability_id', 'in', `(SELECT id FROM vulnerabilities)`);
    
    const orphanedLinks = await supabase
      .from('vulnerability_ofc_links')
      .select('id')
      .not('vulnerability_id', 'in', `(SELECT id FROM vulnerabilities)`);
    
    return {
      success: true,
      stats: stats,
      integrity_issues: {
        orphaned_ofcs: orphanedOFCs.data?.length || 0,
        orphaned_links: orphanedLinks.data?.length || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Export functions for external use
export async function exportVulnerabilities(format = 'json', filters = {}) {
  try {
    const result = await getVulnerabilitiesWithOFCs(filters);
    
    if (!result.success) {
      throw new Error(result.error);
    }
    
    if (format === 'json') {
      return {
        success: true,
        data: result.data,
        format: 'json'
      };
    } else if (format === 'csv') {
      // Convert to CSV format
      const csvData = result.data.map(vuln => ({
        id: vuln.id,
        vulnerability: vuln.vulnerability,
        discipline: vuln.discipline,
        ofc_count: vuln.ofcs?.length || 0,
        created_at: vuln.created_at
      }));
      
      return {
        success: true,
        data: csvData,
        format: 'csv'
      };
    }
    
    throw new Error(`Unsupported export format: ${format}`);
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
