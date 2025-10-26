import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST() {
  try {
    console.log('🧹 Clearing completed documents...');
    
    // Get all files from the processed-documents bucket
    const { data: files, error: listError } = await supabase.storage
      .from('processed-documents')
      .list('', {
        limit: 1000 // Get all files
      });
    
    if (listError) {
      console.error('Error listing completed files:', listError);
      return NextResponse.json(
        { success: false, error: 'Failed to list completed files' },
        { status: 500 }
      );
    }
    
    if (!files || files.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed documents to clear',
        cleared: 0
      });
    }
    
    // Extract filenames (remove .json metadata files)
    const fileNames = files
      .filter(file => !file.name.endsWith('.json'))
      .map(file => file.name);
    
    console.log(`🗑️ Found ${fileNames.length} completed documents to clear`);
    
    if (fileNames.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No completed documents to clear',
        cleared: 0
      });
    }
    
    // Delete all completed files
    const { error: deleteError } = await supabase.storage
      .from('processed-documents')
      .remove(fileNames);
    
    if (deleteError) {
      console.error('Error deleting completed files:', deleteError);
      return NextResponse.json(
        { success: false, error: 'Failed to delete completed files' },
        { status: 500 }
      );
    }
    
    // Also clear any metadata files
    const metadataFiles = files
      .filter(file => file.name.endsWith('.json'))
      .map(file => file.name);
    
    if (metadataFiles.length > 0) {
      const { error: metadataDeleteError } = await supabase.storage
        .from('processed-documents')
        .remove(metadataFiles);
      
      if (metadataDeleteError) {
        console.warn('Warning: Failed to delete some metadata files:', metadataDeleteError);
      }
    }
    
    console.log(`✅ Successfully cleared ${fileNames.length} completed documents`);
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${fileNames.length} completed documents`,
      cleared: fileNames.length
    });
    
  } catch (error) {
    console.error('Error clearing completed documents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to clear completed documents' },
      { status: 500 }
    );
  }
}
