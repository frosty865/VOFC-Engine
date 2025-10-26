import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
    
    const { filename } = requestData;
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    // Define storage paths using production buckets
    const sourceBucket = 'documents';
    const completedBucket = 'vofc_seed'; // Use public bucket for processed files
    
    // Check if source file exists in storage
    const { data: sourceFile, error: sourceError } = await supabase.storage
      .from(sourceBucket)
      .list('', {
        search: filename
      });
    
    if (sourceError || !sourceFile || sourceFile.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Source file not found in storage' },
        { status: 404 }
      );
    }
    
    try {
      // Download file from storage for processing
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(sourceBucket)
        .download(filename);
      
      if (downloadError) {
        throw new Error(`Failed to download file: ${downloadError.message}`);
      }
      
      // Convert blob to buffer for processing
      const buffer = await fileData.arrayBuffer();
      
      // Parse document content from buffer
      const documentContent = await parseDocumentContent(buffer, filename);
      
      // Try to use the Python parser if available
      let parsedData = null;
      try {
        parsedData = await runOllamaParser(buffer, filename);
      } catch (parserError) {
        console.log('Python parser not available, using basic parsing:', parserError.message);
        parsedData = await basicDocumentParse(buffer, filename);
      }
      
      // Upload processed text content to completed bucket
      const processedTextContent = typeof parsedData === 'string' ? parsedData : JSON.stringify(parsedData, null, 2);
      const textBuffer = Buffer.from(processedTextContent, 'utf8');
      
      const { error: uploadError } = await supabase.storage
        .from(completedBucket)
        .upload(filename.replace(/\.[^/.]+$/, '.txt'), textBuffer, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/octet-stream'
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload processed file: ${uploadError.message}`);
      }
      
      // Save parsed data as metadata
      const metadataContent = JSON.stringify({
        filename,
        processed_at: new Date().toISOString(),
        content: documentContent,
        parsed_data: parsedData
      }, null, 2);
      
      const { error: metadataError } = await supabase.storage
        .from(completedBucket)
        .upload(`${filename}.metadata.json`, metadataContent, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/octet-stream'
        });
      
      if (metadataError) {
        console.warn('Failed to save metadata:', metadataError.message);
      }
      
      // Remove from documents bucket (move to processed)
      const { error: removeError } = await supabase.storage
        .from(sourceBucket)
        .remove([filename]);
      
      if (removeError) {
        console.warn('Failed to remove source file:', removeError.message);
      }
      
      return NextResponse.json({
        success: true,
        message: `Document ${filename} processed successfully`,
        data: {
          title: parsedData?.title || filename,
          vulnerabilities: parsedData?.vulnerabilities || [],
          ofcs: parsedData?.ofcs || [],
          sectors: parsedData?.sectors || [],
          content_preview: documentContent.substring(0, 200) + '...'
        }
      });
      
    } catch (processError) {
      // If processing fails, move to failed folder in storage
      try {
        const { error: failedUploadError } = await supabase.storage
          .from('Parsed')
          .upload(filename, buffer, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/pdf'
          });
        
        if (failedUploadError) {
          console.error('Failed to move file to failed folder:', failedUploadError.message);
        }
      } catch (failedError) {
        console.error('Error moving file to failed folder:', failedError.message);
      }
      
      return NextResponse.json(
        { success: false, error: `Processing failed: ${processError.message}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error processing document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process document' },
      { status: 500 }
    );
  }
}

async function parseDocumentContent(buffer, filename) {
  try {
    // Convert buffer to text based on file type
    const fileExtension = filename.split('.').pop().toLowerCase();
    
    if (fileExtension === 'pdf') {
      // For PDF files, we'll send the binary data directly to Ollama
      // Ollama will handle the multi-pass PDF text extraction
      return 'PDF_BINARY_DATA';
    } else if (['txt', 'md', 'json'].includes(fileExtension)) {
      // For text files, convert buffer to string
      return Buffer.from(buffer).toString('utf8');
    } else {
      // For other file types, try to extract text
      return Buffer.from(buffer).toString('utf8');
    }
  } catch (error) {
    throw new Error(`Failed to parse document content: ${error.message}`);
  }
}

async function runOllamaParser(buffer, filename) {
  try {
    const documentContent = await parseDocumentContent(buffer, filename);
    const ollamaBaseUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site';
    const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
    
    // Create system prompt for vulnerability and OFC extraction
    const systemPrompt = `You are an expert document analyzer for the VOFC (Vulnerability and Options for Consideration) Engine. 
Your task is to extract vulnerabilities and options for consideration from security documents.

For PDF documents, you will receive the binary data and should perform multi-pass text extraction with heuristic analysis to ensure readable, meaningful text is extracted.

Extract the following information:
1. Vulnerabilities: Security weaknesses, risks, or threats mentioned in the document
2. Options for Consideration (OFCs): Mitigation strategies, recommendations, or actions to address vulnerabilities

Return your analysis as a JSON object with this structure:
{
  "title": "document title",
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
  ],
  "sectors": [
    {
      "name": "sector name",
      "confidence": 0.8
    }
  ]
}`;

    let requestBody;
    
    if (documentContent === 'PDF_BINARY_DATA') {
      // For PDF files, send binary data as base64 to Ollama
      const base64Data = Buffer.from(buffer).toString('base64');
      
      requestBody = {
        model: ollamaModel,
        prompt: `Analyze this PDF document and extract vulnerabilities and options for consideration. Perform multi-pass text extraction to ensure readable content.`,
        images: [base64Data],
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      };
    } else {
      // For text files, use chat format
      const userPrompt = `Analyze this document and extract vulnerabilities and options for consideration:

Document Content:
${documentContent}

Please provide a structured JSON response with vulnerabilities and OFCs.`;

      requestBody = {
        model: ollamaModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        stream: false
      };
    }

    // Call Ollama API with correct endpoint
    const apiEndpoint = documentContent === 'PDF_BINARY_DATA' ? '/api/generate' : '/api/chat';
    const response = await fetch(`${ollamaBaseUrl}${apiEndpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const ollamaContent = data.message?.content || data.response || data.text;
    
    if (!ollamaContent) {
      throw new Error('No content received from Ollama');
    }

    // Validate that we got readable text (not PDF internal structure)
    if (ollamaContent.includes('PDF_BINARY_DATA') || 
        ollamaContent.includes('%%EOF') || 
        ollamaContent.includes('obj') ||
        ollamaContent.length < 50) {
      throw new Error('Ollama returned PDF internal structure instead of readable text');
    }

    // Try to parse JSON response
    let result;
    try {
      result = JSON.parse(ollamaContent);
    } catch (parseError) {
      // If JSON parsing fails, create a basic structure
      console.warn('Failed to parse Ollama JSON response, creating basic structure');
      result = {
        title: filename.replace(/\.[^/.]+$/, ''),
        vulnerabilities: [],
        options_for_consideration: [],
        sectors: [],
        raw_content: ollamaContent.substring(0, 500) + '...'
      };
    }
    
    return result;

  } catch (error) {
    console.error('Ollama parser error:', error);
    throw new Error(`Ollama parsing failed: ${error.message}`);
  }
}

async function basicDocumentParse(buffer, filename) {
  const basicContent = await parseDocumentContent(buffer, filename);
  
  // Basic parsing logic
  const lines = basicContent.split('\n').filter(line => line.trim());
  
  // Extract title (first non-empty line or filename)
  const title = lines[0] || filename.replace(/\.[^/.]+$/, '');
  
  // Look for vulnerabilities and OFCs
  const vulnerabilities = [];
  const ofcs = [];
  const sectors = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Look for vulnerability indicators
    if (lowerLine.includes('vulnerability') || lowerLine.includes('risk') || lowerLine.includes('threat')) {
      vulnerabilities.push({
        text: line.trim(),
        confidence: 0.7
      });
    }
    
    // Look for OFC indicators
    if (lowerLine.includes('option') || lowerLine.includes('consideration') || lowerLine.includes('recommendation')) {
      ofcs.push({
        text: line.trim(),
        confidence: 0.7
      });
    }
    
    // Look for sector indicators
    if (lowerLine.includes('sector') || lowerLine.includes('industry') || lowerLine.includes('critical infrastructure')) {
      sectors.push({
        name: line.trim(),
        confidence: 0.6
      });
    }
  }
  
  return {
    title,
    vulnerabilities,
    ofcs,
    sectors,
    total_lines: lines.length,
    word_count: basicContent.split(/\s+/).length
  };
}
