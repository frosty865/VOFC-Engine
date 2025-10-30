import { NextResponse } from 'next/server';
import { ollamaChatJSON } from '@/lib/ollama.js';
import { resolveOllamaBase } from '@/lib/ollama.js';

export async function POST(request) {
  console.log('🚀 Document processing endpoint called - using Ollama server');
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
    
    const { filename, path } = requestData;
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    const ollamaUrl = resolveOllamaBase();
    
    // Download the file from Ollama server
    const filePath = path || filename;
    const fileResponse = await fetch(`${ollamaUrl}/api/files/get/${encodeURIComponent(filePath)}`, {
      method: 'GET',
    });
    
    if (!fileResponse.ok) {
      // Try with just filename if path-based request failed
      const fallbackResponse = await fetch(`${ollamaUrl}/api/files/get/${encodeURIComponent(filename)}`, {
        method: 'GET',
      });
      
      if (!fallbackResponse.ok) {
        return NextResponse.json(
          { success: false, error: `File not found on Ollama server: ${filename}` },
          { status: 404 }
        );
      }
      
      // Convert fallback response to buffer
      const arrayBuffer = await fallbackResponse.arrayBuffer();
      var buffer = Buffer.from(arrayBuffer);
    } else {
      // Convert response to buffer
      const arrayBuffer = await fileResponse.arrayBuffer();
      var buffer = Buffer.from(arrayBuffer);
    }
    
    console.log(`📄 Processing file: ${filename} (${buffer.length} bytes)`);
    
    // Process with Ollama using the new utility
    let parsedData = null;
    try {
      parsedData = await runOllamaParser(buffer, filename);
    } catch (parserError) {
      console.log('Ollama parser failed, using basic parsing:', parserError.message);
      parsedData = await basicDocumentParse(buffer, filename);
    }
    
    // Note: Files remain on Ollama server - no need to move/delete
    // Processing results are returned to client, can be saved to database if needed
    
    console.log('✅ Document processing completed:', {
      filename,
      vulnerabilities: parsedData?.vulnerabilities?.length || 0,
      ofcs: parsedData?.options_for_consideration?.length || 0
    });
    
    return NextResponse.json({
      success: true,
      message: 'Document processed successfully',
      data: {
        filename,
        vulnerabilities: parsedData?.vulnerabilities?.length || 0,
        options_for_consideration: parsedData?.options_for_consideration?.length || 0,
        sectors: parsedData?.sectors?.length || 0
      }
    });
    
  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { success: false, error: `Processing failed: ${error.message}` },
      { status: 500 }
    );
  }
}

async function runOllamaParser(buffer, filename) {
  try {
    const fileExtension = filename.split('.').pop().toLowerCase();
    
    // Create comprehensive prompt for heuristic analysis
    const prompt = `You are a heuristic document analyzer for the VOFC (Vulnerability and Options for Consideration) Engine. 
Your task is to extract vulnerabilities and options for consideration from security documents using linguistic heuristics and pattern recognition.

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
}

Document to analyze: ${filename} (${fileExtension.toUpperCase()})`;

    // Use the new Ollama utility for consistent API calls
    const parsedData = await ollamaChatJSON({
      model: 'mistral:latest',
      prompt,
      temperature: 0.1,
      top_p: 0.9
    });

    if (!parsedData) {
      throw new Error('Ollama returned null response');
    }

    // Validate that we got meaningful data
    if (!parsedData.vulnerabilities && !parsedData.options_for_consideration) {
      throw new Error('Ollama returned empty or invalid data structure');
    }

    console.log('✅ Ollama parsing successful:', {
      vulnerabilities: parsedData.vulnerabilities?.length || 0,
      ofcs: parsedData.options_for_consideration?.length || 0
    });

    return parsedData;

  } catch (error) {
    console.error('Ollama parser error:', error);
    throw error;
  }
}

async function basicDocumentParse(buffer, filename) {
  // Basic parsing logic for fallback
  const content = buffer.toString('utf8');
  const lines = content.split('\n').filter(line => line.trim());
  
  const title = lines[0] || filename.replace(/\.[^/.]+$/, '');
  
  const vulnerabilities = [];
  const ofcs = [];
  const sectors = [];
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    if (lowerLine.includes('vulnerability') || lowerLine.includes('risk') || lowerLine.includes('threat')) {
      vulnerabilities.push({
        text: line.trim(),
        discipline: 'General',
        source: filename
      });
    }
    
    if (lowerLine.includes('recommendation') || lowerLine.includes('mitigation') || lowerLine.includes('action')) {
      ofcs.push({
        text: line.trim(),
        discipline: 'General',
        source: filename
      });
    }
  }
  
  return {
    title,
    vulnerabilities,
    options_for_consideration: ofcs,
    sectors
  };
}