import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Use service role for API operations to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function POST(request) {
  try {
    const { filenames } = await request.json();
    
    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Filenames array is required' },
        { status: 400 }
      );
    }
    
    const results = [];
    
    for (const filename of filenames) {
      try {
        // Check if file exists in documents bucket
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('documents')
          .download(filename);
        
        if (downloadError) {
          results.push({ filename, status: 'error', message: 'File not found in storage' });
          continue;
        }
        
        // Move file to processing status by updating metadata
        const { error: updateError } = await supabase.storage
          .from('documents')
          .update(filename, fileData, {
            cacheControl: '3600',
            upsert: true,
            contentType: 'application/pdf'
          });
        
        if (updateError) {
          results.push({ filename, status: 'error', message: updateError.message });
          continue;
        }
        
        // Simulate processing delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Move to completed bucket
        const { error: moveError } = await supabase.storage
          .from('documents')
          .move(filename, `completed/${filename}`);
        
        if (moveError) {
          // If move fails, try copying instead
          const { error: copyError } = await supabase.storage
            .from('documents')
            .copy(filename, `completed/${filename}`);
          
          if (copyError) {
            results.push({ filename, status: 'error', message: copyError.message });
            continue;
          }
        }
        
        results.push({ filename, status: 'success', message: 'Processed successfully' });
        
      } catch (error) {
        console.error(`Error processing ${filename}:`, error);
        results.push({ filename, status: 'error', message: error.message });
      }
    }
    
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    
    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} documents successfully, ${errorCount} failed`,
      results: results
    });
    
  } catch (error) {
    console.error('Error processing batch:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process batch' },
      { status: 500 }
    );
  }
}
