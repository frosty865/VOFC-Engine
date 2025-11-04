import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../../../lib/auth-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { user, error } = await requireAdmin(request)
  if (error) return Response.json({ error: String(error) }, { status: 403 })
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Server env missing: SUPABASE URL or SERVICE_ROLE_KEY' }, { status: 500 })
    }
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const { data, error } = await supabase
      .from('v_recent_softmatches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) throw error
    return Response.json(data ?? [])
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}


