import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

export async function GET() {
  try {
    // Check processing folder in storage
    const { data: processingFiles, error: processingError } = await supabaseAdmin.storage
      .from('vofc_seed')
      .list('processing', {
        limit: 100
      });
    
    // Check parsed folder in storage
    const { data: parsedFiles, error: parsedError } = await supabaseAdmin.storage
      .from('vofc_seed')
      .list('parsed', {
        limit: 100
      });
    
    // Check failed folder in storage
    const { data: failedFiles, error: failedError } = await supabaseAdmin.storage
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