import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';

// Heuristic pattern recognition and caching system
export async function POST(request) {
  try {
    const { action, documentContent, filename, options = {} } = await request.json();
    
    console.log(`🧠 Heuristic pattern processing: ${action} for ${filename}`);
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    switch (action) {
      case 'recognize_patterns':
        return await recognizeDocumentPatterns(documentContent, filename, supabaseServer);
      
      case 'cache_pattern':
        return await cacheHeuristicPattern(options, supabaseServer);
      
      case 'get_cached_patterns':
        return await getCachedPatterns(options, supabaseServer);
      
      case 'update_pattern_usage':
        return await updatePatternUsage(options, supabaseServer);
      
      case 'analyze_pattern_effectiveness':
        return await analyzePatternEffectiveness(supabaseServer);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Heuristic pattern error:', error);
    return NextResponse.json({ error: 'Heuristic pattern processing failed' }, { status: 500 });
  }
}

// Recognize document patterns using cached heuristics
async function recognizeDocumentPatterns(content, filename, supabaseServer) {
  console.log('🔍 Recognizing document patterns...');
  
  try {
    // Get cached patterns
    const { data: patterns, error } = await supabaseServer
      .from('heuristic_patterns')
      .select('*')
      .order('success_rate', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch patterns: ${error.message}`);
    }

    const recognizedPatterns = [];
    const documentType = filename.split('.').pop().toLowerCase();
    
    // Analyze content against each pattern
    for (const pattern of patterns) {
      const matchResult = await analyzePatternMatch(content, pattern, documentType);
      
      if (matchResult.confidence > pattern.confidence_threshold) {
        recognizedPatterns.push({
          pattern_name: pattern.pattern_name,
          pattern_type: pattern.pattern_type,
          confidence: matchResult.confidence,
          match_details: matchResult.details,
          suggested_processing: matchResult.suggestedProcessing
        });
      }
    }

    // Create new pattern if no matches found
    if (recognizedPatterns.length === 0) {
      const newPattern = await createNewPattern(content, filename, supabaseServer);
      if (newPattern) {
        recognizedPatterns.push(newPattern);
      }
    }

    // Update pattern usage statistics
    for (const recognized of recognizedPatterns) {
      await updatePatternUsage({
        patternName: recognized.pattern_name,
        used: true,
        confidence: recognized.confidence
      }, supabaseServer);
    }

    return NextResponse.json({
      success: true,
      recognized_patterns: recognizedPatterns,
      document_type: documentType,
      total_patterns_checked: patterns.length,
      new_patterns_created: recognizedPatterns.filter(p => p.is_new).length
    });

  } catch (error) {
    console.error('❌ Pattern recognition error:', error);
    return NextResponse.json({ error: 'Pattern recognition failed' }, { status: 500 });
  }
}

// Analyze pattern match against document content
async function analyzePatternMatch(content, pattern, documentType) {
  const matchResult = {
    confidence: 0,
    details: {},
    suggestedProcessing: {}
  };

  try {
    const patternData = pattern.pattern_data;
    
    // Check document structure patterns
    if (pattern.pattern_type === 'document_structure') {
      matchResult.confidence = analyzeDocumentStructure(content, patternData);
      matchResult.details = {
        sections_found: extractSections(content),
        headers_found: extractHeaders(content),
        structure_score: matchResult.confidence
      };
      matchResult.suggestedProcessing = {
        extraction_method: 'structured',
        confidence_boost: 0.1,
        processing_priority: 'high'
      };
    }

    // Check citation format patterns
    else if (pattern.pattern_type === 'citation_format') {
      matchResult.confidence = analyzeCitationFormat(content, patternData);
      matchResult.details = {
        citation_count: countCitations(content),
        citation_types: identifyCitationTypes(content),
        format_score: matchResult.confidence
      };
      matchResult.suggestedProcessing = {
        extraction_method: 'citation_aware',
        confidence_boost: 0.15,
        processing_priority: 'normal'
      };
    }

    // Check content layout patterns
    else if (pattern.pattern_type === 'content_layout') {
      matchResult.confidence = analyzeContentLayout(content, patternData);
      matchResult.details = {
        layout_elements: extractLayoutElements(content),
        content_flow: analyzeContentFlow(content),
        layout_score: matchResult.confidence
      };
      matchResult.suggestedProcessing = {
        extraction_method: 'layout_aware',
        confidence_boost: 0.05,
        processing_priority: 'normal'
      };
    }

    // Check security document patterns
    else if (pattern.pattern_type === 'security_document') {
      matchResult.confidence = analyzeSecurityDocument(content, patternData);
      matchResult.details = {
        security_terms: countSecurityTerms(content),
        vulnerability_indicators: findVulnerabilityIndicators(content),
        ofc_indicators: findOFCIndicators(content),
        security_score: matchResult.confidence
      };
      matchResult.suggestedProcessing = {
        extraction_method: 'security_focused',
        confidence_boost: 0.2,
        processing_priority: 'high'
      };
    }

    return matchResult;

  } catch (error) {
    console.error('Pattern match analysis error:', error);
    return { confidence: 0, details: {}, suggestedProcessing: {} };
  }
}

// Analyze document structure
function analyzeDocumentStructure(content, patternData) {
  let score = 0;
  
  try {
    const expectedSections = patternData.expected_sections || [];
    const foundSections = extractSections(content);
    
    // Check for expected sections
    let sectionMatches = 0;
    for (const expected of expectedSections) {
      if (foundSections.some(section => 
        section.toLowerCase().includes(expected.toLowerCase())
      )) {
        sectionMatches++;
      }
    }
    
    if (expectedSections.length > 0) {
      score += (sectionMatches / expectedSections.length) * 0.4;
    }

    // Check for headers and structure
    const headers = extractHeaders(content);
    if (headers.length > 0) {
      score += Math.min(0.3, headers.length / 10) * 0.3;
    }

    // Check for lists and bullet points
    const listItems = content.match(/^\s*[•\-\*]\s+/gm) || [];
    if (listItems.length > 0) {
      score += Math.min(0.2, listItems.length / 20) * 0.2;
    }

    // Check for numbered sections
    const numberedSections = content.match(/^\s*\d+\.\s+/gm) || [];
    if (numberedSections.length > 0) {
      score += Math.min(0.1, numberedSections.length / 10) * 0.1;
    }

    return Math.min(1.0, score);

  } catch (error) {
    console.error('Document structure analysis error:', error);
    return 0.5;
  }
}

// Analyze citation format
function analyzeCitationFormat(content, patternData) {
  let score = 0;
  
  try {
    const expectedFormats = patternData.expected_formats || [];
    const foundCitations = countCitations(content);
    
    // Check citation density
    const wordCount = content.split(/\s+/).length;
    const citationDensity = foundCitations / (wordCount / 100);
    
    if (citationDensity >= 2 && citationDensity <= 10) {
      score += 0.4; // Good citation density
    } else if (citationDensity >= 1) {
      score += 0.2; // Some citations
    }

    // Check for specific citation formats
    for (const format of expectedFormats) {
      const pattern = new RegExp(format, 'gi');
      const matches = content.match(pattern);
      if (matches && matches.length > 0) {
        score += 0.3; // Found expected format
      }
    }

    // Check for reference sections
    const referenceSections = content.match(/^(References|Bibliography|Sources)/gmi);
    if (referenceSections) {
      score += 0.3; // Has reference section
    }

    return Math.min(1.0, score);

  } catch (error) {
    console.error('Citation format analysis error:', error);
    return 0.5;
  }
}

// Analyze content layout
function analyzeContentLayout(content, patternData) {
  let score = 0;
  
  try {
    const expectedLayout = patternData.expected_layout || {};
    
    // Check for tables
    const tableRows = content.match(/^\s*\|.*\|.*$/gm) || [];
    if (tableRows.length > 0) {
      score += Math.min(0.3, tableRows.length / 10);
    }

    // Check for figures and images
    const figures = content.match(/Figure \d+|Fig\. \d+|Image \d+/gi) || [];
    if (figures.length > 0) {
      score += Math.min(0.2, figures.length / 5);
    }

    // Check for consistent formatting
    const consistentFormatting = checkConsistentFormatting(content);
    score += consistentFormatting * 0.3;

    // Check for proper spacing
    const properSpacing = checkProperSpacing(content);
    score += properSpacing * 0.2;

    return Math.min(1.0, score);

  } catch (error) {
    console.error('Content layout analysis error:', error);
    return 0.5;
  }
}

// Analyze security document patterns
function analyzeSecurityDocument(content, patternData) {
  let score = 0;
  
  try {
    // Security terminology
    const securityTerms = countSecurityTerms(content);
    const wordCount = content.split(/\s+/).length;
    const securityTermDensity = securityTerms / (wordCount / 100);
    
    if (securityTermDensity >= 1) {
      score += 0.4; // Good security terminology
    }

    // Vulnerability indicators
    const vulnIndicators = findVulnerabilityIndicators(content);
    if (vulnIndicators.length > 0) {
      score += Math.min(0.3, vulnIndicators.length / 10);
    }

    // OFC indicators
    const ofcIndicators = findOFCIndicators(content);
    if (ofcIndicators.length > 0) {
      score += Math.min(0.3, ofcIndicators.length / 10);
    }

    return Math.min(1.0, score);

  } catch (error) {
    console.error('Security document analysis error:', error);
    return 0.5;
  }
}

// Helper functions for pattern analysis
function extractSections(content) {
  const sections = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[A-Z][a-z\s]+$/)) {
      sections.push(trimmed);
    }
  }
  
  return sections;
}

function extractHeaders(content) {
  const headers = [];
  const lines = content.split('\n');
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^#+\s+/) || trimmed.match(/^\d+\.\s+/) || trimmed.match(/^[A-Z][a-z\s]+:$/)) {
      headers.push(trimmed);
    }
  }
  
  return headers;
}

function countCitations(content) {
  const citationPatterns = [
    /\([A-Za-z\s]+,\s*\d{4}\)/g,
    /\[[\d,\s-]+\]/g,
    /\b(doi:|DOI:|https?:\/\/)/g,
    /\b(et al\.|et al)\b/g
  ];
  
  let count = 0;
  for (const pattern of citationPatterns) {
    const matches = content.match(pattern);
    if (matches) count += matches.length;
  }
  
  return count;
}

function identifyCitationTypes(content) {
  const types = {
    parenthetical: (content.match(/\([A-Za-z\s]+,\s*\d{4}\)/g) || []).length,
    numbered: (content.match(/\[[\d,\s-]+\]/g) || []).length,
    doi: (content.match(/\b(doi:|DOI:)/g) || []).length,
    url: (content.match(/https?:\/\//g) || []).length
  };
  
  return types;
}

function extractLayoutElements(content) {
  return {
    tables: (content.match(/^\s*\|.*\|.*$/gm) || []).length,
    lists: (content.match(/^\s*[•\-\*]\s+/gm) || []).length,
    numbered: (content.match(/^\s*\d+\.\s+/gm) || []).length,
    figures: (content.match(/Figure \d+|Fig\. \d+/gi) || []).length
  };
}

function analyzeContentFlow(content) {
  const paragraphs = content.split(/\n\s*\n/);
  const avgLength = paragraphs.reduce((sum, p) => sum + p.length, 0) / paragraphs.length;
  
  return {
    paragraph_count: paragraphs.length,
    avg_paragraph_length: avgLength,
    flow_score: avgLength > 100 && avgLength < 500 ? 0.8 : 0.5
  };
}

function countSecurityTerms(content) {
  const securityTerms = [
    'vulnerability', 'vulnerabilities', 'threat', 'threats', 'risk', 'risks',
    'security', 'cybersecurity', 'information security', 'cyber security',
    'attack', 'attacks', 'exploit', 'exploits', 'breach', 'breaches',
    'malware', 'virus', 'trojan', 'ransomware', 'phishing',
    'authentication', 'authorization', 'encryption', 'decryption',
    'firewall', 'intrusion', 'detection', 'prevention', 'response',
    'incident', 'incidents', 'forensics', 'compliance', 'audit'
  ];
  
  let count = 0;
  for (const term of securityTerms) {
    const regex = new RegExp(`\\b${term}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) count += matches.length;
  }
  
  return count;
}

function findVulnerabilityIndicators(content) {
  const indicators = [
    'weakness', 'weaknesses', 'flaw', 'flaws', 'defect', 'defects',
    'exposure', 'exposures', 'gap', 'gaps', 'deficiency', 'deficiencies',
    'insecure', 'unprotected', 'unpatched', 'outdated', 'obsolete',
    'misconfiguration', 'misconfigurations', 'default', 'defaults'
  ];
  
  const found = [];
  for (const indicator of indicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) found.push(...matches);
  }
  
  return found;
}

function findOFCIndicators(content) {
  const indicators = [
    'recommendation', 'recommendations', 'suggestion', 'suggestions',
    'mitigation', 'mitigations', 'control', 'controls', 'safeguard', 'safeguards',
    'protection', 'protections', 'prevention', 'preventions', 'detection', 'detections',
    'response', 'responses', 'recovery', 'recoveries', 'action', 'actions',
    'measure', 'measures', 'strategy', 'strategies', 'approach', 'approaches'
  ];
  
  const found = [];
  for (const indicator of indicators) {
    const regex = new RegExp(`\\b${indicator}\\b`, 'gi');
    const matches = content.match(regex);
    if (matches) found.push(...matches);
  }
  
  return found;
}

function checkConsistentFormatting(content) {
  const lines = content.split('\n');
  let consistentLines = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      // Check for consistent indentation, spacing, etc.
      if (trimmed.match(/^[A-Z]/) || trimmed.match(/^\d+\./) || trimmed.match(/^[•\-\*]/)) {
        consistentLines++;
      }
    }
  }
  
  return consistentLines / lines.length;
}

function checkProperSpacing(content) {
  const doubleSpaces = (content.match(/\s{2,}/g) || []).length;
  const totalSpaces = (content.match(/\s/g) || []).length;
  
  if (totalSpaces === 0) return 1.0;
  
  return Math.max(0, 1.0 - (doubleSpaces / totalSpaces));
}

// Create new pattern from document
async function createNewPattern(content, filename, supabaseServer) {
  try {
    const documentType = filename.split('.').pop().toLowerCase();
    const patternName = `pattern_${documentType}_${Date.now()}`;
    
    // Analyze document to create pattern
    const patternData = {
      document_type: documentType,
      sections: extractSections(content),
      headers: extractHeaders(content),
      citations: countCitations(content),
      security_terms: countSecurityTerms(content),
      layout_elements: extractLayoutElements(content),
      content_flow: analyzeContentFlow(content)
    };
    
    // Insert new pattern
    const { data, error } = await supabaseServer
      .from('heuristic_patterns')
      .insert({
        pattern_name: patternName,
        pattern_type: 'document_structure',
        pattern_data: patternData,
        confidence_threshold: 0.7,
        usage_count: 1,
        success_rate: 0.5,
        created_at: new Date().toISOString()
      });
    
    if (error) {
      console.error('Failed to create new pattern:', error);
      return null;
    }
    
    return {
      pattern_name: patternName,
      pattern_type: 'document_structure',
      confidence: 0.5,
      is_new: true,
      match_details: patternData
    };
    
  } catch (error) {
    console.error('Create new pattern error:', error);
    return null;
  }
}

// Cache heuristic pattern
async function cacheHeuristicPattern(options, supabaseServer) {
  const { patternName, patternType, patternData, confidenceThreshold = 0.8 } = options;
  
  try {
    const { data, error } = await supabaseServer
      .from('heuristic_patterns')
      .upsert({
        pattern_name: patternName,
        pattern_type: patternType,
        pattern_data: patternData,
        confidence_threshold: confidenceThreshold,
        usage_count: 1,
        success_rate: 0.5,
        last_used: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'pattern_name'
      });
    
    if (error) {
      throw new Error(`Failed to cache pattern: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Pattern '${patternName}' cached successfully`,
      pattern: data
    });
    
  } catch (error) {
    console.error('Cache pattern error:', error);
    return NextResponse.json({ error: 'Failed to cache pattern' }, { status: 500 });
  }
}

// Get cached patterns
async function getCachedPatterns(options, supabaseServer) {
  const { patternType, minSuccessRate = 0.5, limit = 50 } = options;
  
  try {
    let query = supabaseServer
      .from('heuristic_patterns')
      .select('*')
      .gte('success_rate', minSuccessRate)
      .order('success_rate', { ascending: false })
      .limit(limit);
    
    if (patternType) {
      query = query.eq('pattern_type', patternType);
    }
    
    const { data: patterns, error } = await query;
    
    if (error) {
      throw new Error(`Failed to fetch patterns: ${error.message}`);
    }
    
    return NextResponse.json({
      success: true,
      patterns: patterns || [],
      total_count: patterns?.length || 0
    });
    
  } catch (error) {
    console.error('Get cached patterns error:', error);
    return NextResponse.json({ error: 'Failed to fetch patterns' }, { status: 500 });
  }
}

// Update pattern usage
async function updatePatternUsage(options, supabaseServer) {
  const { patternName, used, confidence } = options;
  
  try {
    // Get current pattern
    const { data: pattern, error: fetchError } = await supabaseServer
      .from('heuristic_patterns')
      .select('*')
      .eq('pattern_name', patternName)
      .single();
    
    if (fetchError) {
      throw new Error(`Pattern not found: ${fetchError.message}`);
    }
    
    // Update usage statistics
    const newUsageCount = pattern.usage_count + (used ? 1 : 0);
    const newSuccessRate = used && confidence > 0.7 
      ? (pattern.success_rate * pattern.usage_count + 1) / newUsageCount
      : pattern.success_rate;
    
    const { error: updateError } = await supabaseServer
      .from('heuristic_patterns')
      .update({
        usage_count: newUsageCount,
        success_rate: newSuccessRate,
        last_used: used ? new Date().toISOString() : pattern.last_used,
        updated_at: new Date().toISOString()
      })
      .eq('pattern_name', patternName);
    
    if (updateError) {
      throw new Error(`Failed to update pattern usage: ${updateError.message}`);
    }
    
    return NextResponse.json({
      success: true,
      message: `Pattern usage updated for '${patternName}'`
    });
    
  } catch (error) {
    console.error('Update pattern usage error:', error);
    return NextResponse.json({ error: 'Failed to update pattern usage' }, { status: 500 });
  }
}

// Analyze pattern effectiveness
async function analyzePatternEffectiveness(supabaseServer) {
  try {
    const { data: patterns, error } = await supabaseServer
      .from('heuristic_patterns')
      .select('*')
      .order('success_rate', { ascending: false });
    
    if (error) {
      throw new Error(`Failed to fetch patterns: ${error.message}`);
    }
    
    const analysis = {
      total_patterns: patterns.length,
      high_effectiveness: patterns.filter(p => p.success_rate > 0.8).length,
      medium_effectiveness: patterns.filter(p => p.success_rate > 0.5 && p.success_rate <= 0.8).length,
      low_effectiveness: patterns.filter(p => p.success_rate <= 0.5).length,
      most_used: patterns.sort((a, b) => b.usage_count - a.usage_count).slice(0, 5),
      least_effective: patterns.filter(p => p.success_rate < 0.3).slice(0, 5),
      recommendations: []
    };
    
    // Generate recommendations
    if (analysis.low_effectiveness > analysis.total_patterns * 0.3) {
      analysis.recommendations.push({
        type: 'pattern_cleanup',
        priority: 'medium',
        message: `${analysis.low_effectiveness} patterns have low effectiveness. Consider reviewing and updating.`
      });
    }
    
    if (analysis.total_patterns < 10) {
      analysis.recommendations.push({
        type: 'pattern_expansion',
        priority: 'low',
        message: 'Consider adding more heuristic patterns to improve recognition accuracy.'
      });
    }
    
    return NextResponse.json({
      success: true,
      analysis
    });
    
  } catch (error) {
    console.error('Analyze pattern effectiveness error:', error);
    return NextResponse.json({ error: 'Failed to analyze pattern effectiveness' }, { status: 500 });
  }
}
