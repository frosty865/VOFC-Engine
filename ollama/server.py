from flask import Flask, jsonify, request
import os
import json
from datetime import datetime

app = Flask(__name__)

# Configuration
UPLOAD_DIR = r'C:\Users\frost\AppData\Local\Ollama\files\incoming'
MODEL_NAME = 'vofc-engine:latest'

# Ensure upload directory exists
os.makedirs(UPLOAD_DIR, exist_ok=True)

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
    """List all files in the upload directory"""
    try:
        if not os.path.exists(UPLOAD_DIR):
            return jsonify({"files": [], "error": "Upload directory does not exist"})
        
        files = []
        for filename in os.listdir(UPLOAD_DIR):
            filepath = os.path.join(UPLOAD_DIR, filename)
            if os.path.isfile(filepath):
                stat = os.stat(filepath)
                files.append({
                    "filename": filename,
                    "path": filepath,
                    "size": stat.st_size,
                    "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
                    "created": datetime.fromtimestamp(stat.st_ctime).isoformat()
                })
        
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
    """Get available models/tags"""
    return jsonify({
        "models": [
            {
                "name": MODEL_NAME,
                "size": 0,
                "modified_at": datetime.now().isoformat()
            }
        ]
    })

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
    print("Starting VOFC Ollama Server")
    print(f"Upload directory: {UPLOAD_DIR}")
    print(f"Model: {MODEL_NAME}")
    print("Server will run on http://localhost:5000")
    
    app.run(host='127.0.0.1', port=5000, debug=True)
