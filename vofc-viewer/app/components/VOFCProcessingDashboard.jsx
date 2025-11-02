'use client';

import { useState, useEffect } from 'react';

export default function VOFCProcessingDashboard() {
  const [status, setStatus] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);

  // Load status every 5 seconds
  useEffect(() => {
    const loadStatus = async () => {
      try {
        const response = await fetch('/api/dashboard/status');
        const data = await response.json();
        if (data.success) {
          setStatus(data.status);
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to load status:', error);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Connect to log stream
  useEffect(() => {
    const eventSource = new EventSource('/api/dashboard/stream?mode=live');
    
    eventSource.onopen = () => {
      setConnected(true);
      addLog('🔌 Connected to live monitoring stream', 'system');
    };

    eventSource.onmessage = (event) => {
      const match = event.data.match(/\[([^\]]+)\] \[([^\]]+)\] (.+)/);
      if (match) {
        const [, timestamp, type, message] = match;
        addLog(message, type.toLowerCase(), timestamp);
      } else {
        addLog(event.data, 'info');
      }
    };

    eventSource.onerror = (error) => {
      setConnected(false);
      addLog('❌ Connection lost', 'error');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const addLog = (message, type, timestamp) => {
    setLogs(prev => {
      const newLog = { message, type, timestamp: timestamp || new Date().toISOString() };
      const updated = [newLog, ...prev].slice(0, 100); // Keep last 100 logs
      return updated;
    });
  };

  const getServiceStatus = (service) => {
    if (!service || !status?.services[service]) return { color: 'gray', text: 'Unknown', icon: '❓' };
    
    const svc = status.services[service];
    const serviceStatus = svc.status || 'unknown';
    
    switch (serviceStatus) {
      case 'online':
      case 'configured':
      case 'running':
        return { color: 'green', text: 'Online', icon: '✅' };
      case 'error':
        return { color: 'yellow', text: 'Error', icon: '⚠️' };
      case 'offline':
      case 'stopped':
      case 'not_configured':
        return { color: 'red', text: 'Offline', icon: '❌' };
      default:
        return { color: 'gray', text: 'Unknown', icon: '❓' };
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'error': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'success': return 'text-green-600 bg-green-50';
      case 'system': return 'text-blue-600 bg-blue-50';
      default: return 'text-gray-700 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Flask Server (Python) */}
        <ServiceCard
          title="Flask Server (Python)"
          service={getServiceStatus('flask')}
          details={status?.services.flask}
          icon="🐍"
        />
        
        {/* Ollama Service */}
        <ServiceCard
          title="Ollama API"
          service={getServiceStatus('ollama')}
          details={status?.services.ollama}
          icon="🤖"
        />
        
        {/* Supabase */}
        <ServiceCard
          title="Supabase"
          service={getServiceStatus('supabase')}
          details={status?.services.supabase}
          icon="🗄️"
        />
        
        {/* Connection Status */}
        <ServiceCard
          title="Live Stream"
          service={connected ? { color: 'green', text: 'Connected', icon: '✅' } : { color: 'red', text: 'Disconnected', icon: '❌' }}
          details={{ stream: connected ? 'Active' : 'Inactive' }}
          icon="📡"
        />
      </div>

      {/* File Processing Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Incoming" value={status?.files?.incoming || 0} color="yellow" icon="📥" />
        <StatCard label="Processed" value={status?.files?.library || 0} color="green" icon="📚" />
        <StatCard label="Extracted Text" value={status?.files?.extracted_text || 0} color="blue" icon="📄" />
        <StatCard label="Errors" value={status?.files?.errors || 0} color="red" icon="❌" />
        <StatCard label="Active Jobs" value={status?.processing?.active_jobs || 0} color={status?.processing?.active_jobs > 0 ? 'yellow' : 'gray'} icon="⚙️" />
      </div>

      {/* Real-time Activity Log */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Real-time Activity</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {connected ? '🟢 Live' : '🔴 Disconnected'}
          </span>
        </div>
        <div className="bg-gray-900 text-green-400 font-mono text-sm p-4 rounded-lg h-96 overflow-y-auto" style={{ fontFamily: 'monospace' }}>
          {logs.length === 0 ? (
            <div className="text-gray-500">Waiting for activity...</div>
          ) : (
            logs.map((log, idx) => (
              <div key={idx} className={`mb-1 px-2 py-1 rounded ${getLogColor(log.type)}`}>
                <span className="text-gray-400">[{new Date(log.timestamp).toLocaleTimeString()}]</span>{' '}
                <span className={log.type === 'error' ? 'text-red-400' : log.type === 'success' ? 'text-green-400' : ''}>
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Processing Pipeline Status */}
      {status?.python && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Python Processing Pipeline</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-gray-600 mb-1">Status</div>
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                status.python.status === 'running' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {status.python.status === 'running' ? '✅ Running' : '❌ Stopped'}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Model</div>
              <div className="text-lg font-semibold">{status.python.model || 'N/A'}</div>
            </div>
            <div>
              <div className="text-sm text-gray-600 mb-1">Version</div>
              <div className="text-lg font-semibold">{status.python.version || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ title, service, details, icon }) {
  const bgColor = {
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    red: 'bg-red-50 border-red-200',
    gray: 'bg-gray-50 border-gray-200'
  }[service.color] || 'bg-gray-50 border-gray-200';

  return (
    <div className={`border-2 rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{icon}</span>
          <h3 className="font-semibold text-gray-900">{title}</h3>
        </div>
        <span className={`px-2 py-1 rounded text-xs font-medium ${
          service.color === 'green' ? 'bg-green-200 text-green-800' :
          service.color === 'yellow' ? 'bg-yellow-200 text-yellow-800' :
          service.color === 'red' ? 'bg-red-200 text-red-800' :
          'bg-gray-200 text-gray-800'
        }`}>
          {service.icon} {service.text}
        </span>
      </div>
      {details && (
        <div className="text-xs text-gray-600 space-y-1 mt-2">
          {details.url && <div>URL: <span className="font-mono">{details.url}</span></div>}
          {details.models_count !== undefined && <div>Models: {details.models_count}</div>}
          {details.error && <div className="text-red-600">Error: {details.error}</div>}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }) {
  const bgColor = {
    yellow: 'bg-yellow-50 border-yellow-200',
    green: 'bg-green-50 border-green-200',
    blue: 'bg-blue-50 border-blue-200',
    red: 'bg-red-50 border-red-200',
    gray: 'bg-gray-50 border-gray-200'
  }[color] || 'bg-gray-50 border-gray-200';

  return (
    <div className={`border rounded-lg p-4 ${bgColor}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-gray-600 mb-1">{label}</div>
          <div className="text-2xl font-bold text-gray-900">{value}</div>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}
