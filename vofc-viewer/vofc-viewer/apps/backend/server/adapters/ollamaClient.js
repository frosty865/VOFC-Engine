// Using built-in fetch (available in Node.js 18+ and Next.js)

const BASE = process.env.OLLAMA_BASE || "http://localhost:11434";
const MODEL = process.env.OLLAMA_MODEL || "llama3:latest";

export async function ollamaChat(messages, options = {}) {
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
  
  if (!res.ok) {
    throw new Error(`Ollama error ${res.status}: ${await res.text()}`);
  }
  
  const data = await res.json();
  const content = data?.message?.content?.trim() || "";
  
  if (options?.json) {
    try { 
      return JSON.parse(content); 
    } catch { 
      return content; 
    }
  }
  
  return content;
}
