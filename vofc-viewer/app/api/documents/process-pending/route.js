import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-client.js';

// Force server-side only execution
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Process all pending submissions that haven't been parsed yet
 * This endpoint will find submissions without enhanced_extraction data
 * and trigger processing for documents that exist in Ollama's incoming folder
 */
export async function POST() {
  try {
    console.log('🔄 Processing pending unparsed documents...');
    
    if (!supabaseAdmin) {
      return NextResponse.json(
        { success: false, error: 'Supabase not configured' },
        { status: 500 }
      );
    }
    
    // Get all pending submissions that haven't been processed yet
    const { data: pendingSubs, error } = await supabaseAdmin
      .from('submissions')
      .select('*')
      .eq('status', 'pending_review')
      .or('type.eq.ofc,source.eq.document_submission')
      .order('created_at', { ascending: true });
    
    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pending submissions' },
        { status: 500 }
      );
    }
    
    if (!pendingSubs || pendingSubs.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending submissions found',
        processed: 0
      });
    }
    
    // Get files from Ollama server
    const ollamaUrl = process.env.OLLAMA_URL || process.env.OLLAMA_API_BASE_URL || 'https://ollama.frostech.site';
    let ollamaFiles = [];
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const filesResponse = await fetch(`${ollamaUrl}/api/files/list`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (filesResponse.ok) {
        const ollamaData = await filesResponse.json();
        ollamaFiles = ollamaData.files || [];
      }
    } catch (err) {
      console.warn('⚠️ Could not fetch Ollama files:', err.message);
    }
    
    const ollamaFilenames = new Set(ollamaFiles.map(f => f.filename || f.name || '').filter(Boolean));
    
    // Filter submissions that:
    // 1. Have a document filename
    // 2. Don't have enhanced_extraction data yet
    // 3. Have a file in Ollama's incoming folder
    const toProcess = [];
    
    for (const sub of pendingSubs) {
      try {
        const subData = typeof sub.data === 'string' ? JSON.parse(sub.data) : sub.data || {};
        const filename = subData?.document_name || subData?.filename || sub.filename;
        
        // Check if already processed
        if (subData?.enhanced_extraction || subData?.parsed_at) {
          continue;
        }
        
        // Check if file exists in Ollama
        if (filename && ollamaFilenames.has(filename)) {
          toProcess.push({
            submissionId: sub.id,
            filename: filename,
            submission: sub
          });
        }
      } catch (e) {
        console.warn(`⚠️ Error processing submission ${sub.id}:`, e.message);
      }
    }
    
    if (toProcess.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No documents found that need processing',
        pending: pendingSubs.length,
        processed: 0
      });
    }
    
    console.log(`📋 Found ${toProcess.length} documents to process`);
    
    // Process each document
    const baseUrl = process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}`
      : (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000');
    
    const results = [];
    
    for (const item of toProcess) {
      try {
        console.log(`🔄 Processing ${item.filename} (submission ${item.submissionId})...`);
        // Use metadata-only single processor (works on Vercel)
        const processResponse = await fetch(`${baseUrl}/api/documents/process-one`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ submissionId: item.submissionId })
        });
        
        if (processResponse.ok) {
          const result = await processResponse.json();
          results.push({
            filename: item.filename,
            success: true,
            count: result.count || 0
          });
          console.log(`✅ Processed ${item.filename}: ${result.count || 0} vulnerabilities`);
        } else {
          const errorText = await processResponse.text();
          results.push({
            filename: item.filename,
            success: false,
            error: errorText
          });
          console.error(`❌ Failed to process ${item.filename}:`, processResponse.status);
        }
        
        // Add a small delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (err) {
        results.push({
          filename: item.filename,
          success: false,
          error: err.message
        });
        console.error(`❌ Error processing ${item.filename}:`, err.message);
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;
    
    return NextResponse.json({
      success: true,
      message: `Processed ${successCount} out of ${toProcess.length} documents`,
      processed: successCount,
      failed: failCount,
      total_pending: pendingSubs.length,
      results: results
    });
    
  } catch (error) {
    console.error('❌ Error processing pending documents:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

