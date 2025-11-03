import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase-admin.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sector = searchParams.get('sector');
    const subsector = searchParams.get('subsector');
    const discipline = searchParams.get('discipline');
    
    console.log('📊 Fetching public VOFC data...', { sector, subsector, discipline });
    
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 });
    }

    // Build query for vulnerabilities with filters
    let vulnerabilitiesQuery = supabaseAdmin
      .from('submission_vulnerabilities')
      .select('id, vulnerability_text, question, what, so_what, sector, subsector, discipline, created_at')
      .order('created_at', { ascending: false });

    // Apply filters
    if (sector) {
      vulnerabilitiesQuery = vulnerabilitiesQuery.eq('sector', sector);
    }
    if (subsector) {
      vulnerabilitiesQuery = vulnerabilitiesQuery.eq('subsector', subsector);
    }
    if (discipline) {
      vulnerabilitiesQuery = vulnerabilitiesQuery.eq('discipline', discipline);
    }

    // Get filter options (sectors, subsectors, disciplines)
    const [vulnerabilitiesResult, sectorsResult, subsectorsResult, disciplinesResult] = await Promise.all([
      vulnerabilitiesQuery.limit(1000),
      supabaseAdmin
        .from('sectors')
        .select('id, name')
        .order('name'),
      supabaseAdmin
        .from('subsectors')
        .select('id, name, sector_id')
        .order('name'),
      supabaseAdmin
        .from('submission_vulnerabilities')
        .select('discipline')
        .not('discipline', 'is', null)
        .order('discipline')
    ]);

    const vulnerabilities = vulnerabilitiesResult.data || [];
    const sectors = sectorsResult.data || [];
    const subsectors = subsectorsResult.data || [];
    
    // Get unique disciplines
    const uniqueDisciplines = [...new Set((disciplinesResult.data || []).map(d => d.discipline).filter(Boolean))].sort();

    // Get distinct sectors and subsectors from vulnerabilities table
    const distinctSectors = [...new Set(vulnerabilities.map(v => v.sector).filter(Boolean))].sort();
    const distinctSubsectors = [...new Set(vulnerabilities.map(v => v.subsector).filter(Boolean))].sort();

    console.log(`📈 Found ${vulnerabilities.length} vulnerabilities, ${sectors.length} sectors, ${subsectors.length} subsectors, ${uniqueDisciplines.length} disciplines`);

    return NextResponse.json({
      success: true,
      vulnerabilities,
      filters: {
        sectors: distinctSectors,
        subsectors: distinctSubsectors,
        disciplines: uniqueDisciplines
      },
      stats: {
        vulnerability_count: vulnerabilities.length,
        sector_count: distinctSectors.length,
        subsector_count: distinctSubsectors.length,
        discipline_count: uniqueDisciplines.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching public VOFC data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch VOFC data',
      vulnerabilities: [],
      filters: {
        sectors: [],
        subsectors: [],
        disciplines: []
      },
      stats: {
        vulnerability_count: 0,
        sector_count: 0,
        subsector_count: 0,
        discipline_count: 0
      }
    });
  }
}
