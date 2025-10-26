// Simple document processing test for VOFC system
const fs = require('fs');
const path = require('path');

// Test document content (simulated PDF text)
const TEST_DOCUMENT = `
UFC 4-010-01: DoD Minimum Antiterrorism Standards for Buildings

SECTION 1: PERIMETER SECURITY

1.1 Vehicle Barriers
The facility shall implement vehicle barriers at all entry points. Barriers must be capable of stopping a 15,000-pound vehicle traveling at 30 mph. Standoff distances shall be maintained as specified in Table 1-1.

1.2 Access Control
All personnel entry points shall be controlled by security personnel or electronic access control systems. Visitor access must be logged and monitored. Emergency exits shall be alarmed and monitored.

SECTION 2: BUILDING ENVELOPE

2.1 Glazing Requirements
All exterior glazing shall be blast-resistant and meet UFC 4-010-01 requirements. Glazing must be capable of withstanding specified blast loads without failure. Progressive collapse protection shall be provided for structural elements.

2.2 Structural Design
The building structure shall be designed to resist progressive collapse. Critical load-bearing elements must be protected from vehicle-borne threats. Emergency evacuation routes should be clearly marked and maintained.

SECTION 3: COMMAND AND CONTROL

3.1 Communication Systems
The command and control center shall have redundant communication systems and backup power. Interoperable radio systems must be maintained for emergency coordination. Regular exercises should be conducted to test response procedures.

3.2 Emergency Management
Emergency evacuation procedures shall be posted and regularly updated. Fire suppression systems must be maintained and tested annually. Emergency lighting shall be provided for all egress routes.
`;

async function testDocumentProcessing() {
  console.log('📄 Testing Document Processing Pipeline\n');
  
  // Simulate PDF parsing
  console.log('1️⃣ PDF Text Extraction...');
  const pages = TEST_DOCUMENT.split('\n\n').map((text, index) => ({
    page: index + 1,
    text: text.trim()
  }));
  
  console.log(`   Extracted ${pages.length} pages`);
  
  // Test chunking
  console.log('\n2️⃣ Text Chunking...');
  const chunks = splitIntoChunks(pages.map(p => p.text));
  console.log(`   Created ${chunks.length} chunks`);
  
  // Display chunk details
  chunks.forEach((chunk, index) => {
    const score = calculateChunkScore(chunk.text);
    console.log(`   Chunk ${index + 1} (Page ${chunk.page}): Score ${score.toFixed(2)}, Length ${chunk.text.length}`);
  });
  
  // Test batch processing simulation
  console.log('\n3️⃣ Batch Processing Simulation...');
  const batchSize = 3;
  const batches = [];
  
  for (let i = 0; i < chunks.length; i += batchSize) {
    batches.push(chunks.slice(i, i + batchSize));
  }
  
  console.log(`   Created ${batches.length} batches of size ${batchSize}`);
  
  // Simulate processing each batch
  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    console.log(`   Processing batch ${i + 1}/${batches.length}...`);
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Simulate results
    const simulatedResults = batch.map(chunk => ({
      category: getCategoryFromText(chunk.text),
      vulnerability: generateVulnerability(chunk.text),
      options_for_consideration: generateOptions(chunk.text)
    }));
    
    console.log(`     Generated ${simulatedResults.length} vulnerabilities`);
  }
  
  console.log('\n✅ Document processing test completed successfully!');
}

function splitIntoChunks(textByPages) {
  const out = [];
  
  textByPages.forEach((pageText, i) => {
    const page = i + 1;
    if (!pageText?.trim()) return;
    
    // Enhanced sentence splitting
    const sentences = pageText.split(/(?<=[.!?;])\s+(?=[A-Z])/g);
    let currentChunk = '';
    let lastSentence = '';
    
    for (const sentence of sentences) {
      const testChunk = (currentChunk + ' ' + sentence).trim();
      
      if (testChunk.length > 1000) {
        if (currentChunk.length >= 200) {
          out.push({ page, text: currentChunk });
        }
        currentChunk = lastSentence + ' ' + sentence;
      } else {
        currentChunk = testChunk;
        lastSentence = sentence;
      }
    }
    
    if (currentChunk.length >= 200) {
      out.push({ page, text: currentChunk });
    }
  });
  
  // Filter for security-relevant content
  const securityKeywords = [
    'shall', 'must', 'should', 'may', 'required', 'mandatory',
    'recommended', 'recommendation', 'best practice', 'guideline',
    'vehicle', 'standoff', 'glazing', 'progressive collapse',
    'intake', 'command', 'coordination', 'interoperable', 'exercise',
    'security', 'access control', 'perimeter', 'surveillance',
    'emergency', 'evacuation', 'fire', 'blast', 'threat',
    'vulnerability', 'risk', 'mitigation', 'protection'
  ];
  
  const keywordRegex = new RegExp(`\\b(${securityKeywords.join('|')})\\b`, 'i');
  
  return out.filter(chunk => {
    if (!keywordRegex.test(chunk.text)) return false;
    
    const hasNumbers = /\d+/.test(chunk.text);
    const hasActionWords = /\b(implement|install|provide|ensure|maintain|monitor|test|verify)\b/i.test(chunk.text);
    
    return hasNumbers || hasActionWords;
  });
}

function calculateChunkScore(text) {
  const securityKeywords = [
    'shall', 'must', 'should', 'may', 'required', 'mandatory',
    'recommended', 'recommendation', 'best practice', 'guideline',
    'vehicle', 'standoff', 'glazing', 'progressive collapse',
    'intake', 'command', 'coordination', 'interoperable', 'exercise',
    'security', 'access control', 'perimeter', 'surveillance',
    'emergency', 'evacuation', 'fire', 'blast', 'threat',
    'vulnerability', 'risk', 'mitigation', 'protection'
  ];
  
  let score = 0;
  const lowerText = text.toLowerCase();
  
  securityKeywords.forEach(keyword => {
    const matches = (lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length;
    score += matches * (keyword.length > 5 ? 2 : 1);
  });
  
  score += (text.match(/\d+/g) || []).length * 0.5;
  
  const actionWords = ['implement', 'install', 'provide', 'ensure', 'maintain', 'monitor', 'test', 'verify'];
  actionWords.forEach(word => {
    score += (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
  });
  
  return score;
}

function getCategoryFromText(text) {
  const categories = {
    'Perimeter Security': ['perimeter', 'vehicle', 'barrier', 'standoff', 'access control'],
    'Building Envelope / Glazing': ['glazing', 'blast', 'structural', 'progressive collapse'],
    'Command and Control': ['command', 'control', 'communication', 'radio', 'coordination'],
    'Emergency Management': ['emergency', 'evacuation', 'fire', 'lighting', 'egress']
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }
  
  return 'Security Management';
}

function generateVulnerability(text) {
  const lowerText = text.toLowerCase();
  
  if (lowerText.includes('shall') || lowerText.includes('must')) {
    if (lowerText.includes('vehicle')) {
      return 'Inadequate vehicle barrier protection creates vulnerability to vehicle-borne threats';
    } else if (lowerText.includes('glazing')) {
      return 'Non-blast-resistant glazing creates vulnerability to blast effects';
    } else if (lowerText.includes('access')) {
      return 'Inadequate access control creates security vulnerabilities';
    }
  }
  
  return 'Security requirement not properly implemented creates operational vulnerability';
}

function generateOptions(text) {
  const lowerText = text.toLowerCase();
  const options = [];
  
  if (lowerText.includes('vehicle')) {
    options.push({
      option_text: 'Install crash-rated vehicle barriers at all entry points',
      sources: [{ reference_number: 1, source_text: 'UFC 4-010-01 Section 1.1' }]
    });
  }
  
  if (lowerText.includes('glazing')) {
    options.push({
      option_text: 'Replace existing glazing with blast-resistant materials',
      sources: [{ reference_number: 2, source_text: 'UFC 4-010-01 Section 2.1' }]
    });
  }
  
  if (lowerText.includes('access')) {
    options.push({
      option_text: 'Implement electronic access control system with logging',
      sources: [{ reference_number: 3, source_text: 'UFC 4-010-01 Section 1.2' }]
    });
  }
  
  return options.length > 0 ? options : [{
    option_text: 'Review and implement security requirements per applicable standards',
    sources: [{ reference_number: 0, source_text: 'Document reference' }]
  }];
}

// Run the test
if (require.main === module) {
  testDocumentProcessing().catch(console.error);
}

module.exports = {
  testDocumentProcessing,
  splitIntoChunks,
  calculateChunkScore
};
