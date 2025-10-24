import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';

export async function POST(request) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json(
        { success: false, error: 'Database connection failed' },
        { status: 500 }
      );
    }
    
    try {
      // Get document from Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseServer.storage
        .from('documents')
        .download(filename);
        
      if (downloadError) {
        return NextResponse.json(
          { success: false, error: 'Document not found in storage' },
          { status: 404 }
        );
      }
      
      // Convert blob to text for processing
      const documentContent = await fileData.text();
      
      // Update status to processing
      await supabaseServer
        .from('document_processing')
        .upsert({
          filename,
          status: 'processing',
          updated_at: new Date().toISOString()
        });
      
      // Try Ollama processing first, fallback to basic parsing
      let parsedData;
      try {
        console.log('🤖 Attempting Ollama processing...');
        parsedData = await processWithOllama(documentContent, filename);
        console.log('✅ Ollama processing successful');
      } catch (ollamaError) {
        console.log('⚠️ Ollama processing failed, using basic parsing:', ollamaError.message);
        parsedData = await basicDocumentParse(documentContent, filename);
      }
      
      // Update status to completed and save results
      await supabaseServer
        .from('document_processing')
        .upsert({
          filename,
          status: 'completed',
          processed_data: parsedData,
          updated_at: new Date().toISOString()
        });
      
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
      // Update status to failed
      await supabaseServer
        .from('document_processing')
        .upsert({
          filename,
          status: 'failed',
          error_message: processError.message,
          updated_at: new Date().toISOString()
        });
      
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

async function processWithOllama(content, filename) {
  const ollamaBaseUrl = process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
  
  // Create system prompt for document analysis
  const systemPrompt = `You are an expert document analyzer for the VOFC (Vulnerability and Options for Consideration) Engine. 
Your task is to extract vulnerabilities and options for consideration from security documents.

Extract the following information:
1. Vulnerabilities: Security weaknesses, risks, or threats mentioned in the document
2. Options for Consideration (OFCs): Mitigation strategies, recommendations, or actions to address vulnerabilities

IMPORTANT: Return ONLY a valid JSON object with this exact structure. Do not include any markdown formatting, explanations, or additional text. Just the raw JSON:

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

Document Title: ${filename}
Document Content:
${content}

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

  // Extract JSON from markdown-formatted response
  let jsonContent = ollamaContent;
  
  // Remove markdown code blocks if present
  if (jsonContent.includes('```json')) {
    const jsonMatch = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }
  } else if (jsonContent.includes('```')) {
    const jsonMatch = jsonContent.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      jsonContent = jsonMatch[1];
    }
  }
  
  // Try to find JSON object in the response
  const jsonMatch = jsonContent.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonContent = jsonMatch[0];
  }
  
  const parsedResult = JSON.parse(jsonContent);
  
  // Convert to expected format
  return {
    title: filename.replace(/\.[^/.]+$/, ''),
    vulnerabilities: parsedResult.vulnerabilities || [],
    ofcs: parsedResult.options_for_consideration || [],
    sectors: [],
    total_lines: content.split('\n').length,
    word_count: content.split(/\s+/).length,
    file_type: 'AI-Processed',
    extraction_method: 'ollama',
    confidence: 'high'
  };
}

async function basicDocumentParse(content, filename) {
  // Check if this is a PDF file (starts with %PDF)
  const isPDF = content.startsWith('%PDF');
  
  if (isPDF) {
    // For PDF files, we can't parse the content directly
    // Return a basic structure indicating it's a PDF
    return {
      title: filename.replace(/\.(pdf|PDF)$/, ''), // Remove .pdf extension
      vulnerabilities: [],
      ofcs: [],
      sectors: [],
      total_lines: 0,
      word_count: 0,
      file_type: 'PDF',
      note: 'PDF files require specialized parsing tools. Consider using a PDF-to-text converter.'
    };
  }
  
  // Clean up content - remove PDF artifacts and control characters
  let cleanContent = content
    .replace(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g, '') // Remove control characters
    .replace(/%.*?%/g, '') // Remove PDF comments
    .replace(/^\s*$/gm, '') // Remove empty lines
    .trim();
  
  // Basic parsing logic for text files
  const lines = cleanContent.split('\n').filter(line => line.trim().length > 0);
  
  // Extract title (first substantial line or filename)
  const title = lines.find(line => line.trim().length > 10 && !line.includes('%')) || 
                filename.replace(/\.[^/.]+$/, ''); // Remove file extension
  
  // Look for vulnerabilities and OFCs
  const vulnerabilities = [];
  const ofcs = [];
  const sectors = [];
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 10) continue; // Skip very short lines
    
    const lowerLine = cleanLine.toLowerCase();
    
    // Look for vulnerability indicators
    if (lowerLine.includes('vulnerability') || lowerLine.includes('risk') || lowerLine.includes('threat') ||
        lowerLine.includes('security') || lowerLine.includes('weakness') || lowerLine.includes('exploit')) {
      vulnerabilities.push({
        text: cleanLine,
        confidence: 0.7
      });
    }
    
    // Look for OFC indicators
    if (lowerLine.includes('option') || lowerLine.includes('consideration') || lowerLine.includes('recommendation') ||
        lowerLine.includes('mitigation') || lowerLine.includes('solution') || lowerLine.includes('action')) {
      ofcs.push({
        text: cleanLine,
        confidence: 0.7
      });
    }
    
    // Look for sector indicators
    if (lowerLine.includes('sector') || lowerLine.includes('industry') || lowerLine.includes('critical infrastructure') ||
        lowerLine.includes('energy') || lowerLine.includes('healthcare') || lowerLine.includes('finance')) {
      sectors.push({
        name: cleanLine,
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
    word_count: cleanContent.split(/\s+/).filter(word => word.length > 0).length,
    file_type: isPDF ? 'PDF' : 'Text'
  };
}
