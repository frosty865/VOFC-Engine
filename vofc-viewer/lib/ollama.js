// /lib/ollama.js

/**
 * Ollama API client utilities for VOFC Engine
 */

// Configuration defaults
const DEFAULT_CONFIG = {
  baseUrl: 'https://ollama.frostech.site',
  defaultModel: 'mistral:latest',
  defaultTemperature: 0.05,
  defaultTopP: 0.85,
  defaultMaxTokens: 8000,
  defaultTimeout: 30000,
  ollamaOptions: {
    num_ctx: 8000,
    num_predict: 4000,
    num_gpu: -1,
    num_thread: 8,
    repeat_penalty: 1.1,
    stop: ['```', '---', 'END']
  }
}

/**
 * Resolve Ollama base URL from environment variables with fallback
 * @returns {string} Ollama server base URL
 */
export function resolveOllamaBase() {
  return (
    process.env.OLLAMA_URL ||
    process.env.OLLAMA_API_BASE_URL ||
    process.env.OLLAMA_BASE_URL ||
    DEFAULT_CONFIG.baseUrl
  )
}

/**
 * Extract JSON from text content using regex patterns
 * @param {string} text - Text content to extract JSON from
 * @returns {object|null} Parsed JSON object or null
 */
function extractJSON(text) {
  // Try to find JSON object or array in text
  const jsonMatch = String(text).match(/(\{[\s\S]*?\}|\[[\s\S]*?\])/)
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0])
    } catch (e) {
      // Invalid JSON in match, try next approach
    }
  }
  return null
}

/**
 * Parse response content into JSON
 * @param {string} responseText - Raw response text
 * @returns {object|null} Parsed JSON or null
 */
function parseResponse(responseText) {
  try {
    // First, try parsing as direct JSON
    const obj = JSON.parse(responseText)
    const content = obj?.message?.content ?? obj?.content ?? responseText
    
    // Try extracting JSON from content
    const extracted = extractJSON(content)
    if (extracted) return extracted
    
    // Fallback: try parsing content as JSON
    return JSON.parse(String(content))
  } catch (parseError) {
    // Try regex extraction as last resort
    const fallbackMatch = extractJSON(responseText)
    if (fallbackMatch) return fallbackMatch
    
    console.warn('JSON parsing failed:', parseError.message)
    return null
  }
}

/**
 * Call Ollama chat API and return parsed JSON response
 * @param {Object} options - Configuration options
 * @param {string} options.model - Model name (default: mistral:latest)
 * @param {string} options.prompt - User prompt/message
 * @param {number} options.temperature - Temperature setting (default: 0.05)
 * @param {number} options.top_p - Top-p setting (default: 0.85)
 * @param {number} options.maxTokens - Max context tokens (default: 8000)
 * @param {number} options.timeout - Request timeout in ms (default: 30000)
 * @returns {Promise<object>} Parsed JSON response
 * @throws {Error} On API errors or timeout
 */
export async function ollamaChatJSON({
  model = DEFAULT_CONFIG.defaultModel,
  prompt,
  temperature = DEFAULT_CONFIG.defaultTemperature,
  top_p = DEFAULT_CONFIG.defaultTopP,
  maxTokens = DEFAULT_CONFIG.defaultMaxTokens,
  timeout = DEFAULT_CONFIG.defaultTimeout
}) {
  if (!prompt) {
    throw new Error('Prompt is required')
  }

  const base = resolveOllamaBase()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  
  try {
    const response = await fetch(`${base}/api/chat`, {
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
          ...DEFAULT_CONFIG.ollamaOptions,
          num_ctx: maxTokens
        },
        messages: [{ role: 'user', content: prompt }],
        stream: false
      })
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error')
      throw new Error(
        `Ollama API error: ${response.status} ${response.statusText}. ${errorText}`
      )
    }
    
    const text = await response.text()
    const parsed = parseResponse(text)
    
    if (parsed === null) {
      throw new Error('Failed to parse JSON from Ollama response')
    }
    
    return parsed
    
  } catch (error) {
    clearTimeout(timeoutId)
    
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`)
    }
    
    if (error instanceof Error) {
      throw error
    }
    
    throw new Error(`Ollama request failed: ${String(error)}`)
  }
}
