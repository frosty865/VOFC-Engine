import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';

// Enhanced learning feedback system with human validation
export async function POST(request) {
  try {
    const { action, feedbackData, options = {} } = await request.json();
    
    console.log(`🧠 Learning feedback processing: ${action}`);
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    switch (action) {
      case 'submit_feedback':
        return await submitLearningFeedback(feedbackData, supabaseServer);
      
      case 'get_feedback_summary':
        return await getFeedbackSummary(options, supabaseServer);
      
      case 'process_feedback_batch':
        return await processFeedbackBatch(feedbackData, supabaseServer);
      
      case 'update_learning_model':
        return await updateLearningModel(feedbackData, supabaseServer);
      
      case 'generate_learning_insights':
        return await generateLearningInsights(options, supabaseServer);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Learning feedback error:', error);
    return NextResponse.json({ error: 'Learning feedback processing failed' }, { status: 500 });
  }
}

// Submit learning feedback from human validation
async function submitLearningFeedback(feedbackData, supabaseServer) {
  const {
    documentId,
    feedbackType, // 'validation', 'correction', 'improvement', 'rejection'
    originalExtraction,
    correctedExtraction,
    feedbackNotes,
    confidenceRating,
    userId,
    metadata = {}
  } = feedbackData;

  try {
    console.log(`📝 Processing feedback for document: ${documentId}`);
    
    // Validate feedback data
    if (!documentId || !feedbackType) {
      return NextResponse.json({ 
        error: 'Document ID and feedback type are required' 
      }, { status: 400 });
    }

    // Calculate feedback impact score
    const impactScore = calculateFeedbackImpact(
      originalExtraction, 
      correctedExtraction, 
      feedbackType,
      confidenceRating
    );

    // Insert feedback record
    const { data: feedback, error } = await supabaseServer
      .from('learning_feedback')
      .insert({
        document_id: documentId,
        feedback_type: feedbackType,
        original_extraction: originalExtraction,
        corrected_extraction: correctedExtraction,
        feedback_notes: feedbackNotes,
        confidence_rating: confidenceRating,
        impact_score: impactScore,
        user_id: userId,
        metadata: metadata,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to insert feedback: ${error.message}`);
    }

    // Update learning statistics
    await updateLearningStatistics(feedbackType, impactScore, supabaseServer);

    // Trigger learning model update if significant feedback
    if (impactScore > 0.7) {
      await triggerModelUpdate(documentId, feedback.id, supabaseServer);
    }

    // Generate feedback insights
    const insights = await generateFeedbackInsights(feedback, supabaseServer);

    return NextResponse.json({
      success: true,
      feedback_id: feedback.id,
      impact_score: impactScore,
      insights: insights,
      message: 'Learning feedback submitted successfully'
    });

  } catch (error) {
    console.error('❌ Submit feedback error:', error);
    return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 });
  }
}

// Calculate feedback impact score
function calculateFeedbackImpact(original, corrected, feedbackType, confidenceRating) {
  let impactScore = 0.5; // Base score

  try {
    // Factor 1: Feedback type impact
    const typeImpact = {
      'validation': 0.3,      // Confirming existing extraction
      'correction': 0.8,     // Fixing errors
      'improvement': 0.6,    // Enhancing extraction
      'rejection': 0.9       // Complete rejection
    };
    impactScore += typeImpact[feedbackType] || 0.3;

    // Factor 2: Confidence rating impact
    if (confidenceRating) {
      const confidenceImpact = (confidenceRating - 3) / 2; // Scale 1-5 to -1 to 1
      impactScore += confidenceImpact * 0.2;
    }

    // Factor 3: Content change analysis
    if (original && corrected) {
      const changeRatio = calculateContentChangeRatio(original, corrected);
      impactScore += changeRatio * 0.3;
    }

    // Factor 4: Feedback quality indicators
    const qualityIndicators = analyzeFeedbackQuality(original, corrected);
    impactScore += qualityIndicators * 0.2;

    return Math.min(1.0, Math.max(0.0, impactScore));

  } catch (error) {
    console.error('Impact calculation error:', error);
    return 0.5;
  }
}

// Calculate content change ratio
function calculateContentChangeRatio(original, corrected) {
  try {
    if (!original || !corrected) return 0.5;

    // Simple text comparison
    const originalText = JSON.stringify(original);
    const correctedText = JSON.stringify(corrected);
    
    if (originalText === correctedText) return 0.1; // No change
    
    // Calculate similarity ratio
    const maxLength = Math.max(originalText.length, correctedText.length);
    const minLength = Math.min(originalText.length, correctedText.length);
    
    if (maxLength === 0) return 0.5;
    
    const similarity = minLength / maxLength;
    return 1.0 - similarity; // Higher change = higher impact

  } catch (error) {
    console.error('Content change calculation error:', error);
    return 0.5;
  }
}

// Analyze feedback quality
function analyzeFeedbackQuality(original, corrected) {
  let qualityScore = 0.5;

  try {
    if (!original || !corrected) return qualityScore;

    // Check for detailed feedback
    const originalKeys = Object.keys(original);
    const correctedKeys = Object.keys(corrected);
    
    if (correctedKeys.length > originalKeys.length) {
      qualityScore += 0.2; // Added new information
    }

    // Check for structured feedback
    if (corrected.vulnerabilities && Array.isArray(corrected.vulnerabilities)) {
      qualityScore += 0.1; // Structured vulnerability data
    }

    if (corrected.options_for_consideration && Array.isArray(corrected.options_for_consideration)) {
      qualityScore += 0.1; // Structured OFC data
    }

    // Check for completeness
    const hasTitle = corrected.title && corrected.title.length > 0;
    const hasContent = corrected.vulnerabilities?.length > 0 || corrected.options_for_consideration?.length > 0;
    
    if (hasTitle && hasContent) {
      qualityScore += 0.1; // Complete feedback
    }

    return Math.min(1.0, qualityScore);

  } catch (error) {
    console.error('Feedback quality analysis error:', error);
    return 0.5;
  }
}

// Update learning statistics
async function updateLearningStatistics(feedbackType, impactScore, supabaseServer) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Update daily feedback statistics
    const { data: existingStats, error: fetchError } = await supabaseServer
      .from('learning_stats_enhanced')
      .select('*')
      .eq('metric_name', 'daily_feedback')
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') { // Not found error
      throw fetchError;
    }

    const currentStats = existingStats?.metric_value || {
      date: today,
      total_feedback: 0,
      feedback_by_type: {},
      avg_impact_score: 0,
      high_impact_count: 0
    };

    // Update statistics
    currentStats.total_feedback += 1;
    currentStats.feedback_by_type[feedbackType] = (currentStats.feedback_by_type[feedbackType] || 0) + 1;
    
    // Update average impact score
    const totalFeedback = currentStats.total_feedback;
    currentStats.avg_impact_score = ((currentStats.avg_impact_score * (totalFeedback - 1)) + impactScore) / totalFeedback;
    
    if (impactScore > 0.7) {
      currentStats.high_impact_count += 1;
    }

    // Upsert statistics
    await supabaseServer
      .from('learning_stats_enhanced')
      .upsert({
        metric_name: 'daily_feedback',
        metric_value: currentStats,
        weighted_score: currentStats.avg_impact_score,
        trend_direction: currentStats.avg_impact_score > 0.6 ? 'improving' : 'stable',
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'metric_name'
      });

  } catch (error) {
    console.error('Update learning statistics error:', error);
  }
}

// Trigger learning model update
async function triggerModelUpdate(documentId, feedbackId, supabaseServer) {
  try {
    console.log(`🔄 Triggering model update for document: ${documentId}`);
    
    // Create model update record
    await supabaseServer
      .from('learning_model_updates')
      .insert({
        document_id: documentId,
        feedback_id: feedbackId,
        update_type: 'feedback_triggered',
        status: 'pending',
        created_at: new Date().toISOString()
      });

    // Update learning statistics
    await supabaseServer
      .from('learning_stats_enhanced')
      .upsert({
        metric_name: 'model_updates_triggered',
        metric_value: {
          triggered_by: 'feedback',
          document_id: documentId,
          feedback_id: feedbackId,
          triggered_at: new Date().toISOString()
        },
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'metric_name'
      });

  } catch (error) {
    console.error('Trigger model update error:', error);
  }
}

// Generate feedback insights
async function generateFeedbackInsights(feedback, supabaseServer) {
  try {
    const insights = [];

    // Insight 1: Feedback type analysis
    if (feedback.feedback_type === 'correction') {
      insights.push({
        type: 'extraction_improvement',
        message: 'Correction feedback indicates extraction quality issues',
        priority: 'high',
        recommendation: 'Review extraction prompts and model parameters'
      });
    }

    // Insight 2: Impact score analysis
    if (feedback.impact_score > 0.8) {
      insights.push({
        type: 'high_impact_feedback',
        message: 'High-impact feedback received - significant learning opportunity',
        priority: 'high',
        recommendation: 'Prioritize model retraining with this feedback'
      });
    }

    // Insight 3: Confidence rating analysis
    if (feedback.confidence_rating && feedback.confidence_rating < 3) {
      insights.push({
        type: 'low_confidence_feedback',
        message: 'Low confidence rating indicates extraction uncertainty',
        priority: 'medium',
        recommendation: 'Improve confidence scoring and validation'
      });
    }

    return insights;

  } catch (error) {
    console.error('Generate feedback insights error:', error);
    return [];
  }
}

// Get feedback summary
async function getFeedbackSummary(options, supabaseServer) {
  const { timeRange = '7d', feedbackType, minImpactScore = 0 } = options;
  
  try {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    let query = supabaseServer
      .from('learning_feedback')
      .select('*')
      .gte('created_at', startDate)
      .gte('impact_score', minImpactScore);

    if (feedbackType) {
      query = query.eq('feedback_type', feedbackType);
    }

    const { data: feedback, error } = await query.order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch feedback: ${error.message}`);
    }

    // Calculate summary statistics
    const summary = {
      total_feedback: feedback.length,
      feedback_by_type: {},
      avg_impact_score: 0,
      high_impact_feedback: 0,
      recent_feedback: feedback.slice(0, 10),
      trends: {}
    };

    // Analyze feedback by type
    for (const item of feedback) {
      const type = item.feedback_type;
      summary.feedback_by_type[type] = (summary.feedback_by_type[type] || 0) + 1;
      
      if (item.impact_score > 0.7) {
        summary.high_impact_feedback += 1;
      }
    }

    // Calculate average impact score
    if (feedback.length > 0) {
      summary.avg_impact_score = feedback.reduce((sum, item) => sum + item.impact_score, 0) / feedback.length;
    }

    // Analyze trends
    const recentFeedback = feedback.filter(f => 
      new Date(f.created_at) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    );
    summary.trends.recent_24h = recentFeedback.length;
    summary.trends.avg_impact_trend = recentFeedback.length > 0 ? 
      recentFeedback.reduce((sum, f) => sum + f.impact_score, 0) / recentFeedback.length : 0;

    return NextResponse.json({
      success: true,
      summary,
      time_range: timeRange
    });

  } catch (error) {
    console.error('Get feedback summary error:', error);
    return NextResponse.json({ error: 'Failed to get feedback summary' }, { status: 500 });
  }
}

// Process feedback batch
async function processFeedbackBatch(feedbackData, supabaseServer) {
  const { feedbacks } = feedbackData;
  
  try {
    console.log(`📝 Processing feedback batch: ${feedbacks.length} items`);
    
    const results = [];
    const errors = [];

    for (const feedback of feedbacks) {
      try {
        const result = await submitLearningFeedback(feedback, supabaseServer);
        results.push(result);
      } catch (error) {
        errors.push({
          feedback: feedback,
          error: error.message
        });
      }
    }

    // Calculate batch statistics
    const batchStats = {
      total_processed: results.length,
      total_errors: errors.length,
      success_rate: results.length / feedbacks.length,
      avg_impact_score: results.reduce((sum, r) => sum + (r.impact_score || 0), 0) / results.length
    };

    return NextResponse.json({
      success: true,
      batch_stats: batchStats,
      results: results,
      errors: errors,
      message: `Processed ${results.length}/${feedbacks.length} feedback items`
    });

  } catch (error) {
    console.error('Process feedback batch error:', error);
    return NextResponse.json({ error: 'Failed to process feedback batch' }, { status: 500 });
  }
}

// Update learning model based on feedback
async function updateLearningModel(feedbackData, supabaseServer) {
  const { modelVersion, updateType, feedbackIds } = feedbackData;
  
  try {
    console.log(`🔄 Updating learning model: ${modelVersion}`);
    
    // Create model update record
    const { data: update, error } = await supabaseServer
      .from('learning_model_updates')
      .insert({
        model_version: modelVersion,
        update_type: updateType,
        feedback_ids: feedbackIds,
        status: 'processing',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create model update: ${error.message}`);
    }

    // Update learning statistics
    await supabaseServer
      .from('learning_stats_enhanced')
      .upsert({
        metric_name: 'model_updates',
        metric_value: {
          model_version: modelVersion,
          update_type: updateType,
          feedback_count: feedbackIds?.length || 0,
          updated_at: new Date().toISOString()
        },
        last_updated: new Date().toISOString()
      }, {
        onConflict: 'metric_name'
      });

    return NextResponse.json({
      success: true,
      update_id: update.id,
      message: 'Learning model update initiated'
    });

  } catch (error) {
    console.error('Update learning model error:', error);
    return NextResponse.json({ error: 'Failed to update learning model' }, { status: 500 });
  }
}

// Generate learning insights
async function generateLearningInsights(options, supabaseServer) {
  const { timeRange = '30d', insightTypes = ['all'] } = options;
  
  try {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get feedback data
    const { data: feedback, error: feedbackError } = await supabaseServer
      .from('learning_feedback')
      .select('*')
      .gte('created_at', startDate);

    if (feedbackError) {
      throw new Error(`Failed to fetch feedback: ${feedbackError.message}`);
    }

    // Get learning events
    const { data: events, error: eventsError } = await supabaseServer
      .from('learning_events_enhanced')
      .select('*')
      .gte('processed_at', startDate);

    if (eventsError) {
      throw new Error(`Failed to fetch learning events: ${eventsError.message}`);
    }

    // Generate insights
    const insights = [];

    // Insight 1: Feedback quality trends
    if (feedback.length > 0) {
      const avgImpactScore = feedback.reduce((sum, f) => sum + f.impact_score, 0) / feedback.length;
      const highImpactCount = feedback.filter(f => f.impact_score > 0.7).length;
      
      insights.push({
        type: 'feedback_quality',
        title: 'Feedback Quality Analysis',
        description: `Average impact score: ${avgImpactScore.toFixed(2)}, High-impact feedback: ${highImpactCount}`,
        priority: avgImpactScore > 0.6 ? 'low' : 'medium',
        recommendation: avgImpactScore < 0.5 ? 'Improve feedback collection process' : 'Maintain current feedback quality'
      });
    }

    // Insight 2: Learning effectiveness
    if (events.length > 0) {
      const avgConfidence = events.reduce((sum, e) => sum + (e.confidence_score || 0.5), 0) / events.length;
      const highConfidenceCount = events.filter(e => e.confidence_score > 0.8).length;
      
      insights.push({
        type: 'learning_effectiveness',
        title: 'Learning System Effectiveness',
        description: `Average confidence: ${avgConfidence.toFixed(2)}, High-confidence events: ${highConfidenceCount}`,
        priority: avgConfidence > 0.7 ? 'low' : 'high',
        recommendation: avgConfidence < 0.6 ? 'Review learning algorithms and training data' : 'Learning system performing well'
      });
    }

    // Insight 3: Pattern recognition effectiveness
    const { data: patterns, error: patternsError } = await supabaseServer
      .from('heuristic_patterns')
      .select('*');

    if (!patternsError && patterns.length > 0) {
      const avgSuccessRate = patterns.reduce((sum, p) => sum + p.success_rate, 0) / patterns.length;
      const underusedPatterns = patterns.filter(p => p.usage_count < 5).length;
      
      insights.push({
        type: 'pattern_effectiveness',
        title: 'Pattern Recognition Effectiveness',
        description: `Average success rate: ${avgSuccessRate.toFixed(2)}, Underused patterns: ${underusedPatterns}`,
        priority: avgSuccessRate > 0.7 ? 'low' : 'medium',
        recommendation: underusedPatterns > patterns.length * 0.3 ? 'Review and update underused patterns' : 'Pattern recognition performing well'
      });
    }

    return NextResponse.json({
      success: true,
      insights: insights,
      time_range: timeRange,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Generate learning insights error:', error);
    return NextResponse.json({ error: 'Failed to generate learning insights' }, { status: 500 });
  }
}
