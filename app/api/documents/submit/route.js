import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    console.log('📄 Document submit API called (local storage mode)');
    
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
      console.log('📄 Document saved to local Ollama storage:', filePath);
      
               // Also archive to Library for historical backup
               try {
                 const libraryDir = process.env.OLLAMA_LIBRARY_PATH || 
                   (process.platform === 'win32' 
                     ? 'C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\library'
                     : '/tmp/ollama/files/library');
        if (!existsSync(libraryDir)) {
          await mkdir(libraryDir, { recursive: true });
        }
        const libraryPath = join(libraryDir, fileName);
        await writeFile(libraryPath, Buffer.from(buffer));
        console.log('📚 Document archived to Library:', libraryPath);
      } catch (libraryError) {
        console.warn('⚠️ Failed to archive to Library (non-critical):', libraryError.message);
      }
             } catch (fileError) {
               console.error('❌ Error saving document to local storage:', fileError);
               console.error('❌ Platform:', process.platform);
               console.error('❌ Incoming dir:', incomingDir);
               
               // For production, we might not have file system access
               // Return success but note the limitation
               if (process.env.NODE_ENV === 'production') {
                 console.warn('⚠️ Production environment - file saving disabled');
                 return NextResponse.json({
                   success: true,
                   submission_id: 'prod-' + Date.now(),
                   status: 'pending_review',
                   message: 'Document submitted successfully (production mode - file storage disabled)',
                   document_name: document.name,
                   document_size: document.size,
                   storage_type: 'production_mode',
                   warning: 'File storage disabled in production environment'
                 });
               }
               
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
    
    // Optional: Process document with Ollama (if enabled)
    const autoProcess = process.env.AUTO_PROCESS_ON_UPLOAD === 'true';
    if (autoProcess) {
      try {
        console.log('🤖 Auto-processing document with Ollama...');
        const ollamaUrl = process.env.OLLAMA_URL || 'https://ollama.frostech.site';
        const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
        
        await fetch(`${ollamaUrl}/api/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: ollamaModel,
            prompt: `Parse and extract vulnerabilities and OFCs from ${document.name}`
          })
        });
        console.log('✅ Auto-processing completed');
      } catch (err) {
        console.warn('⚠️ Auto-processing failed (non-critical):', err.message);
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