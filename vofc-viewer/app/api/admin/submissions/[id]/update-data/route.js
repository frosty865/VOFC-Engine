import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

    // Try to find the JSON file in the library folder
    // The file path should be relative to the library directory
    const baseDir = process.env.OLLAMA_LIBRARY_DIR || 
                    path.join(process.env.HOME || process.env.USERPROFILE, 'AppData', 'Local', 'Ollama', 'data', 'library');
    
    // Extract base filename (without extension)
    const baseName = documentName.replace('.pdf', '').replace('.txt', '');
    const jsonPath = path.join(baseDir, `${baseName}.json`);

    if (!fs.existsSync(jsonPath)) {
      return NextResponse.json({ 
        error: 'JSON file not found', 
        path: jsonPath,
        message: 'The JSON file may have been moved or deleted' 
      }, { status: 404 });
    }

    // Read and parse the JSON file
    const jsonContent = fs.readFileSync(jsonPath, 'utf-8');
    const vofcData = JSON.parse(jsonContent);

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

