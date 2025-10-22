import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://wivohgbuuwxoyfyzntsd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey);

// Database connection test
export async function testConnection() {
  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('count')
      .limit(1);
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    return {
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Vulnerability operations
export async function insertVulnerability(vulnerabilityData) {
  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .insert([vulnerabilityData])
      .select();
    
    if (error) {
      throw new Error(`Failed to insert vulnerability: ${error.message}`);
    }
    
    return {
      success: true,
      data: data[0],
      message: 'Vulnerability inserted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getVulnerabilities(filters = {}) {
  try {
    let query = supabase.from('vulnerabilities').select('*');
    
    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline);
    }
    
    if (filters.search) {
      query = query.ilike('vulnerability', `%${filters.search}%`);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch vulnerabilities: ${error.message}`);
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

// OFC operations
export async function insertOFC(ofcData) {
  try {
    const { data, error } = await supabase
      .from('options_for_consideration')
      .insert([ofcData])
      .select();
    
    if (error) {
      throw new Error(`Failed to insert OFC: ${error.message}`);
    }
    
    return {
      success: true,
      data: data[0],
      message: 'OFC inserted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getOFCs(filters = {}) {
  try {
    let query = supabase.from('options_for_consideration').select('*');
    
    if (filters.discipline) {
      query = query.eq('discipline', filters.discipline);
    }
    
    if (filters.vulnerability_id) {
      query = query.eq('vulnerability_id', filters.vulnerability_id);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch OFCs: ${error.message}`);
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

// Source operations
export async function insertSource(sourceData) {
  try {
    const { data, error } = await supabase
      .from('sources')
      .insert([sourceData])
      .select();
    
    if (error) {
      throw new Error(`Failed to insert source: ${error.message}`);
    }
    
    return {
      success: true,
      data: data[0],
      message: 'Source inserted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function getSources(filters = {}) {
  try {
    let query = supabase.from('sources').select('*');
    
    if (filters.reference_number) {
      query = query.eq('reference_number', filters.reference_number);
    }
    
    const { data, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch sources: ${error.message}`);
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

// Link operations
export async function createVulnerabilityOFCLink(vulnerabilityId, ofcId, linkData = {}) {
  try {
    const linkRecord = {
      vulnerability_id: vulnerabilityId,
      ofc_id: ofcId,
      link_type: linkData.link_type || 'direct',
      confidence_score: linkData.confidence_score || 1.0,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('vulnerability_ofc_links')
      .insert([linkRecord])
      .select();
    
    if (error) {
      throw new Error(`Failed to create vulnerability-OFC link: ${error.message}`);
    }
    
    return {
      success: true,
      data: data[0],
      message: 'Vulnerability-OFC link created successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function createOFCSourceLink(ofcId, sourceId) {
  try {
    const linkRecord = {
      ofc_id: ofcId,
      source_id: sourceId,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('ofc_sources')
      .insert([linkRecord])
      .select();
    
    if (error) {
      throw new Error(`Failed to create OFC-source link: ${error.message}`);
    }
    
    return {
      success: true,
      data: data[0],
      message: 'OFC-source link created successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Bulk operations
export async function bulkInsertVulnerabilities(vulnerabilities) {
  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .insert(vulnerabilities)
      .select();
    
    if (error) {
      throw new Error(`Failed to bulk insert vulnerabilities: ${error.message}`);
    }
    
    return {
      success: true,
      data: data,
      count: data?.length || 0,
      message: 'Vulnerabilities inserted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function bulkInsertOFCs(ofcs) {
  try {
    const { data, error } = await supabase
      .from('options_for_consideration')
      .insert(ofcs)
      .select();
    
    if (error) {
      throw new Error(`Failed to bulk insert OFCs: ${error.message}`);
    }
    
    return {
      success: true,
      data: data,
      count: data?.length || 0,
      message: 'OFCs inserted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

export async function bulkInsertSources(sources) {
  try {
    const { data, error } = await supabase
      .from('sources')
      .insert(sources)
      .select();
    
    if (error) {
      throw new Error(`Failed to bulk insert sources: ${error.message}`);
    }
    
    return {
      success: true,
      data: data,
      count: data?.length || 0,
      message: 'Sources inserted successfully'
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

// Statistics and analytics
export async function getDatabaseStats() {
  try {
    const [vulnsResult, ofcsResult, sourcesResult, linksResult] = await Promise.all([
      supabase.from('vulnerabilities').select('count', { count: 'exact', head: true }),
      supabase.from('options_for_consideration').select('count', { count: 'exact', head: true }),
      supabase.from('sources').select('count', { count: 'exact', head: true }),
      supabase.from('vulnerability_ofc_links').select('count', { count: 'exact', head: true })
    ]);
    
    return {
      success: true,
      stats: {
        vulnerabilities: vulnsResult.count || 0,
        ofcs: ofcsResult.count || 0,
        sources: sourcesResult.count || 0,
        links: linksResult.count || 0
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
