// testEnv.js — quick dotenv sanity check
import dotenv from "dotenv";
import path from "path";

const envPath = path.resolve(process.cwd(), ".env");
dotenv.config({ path: envPath });

console.log("🧭 Loaded from:", envPath);
console.log("SUPABASE_URL =", process.env.SUPABASE_URL);
console.log("SUPABASE_SERVICE_ROLE_KEY =", process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log("OLLAMA_URL =", process.env.OLLAMA_URL);
console.log("OLLAMA_EMBED_MODEL =", process.env.OLLAMA_EMBED_MODEL);
