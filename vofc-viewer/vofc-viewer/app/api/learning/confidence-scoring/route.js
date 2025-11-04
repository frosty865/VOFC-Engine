import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';

// Advanced confidence scoring system with multiple quality factors
export async function POST(request) {
  try {
    const { documentId, content, extractionResult, options = {} } = await request.json();
    
    console.log(`🧠 Calculating advanced confidence score for document: ${documentId}`);
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Calculate comprehensive confidence score
    const confidenceAnalysis = await calculateAdvancedConfidence(
      content, 
      extractionResult, 
      options,
      supabaseServer
    );

    // Store confidence analysis
    await supabaseServer
      .from('confidence_analyses')
      .insert({
        document_id: documentId,
        overall_confidence: confidenceAnalysis.overall,
        ocr_clarity: confidenceAnalysis.ocrClarity,
        text_length_factor: confidenceAnalysis.textLength,
        citation_density: confidenceAnalysis.citationDensity,
        structure_quality: confidenceAnalysis.structureQuality,
        content_completeness: confidenceAnalysis.contentCompleteness,
        extraction_quality: confidenceAnalysis.extractionQuality,
        factors: confidenceAnalysis.factors,
        recommendations: confidenceAnalysis.recommendations,
        analyzed_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      confidence_analysis: confidenceAnalysis
    });

  } catch (error) {
    console.error('❌ Confidence scoring error:', error);
    return NextResponse.json({ error: 'Confidence scoring failed' }, { status: 500 });
  }
}

// Calculate advanced confidence score with multiple quality factors
async function calculateAdvancedConfidence(content, extractionResult, options, supabaseServer) {
  const analysis = {
    overall: 0,
    ocrClarity: 0,
    textLength: 0,
    citationDensity: 0,
    structureQuality: 0,
    contentCompleteness: 0,
    extractionQuality: 0,
    factors: {},
    recommendations: []
  };

  try {
    // Factor 1: OCR Clarity and Text Quality
    analysis.ocrClarity = await calculateOCRClarity(content);
    analysis.factors.ocr_clarity = {
      score: analysis.ocrClarity,
      weight: 0.25,
      description: 'Text clarity and readability from OCR/PDF extraction'
    };

    // Factor 2: Text Length and Content Volume
    analysis.textLength = calculateTextLengthFactor(content);
    analysis.factors.text_length = {
      score: analysis.textLength,
      weight: 0.15,
      description: 'Content volume and length appropriateness'
    };

    // Factor 3: Citation Density and Quality
    analysis.citationDensity = calculateCitationDensity(content, extractionResult);
    analysis.factors.citation_density = {
      score: analysis.citationDensity,
      weight: 0.20,
      description: 'Presence and quality of citations and references'
    };

    // Factor 4: Document Structure Quality
    analysis.structureQuality = calculateStructureQuality(content);
    analysis.factors.structure_quality = {
      score: analysis.structureQuality,
      weight: 0.15,
      description: 'Document organization and structural elements'
    };

    // Factor 5: Content Completeness
    analysis.contentCompleteness = calculateContentCompleteness(content, extractionResult);
    analysis.factors.content_completeness = {
      score: analysis.contentCompleteness,
      weight: 0.15,
      description: 'Completeness of extracted vulnerabilities and OFCs'
    };

    // Factor 6: Extraction Quality
    analysis.extractionQuality = calculateExtractionQuality(extractionResult);
    analysis.factors.extraction_quality = {
      score: analysis.extractionQuality,
      weight: 0.10,
      description: 'Quality of AI extraction results'
    };

    // Calculate weighted overall confidence
    analysis.overall = (
      analysis.ocrClarity * 0.25 +
      analysis.textLength * 0.15 +
      analysis.citationDensity * 0.20 +
      analysis.structureQuality * 0.15 +
      analysis.contentCompleteness * 0.15 +
      analysis.extractionQuality * 0.10
    );

    // Generate recommendations based on analysis
    analysis.recommendations = generateConfidenceRecommendations(analysis);

    console.log(`🧠 Confidence analysis completed: ${Math.round(analysis.overall * 100)}%`);

    return analysis;

  } catch (error) {
    console.error('❌ Confidence calculation error:', error);
    return {
      overall: 0.5,
      ocrClarity: 0.5,
      textLength: 0.5,
      citationDensity: 0.5,
      structureQuality: 0.5,
      contentCompleteness: 0.5,
      extractionQuality: 0.5,
      factors: {},
      recommendations: ['Confidence calculation failed - using default values']
    };
  }
}

// Calculate OCR clarity and text quality
async function calculateOCRClarity(content) {
  let score = 0.5; // Base score

  try {
    // Check for common OCR artifacts
    const ocrArtifacts = [
      /\s{3,}/g, // Multiple spaces
      /[^\w\s.,;:!?()-]/g, // Non-standard characters
      /\b\w{1}\s+\w{1}\b/g, // Single character words with spaces
      /[A-Z]{3,}/g, // All caps words (potential OCR errors)
      /\d+[A-Z]+\d+/g // Mixed numbers and letters
    ];

    let artifactCount = 0;
    for (const pattern of ocrArtifacts) {
      const matches = content.match(pattern);
      if (matches) artifactCount += matches.length;
    }

    // Calculate artifact ratio
    const artifactRatio = artifactCount / (content.length / 100); // Per 100 characters
    score = Math.max(0.1, 1.0 - (artifactRatio * 0.1)); // Reduce score based on artifacts

    // Check for readable text patterns
    const readablePatterns = [
      /\b[a-zA-Z]{3,}\b/g, // Words with 3+ letters
      /[.!?]\s+[A-Z]/g, // Sentence boundaries
      /\b(and|the|of|to|in|for|with|on|at|by|from|up|about|into|through|during|before|after|above|below|between|among)\b/gi // Common words
    ];

    let readableScore = 0;
    for (const pattern of readablePatterns) {
      const matches = content.match(pattern);
      if (matches) readableScore += matches.length;
    }

    // Combine artifact penalty with readability bonus
    score = Math.min(1.0, score + (readableScore / (content.length / 1000)) * 0.2);

    return Math.round(score * 100) / 100;

  } catch (error) {
    console.error('OCR clarity calculation error:', error);
    return 0.5;
  }
}

// Calculate text length factor
function calculateTextLengthFactor(content) {
  const length = content.length;
  const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
  
  let score = 0.5; // Base score

  // Optimal length ranges for different document types
  if (wordCount >= 100 && wordCount <= 5000) {
    score = 0.9; // Optimal range
  } else if (wordCount >= 50 && wordCount < 100) {
    score = 0.7; // Short but acceptable
  } else if (wordCount > 5000 && wordCount <= 15000) {
    score = 0.8; // Long but acceptable
  } else if (wordCount < 50) {
    score = 0.3; // Too short
  } else {
    score = 0.6; // Very long
  }

  // Bonus for good word-to-character ratio (indicates proper spacing)
  const wordCharRatio = wordCount / length;
  if (wordCharRatio > 0.15 && wordCharRatio < 0.25) {
    score += 0.1; // Good spacing
  }

  return Math.min(1.0, Math.max(0.1, score));
}

// Calculate citation density and quality
function calculateCitationDensity(content, extractionResult) {
  let score = 0.5; // Base score

  try {
    // Citation patterns
    const citationPatterns = [
      /\([A-Za-z\s]+,\s*\d{4}\)/g, // (Author, Year)
      /\[[\d,\s-]+\]/g, // [1, 2, 3]
      /\b(doi:|DOI:|https?:\/\/)/g, // DOI and URLs
      /\b(et al\.|et al)\b/g, // Academic citations
      /\b(pp\.|pages?|vol\.|volume|no\.|number)\b/g, // Publication references
      /\b(ed\.|editor|eds\.|editors)\b/g, // Editorial references
      /\b(trans\.|translated|translation)\b/g, // Translation references
      /\b(ref\.|reference|references)\b/g // Reference mentions
    ];

    let citationCount = 0;
    for (const pattern of citationPatterns) {
      const matches = content.match(pattern);
      if (matches) citationCount += matches.length;
    }

    // Calculate citation density
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const citationDensity = citationCount / (wordCount / 100); // Citations per 100 words

    // Score based on citation density
    if (citationDensity >= 2 && citationDensity <= 10) {
      score = 0.9; // Good citation density
    } else if (citationDensity >= 1 && citationDensity < 2) {
      score = 0.7; // Moderate citations
    } else if (citationDensity > 10) {
      score = 0.8; // High citation density
    } else {
      score = 0.4; // Low citation density
    }

    // Bonus for extracted sources in results
    if (extractionResult && extractionResult.vulnerabilities) {
      const hasSources = extractionResult.vulnerabilities.some(v => v.source);
      if (hasSources) score += 0.1;
    }

    return Math.min(1.0, Math.max(0.1, score));

  } catch (error) {
    console.error('Citation density calculation error:', error);
    return 0.5;
  }
}

// Calculate document structure quality
function calculateStructureQuality(content) {
  let score = 0.5; // Base score

  try {
    // Structural elements
    const structureElements = [
      /^(#+\s+|\d+\.\s+|\*\s+)/gm, // Headers and lists
      /^(Abstract|Introduction|Methodology|Results|Discussion|Conclusion|References)/gmi, // Section headers
      /^(Executive Summary|Background|Analysis|Findings|Recommendations)/gmi, // Report sections
      /^(Vulnerability|Risk|Threat|Mitigation|Control|Safeguard)/gmi, // Security sections
      /^(Table|Figure|Appendix|Figure \d+|Table \d+)/gmi, // Figures and tables
      /^(References|Bibliography|Sources|Citations)/gmi // Reference sections
    ];

    let structureCount = 0;
    for (const pattern of structureElements) {
      const matches = content.match(pattern);
      if (matches) structureCount += matches.length;
    }

    // Calculate structure score
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const structureRatio = structureCount / (wordCount / 100); // Structural elements per 100 words

    if (structureRatio >= 1 && structureRatio <= 5) {
      score = 0.9; // Good structure
    } else if (structureRatio >= 0.5 && structureRatio < 1) {
      score = 0.7; // Moderate structure
    } else if (structureRatio > 5) {
      score = 0.8; // Very structured
    } else {
      score = 0.4; // Poor structure
    }

    // Bonus for paragraph structure
    const paragraphCount = content.split(/\n\s*\n/).length;
    const avgParagraphLength = wordCount / paragraphCount;
    if (avgParagraphLength >= 50 && avgParagraphLength <= 200) {
      score += 0.1; // Good paragraph length
    }

    return Math.min(1.0, Math.max(0.1, score));

  } catch (error) {
    console.error('Structure quality calculation error:', error);
    return 0.5;
  }
}

// Calculate content completeness
function calculateContentCompleteness(content, extractionResult) {
  let score = 0.5; // Base score

  try {
    if (!extractionResult) return score;

    // Check for vulnerabilities
    const vulnerabilityCount = extractionResult.vulnerabilities?.length || 0;
    const ofcCount = extractionResult.options_for_consideration?.length || 0;
    const totalFindings = vulnerabilityCount + ofcCount;

    // Score based on findings count
    if (totalFindings >= 3 && totalFindings <= 15) {
      score = 0.9; // Good number of findings
    } else if (totalFindings >= 1 && totalFindings < 3) {
      score = 0.7; // Some findings
    } else if (totalFindings > 15) {
      score = 0.8; // Many findings
    } else {
      score = 0.3; // No findings
    }

    // Check for content quality indicators
    const qualityIndicators = [
      /vulnerability|vulnerabilities|weakness|weaknesses|risk|risks|threat|threats/gi,
      /mitigation|mitigations|control|controls|safeguard|safeguards|protection|protections/gi,
      /recommendation|recommendations|suggestion|suggestions|action|actions/gi,
      /security|cybersecurity|information security|cyber security/gi,
      /assessment|evaluation|analysis|review|audit/gi
    ];

    let qualityScore = 0;
    for (const pattern of qualityIndicators) {
      const matches = content.match(pattern);
      if (matches) qualityScore += matches.length;
    }

    // Bonus for quality indicators
    const wordCount = content.split(/\s+/).filter(word => word.length > 0).length;
    const qualityRatio = qualityScore / (wordCount / 100);
    if (qualityRatio >= 1) {
      score += 0.1; // Good quality indicators
    }

    return Math.min(1.0, Math.max(0.1, score));

  } catch (error) {
    console.error('Content completeness calculation error:', error);
    return 0.5;
  }
}

// Calculate extraction quality
function calculateExtractionQuality(extractionResult) {
  let score = 0.5; // Base score

  try {
    if (!extractionResult) return score;

    // Check extraction completeness
    const hasVulnerabilities = extractionResult.vulnerabilities && extractionResult.vulnerabilities.length > 0;
    const hasOFCs = extractionResult.options_for_consideration && extractionResult.options_for_consideration.length > 0;
    const hasTitle = extractionResult.title && extractionResult.title.length > 0;

    if (hasVulnerabilities && hasOFCs && hasTitle) {
      score = 0.9; // Complete extraction
    } else if ((hasVulnerabilities || hasOFCs) && hasTitle) {
      score = 0.7; // Partial extraction
    } else if (hasVulnerabilities || hasOFCs) {
      score = 0.5; // Minimal extraction
    } else {
      score = 0.2; // Poor extraction
    }

    // Check for detailed information
    if (hasVulnerabilities) {
      const avgVulnLength = extractionResult.vulnerabilities.reduce((sum, v) => 
        sum + (v.text ? v.text.length : 0), 0) / extractionResult.vulnerabilities.length;
      if (avgVulnLength > 50) score += 0.1; // Detailed vulnerabilities
    }

    if (hasOFCs) {
      const avgOFCLength = extractionResult.options_for_consideration.reduce((sum, o) => 
        sum + (o.text ? o.text.length : 0), 0) / extractionResult.options_for_consideration.length;
      if (avgOFCLength > 50) score += 0.1; // Detailed OFCs
    }

    return Math.min(1.0, Math.max(0.1, score));

  } catch (error) {
    console.error('Extraction quality calculation error:', error);
    return 0.5;
  }
}

// Generate confidence recommendations
function generateConfidenceRecommendations(analysis) {
  const recommendations = [];

  if (analysis.ocrClarity < 0.6) {
    recommendations.push({
      type: 'ocr_improvement',
      priority: 'high',
      message: 'Low OCR clarity detected. Consider using higher quality PDFs or alternative extraction methods.'
    });
  }

  if (analysis.citationDensity < 0.4) {
    recommendations.push({
      type: 'citation_improvement',
      priority: 'medium',
      message: 'Low citation density. Document may lack authoritative references.'
    });
  }

  if (analysis.structureQuality < 0.5) {
    recommendations.push({
      type: 'structure_improvement',
      priority: 'medium',
      message: 'Poor document structure. Consider using more structured documents.'
    });
  }

  if (analysis.contentCompleteness < 0.4) {
    recommendations.push({
      type: 'content_improvement',
      priority: 'high',
      message: 'Low content completeness. Document may not contain sufficient security information.'
    });
  }

  if (analysis.extractionQuality < 0.6) {
    recommendations.push({
      type: 'extraction_improvement',
      priority: 'high',
      message: 'Poor extraction quality. Consider using different AI models or prompts.'
    });
  }

  if (analysis.overall < 0.5) {
    recommendations.push({
      type: 'overall_improvement',
      priority: 'critical',
      message: 'Overall confidence is low. Document may not be suitable for VOFC analysis.'
    });
  }

  return recommendations;
}
