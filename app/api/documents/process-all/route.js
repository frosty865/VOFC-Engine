import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';
import { ollamaChatJSON } from '@/lib/ollama.js';

// Force server-side only execution
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  console.log('🚀 Processing all PDFs in documents bucket');
  try {
    // Get all files from the documents bucket
    const { data: files, error: listError } = await supabaseAdmin.storage
      .from('documents')
      .list('', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'asc' }
      });
    
    if (listError) {
      console.error('Error listing files:', listError);
      return NextResponse.json(
        { success: false, error: `Failed to list files: ${listError.message}` },
        { status: 500 }
      );
    }
    
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No files found in documents bucket',
        results: []
      });
    }
    
    // Filter for PDF files
    const pdfFiles = files.filter(file => 
      file.name.toLowerCase().endsWith('.pdf')
    );
    
    if (pdfFiles.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No PDF files found in documents bucket',
        results: []
      });
    }
    
    console.log(`📄 Found ${pdfFiles.length} PDF files to process`);
    
    const results = [];
    
    for (const file of pdfFiles) {
      const filename = file.name;
      console.log(`🔄 Processing: ${filename}`);
      
      try {
        // Download the PDF file
        const { data: fileData, error: downloadError } = await supabaseAdmin.storage
          .from('documents')
          .download(filename);
        
        if (downloadError) {
          console.error(`❌ Failed to download ${filename}:`, downloadError);
          results.push({ 
            filename, 
            status: 'error', 
            message: `Download failed: ${downloadError.message}` 
          });
          continue;
        }
        
        // Convert to buffer
        const buffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);
        
        // Process with Ollama
        const parsedData = await runOllamaParser(uint8Array, filename);
        
        if (!parsedData) {
          throw new Error('Ollama returned null response');
        }
        
        // Upload processed data to processed-documents bucket
        const processedContent = JSON.stringify({
          filename,
          processed_at: new Date().toISOString(),
          file_type: 'pdf',
          parsed_data: parsedData
        }, null, 2);
        
        const jsonBlob = new Blob([processedContent], { type: 'application/json' });
        
        const { error: uploadError } = await supabaseAdmin.storage
          .from('processed-documents')
          .upload(`${filename}.json`, jsonBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/json'
          });
        
        if (uploadError) {
          console.warn(`⚠️ Failed to upload processed data for ${filename}:`, uploadError);
        }
        
        // Save parsed data to Parsed bucket for human review
        const { error: parsedError } = await supabaseAdmin.storage
          .from('Parsed')
          .upload(`${filename}.json`, jsonBlob, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/json'
          });
        
        if (parsedError) {
          console.warn(`⚠️ Failed to save parsed data for ${filename}:`, parsedError);
        }
        
        // Remove from source bucket
        const { error: removeError } = await supabaseAdmin.storage
          .from('documents')
          .remove([filename]);
        
        if (removeError) {
          console.warn(`⚠️ Failed to remove source file ${filename}:`, removeError);
        }
        
        console.log(`✅ Successfully processed: ${filename}`);
        results.push({
          filename,
          status: 'success',
          vulnerabilities: parsedData?.vulnerabilities?.length || 0,
          options_for_consideration: parsedData?.options_for_consideration?.length || 0,
          sectors: parsedData?.sectors?.length || 0
        });
        
      } catch (error) {
        console.error(`❌ Error processing ${filename}:`, error);
        results.push({
          filename,
          status: 'error',
          message: error.message
        });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    console.log(`📊 Processing complete: ${successCount} successful, ${errorCount} errors`);
    
    return NextResponse.json({
      success: true,
      message: `Processed ${pdfFiles.length} PDF files`,
      results,
      summary: {
        total: pdfFiles.length,
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