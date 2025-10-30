export const dynamic = 'force-dynamic'
export const revalidate = 0

import { requireAdmin } from '../../../lib/auth-middleware'

export async function GET(request) {
  const { user, error } = await requireAdmin(request)
  if (error) return Response.json({ error: String(error) }, { status: 403 })
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 5000)
  try {
    const resp = await fetch('https://backend.frostech.site/status', {
      cache: 'no-store',
      signal: controller.signal,
      headers: { accept: 'application/json' }
    })
    const text = await resp.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
    return Response.json(json, { status: resp.status || 200 })
  } catch (err) {
    const code = err?.name === 'AbortError' ? 504 : 502
    return Response.json({ error: 'Backend unreachable', detail: String(err?.message || err) }, { status: code })
  } finally {
    clearTimeout(timeout)
  }
}


