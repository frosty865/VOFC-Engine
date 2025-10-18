import { supabase } from './supabaseClient';

// Mock data for development when database is not available
const mockQuestions = [
  {
    id: 1,
    question_text: "Do you utilize cameras?",
    sector_id: 1,
    discipline: "Physical Security",
    source: "VOFC Library",
    page_number: 1,
    display_order: 1
  },
  {
    id: 2,
    question_text: "Analog or digital?",
    sector_id: 1,
    discipline: "Physical Security",
    source: "VOFC Library",
    page_number: 1,
    display_order: 2
  },
  {
    id: 3,
    question_text: "Do you have access control systems?",
    sector_id: 1,
    discipline: "Physical Security",
    source: "VOFC Library",
    page_number: 2,
    display_order: 3
  },
  {
    id: 4,
    question_text: "Are your systems connected to the internet?",
    sector_id: 2,
    discipline: "Cybersecurity",
    source: "VOFC Library",
    page_number: 3,
    display_order: 4
  },
  {
    id: 5,
    question_text: "Do you have backup systems in place?",
    sector_id: 2,
    discipline: "Cybersecurity",
    source: "VOFC Library",
    page_number: 4,
    display_order: 5
  }
];

const mockSectors = [
  { id: 1, sector_name: "Physical Security" },
  { id: 2, sector_name: "Cybersecurity" },
  { id: 3, sector_name: "Personnel Security" },
  { id: 4, sector_name: "Operational Security" }
];

const mockVulnerabilities = [
  {
    id: 1,
    vulnerability: "Unauthorized Physical Access",
    discipline: "Physical Security",
    source: "VOFC Library",
    sector_id: null,
    subsector_id: null
  },
  {
    id: 2,
    vulnerability: "Network Intrusion",
    discipline: "Cybersecurity",
    source: "VOFC Library",
    sector_id: null,
    subsector_id: null
  },
  {
    id: 3,
    vulnerability: "Insider Threat",
    discipline: "Personnel Security",
    source: "VOFC Library",
    sector_id: null,
    subsector_id: null
  }
];

const mockOFCs = [
  {
    id: 1,
    option_text: "Implement multi-factor authentication for all systems",
    discipline: "Cybersecurity",
    source: "VOFC Library",
    sector_id: null,
    subsector_id: null
  },
  {
    id: 2,
    option_text: "Install security cameras with 24/7 monitoring",
    discipline: "Physical Security",
    source: "VOFC Library",
    sector_id: null,
    subsector_id: null
  }
];

// Questions functionality removed - new schema only includes Vulnerabilities, OFCs, and Sources

// Sectors functionality removed - new schema only includes Vulnerabilities, OFCs, and Sources

export async function fetchVulnerabilities() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('Using mock data - Supabase not configured');
    return mockVulnerabilities;
  }

  try {
    const { data, error } = await supabase
      .from('vulnerabilities')
      .select('*')
      .order('id');
    
    if (error) {
      console.error('Error fetching vulnerabilities:', error);
      console.log('Falling back to mock data');
      return mockVulnerabilities;
    }
    
    // Debug: log the fetched data
    console.log('Fetched vulnerabilities count:', data?.length);
    if (data && data.length > 0) {
      console.log('First vulnerability sample:', JSON.stringify(data[0], null, 2));
    }
    
    // Return data as-is since schema is now properly structured
    return data || [];
  } catch (error) {
    console.error('Database connection failed, using mock data:', error);
    return mockVulnerabilities;
  }
}

export async function fetchOFCs() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('Using mock data - Supabase not configured');
    return mockOFCs;
  }

  try {
    const { data, error } = await supabase
      .from('options_for_consideration')
      .select(`
        *,
        ofc_sources (
          *,
          sources (
            "reference number",
            source
          )
        )
      `)
      .order('id');
    
    if (error) {
      console.error('Error fetching OFCs:', error);
      console.log('Falling back to mock data');
      return mockOFCs;
    }
    
    // Debug: log the fetched data
    console.log('Fetched OFCs count:', data?.length);
    if (data && data.length > 0) {
      console.log('First OFC sample:', JSON.stringify(data[0], null, 2));
    }
    
    // Return data as-is since schema is now properly structured
    return data || [];
  } catch (error) {
    console.error('Database connection failed, using mock data:', error);
    return mockOFCs;
  }
}

// Function to fetch vulnerability-OFC links
export async function fetchVulnerabilityOFCLinks() {
  // Check if Supabase is configured
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.log('Using mock data - Supabase not configured');
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('vulnerability_ofc_links')
      .select('*');
    
    if (error) {
      console.error('Error fetching vulnerability-OFC links:', error);
      return [];
    }
    
    console.log('Fetched vulnerability-OFC links count:', data?.length);
    if (data && data.length > 0) {
      console.log('First link sample:', JSON.stringify(data[0], null, 2));
    }
    return data || [];
  } catch (error) {
    console.error('Database connection failed for vulnerability-OFC links:', error);
    return [];
  }
}

// Function to get OFCs for a specific vulnerability
export async function getOFCsForVulnerability(vulnerabilityId) {
  try {
    const { data, error } = await supabase
      .from('vulnerability_ofc_links')
      .select(`
        options_for_consideration (
          id,
          option_text,
          discipline,
          source,
          sector_id,
          subsector_id
        )
      `)
      .eq('vulnerability_id', vulnerabilityId);
    
    if (error) {
      console.error('Error fetching OFCs for vulnerability:', error);
      return [];
    }
    
    return data?.map(link => link.options_for_consideration).filter(Boolean) || [];
  } catch (error) {
    console.error('Database connection failed for vulnerability OFCs:', error);
    return [];
  }
}

// Function to fetch sectors
export async function fetchSectors() {
  try {
    const { data, error } = await supabase
      .from('sectors')
      .select('*')
      .order('sector_name');
    
    if (error) {
      console.error('Error fetching sectors:', error);
      return [];
    }
    
    console.log('Fetched sectors count:', data?.length);
    return data || [];
  } catch (error) {
    console.error('Database connection failed for sectors:', error);
    return [];
  }
}

// Function to fetch subsectors
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
    
    console.log('Fetched subsectors count:', data?.length);
    return data || [];
  } catch (error) {
    console.error('Database connection failed for subsectors:', error);
    return [];
  }
}

