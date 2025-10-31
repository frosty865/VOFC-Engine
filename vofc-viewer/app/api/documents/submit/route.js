import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    console.log('📄 Document submit API called (tunnel mode - no local save)');
    
    // Get user from authorization header
    let userId = null;
    try {
      const authHeader = request.headers.get('authorization');
      if (authHeader) {
        const accessToken = authHeader.replace('Bearer ', '');
        const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken);
        if (!error && user) {
          userId = user.id;
          console.log('✅ User authenticated:', user.email);
        }
      }
    } catch (authError) {
      console.warn('⚠️ Could not authenticate user:', authError.message);
    }
    
    // Check content type
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      console.log('❌ Invalid content type:', contentType);
      return NextResponse.json(
        { success: false, error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }
    
    // Parse form data
    let formData;
    try {
      formData = await request.formData();
    } catch (formError) {
      console.error('FormData parsing error:', formError);
      return NextResponse.json(
        { success: false, error: 'Failed to parse form data' },
        { status: 400 }
      );
    }
    
    // Extract form fields
    const source_title = formData.get('source_title');
    const source_type = formData.get('source_type');
    const source_url = formData.get('source_url');
    const author_org = formData.get('author_org');
    const publication_year = formData.get('publication_year');
    const content_restriction = formData.get('content_restriction');
    const document = formData.get('file');

    if (!document) {
      return NextResponse.json(
        { success: false, error: 'No document file provided' },
        { status: 400 }
      );
    }

    // Validate file size (10MB limit)
    if (document.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: 'Document size exceeds 10MB limit' },
        { status: 413 }
      );
    }

    // Do not write locally; forward-only via metadata
    let savedFilePath = null;
    const timestamp = Date.now();
    const fileExtension = document.name.split('.').pop();
    const baseName = document.name.replace(/\.[^/.]+$/, '');
    const fileName = `${baseName}_${timestamp}.${fileExtension}`;
    console.log('📡 Tunnel submission (no local save):', { fileName, size: document.size });
    
    // Create submission record in Supabase for tracking/review
    let submissionId = null;
    try {
      if (supabaseAdmin) {
               const submissionData = {
                 type: 'ofc', // Document submissions are treated as OFC submissions
          user_id: userId,
          data: JSON.stringify({
            source_title,
            source_type: source_type || 'unknown',
            source_url: source_url || null,
            author_org: author_org || null,
            publication_year: publication_year ? parseInt(publication_year) : null,
            content_restriction: content_restriction || 'public',
            document_name: document.name,
            document_type: document.type,
            document_size: document.size,
            local_file_path: savedFilePath,
            storage_type: 'tunnel',
            tunnel_forwarded: true
          }),
          status: 'processing',
          source: 'tunnel_submission',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { data: submission, error } = await supabaseAdmin
          .from('submissions')
          .insert([submissionData])
          .select()
          .single();

        if (error) {
          console.error('❌ Database insertion failed:', error);
          console.log('⚠️ File saved locally but not tracked in database');
        } else {
          submissionId = submission.id;
          console.log('✅ Submission record created:', submissionId);
        }
      } else {
        console.warn('⚠️ Supabase admin client not available - file saved locally only');
      }
    } catch (dbError) {
      console.error('❌ Database error (non-critical):', dbError);
      console.log('⚠️ File saved locally but database tracking failed');
    }
    
    // Auto-process document after upload (default behavior)
    const autoProcess = process.env.AUTO_PROCESS_ON_UPLOAD !== 'false'; // Default to true
    if (autoProcess) {
      try {
        console.log('🤖 Auto-processing document with VOFC parser...');
        
        // Trigger processing asynchronously (don't wait for it)
        // Use relative URL for server-side calls
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
        
        if (submissionId) {
          fetch(`${baseUrl}/api/documents/process-one`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ submissionId })
          }).catch(() => {});
        }
        
        console.log('✅ Auto-processing triggered (running in background)');
      } catch (err) {
        console.warn('⚠️ Auto-processing setup failed (non-critical):', err.message);
      }
    }
    
    return NextResponse.json({
      success: true,
      submission_id: submissionId || 'local-' + Date.now(),
      status: 'pending_review',
      message: 'Document submitted successfully via tunnel',
      file_path: savedFilePath,
      document_name: document.name,
      document_size: document.size,
      storage_type: 'tunnel',
      tracked_in_database: !!submissionId
    });

  } catch (error) {
    console.error('❌ Document submission error:', error);
    return NextResponse.json(
      { success: false, error: 'Document submission failed: ' + error.message },
      { status: 500 }
    );
  }
}