from flask import Flask, jsonify, request, send_file
import os
import json
import shutil
import subprocess
import sys
import uuid
import time
import requests
from datetime import datetime, timezone
from pathlib import Path
import re
import logging

# ================================================================
#  Environment Loader – Robust for Windows services
# ================================================================
from dotenv import load_dotenv

# Absolute path to your .env file
DOTENV_PATH = r"C:\Users\frost\OneDrive\Desktop\Projects\VOFC Engine\vofc-viewer\vofc-viewer\ollama\.env"

# Force UTF-8 and override existing environment variables
load_dotenv(DOTENV_PATH, override=True, encoding="utf-8")
print(f"Loaded environment variables from: {DOTENV_PATH}")
print("SUPABASE_URL:", os.getenv("NEXT_PUBLIC_SUPABASE_URL"))
print("SUPABASE_ROLE_KEY:", "set" if os.getenv("SUPABASE_SERVICE_ROLE_KEY") else "missing")

# Manual fallback if parser fails (encoding or BOM issues)
if not os.getenv("NEXT_PUBLIC_SUPABASE_URL"):
    os.environ["NEXT_PUBLIC_SUPABASE_URL"] = "https://wivohgbuuwxoyfyzntsd.supabase.co"
    print("⚠️  Fallback applied for NEXT_PUBLIC_SUPABASE_URL")

# ================================================================
#  Flask App Initialization
# ================================================================
app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching

# ================================================================
#  CORS Handling
# ================================================================
@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', '*')
    allowed_origins = [
        'https://www.zophielgroup.com',
        'https://zophielgroup.com',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        '*'
    ]
    if origin in allowed_origins or '*' in allowed_origins:
        response.headers['Access-Control-Allow-Origin'] = origin if origin != '*' else '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    response.headers['Access-Control-Max-Age'] = '3600'
    return response

# ================================================================
#  Base Directories and Configuration
# ================================================================
BASE_DIR = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Ollama', 'data')
UPLOAD_DIR = os.getenv('OLLAMA_UPLOAD_DIR', os.path.join(BASE_DIR, 'incoming'))
PROCESSED_DIR = os.getenv('OLLAMA_PROCESSED_DIR', os.path.join(BASE_DIR, 'processed'))
LIBRARY_DIR = os.getenv('OLLAMA_LIBRARY_DIR', os.path.join(BASE_DIR, 'library'))
ERRORS_DIR = os.getenv('OLLAMA_ERRORS_DIR', os.path.join(BASE_DIR, 'errors'))
EXTRACTED_TEXT_DIR = os.getenv('OLLAMA_EXTRACTED_TEXT_DIR', os.path.join(BASE_DIR, 'extracted_text'))
PROGRESS_FILE = os.getenv('OLLAMA_PROGRESS_FILE', os.path.join(BASE_DIR, 'processing_progress.json'))
MODEL_NAME = os.getenv('OLLAMA_MODEL', 'vofc-engine:latest')
SERVER_HOST = os.getenv('SERVER_HOST', '127.0.0.1')
SERVER_PORT = int(os.getenv('SERVER_PORT', '5000'))
DEBUG_MODE = os.getenv('DEBUG', 'True').lower() == 'true'

# ================================================================
#  Supabase Configuration
# ================================================================
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

# ================================================================
#  Ensure Required Directories Exist
# ================================================================
for directory in [UPLOAD_DIR, PROCESSED_DIR, LIBRARY_DIR, ERRORS_DIR, EXTRACTED_TEXT_DIR]:
    os.makedirs(directory, exist_ok=True)

# ================================================================
#  Progress Tracking
# ================================================================
def update_progress(status, message, current_file=None, total_files=0, current_step=None, step_total=None):
    progress_data = {
        "status": status,
        "message": message,
        "current_file": current_file,
        "total_files": total_files,
        "current_step": current_step,
        "step_total": step_total,
        "timestamp": datetime.now().isoformat(),
        "progress_percent": 0
    }
    if step_total and current_step:
        progress_data["progress_percent"] = min(100, int((current_step / step_total) * 100))
    elif total_files > 0 and current_step:
        progress_data["progress_percent"] = min(100, int((current_step / total_files) * 100))
    try:
        with open(PROGRESS_FILE, 'w', encoding='utf-8') as f:
            json.dump(progress_data, f, indent=2)
    except Exception as e:
        logging.warning(f"Failed to write progress file: {e}")

def get_progress():
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
    except Exception as e:
        logging.warning(f"Failed to read progress file: {e}")
    return {
        "status": "idle",
        "message": "No active processing",
        "progress_percent": 0
    }

# ================================================================
#  Health Check Endpoints
# ================================================================
@app.route("/api/system/health", methods=["GET", "OPTIONS"])
def system_health():
    """
    Lightweight system health check endpoint - optimized for <200ms response time.
    Checks Flask, Ollama, and Supabase connectivity.
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    # Get Ollama URL - try multiple environment variables for consistency
    ollama_url_raw = (
        os.getenv("OLLAMA_URL") or 
        os.getenv("OLLAMA_HOST") or 
        os.getenv("OLLAMA_API_BASE_URL") or
        "http://localhost:11434"
    )
    
    # Ensure URL is properly formatted (add http:// if missing, strip trailing slash)
    ollama_base = ollama_url_raw.rstrip('/')
    if not ollama_base.startswith(('http://', 'https://')):
        ollama_base = f"http://{ollama_base}"
    ollama_url = f"{ollama_base}/api/tags"
    
    # Get Flask URL for reporting
    flask_url = f"http://{SERVER_HOST}:{SERVER_PORT}"
    
    supabase_url = SUPABASE_URL
    
    # Initialize components status
    components = {
        "flask": "online",
        "ollama": "offline",
        "supabase": "missing" if not supabase_url else "unknown"
    }
    
    # Check Ollama - try localhost first if Flask is running locally, then remote
    ollama_checked = False
    if SERVER_HOST in ["127.0.0.1", "localhost", "0.0.0.0"]:
        # Flask is running locally, check localhost Ollama first
        try:
            local_ollama_url = "http://localhost:11434/api/tags"
            r = requests.get(local_ollama_url, timeout=1)
            if r.status_code == 200:
                components["ollama"] = "online"
                ollama_base = "http://localhost:11434"
                ollama_checked = True
        except Exception:
            pass
    
    # If localhost check failed or Flask is remote, try configured Ollama URL
    if not ollama_checked:
        try:
            r = requests.get(ollama_url, timeout=1)
            if r.status_code == 200:
                components["ollama"] = "online"
                ollama_checked = True
        except Exception:
            # Last resort: try localhost if we haven't already
            if ollama_base != "http://localhost:11434":
                try:
                    fallback_url = "http://localhost:11434/api/tags"
                    r = requests.get(fallback_url, timeout=1)
                    if r.status_code == 200:
                        components["ollama"] = "online"
                        ollama_base = "http://localhost:11434"
                except Exception:
                    pass
    
    # Supabase - just check if configured
    if supabase_url:
        components["supabase"] = "online"
    else:
        components["supabase"] = "missing"
    
    # Return lightweight response with URLs
    return jsonify({
        "flask": components["flask"],
        "ollama": components["ollama"],
        "supabase": components["supabase"],
        "urls": {
            "flask": flask_url,
            "ollama": ollama_base
        }
    }), 200

@app.route("/api/health", methods=["GET", "OPTIONS"])
def health_check():
    if request.method == 'OPTIONS':
        return '', 200
    return jsonify({
        "status": "ok",
        "message": "VOFC Flask backend online",
        "model": MODEL_NAME,
        "upload_dir": UPLOAD_DIR
    }), 200

@app.route("/api/progress", methods=["GET", "OPTIONS"])
def get_processing_progress():
    """Get current document processing progress"""
    if request.method == 'OPTIONS':
        return '', 200
    try:
        progress = get_progress()
        if not isinstance(progress, dict):
            progress = {
                "status": "idle",
                "message": "No active processing",
                "current_file": None,
                "progress_percent": 0
            }
        if "progress_percent" not in progress:
            progress["progress_percent"] = 0
        return jsonify(progress), 200
    except Exception as e:
        logging.error(f"Error in get_processing_progress: {e}", exc_info=True)
        return jsonify({
            "status": "error",
            "message": f"Failed to get progress: {str(e)}",
            "current_file": None,
            "progress_percent": 0
        }), 500

# ================================================================
#  Supabase Record Writer
# ================================================================
def create_submission_record(submission_id, filename, vuln_count, ofc_count, filepath=None, vofc_data=None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("WARNING: Supabase credentials not configured.")
        return None
    try:
        metadata = {
            "document_name": filename,
            "file_path": filepath or "",
            "vulnerabilities_count": vuln_count,
            "ofcs_count": ofc_count,
            "processed_at": datetime.now(timezone.utc).isoformat()
        }
        submission_data = {
            "id": submission_id,
            "type": "ofc",
            "status": "pending_review",
            "source": "file_processing",
            "data": json.dumps(vofc_data or metadata),
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        response = requests.post(f"{SUPABASE_URL}/rest/v1/submissions", headers=headers, json=submission_data, timeout=10)
        if 200 <= response.status_code < 300:
            print(f"SUCCESS: Created submission record {submission_id} in Supabase")
        else:
            print(f"WARNING: Failed Supabase insert: {response.status_code} - {response.text}")
    except Exception as e:
        print(f"ERROR: Supabase record error: {e}")

# ================================================================
#  File Management
# ================================================================
@app.route('/api/files/list', methods=['GET'])
def list_files():
    try:
        if not os.path.exists(UPLOAD_DIR):
            return jsonify({"files": []})
        files = [f for f in os.listdir(UPLOAD_DIR) if os.path.isfile(os.path.join(UPLOAD_DIR, f))]
        return jsonify({"files": files})
    except Exception as e:
        return jsonify({"files": [], "error": str(e)}), 500

@app.route('/api/files/download/<filename>', methods=['GET'])
def download_file(filename):
    try:
        filename = os.path.basename(filename)
        filepath = os.path.join(UPLOAD_DIR, filename)
        if not os.path.exists(filepath):
            return jsonify({"error": "File not found"}), 404
        return send_file(filepath, as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files/write', methods=['POST'])
def write_file():
    try:
        data = request.get_json()
        filename = data.get('filename')
        content = data.get('content')
        folder = data.get('folder', 'processed')
        folder_map = {
            'processed': PROCESSED_DIR,
            'library': LIBRARY_DIR,
            'errors': ERRORS_DIR,
            'incoming': UPLOAD_DIR
        }
        target_path = os.path.join(folder_map.get(folder, PROCESSED_DIR), filename)
        with open(target_path, 'w', encoding='utf-8') as f:
            if isinstance(content, dict):
                json.dump(content, f, indent=2)
            else:
                f.write(str(content))
        return jsonify({"success": True, "path": target_path})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/files/process', methods=['POST', 'OPTIONS'])
def process_files():
    """
    Process all files in the incoming folder using heuristic pipeline.
    Note: This endpoint can take 10-30+ minutes for large documents with LLM processing.
    """
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if not os.path.exists(UPLOAD_DIR):
            return jsonify({
                "success": False,
                "error": f"Incoming directory does not exist: {UPLOAD_DIR}",
                "processed": 0
            }), 404

        os.makedirs(EXTRACTED_TEXT_DIR, exist_ok=True)
        
        incoming_files = [
            os.path.join(UPLOAD_DIR, f)
            for f in os.listdir(UPLOAD_DIR)
            if os.path.isfile(os.path.join(UPLOAD_DIR, f))
            and not f.endswith('_temp.txt')
        ]

        if not incoming_files:
            return jsonify({
                "success": True,
                "message": "No files to process",
                "processed": 0,
                "errors": 0
            })

        processed = 0
        errors = 0
        results = []

        update_progress("processing", f"Starting batch processing of {len(incoming_files)} file(s)", total_files=len(incoming_files))
        
        pipeline_path = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Ollama', 'pipeline')
        if pipeline_path not in sys.path:
            sys.path.insert(0, pipeline_path)
        
        try:
            from heuristic_pipeline import extract_text_from_pdf, process_text_with_vofc_engine
        except ImportError:
            try:
                from pipeline.heuristic_pipeline import extract_text_from_pdf, process_text_with_vofc_engine
            except ImportError:
                return jsonify({
                    "success": False,
                    "error": "Failed to import heuristic_pipeline functions. Check pipeline path.",
                    "processed": 0
                }), 500

        for file_index, filepath in enumerate(incoming_files, 1):
            if file_index > 1:
                time.sleep(2)
            filename = os.path.basename(filepath)
            safe_name = re.sub(r'[^a-zA-Z0-9_-]', '_', os.path.splitext(filename)[0])[:100] or f"document_{uuid.uuid4().hex[:8]}"
            
            update_progress(
                "processing",
                f"Processing file {file_index} of {len(incoming_files)}: {filename}",
                current_file=filename,
                total_files=len(incoming_files),
                current_step=file_index,
                step_total=len(incoming_files)
            )
            
            try:
                update_progress("processing", f"Extracting text from {filename}...", current_file=filename, total_files=len(incoming_files), current_step=file_index, step_total=len(incoming_files))
                text = extract_text_from_pdf(filepath)
                txt_name = filename.replace(".pdf", "_temp.txt")
                extracted_path = os.path.join(EXTRACTED_TEXT_DIR, txt_name)
                with open(extracted_path, "w", encoding="utf-8") as t:
                    t.write(text)

                update_progress("processing", f"Analyzing document with VOFC Engine: {filename}...", current_file=filename, total_files=len(incoming_files), current_step=file_index, step_total=len(incoming_files))
                vofc_result = process_text_with_vofc_engine(text, doc_id=safe_name, doc_title=filename)
                if 'sources' not in vofc_result:
                    vofc_result['sources'] = []

                vuln_count = len(vofc_result.get('vulnerabilities', []))
                ofc_count = len(vofc_result.get('ofcs', []))
                update_progress("processing", f"Analysis complete: Found {vuln_count} vulnerabilities, {ofc_count} OFCs", current_file=filename, total_files=len(incoming_files), current_step=file_index, step_total=len(incoming_files))

                file_basename = os.path.splitext(filename)[0]
                json_filename = f"{file_basename}.json"
                json_path = os.path.join(LIBRARY_DIR, json_filename)
                with open(json_path, "w", encoding="utf-8") as j:
                    json.dump(vofc_result, j, indent=2)

                os.makedirs(PROCESSED_DIR, exist_ok=True)
                processed_pdf_path = os.path.join(PROCESSED_DIR, filename)
                if os.path.exists(filepath):
                    shutil.move(filepath, processed_pdf_path)

                submission_id = str(uuid.uuid4())
                create_submission_record(
                    submission_id=submission_id,
                    filename=filename,
                    vuln_count=vuln_count,
                    ofc_count=ofc_count,
                    filepath=processed_pdf_path,
                    vofc_data=vofc_result
                )

                processed += 1
                results.append({
                    "file": filename,
                    "success": True,
                    "message": f"Processed successfully - {vuln_count} vulnerabilities, {ofc_count} OFCs",
                    "vulnerabilities": vuln_count,
                    "ofcs": ofc_count,
                    "submission_id": submission_id
                })

            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                logging.error(f"Error processing {filename}: {error_msg}", exc_info=True)
                
                try:
                    os.makedirs(ERRORS_DIR, exist_ok=True)
                    error_path = os.path.join(ERRORS_DIR, filename)
                    if os.path.exists(filepath):
                        shutil.move(filepath, error_path)
                except Exception as move_error:
                    logging.warning(f"Failed to move file to errors folder: {move_error}")

                errors += 1
                results.append({
                    "file": filename,
                    "success": False,
                    "error": f"{error_type}: {error_msg}",
                    "error_type": error_type
                })

        update_progress("completed", f"Processing completed: {processed} successful, {errors} errors", total_files=len(incoming_files))
        
        return jsonify({
            "success": True,
            "message": f"Processing completed: {processed} successful, {errors} errors",
            "processed": processed,
            "errors": errors,
            "total": len(incoming_files),
            "results": results
        })

    except Exception as e:
        logging.error(f"Error in process_files: {e}", exc_info=True)
        try:
            total = len(incoming_files) if 'incoming_files' in locals() and incoming_files else 0
            update_progress("error", f"Processing failed: {str(e)}", total_files=total)
        except:
            pass
        return jsonify({
            "success": False,
            "error": str(e),
            "processed": 0,
            "errors": 0
        }), 500

@app.route('/api/files/process-extracted', methods=['POST', 'OPTIONS'])
def process_extracted_text():
    """Process all .txt files in the extracted_text folder."""
    if request.method == 'OPTIONS':
        return '', 200
    
    try:
        if not os.path.exists(EXTRACTED_TEXT_DIR):
            return jsonify({
                "success": False,
                "error": f"Missing folder: {EXTRACTED_TEXT_DIR}"
            }), 404

        files = [
            f for f in os.listdir(EXTRACTED_TEXT_DIR)
            if os.path.isfile(os.path.join(EXTRACTED_TEXT_DIR, f)) and f.endswith(".txt")
        ]

        if not files:
            return jsonify({
                "success": True,
                "message": "No extracted text files found.",
                "processed": 0,
                "errors": 0
            })

        processed = 0
        errors = 0
        results = []

        pipeline_path = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Ollama', 'pipeline')
        if pipeline_path not in sys.path:
            sys.path.insert(0, pipeline_path)
        
        try:
            from heuristic_pipeline import process_submission
        except ImportError:
            try:
                from pipeline.heuristic_pipeline import process_submission
            except ImportError:
                return jsonify({
                    "success": False,
                    "error": "Failed to import process_submission. Check pipeline path.",
                    "processed": 0
                }), 500

        for fname in files:
            path = os.path.join(EXTRACTED_TEXT_DIR, fname)
            try:
                with open(path, "r", encoding="utf-8") as f:
                    text = f.read()

                pdf_name = fname.replace('_temp.txt', '.pdf').replace('.txt', '.pdf')
                pdf_path = None
                for folder in [LIBRARY_DIR, UPLOAD_DIR]:
                    potential_pdf = os.path.join(folder, pdf_name)
                    if os.path.exists(potential_pdf):
                        pdf_path = potential_pdf
                        break

                submission_id = str(uuid.uuid4())
                result = process_submission(
                    submission_id=submission_id,
                    document_text=text,
                    pdf_path=pdf_path,
                    dry_run=True
                )
                vofc_result = {
                    'vulnerabilities': result.get('vulnerabilities', []),
                    'ofcs': result.get('ofcs', []),
                    'sources': result.get('sources', []),
                    'links': result.get('links', {})
                }

                json_filename = fname.replace("_temp.txt", ".json")
                json_path = os.path.join(LIBRARY_DIR, json_filename)
                with open(json_path, "w", encoding="utf-8") as j:
                    json.dump(vofc_result, j, indent=2)

                library_txt_path = os.path.join(LIBRARY_DIR, fname)
                shutil.move(path, library_txt_path)

                submission_id = str(uuid.uuid4())
                vuln_count = len(vofc_result.get('vulnerabilities', []))
                ofc_count = len(vofc_result.get('ofcs', []))

                create_submission_record(
                    submission_id=submission_id,
                    filename=fname.replace('_temp.txt', '.pdf'),
                    vuln_count=vuln_count,
                    ofc_count=ofc_count,
                    filepath=library_txt_path,
                    vofc_data=vofc_result
                )

                processed += 1
                results.append({
                    "file": fname,
                    "success": True,
                    "vulnerabilities": vuln_count,
                    "ofcs": ofc_count,
                    "submission_id": submission_id
                })

            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                logging.error(f"Failed to process {fname}: {error_msg}", exc_info=True)

                try:
                    error_path = os.path.join(ERRORS_DIR, fname)
                    shutil.move(path, error_path)
                except Exception as move_error:
                    logging.warning(f"Failed to move file to errors folder: {move_error}")

                errors += 1
                results.append({
                    "file": fname,
                    "success": False,
                    "error": f"{error_type}: {error_msg}",
                    "error_type": error_type
                })

        return jsonify({
            "success": True,
            "message": f"Completed processing {processed} files, {errors} errors.",
            "processed": processed,
            "errors": errors,
            "results": results
        })

    except Exception as e:
        logging.error(f"Error in process_extracted_text: {e}", exc_info=True)
        return jsonify({
            "success": False,
            "error": str(e),
            "processed": 0,
            "errors": 0
        }), 500

# ================================================================
#  Root and Error Routes
# ================================================================
@app.route('/', methods=['GET'])
def root():
    return jsonify({
        "service": "VOFC Processing Server",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/api/system/health",
            "files": "/api/files/list"
        }
    })

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": str(error)}), 500

# ================================================================
#  Startup
# ================================================================
if __name__ == '__main__':
    print("=" * 50)
    print("Starting VOFC Ollama Server")
    print("=" * 50)
    print(f"Upload directory: {UPLOAD_DIR}")
    print(f"Model: {MODEL_NAME}")
    print(f"Server URL: http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"Debug mode: {DEBUG_MODE}")
    print("=" * 50)
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE, threaded=True)
