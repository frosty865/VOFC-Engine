import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    console.log('🔍 /api/documents/status-all called');
    
    // Check if Supabase admin is configured
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client not initialized');
      return NextResponse.json({
        success: false,
        error: 'Database not configured'
      }, { status: 500 });
    }
    
    // Query submissions table for document status
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('id, type, status, data, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error querying submissions:', error);
      return NextResponse.json({
        success: false,
        error: error.message
      }, { status: 500 });
    }
    
    // Categorize by status
    const documents = submissions?.filter(s => s.status === 'pending_review') || [];
    const processing = submissions?.filter(s => s.status === 'processing') || [];
    const completed = submissions?.filter(s => s.status === 'completed') || [];
    const failed = submissions?.filter(s => s.status === 'failed' || s.status === 'error') || [];
    
    // Parse file information from submissions
    const parseFileInfo = (submission) => {
      try {
        const data = typeof submission.data === 'string' ? JSON.parse(submission.data) : submission.data;
        return {
          filename: data.document_name || 'Unknown',
          name: data.document_name || 'Unknown',
          size: data.document_size || 0,
          modified: submission.updated_at,
          created: submission.created_at,
          type: data.source_type || 'unknown',
          id: submission.id
        };
      } catch (e) {
        return {
          filename: 'Unknown',
          name: 'Unknown',
          size: 0,
          modified: submission.updated_at,
          created: submission.created_at,
          type: 'unknown',
          id: submission.id
        };
      }
    };
    
    const response = {
      success: true,
      documents: documents.slice(0, 10).map(parseFileInfo),
      processing: processing.slice(0, 10).map(parseFileInfo),
      completed: completed.slice(0, 10).map(parseFileInfo),
      failed: failed.slice(0, 10).map(parseFileInfo)
    };
    
    console.log('📊 Document counts:', {
      documents: documents.length,
      processing: processing.length,
      completed: completed.length,
      failed: failed.length
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