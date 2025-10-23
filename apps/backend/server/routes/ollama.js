// Handles frontend to Ollama Agent comms
import express from "express";
import { runAgent } from "../../ollama/ollamaAgent.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { command } = req.body;
  try {
    const output = await runAgent(command);
    res.json({ output });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
