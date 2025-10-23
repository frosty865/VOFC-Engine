import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(request) {
  try {
    const { filename } = await request.json();
    
    if (!filename) {
      return NextResponse.json(
        { success: false, error: 'Filename is required' },
        { status: 400 }
      );
    }
    
    // Define paths
    const docsPath = path.join(process.cwd(), 'data', 'docs');
    const processingPath = path.join(process.cwd(), 'data', 'processing');
    const completedPath = path.join(process.cwd(), 'data', 'completed');
    const failedPath = path.join(process.cwd(), 'data', 'failed');
    const backendPath = path.join(process.cwd(), 'apps', 'backend');
    
    // Create directories if they don't exist
    [processingPath, completedPath, failedPath].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    
    const sourceFile = path.join(docsPath, filename);
    const processingFile = path.join(processingPath, filename);
    
    // Check if source file exists
    if (!fs.existsSync(sourceFile)) {
      return NextResponse.json(
        { success: false, error: 'Source file not found' },
        { status: 404 }
      );
    }
    
    try {
      // Move file to processing folder
      fs.renameSync(sourceFile, processingFile);
      
      // Parse document content
      const documentContent = await parseDocumentContent(processingFile);
      
      // Try to use the Python parser if available
      let parsedData = null;
      try {
        parsedData = await runOllamaParser(processingFile);
      } catch (parserError) {
        console.log('Python parser not available, using basic parsing:', parserError.message);
        parsedData = await basicDocumentParse(processingFile);
      }
      
      // Move to completed folder
      const completedFile = path.join(completedPath, filename);
      fs.renameSync(processingFile, completedFile);
      
      // Save parsed data
      const metadataFile = path.join(completedPath, `${filename}.metadata.json`);
      fs.writeFileSync(metadataFile, JSON.stringify({
        filename,
        processed_at: new Date().toISOString(),
        content: documentContent,
        parsed_data: parsedData
      }, null, 2));
      
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
      // If processing fails, move to failed folder
      const failedFile = path.join(failedPath, filename);
      if (fs.existsSync(processingFile)) {
        fs.renameSync(processingFile, failedFile);
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

async function parseDocumentContent(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent;
  } catch (error) {
    throw new Error(`Failed to read file: ${error.message}`);
  }
}

async function runOllamaParser(filePath) {
  try {
    const documentContent = fs.readFileSync(filePath, 'utf8');
    const ollamaBaseUrl = process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
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

async function basicDocumentParse(filePath) {
  const basicContent = fs.readFileSync(filePath, 'utf8');
  
  // Basic parsing logic
  const lines = basicContent.split('\n').filter(line => line.trim());
  
  // Extract title (first non-empty line or filename)
  const title = lines[0] || path.basename(filePath, path.extname(filePath));
  
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
