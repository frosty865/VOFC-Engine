import { NextResponse } from 'next/server';
import { getServerClient } from '../../lib/supabase-manager';

// Get all disciplines
export async function GET(request) {
  try {
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const active = searchParams.get('active');

    let query = supabaseServer
      .from('disciplines')
      .select('*')
      .order('category, name');

    // Filter by category if provided
    if (category) {
      query = query.eq('category', category);
    }

    // Filter by active status if provided
    if (active !== null) {
      query = query.eq('is_active', active === 'true');
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      disciplines: data || []
    });

  } catch (error) {
    console.error('Error fetching disciplines:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch disciplines' },
      { status: 500 }
    );
  }
}

// Create a new discipline
export async function POST(request) {
  try {
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }

    const { name, description, category, is_active = true } = await request.json();

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Discipline name is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabaseServer
      .from('disciplines')
      .insert({
        name,
        description,
        category,
        is_active
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      discipline: data
    });

  } catch (error) {
    console.error('Error creating discipline:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create discipline' },
      { status: 500 }
    );
  }
}
