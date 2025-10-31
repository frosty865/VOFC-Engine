import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API routes to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request, { params }) {
  try {
    const { id: submissionId } = await params;
    const body = await request.json();
    const action = body.action;
    const comments = body.comments || null;

    if (!submissionId || !action) {
      return NextResponse.json(
        { error: 'Missing submissionId or action' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------
    // 1️⃣ Determine new status
    // -----------------------------------------------------------------
    let status;
    if (action === 'approve') {
      status = 'approved';
    } else if (action === 'reject') {
      status = 'rejected';
    } else {
      return NextResponse.json(
        { error: 'Invalid action: must be approve or reject' },
        { status: 400 }
      );
    }

    // -----------------------------------------------------------------
    // 2️⃣ Update submission record
    // -----------------------------------------------------------------
    const { data: updated, error: updateError } = await supabase
      .from('submissions')
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        comments
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating submission:', updateError);
      throw updateError;
    }

    // -----------------------------------------------------------------
    // 3️⃣ Optional: On APPROVE, promote data into production tables
    // -----------------------------------------------------------------
    if (status === 'approved') {
      console.log(`🚀 Promoting submission ${submissionId} to production tables...`);

      // Load submission data
      const { data: submissionData, error: subErr } = await supabase
        .from('submissions')
        .select('data')
        .eq('id', submissionId)
        .single();

      if (subErr) {
        console.error('Error loading submission data:', subErr);
        throw subErr;
      }

      if (!submissionData || !submissionData.data) {
        console.warn(`⚠️ No data field found for submission ${submissionId}`);
      } else {
        // Parse stored JSON safely
        const parsed = typeof submissionData.data === 'string'
          ? JSON.parse(submissionData.data)
          : submissionData.data;

        // --- Vulnerabilities ---
        if (parsed.vulnerabilities && parsed.vulnerabilities.length > 0) {
          const vulnPayload = parsed.vulnerabilities.map(v => ({
            submission_id: submissionId,
            title: v.title,
            description: v.description,
            category: v.category,
            severity: v.severity || 'Unspecified'
          }));

          const { error: vulnErr } = await supabase
            .from('submission_vulnerabilities')
            .insert(vulnPayload);

          if (vulnErr) {
            console.error('Error inserting vulnerabilities:', vulnErr);
            throw vulnErr;
          }
        }

        // --- OFCs ---
        if (parsed.ofcs && parsed.ofcs.length > 0) {
          const ofcPayload = parsed.ofcs.map(o => ({
            submission_id: submissionId,
            title: o.title,
            description: o.description,
            linked_vulnerability: o.linked_vulnerability || null
          }));

          const { error: ofcErr } = await supabase
            .from('submission_options_for_consideration')
            .insert(ofcPayload);

          if (ofcErr) {
            console.error('Error inserting OFCs:', ofcErr);
            throw ofcErr;
          }
        }

        // --- Sources (optional) ---
        if (parsed.sources && parsed.sources.length > 0) {
          const sourcePayload = parsed.sources.map(s => ({
            submission_id: submissionId,
            source_title: s.title || s.source_title || '',
            source_url: s.url || s.source_url || '',
            organization: s.organization || ''
          }));

          const { error: srcErr } = await supabase
            .from('submission_sources')
            .insert(sourcePayload);

          if (srcErr) {
            console.error('Error inserting sources:', srcErr);
            throw srcErr;
          }
        }

        console.log(`✅ Submission ${submissionId} promoted successfully.`);
      }
    }

    // -----------------------------------------------------------------
    // 4️⃣ Respond to client
    // -----------------------------------------------------------------
    return NextResponse.json(
      { success: true, id: submissionId, status },
      { status: 200 }
    );

  } catch (e) {
    console.error('❌ Error in POST /api/submissions/[id]/approve:', e);
    return NextResponse.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
