import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    console.log('🔍 /api/documents/status-all called');
    
    // Auto-sync documents from Ollama server first
    try {
      console.log('🔄 Auto-syncing documents from Ollama server...');
      const syncResponse = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/documents/auto-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (syncResponse.ok) {
        const syncData = await syncResponse.json();
        if (syncData.synced > 0) {
          console.log(`✅ Auto-synced ${syncData.synced} new documents`);
        }
      }
    } catch (syncError) {
      console.warn('⚠️ Auto-sync failed (non-critical):', syncError.message);
    }
    
    // Read from Supabase submissions table instead of local directories
    if (!supabaseAdmin) {
      console.warn('⚠️ Supabase admin client not available - using fallback');
      return NextResponse.json({
        success: true,
        documents: [],
        processing: [],
        completed: [],
        failed: [],
        library: [],
        message: 'Supabase not configured - using empty data'
      });
    }

    // Get all submissions from the database
    const { data: submissions, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching submissions:', error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch submissions from database' },
        { status: 500 }
      );
    }

    // Categorize submissions by status
    const documents = submissions.filter(s => s.status === 'pending_review');
    const processing = submissions.filter(s => s.status === 'processing');
    const completed = submissions.filter(s => s.status === 'approved');
    const failed = submissions.filter(s => s.status === 'rejected');
    
    // Library is all submissions (for historical backup)
    const library = submissions;

    const response = {
      success: true,
      documents,
      processing,
      completed,
      failed,
      library
    };
    
    console.log('📊 Document counts from database:', {
      documents: documents.length,
      processing: processing.length,
      completed: completed.length,
      failed: failed.length,
      library: library.length
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error getting all document status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}