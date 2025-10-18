import express from 'express';
import { PSADocumentParser } from '../services/psaDocumentParser.js';

const router = express.Router();
const psaParser = new PSADocumentParser();

// Parse a single document
router.post('/parse-document', async (req, res) => {
  try {
    const { documentText, documentType } = req.body;
    
    if (!documentText) {
      return res.status(400).json({
        success: false,
        error: 'Document text is required'
      });
    }

    const result = await psaParser.parseDocument(documentText, documentType);
    res.json(result);

  } catch (error) {
    console.error('PSA Parser API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Parse multiple documents
router.post('/parse-documents', async (req, res) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        error: 'Documents array is required'
      });
    }

    const result = await psaParser.parseMultipleDocuments(documents);
    res.json(result);

  } catch (error) {
    console.error('PSA Parser API Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Analyze patterns across parsed documents
router.post('/analyze-patterns', async (req, res) => {
  try {
    const { parsedData } = req.body;
    
    if (!parsedData || !Array.isArray(parsedData)) {
      return res.status(400).json({
        success: false,
        error: 'Parsed data array is required'
      });
    }

    const analysis = await psaParser.analyzeVulnerabilityPatterns(parsedData);
    res.json({
      success: true,
      analysis: analysis,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('PSA Pattern Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Health check for PSA parser
router.get('/health', (req, res) => {
  res.json({
    service: 'PSA Document Parser',
    status: 'operational',
    timestamp: new Date().toISOString(),
    capabilities: [
      'Single document parsing',
      'Batch document processing', 
      'Vulnerability extraction',
      'OFC recommendation generation',
      'Pattern analysis across documents'
    ]
  });
});

export default router;
