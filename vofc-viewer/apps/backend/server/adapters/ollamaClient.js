// Using built-in fetch (available in Node.js 18+ and Next.js)
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3:latest";

console.log(`Ollama Client Config - BASE: ${BASE}, MODEL: ${MODEL}`);

export async function ollamaChat(messages, options = {}) {
  console.log(`Making request to ${BASE}/api/chat with model ${MODEL}`);
  
  try {
    const res = await fetch(`${BASE}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: { temperature: 0.2, top_p: 0.9 }
      })
    });
    
    console.log(`Response status: ${res.status}`);
    
    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Ollama error ${res.status}: ${errorText}`);
      throw new Error(`Ollama error ${res.status}: ${errorText}`);
    }
    
    const data = await res.json();
    console.log(`Response data:`, data);
    const content = data?.message?.content?.trim() || "";
    
    if (options?.json) {
      try { 
        return JSON.parse(content); 
      } catch { 
        return content; 
      }
    }
    
    return content;
  } catch (error) {
    console.error('Ollama client error:', error);
    throw error;
  }
}
