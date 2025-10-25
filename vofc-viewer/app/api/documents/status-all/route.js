import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    const folders = ['documents', 'processing', 'parsed', 'failed'];
    const status = {};
    
    // Get file counts and details for each folder
    for (const folder of folders) {
      try {
        const { data: files, error } = await supabase.storage
          .from('vofc_seed')
          .list(folder, {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
          });
        
        if (error) {
          console.error(`Error listing ${folder}:`, error);
          status[folder] = {
            count: 0,
            files: [],
            error: error.message
          };
        } else {
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
        console.error(`Error processing ${folder}:`, folderError);
        status[folder] = {
          count: 0,
          files: [],
          error: folderError.message
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      documents: status
    });
    
  } catch (error) {
    console.error('Error getting all document status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get all document status' },
      { status: 500 }
    );
  }
}