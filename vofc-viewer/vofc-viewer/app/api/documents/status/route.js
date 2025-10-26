import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET() {
  try {
    // Check processing folder in storage
    const { data: processingFiles, error: processingError } = await supabase.storage
      .from('vofc_seed')
      .list('processing', {
        limit: 100
      });
    
    // Check parsed folder in storage
    const { data: parsedFiles, error: parsedError } = await supabase.storage
      .from('vofc_seed')
      .list('parsed', {
        limit: 100
      });
    
    // Check failed folder in storage
    const { data: failedFiles, error: failedError } = await supabase.storage
      .from('vofc_seed')
      .list('failed', {
        limit: 100
      });
    
    const statuses = [];
    
    // Add processing files
    if (processingFiles && !processingError) {
      processingFiles.forEach(file => {
        statuses.push({
          filename: file.name,
          status: 'processing',
          timestamp: file.updated_at || file.created_at
        });
      });
    }
    
    // Add parsed files
    if (parsedFiles && !parsedError) {
      parsedFiles.forEach(file => {
        statuses.push({
          filename: file.name,
          status: 'parsed',
          timestamp: file.updated_at || file.created_at
        });
      });
    }
    
    // Add failed files
    if (failedFiles && !failedError) {
      failedFiles.forEach(file => {
        statuses.push({
          filename: file.name,
          status: 'failed',
          timestamp: file.updated_at || file.created_at
        });
      });
    }
    
    return NextResponse.json({
      success: true,
      statuses: statuses
    });
    
  } catch (error) {
    console.error('Error getting processing status:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get processing status' },
      { status: 500 }
    );
  }
}