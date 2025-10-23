console.log("🧠 embeddingPipeline.js STARTED");

// vofc-viewer/apps/backend/server/services/knowledge/embeddingPipeline.js

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";
import fetch from "node-fetch"; // Required for Ollama local requests

/* --------------------------------------------------------
   1. Load Environment Variables
-------------------------------------------------------- */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend/server
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

console.log("🧭 Loaded .env from:", envPath);
console.log("🔹 SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("🔹 OLLAMA_URL:", process.env.OLLAMA_URL);

/* --------------------------------------------------------
   2. Validate Environment Variables
-------------------------------------------------------- */
const REQUIRED_ENV_VARS = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OLLAMA_URL",
  "OLLAMA_EMBED_MODEL",
];

const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
if (missing.length > 0) {
  throw new Error(
    `❌ Missing required environment variables: ${missing.join(", ")}`
  );
}

/* --------------------------------------------------------
   3. Initialize Supabase Client
-------------------------------------------------------- */
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/* --------------------------------------------------------
   4. Embedding Function using Ollama local model
-------------------------------------------------------- */
async function generateEmbedding(text) {
  try {
    const response = await fetch(`${process.env.OLLAMA_URL}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_EMBED_MODEL,
        prompt: text,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Ollama embedding error: ${err}`);
    }

    const data = await response.json();
    return data.embedding;
  } catch (error) {
    console.error("⚠️ Error generating embedding:", error.message);
    throw error;
  }
}

/* --------------------------------------------------------
   5. Pipeline Example (Insert or Update)
-------------------------------------------------------- */
export async function processTextForEmbedding(id, text) {
  try {
    console.log(`🚀 Generating embedding for record ${id}...`);
    const embedding = await generateEmbedding(text);

    const { error } = await supabase
      .from("knowledge_embeddings")
      .upsert([{ id, embedding }]);

    if (error) throw error;
    console.log(`✅ Embedding saved for record ${id}`);
  } catch (err) {
    console.error("❌ Pipeline error:", err.message);
  }
}

/* --------------------------------------------------------
   6. Run Directly (for testing)
-------------------------------------------------------- */
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("🧪 Running embedding pipeline test...");
  processTextForEmbedding("test-id", "This is a sample embedding test.");
}
