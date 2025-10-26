# VOFC Processing Dashboard System

## 🎯 Overview

A comprehensive real-time monitoring system for VOFC (Vulnerability Options for Consideration) processing, featuring Ollama AI integration, document parsing stages, and embeddable components.

## 🚀 Features

### ✅ Real-time Monitoring
- **Ollama Model Activity**: Status, logs, model name, tokens/sec
- **VOFC Processing Stages**: Parse → Embed → Classify → Link → Complete
- **Scrollable Console Output**: Auto-scrolling terminal interface
- **Auto-saving Logs**: Server-side log file persistence
- **Multiple Modes**: Demo, Live, Ollama-only monitoring

### ✅ Embeddable Components
- **React Component**: Drop-in dashboard for Next.js apps
- **Standalone HTML**: Works in any HTML page
- **Iframe Embedding**: Cross-origin compatible
- **JavaScript API**: Programmatic control

## 📁 File Structure

```
vofc-viewer/
├── app/
│   ├── api/dashboard/stream/route.js    # SSE API endpoint
│   └── dashboard/page.jsx               # Main dashboard page
├── components/
│   └── OllamaDashboard.jsx             # React component
└── public/
    ├── dashboard-embeddable.html      # Standalone HTML version
    └── vofc-dashboard-embed.js        # Embed script
```

## 🔧 API Endpoints

### `/api/dashboard/stream`
**Server-Sent Events endpoint for real-time monitoring**

**Parameters:**
- `mode` (optional): `live` | `ollama-only`

**Response:** Event stream with log entries

**Example:**
```javascript
const eventSource = new EventSource('/api/dashboard/stream?mode=live');
eventSource.onmessage = (event) => {
    console.log(event.data);
};
```

## 🎨 Usage Examples

### 1. React Component (Next.js)

```jsx
import OllamaDashboard from "@/components/OllamaDashboard";

export default function MyPage() {
  return (
    <div>
      <OllamaDashboard 
        height="500px" 
        mode="live"
        showControls={true}
      />
    </div>
  );
}
```

### 2. Standalone HTML

```html
<div id="ollama-dashboard" style="background:#0d1117;color:#00ff95;font-family:monospace;padding:10px;border-radius:8px;height:400px;overflow-y:auto;"></div>

<script>
const logDiv = document.getElementById("ollama-dashboard");
const sse = new EventSource("/api/dashboard/stream?mode=live");
sse.onmessage = (e) => {
  logDiv.textContent += e.data + "\n";
  logDiv.scrollTop = logDiv.scrollHeight;
};
sse.onerror = () => sse.close();
</script>
```

### 3. Iframe Embedding

```html
<!-- Auto-initialize -->
<div id="vofc-dashboard"></div>
<script src="/vofc-dashboard-embed.js"></script>

<!-- Manual initialization -->
<script>
VOFCDashboard.init('my-dashboard', { 
  height: '500px', 
  mode: 'live' 
});
</script>
```

## 🎛️ Monitoring Modes

### Live Mode (`mode=live`)
- Monitors actual document processing jobs
- Real-time status updates with detailed progress tracking
- Connects to `/api/documents/status` and `/api/documents/list`
- Shows processing queue status and completion metrics
- Enhanced monitoring with 60-second sessions

### Ollama Only (`mode=ollama-only`)
- Direct Ollama model monitoring
- Model status and performance testing
- Command-line integration
- Tests model availability and response times

## 📊 Log Types & Colors

| Type | Color | Description |
|------|-------|-------------|
| `[SYSTEM]` | Cyan | System initialization and status |
| `[STAGE]` | Blue | Processing stage markers |
| `[SUCCESS]` | Green | Successful operations |
| `[WARNING]` | Yellow | Warnings and notices |
| `[ERROR]` | Red | Errors and failures |
| `[METRICS]` | Purple | Performance metrics |
| `[INFO]` | Gray | General information |

## 🔧 Configuration

### React Component Props

```jsx
<OllamaDashboard 
  height="400px"           // Console height
  mode="demo"             // Monitoring mode
  showControls={true}     // Show mode selector
  className=""            // Additional CSS classes
/>
```

### Embed Script Options

```javascript
VOFCDashboard.init('element-id', {
  height: '400px',        // Dashboard height
  width: '100%',         // Dashboard width
  mode: 'demo',          // Initial mode
  theme: 'dark'          // Theme (dark/light)
});
```

## 🚀 Deployment

The dashboard system is automatically deployed with the main VOFC application:

**Production URL:** https://vofc-viewer-ozi54hsbj-matthew-frosts-projects-2f4ab76f.vercel.app

**Dashboard Page:** `/dashboard`
**API Endpoint:** `/api/dashboard/stream`
**Embeddable:** `/dashboard-embeddable.html`

## 🔍 Log Persistence

All dashboard activity is automatically logged to:
- **Server-side file**: `ollama_dashboard.log`
- **Format**: `[timestamp] [type] message`
- **Location**: Application root directory

## 🌐 CORS Support

The dashboard API includes CORS headers for cross-origin embedding:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET`
- `Access-Control-Allow-Headers: Cache-Control`

## 🎯 Integration Examples

### External Website Integration

```html
<!-- For any external website -->
<iframe 
  src="https://your-vofc-app.vercel.app/dashboard-embeddable.html"
  width="100%" 
  height="400px"
  frameborder="0">
</iframe>
```

### WordPress Plugin

```php
function vofc_dashboard_shortcode($atts) {
    $atts = shortcode_atts(array(
        'height' => '400px',
        'mode' => 'demo'
    ), $atts);
    
    return '<div id="vofc-dashboard"></div>
            <script src="https://your-vofc-app.vercel.app/vofc-dashboard-embed.js"></script>
            <script>VOFCDashboard.init("vofc-dashboard", {height: "' . $atts['height'] . '", mode: "' . $atts['mode'] . '"});</script>';
}
add_shortcode('vofc_dashboard', 'vofc_dashboard_shortcode');
```

## 🔧 Troubleshooting

### Common Issues

1. **Connection Failed**: Check if the API endpoint is accessible
2. **No Logs**: Verify the monitoring mode is correct
3. **CORS Errors**: Ensure proper CORS headers are set
4. **Ollama Not Found**: Check if Ollama is installed and running

### Debug Mode

Enable debug logging by adding `?debug=true` to the API URL:
```
/api/dashboard/stream?mode=demo&debug=true
```

## 📈 Performance Metrics

The dashboard tracks and displays:
- **Processing Time**: Total time for document processing
- **GPU Utilization**: Ollama GPU usage percentage
- **Tokens/sec**: Processing speed
- **Memory Usage**: System memory consumption
- **Batch Processing**: Concurrent batch statistics

## 🎨 Customization

### Styling
- Modify CSS variables in the embeddable HTML
- Override component styles in React
- Custom themes via CSS classes

### Functionality
- Extend the API endpoint for custom monitoring
- Add new log types and colors
- Integrate with additional services

---

**Ready to monitor your VOFC processing pipeline in real-time!** 🚀
