import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function POST(request) {
  try {
    console.log('🔄 Manual sync: Adding documents from Ollama server...');
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not available' },
        { status: 500 }
      );
    }

    // Get document list from request body
    const { documents } = await request.json();
    
    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { success: false, error: 'Documents array is required in request body' },
        { status: 400 }
      );
    }

    console.log(`📁 Processing ${documents.length} documents from Ollama server`);

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
    const newFiles = documents.filter(file => 
      !existingFilenames.has(file.filename)
    );

    if (newFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'All documents already synced',
        synced: 0,
        total: documents.length
      });
    }

    // Create submission records for new files
    const submissionRecords = newFiles.map(file => ({
      type: 'ofc',
      data: JSON.stringify({
        source_title: file.title || file.filename.replace(/\.[^/.]+$/, ''), // Remove extension
        source_type: file.source_type || 'unknown',
        source_url: file.source_url || null,
        author_org: file.author_org || null,
        publication_year: file.publication_year || null,
        content_restriction: file.content_restriction || 'public',
        document_name: file.filename,
        document_type: file.type || getMimeType(file.filename),
        document_size: file.size || 0,
        local_file_path: file.path,
        storage_type: 'ollama_server',
        ollama_server_path: file.path,
        manual_sync: true
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

    console.log(`✅ Manual sync completed: ${insertedData.length} new documents`);
    
    return NextResponse.json({
      success: true,
      message: `Manual sync completed: ${insertedData.length} new documents`,
      synced: insertedData.length,
      total: documents.length,
      documents: insertedData
    });

  } catch (error) {
    console.error('❌ Manual sync error:', error);
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
