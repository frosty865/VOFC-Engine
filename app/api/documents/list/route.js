import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    // List files from Supabase storage
    const { data: files, error } = await supabaseAdmin.storage
      .from('vofc_seed')
      .list('documents', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' }
      });
    
    if (error) {
      console.error('Error listing documents from storage:', error);
      return NextResponse.json({
        success: false,
        error: 'Failed to list documents'
      }, { status: 500 });
    }
    
    // Transform storage files to document format
    const documents = files.map(file => ({
      filename: file.name,
      size: file.metadata?.size || 0,
      modified: file.updated_at || file.created_at
    }));
    
    return NextResponse.json({
      success: true,
      documents: documents
    });
    
  } catch (error) {
    console.error('Error listing documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to list documents' },
      { status: 500 }
    );
  }
}
