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
    
    // Define storage paths
    const sourcePath = `documents/${filename}`;
    const processingPath = `processing/${filename}`;
    const completedPath = `parsed/${filename}`;
    
    // Check if source file exists in storage
    const { data: sourceFile, error: sourceError } = await supabase.storage
      .from('vofc_seed')
      .list('documents', {
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
        .from('vofc_seed')
        .download(sourcePath);
      
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
      
      // Upload processed file to completed folder
      const { error: uploadError } = await supabase.storage
        .from('vofc_seed')
        .upload(completedPath, buffer, {
          cacheControl: '3600',
          upsert: true
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
        .from('vofc_seed')
        .upload(`parsed/${filename}.metadata.json`, metadataContent, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (metadataError) {
        console.warn('Failed to save metadata:', metadataError.message);
      }
      
      // Remove from documents folder (move to processed)
      const { error: removeError } = await supabase.storage
        .from('vofc_seed')
        .remove([sourcePath]);
      
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
          .from('vofc_seed')
          .upload(`failed/${filename}`, buffer, {
            cacheControl: '3600',
            upsert: true
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
      // For PDF files, we'll need to extract text
      // This is a simplified version - in production you'd use a PDF parser
      return 'PDF content extraction not implemented yet';
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

        const userPrompt = `Analyze this document and extract vulnerabilities and options for consideration:

Document Content:
${documentContent}

Please provide a structured JSON response with vulnerabilities and OFCs.`;

    // Call Ollama API
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

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const ollamaContent = data.message?.content || data.response;
    
    if (!ollamaContent) {
      throw new Error('No content received from Ollama');
    }

    // Parse JSON response
    const result = JSON.parse(ollamaContent);
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
