"use client";

import { useState, useEffect } from "react";

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

  // Fetch documents from consolidated API
  const fetchDocuments = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching documents from API...');
      
      // Single API call instead of 4 separate calls
      const response = await fetch('/api/documents/status-all');
      console.log('📡 API Response status:', response.status);
      
      const data = await response.json();
      console.log('📊 API Response data:', data);

      if (data.success) {
        console.log('✅ Documents fetched successfully:', {
          documents: data.documents?.length || 0,
          processing: data.processing?.length || 0,
          completed: data.completed?.length || 0,
          failed: data.failed?.length || 0
        });
        
        setDocuments(data.documents || []);
        setProcessing(data.processing || []);
        setCompleted(data.completed || []);
        setFailed(data.failed || []);
        setLastRefresh(Date.now());
      } else {
        console.error('❌ Error fetching documents:', data.error);
      }
      
    } catch (error) {
      console.error('❌ Error fetching documents:', error);
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
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Document Processor</h1>
            <p className="text-gray-600">
              Process documents from the docs folder using the universal VOFC parser.
              Documents are automatically moved to completed/failed folders after processing.
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
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Process All ({documents.length})
        </button>
        
        {selectedFiles.length > 0 && (
          <button
            onClick={processSelected}
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            Process Selected ({selectedFiles.length})
          </button>
        )}
        
        <button
          onClick={fetchDocuments}
          disabled={loading}
          className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900">Pending</h3>
          <p className="text-2xl font-bold text-blue-600">{documents.length}</p>
        </div>
        
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h3 className="font-semibold text-yellow-900">Processing</h3>
          <p className="text-2xl font-bold text-yellow-600">{processing.length}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-semibold text-green-900">Completed</h3>
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
        </div>
        
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-semibold text-red-900">Failed</h3>
          <p className="text-2xl font-bold text-red-600">{failed.length}</p>
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
