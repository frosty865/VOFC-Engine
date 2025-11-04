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

    // Try to get recent activity (submissions, OFCs, or soft matches)
    // Format: { text, new_text, title, similarity, source_doc, created_at }
    let soft = []
    try {
      // First, try the softmatches view which has the right format
      const { data: softData, error: softError } = await supabaseAdmin
        .from('v_recent_softmatches')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10)
      
      if (!softError && softData && softData.length > 0) {
        soft = softData
      } else {
        // Try to get recent submissions and format them properly
        const { data: recentSubmissions, error: submissionsError } = await supabaseAdmin
          .from('submissions')
          .select('id, type, status, data, created_at, updated_at')
          .order('created_at', { ascending: false })
          .limit(10)
        
        if (!submissionsError && recentSubmissions) {
          // Format submissions data for display
          soft = recentSubmissions.map(sub => {
            let parsedData = {}
            try {
              parsedData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data || {}
            } catch (e) {
              parsedData = {}
            }
            
            return {
              id: sub.id,
              text: parsedData.document_name || parsedData.vulnerability_text || parsedData.option_text || 'Submission',
              new_text: parsedData.new_text,
              title: parsedData.document_name || parsedData.title || `${sub.type || 'Submission'}`,
              similarity: parsedData.similarity,
              source_doc: parsedData.source_title || parsedData.source_text || parsedData.file_path,
              created_at: sub.created_at,
              type: sub.type,
              status: sub.status
            }
          })
        } else if (submissionsError && submissionsError.code !== 'PGRST116' && submissionsError.code !== '42883') {
          // Try to get recent OFCs as fallback
          const { data: ofcs, error: ofcsError } = await supabaseAdmin
            .from('options_for_consideration')
            .select('id, option_text, created_at, updated_at')
            .order('created_at', { ascending: false })
            .limit(10)
          
          if (!ofcsError && ofcs) {
            soft = ofcs.map(ofc => ({
              id: ofc.id,
              text: ofc.option_text,
              title: ofc.option_text?.substring(0, 100) || 'OFC',
              created_at: ofc.created_at
            }))
          }
        }
      }
    } catch (e) {
      // Fallback to empty array if all queries fail
      console.error('[Dashboard Overview] Error fetching recent activity:', e)
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


