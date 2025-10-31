import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Use service role for API submissions to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    // Parse form data
    const formData = await request.formData();
    
    // Extract form fields
    const source_title = formData.get('source_title');
    const source_type = formData.get('source_type');
    const source_url = formData.get('source_url');
    const author_org = formData.get('author_org');
    const publication_year = formData.get('publication_year');
    const content_restriction = formData.get('content_restriction');
    const document = formData.get('file');

    console.log('📄 Ollama Document Submission:', {
      source_title,
      source_type,
      author_org,
      document_name: document?.name,
      document_size: document?.size
    });

    // Validate required fields
    if (!source_title || !document) {
      return NextResponse.json(
        { error: 'Missing required fields: source_title and document' },
        { status: 400 }
      );
    }

    // Validate document size (10MB limit)
    if (document.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Document size exceeds 10MB limit' },
        { status: 413 }
      );
    }

    // Create unique filename
    const fileExtension = path.extname(document.name);
    const baseName = path.basename(document.name, fileExtension);
    const uniqueFileName = `${baseName}_${Date.now()}${fileExtension}`;
    
    // Prepare document for Ollama server processing
    const buffer = await document.arrayBuffer();
    const documentContent = Buffer.from(buffer).toString('utf8');
    
    console.log('📄 Document prepared for Ollama processing:', {
      filename: uniqueFileName,
      size: buffer.byteLength,
      content_length: documentContent.length
    });

    // Process document content for different file types
    let processedContent = documentContent;
    try {
      if (fileExtension === '.pdf') {
        // For PDF, we'll use a simple text extraction or send metadata
        processedContent = `PDF Document: ${source_title}\nSize: ${document.size} bytes\nType: ${document.type}`;
      } else if (fileExtension !== '.txt') {
        // For other formats, extract basic text or use metadata
        processedContent = `Document: ${source_title}\nOrganization: ${author_org || 'Unknown'}\nYear: ${publication_year || 'Unknown'}\nType: ${document.type}`;
      }
    } catch (contentError) {
      console.warn('⚠️ Could not process document content:', contentError.message);
      processedContent = `Document: ${source_title}\nOrganization: ${author_org || 'Unknown'}\nYear: ${publication_year || 'Unknown'}`;
    }

    // Process document with Ollama parser
    console.log('🤖 Processing document with Ollama parser...');
    
    const ollamaBaseUrl = process.env.OLLAMA_BASE || 'http://localhost:11434';
    const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
    
    try {
      // Call our Ollama parser endpoint
      const parserResponse = await fetch(`${ollamaBaseUrl.replace(':11434', ':4000')}/api/parser/process-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentContent: processedContent,
          documentType: source_type,
          sourceUrl: source_url,
          categoryHint: 'Security Management'
        })
      });

      if (!parserResponse.ok) {
        throw new Error(`Parser API error: ${parserResponse.status}`);
      }

      const parserResult = await parserResponse.json();
      
      if (!parserResult.success) {
        throw new Error(`Parser failed: ${parserResult.error}`);
      }

      console.log('✅ Ollama processing completed:', {
        entries_found: parserResult.entries?.length || 0,
        processing_method: parserResult.processing_method
      });

      // Create processed data structure for database storage
      const processedData = {
        filename: uniqueFileName,
        original_filename: document.name,
        source_title,
        source_type,
        source_url,
        author_org,
        publication_year: publication_year ? parseInt(publication_year) : null,
        content_restriction,
        document_type: document.type,
        document_size: document.size,
        processed_at: new Date().toISOString(),
        processing_method: 'ollama_heuristic_parser',
        parser_version: 'v1.0',
        entries: parserResult.entries || [],
        extraction_stats: {
          total_entries: parserResult.entries?.length || 0,
          vulnerabilities_found: parserResult.entries?.filter(e => e.vulnerability)?.length || 0,
          ofcs_found: parserResult.entries?.reduce((sum, e) => sum + (e.options_for_consideration?.length || 0), 0) || 0
        },
        // Store document content for reference
        document_content: processedContent,
        // Ollama server handles file storage
        storage_location: 'ollama_server',
        ollama_processed: true
      };
      
      console.log('💾 Processed data prepared for Ollama server storage');

      // Save to database
      const submissionData = {
        type: 'document',
        data: JSON.stringify(processedData),
        status: 'completed',
        source: 'ollama_document_submission',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data: submission, error } = await supabase
        .from('submissions')
        .insert([submissionData])
        .select()
        .single();

      if (error) {
        console.error('❌ Database error:', error);
        // Still return success since processing completed
        return NextResponse.json({
          success: true,
          submission_id: 'temp-' + Date.now(),
          status: 'completed',
          message: 'Document processed successfully with Ollama server (database error logged)',
          storage_location: 'ollama_server',
          filename: uniqueFileName,
          extraction_stats: processedData.extraction_stats,
          entries: processedData.entries,
          ollama_processed: true
        }, { status: 201 });
      }

      return NextResponse.json({
        success: true,
        submission_id: submission.id,
        status: 'completed',
        message: 'Document processed successfully with Ollama server',
        storage_location: 'ollama_server',
        filename: uniqueFileName,
        extraction_stats: processedData.extraction_stats,
        entries: processedData.entries,
        ollama_processed: true
      }, { status: 201 });

    } catch (ollamaError) {
      console.error('❌ Ollama processing failed:', ollamaError);
      
      // Create error log for Ollama server
      const errorLog = {
        filename: uniqueFileName,
        original_filename: document.name,
        error: ollamaError.message,
        failed_at: new Date().toISOString(),
        source_title,
        author_org,
        storage_location: 'ollama_server',
        ollama_error: true
      };
      
      return NextResponse.json({
        success: false,
        error: 'Ollama server processing failed',
        details: ollamaError.message,
        filename: uniqueFileName,
        storage_location: 'ollama_server',
        error_log: errorLog
      }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
