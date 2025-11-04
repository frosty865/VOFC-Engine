import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 /api/documents/status called - using Ollama server');
    
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || 'https://ollama.frostech.site';
    
    // Create timeout controller for fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const filesResponse = await fetch(`${ollamaUrl}/api/files/list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!filesResponse.ok) {
      console.error('❌ Error fetching files from Ollama server:', filesResponse.status);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch files from Ollama server' },
        { status: filesResponse.status }
      );
    }
    
    const ollamaData = await filesResponse.json();
    const ollamaFiles = ollamaData.files || [];
    
    // Format files with status (all are pending_review by default since we don't track processing state)
    const statuses = ollamaFiles.map(file => ({
      filename: file.filename,
      status: 'pending_review',
      timestamp: file.modified || file.created,
      size: file.size,
      path: file.path
    }));
    
    console.log(`📊 Found ${statuses.length} files on Ollama server`);
    
    return NextResponse.json({
      success: true,
      statuses: statuses
    });
    
  } catch (error) {
    console.error('Error getting processing status:', error);
    return NextResponse.json(
      { success: false, error: `Failed to get processing status: ${error.message}` },
      { status: 500 }
    );
  }
}