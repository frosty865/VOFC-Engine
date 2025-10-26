import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  console.log('🚀 Document processing endpoint called - LATEST VERSION');
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
    const completedBucket = 'processed-documents'; // Use proper production bucket
    
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
      
      // Send original file directly to Ollama for processing
      let parsedData = null;
      try {
        parsedData = await runOllamaParser(buffer, filename);
      } catch (parserError) {
        console.log('Ollama parser failed, using basic parsing:', parserError.message);
        parsedData = await basicDocumentParse(buffer, filename);
      }
      
      // Upload original file to completed bucket (keep original format)
      const { error: uploadError } = await supabase.storage
        .from(completedBucket)
        .upload(filename, buffer, {
          cacheControl: '3600',
          upsert: true
        });
      
      if (uploadError) {
        throw new Error(`Failed to upload processed file: ${uploadError.message}`);
      }
      
      // Save parsed data to Parsed bucket
      const parsedContent = JSON.stringify({
        filename,
        processed_at: new Date().toISOString(),
        file_type: filename.split('.').pop().toLowerCase(),
        parsed_data: parsedData
      }, null, 2);
      
      const { error: parsedError } = await supabase.storage
        .from('Parsed')
        .upload(`${filename}.json`, parsedContent, {
          cacheControl: '3600',
          upsert: true,
          contentType: 'application/json'
        });
      
      if (parsedError) {
        console.warn('Failed to save parsed data:', parsedError.message);
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
    const ollamaBaseUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'https://ollama.frostech.site';
    const ollamaModel = process.env.OLLAMA_MODEL || 'mistral:latest';
    
    // Get file extension to determine how to send to Ollama
    const fileExtension = filename.split('.').pop().toLowerCase();
    
    // Create system prompt for heuristic vulnerability and OFC extraction
    const systemPrompt = `You are a heuristic document analyzer for the VOFC (Vulnerability and Options for Consideration) Engine. 
Your task is to extract vulnerabilities and options for consideration from security documents using linguistic heuristics and pattern recognition.

You will receive document files in their original format (PDF, DOC, XLSX, etc.) and should perform multi-pass heuristic analysis to ensure comprehensive content extraction.

CRITICAL ANALYSIS APPROACH:
1. First, identify all Options for Consideration (OFCs) - these are recommendations, best practices, controls, and guidance
2. Then, INFER vulnerabilities by identifying what security gaps exist when these OFCs are NOT implemented
3. For each OFC found, create a corresponding vulnerability that describes the risk of not having that control

Use these heuristic patterns to identify:
1. Options for Consideration (OFCs): Look for keywords like "recommendation", "mitigation", "action", "consideration", "option", "strategy", "solution", "best practice", "guidance", "advice", "suggestion", "approach", "method", "technique", "procedure", "step", "measure", "control", "implement", "establish", "deploy", "configure"
2. Vulnerabilities: For each OFC, infer the vulnerability: "Lack of [OFC description] creates risk of [potential impact]"

Apply linguistic heuristics:
- Section-aware context analysis
- Confidence scoring based on keyword density
- Pattern matching for security terminology
- Context clustering for related concepts
- Look for numbered lists, bullet points, and structured recommendations
- Identify action items, guidelines, and procedural steps
- INFER vulnerabilities from missing controls and best practices

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
    
    if (['pdf', 'doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx'].includes(fileExtension)) {
      // For binary files, send as base64 to Ollama
      const base64Data = Buffer.from(buffer).toString('base64');
      
      requestBody = {
        model: ollamaModel,
        prompt: `Analyze this ${fileExtension.toUpperCase()} document and extract vulnerabilities and options for consideration. 

CRITICAL ANALYSIS APPROACH:
1. First, identify all Options for Consideration (OFCs) - recommendations, best practices, controls, and guidance
2. Then, INFER vulnerabilities by identifying what security gaps exist when these OFCs are NOT implemented
3. For each OFC found, create a corresponding vulnerability that describes the risk of not having that control

Look for:
- Recommendations, guidelines, and best practices
- Action items and procedural steps
- Mitigation strategies and solutions
- Security controls and measures
- Any structured lists or bullet points

For each OFC you find, infer the vulnerability: "Lack of [OFC description] creates risk of [potential impact]"

Perform multi-pass heuristic analysis to ensure comprehensive content extraction.`,
        images: [base64Data],
        stream: false,
        options: {
          temperature: 0.1,
          top_p: 0.9
        }
      };
    } else {
      // For text files, convert to text and use chat format
      const documentContent = Buffer.from(buffer).toString('utf8');
      const userPrompt = `Analyze this document and extract vulnerabilities and options for consideration:

Document Content:
${documentContent}

CRITICAL ANALYSIS APPROACH:
1. First, identify all Options for Consideration (OFCs) - recommendations, best practices, controls, and guidance
2. Then, INFER vulnerabilities by identifying what security gaps exist when these OFCs are NOT implemented
3. For each OFC found, create a corresponding vulnerability that describes the risk of not having that control

Look for:
- Recommendations, guidelines, and best practices
- Action items and procedural steps
- Mitigation strategies and solutions
- Security controls and measures
- Any structured lists or bullet points

For each OFC you find, infer the vulnerability: "Lack of [OFC description] creates risk of [potential impact]"

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
    const apiEndpoint = ['pdf', 'doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx'].includes(fileExtension) ? '/api/generate' : '/api/chat';
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
