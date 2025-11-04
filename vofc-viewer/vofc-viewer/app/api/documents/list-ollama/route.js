import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Requesting file list from Ollama server');
    
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || 'https://ollama.frostech.site';
    
    // Call Ollama server to get file list
    // This would require a custom endpoint on the Ollama server
    // For now, we'll return a placeholder
    const response = await fetch(`${ollamaUrl}/api/files/list`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      return NextResponse.json({
        success: true,
        files: data.files || [],
        message: 'Files retrieved from Ollama server'
      });
    }

    // Fallback if Ollama server doesn't have this endpoint
    return NextResponse.json({
      success: true,
      files: [],
      message: 'Ollama server file listing endpoint not implemented yet. Implement /api/files/list on Ollama server to display documents.'
    });

  } catch (error) {
    console.error('❌ Error fetching files from Ollama:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch files from Ollama server',
      files: []
    });
  }
}

