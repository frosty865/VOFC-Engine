import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    console.log('🔍 /api/documents/status-all called - merging Ollama files with submissions');
    
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || 'https://ollama.frostech.site';
    
    // Fetch files from Ollama server
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const filesResponse = await fetch(`${ollamaUrl}/api/files/list`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    let ollamaFiles = [];
    if (filesResponse.ok) {
      const ollamaData = await filesResponse.json();
      ollamaFiles = ollamaData.files || [];
      console.log(`📁 Found ${ollamaFiles.length} files on Ollama server`);
    } else {
      console.warn('⚠️ Could not fetch files from Ollama server:', filesResponse.status);
    }
    
    // Fetch submissions from Supabase to get user information
    let submissions = [];
    let userMap = {};
    
    if (supabaseAdmin) {
      try {
        // Get all submissions related to documents
        const { data: subs, error } = await supabaseAdmin
          .from('submissions')
          .select('*, user_id')
          .eq('type', 'ofc')
          .order('created_at', { ascending: false });
        
        if (!error && subs) {
          submissions = subs;
          
          // Get user information for submissions
          const userIds = [...new Set(subs.map(s => s.user_id).filter(Boolean))];
          if (userIds.length > 0) {
            const { data: users } = await supabaseAdmin
              .from('users')
              .select('id, email, full_name')
              .in('id', userIds);
            
            if (users) {
              users.forEach(user => {
                userMap[user.id] = {
                  email: user.email,
                  name: user.full_name || user.email
                };
              });
            }
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Could not fetch submissions:', dbError.message);
      }
    }
    
    // Create a map of filename to submission data
    const submissionMap = {};
    submissions.forEach(sub => {
      try {
        const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
        const docName = subData?.document_name || subData?.filename || sub.filename;
        if (docName) {
          submissionMap[docName] = {
            ...sub,
            submitted_by: userMap[sub.user_id]?.name || userMap[sub.user_id]?.email || 'Unknown',
            submitted_by_email: userMap[sub.user_id]?.email,
            submitted_at: sub.created_at
          };
        }
      } catch (e) {
        // Skip invalid submissions
      }
    });
    
    // Merge Ollama files with submission data
    const documents = ollamaFiles.map(file => {
      const filename = file.filename || file.name || '';
      const submission = submissionMap[filename];
      
      return {
        id: submission?.id || `ollama-${filename}`,
        filename: filename,
        status: submission?.status || 'pending_review',
        source: submission ? 'submission' : 'ollama_server',
        size: Number(file.size) || 0,
        modified: file.modified || file.created || submission?.created_at || new Date().toISOString(),
        path: file.path,
        created_at: submission?.created_at || file.created || file.modified || new Date().toISOString(),
        submitted_by: submission?.submitted_by || 'System',
        submitted_by_email: submission?.submitted_by_email || null,
        submitted_at: submission?.submitted_at || null,
        data: submission?.data || JSON.stringify({

          document_name: filename,
          storage_type: 'ollama_server',
          ollama_server_path: file.path
        })
      };
    });

    const response = {
      success: true,
      documents,
      processing: [],
      completed: [],
      failed: [],
      library: documents
    };
    
    console.log('📊 Document counts:', {
      documents: documents.length,
      with_user_info: documents.filter(d => d.submitted_by !== 'System').length
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error getting all document status:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
