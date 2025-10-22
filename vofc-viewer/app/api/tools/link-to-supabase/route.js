import { NextResponse } from 'next/server';
import { vofcTools } from '../../../../apps/backend/server/services/tools/processRunner.js';

export async function POST(request) {
  try {
    const { jsonPath } = await request.json();
    
    if (!jsonPath) {
      return NextResponse.json({ error: 'JSON path is required' }, { status: 400 });
    }

    const result = await vofcTools.linkToSupabase(jsonPath);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Link to Supabase Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
