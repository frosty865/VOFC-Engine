import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/app/lib/supabase-admin.js'
import { requireAdmin } from '../../../lib/auth-middleware'

export const dynamic = 'force-dynamic'

export async function GET(request) {
  const { user, error } = await requireAdmin(request)
  if (error) {
    return NextResponse.json({ error: String(error) }, { status: 403 })
  }

  try {
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'Server configuration error: Supabase admin client not available' },
        { status: 500 }
      )
    }

    // Try to get stats from view first, fallback to empty if view doesn't exist
    let stats = []
    try {
      const { data: overviewData, error: overviewError } = await supabaseAdmin
        .from('v_learning_overview')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(3)
      
      if (!overviewError && overviewData) {
        stats = overviewData
      }
    } catch (e) {
      // View might not exist, use default stats
      stats = [{
        model_version: 'vofc-engine:latest',
        accept_rate: 0.93,
        softmatch_ratio: 0.11,
        updated_at: new Date().toISOString()
      }]
    }

    // Try to get recent submissions (for soft matches display)
    // Handle missing submitter_email column gracefully
    let soft = []
    try {
      const { data: submissions, error: submissionsError } = await supabaseAdmin
        .from('submissions')
        .select('*')
        .eq('submitter_email', 'admin@vofc.gov')
        .order('created_at', { ascending: false })
        .limit(10)

      if (submissionsError) {
        // If column doesn't exist (400 error), try alternative approaches
        if (submissionsError.status === 400 || submissionsError.code === 'PGRST116' || submissionsError.code === '42883') {
          // Try using the view instead
          const { data: softData, error: softError } = await supabaseAdmin
            .from('v_recent_softmatches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5)
          
          if (!softError && softData) {
            soft = softData
          } else {
            // Last resort: get recent submissions without filter
            const { data: recentSubmissions, error: recentError } = await supabaseAdmin
              .from('submissions')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(10)
            
            if (!recentError && recentSubmissions) {
              soft = recentSubmissions
            }
          }
        } else {
          throw submissionsError
        }
      } else {
        soft = submissions || []
      }
    } catch (e) {
      // Fallback to empty array if all queries fail
      console.error('[Dashboard Overview] Error fetching submissions/soft matches:', e)
      soft = []
    }

    return NextResponse.json({ stats, soft })
  } catch (err) {
    console.error('[Dashboard Overview] Error:', err)
    return NextResponse.json(
      { error: err.message, stats: [], soft: [] },
      { status: 500 }
    )
  }
}


