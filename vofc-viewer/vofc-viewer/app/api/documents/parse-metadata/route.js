import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // For now, we'll use basic file metadata and filename parsing
    // In a production system, you'd use OCR libraries like Tesseract.js
    // or PDF parsing libraries like pdf-parse
    
    const parsedData = await parseDocumentMetadata(file);
    
    return NextResponse.json({
      success: true,
      parsedData
    });

  } catch (error) {
    console.error('Document parsing error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to parse document' },
      { status: 500 }
    );
  }
}

async function parseDocumentMetadata(file) {
  const fileName = file.name;
  const fileSize = file.size;
  const fileType = file.type;
  
  // Basic filename parsing
  const title = extractTitleFromFilename(fileName);
  const organization = extractOrganizationFromFilename(fileName);
  const year = extractYearFromFilename(fileName);
  const sourceType = determineSourceType(fileName, fileType);
  
  return {
    title,
    organization,
    year,
    sourceType,
    url: null, // Would need OCR to extract URLs
    confidence: 'medium' // Basic parsing confidence
  };
}

function extractTitleFromFilename(filename) {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.[^/.]+$/, '');
  
  // Common patterns for document titles
  const patterns = [
    /^(.+?)(?:\s*-\s*\d{4})/, // "Title - 2024"
    /^(.+?)(?:\s*\(\d{4}\))/, // "Title (2024)"
    /^(.+?)(?:\s*\d{4})/, // "Title 2024"
    /^(.+?)(?:\s*-\s*[A-Z]{2,})/, // "Title - DHS"
    /^(.+?)(?:\s*\([A-Z]{2,}\))/, // "Title (DHS)"
  ];
  
  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match) {
      return cleanTitle(match[1]);
    }
  }
  
  // If no pattern matches, use the whole filename
  return cleanTitle(nameWithoutExt);
}

function extractOrganizationFromFilename(filename) {
  const orgPatterns = [
    /(?:^|\s)(DHS|CISA|FEMA|NSA|FBI|CIA|DOD|DOE|DOT|EPA|FDA|USDA|HHS|Treasury|State|Justice|Interior|Labor|Commerce|Education|HUD|Transportation|Energy|Veterans|Homeland Security)(?:\s|$)/i,
    /(?:^|\s)(Department of [A-Za-z\s]+)(?:\s|$)/i,
    /(?:^|\s)([A-Z]{2,} Security)(?:\s|$)/i,
    /(?:^|\s)([A-Z]{2,} Agency)(?:\s|$)/i,
    /(?:^|\s)([A-Z]{2,} Administration)(?:\s|$)/i,
  ];
  
  for (const pattern of orgPatterns) {
    const match = filename.match(pattern);
    if (match) {
      return match[1].trim();
    }
  }
  
  return null;
}

function extractYearFromFilename(filename) {
  const yearPattern = /\b(19|20)\d{2}\b/;
  const match = filename.match(yearPattern);
  return match ? parseInt(match[0]) : new Date().getFullYear();
}

function determineSourceType(filename, mimeType) {
  const lowerFilename = filename.toLowerCase();
  
  // Government patterns
  if (lowerFilename.includes('government') || 
      lowerFilename.includes('federal') || 
      lowerFilename.includes('dhs') || 
      lowerFilename.includes('cisa') ||
      lowerFilename.includes('fema') ||
      lowerFilename.includes('department')) {
    return 'government';
  }
  
  // Academic patterns
  if (lowerFilename.includes('research') || 
      lowerFilename.includes('study') || 
      lowerFilename.includes('university') || 
      lowerFilename.includes('academic') ||
      lowerFilename.includes('journal')) {
    return 'academic';
  }
  
  // Industry patterns
  if (lowerFilename.includes('industry') || 
      lowerFilename.includes('private') || 
      lowerFilename.includes('corporate') || 
      lowerFilename.includes('business') ||
      lowerFilename.includes('company')) {
    return 'industry';
  }
  
  // NGO patterns
  if (lowerFilename.includes('ngo') || 
      lowerFilename.includes('nonprofit') || 
      lowerFilename.includes('foundation') || 
      lowerFilename.includes('association')) {
    return 'ngo';
  }
  
  // Default based on file type
  if (mimeType.includes('pdf')) {
    return 'government'; // Assume government for PDFs
  }
  
  return 'unknown';
}

function cleanTitle(title) {
  return title
    .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
