import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';
import crypto from 'crypto';

// Enhanced batch processing with parallel worker pool
export async function POST(request) {
  try {
    const { filenames, options = {} } = await request.json();
    const { maxConcurrent = 3, priority = 'normal' } = options;
    
    console.log(`🚀 Enhanced batch processing: ${filenames.length} files, maxConcurrent: ${maxConcurrent}`);
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Create batch job record
    const batchId = crypto.randomUUID();
    const batchJob = {
      id: batchId,
      status: 'queued',
      total_files: filenames.length,
      processed_files: 0,
      failed_files: 0,
      priority,
      created_at: new Date().toISOString(),
      options: JSON.stringify(options)
    };

    // Insert batch job
    const { error: batchError } = await supabaseServer
      .from('batch_jobs')
      .insert([batchJob]);

    if (batchError) {
      console.error('❌ Error creating batch job:', batchError);
      return NextResponse.json({ error: 'Failed to create batch job' }, { status: 500 });
    }

    // Process files in parallel with worker pool
    const results = await processBatchWithWorkerPool(
      filenames, 
      maxConcurrent, 
      batchId, 
      supabaseServer
    );

    // Update batch job status
    const finalStatus = results.failed > 0 ? 'partial_success' : 'completed';
    await supabaseServer
      .from('batch_jobs')
      .update({
        status: finalStatus,
        processed_files: results.processed,
        failed_files: results.failed,
        completed_at: new Date().toISOString(),
        results: JSON.stringify(results.details)
      })
      .eq('id', batchId);

    return NextResponse.json({
      success: true,
      batch_id: batchId,
      status: finalStatus,
      processed: results.processed,
      failed: results.failed,
      details: results.details
    });

  } catch (error) {
    console.error('❌ Enhanced batch processing error:', error);
    return NextResponse.json({ error: 'Batch processing failed' }, { status: 500 });
  }
}

// Worker pool implementation
async function processBatchWithWorkerPool(filenames, maxConcurrent, batchId, supabaseServer) {
  const results = {
    processed: 0,
    failed: 0,
    details: []
  };

  // Create worker pool
  const workers = [];
  const queue = [...filenames];
  
  // Initialize workers
  for (let i = 0; i < maxConcurrent; i++) {
    workers.push(createWorker(i, queue, batchId, supabaseServer, results));
  }

  // Wait for all workers to complete
  await Promise.all(workers);

  return results;
}

// Individual worker function
async function createWorker(workerId, queue, batchId, supabaseServer, results) {
  while (queue.length > 0) {
    const filename = queue.shift();
    if (!filename) break;

    try {
      console.log(`🔧 Worker ${workerId} processing: ${filename}`);
      
      // Process individual file
      const result = await processFile(filename, batchId, supabaseServer);
      
      results.processed++;
      results.details.push({
        filename,
        status: 'completed',
        worker_id: workerId,
        processing_time: result.processing_time,
        vulnerabilities_found: result.vulnerabilities_found,
        ofcs_found: result.ofcs_found
      });

      // Update batch progress
      await supabaseServer
        .from('batch_jobs')
        .update({
          processed_files: results.processed,
          failed_files: results.failed
        })
        .eq('id', batchId);

    } catch (error) {
      console.error(`❌ Worker ${workerId} failed on ${filename}:`, error);
      
      results.failed++;
      results.details.push({
        filename,
        status: 'failed',
        worker_id: workerId,
        error: error.message
      });

      // Update batch progress
      await supabaseServer
        .from('batch_jobs')
        .update({
          processed_files: results.processed,
          failed_files: results.failed
        })
        .eq('id', batchId);
    }
  }
}

// Process individual file with enhanced features
async function processFile(filename, batchId, supabaseServer) {
  const startTime = Date.now();
  
  // Check for file deduplication using hash
  const fileHash = await getFileHash(filename, supabaseServer);
  const existingProcessed = await checkExistingProcessing(fileHash, supabaseServer);
  
  if (existingProcessed) {
    console.log(`📋 File ${filename} already processed (deduplication)`);
    return {
      processing_time: 0,
      vulnerabilities_found: existingProcessed.vulnerabilities_found,
      ofcs_found: existingProcessed.ofcs_found,
      deduplicated: true
    };
  }

  // Update status to processing
  await supabaseServer
    .from('document_processing')
    .upsert({
      filename,
      status: 'processing',
      batch_id: batchId,
      file_hash: fileHash,
      updated_at: new Date().toISOString()
    });

  try {
    // Get file from storage
    const { data: fileData, error: downloadError } = await supabaseServer.storage
      .from('documents')
      .download(filename);

    if (downloadError) throw downloadError;

    // Process with Ollama (existing logic)
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let documentContent;
    const isPDF = filename.toLowerCase().endsWith('.pdf');
    
    if (isPDF) {
      // Convert to base64 for Ollama
      documentContent = buffer.toString('base64');
    } else {
      documentContent = buffer.toString('utf-8');
    }

    // Call Ollama with enhanced processing
    const ollamaResult = await processWithOllamaEnhanced(documentContent, filename);
    
    // Update status to completed
    await supabaseServer
      .from('document_processing')
      .upsert({
        filename,
        status: 'completed',
        batch_id: batchId,
        file_hash: fileHash,
        vulnerabilities_found: ollamaResult.vulnerabilities?.length || 0,
        ofcs_found: ollamaResult.ofcs?.length || 0,
        processing_time: Date.now() - startTime,
        confidence_score: ollamaResult.confidence_score,
        updated_at: new Date().toISOString()
      });

    // Trigger learning system
    await triggerLearningSystem(filename, ollamaResult, supabaseServer);

    return {
      processing_time: Date.now() - startTime,
      vulnerabilities_found: ollamaResult.vulnerabilities?.length || 0,
      ofcs_found: ollamaResult.ofcs?.length || 0,
      confidence_score: ollamaResult.confidence_score
    };

  } catch (error) {
    // Update status to failed
    await supabaseServer
      .from('document_processing')
      .upsert({
        filename,
        status: 'failed',
        batch_id: batchId,
        file_hash: fileHash,
        error_message: error.message,
        updated_at: new Date().toISOString()
      });

    throw error;
  }
}

// Enhanced Ollama processing with confidence scoring
async function processWithOllamaEnhanced(content, filename) {
  const ollamaBaseUrl = process.env.OLLAMA_API_BASE_URL || 'http://localhost:11434';
  const ollamaModel = process.env.OLLAMA_MODEL || 'vofc-engine:latest';
  
  const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(content) && content.length > 100;
  
  const systemPrompt = `You are an expert document analyzer for the VOFC Engine with enhanced capabilities:

CAPABILITIES:
- Multi-pass PDF processing with heuristic analysis
- Confidence scoring based on content quality
- Pattern recognition for recurring document types
- Advanced text extraction and validation

CONFIDENCE SCORING FACTORS:
- OCR clarity and text readability
- Document structure recognition
- Citation density and quality
- Content completeness

Return JSON with confidence_score (0-1) and enhanced metadata.`;

  const userPrompt = isBase64 && filename.toLowerCase().endsWith('.pdf') 
    ? `Process this PDF using multi-pass analysis. Calculate confidence score based on:
1. Text extraction quality
2. Document structure recognition  
3. Content completeness
4. Citation quality

Document: ${filename}
Content: [PDF base64 data]

Provide confidence_score and detailed analysis.`
    : `Analyze this document with confidence scoring:
Document: ${filename}
Content: ${content}`;

  const response = await fetch(`${ollamaBaseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: ollamaModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      stream: false
    }),
    signal: AbortSignal.timeout(120000) // 2 minute timeout
  });

  if (!response.ok) {
    throw new Error(`Ollama API error: ${response.status}`);
  }

  const data = await response.json();
  const responseContent = data.message?.content || data.response;
  
  // Extract JSON and calculate confidence
  let jsonContent = responseContent;
  if (jsonContent.includes('```json')) {
    const match = jsonContent.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) jsonContent = match[1];
  }
  
  const result = JSON.parse(jsonContent);
  
  // Calculate confidence score if not provided
  if (!result.confidence_score) {
    result.confidence_score = calculateConfidenceScore(result, content);
  }

  return result;
}

// Calculate confidence score based on multiple factors
function calculateConfidenceScore(result, content) {
  let score = 0.5; // Base score
  
  // Factor 1: Content length and quality
  const contentLength = content.length;
  if (contentLength > 1000) score += 0.1;
  if (contentLength > 5000) score += 0.1;
  
  // Factor 2: Number of findings
  const vulnCount = result.vulnerabilities?.length || 0;
  const ofcCount = result.options_for_consideration?.length || 0;
  if (vulnCount > 0) score += 0.1;
  if (ofcCount > 0) score += 0.1;
  if (vulnCount > 3 || ofcCount > 3) score += 0.1;
  
  // Factor 3: Text quality indicators
  const hasReadableText = /[a-zA-Z]{3,}/.test(content);
  const hasStructure = /(section|chapter|paragraph)/i.test(content);
  if (hasReadableText) score += 0.1;
  if (hasStructure) score += 0.1;
  
  return Math.min(1.0, Math.max(0.0, score));
}

// File hash for deduplication
async function getFileHash(filename, supabaseServer) {
  const { data: fileData } = await supabaseServer.storage
    .from('documents')
    .download(filename);
  
  const arrayBuffer = await fileData.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

// Check for existing processing
async function checkExistingProcessing(fileHash, supabaseServer) {
  const { data } = await supabaseServer
    .from('document_processing')
    .select('*')
    .eq('file_hash', fileHash)
    .eq('status', 'completed')
    .single();
  
  return data;
}

// Enhanced learning system trigger
async function triggerLearningSystem(filename, parsedData, supabaseServer) {
  const learningEvent = {
    event_type: 'document_processed',
    filename,
    vulnerabilities_found: parsedData.vulnerabilities?.length || 0,
    ofcs_found: parsedData.options_for_consideration?.length || 0,
    extraction_method: 'ollama_enhanced',
    confidence: parsedData.confidence_score > 0.8 ? 'high' : 
                parsedData.confidence_score > 0.6 ? 'medium' : 'low',
    processed_at: new Date().toISOString(),
    data: JSON.stringify(parsedData),
    confidence_score: parsedData.confidence_score
  };

  await supabaseServer
    .from('learning_events')
    .insert([learningEvent]);

  // Check if we should trigger learning cycle
  const { data: recentEvents } = await supabaseServer
    .from('learning_events')
    .select('*')
    .gte('processed_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .eq('extraction_method', 'ollama_enhanced');

  if (recentEvents && recentEvents.length >= 5) {
    // Trigger learning cycle
    await supabaseServer
      .from('learning_stats')
      .upsert({
        metric_name: 'learning_triggered',
        metric_value: { 
          trigger_reason: 'threshold_reached',
          event_count: recentEvents.length,
          triggered_at: new Date().toISOString()
        },
        last_updated: new Date().toISOString()
      });
  }
}
