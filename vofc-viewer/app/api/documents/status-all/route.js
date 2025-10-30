import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    console.log('🔍 /api/documents/status-all called - merging Ollama files with submissions');
    
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || 'https://ollama.frostech.site';
    
    // Get files from local file system (Ollama folders)
    const fs = require('fs');
    const path = require('path');
    
    let filesByFolder = {
      incoming: [],
      processed: [],
      library: [],
      errors: []
    };
    
    // Define local folder paths
    const baseDir = process.env.OLLAMA_FILE_STORAGE || 
      (process.platform === 'win32' 
        ? 'C:\\Users\\frost\\AppData\\Local\\Ollama\\automation'
        : '/var/ollama/uploads');
    
    const folders = {
      incoming: path.join(baseDir, 'incoming'),
      processed: path.join(baseDir, 'processed'),
      library: path.join(baseDir, 'library'),
      errors: path.join(baseDir, 'errors')
    };
    
    // Scan local folders for files
    Object.entries(folders).forEach(([folderName, folderPath]) => {
      if (fs.existsSync(folderPath)) {
        try {
          const files = fs.readdirSync(folderPath);
          files.forEach(filename => {
            const filePath = path.join(folderPath, filename);
            const stats = fs.statSync(filePath);
            
            if (stats.isFile()) {
              filesByFolder[folderName].push({
                filename: filename,
                path: filePath,
                size: stats.size,
                modified: stats.mtime.toISOString(),
                created: stats.ctime.toISOString(),
                folder: folderName
              });
            }
          });
        } catch (error) {
          console.warn(`⚠️ Error reading ${folderName} folder:`, error.message);
        }
      }
    });
    
    console.log(`📁 Found files in local folders:`, {
      incoming: filesByFolder.incoming.length,
      processed: filesByFolder.processed.length,
      library: filesByFolder.library.length,
      errors: filesByFolder.errors.length
    });
    
    // Combine all files for submission matching
    const ollamaFiles = [
      ...filesByFolder.incoming,
      ...filesByFolder.processed,
      ...filesByFolder.library,
      ...filesByFolder.errors
    ];
    
    // Fetch submissions from Supabase to get user information
    let submissions = [];
    let userMap = {};
    
    if (supabaseAdmin) {
      try {
        // Get all submissions related to documents
        // Include both 'ofc' type and any with document_name in data
        const { data: subs, error } = await supabaseAdmin
          .from('submissions')
          .select('*, user_id')
          .or('type.eq.ofc,source.eq.document_submission')
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
    
    // Create a set of filenames from Ollama to avoid duplicates
    const ollamaFilenames = new Set(ollamaFiles.map(f => f.filename || f.name || '').filter(Boolean));
    
    // Categorize files by folder (if custom server available) or by submission status
    let documentsFromIncoming = [];
    let completedFromLibrary = [];
    let failedFromErrors = [];
    
    if (filesByFolder.incoming.length > 0 || filesByFolder.library.length > 0 || filesByFolder.errors.length > 0) {
      // Custom server available - use folder-based categorization
      documentsFromIncoming = filesByFolder.incoming.map(file => {
        const filename = file.filename || file.name || '';
        const submission = submissionMap[filename];
        
        return {
          id: submission?.id || `ollama-${filename}`,
          filename: filename,
          status: 'pending_review',
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
            ollama_server_path: file.path,
            folder: 'incoming'
          })
        };
      });
      
      completedFromLibrary = filesByFolder.library.map(file => {
        const filename = file.filename || file.name || '';
        const submission = submissionMap[filename];
        
        return {
          id: submission?.id || `library-${filename}`,
          filename: filename,
          status: 'approved',
          source: submission ? 'submission' : 'ollama_server',
          size: Number(file.size) || 0,
          modified: file.modified || file.created || submission?.updated_at || submission?.created_at || new Date().toISOString(),
          path: file.path,
          created_at: submission?.created_at || file.created || file.modified || new Date().toISOString(),
          submitted_by: submission?.submitted_by || 'System',
          submitted_by_email: submission?.submitted_by_email || null,
          submitted_at: submission?.submitted_at || null,
          data: submission?.data || JSON.stringify({
            document_name: filename,
            storage_type: 'ollama_server',
            ollama_server_path: file.path,
            folder: 'library'
          })
        };
      });
      
      failedFromErrors = filesByFolder.errors.map(file => {
        const filename = file.filename || file.name || '';
        const submission = submissionMap[filename];
        
        return {
          id: submission?.id || `error-${filename}`,
          filename: filename,
          status: 'rejected',
          source: submission ? 'submission' : 'ollama_server',
          size: Number(file.size) || 0,
          modified: file.modified || file.created || submission?.updated_at || submission?.created_at || new Date().toISOString(),
          path: file.path,
          created_at: submission?.created_at || file.created || file.modified || new Date().toISOString(),
          submitted_by: submission?.submitted_by || 'System',
          submitted_by_email: submission?.submitted_by_email || null,
          submitted_at: submission?.submitted_at || null,
          data: submission?.data || JSON.stringify({
            document_name: filename,
            storage_type: 'ollama_server',
            ollama_server_path: file.path,
            folder: 'errors'
          })
        };
      });
    } else {
      // Supabase-only mode - categorize by submission status and presence of extraction
      console.log('📊 Using Supabase-only mode for document categorization');
      
      const pendingStatuses = new Set(['pending_review', 'pending', 'uploaded', 'new', 'submitted', null, undefined, '']);
      
      submissions.forEach(sub => {
        try {
          const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
          const filename = subData?.document_name || subData?.filename || sub.filename;
          if (!filename) return;
          
          const hasExtraction = Boolean(
            subData?.enhanced_extraction && Array.isArray(subData.enhanced_extraction) && subData.enhanced_extraction.length > 0
          ) || Boolean(subData?.parsed_at);
          
          const docInfo = {
            id: sub.id,
            filename: filename,
            status: sub.status,
            source: 'submission',
            size: Number(subData?.document_size) || 0,
            modified: sub.updated_at || sub.created_at || new Date().toISOString(),
            path: subData?.local_file_path || null,
            created_at: sub.created_at || new Date().toISOString(),
            submitted_by: submissionMap[filename]?.submitted_by || 'System',
            submitted_by_email: submissionMap[filename]?.submitted_by_email || null,
            submitted_at: submissionMap[filename]?.submitted_at || sub.created_at || null,
            data: typeof sub.data === 'string' ? sub.data : JSON.stringify(sub.data)
          };
          
          // Pending if status is in pendingStatuses OR no extraction yet
          if (pendingStatuses.has(sub.status) || !hasExtraction) {
            if (sub.status === 'processing') {
              // processing will be added to processing list below; keep out of pending
            } else {
              documentsFromIncoming.push(docInfo);
            }
            return;
          }
          
          if (sub.status === 'processing') {
            // handled below in processingDocs
            return;
          }
          
          if (sub.status === 'approved' || sub.status === 'completed') {
            completedFromLibrary.push(docInfo);
            return;
          }
          
          if (sub.status === 'rejected' || sub.status === 'failed') {
            failedFromErrors.push(docInfo);
            return;
          }
        } catch (e) {
          // ignore bad rows
        }
      });
    }
    
    // Also include submissions that don't have corresponding Ollama files yet
    const documentsFromSubmissions = Object.values(submissionMap)
      .filter(sub => {
        const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
        const docName = subData?.document_name || subData?.filename || sub.filename;
        return docName && !ollamaFilenames.has(docName) && sub.status === 'pending_review';
      })
      .map(sub => {
        const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
        const filename = subData?.document_name || subData?.filename || sub.filename;
        return {
          id: sub.id,
          filename: filename,
          status: sub.status || 'pending_review',
          source: 'submission',
          size: Number(subData?.document_size) || 0,
          modified: sub.updated_at || sub.created_at || new Date().toISOString(),
          path: subData?.local_file_path || null,
          created_at: sub.created_at || new Date().toISOString(),
          submitted_by: sub.submitted_by || 'System',
          submitted_by_email: sub.submitted_by_email || null,
          submitted_at: sub.submitted_at || sub.created_at || null,
          data: typeof sub.data === 'string' ? sub.data : JSON.stringify(sub.data)
        };
      });
    
    // Combine all sources - documents from incoming and submissions without files
    const pendingDocuments = [
      ...documentsFromIncoming,
      ...documentsFromSubmissions.filter(subDoc => {
        // Don't include if already in incoming
        const filename = subDoc.filename;
        return !documentsFromIncoming.some(inc => inc.filename === filename);
      })
    ];
    
    // Get processing status from submissions
    const processingDocs = submissions
      .filter(sub => sub.status === 'processing')
      .map(sub => {
        const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data;
        const filename = subData?.document_name || subData?.filename || sub.filename;
        return {
          id: sub.id,
          filename: filename,
          status: 'processing',
          source: 'submission',
          size: Number(subData?.document_size) || 0,
          modified: sub.updated_at || sub.created_at,
          created_at: sub.created_at,
          submitted_by: submissionMap[filename]?.submitted_by || 'System',
          submitted_by_email: submissionMap[filename]?.submitted_by_email || null
        };
      });

    const response = {
      success: true,
      documents: pendingDocuments,
      processing: processingDocs,
      completed: completedFromLibrary,
      failed: failedFromErrors,
      library: [...pendingDocuments, ...completedFromLibrary, ...failedFromErrors]
    };
    
    console.log('📊 Document counts:', {
      pending: pendingDocuments.length,
      processing: processingDocs.length,
      completed: completedFromLibrary.length,
      failed: failedFromErrors.length,
      with_user_info: pendingDocuments.filter(d => d.submitted_by !== 'System').length
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
