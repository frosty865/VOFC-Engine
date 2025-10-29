from flask import Flask, jsonify, request
import os
import json
from datetime import datetime
from pathlib import Path

app = Flask(__name__)

# Configuration - can be overridden via environment variables
UPLOAD_DIR = os.getenv(
    'OLLAMA_UPLOAD_DIR',
    os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Ollama', 'files', 'incoming')
)
MODEL_NAME = os.getenv('OLLAMA_MODEL', 'vofc-engine:latest')
SERVER_HOST = os.getenv('SERVER_HOST', '127.0.0.1')
SERVER_PORT = int(os.getenv('SERVER_PORT', '5000'))
DEBUG_MODE = os.getenv('DEBUG', 'True').lower() == 'true'

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

# Helper functions
def get_file_info(filepath):
    """Get file metadata for API responses."""
    stat = os.stat(filepath)
    return {
        "filename": os.path.basename(filepath),
        "path": filepath,
        "size": stat.st_size,
        "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
        "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
    }

def list_upload_files():
    """List all files in upload directory."""
    if not os.path.exists(UPLOAD_DIR):
        return []
    
    files = []
    for filename in os.listdir(UPLOAD_DIR):
        filepath = os.path.join(UPLOAD_DIR, filename)
        if os.path.isfile(filepath):
            files.append(get_file_info(filepath))
    
    return files

@app.route('/api/version', methods=['GET'])
def get_version():
    """Get server version information"""
    return jsonify({
        "version": "1.0.0",
        "name": "VOFC Ollama Server",
        "model": MODEL_NAME,
        "upload_dir": UPLOAD_DIR
    })

@app.route('/api/files/list', methods=['GET'])
def list_files():
    """List all files in the upload directory."""
    try:
        files = list_upload_files()
        return jsonify({"files": files})
    except Exception as e:
        return jsonify({"files": [], "error": str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    """Ollama chat endpoint for document processing"""
    try:
        data = request.get_json()
        model = data.get('model', MODEL_NAME)
        messages = data.get('messages', [])
        
        # Simple response for now - you can integrate with actual Ollama here
        response = {
            "model": model,
            "message": {
                "role": "assistant",
                "content": "Document processing endpoint - integrate with actual Ollama model"
            },
            "done": True
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/generate', methods=['POST'])
def generate():
    """Ollama generate endpoint"""
    try:
        data = request.get_json()
        model = data.get('model', MODEL_NAME)
        prompt = data.get('prompt', '')
        
        # Simple response for now
        response = {
            "model": model,
            "response": f"Generated response for prompt: {prompt[:50]}...",
            "done": True
        }
        
        return jsonify(response)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/tags', methods=['GET'])
def get_tags():
    """Get available models/tags."""
    return jsonify({
        "models": [
            {
                "name": MODEL_NAME,
                "size": 0,
                "modified_at": datetime.now().isoformat()
            }
        ]
    })

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({"error": "Not found", "message": "The requested endpoint does not exist"}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({"error": "Internal server error", "message": str(error)}), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "upload_dir": UPLOAD_DIR,
        "upload_dir_exists": os.path.exists(UPLOAD_DIR)
    })

if __name__ == '__main__':
    print("=" * 50)
    print("Starting VOFC Ollama Server")
    print("=" * 50)
    print(f"Upload directory: {UPLOAD_DIR}")
    print(f"Model: {MODEL_NAME}")
    print(f"Server URL: http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"Debug mode: {DEBUG_MODE}")
    print("=" * 50)
    
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE)
