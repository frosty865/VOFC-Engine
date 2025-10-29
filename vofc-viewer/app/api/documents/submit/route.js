import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    console.log('📄 Document submit API called (local storage mode)');
    
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

             // Save document file to local Ollama storage
             let savedFilePath = null;
             try {
               // Use local storage path from environment or default
               // Handle both Windows (local dev) and Linux (production) paths
               const incomingDir = process.env.OLLAMA_INCOMING_PATH || 
                 (process.platform === 'win32' 
                   ? 'C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\incoming'
                   : '/tmp/ollama/files/incoming');
      const timestamp = Date.now();
      const fileExtension = document.name.split('.').pop();
      const baseName = document.name.replace(/\.[^/.]+$/, '');
      const fileName = `${baseName}_${timestamp}.${fileExtension}`;
      const filePath = join(incomingDir, fileName);

      console.log('📁 Local Ollama storage details:');
      console.log('- Incoming directory:', incomingDir);
      console.log('- File name:', fileName);
      console.log('- File path:', filePath);
      console.log('- File size:', document.size, 'bytes');

      // Ensure upload directory exists
      if (!existsSync(incomingDir)) {
        await mkdir(incomingDir, { recursive: true });
        console.log('✅ Created upload directory:', incomingDir);
      }

      // Convert file to buffer and save locally
      const buffer = await document.arrayBuffer();
      await writeFile(filePath, Buffer.from(buffer));
      
      savedFilePath = filePath;
      console.log('📄 Document saved to incoming folder:', filePath);
      console.log('📝 Document will be moved to library after successful processing');
      
      // Also save to Supabase storage as backup/fallback
      if (supabaseAdmin) {
        try {
          const { error: uploadError } = await supabaseAdmin.storage
            .from('submissions')
            .upload(fileName, buffer, {
              contentType: document.type,
              upsert: true
            });
          
          if (uploadError) {
            console.warn('⚠️ Failed to upload to Supabase storage:', uploadError.message);
          } else {
            console.log('✅ Document also saved to Supabase storage as backup');
          }
        } catch (supabaseError) {
          console.warn('⚠️ Supabase storage upload failed (non-critical):', supabaseError.message);
        }
      }
             } catch (fileError) {
               console.error('❌ Error saving document to local storage:', fileError);
               console.error('❌ Platform:', process.platform);
               console.error('❌ Incoming dir:', incomingDir);
               
               return NextResponse.json({
                 success: false,
                 error: 'Failed to save document file locally: ' + fileError.message
               }, { status: 500 });
             }

    console.log('✅ Document saved to local storage successfully');
    
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
            storage_type: 'local_filesystem'
          }),
          status: 'pending_review',
          source: 'document_submission',
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
    if (autoProcess && savedFilePath) {
      try {
        console.log('🤖 Auto-processing document with VOFC parser...');
        
        // Trigger processing asynchronously (don't wait for it)
        // Use relative URL for server-side calls
        const baseUrl = process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}`
          : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
        
        fetch(`${baseUrl}/api/documents/process-vofc`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: fileName,
            submissionId: submissionId || undefined
          })
        }).catch(err => {
          console.warn('⚠️ Auto-processing request failed (non-critical):', err.message);
        });
        
        console.log('✅ Auto-processing triggered (running in background)');
      } catch (err) {
        console.warn('⚠️ Auto-processing setup failed (non-critical):', err.message);
      }
    }
    
    return NextResponse.json({
      success: true,
      submission_id: submissionId || 'local-' + Date.now(),
      status: 'pending_review',
      message: 'Document submitted successfully to local storage',
      file_path: savedFilePath,
      document_name: document.name,
      document_size: document.size,
      storage_type: 'local_filesystem',
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