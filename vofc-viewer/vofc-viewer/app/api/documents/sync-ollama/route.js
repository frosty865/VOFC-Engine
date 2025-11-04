import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function POST(request) {
  try {
    console.log('🔄 Syncing documents from Ollama server to database...');
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase admin client not available' },
        { status: 500 }
      );
    }

    // Get the list of documents from the request body
    const { documents } = await request.json();
    
    if (!documents || !Array.isArray(documents)) {
      return NextResponse.json(
        { success: false, error: 'Documents array is required' },
        { status: 400 }
      );
    }

    // Convert Ollama documents to submission records
    const submissionRecords = documents.map(doc => ({
      type: 'ofc', // Document submissions are treated as OFC submissions
      data: JSON.stringify({
        source_title: doc.title || doc.filename || 'Unknown Document',
        source_type: 'unknown',
        source_url: null,
        author_org: null,
        publication_year: null,
        content_restriction: 'public',
        document_name: doc.filename,
        document_type: doc.type || 'application/octet-stream',
        document_size: doc.size || 0,
        local_file_path: doc.path,
        storage_type: 'ollama_server',
        ollama_server_path: doc.path
      }),
      status: 'pending_review',
      source: 'ollama_server_sync',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Insert into database
    const { data, error } = await supabaseAdmin
      .from('submissions')
      .insert(submissionRecords)
      .select();

    if (error) {
      console.error('❌ Error syncing documents:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to sync documents to database' },
        { status: 500 }
      );
    }

    console.log('✅ Successfully synced documents:', data.length);
    
    return NextResponse.json({
      success: true,
      message: `Successfully synced ${data.length} documents to database`,
      documents: data
    });

  } catch (error) {
    console.error('❌ Sync error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
