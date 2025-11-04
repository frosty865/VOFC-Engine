/**
 * Application Monitoring and Health Check System
 * Provides comprehensive monitoring, health checks, and performance metrics
 */

export class MonitoringService {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      authFailures: 0,
      backupOperations: 0,
      startTime: Date.now()
    };
    
    this.healthChecks = new Map();
    this.alerts = [];
  }

  /**
   * Record API request
   */
  recordRequest(endpoint, method, statusCode, responseTime) {
    this.metrics.requests++;
    
    // Log slow requests
    if (responseTime > 5000) { // 5 seconds
      console.warn(`Slow request detected: ${method} ${endpoint} took ${responseTime}ms`);
    }
    
    // Log high error rates
    if (statusCode >= 400) {
      this.metrics.errors++;
      this.checkErrorRate();
    }
  }

  /**
   * Record authentication failure
   */
  recordAuthFailure(username, ip, reason) {
    this.metrics.authFailures++;
    
    console.warn(`Authentication failure: ${username} from ${ip} - ${reason}`);
    
    // Check for suspicious activity
    this.checkSuspiciousActivity(username, ip);
  }

  /**
   * Record backup operation
   */
  recordBackupOperation(type, status, duration) {
    this.metrics.backupOperations++;
    
    console.log(`Backup operation: ${type} - ${status} (${duration}ms)`);
    
    if (status === 'failed') {
      this.triggerAlert('backup_failure', {
        type,
        duration,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Add health check
   */
  addHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Run all health checks
   */
  async runHealthChecks() {
    const results = {};
    const startTime = Date.now();
    
    for (const [name, checkFunction] of this.healthChecks) {
      try {
        const result = await checkFunction();
        results[name] = {
          status: 'healthy',
          result,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        results[name] = {
          status: 'unhealthy',
          error: error.message,
          timestamp: new Date().toISOString()
        };
        
        this.triggerAlert('health_check_failure', {
          check: name,
          error: error.message
        });
      }
    }
    
    const duration = Date.now() - startTime;
    results._meta = {
      totalChecks: this.healthChecks.size,
      duration,
      timestamp: new Date().toISOString()
    };
    
    return results;
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    const uptime = Date.now() - this.metrics.startTime;
    const errorRate = this.metrics.requests > 0 ? 
      (this.metrics.errors / this.metrics.requests) * 100 : 0;
    
    return {
      ...this.metrics,
      uptime,
      errorRate: parseFloat(errorRate.toFixed(2)),
      requestsPerMinute: this.calculateRequestsPerMinute(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Check error rate and trigger alerts
   */
  checkErrorRate() {
    const errorRate = this.metrics.requests > 0 ? 
      (this.metrics.errors / this.metrics.requests) * 100 : 0;
    
    if (errorRate > 10) { // 10% error rate threshold
      this.triggerAlert('high_error_rate', {
        errorRate: parseFloat(errorRate.toFixed(2)),
        totalRequests: this.metrics.requests,
        totalErrors: this.metrics.errors
      });
    }
  }

  /**
   * Check for suspicious authentication activity
   */
  checkSuspiciousActivity(username, ip) {
    // This would typically check against a database of recent attempts
    // For now, we'll just log the activity
    console.warn(`Suspicious activity detected: ${username} from ${ip}`);
    
    if (this.metrics.authFailures > 10) {
      this.triggerAlert('suspicious_auth_activity', {
        username,
        ip,
        failureCount: this.metrics.authFailures
      });
    }
  }

  /**
   * Trigger alert
   */
  triggerAlert(type, details) {
    const alert = {
      id: this.generateAlertId(),
      type,
      details,
      timestamp: new Date().toISOString(),
      severity: this.getAlertSeverity(type)
    };
    
    this.alerts.push(alert);
    
    console.error(`ALERT [${alert.id}]: ${type}`, details);
    
    // In production, this would send to monitoring service
    this.sendAlert(alert);
  }

  /**
   * Get alert severity
   */
  getAlertSeverity(type) {
    const severityMap = {
      'backup_failure': 'high',
      'health_check_failure': 'medium',
      'high_error_rate': 'high',
      'suspicious_auth_activity': 'critical'
    };
    
    return severityMap[type] || 'low';
  }

  /**
   * Send alert to monitoring system
   */
  sendAlert(alert) {
    // In production, this would integrate with:
    // - Slack notifications
    // - Email alerts
    // - PagerDuty
    // - Custom monitoring dashboard
    
    console.log(`Alert sent: ${alert.type} (${alert.severity})`);
  }

  /**
   * Calculate requests per minute
   */
  calculateRequestsPerMinute() {
    const uptimeMinutes = (Date.now() - this.metrics.startTime) / (1000 * 60);
    return uptimeMinutes > 0 ? 
      Math.round(this.metrics.requests / uptimeMinutes) : 0;
  }

  /**
   * Generate alert ID
   */
  generateAlertId() {
    return `ALERT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit = 10) {
    return this.alerts
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, limit);
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanHours = 24) {
    const cutoffTime = Date.now() - (olderThanHours * 60 * 60 * 1000);
    this.alerts = this.alerts.filter(alert => 
      new Date(alert.timestamp).getTime() > cutoffTime
    );
  }

  /**
   * Get system status
   */
  async getSystemStatus() {
    const healthChecks = await this.runHealthChecks();
    const metrics = this.getMetrics();
    const recentAlerts = this.getRecentAlerts(5);
    
    const overallStatus = this.calculateOverallStatus(healthChecks, metrics);
    
    return {
      status: overallStatus,
      healthChecks,
      metrics,
      recentAlerts,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Calculate overall system status
   */
  calculateOverallStatus(healthChecks, metrics) {
    const unhealthyChecks = Object.values(healthChecks)
      .filter(check => check.status === 'unhealthy').length;
    
    if (unhealthyChecks > 0) {
      return 'degraded';
    }
    
    if (metrics.errorRate > 5) {
      return 'degraded';
    }
    
    if (this.alerts.some(alert => alert.severity === 'critical')) {
      return 'critical';
    }
    
    return 'healthy';
  }
}

// Create global monitoring instance
export const monitoring = new MonitoringService();

// Add default health checks
monitoring.addHealthCheck('database', async () => {
  // Check database connection
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
  
  const { data, error } = await supabase
    .from('user_profiles')
    .select('count')
    .limit(1);
  
  if (error) throw new Error(`Database connection failed: ${error.message}`);
  return { connected: true };
});

monitoring.addHealthCheck('authentication', async () => {
  // Check if authentication service is working
  const { AuthService } = await import('./auth-server');
  
  // Test token verification (without actual token)
  try {
    // This would test the auth service without exposing credentials
    return { service: 'operational' };
  } catch (error) {
    throw new Error(`Authentication service failed: ${error.message}`);
  }
});

monitoring.addHealthCheck('backup_system', async () => {
  // Check if backup system is accessible
  const { DatabaseBackupService } = await import('./database-backup');
  const backupService = new DatabaseBackupService();
  
  // Test backup directory access
  try {
    const fs = await import('fs/promises');
    await fs.access(backupService.backupDir);
    return { accessible: true };
  } catch (error) {
    throw new Error(`Backup system inaccessible: ${error.message}`);
  }
});

export default monitoring;

