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
      
      // Check if it's a PDF file and handle accordingly
      const isPDF = filename.toLowerCase().endsWith('.pdf');
      let documentContent;
      
      if (isPDF) {
        console.log('📄 PDF file detected, sending to Ollama for processing...');
        // For PDFs, send the binary data directly to Ollama
        const arrayBuffer = await fileData.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Convert to base64 for Ollama processing
        const base64Content = buffer.toString('base64');
        documentContent = base64Content; // Ollama will handle PDF parsing
      } else {
        // Regular text file processing
        documentContent = await fileData.text();
      }
      
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
        console.log(`📄 Document: ${filename}, Content length: ${documentContent.length}`);
        
        // Check if this is a PDF file
        const isPDF = documentContent.startsWith('%PDF');
        if (isPDF) {
          console.log('📄 PDF file detected, attempting text extraction for Ollama...');
          
          // Try to extract readable text from PDF for Ollama processing
          let extractedText = '';
          
          // Extract text from PDF content using basic parsing
          const textMatches = documentContent.match(/BT\s+.*?ET/gs);
          if (textMatches) {
            for (const match of textMatches) {
              const textContent = match.replace(/BT|ET/g, '').replace(/[^\w\s.,;:!?-]/g, ' ').trim();
              if (textContent.length > 3) {
                extractedText += textContent + ' ';
              }
            }
          }
          
          // If no structured text found, try to extract any readable text
          if (!extractedText) {
            extractedText = documentContent
              .replace(/[^\w\s.,;:!?-]/g, ' ') // Keep only readable characters
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
          }
          
          if (extractedText.length > 50) {
            console.log(`📄 Extracted ${extractedText.length} characters from PDF for Ollama processing`);
            parsedData = await processWithOllama(extractedText, filename);
            console.log('✅ Ollama PDF processing successful');
          } else {
            console.log('⚠️ Insufficient text extracted from PDF, using basic parsing');
            parsedData = await basicDocumentParse(documentContent, filename);
          }
        } else {
          // Non-PDF file, process directly with Ollama
          parsedData = await processWithOllama(documentContent, filename);
          console.log('✅ Ollama processing successful');
        }
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

      // Trigger learning system if AI processing was used
      if (parsedData.extraction_method === 'ollama') {
        try {
          console.log('🧠 Triggering learning system for new AI-processed document...');
          await triggerLearningSystem(filename, parsedData);
        } catch (learningError) {
          console.warn('⚠️ Learning system trigger failed:', learningError.message);
          // Don't fail the document processing if learning fails
        }
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


async function triggerLearningSystem(filename, parsedData) {
  try {
    // Create learning event data
    const learningEvent = {
      event_type: 'document_processed',
      filename: filename,
      vulnerabilities_found: parsedData.vulnerabilities?.length || 0,
      ofcs_found: parsedData.ofcs?.length || 0,
      extraction_method: parsedData.extraction_method,
      confidence: parsedData.confidence,
      processed_at: new Date().toISOString(),
      data: {
        vulnerabilities: parsedData.vulnerabilities || [],
        ofcs: parsedData.ofcs || [],
        sectors: parsedData.sectors || []
      }
    };

    // Store learning event in database for continuous learning system
    const supabaseServer = getServerClient();
    const { error: learningError } = await supabaseServer
      .from('learning_events')
      .insert([learningEvent]);

    if (learningError) {
      console.warn('⚠️ Failed to store learning event:', learningError);
    } else {
      console.log('✅ Learning event stored for continuous learning system');
    }

    // Trigger immediate learning cycle if enough events accumulated
    const { data: eventCount } = await supabaseServer
      .from('learning_events')
      .select('id', { count: 'exact' })
      .eq('event_type', 'document_processed');

    if (eventCount && eventCount.length >= 5) { // Trigger learning every 5 documents
      console.log('🔄 Triggering immediate learning cycle...');
      
      // Call learning API to run a learning cycle
      const learningResponse = await fetch('/api/learning/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cycle' })
      });

      if (learningResponse.ok) {
        console.log('✅ Learning cycle triggered successfully');
      } else {
        console.warn('⚠️ Learning cycle trigger failed');
      }
    }

  } catch (error) {
    console.error('❌ Error in learning system trigger:', error);
    throw error;
  }
}

async function processWithOllama(content, filename) {
  const ollamaBaseUrl = process.env.OLLAMA_API_BASE_URL || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
  
  console.log(`🤖 Calling Ollama API: ${ollamaBaseUrl}/api/chat`);
  console.log(`📄 Processing document: ${filename}`);
  console.log(`📝 Content length: ${content.length} characters`);
  console.log(`🤖 Model: ${ollamaModel}`);
  
  // Create system prompt for document analysis
  const systemPrompt = `You are an expert document analyzer for the VOFC (Vulnerability and Options for Consideration) Engine. 
Your task is to extract vulnerabilities and options for consideration from security documents.

You can process both text documents and PDF files. For PDF files, you have built-in PDF parsing capabilities.

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

  // Check if content is base64 (PDF file)
  const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(content) && content.length > 100;
  
  let userPrompt;
  if (isBase64 && filename.toLowerCase().endsWith('.pdf')) {
    userPrompt = `Analyze this PDF document and extract vulnerabilities and options for consideration:

Document Title: ${filename}
Document Type: PDF (base64 encoded)
Document Content: ${content}

Please parse the PDF content and provide a structured JSON response with vulnerabilities and OFCs.`;
  } else {
    userPrompt = `Analyze this document and extract vulnerabilities and options for consideration:

Document Title: ${filename}
Document Content:
${content}

Please provide a structured JSON response with vulnerabilities and OFCs.`;
  }

  // Call Ollama API with timeout
  console.log('⏱️ Starting Ollama API call...');
  const startTime = Date.now();
  
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
    }),
    signal: AbortSignal.timeout(60000) // 60 second timeout
  });
  
  const endTime = Date.now();
  console.log(`⏱️ Ollama API call completed in ${endTime - startTime}ms`);

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
    // For PDF files, try to extract readable text from the raw content
    console.log('📄 Processing PDF file with basic text extraction...');
    
    // Extract text from PDF content using basic parsing
    let extractedText = '';
    
    // Try to extract readable text from PDF content
    const textMatches = content.match(/BT\s+.*?ET/gs);
    if (textMatches) {
      for (const match of textMatches) {
        // Extract text between BT and ET (PDF text objects)
        const textContent = match.replace(/BT|ET/g, '').replace(/[^\w\s.,;:!?-]/g, ' ').trim();
        if (textContent.length > 3) {
          extractedText += textContent + ' ';
        }
      }
    }
    
    // If no structured text found, try to extract any readable text
    if (!extractedText) {
      extractedText = content
        .replace(/[^\w\s.,;:!?-]/g, ' ') // Keep only readable characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
    }
    
    // If we have extracted text, process it
    if (extractedText.length > 50) {
      console.log(`📄 Extracted ${extractedText.length} characters from PDF`);
      return await parseExtractedText(extractedText, filename, 'PDF');
    } else {
      // If no readable text could be extracted
      return {
        title: filename.replace(/\.(pdf|PDF)$/, ''),
        vulnerabilities: [],
        ofcs: [],
        sectors: [],
        total_lines: 0,
        word_count: 0,
        file_type: 'PDF',
        extraction_method: 'basic',
        note: 'PDF file detected but no readable text could be extracted. Consider using a PDF-to-text converter.'
      };
    }
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
    file_type: isPDF ? 'PDF' : 'Text',
    extraction_method: 'basic'
  };
}

async function parseExtractedText(text, filename, fileType) {
  console.log(`🔍 Parsing extracted text (${text.length} characters)...`);
  
  // Clean up the extracted text
  const cleanText = text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/[^\w\s.,;:!?-]/g, ' ') // Remove special characters
    .trim();
  
  const lines = cleanText.split(/[.!?]+/).filter(line => line.trim().length > 10);
  
  // Extract title
  const title = filename.replace(/\.[^/.]+$/, '');
  
  // Look for vulnerabilities and OFCs
  const vulnerabilities = [];
  const ofcs = [];
  const sectors = [];
  
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine.length < 10) continue;
    
    const lowerLine = cleanLine.toLowerCase();
    
    // Look for vulnerability indicators
    if (lowerLine.includes('vulnerability') || lowerLine.includes('risk') || lowerLine.includes('threat') ||
        lowerLine.includes('security') || lowerLine.includes('weakness') || lowerLine.includes('exploit') ||
        lowerLine.includes('attack') || lowerLine.includes('breach') || lowerLine.includes('compromise')) {
      vulnerabilities.push({
        text: cleanLine,
        confidence: 0.6,
        source: 'extracted_text'
      });
    }
    
    // Look for OFC indicators
    if (lowerLine.includes('option') || lowerLine.includes('consideration') || lowerLine.includes('recommendation') ||
        lowerLine.includes('mitigation') || lowerLine.includes('solution') || lowerLine.includes('action') ||
        lowerLine.includes('implement') || lowerLine.includes('deploy') || lowerLine.includes('establish')) {
      ofcs.push({
        text: cleanLine,
        confidence: 0.6,
        source: 'extracted_text'
      });
    }
    
    // Look for sector indicators
    if (lowerLine.includes('sector') || lowerLine.includes('industry') || lowerLine.includes('critical infrastructure') ||
        lowerLine.includes('energy') || lowerLine.includes('healthcare') || lowerLine.includes('finance') ||
        lowerLine.includes('government') || lowerLine.includes('defense') || lowerLine.includes('telecommunications')) {
      sectors.push({
        name: cleanLine,
        confidence: 0.5,
        source: 'extracted_text'
      });
    }
  }
  
  console.log(`📊 Found ${vulnerabilities.length} vulnerabilities, ${ofcs.length} OFCs, ${sectors.length} sectors`);
  
  return {
    title,
    vulnerabilities,
    ofcs,
    sectors,
    total_lines: lines.length,
    word_count: cleanText.split(/\s+/).filter(word => word.length > 0).length,
    file_type: fileType,
    extraction_method: 'basic',
    confidence: 'medium'
  };
}
