import OllamaDashboard from "@/components/OllamaDashboard";

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            VOFC Processing Dashboard
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Real-time monitoring of Ollama AI processing, document parsing, and vulnerability analysis.
            Watch the complete pipeline from PDF extraction to Supabase storage.
          </p>
        </div>

          {/* Main Dashboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Primary Dashboard */}
            <div className="lg:col-span-2">
              <OllamaDashboard 
                height="600px" 
                mode="live"
                showControls={true}
                className="shadow-2xl"
              />
            </div>

          {/* Side Panels */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Stats</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">8.2s</div>
                  <div className="text-sm text-gray-600">Avg Processing Time</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">1,512</div>
                  <div className="text-sm text-gray-600">Tokens/sec</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">85%</div>
                  <div className="text-sm text-gray-600">GPU Utilization</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">2.1GB</div>
                  <div className="text-sm text-gray-600">Memory Usage</div>
                </div>
              </div>
            </div>

            {/* Pipeline Stages */}
            <div className="bg-white rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Processing Pipeline</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                  <span className="text-sm">PDF Text Extraction</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span className="text-sm">Intelligent Chunking</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span className="text-sm">Ollama AI Analysis</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <span className="text-sm">Data Validation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <span className="text-sm">Supabase Storage</span>
                </div>
              </div>
            </div>
          </div>

          {/* Live Monitoring Panel */}
          <div className="space-y-6">
            {/* Live Mode Dashboard */}
            <OllamaDashboard 
              height="300px" 
              mode="live"
              showControls={false}
              className="shadow-lg"
            />

            {/* Ollama Only Dashboard */}
            <OllamaDashboard 
              height="300px" 
              mode="ollama-only"
              showControls={false}
              className="shadow-lg"
            />
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">How to Use</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-800">
            <div>
              <strong>Live Mode:</strong> Monitors actual document processing jobs in real-time with detailed status updates.
            </div>
            <div>
              <strong>Ollama Only:</strong> Direct monitoring of Ollama model status and performance testing.
            </div>
          </div>
        </div>

        {/* Embedding Instructions */}
        <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">Embedding Options</h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">React Component:</h4>
              <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
                {`import OllamaDashboard from "@/components/OllamaDashboard";

<OllamaDashboard height="400px" mode="live" />`}
              </code>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">Standalone HTML:</h4>
              <code className="block bg-gray-800 text-green-400 p-3 rounded text-sm overflow-x-auto">
                {`<div id="ollama-dashboard" style="background:#0d1117;color:#00ff95;font-family:monospace;padding:10px;border-radius:8px;height:400px;overflow-y:auto;"></div>
<script>
const logDiv = document.getElementById("ollama-dashboard");
const sse = new EventSource("/api/dashboard/stream?mode=live");
sse.onmessage = (e) => {
  logDiv.textContent += e.data + "\\n";
  logDiv.scrollTop = logDiv.scrollHeight;
};
</script>`}
              </code>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
