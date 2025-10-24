import { NextResponse } from 'next/server';
import { getServerClient } from '../../../lib/supabase-manager';

// Enhanced security monitoring and alerting system
export async function POST(request) {
  try {
    const { action, monitoringData, options = {} } = await request.json();
    
    console.log(`🔒 Security monitoring: ${action}`);
    
    const supabaseServer = getServerClient();
    if (!supabaseServer) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    switch (action) {
      case 'check_security_alerts':
        return await checkSecurityAlerts(options, supabaseServer);
      
      case 'generate_security_report':
        return await generateSecurityReport(options, supabaseServer);
      
      case 'monitor_suspicious_activity':
        return await monitorSuspiciousActivity(monitoringData, supabaseServer);
      
      case 'update_security_policies':
        return await updateSecurityPolicies(monitoringData, supabaseServer);
      
      case 'audit_compliance':
        return await auditCompliance(options, supabaseServer);
      
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('❌ Security monitoring error:', error);
    return NextResponse.json({ error: 'Security monitoring failed' }, { status: 500 });
  }
}

// Check for security alerts and threats
async function checkSecurityAlerts(options, supabaseServer) {
  const { timeRange = '24h', alertLevel = 'medium', agencyId } = options;
  
  try {
    console.log('🔍 Checking security alerts...');
    
    const hours = timeRange === '1h' ? 1 : timeRange === '24h' ? 24 : timeRange === '7d' ? 168 : 24;
    const startTime = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();

    // Get security validations with high risk
    const { data: highRiskValidations, error: validationError } = await supabaseServer
      .from('security_validations')
      .select('*')
      .in('risk_level', ['high', 'critical'])
      .gte('validated_at', startTime);

    if (validationError) {
      throw new Error(`Failed to fetch security validations: ${validationError.message}`);
    }

    // Get suspicious activity from audit trail
    const { data: suspiciousActivity, error: auditError } = await supabaseServer
      .from('security_audit_trail')
      .select('*')
      .in('action', ['unauthorized_access', 'privilege_escalation', 'data_breach_attempt'])
      .gte('created_at', startTime);

    if (auditError) {
      throw new Error(`Failed to fetch audit trail: ${auditError.message}`);
    }

    // Get failed authentication attempts
    const { data: failedAuth, error: authError } = await supabaseServer
      .from('security_audit_trail')
      .select('*')
      .eq('action', 'authentication_failed')
      .gte('created_at', startTime);

    if (authError) {
      throw new Error(`Failed to fetch authentication data: ${authError.message}`);
    }

    // Analyze alerts
    const alerts = [];
    
    // High-risk file uploads
    if (highRiskValidations && highRiskValidations.length > 0) {
      alerts.push({
        type: 'high_risk_uploads',
        severity: 'high',
        count: highRiskValidations.length,
        description: `${highRiskValidations.length} high-risk files uploaded`,
        files: highRiskValidations.map(v => ({
          filename: v.filename,
          risk_level: v.risk_level,
          issues: v.issues,
          validated_at: v.validated_at
        })),
        recommendation: 'Review and quarantine high-risk files immediately'
      });
    }

    // Suspicious activity
    if (suspiciousActivity && suspiciousActivity.length > 0) {
      alerts.push({
        type: 'suspicious_activity',
        severity: 'critical',
        count: suspiciousActivity.length,
        description: `${suspiciousActivity.length} suspicious activities detected`,
        activities: suspiciousActivity.map(a => ({
          action: a.action,
          user_id: a.user_id,
          resource_type: a.resource_type,
          created_at: a.created_at
        })),
        recommendation: 'Investigate suspicious activities and consider user account suspension'
      });
    }

    // Failed authentication attempts
    if (failedAuth && failedAuth.length > 5) {
      alerts.push({
        type: 'excessive_failed_auth',
        severity: 'medium',
        count: failedAuth.length,
        description: `${failedAuth.length} failed authentication attempts`,
        recommendation: 'Review authentication logs and consider implementing account lockout'
      });
    }

    // Check for data classification violations
    const { data: classificationViolations, error: classError } = await supabaseServer
      .from('security_audit_trail')
      .select('*')
      .eq('action', 'data_classification_violation')
      .gte('created_at', startTime);

    if (!classError && classificationViolations && classificationViolations.length > 0) {
      alerts.push({
        type: 'data_classification_violations',
        severity: 'high',
        count: classificationViolations.length,
        description: `${classificationViolations.length} data classification violations`,
        recommendation: 'Review data access policies and user permissions'
      });
    }

    // Calculate overall security score
    const securityScore = calculateSecurityScore(alerts, highRiskValidations, suspiciousActivity, failedAuth);

    return NextResponse.json({
      success: true,
      alerts: alerts,
      security_score: securityScore,
      time_range: timeRange,
      total_alerts: alerts.length,
      critical_alerts: alerts.filter(a => a.severity === 'critical').length,
      high_alerts: alerts.filter(a => a.severity === 'high').length,
      medium_alerts: alerts.filter(a => a.severity === 'medium').length
    });

  } catch (error) {
    console.error('Check security alerts error:', error);
    return NextResponse.json({ error: 'Failed to check security alerts' }, { status: 500 });
  }
}

// Generate comprehensive security report
async function generateSecurityReport(options, supabaseServer) {
  const { timeRange = '7d', reportType = 'comprehensive', agencyId } = options;
  
  try {
    console.log('📊 Generating security report...');
    
    const days = timeRange === '1d' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 7;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get security statistics
    const { data: securityStats, error: statsError } = await supabaseServer
      .from('security_validations')
      .select('risk_level, is_safe, validated_at')
      .gte('validated_at', startDate);

    if (statsError) {
      throw new Error(`Failed to fetch security statistics: ${statsError.message}`);
    }

    // Get audit trail statistics
    const { data: auditStats, error: auditError } = await supabaseServer
      .from('security_audit_trail')
      .select('action, created_at, agency_id')
      .gte('created_at', startDate);

    if (auditError) {
      throw new Error(`Failed to fetch audit statistics: ${auditError.message}`);
    }

    // Calculate security metrics
    const totalFiles = securityStats.length;
    const safeFiles = securityStats.filter(s => s.is_safe).length;
    const unsafeFiles = totalFiles - safeFiles;
    const highRiskFiles = securityStats.filter(s => s.risk_level === 'high').length;
    const criticalRiskFiles = securityStats.filter(s => s.risk_level === 'critical').length;

    const securityMetrics = {
      total_files_processed: totalFiles,
      safe_files: safeFiles,
      unsafe_files: unsafeFiles,
      high_risk_files: highRiskFiles,
      critical_risk_files: criticalRiskFiles,
      security_success_rate: totalFiles > 0 ? (safeFiles / totalFiles) * 100 : 0,
      risk_distribution: {
        low: securityStats.filter(s => s.risk_level === 'low').length,
        medium: securityStats.filter(s => s.risk_level === 'medium').length,
        high: highRiskFiles,
        critical: criticalRiskFiles
      }
    };

    // Calculate audit metrics
    const auditMetrics = {
      total_events: auditStats.length,
      events_by_action: {},
      events_by_agency: {},
      suspicious_events: auditStats.filter(a => 
        ['unauthorized_access', 'privilege_escalation', 'data_breach_attempt'].includes(a.action)
      ).length,
      failed_auth_attempts: auditStats.filter(a => a.action === 'authentication_failed').length
    };

    // Group events by action
    for (const event of auditStats) {
      auditMetrics.events_by_action[event.action] = (auditMetrics.events_by_action[event.action] || 0) + 1;
    }

    // Group events by agency
    for (const event of auditStats) {
      if (event.agency_id) {
        auditMetrics.events_by_agency[event.agency_id] = (auditMetrics.events_by_agency[event.agency_id] || 0) + 1;
      }
    }

    // Generate compliance assessment
    const complianceAssessment = await generateComplianceAssessment(securityStats, auditStats, supabaseServer);

    // Generate recommendations
    const recommendations = generateSecurityRecommendations(securityMetrics, auditMetrics, complianceAssessment);

    // Create report
    const report = {
      report_type: reportType,
      time_range: timeRange,
      generated_at: new Date().toISOString(),
      security_metrics: securityMetrics,
      audit_metrics: auditMetrics,
      compliance_assessment: complianceAssessment,
      recommendations: recommendations,
      executive_summary: generateExecutiveSummary(securityMetrics, auditMetrics, complianceAssessment)
    };

    // Store report in database
    await supabaseServer
      .from('security_reports')
      .insert({
        report_type: reportType,
        time_range: timeRange,
        report_data: report,
        generated_at: new Date().toISOString()
      });

    return NextResponse.json({
      success: true,
      report: report
    });

  } catch (error) {
    console.error('Generate security report error:', error);
    return NextResponse.json({ error: 'Failed to generate security report' }, { status: 500 });
  }
}

// Monitor suspicious activity
async function monitorSuspiciousActivity(monitoringData, supabaseServer) {
  const { userId, action, resourceType, resourceId, metadata } = monitoringData;
  
  try {
    console.log(`🔍 Monitoring suspicious activity: ${action} by user ${userId}`);
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      'unauthorized_access',
      'privilege_escalation',
      'data_breach_attempt',
      'excessive_failed_auth',
      'data_classification_violation',
      'unusual_access_pattern'
    ];

    const isSuspicious = suspiciousPatterns.includes(action);

    // Log the activity
    await supabaseServer
      .from('security_audit_trail')
      .insert({
        user_id: userId,
        action: action,
        resource_type: resourceType,
        resource_id: resourceId,
        metadata: {
          ...metadata,
          suspicious: isSuspicious,
          monitored_at: new Date().toISOString()
        }
      });

    // If suspicious, create alert
    if (isSuspicious) {
      await supabaseServer
        .from('security_alerts')
        .insert({
          alert_type: 'suspicious_activity',
          severity: 'high',
          user_id: userId,
          action: action,
          resource_type: resourceType,
          resource_id: resourceId,
          metadata: metadata,
          created_at: new Date().toISOString()
        });
    }

    return NextResponse.json({
      success: true,
      suspicious: isSuspicious,
      message: isSuspicious ? 'Suspicious activity detected and logged' : 'Activity logged normally'
    });

  } catch (error) {
    console.error('Monitor suspicious activity error:', error);
    return NextResponse.json({ error: 'Failed to monitor suspicious activity' }, { status: 500 });
  }
}

// Update security policies
async function updateSecurityPolicies(policyData, supabaseServer) {
  const { policyType, policyName, policyRules, effectiveDate } = policyData;
  
  try {
    console.log(`🔒 Updating security policies: ${policyName}`);
    
    // Validate policy data
    if (!policyType || !policyName || !policyRules) {
      return NextResponse.json({ error: 'Policy type, name, and rules are required' }, { status: 400 });
    }

    // Store policy update
    await supabaseServer
      .from('security_policy_updates')
      .insert({
        policy_type: policyType,
        policy_name: policyName,
        policy_rules: policyRules,
        effective_date: effectiveDate || new Date().toISOString(),
        updated_by: 'system', // Would be actual user ID in production
        created_at: new Date().toISOString()
      });

    // Log policy update in audit trail
    await supabaseServer
      .from('security_audit_trail')
      .insert({
        user_id: null, // System update
        action: 'policy_update',
        resource_type: 'security_policy',
        metadata: {
          policy_type: policyType,
          policy_name: policyName,
          effective_date: effectiveDate
        }
      });

    return NextResponse.json({
      success: true,
      message: `Security policy '${policyName}' updated successfully`
    });

  } catch (error) {
    console.error('Update security policies error:', error);
    return NextResponse.json({ error: 'Failed to update security policies' }, { status: 500 });
  }
}

// Audit compliance
async function auditCompliance(options, supabaseServer) {
  const { complianceStandard = 'fisma', timeRange = '30d' } = options;
  
  try {
    console.log(`📋 Auditing compliance: ${complianceStandard}`);
    
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

    // Get compliance data
    const { data: complianceData, error } = await supabaseServer
      .from('security_validations')
      .select('*')
      .gte('validated_at', startDate);

    if (error) {
      throw new Error(`Failed to fetch compliance data: ${error.message}`);
    }

    // Calculate compliance metrics
    const complianceMetrics = {
      total_validations: complianceData.length,
      compliant_files: complianceData.filter(d => d.metadata?.compliance_checks?.status === 'compliant').length,
      non_compliant_files: complianceData.filter(d => d.metadata?.compliance_checks?.status === 'non_compliant').length,
      fisma_compliant: complianceData.filter(d => d.metadata?.compliance_checks?.fismaCompliant === true).length,
      fedramp_compliant: complianceData.filter(d => d.metadata?.compliance_checks?.fedrampCompliant === true).length,
      compliance_rate: 0
    };

    if (complianceMetrics.total_validations > 0) {
      complianceMetrics.compliance_rate = (complianceMetrics.compliant_files / complianceMetrics.total_validations) * 100;
    }

    // Generate compliance report
    const complianceReport = {
      compliance_standard: complianceStandard,
      time_range: timeRange,
      metrics: complianceMetrics,
      violations: complianceData.filter(d => d.metadata?.compliance_checks?.status === 'non_compliant'),
      recommendations: generateComplianceRecommendations(complianceMetrics),
      audit_date: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      compliance_report: complianceReport
    });

  } catch (error) {
    console.error('Audit compliance error:', error);
    return NextResponse.json({ error: 'Failed to audit compliance' }, { status: 500 });
  }
}

// Helper functions
function calculateSecurityScore(alerts, highRiskValidations, suspiciousActivity, failedAuth) {
  let score = 100; // Start with perfect score

  // Deduct points for alerts
  for (const alert of alerts) {
    switch (alert.severity) {
      case 'critical':
        score -= 25;
        break;
      case 'high':
        score -= 15;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  }

  // Deduct points for high-risk files
  if (highRiskValidations && highRiskValidations.length > 0) {
    score -= Math.min(20, highRiskValidations.length * 2);
  }

  // Deduct points for suspicious activity
  if (suspiciousActivity && suspiciousActivity.length > 0) {
    score -= Math.min(30, suspiciousActivity.length * 5);
  }

  // Deduct points for failed authentication
  if (failedAuth && failedAuth.length > 10) {
    score -= Math.min(15, (failedAuth.length - 10) * 1);
  }

  return Math.max(0, Math.min(100, score));
}

async function generateComplianceAssessment(securityStats, auditStats, supabaseServer) {
  const assessment = {
    fisma_compliant: true,
    fedramp_compliant: true,
    issues: [],
    recommendations: []
  };

  // Check FISMA compliance
  const highRiskFiles = securityStats.filter(s => s.risk_level === 'high' || s.risk_level === 'critical');
  if (highRiskFiles.length > 0) {
    assessment.fisma_compliant = false;
    assessment.issues.push(`${highRiskFiles.length} high-risk files violate FISMA requirements`);
  }

  // Check FedRAMP compliance
  const largeFiles = securityStats.filter(s => s.file_size > 50 * 1024 * 1024);
  if (largeFiles.length > 0) {
    assessment.fedramp_compliant = false;
    assessment.issues.push(`${largeFiles.length} files exceed FedRAMP size limits`);
  }

  // Check for data classification violations
  const classificationViolations = auditStats.filter(a => a.action === 'data_classification_violation');
  if (classificationViolations.length > 0) {
    assessment.issues.push(`${classificationViolations.length} data classification violations`);
  }

  return assessment;
}

function generateSecurityRecommendations(securityMetrics, auditMetrics, complianceAssessment) {
  const recommendations = [];

  if (securityMetrics.security_success_rate < 90) {
    recommendations.push({
      type: 'security_improvement',
      priority: 'high',
      message: 'Security success rate is below 90%. Review file validation processes.'
    });
  }

  if (securityMetrics.critical_risk_files > 0) {
    recommendations.push({
      type: 'critical_risk_management',
      priority: 'critical',
      message: 'Critical risk files detected. Implement immediate quarantine procedures.'
    });
  }

  if (auditMetrics.suspicious_events > 0) {
    recommendations.push({
      type: 'suspicious_activity_response',
      priority: 'high',
      message: 'Suspicious activities detected. Review user access patterns and implement additional monitoring.'
    });
  }

  if (auditMetrics.failed_auth_attempts > 20) {
    recommendations.push({
      type: 'authentication_security',
      priority: 'medium',
      message: 'High number of failed authentication attempts. Consider implementing account lockout policies.'
    });
  }

  if (!complianceAssessment.fisma_compliant) {
    recommendations.push({
      type: 'fisma_compliance',
      priority: 'high',
      message: 'FISMA compliance issues detected. Review and update security policies.'
    });
  }

  if (!complianceAssessment.fedramp_compliant) {
    recommendations.push({
      type: 'fedramp_compliance',
      priority: 'medium',
      message: 'FedRAMP compliance issues detected. Review file size limits and processing procedures.'
    });
  }

  return recommendations;
}

function generateComplianceRecommendations(complianceMetrics) {
  const recommendations = [];

  if (complianceMetrics.compliance_rate < 95) {
    recommendations.push({
      type: 'compliance_improvement',
      priority: 'high',
      message: 'Compliance rate is below 95%. Review and update security validation processes.'
    });
  }

  if (complianceMetrics.non_compliant_files > 0) {
    recommendations.push({
      type: 'non_compliant_files',
      priority: 'medium',
      message: 'Non-compliant files detected. Review file processing and validation procedures.'
    });
  }

  return recommendations;
}

function generateExecutiveSummary(securityMetrics, auditMetrics, complianceAssessment) {
  const summary = {
    overall_security_status: 'good',
    key_metrics: {
      security_success_rate: securityMetrics.security_success_rate,
      total_files_processed: securityMetrics.total_files_processed,
      suspicious_events: auditMetrics.suspicious_events,
      compliance_status: complianceAssessment.fisma_compliant && complianceAssessment.fedramp_compliant ? 'compliant' : 'non_compliant'
    },
    critical_issues: [],
    immediate_actions: []
  };

  if (securityMetrics.security_success_rate < 90) {
    summary.overall_security_status = 'needs_attention';
    summary.critical_issues.push('Security success rate below 90%');
  }

  if (securityMetrics.critical_risk_files > 0) {
    summary.overall_security_status = 'critical';
    summary.critical_issues.push(`${securityMetrics.critical_risk_files} critical risk files detected`);
    summary.immediate_actions.push('Quarantine critical risk files immediately');
  }

  if (auditMetrics.suspicious_events > 0) {
    summary.critical_issues.push(`${auditMetrics.suspicious_events} suspicious activities detected`);
    summary.immediate_actions.push('Investigate suspicious activities');
  }

  if (!complianceAssessment.fisma_compliant || !complianceAssessment.fedramp_compliant) {
    summary.critical_issues.push('Compliance violations detected');
    summary.immediate_actions.push('Review and update compliance procedures');
  }

  return summary;
}
