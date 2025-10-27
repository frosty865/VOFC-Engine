// /lib/ollama.js
export function resolveOllamaBase() {
  return (
    process.env.OLLAMA_URL ||
    process.env.OLLAMA_API_BASE_URL ||
    process.env.OLLAMA_BASE_URL ||
    'https://ollama.frostech.site'
  )
}

export async function ollamaChatJSON({
  model = 'mistral:latest',
  prompt,
  temperature = 0.05,
  top_p = 0.85,
  maxTokens = 8000,
  timeout = 30000
}) {
  const base = resolveOllamaBase()
  
  // Create AbortController for timeout
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature,
        top_p,
        options: {
          num_ctx: maxTokens,        // Context window optimization
          num_predict: 4000,         // Max tokens to generate
          num_gpu: -1,               // Use all available GPU layers
          num_thread: 8,             // CPU threads for preprocessing
          repeat_penalty: 1.1,       // Reduce repetition
          stop: ['```', '---', 'END'] // Stop tokens for cleaner output
        },
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    })
    
    clearTimeout(timeoutId)
    
    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status} ${res.statusText}`)
    }
    
    const text = await res.text()
    
    // Enhanced JSON parsing with better error handling
    try {
      const obj = JSON.parse(text)
      const content = obj?.message?.content ?? obj?.content ?? text
      
      // Extract JSON with improved regex
      const jsonMatch = String(content).match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      
      // Fallback: try to parse the entire content as JSON
      return JSON.parse(String(content))
    } catch (parseError) {
      console.warn('JSON parsing failed, attempting fallback:', parseError)
      const fallbackMatch = text.match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/)
      return fallbackMatch ? JSON.parse(fallbackMatch[0]) : null
    }
  } catch (error) {
    clearTimeout(timeoutId)
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    throw error
  }
}
