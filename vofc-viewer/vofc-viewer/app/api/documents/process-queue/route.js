import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ollamaChatJSON } from '@/lib/ollama.js'

// Server-side Supabase admin
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export async function POST() {
  try {
    // Fetch pending submissions created from Ollama server sync
    const { data: pending, error } = await supabase
      .from('submissions')
      .select('id, type, source, data, status, created_at')
      .eq('status', 'pending_review')
      .eq('source', 'ollama_server_sync')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    if (!pending || pending.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: 'No queued documents' })
    }

    const model = process.env.OLLAMA_MODEL || 'vofc-engine:latest'
    const results = []

    for (const sub of pending) {
      try {
        const payload = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {})
        const title = payload.source_title || payload.document_name || 'Untitled Document'
        const org = payload.author_org || 'Unknown'
        const year = payload.publication_year || 'Unknown'
        const path = payload.ollama_server_path || payload.local_file_path || payload.document_name || ''

        const prompt = `Extract vulnerabilities and options for consideration from this security document and return ONLY JSON array per schema.\n\nSchema:\n[ {\n  "category": "string",\n  "vulnerability": "string",\n  "options_for_consideration": [ { "option_text": "string", "sources": [ { "reference_number": 0, "source_text": "string" } ] } ]\n} ]\n\nDocument metadata:\n- Title: ${title}\n- Organization: ${org}\n- Year: ${year}\n- Path: ${path}\n\nIf full text is unavailable, infer structured entries from metadata and title only, focusing on concrete, actionable security guidance with proper categories and citations like "Document section, page N".`

        const parsed = await ollamaChatJSON({ model, prompt, timeout: 30000 })
        const entries = Array.isArray(parsed) ? parsed : (parsed?.entries || [])

        // Update submission with enhanced_extraction
        const existingData = payload
        const enhancedExtraction = entries.map(item => ({
          category: item.category,
          content: [
            { type: 'vulnerability', text: item.vulnerability, discipline: item.category },
            ...(item.options_for_consideration || []).map(ofc => ({ type: 'ofc', text: ofc.option_text || ofc.text, discipline: item.category }))
          ]
        }))

        const updated = {
          ...existingData,
          parsed_at: new Date().toISOString(),
          enhanced_extraction: enhancedExtraction,
          vulnerabilities_count: entries.length,
          options_for_consideration_count: entries.reduce((s, e) => s + (e.options_for_consideration?.length || 0), 0)
        }

        const { error: upErr } = await supabase
          .from('submissions')
          .update({ data: JSON.stringify(updated), status: 'completed', updated_at: new Date().toISOString() })
          .eq('id', sub.id)

        if (upErr) throw new Error(upErr.message)
        results.push({ id: sub.id, success: true, count: entries.length })
      } catch (e) {
        results.push({ id: sub.id, success: false, error: e.message })
      }
      // small pacing
      await new Promise(r => setTimeout(r, 300))
    }

    const processed = results.filter(r => r.success).length
    const failed = results.length - processed
    return NextResponse.json({ success: true, processed, failed, results })
  } catch (e) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 })
  }
}


