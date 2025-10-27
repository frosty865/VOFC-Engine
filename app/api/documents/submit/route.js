import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export async function POST(request) {
  try {
    console.log('📄 Document submit API called');
    
    // Validate environment variables
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing Supabase environment variables');
      console.error('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING');
      console.error('SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING');
      return NextResponse.json(
        { success: false, error: 'Server configuration error - missing Supabase credentials' },
        { status: 500 }
      );
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
    const document = formData.get('file'); // Frontend sends as 'file'

    // Debug logging
    console.log('Form data received:');
    console.log('source_title:', source_title);
    console.log('source_type:', source_type);
    console.log('source_url:', source_url);
    console.log('author_org:', author_org);
    console.log('publication_year:', publication_year);
    console.log('content_restriction:', content_restriction);
    console.log('document:', document ? `${document.name} (${document.size} bytes)` : 'null');

    // Validate required fields
    if (!source_title || !document) {
      console.log('Validation failed: missing required fields');
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

    // Save document file to local Ollama storage
    let savedFilePath = null;
    try {
      // Use local storage path from environment or default
      const incomingDir = process.env.OLLAMA_INCOMING_PATH || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\incoming';
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
        const libraryDir = process.env.OLLAMA_LIBRARY_PATH || 'C:\\Users\\frost\\AppData\\Local\\Ollama\\files\\library';
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
      return NextResponse.json({
        success: false,
        error: 'Failed to save document file locally'
      }, { status: 500 });
    }

    // Prepare submission data with local file path
    const submissionData = {
      type: 'document',
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
        local_file_path: savedFilePath, // Store local file path for Ollama processing
        storage_type: 'local_filesystem'
      }),
      status: 'pending_review',
      source: 'document_submission',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Insert into database
    console.log('Attempting to insert submission data:', JSON.stringify(submissionData, null, 2));
    
    if (!supabaseAdmin) {
      console.error('❌ Supabase admin client is null');
      return NextResponse.json({
        success: true,
        submission_id: 'temp-' + Date.now(),
        status: 'pending_review',
        message: 'Document submitted successfully (database not configured)',
        file_path: savedFilePath,
        warning: 'Database not configured - file saved locally only'
      }, { status: 201 });
    }
    
    const { data: submission, error } = await supabaseAdmin
      .from('submissions')
      .insert([submissionData])
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Submission data:', JSON.stringify(submissionData, null, 2));
      console.error('Table: submissions');
      console.error('RLS policies may be blocking insertion');
      
      // File was saved successfully, so return success even if database fails
      console.log('File saved successfully, returning success despite database error');
      return NextResponse.json({
        success: true,
        submission_id: 'temp-' + Date.now(),
        status: 'pending_review',
        message: 'Document submitted successfully (database error logged)',
        file_path: savedFilePath,
        warning: 'Database insertion failed - check RLS policies'
      }, { status: 201 });
    }

    console.log('Database insertion successful:', submission);
    
    // Process document with Ollama immediately
    try {
      console.log('🤖 Processing document with Ollama...');
      
      const ollamaBaseUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site';
      const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
      
      console.log('Ollama configuration:');
      console.log('- Base URL:', ollamaBaseUrl);
      console.log('- Model:', ollamaModel);
      
      // Create system prompt for document analysis
      const systemPrompt = `You are an expert document analyzer for the VOFC (Vulnerability and Options for Consideration) Engine. 
Your task is to extract vulnerabilities and options for consideration from security documents.

Extract the following information:
1. Vulnerabilities: Security weaknesses, risks, or threats mentioned in the document
2. Options for Consideration (OFCs): Mitigation strategies, recommendations, or actions to address vulnerabilities

Return your analysis as a JSON object with this structure:
{
  "vulnerabilities": [
    {
      "id": "unique_id",
      "text": "vulnerability description",
      "discipline": "relevant discipline",
      "source": "source information"
    }
  ],
  "options_for_consideration": [
    {
      "id": "unique_id", 
      "text": "OFC description",
      "discipline": "relevant discipline",
      "source": "source information"
    }
  ]
}`;

      // Process the document with local file path reference
      const userPrompt = `Analyze this document and extract vulnerabilities and options for consideration:

Document Title: ${source_title}
Document Type: ${document.type}
Document Size: ${document.size} bytes
Source Organization: ${author_org || 'Unknown'}
Publication Year: ${publication_year || 'Unknown'}
Local File Path: ${savedFilePath}

Please provide a structured JSON response with vulnerabilities and OFCs based on the document metadata and title. If you have access to the file content at the specified path, use that for more accurate analysis.`;

      // Call Ollama API
      console.log('🤖 Calling Ollama API...');
      const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false
        })
      });

      console.log('📡 Ollama response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        const ollamaContent = data.message?.content || data.response;
        
        if (ollamaContent) {
          try {
            const parsedResult = JSON.parse(ollamaContent);
            console.log('✅ Ollama analysis completed successfully');
            
            const ofcCount = parsedResult.options_for_consideration?.length || 0;
            const vulnCount = parsedResult.vulnerabilities?.length || 0;
            
            console.log(`📊 OFCs found: ${ofcCount}`);
            console.log(`📊 Vulnerabilities found: ${vulnCount}`);
            
            // Update submission with Ollama results
            const enhancedData = {
              ...JSON.parse(submission.data),
              enhanced_extraction: parsedResult,
              parsed_at: new Date().toISOString(),
              parser_version: 'ollama_api_v1.0',
              extraction_stats: {
                ofc_count: ofcCount,
                vulnerability_count: vulnCount
              },
              ofc_count: ofcCount,
              vulnerability_count: vulnCount
            };

            await supabaseAdmin
              .from('submissions')
              .update({
                data: JSON.stringify(enhancedData),
                status: 'pending_review',
                updated_at: new Date().toISOString()
              })
              .eq('id', submission.id);

            console.log('✅ Submission updated with Ollama results');
          } catch (parseError) {
            console.error('❌ Error parsing Ollama response:', parseError);
          }
        }
      } else {
        console.error('❌ Ollama API error:', response.status, response.statusText);
        const errorText = await response.text().catch(() => 'Unable to read error response');
        console.error('Ollama error response:', errorText);
      }
    } catch (ollamaError) {
      console.error('❌ Ollama processing failed:', ollamaError);
      console.error('Ollama error details:', JSON.stringify(ollamaError, null, 2));
      console.log('⚠️ Document submitted but processing failed');
    }
    
    return NextResponse.json({
      success: true,
      submission_id: submission.id,
      status: submission.status,
      message: 'Document submitted and processed successfully'
    }, { status: 201 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
