"use client";

import { useState, useEffect } from "react";
import '../../styles/cisa.css';

export default function DocumentProcessor() {
  const [documents, setDocuments] = useState([]);
  const [processing, setProcessing] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [failed, setFailed] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previewData, setPreviewData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [processingWithAI, setProcessingWithAI] = useState(false);
  const [learningStatus, setLearningStatus] = useState(null);

  // Fetch documents from consolidated API
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      
      // Single API call instead of 4 separate calls
      const response = await fetch('/api/documents/status-all');
      const data = await response.json();

      if (data.success) {
        setDocuments(data.documents || []);
        setProcessing(data.processing || []);
        setCompleted(data.completed || []);
        setFailed(data.failed || []);
        setLastRefresh(Date.now());
      } else {
        console.error('Error fetching documents:', data.error);
      }
      
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    fetchDocuments();
  }, []);

  useEffect(() => {
    if (mounted) {
      setLastRefresh(Date.now());
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted && autoRefresh) {
      const interval = setInterval(() => {
        // Only refresh if there are files being processed
        if (processing.length > 0) {
          fetchDocuments();
        }
      }, 30000); // 30 seconds
      return () => clearInterval(interval);
    }
  }, [mounted, autoRefresh, processing.length]);

  // Preview document
  const previewDocument = async (filename) => {
    try {
      const response = await fetch('/api/documents/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });

      const result = await response.json();
      
      if (result.success) {
        setPreviewData(result.data);
        setShowPreview(true);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error previewing document:', error);
      alert('Error previewing document');
    }
  };

  // Process single document
  const processDocument = async (filename) => {
    try {
      const response = await fetch('/api/documents/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename })
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchDocuments();
        // Show processing results
        if (result.data) {
          alert(`Document processed successfully!\n\nTitle: ${result.data.title}\nVulnerabilities found: ${result.data.vulnerabilities.length}\nOFCs found: ${result.data.ofcs.length}\nSectors: ${result.data.sectors.length}`);
        }
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing document:', error);
      alert('Error processing document');
    }
  };

  // Process selected documents
  const processSelected = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select documents to process');
      return;
    }

    try {
      const response = await fetch('/api/documents/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filenames: selectedFiles })
      });

      const result = await response.json();
      
      if (result.success) {
        setSelectedFiles([]);
        await fetchDocuments();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing documents:', error);
      alert('Error processing documents');
    }
  };

  // Process all documents
  const processAll = async () => {
    if (!confirm('Process all documents in the docs folder?')) return;

    try {
      const response = await fetch('/api/documents/process-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchDocuments();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error processing all documents:', error);
      alert('Error processing all documents');
    }
  };

  // Retry failed document
  const retryDocument = async (filename) => {
    try {
      const response = await fetch(`/api/documents/retry/${filename}`, {
        method: 'POST'
      });

      const result = await response.json();
      
      if (result.success) {
        await fetchDocuments();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error retrying document:', error);
      alert('Error retrying document');
    }
  };

  // Toggle file selection
  const toggleFileSelection = (filename) => {
    setSelectedFiles(prev => 
      prev.includes(filename) 
        ? prev.filter(f => f !== filename)
        : [...prev, filename]
    );
  };

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return date.toLocaleString();
  };

  if (!mounted) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading document processor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6" style={{ fontFamily: 'var(--font-family)' }}>
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--cisa-blue)' }}>Document Processor</h1>
            <p style={{ color: 'var(--cisa-gray)', fontSize: 'var(--font-size-md)' }}>
              Process documents using AI-powered VOFC analysis with Ollama integration.
              Documents are automatically analyzed for vulnerabilities and options for consideration.
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="mr-2"
              />
              <span className="text-sm">Auto-refresh</span>
            </label>
            <button
              onClick={fetchDocuments}
              disabled={loading}
              className="btn btn-primary"
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
            <span className="text-sm text-gray-500">
              Last: {new Date(lastRefresh).toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-6 flex flex-wrap gap-4">
        <button
          onClick={processAll}
          disabled={loading || documents.length === 0}
          className="btn btn-primary"
          style={{
            backgroundColor: 'var(--cisa-blue)',
            color: 'var(--cisa-white)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--border-radius)',
            border: 'none',
            cursor: loading || documents.length === 0 ? 'not-allowed' : 'pointer',
            opacity: loading || documents.length === 0 ? 0.5 : 1,
            fontSize: 'var(--font-size-sm)',
            fontWeight: '600'
          }}
        >
          🤖 Process All ({documents.length})
        </button>
        
        {selectedFiles.length > 0 && (
          <button
            onClick={processSelected}
            disabled={loading}
            className="btn btn-success"
            style={{
              backgroundColor: 'var(--cisa-success)',
              color: 'var(--cisa-white)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--border-radius)',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              fontSize: 'var(--font-size-sm)',
              fontWeight: '600'
            }}
          >
            ✅ Process Selected ({selectedFiles.length})
          </button>
        )}
        
        <button
          onClick={fetchDocuments}
          disabled={loading}
          className="btn btn-secondary"
          style={{
            backgroundColor: 'var(--cisa-gray)',
            color: 'var(--cisa-white)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--border-radius)',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.5 : 1,
            fontSize: 'var(--font-size-sm)',
            fontWeight: '600'
          }}
        >
          {loading ? '🔄 Refreshing...' : '🔄 Refresh'}
        </button>
      </div>

      {/* AI Processing Status */}
      {processingWithAI && (
        <div className="mb-6 p-4 rounded-lg" style={{ 
          backgroundColor: 'var(--cisa-blue-lightest)', 
          border: '1px solid var(--cisa-blue-lighter)',
          color: 'var(--cisa-blue)'
        }}>
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-3"></div>
            <div>
              <strong>🤖 AI Processing Active</strong>
              <p className="text-sm mt-1">Using Ollama AI to analyze documents for vulnerabilities and OFCs...</p>
            </div>
          </div>
        </div>
      )}

      {/* Learning System Status */}
      {learningStatus && (
        <div className="mb-6 p-4 rounded-lg" style={{ 
          backgroundColor: 'var(--cisa-green-lightest)', 
          border: '1px solid var(--cisa-green-lighter)',
          color: 'var(--cisa-green)'
        }}>
          <div className="flex items-center">
            <div className="mr-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <strong>🧠 Learning System Active</strong>
              <p className="text-sm mt-1">
                Continuous learning enabled - AI model improves with each document processed
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Status Overview - Side by Side Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 text-sm uppercase tracking-wide">Pending</h3>
              <p className="text-3xl font-bold text-blue-600 mt-2">{documents.length}</p>
            </div>
            <div className="text-blue-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-yellow-900 text-sm uppercase tracking-wide">Processing</h3>
              <p className="text-3xl font-bold text-yellow-600 mt-2">{processing.length}</p>
            </div>
            <div className="text-yellow-400">
              <svg className="w-8 h-8 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-green-900 text-sm uppercase tracking-wide">Completed</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{completed.length}</p>
            </div>
            <div className="text-green-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-red-900 text-sm uppercase tracking-wide">Failed</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{failed.length}</p>
            </div>
            <div className="text-red-400">
              <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Documents */}
      {documents.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Pending Documents</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFiles(documents.map(d => d.filename));
                          } else {
                            setSelectedFiles([]);
                          }
                        }}
                        className="rounded"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Modified
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {documents.map((doc) => (
                    <tr key={doc.filename}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(doc.filename)}
                          onChange={() => toggleFileSelection(doc.filename)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.modified)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => previewDocument(doc.filename)}
                            className="text-green-600 hover:text-green-900"
                          >
                            Preview
                          </button>
                          <button
                            onClick={() => processDocument(doc.filename)}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            Process
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Processing Documents */}
      {processing.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Currently Processing</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Started
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processing.map((doc) => (
                    <tr key={doc.filename}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          {doc.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.modified)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Completed Documents */}
      {completed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Completed Documents</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Completed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {completed.map((doc) => (
                    <tr key={doc.filename}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.modified)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Completed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Failed Documents */}
      {failed.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Failed Documents</h2>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Filename
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Size
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Failed
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {failed.map((doc) => (
                    <tr key={doc.filename}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {doc.filename}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatFileSize(doc.size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(doc.modified)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => retryDocument(doc.filename)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Retry
                        </button>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Failed
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {documents.length === 0 && processing.length === 0 && completed.length === 0 && failed.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 text-6xl mb-4">📄</div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Documents Found</h3>
          <p className="text-gray-500">
            Add documents to the <code className="bg-gray-100 px-2 py-1 rounded">data/docs</code> folder to start processing.
          </p>
        </div>
      )}

      {/* Document Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">Document Preview</h3>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg">{previewData.title}</h4>
                <p className="text-sm text-gray-600">
                  {previewData.word_count} words • {previewData.line_count} lines • 
                  {formatFileSize(previewData.size)} • 
                  Est. {previewData.estimated_processing_time}
                </p>
              </div>
              
              <div>
                <h5 className="font-semibold mb-2">Content Preview:</h5>
                <div className="bg-gray-50 p-3 rounded text-sm max-h-40 overflow-y-auto">
                  {previewData.preview}
                </div>
              </div>
              
              {previewData.sections.vulnerabilities.length > 0 && (
                <div>
                  <h5 className="font-semibold mb-2">Potential Vulnerabilities:</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {previewData.sections.vulnerabilities.map((vuln, idx) => (
                      <li key={`vuln-${idx}-${vuln.slice(0, 20)}`} className="text-red-700">{vuln}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {previewData.sections.ofcs.length > 0 && (
                <div>
                  <h5 className="font-semibold mb-2">Potential Options for Consideration:</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {previewData.sections.ofcs.map((ofc, idx) => (
                      <li key={`ofc-${idx}-${ofc.slice(0, 20)}`} className="text-blue-700">{ofc}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {previewData.sections.sectors.length > 0 && (
                <div>
                  <h5 className="font-semibold mb-2">Potential Sectors:</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {previewData.sections.sectors.map((sector, idx) => (
                      <li key={`sector-${idx}-${sector.slice(0, 20)}`} className="text-green-700">{sector}</li>
                    ))}
                  </ul>
                </div>
              )}
              
              {previewData.sections.sources.length > 0 && (
                <div>
                  <h5 className="font-semibold mb-2">Potential Sources:</h5>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {previewData.sections.sources.map((source, idx) => (
                      <li key={`source-${idx}-${source.slice(0, 20)}`} className="text-gray-700">{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            
            <div className="flex justify-end space-x-2 mt-6">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setShowPreview(false);
                  processDocument(previewData.filename);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Process Document
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
