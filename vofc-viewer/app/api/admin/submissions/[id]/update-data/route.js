import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Update a submission record with VOFC data from the library JSON file
 * This is useful for submissions created before we started storing full data
 */
export async function POST(request, { params }) {
  try {
    // Check admin authentication
    const authHeader = request.headers.get('authorization');
    let accessToken = null;
    
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      accessToken = authHeader.slice(7).trim();
    }
    
    if (!accessToken) {
      return NextResponse.json({ error: 'No authentication token provided' }, { status: 401 });
    }
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(accessToken);
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    
    // Check admin role
    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();
    
    const derivedRole = String(profile?.role || user.user_metadata?.role || 'user').toLowerCase();
    const isAdmin = ['admin', 'spsa'].includes(derivedRole);
    const allowlist = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean);
    const isEmailAdmin = allowlist.includes(String(user.email).toLowerCase());
    
    if (!isAdmin && !isEmailAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { id: submissionId } = await params;

    // Get submission to find the document name
    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('data')
      .eq('id', submissionId)
      .single();

    if (subError || !submission) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const submissionData = typeof submission.data === 'string' 
      ? JSON.parse(submission.data) 
      : submission.data;

    const documentName = submissionData.document_name || submissionData.document_name;
    if (!documentName) {
      return NextResponse.json({ error: 'No document name found in submission' }, { status: 400 });
    }

    // Try to load JSON from Flask server's library endpoint
    // Extract base filename (without extension)
    const baseName = documentName.replace('.pdf', '').replace('.txt', '');
    const jsonFilename = `${baseName}.json`;
    
    const flaskUrl = process.env.OLLAMA_LOCAL_URL || 'http://127.0.0.1:5000';
    
    let vofcData = null;
    try {
      // Try to read the JSON file from Flask server
      const jsonResponse = await fetch(`${flaskUrl}/api/files/read?folder=library&filename=${encodeURIComponent(jsonFilename)}`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      
      if (jsonResponse.ok) {
        const jsonContent = await jsonResponse.json();
        vofcData = typeof jsonContent === 'string' ? JSON.parse(jsonContent) : jsonContent;
      } else {
        // Try alternative: read directly as text
        const textResponse = await fetch(`${flaskUrl}/api/files/read?folder=library&filename=${encodeURIComponent(jsonFilename)}`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        
        if (textResponse.ok) {
          const text = await textResponse.text();
          vofcData = JSON.parse(text);
        } else {
          return NextResponse.json({ 
            error: 'JSON file not found on Flask server', 
            filename: jsonFilename,
            message: 'The JSON file may have been moved or deleted. Flask server may not be accessible.' 
          }, { status: 404 });
        }
      }
    } catch (fetchError) {
      return NextResponse.json({ 
        error: 'Failed to fetch JSON from Flask server', 
        message: fetchError.message,
        note: 'Make sure Flask server is running and accessible' 
      }, { status: 503 });
    }

    if (!vofcData || (!vofcData.vulnerabilities && !vofcData.ofcs)) {
      return NextResponse.json({ 
        error: 'Invalid or empty VOFC data in JSON file' 
      }, { status: 400 });
    }

    // Merge the VOFC data with existing metadata
    const updatedData = {
      ...submissionData,
      vulnerabilities: vofcData.vulnerabilities || [],
      ofcs: vofcData.ofcs || [],
      sources: vofcData.sources || [],
      links: vofcData.links || {}
    };

    // Update the submission record
    const { error: updateError } = await supabase
      .from('submissions')
      .update({
        data: JSON.stringify(updatedData),
        updated_at: new Date().toISOString()
      })
      .eq('id', submissionId);

    if (updateError) {
      console.error('Error updating submission:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Submission data updated successfully',
      vulnerabilities: vofcData.vulnerabilities?.length || 0,
      ofcs: vofcData.ofcs?.length || 0
    });

  } catch (e) {
    console.error('Error updating submission data:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

