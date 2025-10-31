/**
 * Client-side utility to get Ollama server URL
 * Uses environment variable or defaults
 */

export function getOllamaUrl() {
  // Try public env var first (for client-side)
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_OLLAMA_URL || 
           process.env.NEXT_PUBLIC_OLLAMA_API_BASE_URL || 
           'http://127.0.0.1:5000';
  }
  
  // Server-side fallback
  return process.env.OLLAMA_URL || 
         process.env.OLLAMA_API_BASE_URL || 
         process.env.OLLAMA_LOCAL_URL ||
         'http://127.0.0.1:5000';
}

