import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';

export async function GET() {
  try {
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    // Get documents from storage
    const { data: storageFiles, error: storageError } = await supabaseServer.storage
      .from('documents')
      .list('', { limit: 100 });
    
    if (storageError) {
      console.error('Error fetching storage files:', storageError);
    }
    
    // Get processing status from database
    const { data: processingData, error: processingError } = await supabaseServer
      .from('document_processing')
      .select('*')
      .order('updated_at', { ascending: false });
    
    if (processingError) {
      console.error('Error fetching processing data:', processingError);
    }
    
    // Organize files by status
    const documents = [];
    const processing = [];
    const completed = [];
    const failed = [];
    
    // Process storage files
    if (storageFiles) {
      for (const file of storageFiles) {
        const fileInfo = {
          filename: file.name,
          name: file.name,
          size: file.metadata?.size || 0,
          modified: file.updated_at || new Date().toISOString()
        };
        
        // Check if file has processing status
        const processingRecord = processingData?.find(p => p.filename === file.name);
        
        if (processingRecord) {
          if (processingRecord.status === 'processing') {
            processing.push({ ...fileInfo, status: 'processing' });
          } else if (processingRecord.status === 'completed') {
            completed.push({ ...fileInfo, status: 'completed' });
          } else if (processingRecord.status === 'failed') {
            failed.push({ ...fileInfo, status: 'failed', error: processingRecord.error_message });
          }
        } else {
          // No processing record means it's pending
          documents.push(fileInfo);
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      documents,
      processing,
      completed,
      failed,
      summary: {
        docs: documents.length,
        processing: processing.length,
        completed: completed.length,
        failed: failed.length
      }
    });
    
  } catch (error) {
    console.error('Error getting consolidated document status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get document status' },
      { status: 500 }
    );
  }
}
