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
    
    const docsPath = path.join(process.cwd(), 'data', 'docs');
    const filePath = path.join(docsPath, filename);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return NextResponse.json(
        { success: false, error: 'File not found' },
        { status: 404 }
      );
    }
    
    // Read file content
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = fs.statSync(filePath);
    
    // Basic content analysis
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
        size: stats.size,
        modified: stats.mtime.toISOString(),
        word_count: words.length,
        line_count: lines.length,
        preview: preview.substring(0, 500) + (preview.length > 500 ? '...' : ''),
        sections: {
          vulnerabilities: sections.vulnerabilities.slice(0, 5), // Limit to first 5
          ofcs: sections.ofcs.slice(0, 5),
          sectors: sections.sectors.slice(0, 5),
          sources: sections.sources.slice(0, 5)
        },
        estimated_processing_time: Math.ceil(words.length / 1000) + ' seconds'
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
