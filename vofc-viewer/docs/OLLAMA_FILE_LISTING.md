# Ollama Server File Listing API

## Problem
The Document Processor is showing zeros because it needs to list files from the Ollama server's filesystem, but the Ollama server doesn't have a file listing API endpoint yet.

## Solution
Implement a file listing endpoint on the Ollama server at `https://ollama.frostech.site`.

## Required Endpoint

### GET /api/files/list

This endpoint should return a list of files in the upload directory on the Ollama server.

**Request:**
```http
GET /api/files/list
```

**Response:**
```json
{
  "success": true,
  "files": [
    {
      "filename": "document_1234567890.pdf",
      "path": "/var/ollama/uploads/documents/document_1234567890.pdf",
      "size": 1024000,
      "modified": "2024-10-17T12:00:00Z",
      "type": "document"
    }
  ],
  "total": 1
}
```

## Implementation Options

### Option 1: Add to Existing Ollama Server
If you have access to the Ollama server codebase, add this endpoint:

```python
# Python/Flask example
@app.route('/api/files/list', methods=['GET'])
def list_files():
    upload_dir = '/var/ollama/uploads/documents'
    files = []
    
    if os.path.exists(upload_dir):
        for filename in os.listdir(upload_dir):
            filepath = os.path.join(upload_dir, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    'filename': filename,
                    'path': filepath,
                    'size': stat.st_size,
                    'modified': datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    'type': 'document'
                })
    
    return jsonify({
        'success': True,
        'files': files,
        'total': len(files)
    })
```

### Option 2: Use Node.js on Ollama Server
If the Ollama server is Node.js based:

```javascript
// Express example
app.get('/api/files/list', async (req, res) => {
  const fs = require('fs').promises;
  const path = require('path');
  
  try {
    const uploadDir = '/var/ollama/uploads/documents';
    const files = await fs.readdir(uploadDir);
    const fileList = await Promise.all(
      files.map(async (filename) => {
        const filepath = path.join(uploadDir, filename);
        const stats = await fs.stat(filepath);
        return {
          filename,
          path: filepath,
          size: stats.size,
          modified: stats.mtime.toISOString(),
          type: 'document'
        };
      })
    );
    
    res.json({
      success: true,
      files: fileList,
      total: fileList.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});
```

## Update Document Processor

Once the endpoint is implemented, update `/app/api/documents/status-all/route.js` to call this endpoint and parse the results.

## Status Categories

The files should be categorized into:
- **documents** - New/pending documents
- **processing** - Documents being processed
- **completed** - Successfully processed documents  
- **failed** - Failed processing attempts

This can be done by:
1. Creating subdirectories in `/var/ollama/uploads/`
2. Moving files between directories as they're processed
3. Or tracking status in a database

## Alternative: Use Database

Instead of relying on file listings, you could:
1. Store all file metadata in the `submissions` table
2. Update status as files are processed
3. Query database for file listings (this approach was attempted but files are on remote server)

