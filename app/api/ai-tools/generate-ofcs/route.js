import { NextResponse } from 'next/server';
import { generateOFCs } from '../../../../apps/backend/server/services/ai/vulnerabilityAnalyzer.js';

export async function POST(request) {
  try {
    const { vulnerabilityText, discipline, count } = await request.json();
    const result = await generateOFCs(vulnerabilityText, discipline, count);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Generate OFCs Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
