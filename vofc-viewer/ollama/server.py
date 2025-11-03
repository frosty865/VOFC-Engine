from flask import Flask, jsonify, request, send_file
import os
import json
import shutil
import subprocess
import sys
import uuid
import requests
from datetime import datetime
from pathlib import Path

app = Flask(__name__)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0  # Disable caching
# Note: For production, consider using background tasks (Celery, etc.) for long-running processing

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
EXTRACTED_TEXT_DIR = os.getenv(
    'OLLAMA_EXTRACTED_TEXT_DIR',
    os.path.join(BASE_DIR, 'extracted_text')
)
MODEL_NAME = os.getenv('OLLAMA_MODEL', 'vofc-engine:latest')
SERVER_HOST = os.getenv('SERVER_HOST', '127.0.0.1')
SERVER_PORT = int(os.getenv('SERVER_PORT', '5000'))
DEBUG_MODE = os.getenv('DEBUG', 'True').lower() == 'true'

# Supabase configuration for creating submission records
SUPABASE_URL = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL', '').rstrip('/')
SUPABASE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')

# Ensure all directories exist
for directory in [UPLOAD_DIR, PROCESSED_DIR, LIBRARY_DIR, ERRORS_DIR, EXTRACTED_TEXT_DIR]:
    os.makedirs(directory, exist_ok=True)

# Helper function to create submission record in Supabase
def create_submission_record(submission_id, filename, vuln_count, ofc_count, filepath=None, vofc_data=None):
    """
    Create a submission record in Supabase submissions table.
    This is Step 4: Update approval queue with extracted data.
    
    Args:
        submission_id: Unique submission ID
        filename: Original filename
        vuln_count: Number of vulnerabilities found
        ofc_count: Number of OFCs found
        filepath: Path to processed file
        vofc_data: Full VOFC extraction results (vulnerabilities, ofcs, etc.)
    """
    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"WARNING: Supabase credentials not configured - skipping submission record creation")
        return None
    
    try:
        # Prepare metadata
        metadata = {
            "document_name": filename,
            "file_path": filepath or "",
            "vulnerabilities_count": vuln_count,
            "ofcs_count": ofc_count,
            "processed_at": datetime.utcnow().isoformat(),
            "storage_type": "local",
            "processing_method": "heuristic_pipeline_llm"
        }
        
        # Include full VOFC data if provided
        if vofc_data:
            # Store the full extracted data for review
            submission_payload = {
                **metadata,
                "vulnerabilities": vofc_data.get('vulnerabilities', []),
                "ofcs": vofc_data.get('ofcs', []),
                "sources": vofc_data.get('sources', []),
                "links": vofc_data.get('links', {})
            }
        else:
            # Fallback to metadata only
            submission_payload = metadata
        
        submission_data = {
            "id": submission_id,
            "type": "ofc",  # Document submissions are treated as OFC submissions
            "status": "pending_review",  # Ready for approval queue
            "source": "file_processing",
            "data": json.dumps(submission_payload),
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        }
        
        # Use Supabase REST API
        url = f"{SUPABASE_URL}/rest/v1/submissions"
        headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }
        
        response = requests.post(url, headers=headers, json=submission_data, timeout=10)
        
        if response.status_code >= 200 and response.status_code < 300:
            print(f"SUCCESS: Created submission record {submission_id} in Supabase")
            return response.json()
        else:
            print(f"WARNING: Failed to create submission record: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"WARNING: Error creating submission record: {type(e).__name__}: {e}")
        return None

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

@app.route('/', methods=['GET'])
def root():
    """Root endpoint - redirect to health or show API info."""
    return jsonify({
        "service": "VOFC Processing Server",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "process": "/api/files/process",
            "files": "/api/files/list"
        }
    })

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

@app.route('/api/files/read', methods=['GET'])
def read_file():
    """Read a file from a specific folder."""
    try:
        folder = request.args.get('folder', 'library')  # processed, library, errors, extracted_text
        filename = request.args.get('filename')
        
        if not filename:
            return jsonify({"error": "filename is required"}), 400
        
        folder_map = {
            'processed': PROCESSED_DIR,
            'library': LIBRARY_DIR,
            'errors': ERRORS_DIR,
            'extracted_text': EXTRACTED_TEXT_DIR,
            'incoming': UPLOAD_DIR
        }
        
        if folder not in folder_map:
            return jsonify({"error": "Invalid folder name"}), 400
        
        file_path = os.path.join(folder_map[folder], filename)
        
        if not os.path.exists(file_path):
            return jsonify({"error": "File not found", "path": file_path}), 404
        
        # Read file content
        with open(file_path, 'r', encoding='utf-8') as f:
            if filename.endswith('.json'):
                # Parse JSON files
                content = json.load(f)
                return jsonify(content)
            else:
                # Return text files as-is
                content = f.read()
                return jsonify({"content": content, "filename": filename, "folder": folder})
    
    except json.JSONDecodeError as e:
        return jsonify({"error": f"Invalid JSON: {str(e)}"}), 400
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

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF file using Python libraries or Node.js pdf-parse."""
    # Try Python libraries first
    try:
        import PyPDF2
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            text = ''
            for page in reader.pages:
                text += page.extract_text() + '\n'
            if text.strip():
                return text
    except ImportError:
        pass
    except Exception as e:
        print(f"WARNING:  PyPDF2 extraction error: {e}")
    
    # Try pypdf (newer alternative)
    try:
        import pypdf
        with open(pdf_path, 'rb') as f:
            reader = pypdf.PdfReader(f)
            text = ''
            for page in reader.pages:
                text += page.extract_text() + '\n'
            if text.strip():
                return text
    except ImportError:
        pass
    except Exception as e:
        print(f"WARNING:  pypdf extraction error: {e}")
    
    # Try Node.js pdf-parse via subprocess (if node is available)
    try:
        # Check if we can find the pdf-parse module in node_modules
        node_modules_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'node_modules')
        pdf_parse_path = os.path.join(node_modules_path, 'pdf-parse', 'lib', 'pdfumor.js')
        if os.path.exists(pdf_parse_path):
            # Use Node.js to extract
            script = f"""
            const pdfParse = require('pdf-parse');
            const fs = require('fs');
            const data = fs.readFileSync(r'{pdf_path}');
            pdfParse(data).then(data => {{
                console.log(data.text);
            }}).catch(err => {{
                console.error(err);
                process.exit(1);
            }});
            """
            result = subprocess.run(
                ['node', '-e', script],
                capture_output=True,
                text=True,
                timeout=60
            )
            if result.returncode == 0 and result.stdout.strip():
                return result.stdout.strip()
    except Exception as e:
        print(f"WARNING:  Node.js pdf-parse extraction error: {e}")
    
    # Fallback to pdftotext command if available
    try:
        result = subprocess.run(
            ['pdftotext', pdf_path, '-'],
            capture_output=True,
            text=True,
            timeout=60
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    except Exception as e:
        print(f"WARNING:  pdftotext extraction error: {e}")
    
    # If all else fails, try OCR (Optical Character Recognition) for scanned PDFs
    try:
        print(f"WARNING: Standard text extraction failed, trying OCR...")
        from pdf2image import convert_from_path
        import pytesseract
        
        # Configure poppler path for Windows (default location: C:\tools\poppler\Library\bin)
        poppler_path = os.getenv('POPPLER_PATH', r'C:\tools\poppler\Library\bin')
        if not os.path.exists(os.path.join(poppler_path, 'pdftoppm.exe')):
            # Try alternative common locations
            alt_paths = [
                r'C:\poppler\bin',
                r'C:\tools\poppler\bin',
                os.path.join(os.path.expanduser('~'), 'poppler', 'bin')
            ]
            for alt in alt_paths:
                if os.path.exists(os.path.join(alt, 'pdftoppm.exe')):
                    poppler_path = alt
                    break
        print(f"   Using poppler from: {poppler_path}")
        
        # Convert PDF pages to images
        images = convert_from_path(pdf_path, dpi=200, poppler_path=poppler_path)
        
        # Extract text from each page using OCR
        ocr_text = ""
        for i, image in enumerate(images):
            print(f"   OCR processing page {i+1}/{len(images)}...")
            page_text = pytesseract.image_to_string(image, lang='eng')
            ocr_text += page_text + "\n"
        
        if ocr_text.strip():
            print(f"SUCCESS: OCR extracted {len(ocr_text)} characters from {len(images)} page(s)")
            return ocr_text
        else:
            print(f"WARNING: OCR returned empty text")
    except ImportError as e:
        print(f"WARNING: OCR libraries not available: {e}")
    except FileNotFoundError:
        print(f"WARNING: Tesseract OCR engine not found. Install from: https://github.com/UB-Mannheim/tesseract/wiki")
    except Exception as e:
        print(f"WARNING: OCR extraction error: {e}")
    
    # If all else fails, return empty string (heuristic parser might still work with metadata)
    print(f"ERROR: Could not extract text from PDF using any method: {pdf_path}")
    return ""

def process_file_with_heuristic_pipeline(filepath, filename):
    """Process a file using the heuristic pipeline."""
    error_details = []
    try:
        # Get the heuristic pipeline script path
        pipeline_script = os.path.join(
            os.path.expanduser('~'),
            'AppData', 'Local', 'Ollama', 'pipeline', 'heuristic_pipeline.py'
        )
        
        print(f"Processing {filename}...")
        print(f"   Pipeline script: {pipeline_script}")
        
        if not os.path.exists(pipeline_script):
            error_msg = f"Heuristic pipeline not found at: {pipeline_script}"
            error_details.append(error_msg)
            print(f"ERROR: {error_msg}")
            raise FileNotFoundError(error_msg)
        
        # Extract text from PDF if needed
        file_ext = os.path.splitext(filename)[1].lower()
        print(f"   File extension: {file_ext}")
        
        if file_ext == '.pdf':
            print(f"   Extracting text from PDF...")
            text_content = extract_text_from_pdf(filepath)
            if not text_content or len(text_content.strip()) < 10:
                error_msg = f"Could not extract text from PDF (got {len(text_content) if text_content else 0} characters)"
                error_details.append(error_msg)
                print(f"ERROR: {error_msg}")
                raise ValueError(error_msg)
            print(f"   Extracted {len(text_content)} characters from PDF")
            # Write text to temporary file
            temp_txt = os.path.join(UPLOAD_DIR, f"{os.path.splitext(filename)[0]}_temp.txt")
            with open(temp_txt, 'w', encoding='utf-8') as f:
                f.write(text_content)
            text_file = temp_txt
            print(f"   Temporary text file created: {text_file}")
        elif file_ext in ['.txt', '.md']:
            text_file = filepath
            print(f"   Using text file directly: {text_file}")
            # Verify file exists and is readable
            if not os.path.exists(text_file):
                error_msg = f"Text file not found: {text_file}"
                error_details.append(error_msg)
                raise FileNotFoundError(error_msg)
            with open(text_file, 'r', encoding='utf-8', errors='ignore') as f:
                content_preview = f.read(100)
            if len(content_preview) < 10:
                error_msg = f"Text file appears empty or unreadable: {text_file}"
                error_details.append(error_msg)
                raise ValueError(error_msg)
        else:
            error_msg = f"Unsupported file type: {file_ext}. Supported: .pdf, .txt, .md"
            error_details.append(error_msg)
            print(f"ERROR: {error_msg}")
            raise ValueError(error_msg)
        
        # Generate submission ID
        submission_id = str(uuid.uuid4())
        print(f"   Submission ID: {submission_id}")
        
        # Run heuristic pipeline
        print(f"   Running heuristic pipeline...")
        cmd = [sys.executable, pipeline_script,
               '--submission-id', submission_id,
               '--text-file', text_file]
        # Add PDF path if original file was a PDF (for citation extraction)
        if file_ext == '.pdf':
            cmd.extend(['--pdf-path', filepath])
        # Removed --dry-run to enable Supabase writes (Step 4: Update approval queue)
        print(f"   Command: {' '.join(cmd)}")
        
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=1800,  # 30 minute timeout (LLM processing can take much longer for large documents)
            cwd=os.path.dirname(pipeline_script) if os.path.exists(pipeline_script) else None,
            encoding='utf-8',
            errors='replace'  # Handle encoding errors gracefully
        )
        
        print(f"   Pipeline return code: {result.returncode}")
        if result.stdout:
            stdout_preview = result.stdout[:500] if len(result.stdout) > 500 else result.stdout
            print(f"   Pipeline stdout ({len(result.stdout)} chars, preview): {stdout_preview}")
        if result.stderr:
            stderr_preview = result.stderr[:500] if len(result.stderr) > 500 else result.stderr
            print(f"   Pipeline stderr ({len(result.stderr)} chars, preview): {stderr_preview}")
        
        if result.returncode != 0:
            error_msg = f"Pipeline failed with return code {result.returncode}"
            if result.stderr:
                error_msg += f": {result.stderr[:1000]}"
            if result.stdout:
                error_msg += f" Output: {result.stdout[:1000]}"
            error_details.append(error_msg)
            print(f"ERROR: {error_msg}")
            raise RuntimeError(error_msg)
        
        # Parse JSON output
        try:
            # Try to find JSON in stdout (might have logging before it)
            stdout_lines = result.stdout.split('\n')
            json_start = None
            for i, line in enumerate(stdout_lines):
                if line.strip().startswith('{'):
                    json_start = i
                    break
            
            if json_start is not None:
                json_text = '\n'.join(stdout_lines[json_start:])
            else:
                json_text = result.stdout
            
            output_json = json.loads(json_text)
            vuln_count = len(output_json.get('vulnerabilities', []))
            ofc_count = len(output_json.get('ofcs', []))
            print(f"   SUCCESS: Pipeline succeeded, extracted {vuln_count} vulnerabilities, {ofc_count} OFCs")
            
            if vuln_count == 0 and ofc_count == 0:
                print(f"   WARNING: No vulnerabilities or OFCs found. This might indicate:")
                print(f"   - Document doesn't match expected format (Category/Vulnerability/Options for Consideration)")
                print(f"   - Text extraction may not have captured structured content")
                print(f"   - Document may need manual review")
        except json.JSONDecodeError as e:
            error_msg = f"Failed to parse pipeline JSON output: {e}. Output was: {result.stdout[:1000]}"
            error_details.append(error_msg)
            print(f"ERROR: {error_msg}")
            raise ValueError(error_msg)
        
        # Move extracted text file to EXTRACTED_TEXT_DIR for additional analysis
        if file_ext == '.pdf' and os.path.exists(text_file):
            # Save text file with clean name (remove _temp suffix)
            text_filename = f"{os.path.splitext(filename)[0]}.txt"
            saved_text_path = os.path.join(EXTRACTED_TEXT_DIR, text_filename)
            shutil.move(text_file, saved_text_path)
            print(f"   Saved extracted text to: {saved_text_path}")
        
        return {
            "success": True,
            "submission_id": submission_id,
            "extracted_data": output_json,
            "vulnerabilities_count": len(output_json.get("vulnerabilities", [])),
            "ofcs_count": len(output_json.get("ofcs", []))
        }
        
    except Exception as e:
        error_msg = f"Error processing {filename}: {type(e).__name__}: {str(e)}"
        if error_details:
            error_msg += f" Details: {'; '.join(error_details)}"
        print(f"ERROR: {error_msg}")
        print(f"   Full traceback:")
        import traceback
        traceback.print_exc()
        raise RuntimeError(error_msg) from e

@app.route('/api/files/process', methods=['POST'])
def process_files():
    """
    Process all files in the incoming folder using heuristic pipeline.
    Flow: incoming/ → extracted_text/ → library/
    Note: This endpoint can take 10-30+ minutes for large documents with LLM processing.
    """
    try:
        # --- Validate incoming directory ---
        if not os.path.exists(UPLOAD_DIR):
            return jsonify({
                "success": False,
                "error": f"Incoming directory does not exist: {UPLOAD_DIR}",
                "processed": 0
            }), 404

        # Ensure extracted_text directory exists
        os.makedirs(EXTRACTED_TEXT_DIR, exist_ok=True)

        # --- Gather files from incoming folder ---
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

        # Import pipeline functions
        # Add pipeline directory to path if needed
        pipeline_path = os.path.join(os.path.expanduser('~'), 'AppData', 'Local', 'Ollama', 'pipeline')
        if pipeline_path not in sys.path:
            sys.path.insert(0, pipeline_path)
        
        try:
            from heuristic_pipeline import extract_text_from_pdf, process_text_with_vofc_engine
        except ImportError:
            # Fallback: try direct import if already in path
            try:
                from pipeline.heuristic_pipeline import extract_text_from_pdf, process_text_with_vofc_engine
            except ImportError:
                return jsonify({
                    "success": False,
                    "error": "Failed to import heuristic_pipeline functions. Check pipeline path.",
                    "processed": 0
                }), 500

        # --- Process each file ---
        for filepath in incoming_files:
            filename = os.path.basename(filepath)
            # Sanitize filename for safe printing (handle encoding issues)
            safe_filename = filename.encode('utf-8', errors='replace').decode('utf-8', errors='replace')
            file_basename = os.path.splitext(filename)[0]
            try:
                print(f"Processing {safe_filename} ...")
            except (OSError, UnicodeEncodeError):
                # Fallback for problematic filenames
                print(f"Processing file (name may contain special characters) ...")

            try:
                # Step 1: Extract text from PDF
                text = extract_text_from_pdf(filepath)
                txt_name = filename.replace(".pdf", "_temp.txt")
                extracted_path = os.path.join(EXTRACTED_TEXT_DIR, txt_name)
                with open(extracted_path, "w", encoding="utf-8") as t:
                    t.write(text)
                print(f"Extracted text saved to {extracted_path}")

                # Step 2: Run VOFC Engine with citation extraction
                try:
                    print(f"Analyzing extracted text for {safe_filename} ...")
                except (OSError, UnicodeEncodeError):
                    print("Analyzing extracted text...")
                
                # Import process_submission instead of just process_text_with_vofc_engine
                # to get citation extraction
                try:
                    from heuristic_pipeline import process_submission
                except ImportError:
                    try:
                        from pipeline.heuristic_pipeline import process_submission
                    except ImportError:
                        # Fallback to old method if import fails
                        vofc_result = process_text_with_vofc_engine(text)
                        # Add empty sources
                        if 'sources' not in vofc_result:
                            vofc_result['sources'] = []
                    else:
                        # Use process_submission for citation extraction
                        submission_id = str(uuid.uuid4())
                        result = process_submission(
                            submission_id=submission_id,
                            document_text=text,
                            pdf_path=filepath,  # Pass PDF path for metadata extraction
                            dry_run=True  # Don't write to DB, just get the data
                        )
                        vofc_result = {
                            'vulnerabilities': result.get('vulnerabilities', []),
                            'ofcs': result.get('ofcs', []),
                            'sources': result.get('sources', []),
                            'links': result.get('links', {})
                        }
                else:
                    # Use process_submission for citation extraction
                    submission_id = str(uuid.uuid4())
                    result = process_submission(
                        submission_id=submission_id,
                        document_text=text,
                        pdf_path=filepath,  # Pass PDF path for metadata extraction
                        dry_run=True  # Don't write to DB, just get the data
                    )
                    vofc_result = {
                        'vulnerabilities': result.get('vulnerabilities', []),
                        'ofcs': result.get('ofcs', []),
                        'sources': result.get('sources', []),
                        'links': result.get('links', {})
                    }

                # Step 3: Save JSON output to library
                json_filename = f"{file_basename}.json"
                json_path = os.path.join(LIBRARY_DIR, json_filename)
                with open(json_path, "w", encoding="utf-8") as j:
                    json.dump(vofc_result, j, indent=2)
                print(f"JSON written: {json_path}")

                # Step 4: Move original PDF and extracted text to library
                library_pdf_path = os.path.join(LIBRARY_DIR, filename)
                library_txt_path = os.path.join(LIBRARY_DIR, txt_name)
                shutil.move(filepath, library_pdf_path)
                shutil.move(extracted_path, library_txt_path)
                print(f"Moved {filename} + {txt_name} to library")

                # Step 5: Create submission record in Supabase
                submission_id = str(uuid.uuid4())
                vuln_count = len(vofc_result.get('vulnerabilities', []))
                ofc_count = len(vofc_result.get('ofcs', []))

                create_submission_record(
                    submission_id=submission_id,
                    filename=filename,
                    vuln_count=vuln_count,
                    ofc_count=ofc_count,
                    filepath=library_pdf_path,
                    vofc_data=vofc_result  # Include full extracted data
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
                try:
                    print(f"Failed {safe_filename}: {error_type}: {error_msg}")
                except (OSError, UnicodeEncodeError):
                    print(f"Failed file (encoding issue): {error_type}: {error_msg}")
                
                import traceback
                try:
                    tb_str = traceback.format_exc()
                    print(tb_str[:500])  # Limit output to avoid encoding issues
                except (OSError, UnicodeEncodeError):
                    # Fallback if print still fails
                    print(f"ERROR: {error_type}: {error_msg}")

                # Move to errors folder
                try:
                    error_path = os.path.join(ERRORS_DIR, filename)
                    shutil.move(filepath, error_path)
                    try:
                        print(f"Moved {safe_filename} to errors folder")
                    except (OSError, UnicodeEncodeError):
                        print("Moved file to errors folder")
                except Exception as move_error:
                    print(f"WARNING: Failed to move file to errors folder: {move_error}")

                errors += 1
                results.append({
                    "file": filename,
                    "success": False,
                    "error": f"{error_type}: {error_msg}",
                    "error_type": error_type
                })

        # --- Final summary ---
        return jsonify({
            "success": True,
            "message": f"Processing completed: {processed} successful, {errors} errors",
            "processed": processed,
            "errors": errors,
            "total": len(incoming_files),
            "results": results
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "processed": 0,
            "errors": 0
        }), 500

@app.route('/api/files/process-extracted', methods=['POST'])
def process_extracted_text():
    """Process all .txt files in the extracted_text folder."""
    try:
        if not os.path.exists(EXTRACTED_TEXT_DIR):
            return jsonify({
                "success": False,
                "error": f"Missing folder: {EXTRACTED_TEXT_DIR}"
            }), 404

        # Get all .txt files in extracted_text directory
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

        # Import pipeline functions
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
            print(f"Processing extracted text: {fname}")

            try:
                # Read extracted text
                with open(path, "r", encoding="utf-8") as f:
                    text = f.read()

                # Try to find original PDF for citation extraction
                pdf_name = fname.replace('_temp.txt', '.pdf').replace('.txt', '.pdf')
                pdf_path = None
                # Look in library first, then incoming
                for folder in [LIBRARY_DIR, UPLOAD_DIR]:
                    potential_pdf = os.path.join(folder, pdf_name)
                    if os.path.exists(potential_pdf):
                        pdf_path = potential_pdf
                        print(f"   Found original PDF for citation extraction: {pdf_path}")
                        break

                # Process with VOFC engine and citation extraction
                submission_id = str(uuid.uuid4())
                result = process_submission(
                    submission_id=submission_id,
                    document_text=text,
                    pdf_path=pdf_path,  # Pass PDF path if found for metadata extraction
                    dry_run=True  # Don't write to DB, just get the data
                )
                vofc_result = {
                    'vulnerabilities': result.get('vulnerabilities', []),
                    'ofcs': result.get('ofcs', []),
                    'sources': result.get('sources', []),
                    'links': result.get('links', {})
                }

                # Save JSON output to library
                json_filename = fname.replace("_temp.txt", ".json")
                json_path = os.path.join(LIBRARY_DIR, json_filename)
                with open(json_path, "w", encoding="utf-8") as j:
                    json.dump(vofc_result, j, indent=2)

                # Move processed .txt file to library
                library_txt_path = os.path.join(LIBRARY_DIR, fname)
                shutil.move(path, library_txt_path)

                # Create submission record
                submission_id = str(uuid.uuid4())
                vuln_count = len(vofc_result.get('vulnerabilities', []))
                ofc_count = len(vofc_result.get('ofcs', []))

                create_submission_record(
                    submission_id=submission_id,
                    filename=fname.replace('_temp.txt', '.pdf'),  # Original PDF name
                    vuln_count=vuln_count,
                    ofc_count=ofc_count,
                    filepath=library_txt_path,
                    vofc_data=vofc_result  # Include full extracted data
                )

                print(f"SUCCESS: Processed {fname} - {vuln_count} vulnerabilities, {ofc_count} OFCs")
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
                print(f"Failed to process {fname}: {error_type}: {error_msg}")
                import traceback
                traceback.print_exc()

                # Move to errors folder
                try:
                    error_path = os.path.join(ERRORS_DIR, fname)
                    shutil.move(path, error_path)
                    print(f"Moved {fname} to errors folder")
                except Exception as move_error:
                    print(f"WARNING: Failed to move file to errors folder: {move_error}")

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
        import traceback
        traceback.print_exc()
        return jsonify({
            "success": False,
            "error": str(e),
            "processed": 0,
            "errors": 0
        }), 500

@app.route('/api/documents/process-batch', methods=['POST'])
def process_batch():
    """Process a batch of files by filename using heuristic pipeline - Ollama server endpoint."""
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
                print(f"WARNING:  File not found: {filepath}")
                results.append({
                    "filename": filename,
                    "status": "error",
                    "message": "File not found in incoming folder"
                })
                errors += 1
                continue
            
            try:
                # Process file with heuristic pipeline
                process_result = process_file_with_heuristic_pipeline(filepath, filename)
                
                # Save JSON output to library folder
                json_filename = f"{os.path.splitext(filename)[0]}.json"
                json_path = os.path.join(LIBRARY_DIR, json_filename)
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(process_result["extracted_data"], f, indent=2)
                
                # Move original file to library folder
                library_filepath = os.path.join(LIBRARY_DIR, filename)
                shutil.move(filepath, library_filepath)
                
                print(f"SUCCESS: Processed: {filename} - {process_result['vulnerabilities_count']} vulnerabilities, {process_result['ofcs_count']} OFCs")
                results.append({
                    "filename": filename,
                    "status": "success",
                    "message": f"Processed successfully - {process_result['vulnerabilities_count']} vulnerabilities, {process_result['ofcs_count']} OFCs",
                    "vulnerabilities": process_result['vulnerabilities_count'],
                    "ofcs": process_result['ofcs_count'],
                    "submission_id": process_result["submission_id"]
                })
                processed += 1
                
            except Exception as e:
                # Log detailed error
                error_msg = str(e)
                error_type = type(e).__name__
                print(f"ERROR: Failed to process {filename}: {error_type}: {error_msg}")
                import traceback
                traceback.print_exc()
                
                # Move to errors folder
                try:
                    error_path = os.path.join(ERRORS_DIR, filename)
                    shutil.move(filepath, error_path)
                    print(f"   Moved {filename} to errors folder: {error_path}")
                except Exception as move_error:
                    print(f"   WARNING:  Failed to move file to errors folder: {move_error}")
                
                results.append({
                    "filename": filename,
                    "status": "error",
                    "message": f"{error_type}: {error_msg}",
                    "error_type": error_type
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
    """Health check endpoint with comprehensive service information"""
    try:
        import platform
        import flask
        
        dirs = {}
        dir_paths = {
            "incoming": UPLOAD_DIR,
            "processed": PROCESSED_DIR,
            "library": LIBRARY_DIR,
            "errors": ERRORS_DIR,
            "extracted_text": EXTRACTED_TEXT_DIR
        }
        
        for name, path in dir_paths.items():
            if os.path.exists(path):
                try:
                    files = os.listdir(path)
                    dirs[name] = {
                        "path": path,
                        "exists": True,
                        "file_count": len([f for f in files if os.path.isfile(os.path.join(path, f))]),
                        "files": [f for f in files if os.path.isfile(os.path.join(path, f))][:10]  # First 10 files
                    }
                except Exception as e:
                    dirs[name] = {
                        "path": path,
                        "exists": True,
                        "error": str(e)
                    }
            else:
                dirs[name] = {
                    "path": path,
                    "exists": False
                }
        
        # Get Python version
        python_version = sys.version.split()[0]
        
        # Get Flask version
        flask_version = flask.__version__
        
        # Get platform information
        platform_info = {
            "system": platform.system(),
            "release": platform.release(),
            "machine": platform.machine(),
            "processor": platform.processor()
        }
        
        # Get available models from Ollama (if accessible)
        ollama_models = []
        ollama_url = os.getenv('OLLAMA_URL', 'http://localhost:11434')
        try:
            models_response = requests.get(f"{ollama_url}/api/tags", timeout=2)
            if models_response.ok:
                models_data = models_response.json()
                ollama_models = [m.get('name', '') for m in models_data.get('models', [])]
        except:
            pass  # Ollama may not be accessible from Flask server
        
        # Get GPU utilization (if available)
        gpu_info = {
            "available": False,
            "utilization": 0,
            "memory_used": 0,
            "memory_total": 0,
            "devices": []
        }
        try:
            # Try nvidia-ml-py for NVIDIA GPUs (replacement for deprecated pynvml)
            try:
                import pynvml as nvml  # nvidia-ml-py uses pynvml as the import name
                nvml.nvmlInit()
                device_count = nvml.nvmlDeviceGetCount()
                if device_count > 0:
                    gpu_info["available"] = True
                    gpu_info["devices"] = []
                    total_util = 0
                    total_mem_used = 0
                    total_mem_total = 0
                    
                    for i in range(device_count):
                        handle = nvml.nvmlDeviceGetHandleByIndex(i)
                        name = nvml.nvmlDeviceGetName(handle).decode('utf-8')
                        util = nvml.nvmlDeviceGetUtilizationRates(handle)
                        mem_info = nvml.nvmlDeviceGetMemoryInfo(handle)
                        
                        gpu_info["devices"].append({
                            "id": i,
                            "name": name,
                            "utilization": util.gpu,
                            "memory_used_mb": mem_info.used // (1024 * 1024),
                            "memory_total_mb": mem_info.total // (1024 * 1024)
                        })
                        total_util += util.gpu
                        total_mem_used += mem_info.used
                        total_mem_total += mem_info.total
                    
                    gpu_info["utilization"] = total_util // device_count if device_count > 0 else 0
                    gpu_info["memory_used"] = total_mem_used // (1024 * 1024 * 1024)  # GB
                    gpu_info["memory_total"] = total_mem_total // (1024 * 1024 * 1024)  # GB
            except ImportError:
                # nvidia-ml-py not installed - this is fine, GPU just won't be available
                pass
            except Exception as e:
                # GPU detection failed - log but don't crash
                if DEBUG_MODE:
                    print(f"GPU detection error: {e}")
                # Continue without GPU info
                pass
        except Exception:
            pass
        
        # Backend statistics (tracking request metrics)
        # Note: In production, you'd want to use a proper metrics library
        backend_stats = {
            "active_connections": len(app.url_map.iter_rules()) if hasattr(app, 'url_map') else 0,
            "requests_per_minute": 0,  # Would need middleware to track
            "avg_response_time": 0,  # Would need middleware to track
            "queue_size": dirs.get("incoming", {}).get("file_count", 0)
        }
        
        return jsonify({
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "directories": dirs,
            "server": {
                "host": SERVER_HOST,
                "port": SERVER_PORT,
                "model": MODEL_NAME,
                "url": f"http://{SERVER_HOST}:{SERVER_PORT}"
            },
            "python": {
                "version": python_version,
                "executable": sys.executable,
                "platform": platform_info
            },
            "flask": {
                "version": flask_version,
                "environment": os.getenv('FLASK_ENV', 'production'),
                "debug": DEBUG_MODE
            },
            "services": {
                "ollama_models": ollama_models,
                "ollama_url": ollama_url,
                "base_directory": BASE_DIR
            },
            "gpu": gpu_info,
            "backend": backend_stats
        }), 200
    except Exception as e:
        import traceback
        return jsonify({
            "status": "error",
            "error": str(e),
            "traceback": traceback.format_exc() if DEBUG_MODE else None,
            "timestamp": datetime.now().isoformat()
        }), 500

if __name__ == '__main__':
    print("=" * 50)
    print("Starting VOFC Ollama Server")
    print("=" * 50)
    print(f"Upload directory: {UPLOAD_DIR}")
    print(f"Model: {MODEL_NAME}")
    print(f"Server URL: http://{SERVER_HOST}:{SERVER_PORT}")
    print(f"Debug mode: {DEBUG_MODE}")
    print("=" * 50)
    
    # Use threaded=True for handling multiple requests
    # Note: For production, use a proper WSGI server (gunicorn, waitress) with timeout settings
    app.run(host=SERVER_HOST, port=SERVER_PORT, debug=DEBUG_MODE, threaded=True)
