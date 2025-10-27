import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { ollamaChatJSON } from '@/lib/ollama.js';

export async function POST(request) {
  console.log('🚀 Document processing endpoint called - SIMPLIFIED VERSION');
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
    const completedBucket = 'processed-documents';
    
    // Check if source file exists in storage
    const { data: sourceFile, error: sourceError } = await supabaseAdmin.storage
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
    
    // Download the file from storage
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(sourceBucket)
      .download(filename);
    
    if (downloadError) {
      return NextResponse.json(
        { success: false, error: `Failed to download file: ${downloadError.message}` },
        { status: 500 }
      );
    }
    
    // Convert to buffer
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    console.log(`📄 Processing file: ${filename} (${buffer.length} bytes)`);
    
    // Process with Ollama using the new utility
    let parsedData = null;
    try {
      parsedData = await runOllamaParser(buffer, filename);
    } catch (parserError) {
      console.log('Ollama parser failed, using basic parsing:', parserError.message);
      parsedData = await basicDocumentParse(buffer, filename);
    }
    
    // Upload original file to completed bucket (keep original format)
    const { error: uploadError } = await supabaseAdmin.storage
      .from(completedBucket)
      .upload(filename, buffer, {
        cacheControl: '3600',
        upsert: true
      });
    
    if (uploadError) {
      console.error('Failed to upload processed file:', uploadError);
      return NextResponse.json(
        { success: false, error: `Failed to upload processed file: ${uploadError.message}` },
        { status: 500 }
      );
    }
    
    // Save parsed data to Parsed bucket
    const parsedContent = JSON.stringify({
      filename,
      processed_at: new Date().toISOString(),
      file_type: filename.split('.').pop().toLowerCase(),
      parsed_data: parsedData
    }, null, 2);
    
      const { error: parsedError } = await supabaseAdmin.storage
      .from('Parsed')
      .upload(`${filename}.json`, Buffer.from(parsedContent, 'utf8'), {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/json'
      });
    
    if (parsedError) {
      console.warn('Failed to save parsed data:', parsedError.message);
    }
    
    // Remove from source bucket
    const { error: removeError } = await supabaseAdmin.storage
      .from(sourceBucket)
      .remove([filename]);
    
    if (removeError) {
      console.warn('Failed to remove source file:', removeError.message);
    }
    
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