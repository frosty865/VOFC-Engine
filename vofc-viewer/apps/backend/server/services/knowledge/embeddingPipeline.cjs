// ==========================================================
// 🧠 VOFC Embedding Pipeline – Full Edition (CJS)
// ==========================================================
console.log("🧠 embeddingPipeline.cjs STARTED");

const path = require("path");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

// ----------------------------------------------------------
// 1. Load environment
// ----------------------------------------------------------
const envPath = path.resolve(__dirname, "../../.env");
dotenv.config({ path: envPath });
console.log("🧭 Loaded .env from:", envPath);
console.log("🔹 SUPABASE_URL:", process.env.SUPABASE_URL);
console.log("🔹 OLLAMA_URL:", process.env.OLLAMA_URL);

// Ensure fetch exists
if (typeof fetch === "undefined") {
  global.fetch = async (...args) => {
    const { default: fetch } = await import("node-fetch");
    return fetch(...args);
  };
}

// ----------------------------------------------------------
// 2. Check env vars
// ----------------------------------------------------------
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

// ----------------------------------------------------------
// 3. Init Supabase
// ----------------------------------------------------------
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ----------------------------------------------------------
// 4. Safe ensure table
// ----------------------------------------------------------
async function ensureTable() {
  try {
    const { error } = await supabase.rpc("introspection");
  } catch {} // ignore unsupported RPC
  const check = await supabase.from("knowledge_embeddings").select("id").limit(1);
  if (check.error && check.error.message.includes("not found")) {
    console.log("🧱 Creating table knowledge_embeddings...");
    const { error } = await supabase.rpc("sql", {
      query: `
        create extension if not exists vector;
        create table if not exists public.knowledge_embeddings (
          id text primary key,
          embedding vector(1024)
        );`,
    });
    if (error) console.error("❌ Table creation failed:", error.message);
    else console.log("✅ Table created.");
  }
}

// ----------------------------------------------------------
// 5. Generate embedding
// ----------------------------------------------------------
async function generateEmbedding(text) {
  try {
    const url = `${process.env.OLLAMA_URL}/api/embeddings`;
    console.log("⚙️ Generating embedding via", url);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_EMBED_MODEL,
        prompt: text,
      }),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = await res.json();
    console.log("✅ Embedding length:", data.embedding?.length || 0);
    return data.embedding;
  } catch (err) {
    console.warn("⚠️ Ollama not reachable:", err.message);
    return null;
  }
}

// ----------------------------------------------------------
// 6. Save to Supabase
// ----------------------------------------------------------
async function saveEmbedding(id, embedding) {
  if (!embedding) {
    console.log("ℹ️ No embedding, skipping Supabase save.");
    return;
  }
  const { error } = await supabase
    .from("knowledge_embeddings")
    .upsert([{ id, embedding }]);
  if (error) throw error;
  console.log("✅ Embedding saved to Supabase (id:", id, ")");
}

// ----------------------------------------------------------
// 7. Show table contents
// ----------------------------------------------------------
async function showEmbeddings(limit = 3) {
  const { data, error } = await supabase
    .from("knowledge_embeddings")
    .select("*")
    .limit(limit);
  if (error) throw error;
  console.log("📊 Current rows in knowledge_embeddings:");
  data.forEach((row) =>
    console.log("• id:", row.id, "embedding length:", row.embedding.length)
  );
}

// ----------------------------------------------------------
// 8. Similarity Search
// ----------------------------------------------------------
async function searchSimilar(text, topK = 5) {
  const embedding = await generateEmbedding(text);
  if (!embedding) {
    console.log("⚠️ No embedding generated for search text.");
    return [];
  }
  console.log(`🔍 Searching for top ${topK} similar entries...`);
  const { data, error } = await supabase.rpc("match_knowledge_embeddings", {
    query_embedding: embedding,
    match_threshold: 0.7,
    match_count: topK,
  });
  if (error) throw error;
  if (!data.length) {
    console.log("❌ No matches found above threshold.");
    return [];
  }
  data.forEach((r) =>
    console.log(`• ${r.id} (similarity: ${(r.similarity * 100).toFixed(1)}%)`)
  );
  return data;
}

// ----------------------------------------------------------
// 9. Main
// ----------------------------------------------------------
(async () => {
  try {
    await ensureTable();
    console.log("🚀 Running embedding pipeline self-test...");
    const text = "This is a test embedding.";
    const embedding = await generateEmbedding(text);
    await saveEmbedding("test-id", embedding);
    await showEmbeddings();
    await searchSimilar("access control", 3);
    console.log("🎉 Pipeline complete!");
  } catch (err) {
    console.error("💥 Fatal error:", err.message);
  }
})();
