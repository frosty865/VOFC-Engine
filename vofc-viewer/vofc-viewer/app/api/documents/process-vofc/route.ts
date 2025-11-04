// /app/api/documents/process-vofc/route.ts
import { NextResponse } from 'next/server'
import { supabase, supabaseAdmin } from '@/lib/supabase-client.js'
import { ollamaChatJSON, resolveOllamaBase } from '@/lib/ollama.js'
const pdfParse = require('pdf-parse')

// ---- enhanced prompt helpers ----
const SCHEMA = `
Return STRICT JSON:
[
  {
    "category": "string",                   // e.g., Perimeter Security, Governance / Coordination, VSS, etc.
    "vulnerability": "string",              // problem statement (inverse of requirement/gap)
    "options_for_consideration": [
      {
        "option_text": "string",            // actionable mitigation
        "sources": [
          { "reference_number": 0, "source_text": "string" } // doc + section/page
        ]
      }
    ]
  }
]
`

const DISCIPLINE_CATEGORIES = [
  'Perimeter Security', 'Access Control', 'Security Management', 
  'Governance / Coordination', 'Communications / Interoperability', 
  'Resilience / Exercises', 'Mechanical / HVAC', 'Building Envelope / Glazing', 
  'Structural / Progressive Collapse', 'Cyber-Physical', 'VSS',
  'Emergency Management', 'Fire Protection', 'Blast Protection',
  'Surveillance Systems', 'Intrusion Detection', 'Command and Control'
]

// ---- Multi-model processing pipeline ----
const MODELS = [
  { name: 'vofc-engine:latest', weight: 0.6, role: 'primary' },
  { name: 'mistral:latest', weight: 0.25, role: 'validation' },
  { name: 'llama3:latest', weight: 0.15, role: 'cross-check' }
]

async function processWithMultipleModels(batch: {page:number; text:string}[]): Promise<any[]> {
  console.log(`🔄 Processing with ${MODELS.length} models...`)
  
  // Process with all models in parallel
  const modelPromises = MODELS.map(async (modelConfig) => {
    try {
      console.log(`🤖 Processing with ${modelConfig.name} (${modelConfig.role})`)
      
      const result = await ollamaChatJSON({ 
        model: modelConfig.name,
        prompt: buildPrompt(batch),
        temperature: GPU_CONFIG.temperature,
        top_p: GPU_CONFIG.topP,
        maxTokens: GPU_CONFIG.maxTokensPerBatch,
        timeout: GPU_CONFIG.batchTimeout
      })
      
      return {
        model: modelConfig.name,
        role: modelConfig.role,
        weight: modelConfig.weight,
        result: Array.isArray(result) ? result : []
      }
    } catch (error) {
      console.warn(`⚠️ ${modelConfig.name} failed:`, error.message)
      return {
        model: modelConfig.name,
        role: modelConfig.role,
        weight: modelConfig.weight,
        result: []
      }
    }
  })
  
  const modelResults = await Promise.allSettled(modelPromises)
  
  // Combine results from all models
  const allResults: any[] = []
  const modelData = modelResults
    .filter(result => result.status === 'fulfilled')
    .map(result => (result as PromiseFulfilledResult<any>).value)
  
  // Primary model results (vofc-engine)
  const primaryModel = modelData.find(m => m.role === 'primary')
  if (primaryModel && primaryModel.result.length > 0) {
    allResults.push(...primaryModel.result)
  }
  
  // Validation and cross-check from other models
  const validationModels = modelData.filter(m => m.role !== 'primary')
  for (const validationModel of validationModels) {
    if (validationModel.result.length > 0) {
      // Add unique results that weren't found by primary model
      for (const item of validationModel.result) {
        const isDuplicate = allResults.some(existing => 
          normalizeVulnerabilityText(existing.vulnerability) === normalizeVulnerabilityText(item.vulnerability)
        )
        if (!isDuplicate) {
          allResults.push(item)
        }
      }
    }
  }
  
  console.log(`✅ Multi-model processing complete: ${allResults.length} total items`)
  return allResults
}

async function processBatchWithRetry(batch: {page:number; text:string}[], batchIndex: number): Promise<any[]> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= GPU_CONFIG.retryAttempts; attempt++) {
    try {
      console.log(`Processing batch ${batchIndex}, attempt ${attempt}/${GPU_CONFIG.retryAttempts}`)
      
      // Use multi-model pipeline for better results
      const results = await processWithMultipleModels(batch)
      
      if (Array.isArray(results) && results.length > 0) {
        console.log(`Batch ${batchIndex} completed successfully with ${results.length} items`)
        return results
      } else {
        console.warn(`Batch ${batchIndex} returned empty or invalid result`)
        return []
      }
    } catch (error: any) {
      lastError = error
      console.warn(`Batch ${batchIndex} attempt ${attempt} failed:`, error.message)
      
      if (attempt < GPU_CONFIG.retryAttempts) {
        // Exponential backoff with jitter
        const delay = GPU_CONFIG.retryDelay * Math.pow(2, attempt - 1) + Math.random() * 1000
        console.log(`Retrying batch ${batchIndex} in ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  console.error(`Batch ${batchIndex} failed after ${GPU_CONFIG.retryAttempts} attempts:`, lastError)
  return []
}

// Enhanced prompt building with GPU optimization
function buildPrompt(chunks: {page:number; text:string}[]) {
  // Optimize prompt length for GPU processing
  const maxPromptLength = GPU_CONFIG.maxTokensPerBatch * 3 // Rough character estimate
  let optimizedChunks = chunks
  
  // If prompt is too long, prioritize chunks with more security keywords
  if (JSON.stringify(chunks).length > maxPromptLength) {
    optimizedChunks = chunks
      .map(chunk => ({
        ...chunk,
        score: calculateChunkScore(chunk.text)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, Math.floor(chunks.length * 0.8)) // Take top 80%
      .map(({score, ...chunk}) => chunk)
  }
  
  return `
You are a DHS/CISA SAFE analyst with expertise in security standards and vulnerability assessment. You will receive clause snippets from a security document with page numbers.

ANALYSIS INSTRUCTIONS:
For EACH snippet:
1) Identify if it contains a required control (shall/must), recommended practice (should/may), or security requirement
2) If YES: Invert it into a concise Vulnerability statement (what happens if this requirement is NOT met)
3) Create 1–3 concrete, actionable Options for Consideration that would satisfy the standard or mitigate the risk
4) Attach proper citations using "Document § or heading, page X" format

QUALITY REQUIREMENTS:
- Vulnerabilities must be specific and actionable (not generic)
- Options must be concrete and implementable
- Use exact discipline categories from the provided list
- Ensure citations include page numbers
- Avoid duplicate vulnerabilities - consolidate similar ones

DISCIPLINE CATEGORIES (use exactly as listed):
${DISCIPLINE_CATEGORIES.map(cat => `- ${cat}`).join('\n')}

${SCHEMA}

Input chunks to analyze:
${JSON.stringify(optimizedChunks, null, 2)}

Remember: Focus on security-relevant content only. Skip administrative or non-security requirements.
`
}

function calculateChunkScore(text: string): number {
  const securityKeywords = [
    'shall', 'must', 'should', 'may', 'required', 'mandatory',
    'recommended', 'recommendation', 'best practice', 'guideline',
    'vehicle', 'standoff', 'glazing', 'progressive collapse',
    'intake', 'command', 'coordination', 'interoperable', 'exercise',
    'security', 'access control', 'perimeter', 'surveillance',
    'emergency', 'evacuation', 'fire', 'blast', 'threat',
    'vulnerability', 'risk', 'mitigation', 'protection'
  ]
  
  let score = 0
  const lowerText = text.toLowerCase()
  
  securityKeywords.forEach(keyword => {
    const matches = (lowerText.match(new RegExp(`\\b${keyword}\\b`, 'g')) || []).length
    score += matches * (keyword.length > 5 ? 2 : 1) // Weight longer keywords more
  })
  
  // Bonus for numbers (specifications, measurements)
  score += (text.match(/\d+/g) || []).length * 0.5
  
  // Bonus for action words
  const actionWords = ['implement', 'install', 'provide', 'ensure', 'maintain', 'monitor', 'test', 'verify']
  actionWords.forEach(word => {
    score += (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length
  })
  
  return score
}

// ---- optimized chunking ----
interface ChunkConfig {
  minChunkSize: number
  maxChunkSize: number
  overlapSize: number
  batchSize: number
}

const CHUNK_CONFIG: ChunkConfig = {
  minChunkSize: 300,
  maxChunkSize: 1500,
  overlapSize: 150,
  batchSize: 20  // Increased for GPU efficiency
}

// GPU-optimized processing configuration
const GPU_CONFIG = {
  maxConcurrentBatches: 5,        // More concurrent batches for GPU
  batchTimeout: 30000,            // 30 second timeout per batch
  retryAttempts: 3,               // Retry failed batches
  retryDelay: 1000,              // 1 second delay between retries
  maxTokensPerBatch: 8000,       // Optimize for GPU memory
  temperature: 0.05,             // Lower temperature for consistency
  topP: 0.85                    // Optimized for GPU processing
}

function splitIntoChunks(textByPages: string[]): {page:number; text:string}[] {
  const out: {page:number; text:string}[] = []
  
  textByPages.forEach((pageText, i) => {
    const page = i + 1
    if (!pageText?.trim()) return
    
    // Enhanced sentence splitting with better regex
    const sentences = pageText.split(/(?<=[.!?;])\s+(?=[A-Z])/g)
    let currentChunk = ''
    let lastSentence = ''
    
    for (const sentence of sentences) {
      const testChunk = (currentChunk + ' ' + sentence).trim()
      
      if (testChunk.length > CHUNK_CONFIG.maxChunkSize) {
        // Save current chunk if it meets minimum size
        if (currentChunk.length >= CHUNK_CONFIG.minChunkSize) {
          out.push({ page, text: currentChunk })
        }
        
        // Start new chunk with overlap
        currentChunk = lastSentence + ' ' + sentence
      } else {
        currentChunk = testChunk
        lastSentence = sentence
      }
    }
    
    // Add final chunk
    if (currentChunk.length >= CHUNK_CONFIG.minChunkSize) {
      out.push({ page, text: currentChunk })
    }
  })
  
  // Enhanced filtering with security-specific keywords
  const securityKeywords = [
    'shall', 'must', 'should', 'may', 'required', 'mandatory',
    'recommended', 'recommendation', 'best practice', 'guideline',
    'vehicle', 'standoff', 'glazing', 'progressive collapse',
    'intake', 'command', 'coordination', 'interoperable', 'exercise',
    'security', 'access control', 'perimeter', 'surveillance',
    'emergency', 'evacuation', 'fire', 'blast', 'threat',
    'vulnerability', 'risk', 'mitigation', 'protection'
  ]
  
  const keywordRegex = new RegExp(`\\b(${securityKeywords.join('|')})\\b`, 'i')
  
  return out.filter(chunk => {
    // Check for security keywords
    if (!keywordRegex.test(chunk.text)) return false
    
    // Additional quality filters
    const hasNumbers = /\d+/.test(chunk.text)
    const hasActionWords = /\b(implement|install|provide|ensure|maintain|monitor|test|verify)\b/i.test(chunk.text)
    
    return hasNumbers || hasActionWords
  })
}

// Helper function to move file using local Ollama server API
async function moveFile(filename: string, source: string, target: string) {
  const localOllamaUrl = 'http://127.0.0.1:5000'
  try {
    const response = await fetch(`${localOllamaUrl}/api/files/move`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename, source, target })
    })
    if (!response.ok) {
      throw new Error(`Local server returned ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`❌ Local Ollama server not available for file operations: ${error.message}`)
    console.log('💡 Make sure to run: cd vofc-viewer/ollama && python server.py')
    throw new Error(`File operation failed: ${error.message}`)
  }
}

// Helper function to write processed JSON to processed folder using local Ollama server
async function writeProcessedFile(filename: string, content: any) {
  const localOllamaUrl = 'http://127.0.0.1:5000'
  const jsonFilename = filename.replace(/\.pdf$/i, '.json')
  try {
    const response = await fetch(`${localOllamaUrl}/api/files/write`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        filename: jsonFilename, 
        content, 
        folder: 'processed' 
      })
    })
    if (!response.ok) {
      throw new Error(`Local server returned ${response.status}`)
    }
    return await response.json()
  } catch (error) {
    console.error(`❌ Local Ollama server not available for file operations: ${error.message}`)
    console.log('💡 Make sure to run: cd vofc-viewer/ollama && python server.py')
    throw new Error(`File write operation failed: ${error.message}`)
  }
}

export async function POST(req: Request) {
  let fileName: string = ''
  let submissionId: string | undefined = undefined
  try {
    const body = await req.json() as { fileName: string; submissionId?: string }
    fileName = body.fileName
    submissionId = body.submissionId
    if (!fileName) throw new Error('fileName is required')

    // 1) Get PDF from local Ollama server (Flask server running on localhost:5000)
    console.log(`📥 Fetching ${fileName} from local Ollama server...`)
    let arrayBuffer: ArrayBuffer
    let buf: Buffer
    
    try {
      const localOllamaUrl = 'http://127.0.0.1:5000'
      const fileResponse = await fetch(`${localOllamaUrl}/api/files/get/${encodeURIComponent(fileName)}`, {
        method: 'GET',
      })
      
      if (!fileResponse.ok) {
        throw new Error(`Local Ollama server returned ${fileResponse.status}`)
      }
      
      arrayBuffer = await fileResponse.arrayBuffer()
      buf = Buffer.from(arrayBuffer)
      console.log(`✅ Retrieved ${fileName} from local Ollama server (${buf.length} bytes)`)
    } catch (localError) {
      console.error(`❌ Local Ollama server not available: ${localError.message}`)
      console.log('💡 Make sure to run: cd vofc-viewer/ollama && python server.py')
      throw new Error(`Local Ollama server not running: ${localError.message}`)
    }

    // 2) Extract text per page
    const parsed = await pdfParse(buf)
    // pdf-parse usually returns a single string; split on form-feed when present
    const pages = parsed.text.split('\f')
    if (pages.length <= 1) {
      // fallback split heuristic
      const approx = parsed.text.split(/\n\s*\n/g)
      const perPage = approx.length > 1 ? approx : [parsed.text]
      // minimal second pass
      const chunks = splitIntoChunks(perPage)
      if (!chunks.length) throw new Error('No parsable clauses found')
      const result = await ollamaChatJSON({ 
        model: process.env.OLLAMA_MODEL || 'vofc-engine:latest',
        prompt: buildPrompt(chunks),
        temperature: GPU_CONFIG.temperature,
        top_p: GPU_CONFIG.topP,
        maxTokens: GPU_CONFIG.maxTokensPerBatch,
        timeout: GPU_CONFIG.batchTimeout
      })
      return await uploadResult(fileName, result, submissionId)
    }

    // 3) chunk and call Ollama with optimized batching
    const chunks = splitIntoChunks(pages)
    if (!chunks.length) throw new Error('No parsable clauses found')
    
    // Process chunks in parallel batches for GPU optimization
    const all: any[] = []
    const batchSize = CHUNK_CONFIG.batchSize
    const batches: {page:number; text:string}[][] = []
    
    // Create optimized batches for GPU processing
    for (let i = 0; i < chunks.length; i += batchSize) {
      batches.push(chunks.slice(i, i + batchSize))
    }
    
    // GPU-optimized parallel processing with retry logic
    const MAX_CONCURRENT = GPU_CONFIG.maxConcurrentBatches
    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
      const concurrentBatches = batches.slice(i, i + MAX_CONCURRENT)
      
      const batchPromises = concurrentBatches.map(async (batch, batchIndex) => {
        return await processBatchWithRetry(batch, batchIndex)
      })
      
      const batchResults = await Promise.allSettled(batchPromises)
      
      // Collect successful results
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && Array.isArray(result.value)) {
          all.push(...result.value)
        } else {
          console.warn(`Batch ${i + index} failed:`, result.status === 'rejected' ? result.reason : 'Unknown error')
        }
      })
    }

    // 4) validate and group by vulnerability text
    const validatedItems = all.filter(validateVOFCItem)
    const grouped: Record<string, any> = {}
    
    for (const item of validatedItems) {
      const key = normalizeVulnerabilityText(item.vulnerability)
      if (!key) continue
      
      if (!grouped[key]) {
        grouped[key] = { 
          category: item.category, 
          vulnerability: key, 
          options_for_consideration: [] as any[] 
        }
      }
      
      if (Array.isArray(item.options_for_consideration)) {
        const validatedOptions = item.options_for_consideration.filter(validateOption)
        grouped[key].options_for_consideration.push(...validatedOptions)
      }
    }
    
    const consolidated = Object.values(grouped).map(consolidateVOFCItem)

    // Link OFCs to vulnerabilities using text similarity
    const linkedResult = linkUnattachedOFCs(consolidated)

    // Success: Move original to library and save processed JSON to processed folder
    try {
      // Move original file from incoming to library
      await moveFile(fileName, 'incoming', 'library')
      console.log(`✅ Moved ${fileName} from incoming to library`)
      
      // Write processed JSON to processed folder
      await writeProcessedFile(fileName, linkedResult)
      console.log(`✅ Saved processed JSON to processed folder`)
      
      return await uploadResult(fileName, linkedResult, submissionId)
    } catch (moveError: any) {
      console.error('❌ Failed to move file or write processed output:', moveError)
      // Still return results even if file movement fails
      return await uploadResult(fileName, linkedResult, submissionId)
    }
    
  } catch (e: any) {
    console.error('❌ process-vofc error:', e)
    
    // On failure: Move document to errors folder
    if (fileName) {
      try {
        await moveFile(fileName, 'incoming', 'errors')
        console.log(`⚠️ Moved ${fileName} to errors folder for reprocessing`)
      } catch (moveError: any) {
        console.error('❌ Failed to move file to errors folder:', moveError)
      }
    }
    
    return NextResponse.json({ 
      status: 'error', 
      message: e.message,
      file_moved_to_errors: fileName ? true : false
    }, { status: 500 })
  }
}

// ---- validation functions ----
function validateVOFCItem(item: any): boolean {
  if (!item || typeof item !== 'object') return false
  
  // Check required fields
  if (!item.vulnerability || typeof item.vulnerability !== 'string') return false
  if (!item.category || typeof item.category !== 'string') return false
  if (!Array.isArray(item.options_for_consideration)) return false
  
  // Validate category is from approved list
  if (!DISCIPLINE_CATEGORIES.includes(item.category)) return false
  
  // Validate vulnerability text quality
  const vulnText = item.vulnerability.trim()
  if (vulnText.length < 10 || vulnText.length > 500) return false
  
  // Must have at least one valid option
  const validOptions = item.options_for_consideration.filter(validateOption)
  return validOptions.length > 0
}

function validateOption(option: any): boolean {
  if (!option || typeof option !== 'object') return false
  
  // Check required fields
  if (!option.option_text || typeof option.option_text !== 'string') return false
  if (!Array.isArray(option.sources)) return false
  
  // Validate option text quality
  const optionText = option.option_text.trim()
  if (optionText.length < 10 || optionText.length > 300) return false
  
  // Must have at least one valid source
  const validSources = option.sources.filter(validateSource)
  return validSources.length > 0
}

function validateSource(source: any): boolean {
  if (!source || typeof source !== 'object') return false
  
  // Check required fields
  if (!source.source_text || typeof source.source_text !== 'string') return false
  if (typeof source.reference_number !== 'number') return false
  
  // Validate source text quality
  const sourceText = source.source_text.trim()
  return sourceText.length > 5 && sourceText.length < 200
}

function normalizeVulnerabilityText(text: string): string {
  if (!text) return ''
  
  // Normalize text for grouping
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')    // Normalize whitespace
}

function consolidateVOFCItem(item: any): any {
  // Remove duplicate options
  const uniqueOptions = item.options_for_consideration.filter((option: any, index: number, arr: any[]) => {
    const normalizedText = option.option_text.trim().toLowerCase()
    return arr.findIndex((o: any) => o.option_text.trim().toLowerCase() === normalizedText) === index
  })
  
  // Sort options by length (more detailed first)
  uniqueOptions.sort((a: any, b: any) => b.option_text.length - a.option_text.length)
  
  return {
    ...item,
    options_for_consideration: uniqueOptions.slice(0, 5) // Limit to 5 best options
  }
}

/**
 * Link unattached OFCs to vulnerabilities using text similarity.
 * This handles cases where OFCs come in as a flat list without linkage.
 */
function linkUnattachedOFCs(vulnerabilities: any[], threshold: number = 0.45): any[] {
  // Extract all OFCs from vulnerabilities
  const allOFCs: any[] = []
  const vulnMap = new Map<string, any>()
  
  vulnerabilities.forEach((vuln, index) => {
    const vulnId = vuln.id || `vuln_${index}`
    vulnMap.set(vulnId, { ...vuln, id: vulnId })
    
    // Collect OFCs from nested structure
    if (Array.isArray(vuln.options_for_consideration)) {
      vuln.options_for_consideration.forEach((ofc: any, ofcIndex: number) => {
        const ofcId = ofc.id || `ofc_${index}_${ofcIndex}`
        allOFCs.push({
          ...ofc,
          id: ofcId,
          linked_vulnerability: ofc.linked_vulnerability || null,
          source_vulnerability_id: vulnId // Track which vuln it came from
        })
      })
    }
  })
  
  // If OFCs are already linked, check for unlinked ones
  const unlinkedOFCs = allOFCs.filter(ofc => !ofc.linked_vulnerability)
  
  if (unlinkedOFCs.length === 0) {
    console.log('[Linker] All OFCs already linked')
    return rebuildVulnerabilitiesWithLinks(vulnerabilities, allOFCs)
  }
  
  // Link unlinked OFCs to vulnerabilities using text similarity
  let linked = 0
  
  for (const ofc of unlinkedOFCs) {
    let bestMatch: any = null
    let bestScore = 0
    const ofcText = (ofc.option_text || ofc.text || '').toLowerCase()
    
    for (const [vulnId, vuln] of vulnMap.entries()) {
      // Combine vulnerability context for fuzzy matching
      const vulnContext = [
        vuln.vulnerability || '',
        vuln.question || '',
        vuln.what || '',
        vuln.so_what || '',
        vuln.description || ''
      ].join(' ').toLowerCase()
      
      // Calculate similarity ratio (simple implementation)
      const similarity = calculateSimilarity(ofcText, vulnContext)
      
      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = vuln
      }
    }
    
    // Link if similarity exceeds threshold
    if (bestMatch && bestScore >= threshold) {
      ofc.linked_vulnerability = bestMatch.id
      linked++
    }
  }
  
  console.log(`[Linker] Linked ${linked} OFCs to vulnerabilities (${unlinkedOFCs.length - linked} unlinked)`)
  
  return rebuildVulnerabilitiesWithLinks(vulnerabilities, allOFCs)
}

/**
 * Rebuild vulnerabilities array with linked OFCs
 */
function rebuildVulnerabilitiesWithLinks(vulnerabilities: any[], allOFCs: any[]): any[] {
  const result = vulnerabilities.map((vuln, index) => {
    const vulnId = vuln.id || `vuln_${index}`
    // Find OFCs linked to this vulnerability
    const linkedOFCs = allOFCs.filter(ofc => 
      ofc.linked_vulnerability === vulnId || 
      ofc.source_vulnerability_id === vulnId
    )
    
    return {
      ...vuln,
      id: vulnId,
      options_for_consideration: linkedOFCs.map(({ source_vulnerability_id, ...ofc }) => ofc)
    }
  })
  
  return result
}

/**
 * Calculate text similarity ratio (0-1) using simple longest common subsequence
 */
function calculateSimilarity(text1: string, text2: string): number {
  if (!text1 || !text2) return 0
  
  // Simple word-based similarity
  const words1 = text1.split(/\s+/).filter(w => w.length > 2)
  const words2 = text2.split(/\s+/).filter(w => w.length > 2)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  
  let common = 0
  set1.forEach(word => {
    if (set2.has(word)) common++
  })
  
  const union = new Set([...words1, ...words2])
  return union.size > 0 ? common / union.size : 0
}

async function uploadResult(fileName: string, payload: any, submissionId?: string) {
  const startTime = Date.now()
  
  // Enhanced result with performance metrics
  const result = {
    status: 'ok',
    parsed_key: fileName.replace(/\.pdf$/i, '.json'),
    count: Array.isArray(payload) ? payload.length : 0,
    performance_metrics: {
      processing_time_ms: Date.now() - startTime,
      total_chunks_processed: payload?.length || 0,
      avg_options_per_vulnerability: payload?.length ? 
        payload.reduce((sum: number, item: any) => sum + (item.options_for_consideration?.length || 0), 0) / payload.length : 0,
      gpu_optimization_enabled: true,
      batch_size_used: CHUNK_CONFIG.batchSize,
      concurrent_batches: GPU_CONFIG.maxConcurrentBatches
    },
    quality_metrics: {
      validation_passed: payload?.length ? payload.every(validateVOFCItem) : true,
      categories_used: [...new Set(payload?.map((item: any) => item.category) || [])],
      avg_vulnerability_length: payload?.length ? 
        payload.reduce((sum: number, item: any) => sum + (item.vulnerability?.length || 0), 0) / payload.length : 0
    }
  }
  
  // Update submission record with extracted vulnerabilities if submissionId is provided
  if (submissionId && supabaseAdmin && Array.isArray(payload) && payload.length > 0) {
    try {
      // Find the submission by document_name or filename
      const { data: existingSub } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single();
      
      if (existingSub) {
        // Parse existing data
        const existingData = typeof existingSub.data === 'string' 
          ? JSON.parse(existingSub.data) 
          : existingSub.data || {};
        
        // Format vulnerabilities for SubmissionReview component
        // SubmissionReview expects: data.enhanced_extraction array with content items
        const enhancedExtraction = payload.map(item => ({
          category: item.category,
          content: [
            {
              type: 'vulnerability',
              text: item.vulnerability,
              discipline: item.category
            },
            ...(item.options_for_consideration || []).map((ofc: any) => ({
              type: 'ofc',
              text: ofc.option_text || ofc.text,
              discipline: item.category
            }))
          ]
        }));
        
        // Update submission data
        const updatedData = {
          ...existingData,
          parsed_at: new Date().toISOString(),
          enhanced_extraction: enhancedExtraction,
          vulnerabilities_count: payload.length,
          options_for_consideration_count: payload.reduce((sum: number, item: any) => 
            sum + (item.options_for_consideration?.length || 0), 0)
        };
        
        // Update submission record
        const { error: updateError } = await supabaseAdmin
          .from('submissions')
          .update({
            data: JSON.stringify(updatedData),
            updated_at: new Date().toISOString()
          })
          .eq('id', submissionId);
        
        if (updateError) {
          console.error('❌ Failed to update submission with vulnerabilities:', updateError);
        } else {
          console.log(`✅ Updated submission ${submissionId} with ${payload.length} vulnerabilities`);
        }
      } else {
        // Try to find by filename
        const { data: subsByFilename } = await supabaseAdmin
          .from('submissions')
          .select('*')
          .contains('data', JSON.stringify({ document_name: fileName }));
        
        if (subsByFilename && subsByFilename.length > 0) {
          const sub = subsByFilename[0];
          const existingData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data || {};
          
          const enhancedExtraction = payload.map(item => ({
            category: item.category,
            content: [
              {
                type: 'vulnerability',
                text: item.vulnerability,
                discipline: item.category
              },
              ...(item.options_for_consideration || []).map((ofc: any) => ({
                type: 'ofc',
                text: ofc.option_text || ofc.text,
                discipline: item.category
              }))
            ]
          }));
          
          const updatedData = {
            ...existingData,
            parsed_at: new Date().toISOString(),
            enhanced_extraction: enhancedExtraction,
            vulnerabilities_count: payload.length
          };
          
          await supabaseAdmin
            .from('submissions')
            .update({
              data: JSON.stringify(updatedData),
              updated_at: new Date().toISOString()
            })
            .eq('id', sub.id);
          
          console.log(`✅ Updated submission ${sub.id} with vulnerabilities by filename match`);
        }
      }
    } catch (dbUpdateError) {
      console.error('❌ Error updating submission with vulnerabilities:', dbUpdateError);
      // Don't fail the whole process if DB update fails
    }
  }
  
  // Write to Parsed/<file>.json for human review
  const jsonContent = JSON.stringify(payload ?? [], null, 2)
  const jsonFileName = fileName.replace(/\.pdf$/i, '.json')
  
  try {
    // Create a proper Blob with JSON content type
    const jsonBlob = new Blob([jsonContent], { type: 'application/json' })
    
    const { error: upErr } = await supabaseAdmin.storage.from('Parsed').upload(
      jsonFileName,
      jsonBlob,
      { contentType: 'application/json', upsert: true }
    )
    
    if (upErr) {
      console.error('JSON upload error:', upErr)
      console.log('Attempting to create Parsed bucket if it does not exist...')
      
      // Try to create the bucket if it doesn't exist
      try {
        await supabaseAdmin.storage.createBucket('Parsed', {
          public: false,
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
          allowedMimeTypes: ['application/json']
        })
        console.log('✅ Parsed bucket created successfully')
        
        // Retry upload
        const { error: retryErr } = await supabaseAdmin.storage.from('Parsed').upload(
          jsonFileName,
          jsonBlob,
          { contentType: 'application/json', upsert: true }
        )
        
        if (retryErr) {
          console.error('❌ Retry upload failed:', retryErr)
          // Don't throw error - continue with processing
        } else {
          console.log('✅ JSON upload successful after bucket creation')
        }
      } catch (bucketError) {
        console.error('❌ Failed to create Parsed bucket:', bucketError)
        // Continue processing even if JSON upload fails
      }
    } else {
      console.log('✅ JSON results uploaded successfully:', jsonFileName)
    }
  } catch (uploadError) {
    console.error('❌ JSON upload failed completely:', uploadError)
    // Continue processing - JSON upload failure shouldn't stop the process
  }
  
  console.log(`Processing completed: ${result.count} vulnerabilities extracted in ${result.performance_metrics.processing_time_ms}ms`)
  return NextResponse.json(result)
}
