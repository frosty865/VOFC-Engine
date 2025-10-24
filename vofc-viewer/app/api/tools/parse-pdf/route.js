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
      // Get PDF file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabaseServer.storage
        .from('documents')
        .download(filename);
        
      if (downloadError) {
        return NextResponse.json(
          { success: false, error: 'PDF file not found in storage' },
          { status: 404 }
        );
      }
      
      // Convert blob to buffer for PDF processing
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // Enhanced PDF text extraction
      const extractedText = await extractTextFromPDF(buffer);
      
      if (!extractedText || extractedText.trim().length < 10) {
        return NextResponse.json({
          success: false,
          error: 'No readable text could be extracted from PDF',
          extracted_length: extractedText?.length || 0
        });
      }
      
      return NextResponse.json({
        success: true,
        text: extractedText,
        length: extractedText.length,
        filename: filename,
        message: `Successfully extracted ${extractedText.length} characters from PDF`
      });
      
    } catch (error) {
      console.error('PDF parsing error:', error);
      return NextResponse.json(
        { success: false, error: `PDF parsing failed: ${error.message}` },
        { status: 500 }
      );
    }
    
  } catch (error) {
    console.error('Error in PDF parsing API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse PDF' },
      { status: 500 }
    );
  }
}

async function extractTextFromPDF(buffer) {
  try {
    // Method 1: Try to extract text using regex patterns for PDF text objects
    const content = buffer.toString('binary');
    
    // Look for text between BT (Begin Text) and ET (End Text) markers
    const textMatches = content.match(/BT\s*(.*?)\s*ET/gs);
    let extractedText = '';
    
    if (textMatches && textMatches.length > 0) {
      for (const match of textMatches) {
        // Extract text content between BT and ET
        const textContent = match
          .replace(/BT|ET/g, '')
          .replace(/[^\w\s.,;:!?()-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (textContent.length > 3) {
          extractedText += textContent + ' ';
        }
      }
    }
    
    // Method 2: Look for readable text patterns
    if (!extractedText || extractedText.length < 50) {
      // Find text streams in PDF
      const streamMatches = content.match(/stream\s*(.*?)\s*endstream/gs);
      
      if (streamMatches) {
        for (const stream of streamMatches) {
          const streamContent = stream
            .replace(/stream|endstream/g, '')
            .replace(/[^\w\s.,;:!?()-]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          if (streamContent.length > 10) {
            extractedText += streamContent + ' ';
          }
        }
      }
    }
    
    // Method 3: Extract any readable text from the entire content
    if (!extractedText || extractedText.length < 50) {
      const readableText = content
        .replace(/[^\w\s.,;:!?()-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (readableText.length > 50) {
        extractedText = readableText;
      }
    }
    
    // Clean up the extracted text
    if (extractedText) {
      extractedText = extractedText
        .replace(/\s+/g, ' ')
        .replace(/^\s+|\s+$/g, '')
        .trim();
    }
    
    return extractedText;
    
  } catch (error) {
    console.error('Text extraction error:', error);
    return null;
  }
}