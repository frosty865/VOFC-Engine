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
    
    // Get file metadata
    const { data: fileInfo } = await supabaseServer.storage
      .from('documents')
      .list('', {
        search: filename
      });
    
    const fileSize = fileInfo?.[0]?.metadata?.size || 0;
    const fileModified = fileInfo?.[0]?.updated_at || new Date().toISOString();
    
    // Try to read as text, handle binary files gracefully
    let content = '';
    let isBinary = false;
    
    try {
      content = await fileData.text();
      
      // Check if content looks like binary data (contains null bytes or high percentage of non-printable chars)
      const nullBytes = (content.match(/\0/g) || []).length;
      const nonPrintableChars = (content.match(/[\x00-\x08\x0E-\x1F\x7F-\xFF]/g) || []).length;
      const totalChars = content.length;
      
      if (nullBytes > 0 || (nonPrintableChars / totalChars) > 0.3) {
        isBinary = true;
        content = `[Binary file - ${filename}]`;
      }
    } catch (textError) {
      isBinary = true;
      content = `[Binary file - ${filename}]`;
    }
    
    if (isBinary) {
      return NextResponse.json({
        success: true,
        data: {
          filename,
          title: filename,
          size: fileSize,
          modified: fileModified,
          word_count: 0,
          line_count: 0,
          preview: `This appears to be a binary file (${filename}). Preview not available for binary files.`,
          sections: {
            vulnerabilities: [],
            ofcs: [],
            sectors: [],
            sources: []
          },
          estimated_processing_time: 'Cannot process binary files',
          is_binary: true
        }
      });
    }
    
    // Basic content analysis for text files
    const lines = content.split('\n').filter(line => line.trim());
    const words = content.split(/\s+/).filter(word => word.length > 0);
    
    // Extract potential title (first substantial line)
    const title = lines.find(line => line.trim().length > 10) || filename;
    
    // Look for key sections
    const sections = {
      vulnerabilities: [],
      ofcs: [],
      sectors: [],
      sources: []
    };
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      
      // Look for vulnerability indicators
      if (lowerLine.includes('vulnerability') || lowerLine.includes('risk') || lowerLine.includes('threat')) {
        sections.vulnerabilities.push(line.trim());
      }
      
      // Look for OFC indicators
      if (lowerLine.includes('option') || lowerLine.includes('consideration') || lowerLine.includes('recommendation')) {
        sections.ofcs.push(line.trim());
      }
      
      // Look for sector indicators
      if (lowerLine.includes('sector') || lowerLine.includes('industry') || lowerLine.includes('critical infrastructure')) {
        sections.sectors.push(line.trim());
      }
      
      // Look for source indicators
      if (lowerLine.includes('source:') || lowerLine.includes('reference:') || lowerLine.includes('citation:')) {
        sections.sources.push(line.trim());
      }
    }
    
    // Extract first few paragraphs for preview
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 20);
    const preview = paragraphs.slice(0, 3).join('\n\n');
    
    return NextResponse.json({
      success: true,
      data: {
        filename,
        title,
        size: fileSize,
        modified: fileModified,
        word_count: words.length,
        line_count: lines.length,
        preview: preview.substring(0, 500) + (preview.length > 500 ? '...' : ''),
        sections: {
          vulnerabilities: sections.vulnerabilities.slice(0, 5), // Limit to first 5
          ofcs: sections.ofcs.slice(0, 5),
          sectors: sections.sectors.slice(0, 5),
          sources: sections.sources.slice(0, 5)
        },
        estimated_processing_time: Math.ceil(words.length / 1000) + ' seconds',
        is_binary: false
      }
    });
    
  } catch (error) {
    console.error('Error previewing document:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to preview document' },
      { status: 500 }
    );
  }
}
