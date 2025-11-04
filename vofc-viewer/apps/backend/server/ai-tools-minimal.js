import express from 'express';
import { ollamaChat } from './adapters/ollamaClient.js';

const router = express.Router();

/**
 * Test Ollama server connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const prompt = "Respond with 'Ollama connection successful' and nothing else.";
    
    const response = await ollamaChat([
      { role: "user", content: prompt }
    ]);
    
    res.json({
      success: true,
      response: response,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.error('Connection test error:', err.message);
    res.status(500).json({ 
      success: false,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Analyze a vulnerability for improvements
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
