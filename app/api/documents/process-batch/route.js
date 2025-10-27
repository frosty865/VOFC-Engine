import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { ollamaChatJSON } from '@/lib/ollama.js';

export async function POST(request) {
  try {
    const { filenames } = await request.json();
    
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Filenames array is required' },
        { status: 400 }
      );
    }
    
    const results = [];
    
    for (const filename of filenames) {
      try {
        // Check if file exists in documents bucket
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from('documents')
          .download(filename);
        
        if (downloadError) {
          results.push({ filename, status: 'error', message: 'File not found in storage' });
          continue;
        }
        
        // Convert to buffer for processing
        const buffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Process with Ollama
        const parsedData = await runOllamaParser(uint8Array, filename);
        
        if (!parsedData) {
          throw new Error('Ollama returned null response');
        }
        
        // Upload processed data
        const processedContent = JSON.stringify({
          filename,
          processed_at: new Date().toISOString(),
          file_type: filename.split('.').pop().toLowerCase(),
          parsed_data: parsedData
        }, null, 2);
        
        const jsonBlob = new Blob([processedContent], { type: 'application/json' });
        
        // Upload to processed-documents bucket
        const { error: uploadError } = await supabaseAdmin.storage
          .from('processed-documents')
          .upload(`${filename}.json`, jsonBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/json'
          });
        
        if (uploadError) {
          console.warn(`Failed to upload processed data for ${filename}:`, uploadError);
        }
        
        // Save to Parsed bucket for review
        const { error: parsedError } = await supabaseAdmin.storage
          .from('Parsed')
          .upload(`${filename}.json`, jsonBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/json'
          });
        
        if (parsedError) {
          console.warn(`Failed to save parsed data for ${filename}:`, parsedError);
        }
        
        // Remove from source bucket
        const { error: removeError } = await supabaseAdmin.storage
          .from('documents')
          .remove([filename]);
        
        if (removeError) {
          console.warn(`Failed to remove source file ${filename}:`, removeError);
        }
        
        results.push({
          filename,
          status: 'success',
          vulnerabilities: parsedData?.vulnerabilities?.length || 0,
          options_for_consideration: parsedData?.options_for_consideration?.length || 0,
          sectors: parsedData?.sectors?.length || 0
        });
        
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        results.push({
          filename,
          status: 'error',
          message: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return NextResponse.json({
      success: true,
      message: `Batch processing completed: ${successCount} successful, ${errorCount} errors`,
      results,
      summary: {
        total: filenames.length,
        successful: successCount,
        errors: errorCount
      }
    });
    
  } catch (error) {
    console.error('Batch processing error:', error);
    return NextResponse.json(
      { success: false, error: `Batch processing failed: ${error.message}` },
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

Document: ${filename}
File Type: ${fileExtension}

Extract the following information and return ONLY valid JSON:

{
  "vulnerabilities": [
    {
      "vulnerability": "Clear description of the security vulnerability",
      "discipline": "Primary discipline (e.g., Cybersecurity, Physical Security, Personnel Security)",
      "subdiscipline": "Specific subdiscipline if applicable",
      "severity": "High/Medium/Low",
      "sources": ["Source references from the document"],
      "source_title": "Document title",
      "source_url": "URL if available"
    }
  ],
  "options_for_consideration": [
    {
      "option_text": "Clear description of the mitigation option",
      "discipline": "Primary discipline",
      "subdiscipline": "Specific subdiscipline if applicable",
      "sources": ["Source references"],
      "source_title": "Document title",
      "source_url": "URL if available"
    }
  ],
  "sectors": [
    {
      "sector": "Sector name",
      "description": "Brief description"
    }
  ]
}

IMPORTANT: Return ONLY the JSON object. No additional text, explanations, or markdown formatting.`;

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