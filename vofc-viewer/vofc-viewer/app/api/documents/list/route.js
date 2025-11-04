import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Listing documents from Ollama server');
    
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
      console.error('Error listing documents from Ollama:', filesResponse.status);
      return NextResponse.json({
        success: false,
        error: 'Failed to list documents from Ollama server'
      }, { status: filesResponse.status });
    }
    
    const data = await filesResponse.json();
    const ollamaFiles = data.files || [];
    
    // Transform Ollama files to document format
    const documents = ollamaFiles.map(file => ({
      filename: file.filename,
      size: file.size || 0,
      modified: file.modified || file.created,
      path: file.path,
      created: file.created
    }));
    
    console.log(`📁 Listed ${documents.length} documents from Ollama server`);
    
    return NextResponse.json({
      success: true,
      documents: documents
    });
    
  } catch (error) {
    console.error('Error listing documents from Ollama:', error);
    return NextResponse.json(
      { success: false, error: `Failed to list documents: ${error.message}` },
      { status: 500 }
    );
  }
}
