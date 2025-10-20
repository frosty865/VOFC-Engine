// embeddingPipeline.js - guaranteed working version (CommonJS)
console.log("🧠 embeddingPipeline.js STARTED");

const path = require("path");
const dotenv = require("dotenv");
const fetch = require("node-fetch");
const { createClient } = require("@supabase/supabase-js");

// Load .env safely from backend/server folder
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });

console.log("🧭 Loaded .env from:", envPath);
console.log("🔹 SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("🔹 OLLAMA_URL:", process.env.OLLAMA_URL);

// Check for missing variables
const required = [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "OLLAMA_URL",
  "OLLAMA_EMBED_MODEL",
];
for (const key of required) {
  if (!process.env[key]) {
    console.error(`❌ Missing environment variable: ${key}`);
    process.exit(1);
  }
}

// Create Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Function: Generate embedding via Ollama
async function generateEmbedding(text) {
  console.log("⚙️ Generating embedding for text:", text);
  const res = await fetch(`${process.env.OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OLLAMA_EMBED_MODEL,
      prompt: text,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Ollama error: ${err}`);
  }

  const data = await res.json();
  console.log("✅ Embedding length:", data.embedding?.length || 0);
  return data.embedding;
}

// Main test
(async () => {
  try {
    console.log("🚀 Running embedding pipeline test...");
    const embedding = await generateEmbedding("This is a test embedding.");

    const { error } = await supabase
      .from("knowledge_embeddings")
      .upsert([{ id: "test-id", embedding }]);

    if (error) throw error;
    console.log("✅ Successfully saved test embedding to Supabase!");
  } catch (err) {
    console.error("💥 Error:", err.message);
  }
})();
