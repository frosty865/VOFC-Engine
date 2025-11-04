import express from 'express';
import { ollamaChat } from './adapters/ollamaClient.js';

const router = express.Router();

/**
 * Submit processed data to Vercel/Supabase
 */
async function submitToDatabase(entries, metadata) {
  try {
    console.log('📤 Submitting processed data to Vercel/Supabase...');
    
    // Prepare data for submission
    const submissionData = {
      type: 'document',
      data: JSON.stringify({
        entries: entries,
        metadata: metadata,
        source: 'ollama_processing',
        processing_method: 'ollama_heuristic_parser',
        extraction_stats: {
          total_entries: entries.length,
          vulnerabilities_found: entries.filter(e => e.vulnerability).length,
          ofcs_found: entries.reduce((sum, e) => sum + (e.options_for_consideration?.length || 0), 0)
        }
      }),
      status: 'completed',
      source: 'ollama_processing',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Submit to Vercel API (you'll need to replace with your actual Vercel URL)
    const vercelUrl = process.env.VERCEL_API_URL || 'https://your-app.vercel.app';
    
    const response = await fetch(`${vercelUrl}/api/submissions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(submissionData)
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Data successfully submitted to Vercel/Supabase');
      return {
        success: true,
        submission_id: result.submission?.id || 'unknown',
        message: 'Data submitted successfully'
      };
    } else {
      console.error('❌ Failed to submit to Vercel/Supabase:', response.status, response.statusText);
      return {
        success: false,
        error: `Submission failed: ${response.status} ${response.statusText}`
      };
    }

  } catch (error) {
    console.error('❌ Error submitting to database:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process document using Ollama for parsing and enhancement
 */
router.post('/process-document', async (req, res) => {
  try {
    const { documentContent, documentType = 'text', sourceUrl, categoryHint } = req.body;
    
    if (!documentContent) {
      return res.status(400).json({ 
        error: 'documentContent is required' 
      });
    }

    console.log(`📄 Processing document with Ollama (${documentType})`);

    // Step 1: Parse document with Ollama
    const parseResult = await parseDocumentWithOllama(documentContent, {
      documentType,
      sourceUrl,
      categoryHint
    });

    if (!parseResult.success) {
      return res.status(500).json({
        success: false,
        error: 'Document parsing failed',
        details: parseResult.error
      });
    }

    console.log(`✅ Ollama parser found ${parseResult.data.entries.length} entries`);

    // Step 2: Enhance entries with Ollama
    const enhancedEntries = [];
    
    for (const entry of parseResult.data.entries) {
      try {
        console.log(`🤖 Enhancing entry: ${entry.topic}`);
        
        const enhancedEntry = await enhanceEntryWithOllama(entry);
        enhancedEntries.push(enhancedEntry);
        
      } catch (error) {
        console.error(`❌ Failed to enhance entry ${entry.topic}:`, error.message);
        // Keep original entry if enhancement fails
        enhancedEntries.push(entry);
      }
    }

    // Step 3: Submit processed data to Vercel/Supabase
    const submissionResult = await submitToDatabase(enhancedEntries, {
      document_type: documentType,
      source_url: sourceUrl,
      category_hint: categoryHint,
      processed_at: new Date().toISOString()
    });

    const result = {
      success: true,
      processing_method: 'ollama_parsing_and_enhancement',
      original_entry_count: parseResult.data.entries.length,
      enhanced_entry_count: enhancedEntries.length,
      entries: enhancedEntries,
      metadata: {
        document_type: documentType,
        source_url: sourceUrl,
        category_hint: categoryHint,
        processed_at: new Date().toISOString()
      },
      database_submission: submissionResult,
      timestamp: new Date().toISOString()
    };

    res.json(result);

  } catch (err) {
    console.error('Document processing error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Parse document content using Ollama with heuristic approach
 */
async function parseDocumentWithOllama(documentContent, options = {}) {
  const prompt = `
You are a security expert specializing in parsing security guidance documents to extract Vulnerabilities and Options for Consideration (OFCs) using heuristic analysis.

Document Content:
${documentContent}

Instructions:
1. Use heuristic analysis to identify security vulnerabilities (what's missing, inadequate, or lacking)
2. Extract options for consideration (actionable recommendations, best practices)
3. Group related vulnerabilities with their corresponding OFCs
4. Assign appropriate security categories/disciplines based on context
5. Provide confidence scores for each extraction

Heuristic Analysis Approach:
- Look for vulnerability cues: "lacks", "missing", "inadequate", "insufficient", "not implemented"
- Look for recommendation cues: "should", "must", "ensure", "implement", "establish", "develop"
- Consider section headers and context for categorization
- Focus on actionable, specific recommendations

Return ONLY valid JSON in this exact format (no additional text or explanations):
{
  "entries": [
    {
      "topic": "Brief descriptive topic",
      "category": "Security Management|Access Control|Perimeter Security|etc.",
      "vulnerability": "Clear statement of the vulnerability",
      "options_for_consideration": [
        "Specific actionable recommendation 1",
        "Specific actionable recommendation 2",
        "Specific actionable recommendation 3"
      ],
      "confidence": 0.85,
      "section_context": "Relevant section or context from document"
    }
  ]
}
`;

  try {
    const response = await ollamaChat([
      { role: "user", content: prompt }
    ]);

    console.log('Raw Ollama response:', response);

    // Extract JSON from the response (handle cases where it's wrapped in text)
    let jsonString = response;
    
    // Look for JSON object in the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    console.log('Extracted JSON string:', jsonString);

    // Parse the JSON
    const parsedResponse = JSON.parse(jsonString);

    // Validate the response structure
    if (!parsedResponse.entries || !Array.isArray(parsedResponse.entries)) {
      throw new Error('Invalid response format from Ollama - missing entries array');
    }

    return {
      success: true,
      data: {
        entries: parsedResponse.entries,
        source_file: options.sourceUrl || 'uploaded_document',
        entry_count: parsedResponse.entries.length
      }
    };

  } catch (error) {
    console.error('Ollama parsing error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Enhance a parsed entry using Ollama
 */
async function enhanceEntryWithOllama(entry) {
  const prompt = `
You are a security expert enhancing a vulnerability and its options for consideration.

Original Entry:
- Topic: ${entry.topic}
- Category: ${entry.category}
- Vulnerability: ${entry.vulnerability}
- Options for Consideration: ${entry.options_for_consideration.join(', ')}
- Confidence: ${entry.confidence}

Please enhance this entry by:

1. Improving the vulnerability statement for clarity and specificity
2. Enhancing the options for consideration to be more actionable and specific
3. Suggesting additional relevant options if appropriate
4. Ensuring all content aligns with ${entry.category} best practices
5. Improving the topic description for better categorization

Return ONLY valid JSON in this exact format (no additional text or explanations):
{
  "enhanced_topic": "improved topic description",
  "enhanced_vulnerability": "improved vulnerability text",
  "enhanced_options": ["enhanced option 1", "enhanced option 2", "additional option 3"],
  "improvements_made": ["improvement 1", "improvement 2"],
  "confidence_score": 0.95,
  "additional_notes": "any additional insights or recommendations"
}
`;

  try {
    const response = await ollamaChat([
      { role: "user", content: prompt }
    ]);

    console.log('Raw enhancement response:', response);

    // Extract JSON from the response
    let jsonString = response;
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[0];
    }

    const parsedResponse = JSON.parse(jsonString);

    // Merge original entry with enhancements
    const enhancedEntry = {
      ...entry,
      topic: parsedResponse.enhanced_topic || entry.topic,
      vulnerability: parsedResponse.enhanced_vulnerability || entry.vulnerability,
      options_for_consideration: parsedResponse.enhanced_options || entry.options_for_consideration,
      confidence: parsedResponse.confidence_score || entry.confidence,
      enhancement_metadata: {
        improvements_made: parsedResponse.improvements_made || [],
        additional_notes: parsedResponse.additional_notes || '',
        enhanced_at: new Date().toISOString(),
        enhancement_method: 'ollama_heuristic_enhancement'
      }
    };

    return enhancedEntry;

  } catch (error) {
    console.error('Ollama enhancement error:', error);
    // Return original entry if enhancement fails
    return {
      ...entry,
      enhancement_metadata: {
        error: error.message,
        enhanced_at: new Date().toISOString(),
        enhancement_method: 'ollama_heuristic_enhancement'
      }
    };
  }
}

/**
 * Test Ollama document parsing
 */
router.post('/test-parsing', async (req, res) => {
  try {
    console.log('🧪 Testing Ollama document parsing...');
    
    const testDocument = `
# Security Planning Workbook

## Vulnerability Assessment

Organizations should identify potential security vulnerabilities in their systems. 
This includes physical security gaps, cybersecurity weaknesses, and procedural deficiencies.

## Options for Consideration

1. Conduct regular security assessments to identify vulnerabilities
2. Implement multi-factor authentication for all systems
3. Establish incident response procedures
4. Train staff on security awareness
5. Maintain updated security policies and procedures

## Risk Mitigation

Organizations must develop comprehensive risk mitigation strategies that address 
identified vulnerabilities through appropriate security measures.

## Access Control Issues

Many facilities lack proper access control systems. This creates significant 
security risks that need to be addressed through comprehensive security measures.

## Perimeter Security

The facility perimeter lacks adequate surveillance and monitoring capabilities.
Organizations should implement comprehensive perimeter security measures including
cameras, lighting, and access controls.
    `;
    
    const result = await parseDocumentWithOllama(testDocument, {
      documentType: 'security_guidance',
      sourceUrl: 'https://test.example.com',
      categoryHint: 'Security Planning'
    });
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Ollama document parsing test successful',
        test_result: result.data,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Ollama parsing test failed',
        details: result.error,
        timestamp: new Date().toISOString()
      });
    }

  } catch (err) {
    console.error('Ollama parsing test error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Analyze vulnerability text for improvements
 */
router.post('/analyze-vulnerability', async (req, res) => {
  try {
    const { vulnerabilityText, discipline } = req.body;
    
    if (!vulnerabilityText || !discipline) {
      return res.status(400).json({ 
        error: 'vulnerabilityText and discipline are required' 
      });
    }

    const prompt = `
You are a security expert analyzing a vulnerability statement. Review the following vulnerability for:

1. Clarity and specificity
2. Missing technical details
3. Potential improvements for better understanding
4. Alignment with ${discipline} best practices

Vulnerability: "${vulnerabilityText}"
Discipline: ${discipline}

Provide analysis in JSON format:
{
  "clarity_score": 1-10,
  "specificity_score": 1-10,
  "improvements": ["suggestion1", "suggestion2"],
  "enhanced_text": "improved vulnerability text",
  "technical_details": ["detail1", "detail2"]
}
`;

    const response = await ollamaChat([
      { role: "user", content: prompt }
    ], { json: true });

    res.json({
      success: true,
      analysis: response,
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('Vulnerability analysis error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Generate new OFCs for a specific vulnerability
 */
router.post('/generate-ofcs', async (req, res) => {
  try {
    const { vulnerabilityText, discipline, count = 3 } = req.body;
    
    if (!vulnerabilityText || !discipline) {
      return res.status(400).json({ 
        error: 'vulnerabilityText and discipline are required' 
      });
    }

    const prompt = `
You are a security expert providing Options for Consideration (OFCs) for a vulnerability.

Vulnerability: "${vulnerabilityText}"
Discipline: ${discipline}

Generate ${count} specific, actionable OFCs that address this vulnerability.
Each OFC should be:
1. Specific and actionable
2. Technically sound
3. Appropriate for the discipline
4. Implementation-focused

Return JSON format:
{
  "ofcs": [
    {
      "option_text": "specific actionable OFC text",
      "priority": "high/medium/low",
      "implementation_difficulty": "easy/medium/complex",
      "estimated_cost": "low/medium/high"
    }
  ]
}
`;

    const response = await ollamaChat([
      { role: "user", content: prompt }
    ], { json: true });

    res.json({
      success: true,
      ofcs: response.ofcs || [],
      timestamp: new Date().toISOString()
    });

  } catch (err) {
    console.error('OFC generation error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
