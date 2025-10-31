from flask import Flask, jsonify, request, send_file
import os
import json
import shutil
from datetime import datetime
from pathlib import Path

app = Flask(__name__)

# Configuration - can be overridden via environment variables
BASE_DIR = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Ollama', 'data')
UPLOAD_DIR = os.getenv(
    'OLLAMA_UPLOAD_DIR',
    os.path.join(BASE_DIR, 'incoming')
)
PROCESSED_DIR = os.getenv(
    'OLLAMA_PROCESSED_DIR',
    os.path.join(BASE_DIR, 'processed')
)
LIBRARY_DIR = os.getenv(
    'OLLAMA_LIBRARY_DIR',
    os.path.join(BASE_DIR, 'library')
)
ERRORS_DIR = os.getenv(
    'OLLAMA_ERRORS_DIR',
    os.path.join(BASE_DIR, 'errors')
)
MODEL_NAME = os.getenv('OLLAMA_MODEL', 'vofc-engine:latest')
SERVER_HOST = os.getenv('SERVER_HOST', '127.0.0.1')
SERVER_PORT = int(os.getenv('SERVER_PORT', '5000'))
DEBUG_MODE = os.getenv('DEBUG', 'True').lower() == 'true'

# Ensure all directories exist
for directory in [UPLOAD_DIR, PROCESSED_DIR, LIBRARY_DIR, ERRORS_DIR]:
    os.makedirs(directory, exist_ok=True)

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

@app.route('/api/files/list-all', methods=['GET'])
def list_all_files():
    """List files from all folders: incoming, processed, library, errors."""
    try:
        all_files = []
        
        # Get files from each folder
        folders = {
            'incoming': UPLOAD_DIR,
            'processed': PROCESSED_DIR,
            'library': LIBRARY_DIR,
            'errors': ERRORS_DIR
        }
        
        for folder_name, folder_path in folders.items():
            if os.path.exists(folder_path):
                for filename in os.listdir(folder_path):
                    filepath = os.path.join(folder_path, filename)
                    if os.path.isfile(filepath):
                        file_info = get_file_info(filepath)
                        file_info['folder'] = folder_name
                        all_files.append(file_info)
        
        return jsonify({
            "files": all_files,
            "folders": {name: path for name, path in folders.items()}
        })
    except Exception as e:
        return jsonify({"files": [], "error": str(e)}), 500

@app.route('/api/files/download/<filename>', methods=['GET'])
def download_file(filename):
    """Download a file from the upload directory."""
    try:
        # Security: prevent directory traversal
        filename = os.path.basename(filename)
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        if not os.path.isfile(filepath):
            return jsonify({"error": "Not a file"}), 400
        
        # Ensure file is within upload directory
        if not os.path.abspath(filepath).startswith(os.path.abspath(UPLOAD_DIR)):
            return jsonify({"error": "Invalid file path"}), 403
        
        return send_file(filepath, as_attachment=True, download_name=filename)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files/get/<filename>', methods=['GET'])
def get_file(filename):
    """Get file contents as response (for inline viewing or processing)."""
    try:
        # Security: prevent directory traversal
        filename = os.path.basename(filename)
        filepath = os.path.join(UPLOAD_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        
        if not os.path.isfile(filepath):
            return jsonify({"error": "Not a file"}), 400
        
        # Ensure file is within upload directory
        if not os.path.abspath(filepath).startswith(os.path.abspath(UPLOAD_DIR)):
            return jsonify({"error": "Invalid file path"}), 403
        
        return send_file(filepath)
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

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

@app.route('/api/files/move', methods=['POST'])
def move_file():
    """Move a file from one folder to another."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        source_folder = data.get('source', 'incoming')  # incoming, processed, library, errors
        target_folder = data.get('target')  # processed, library, errors
        
        if not filename or not target_folder:
            return jsonify({"error": "filename and target are required"}), 400
        
        # Map folder names to directories
        folder_map = {
            'incoming': UPLOAD_DIR,
            'processed': PROCESSED_DIR,
            'library': LIBRARY_DIR,
            'errors': ERRORS_DIR
        }
        
        if source_folder not in folder_map or target_folder not in folder_map:
            return jsonify({"error": "Invalid folder name"}), 400
        
        source_path = os.path.join(folder_map[source_folder], filename)
        target_path = os.path.join(folder_map[target_folder], filename)
        
        if not os.path.exists(source_path):
            return jsonify({"error": "Source file not found"}), 404
        
        # Move file (will overwrite if exists)
        shutil.move(source_path, target_path)
        
        return jsonify({
            "success": True,
            "filename": filename,
            "source": source_folder,
            "target": target_folder,
            "message": f"File moved from {source_folder} to {target_folder}"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files/write', methods=['POST'])
def write_file():
    """Write a file to a specific folder."""
    try:
        data = request.get_json()
        filename = data.get('filename')
        content = data.get('content')
        folder = data.get('folder', 'processed')  # processed, library, errors
        
        if not filename or content is None:
            return jsonify({"error": "filename and content are required"}), 400
        
        folder_map = {
            'processed': PROCESSED_DIR,
            'library': LIBRARY_DIR,
            'errors': ERRORS_DIR,
            'incoming': UPLOAD_DIR
        }
        
        if folder not in folder_map:
            return jsonify({"error": "Invalid folder name"}), 400
        
        target_path = os.path.join(folder_map[folder], filename)
        
        # Write content to file
        if isinstance(content, str):
            with open(target_path, 'w', encoding='utf-8') as f:
                f.write(content)
        elif isinstance(content, dict):
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(content, f, indent=2)
        else:
            return jsonify({"error": "Content must be string or JSON object"}), 400
        
        return jsonify({
            "success": True,
            "filename": filename,
            "folder": folder,
            "path": target_path,
            "message": f"File written to {folder}"
        })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files/process', methods=['POST'])
def process_files():
    """Process all files in the incoming folder."""
    try:
        if not os.path.exists(UPLOAD_DIR):
            return jsonify({
                "success": False,
                "error": "Incoming directory does not exist",
                "processed": 0
            }), 404
        
        files = [f for f in os.listdir(UPLOAD_DIR) 
                if os.path.isfile(os.path.join(UPLOAD_DIR, f))]
        
        if not files:
            return jsonify({
                "success": True,
                "message": "No files to process",
                "processed": 0,
                "errors": 0
            })
        
        processed = 0
        errors = 0
        results = []
        
        for filename in files:
            filepath = os.path.join(UPLOAD_DIR, filename)
            try:
                # For now, just move files from incoming to processed
                # In the future, integrate with actual Ollama processing
                target_path = os.path.join(PROCESSED_DIR, filename)
                shutil.move(filepath, target_path)
                
                results.append({
                    "file": filename,
                    "success": True,
                    "message": f"Moved to processed folder"
                })
                processed += 1
                
            except Exception as e:
                # Move to errors folder on failure
                try:
                    error_path = os.path.join(ERRORS_DIR, filename)
                    shutil.move(filepath, error_path)
                except:
                    pass
                
                results.append({
                    "file": filename,
                    "success": False,
                    "error": str(e)
                })
                errors += 1
        
        return jsonify({
            "success": True,
            "processed": processed,
            "errors": errors,
            "total": len(files),
            "results": results
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e),
            "processed": 0,
            "errors": 0
        }), 500

@app.route('/api/documents/process-batch', methods=['POST'])
def process_batch():
    """Process a batch of files by filename - Ollama server endpoint."""
    try:
        data = request.get_json()
        filenames = data.get('filenames', [])
        
        if not filenames or not isinstance(filenames, list):
            return jsonify({
                "success": False,
                "error": "filenames array is required"
            }), 400
        
        results = []
        processed = 0
        errors = 0
        
        for filename in filenames:
            filepath = os.path.join(UPLOAD_DIR, filename)
            
            if not os.path.exists(filepath):
                results.append({
                    "filename": filename,
                    "status": "error",
                    "message": "File not found in incoming folder"
                })
                errors += 1
                continue
            
            try:
                # Move to processed folder (in future: actually process with Ollama)
                target_path = os.path.join(PROCESSED_DIR, filename)
                shutil.move(filepath, target_path)
                
                results.append({
                    "filename": filename,
                    "status": "success",
                    "message": "Processed successfully"
                })
                processed += 1
                
            except Exception as e:
                # Move to errors folder
                try:
                    error_path = os.path.join(ERRORS_DIR, filename)
                    shutil.move(filepath, error_path)
                except:
                    pass
                
                results.append({
                    "filename": filename,
                    "status": "error",
                    "message": str(e)
                })
                errors += 1
        
        return jsonify({
            "success": True,
            "message": f"Batch processing completed: {processed} successful, {errors} errors",
            "results": results,
            "summary": {
                "total": len(filenames),
                "successful": processed,
                "errors": errors
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "directories": {
            "incoming": {"path": UPLOAD_DIR, "exists": os.path.exists(UPLOAD_DIR)},
            "processed": {"path": PROCESSED_DIR, "exists": os.path.exists(PROCESSED_DIR)},
            "library": {"path": LIBRARY_DIR, "exists": os.path.exists(LIBRARY_DIR)},
            "errors": {"path": ERRORS_DIR, "exists": os.path.exists(ERRORS_DIR)}
        }
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
