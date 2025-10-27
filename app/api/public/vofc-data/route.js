import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    console.log('📊 Fetching public VOFC data...');
    
    if (!supabaseAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 });
    }

    // Get public data using admin client (bypasses RLS)
    const [vulnerabilitiesResult, ofcsResult] = await Promise.all([
      supabaseAdmin
        .from('vulnerabilities')
        .select('id, vulnerability, discipline, source')
        .limit(100),
      supabaseAdmin
        .from('options_for_consideration')
        .select('id, option_text, discipline, source')
        .limit(100)
    ]);

    const vulnerabilities = vulnerabilitiesResult.data || [];
    const ofcs = ofcsResult.data || [];

    console.log(`📈 Found ${vulnerabilities.length} vulnerabilities and ${ofcs.length} OFCs`);

    return NextResponse.json({
      success: true,
      vulnerabilities,
      options_for_consideration: ofcs,
      stats: {
        vulnerability_count: vulnerabilities.length,
        ofc_count: ofcs.length
      }
    });

  } catch (error) {
    console.error('❌ Error fetching public VOFC data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch VOFC data',
      vulnerabilities: [],
      options_for_consideration: [],
      stats: {
        vulnerability_count: 0,
        ofc_count: 0
      }
    });
  }
}
