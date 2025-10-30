export default async function handler(req, res) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8000)
  try {
    const upstream = await fetch('https://backend.frostech.site/status', {
      method: 'GET',
      headers: { 'accept': 'application/json' },
      signal: controller.signal,
      cache: 'no-store'
    })
    const text = await upstream.text()
    let json
    try {
      json = JSON.parse(text)
    } catch {
      json = { raw: text }
    }
    res.status(upstream.status || 200).json(json)
  } catch (e) {
    const code = e.name === 'AbortError' ? 504 : 502
    res.status(code).json({ error: e.message })
  } finally {
    clearTimeout(timeout)
  }
}


