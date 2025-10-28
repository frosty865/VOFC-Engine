import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function POST() {
  try {
    console.log('🔄 Real Ollama server sync - connecting to actual server...');
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not available' },
        { status: 500 }
      );
    }

    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:5000';
    
    // Try to connect to your actual Ollama server
    let ollamaFiles = [];
    try {
      // First, test if Ollama server is reachable
      const healthResponse = await fetch(`${ollamaUrl}/api/version`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      
      if (!healthResponse.ok) {
        throw new Error(`Ollama server not reachable: ${healthResponse.status}`);
      }
      
      console.log('✅ Ollama server is reachable');
      
      // Try to get file list - this will fail if endpoint doesn't exist
      const filesResponse = await fetch(`${ollamaUrl}/api/files/list`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      });
      
      if (filesResponse.ok) {
        const data = await filesResponse.json();
        ollamaFiles = data.files || [];
        console.log(`📁 Found ${ollamaFiles.length} files on Ollama server`);
      } else {
        console.log('⚠️ Ollama server does not have /api/files/list endpoint');
        return NextResponse.json({
          success: false,
          error: 'Ollama server does not have file listing endpoint. Implement /api/files/list on your Ollama server.',
          ollama_reachable: true,
          files_endpoint_available: false
        });
      }
      
    } catch (error) {
      console.error('❌ Cannot connect to Ollama server:', error.message);
      return NextResponse.json({
        success: false,
        error: `Cannot connect to Ollama server: ${error.message}`,
        ollama_reachable: false,
        ollama_url: ollamaUrl
      });
    }

    // Get existing submissions to avoid duplicates
    const { data: existingSubmissions, error: fetchError } = await supabaseAdmin
      .from('submissions')
      .select('data')
      .eq('source', 'ollama_server_sync');

    if (fetchError) {
      console.error('❌ Error fetching existing submissions:', fetchError);
      return NextResponse.json(
        { success: false, error: 'Failed to check existing submissions' },
        { status: 500 }
      );
    }

    // Extract existing filenames to avoid duplicates
    const existingFilenames = new Set();
    existingSubmissions.forEach(sub => {
      try {
        const data = JSON.parse(sub.data);
        if (data.document_name) {
          existingFilenames.add(data.document_name);
        }
      } catch (e) {
        // Ignore parsing errors
      }
    });

    // Filter out files that are already tracked
    const newFiles = ollamaFiles.filter(file => 
      !existingFilenames.has(file.filename)
    );

    if (newFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All documents already synced',
        synced: 0,
        total: ollamaFiles.length,
        ollama_reachable: true,
        files_endpoint_available: true
      });
    }

    // Create submission records for new files
    const submissionRecords = newFiles.map(file => ({
      type: 'ofc',
      data: JSON.stringify({
        source_title: file.filename.replace(/\.[^/.]+$/, ''), // Remove extension
        source_type: 'unknown',
        source_url: null,
        author_org: null,
        publication_year: null,
        content_restriction: 'public',
        document_name: file.filename,
        document_type: getMimeType(file.filename),
        document_size: file.size || 0,
        local_file_path: file.path,
        storage_type: 'ollama_server',
        ollama_server_path: file.path,
        real_sync: true
      }),
      status: 'pending_review',
      source: 'ollama_server_sync',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert new submissions
    const { data: insertedData, error: insertError } = await supabaseAdmin
      .from('submissions')
      .insert(submissionRecords)
      .select();

    if (insertError) {
      console.error('❌ Error inserting submissions:', insertError);
      return NextResponse.json(
        { success: false, error: 'Failed to insert submissions' },
        { status: 500 }
      );
    }

    console.log(`✅ Real sync completed: ${insertedData.length} new documents`);
    
    return NextResponse.json({
      success: true,
      message: `Real sync completed: ${insertedData.length} new documents`,
      synced: insertedData.length,
      total: ollamaFiles.length,
      documents: insertedData,
      ollama_reachable: true,
      files_endpoint_available: true
    });

  } catch (error) {
    console.error('❌ Real sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get MIME type from filename
function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const mimeTypes = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'rtf': 'application/rtf',
    'odt': 'application/vnd.oasis.opendocument.text'
  };
  return mimeTypes[ext] || 'application/octet-stream';
}
