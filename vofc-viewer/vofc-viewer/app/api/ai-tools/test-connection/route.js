import { NextResponse } from 'next/server';
import { testOllamaConnection } from '../../../../apps/backend/server/services/ai/vulnerabilityAnalyzer.js';

export async function GET() {
  try {
    const isConnected = await testOllamaConnection();
    return NextResponse.json({ 
      connected: isConnected, 
      message: isConnected ? "Ollama server is reachable." : "Ollama server is not reachable." 
    });
  } catch (error) {
    console.error('Ollama Test Connection Error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
