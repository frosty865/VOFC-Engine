import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-client.js'

// Force server-side only execution
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const OLLAMA_URL = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'vofc-engine:latest'

// Utility to log clearly with timestamp
function log(label, data) {
  const ts = new Date().toISOString()
  console.log(`[PROCESS-ONE][${ts}] ${label}:`, data)
}

export async function POST(request) {
  try {
    const { submissionId } = await request.json()
    if (!submissionId) {
      return NextResponse.json({ success: false, error: 'submissionId is required' }, { status: 400 })
    }

    log('Start', { submissionId })

    if (!supabaseAdmin) {
      log('❌ Supabase Config Error', 'supabaseAdmin is null')
      return NextResponse.json({ success: false, error: 'Supabase not configured' }, { status: 500 })
    }

    // 1) Fetch the submission metadata
    const { data: sub, error: loadErr } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('id', submissionId)
      .single()

    if (loadErr || !sub) {
      log('❌ Load Error', loadErr)
      return NextResponse.json({ success: false, error: 'Submission not found' }, { status: 404 })
    }

    const payload = typeof sub.data === 'string' ? JSON.parse(sub.data) : (sub.data || {})
    const title = payload.source_title || payload.document_name || sub.title || 'Untitled Document'
    const org = payload.author_org || sub.organization || 'Unknown'
    const year = payload.publication_year || sub.year || 'Unknown'

    log('Submission Loaded', {
      title,
      source: sub.source,
      storage_type: sub.storage_type
    })

    // 2) Build prompt payload
    const promptPayload = {
      model: OLLAMA_MODEL,
      prompt: `Extract vulnerabilities and options for consideration from this security document and return ONLY JSON array per schema.\n\nSchema:\n[ {\n  "category": "string",\n  "vulnerability": "string",\n  "options_for_consideration": [ { "option_text": "string", "sources": [ { "reference_number": 0, "source_text": "string" } ] } ]\n} ]\n\nDocument metadata:\n- Title: ${title}\n- Organization: ${org}\n- Year: ${year}\n\nIf full text is unavailable, infer structured entries from metadata and title only, focusing on concrete, actionable security guidance with proper categories and citations like \"Document section, page N\".`
    }

    log('Sending to Ollama', { model: OLLAMA_MODEL, url: OLLAMA_URL })

    // 3) Call Ollama API
    const res = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(promptPayload)
    })

    const modelOutput = await res.text()
    log('Raw Ollama Output', modelOutput.slice(0, 500) + '...')

    // 4) Parse JSON safely
    let parsed
    try {
      parsed = JSON.parse(
        String(modelOutput)
          .replace(/^```json/g, '')
          .replace(/```$/g, '')
          .trim()
      )
      log('✅ JSON Parsed Keys', Array.isArray(parsed) ? ['array'] : Object.keys(parsed))
    } catch (e) {
      log('❌ JSON Parse Error', e.message)
      return NextResponse.json({ success: false, error: 'Failed to parse Ollama output', raw: modelOutput }, { status: 500 })
    }

    // Normalize to entries array
    const entries = Array.isArray(parsed) ? parsed : (parsed?.entries || [])

    // Map to enhanced_extraction as used across the app
    const enhancedExtraction = entries.map(item => ({
      category: item.category,
      content: [
        { type: 'vulnerability', text: item.vulnerability, discipline: item.category },
        ...(item.options_for_consideration || []).map(ofc => ({ type: 'ofc', text: ofc.option_text || ofc.text, discipline: item.category }))
      ]
    }))

    const updated = {
      ...payload,
      parsed_at: new Date().toISOString(),
      enhanced_extraction: enhancedExtraction,
      vulnerabilities_count: entries.length,
      options_for_consideration_count: entries.reduce((s, e) => s + (e.options_for_consideration?.length || 0), 0)
    }

    // 5) Write back to Supabase
    const { error: updateErr } = await supabaseAdmin
      .from('submissions')
      .update({ data: JSON.stringify(updated), status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', submissionId)

    if (updateErr) {
      log('❌ Supabase Write Error', updateErr)
      return NextResponse.json({ success: false, error: updateErr.message }, { status: 500 })
    }

    log('✅ Write Success', { id: submissionId, count: entries.length })
    return NextResponse.json({ success: true, count: entries.length, data: parsed })

  } catch (err) {
    log('💥 Fatal Error', err?.message || String(err))
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 })
  }
}
