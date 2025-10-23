import { NextResponse } from 'next/server';
import { vofcTools } from '../../../../apps/backend/server/services/tools/processRunner.js';

export async function POST(request) {
  try {
    const { jarPath, args = [] } = await request.json();
    
    if (!jarPath) {
      return NextResponse.json({ error: 'JAR path is required' }, { status: 400 });
    }

    const result = await vofcTools.runAnalysisModule(jarPath, args);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Run Analysis Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
