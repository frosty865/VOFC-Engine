"use client";
import { useEffect, useState, useRef } from "react";

export default function OllamaDashboard({ 
  height = "400px", 
  mode = "live",
  showControls = true,
  className = ""
}) {
  const [logs, setLogs] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const logRef = useRef(null);
  const eventSourceRef = useRef(null);

  const connectToStream = (streamMode = mode) => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsLoading(true);
    setIsConnected(false);
    setLogs([]);

    const eventSource = new EventSource(`/api/dashboard/stream?mode=${streamMode}`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
      setIsLoading(false);
    };

    eventSource.onmessage = (e) => {
      const logEntry = e.data;
      setLogs((prev) => [...prev, logEntry]);
      
      // Auto-scroll to bottom
      if (logRef.current) {
        setTimeout(() => {
          logRef.current.scrollTop = logRef.current.scrollHeight;
        }, 50);
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setIsConnected(false);
      setIsLoading(false);
      eventSource.close();
    };

    return eventSource;
  };

  useEffect(() => {
    const eventSource = connectToStream();
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [mode]);

  const handleModeChange = (newMode) => {
    connectToStream(newMode);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const getLogTypeColor = (logEntry) => {
    if (logEntry.includes('[ERROR]')) return 'text-red-400';
    if (logEntry.includes('[WARNING]')) return 'text-yellow-400';
    if (logEntry.includes('[SUCCESS]')) return 'text-green-400';
    if (logEntry.includes('[STAGE]')) return 'text-blue-400';
    if (logEntry.includes('[METRICS]')) return 'text-purple-400';
    if (logEntry.includes('[SYSTEM]')) return 'text-cyan-400';
    return 'text-gray-300';
  };

  return (
    <div className={`p-4 bg-gray-900 rounded-2xl text-gray-200 shadow-xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-blue-400">VOFC Processing Dashboard</h2>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
            <span className="text-xs text-gray-400">
              {isLoading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        {showControls && (
          <div className="flex items-center space-x-2">
            <select 
              value={mode} 
              onChange={(e) => handleModeChange(e.target.value)}
              className="px-2 py-1 bg-gray-800 border border-gray-600 rounded text-sm"
            >
              <option value="live">Live Mode</option>
              <option value="ollama-only">Ollama Only</option>
            </select>
            <button 
              onClick={clearLogs}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Console Output */}
      <div
        ref={logRef}
        style={{ height }}
        className="bg-black/50 font-mono p-3 overflow-y-auto text-sm rounded-md border border-gray-700 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
      >
        {logs.length === 0 && !isLoading && (
          <div className="text-gray-500 text-center py-8">
            No logs yet. Select a mode to start monitoring.
          </div>
        )}
        
        {isLoading && (
          <div className="text-blue-400 text-center py-8">
            🔄 Connecting to dashboard stream...
          </div>
        )}

        {logs.map((logEntry, i) => (
          <div 
            key={i} 
            className={`${getLogTypeColor(logEntry)} mb-1 leading-relaxed`}
          >
            {logEntry}
          </div>
        ))}
      </div>

      {/* Footer Stats */}
      <div className="mt-3 flex justify-between items-center text-xs text-gray-500">
        <span>Logs: {logs.length}</span>
        <span>Mode: {mode}</span>
        <span>Last updated: {logs.length > 0 ? new Date().toLocaleTimeString() : 'Never'}</span>
      </div>
    </div>
  );
}
