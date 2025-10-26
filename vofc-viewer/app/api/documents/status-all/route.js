import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    console.log('🔍 /api/documents/status-all called');
    // Use production bucket names
    const bucketConfig = {
      documents: 'documents',           // Pending documents
      processing: 'documents',          // Processing (same as documents for now)
      completed: 'vofc_seed',          // Completed documents (using public bucket)
      failed: 'Parsed'                  // Failed documents (using Parsed bucket for now)
    };
    
    const status = {};
    
    // Get file counts and details for each bucket/folder
    for (const [folder, bucketName] of Object.entries(bucketConfig)) {
      try {
        console.log(`📁 Checking bucket: ${bucketName} for ${folder}`);
        const { data: files, error } = await supabase.storage
          .from(bucketName)
          .list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
          });
        
        if (error) {
          console.error(`❌ Error listing ${folder}:`, error);
          status[folder] = {
            count: 0,
            files: [],
            error: error.message
          };
        } else {
          console.log(`✅ Found ${files.length} files in ${folder}`);
          status[folder] = {
            count: files.length,
            files: files.slice(0, 10).map(file => ({
              filename: file.name,
              name: file.name, // Keep both for compatibility
              size: file.metadata?.size || 0,
              modified: file.updated_at || file.created_at
            }))
          };
        }
      } catch (folderError) {
        console.error(`❌ Error processing ${folder}:`, folderError);
        status[folder] = {
          count: 0,
          files: [],
          error: folderError.message
        };
      }
    }
    
    const response = {
      success: true,
      documents: status.documents?.files || [],
      processing: status.processing?.files || [],
      completed: status.completed?.files || [],
      failed: status.failed?.files || []
    };
    
    console.log('📊 API Response:', {
      documents: response.documents.length,
      processing: response.processing.length,
      completed: response.completed.length,
      failed: response.failed.length
    });
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Error getting all document status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get all document status' },
      { status: 500 }
    );
  }
}