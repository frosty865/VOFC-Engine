import express from "express";
import dotenv from "dotenv";
import aiToolsRouter from "./ai-tools-minimal.js";
import ollamaParserRouter from "./ollama-parser.js";

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Mount AI tools routes
app.use("/api/ai-tools", aiToolsRouter);

// Mount Ollama parser routes
app.use("/api/parser", ollamaParserRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    ollama_base: process.env.OLLAMA_BASE,
    ollama_model: process.env.OLLAMA_MODEL,
    services: ["ai-tools", "ollama-parser"]
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ AI Backend running on port ${PORT}`);
  console.log(`🤖 AI Tools available at http://localhost:${PORT}/api/ai-tools`);
  console.log(`🧠 Ollama Parser available at http://localhost:${PORT}/api/parser`);
  console.log(`🔍 Health check at http://localhost:${PORT}/health`);
  console.log(`🔗 Ollama Base: ${process.env.OLLAMA_BASE}`);
  console.log(`🧠 Ollama Model: ${process.env.OLLAMA_MODEL}`);
});
