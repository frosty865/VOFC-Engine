import express from 'express';
import { enhanceOFC, discoverNewVOFC, resolveCitations } from '../services/ai/index.js';

const router = express.Router();

/**
 * Enhance an existing OFC with AI (clarity + citations)
 */
router.post('/enhance/:ofcId', async (req, res) => {
  try {
    const result = await enhanceOFC(req.params.ofcId);
    res.json(result);
  } catch (err) {
    console.error('Enhance Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Run citation resolver manually on a given OFC
 */
router.post('/resolve/:ofcId', async (req, res) => {
  try {
    const { option_text } = req.body;
    const result = await resolveCitations(req.params.ofcId, option_text);
    res.json(result);
  } catch (err) {
    console.error('Resolve Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Discover new VOFCs from text input (sector-aware)
 */
router.post('/discover/:sector', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await discoverNewVOFC(req.params.sector, text);
    res.json(result);
  } catch (err) {
    console.error('Discover Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
