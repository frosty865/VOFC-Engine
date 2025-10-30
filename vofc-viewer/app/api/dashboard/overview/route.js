import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const [overviewRes, softRes] = await Promise.all([
      supabase.from('v_learning_overview').select('*').order('updated_at', { ascending: false }).limit(3),
      supabase.from('v_recent_softmatches').select('*').order('created_at', { ascending: false }).limit(5)
    ])

    if (overviewRes.error) throw overviewRes.error
    if (softRes.error) throw softRes.error

    return Response.json({ stats: overviewRes.data ?? [], soft: softRes.data ?? [] })
  } catch (e) {
    return Response.json({ error: e.message, stats: [], soft: [] }, { status: 500 })
  }
}


