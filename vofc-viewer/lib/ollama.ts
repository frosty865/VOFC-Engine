// /lib/ollama.ts
export function resolveOllamaBase() {
  return (
    process.env.OLLAMA_URL ||
    process.env.OLLAMA_API_BASE_URL ||
    process.env.OLLAMA_BASE_URL ||
    'https://ollama.frostech.site'
  )
}

type ChatArgs = {
  model?: string
  prompt: string
  temperature?: number
  top_p?: number
}

export async function ollamaChatJSON<T=any>({
  model = 'mistral:latest',
  prompt,
  temperature = 0.1,
  top_p = 0.9
}: ChatArgs): Promise<T | null> {
  const base = resolveOllamaBase()
  const res = await fetch(`${base}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // Mistral chat format accepted; keep it simple
    body: JSON.stringify({
      model,
      temperature,
      top_p,
      messages: [{ role: 'user', content: prompt }],
      stream: false
    })
  })
  const text = await res.text()
  // Try to parse {message:{content:"…json…"}} or raw JSON
  try {
    const obj = JSON.parse(text)
    const content = obj?.message?.content ?? obj?.content ?? text
    // Extract first JSON array/object from content
    const m = String(content).match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    return m ? JSON.parse(m[0]) : null
  } catch {
    const m = text.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    return m ? JSON.parse(m[0]) : null
  }
}
