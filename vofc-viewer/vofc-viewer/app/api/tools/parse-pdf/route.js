import { NextResponse } from 'next/server';
import { vofcTools } from '../../../../apps/backend/server/services/tools/processRunner.js';

export async function POST(request) {
  try {
    const { pdfPath } = await request.json();
    
    if (!pdfPath) {
      return NextResponse.json({ error: 'PDF path is required' }, { status: 400 });
    }

    const result = await vofcTools.parseVOFCDocument(pdfPath);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Parse PDF Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
