import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';

// Enhanced learning system with weighted scoring and adaptive retraining
export async function POST(request) {
  try {
    const { action, options = {} } = await request.json();
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    switch (action) {
      case 'calculate_weighted_scores':
        return await calculateWeightedScores(supabaseServer);
      
      case 'trigger_adaptive_learning':
        return await triggerAdaptiveLearning(supabaseServer, options);
      
      case 'update_heuristic_patterns':
        return await updateHeuristicPatterns(supabaseServer, options);
      
      case 'process_feedback':
        return await processFeedback(supabaseServer, options);
      
      case 'generate_learning_report':
        return await generateLearningReport(supabaseServer, options);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Enhanced learning system error:', error);
    return NextResponse.json({ error: 'Learning system failed' }, { status: 500 });
  }
}

// Calculate weighted scores for learning events
async function calculateWeightedScores(supabaseServer) {
  console.log('🧠 Calculating weighted scores for learning events...');
  
  // Get recent learning events
  const { data: events, error } = await supabaseServer
    .from('learning_events_enhanced')
    .select('*')
    .order('processed_at', { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(`Failed to fetch learning events: ${error.message}`);
  }

  const updatedEvents = [];
  
  for (const event of events) {
    const weightedScore = calculateWeightedScore(event);
    
    updatedEvents.push({
      id: event.id,
      weighted_score: weightedScore.weighted_score,
      volume_factor: weightedScore.volume_factor,
      recency_factor: weightedScore.recency_factor,
      quality_factor: weightedScore.quality_factor
    });
  }

  // Update events with calculated scores
  for (const update of updatedEvents) {
    await supabaseServer
      .from('learning_events_enhanced')
      .update({
        weighted_score: update.weighted_score,
        volume_factor: update.volume_factor,
        recency_factor: update.recency_factor,
        quality_factor: update.quality_factor
      })
      .eq('id', update.id);
  }

  return NextResponse.json({
    success: true,
    message: `Updated weighted scores for ${updatedEvents.length} events`,
    updated_count: updatedEvents.length
  });
}

// Calculate weighted score based on multiple factors
function calculateWeightedScore(event) {
  const now = new Date();
  const processedAt = new Date(event.processed_at);
  
  // Volume factor (based on content length and findings)
  const contentLength = event.data?.content_length || 1000;
  const findingsCount = (event.vulnerabilities_found || 0) + (event.ofcs_found || 0);
  const volumeFactor = Math.min(1.0, (contentLength / 5000) * 0.4 + (findingsCount / 10) * 0.6);
  
  // Recency factor (more recent = higher score)
  const hoursSinceProcessing = (now - processedAt) / (1000 * 60 * 60);
  const recencyFactor = Math.max(0.1, 1.0 - (hoursSinceProcessing / 168)); // Decay over 1 week
  
  // Quality factor (based on confidence and extraction method)
  const confidenceScore = event.confidence_score || 0.5;
  const methodQuality = event.extraction_method === 'ollama_enhanced' ? 1.0 : 0.7;
  const qualityFactor = (confidenceScore * 0.7) + (methodQuality * 0.3);
  
  // Weighted score calculation
  const weightedScore = (volumeFactor * 0.3) + (recencyFactor * 0.4) + (qualityFactor * 0.3);
  
  return {
    weighted_score: Math.round(weightedScore * 100) / 100,
    volume_factor: Math.round(volumeFactor * 100) / 100,
    recency_factor: Math.round(recencyFactor * 100) / 100,
    quality_factor: Math.round(qualityFactor * 100) / 100
  };
}

// Trigger adaptive learning based on weighted scores
async function triggerAdaptiveLearning(supabaseServer, options) {
  console.log('🧠 Triggering adaptive learning cycle...');
  
  const { threshold = 0.7, minEvents = 5 } = options;
  
  // Get high-scoring events
  const { data: highScoreEvents, error } = await supabaseServer
    .from('learning_events_enhanced')
    .select('*')
    .gte('weighted_score', threshold)
    .order('weighted_score', { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(`Failed to fetch high-score events: ${error.message}`);
  }

  if (highScoreEvents.length < minEvents) {
    return NextResponse.json({
      success: true,
      message: `Not enough high-score events (${highScoreEvents.length}/${minEvents})`,
      triggered: false
    });
  }

  // Analyze patterns and update heuristic cache
  const patterns = analyzeDocumentPatterns(highScoreEvents);
  
  // Update heuristic patterns
  for (const pattern of patterns) {
    await supabaseServer
      .from('heuristic_patterns')
      .upsert({
        pattern_name: pattern.name,
        pattern_type: pattern.type,
        pattern_data: pattern.data,
        confidence_threshold: pattern.confidence,
        usage_count: pattern.usage_count,
        success_rate: pattern.success_rate,
        last_used: new Date().toISOString()
      }, {
        onConflict: 'pattern_name'
      });
  }

  // Update learning statistics
  await supabaseServer
    .from('learning_stats_enhanced')
    .upsert({
      metric_name: 'adaptive_learning_triggered',
      metric_value: {
        triggered_at: new Date().toISOString(),
        high_score_events: highScoreEvents.length,
        patterns_updated: patterns.length,
        threshold_used: threshold
      },
      weighted_score: highScoreEvents.reduce((sum, e) => sum + e.weighted_score, 0) / highScoreEvents.length,
      trend_direction: 'improving',
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'metric_name'
    });

  return NextResponse.json({
    success: true,
    message: 'Adaptive learning cycle completed',
    triggered: true,
    high_score_events: highScoreEvents.length,
    patterns_updated: patterns.length
  });
}

// Analyze document patterns for heuristic caching
function analyzeDocumentPatterns(events) {
  const patterns = [];
  
  // Group by document type and extraction method
  const groupedEvents = events.reduce((groups, event) => {
    const key = `${event.extraction_method}_${event.filename.split('.').pop()}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(event);
    return groups;
  }, {});

  // Analyze each group for patterns
  for (const [key, groupEvents] of Object.entries(groupedEvents)) {
    const avgConfidence = groupEvents.reduce((sum, e) => sum + e.confidence_score, 0) / groupEvents.length;
    const avgFindings = groupEvents.reduce((sum, e) => sum + e.vulnerabilities_found + e.ofcs_found, 0) / groupEvents.length;
    
    if (avgConfidence > 0.8 && groupEvents.length >= 3) {
      patterns.push({
        name: `pattern_${key}`,
        type: 'document_structure',
        data: {
          extraction_method: groupEvents[0].extraction_method,
          file_type: groupEvents[0].filename.split('.').pop(),
          avg_confidence: avgConfidence,
          avg_findings: avgFindings,
          sample_size: groupEvents.length
        },
        confidence: avgConfidence,
        usage_count: groupEvents.length,
        success_rate: avgConfidence
      });
    }
  }

  return patterns;
}

// Update heuristic patterns based on new data
async function updateHeuristicPatterns(supabaseServer, options) {
  console.log('🧠 Updating heuristic patterns...');
  
  const { patternName, patternData, confidence } = options;
  
  if (!patternName || !patternData) {
    return NextResponse.json({ error: 'Pattern name and data required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('heuristic_patterns')
    .upsert({
      pattern_name: patternName,
      pattern_type: patternData.type || 'document_structure',
      pattern_data: patternData,
      confidence_threshold: confidence || 0.8,
      usage_count: 1,
      success_rate: confidence || 0.8,
      last_used: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'pattern_name'
    });

  if (error) {
    throw new Error(`Failed to update heuristic pattern: ${error.message}`);
  }

  return NextResponse.json({
    success: true,
    message: `Heuristic pattern '${patternName}' updated successfully`,
    pattern: data
  });
}

// Process human feedback for learning improvement
async function processFeedback(supabaseServer, options) {
  console.log('🧠 Processing learning feedback...');
  
  const { documentId, feedbackType, originalExtraction, correctedExtraction, feedbackNotes, confidenceRating } = options;
  
  if (!documentId || !feedbackType) {
    return NextResponse.json({ error: 'Document ID and feedback type required' }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from('learning_feedback')
    .insert({
      document_id: documentId,
      feedback_type: feedbackType,
      original_extraction: originalExtraction,
      corrected_extraction: correctedExtraction,
      feedback_notes: feedbackNotes,
      confidence_rating: confidenceRating
    });

  if (error) {
    throw new Error(`Failed to process feedback: ${error.message}`);
  }

  // Update learning statistics based on feedback
  await supabaseServer
    .from('learning_stats_enhanced')
    .upsert({
      metric_name: 'feedback_processed',
      metric_value: {
        feedback_type: feedbackType,
        confidence_rating: confidenceRating,
        processed_at: new Date().toISOString()
      },
      last_updated: new Date().toISOString()
    }, {
      onConflict: 'metric_name'
    });

  return NextResponse.json({
    success: true,
    message: 'Feedback processed successfully',
    feedback_id: data[0].id
  });
}

// Generate comprehensive learning report
async function generateLearningReport(supabaseServer, options) {
  console.log('🧠 Generating learning report...');
  
  const { timeRange = '7d' } = options;
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7;
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  // Get learning statistics
  const { data: stats, error: statsError } = await supabaseServer
    .from('learning_stats_enhanced')
    .select('*')
    .gte('last_updated', startDate);

  if (statsError) {
    throw new Error(`Failed to fetch learning stats: ${statsError.message}`);
  }

  // Get processing performance
  const { data: processingStats, error: processingError } = await supabaseServer
    .from('document_processing_enhanced')
    .select('confidence_score, processing_time, extraction_method, status')
    .gte('created_at', startDate);

  if (processingError) {
    throw new Error(`Failed to fetch processing stats: ${processingError.message}`);
  }

  // Calculate performance metrics
  const totalProcessed = processingStats.filter(p => p.status === 'completed').length;
  const avgConfidence = processingStats.reduce((sum, p) => sum + (p.confidence_score || 0), 0) / totalProcessed;
  const avgProcessingTime = processingStats.reduce((sum, p) => sum + (p.processing_time || 0), 0) / totalProcessed;
  
  const methodPerformance = processingStats.reduce((acc, p) => {
    if (!acc[p.extraction_method]) {
      acc[p.extraction_method] = { count: 0, total_confidence: 0, total_time: 0 };
    }
    acc[p.extraction_method].count++;
    acc[p.extraction_method].total_confidence += p.confidence_score || 0;
    acc[p.extraction_method].total_time += p.processing_time || 0;
    return acc;
  }, {});

  // Get heuristic pattern usage
  const { data: patterns, error: patternsError } = await supabaseServer
    .from('heuristic_patterns')
    .select('*')
    .order('usage_count', { ascending: false });

  if (patternsError) {
    throw new Error(`Failed to fetch heuristic patterns: ${patternsError.message}`);
  }

  const report = {
    time_range: timeRange,
    generated_at: new Date().toISOString(),
    performance_metrics: {
      total_processed: totalProcessed,
      average_confidence: Math.round(avgConfidence * 100) / 100,
      average_processing_time: Math.round(avgProcessingTime),
      success_rate: Math.round((totalProcessed / processingStats.length) * 100)
    },
    method_performance: Object.entries(methodPerformance).map(([method, data]) => ({
      method,
      count: data.count,
      avg_confidence: Math.round((data.total_confidence / data.count) * 100) / 100,
      avg_processing_time: Math.round(data.total_time / data.count)
    })),
    heuristic_patterns: patterns.map(p => ({
      name: p.pattern_name,
      type: p.pattern_type,
      usage_count: p.usage_count,
      success_rate: p.success_rate,
      last_used: p.last_used
    })),
    learning_events: stats.length,
    recommendations: generateRecommendations(processingStats, patterns)
  };

  return NextResponse.json({
    success: true,
    report
  });
}

// Generate recommendations based on performance data
function generateRecommendations(processingStats, patterns) {
  const recommendations = [];
  
  // Check confidence scores
  const lowConfidenceCount = processingStats.filter(p => p.confidence_score < 0.6).length;
  if (lowConfidenceCount > processingStats.length * 0.2) {
    recommendations.push({
      type: 'confidence_improvement',
      priority: 'high',
      message: `${lowConfidenceCount} documents had low confidence scores. Consider improving extraction methods.`
    });
  }

  // Check processing times
  const slowProcessingCount = processingStats.filter(p => p.processing_time > 60000).length;
  if (slowProcessingCount > processingStats.length * 0.1) {
    recommendations.push({
      type: 'performance_optimization',
      priority: 'medium',
      message: `${slowProcessingCount} documents took over 60 seconds to process. Consider optimizing the pipeline.`
    });
  }

  // Check pattern usage
  const underusedPatterns = patterns.filter(p => p.usage_count < 5);
  if (underusedPatterns.length > 0) {
    recommendations.push({
      type: 'pattern_optimization',
      priority: 'low',
      message: `${underusedPatterns.length} heuristic patterns are underused. Consider reviewing pattern effectiveness.`
    });
  }

  return recommendations;
}
