import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
}

export async function GET(request) {
  try {
    console.log('🔍 Vulnerabilities API endpoint called');
    
    // Get the access token from cookies
    const cookieHeader = request.headers.get('cookie');
    
    if (!cookieHeader) {
      console.log('❌ No cookies found');
      return NextResponse.json(
        { success: false, error: 'No session found' },
        { status: 401 }
      );
    }

    // Extract the access token from cookies
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    const accessToken = cookies['sb-access-token'];

    if (!accessToken) {
      console.log('❌ No access token found in cookies');
      return NextResponse.json(
        { success: false, error: 'No access token found' },
        { status: 401 }
      );
    }

    // Create service role client to verify the token and fetch data
    const serviceSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Verify the access token
    const { data: { user }, error: authError } = await serviceSupabase.auth.getUser(accessToken);

    if (authError || !user) {
      console.log('❌ Token verification failed:', authError?.message);
      return NextResponse.json(
        { success: false, error: 'Invalid token' },
        { status: 401 }
      );
    }

    console.log('✅ Token verified for user:', user.email);

    // Get all vulnerabilities
    const { data: vulnerabilities, error: vulnError } = await serviceSupabase
      .from('vulnerabilities')
      .select('*')
      .order('created_at', { ascending: false });

    if (vulnError) {
      console.error('❌ Error fetching vulnerabilities:', vulnError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vulnerabilities' },
        { status: 500 }
      );
    }

    // Get all vulnerability-OFC links
    const { data: links, error: linkError } = await serviceSupabase
      .from('vulnerability_ofc_links')
      .select('*');

    if (linkError) {
      console.error('❌ Error fetching vulnerability-OFC links:', linkError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch vulnerability-OFC links' },
        { status: 500 }
      );
    }

    // Get all OFCs
    const { data: ofcs, error: ofcError } = await serviceSupabase
      .from('options_for_consideration')
      .select('*');

    if (ofcError) {
      console.error('❌ Error fetching OFCs:', ofcError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch OFCs' },
        { status: 500 }
      );
    }

    // Get all OFC-Source links
    const { data: ofcSources, error: ofcSourceError } = await serviceSupabase
      .from('ofc_sources')
      .select('*');

    if (ofcSourceError) {
      console.error('❌ Error fetching OFC-Source links:', ofcSourceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch OFC-Source links' },
        { status: 500 }
      );
    }

    // Get all sources
    const { data: sources, error: sourceError } = await serviceSupabase
      .from('sources')
      .select('*');

    if (sourceError) {
      console.error('❌ Error fetching sources:', sourceError);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sources' },
        { status: 500 }
      );
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

    console.log(`✅ Returning ${vulnerabilitiesWithOFCs.length} vulnerabilities with OFCs`);

    return NextResponse.json(vulnerabilitiesWithOFCs);

  } catch (error) {
    console.error('❌ Vulnerabilities API error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
