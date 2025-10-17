import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for admin operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    console.log('🔍 Admin API: Loading submissions...');
    
    // Load pending vulnerability submissions
    const { data: vulnerabilitySubmissions, error: vulnError } = await supabase
      .from('submissions')
      .select('*')
      .eq('type', 'vulnerability')
      .order('created_at', { ascending: false })
      .limit(10);

    if (vulnError) {
      console.error('Error loading vulnerability submissions:', vulnError);
      return NextResponse.json({ error: 'Failed to load vulnerability submissions' }, { status: 500 });
    }

    // Load pending OFC submissions
    const { data: ofcSubmissions, error: ofcError } = await supabase
      .from('submissions')
      .select('*')
      .eq('type', 'ofc')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ofcError) {
      console.error('Error loading OFC submissions:', ofcError);
      return NextResponse.json({ error: 'Failed to load OFC submissions' }, { status: 500 });
    }

    // Load all submissions for debugging
    const { data: allSubmissions, error: allError } = await supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log('🔍 Admin API: Found submissions:', {
      vulnerabilities: vulnerabilitySubmissions?.length || 0,
      ofcs: ofcSubmissions?.length || 0,
      total: allSubmissions?.length || 0
    });

    return NextResponse.json({
      success: true,
      vulnerabilitySubmissions: vulnerabilitySubmissions || [],
      ofcSubmissions: ofcSubmissions || [],
      allSubmissions: allSubmissions || []
    });

  } catch (error) {
    console.error('Admin API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

