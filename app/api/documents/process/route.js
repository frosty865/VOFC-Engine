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
      
      // Parse document content using basic parsing
      const parsedData = await basicDocumentParse(documentContent, filename);
      
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

async function basicDocumentParse(content, filename) {
  // Basic parsing logic
  const lines = content.split('\n').filter(line => line.trim());
  
  // Extract title (first non-empty line or filename)
  const title = lines[0] || filename;
  
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
    word_count: content.split(/\s+/).length
  };
}
