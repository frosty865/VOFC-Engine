import express from 'express';
import { 
  analyzeVulnerability, 
  generateVulnerabilities, 
  analyzeOFC, 
  generateOFCs,
  testOllamaConnection 
} from '../services/ai/vulnerabilityAnalyzer.js';
import { enhanceOFC, resolveCitations } from '../services/ai/index.js';

const router = express.Router();

/**
 * Test Ollama server connection
 */
router.get('/test-connection', async (req, res) => {
  try {
    const result = await testOllamaConnection();
    res.json(result);
  } catch (err) {
    console.error('Connection test error:', err.message);
    res.status(500).json({ error: err.message });
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

    const result = await analyzeVulnerability(vulnerabilityText, discipline);
    res.json(result);
  } catch (err) {
    console.error('Vulnerability analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate new vulnerabilities for a sector
 */
router.post('/generate-vulnerabilities', async (req, res) => {
  try {
    const { sector, context, count = 3 } = req.body;
    
    if (!sector) {
      return res.status(400).json({ 
        error: 'sector is required' 
      });
    }

    const result = await generateVulnerabilities(sector, context, count);
    res.json(result);
  } catch (err) {
    console.error('Vulnerability generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Analyze an OFC for improvements
 */
router.post('/analyze-ofc', async (req, res) => {
  try {
    const { optionText, vulnerabilityContext } = req.body;
    
    if (!optionText) {
      return res.status(400).json({ 
        error: 'optionText is required' 
      });
    }

    const result = await analyzeOFC(optionText, vulnerabilityContext);
    res.json(result);
  } catch (err) {
    console.error('OFC analysis error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Generate new OFCs for a vulnerability
 */
router.post('/generate-ofcs', async (req, res) => {
  try {
    const { vulnerabilityText, discipline, count = 3 } = req.body;
    
    if (!vulnerabilityText || !discipline) {
      return res.status(400).json({ 
        error: 'vulnerabilityText and discipline are required' 
      });
    }

    const result = await generateOFCs(vulnerabilityText, discipline, count);
    res.json(result);
  } catch (err) {
    console.error('OFC generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Enhance an existing OFC with AI
 */
router.post('/enhance-ofc/:ofcId', async (req, res) => {
  try {
    const result = await enhanceOFC(req.params.ofcId);
    res.json(result);
  } catch (err) {
    console.error('OFC enhancement error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Resolve citations for an OFC
 */
router.post('/resolve-citations/:ofcId', async (req, res) => {
  try {
    const { option_text } = req.body;
    const result = await resolveCitations(req.params.ofcId, option_text);
    res.json(result);
  } catch (err) {
    console.error('Citation resolution error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
