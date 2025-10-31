import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../../../lib/auth-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { user, error } = await requireAdmin(request)
  if (error) {
    return Response.json({ error: String(error) }, { status: 403 })
  }

  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return Response.json({ error: 'Missing Supabase configuration' }, { status: 500 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    )

    const url = new URL(request.url)
    const status = url.searchParams.get('status') || 'pending_review'

    let query = supabase
      .from('submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100)

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error: dbError } = await query

    if (dbError) {
      console.error('Database error:', dbError)
      return Response.json({ error: dbError.message }, { status: 500 })
    }

    return Response.json(Array.isArray(data) ? data : [])
  } catch (e) {
    console.error('Admin submissions API error:', e)
    return Response.json({ error: e.message }, { status: 500 })
  }
}
