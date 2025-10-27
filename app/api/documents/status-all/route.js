import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    console.log('🔍 /api/documents/status-all called');
    
    // Return empty results for now - files are stored on Ollama server filesystem
    // In production, this would need to query the remote Ollama server's filesystem
    // or implement a file listing API on the Ollama server
    
    const response = {
      success: true,
      documents: [],
      processing: [],
      completed: [],
      failed: [],
      message: 'Document files are stored on Ollama server filesystem. Implement file listing API on Ollama server to display documents.'
    };
    
    console.log('📊 Document counts:', {
      documents: 0,
      processing: 0,
      completed: 0,
      failed: 0
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error getting all document status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get all document status' },
      { status: 500 }
    );
  }
}