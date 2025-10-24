#!/usr/bin/env python3
"""
heuristic_bridge.py
-------------------
Bridge script to connect VOFC Engine to the global Ollama pipeline.
This replaces all previous heuristic parsers with the new global pipeline.
"""

import sys
import os
import time
from pathlib import Path

# Add the global Ollama pipeline to the path
ollama_pipeline_path = r"C:\Users\frost\AppData\Local\Ollama\pipeline"
if os.path.exists(ollama_pipeline_path):
    sys.path.append(ollama_pipeline_path)
else:
    # Fallback to local pipeline if global not found
    sys.path.append(str(Path(__file__).parent.parent / "pipeline"))

def run_heuristics(submission_id, text, title, source):
    """
    Bridge function to call the global Ollama pipeline.
    
    Args:
        submission_id: Unique identifier for the submission
        text: Document text content
        title: Document title
        source: Source information
    
    Returns:
        Parsed results from the global pipeline
    """
    try:
        # Try to import from global pipeline first
        try:
            from heuristic_pipeline import process_submission
            
            return process_submission(
                submission_id=submission_id,
                document_text=text,
                source_meta=[{"source_title": title, "source_text": source}],
                dry_run=False
            )
        except ImportError:
            # Fallback to local ollama_pipeline
            from ollama_pipeline import OllamaPipeline
            
            # Create temporary file for processing
            import tempfile
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as temp_file:
                temp_file.write(text)
                temp_file_path = temp_file.name
            
            try:
                pipeline = OllamaPipeline()
                result = pipeline.process_document(temp_file_path, title)
                return result
            finally:
                # Clean up temp file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
    except Exception as e:
        print(f"Error in heuristic bridge: {e}")
        # Return empty result structure
        return {
            "source_title": title,
            "source_type": "heuristic_bridge_fallback",
            "document_type": "general",
            "vulnerabilities": [],
            "options_for_consideration": [],
            "extraction_stats": {
                "total_vulnerabilities": 0,
                "total_ofcs": 0,
                "pipeline_version": "bridge_fallback",
                "extraction_method": "bridge_error"
            },
            "parsed_at": None,
            "parser_version": "heuristic_bridge_v1.0"
        }

def extract_vofc(document_text, source_title="Document"):
    """
    Legacy function name for backward compatibility.
    """
    return run_heuristics("legacy-extraction", document_text, source_title, "")

# For direct script execution
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python heuristic_bridge.py <submission_id> <document_text> [title] [source]")
        print("Or: python heuristic_bridge.py <file_path> (for document processor)")
        sys.exit(1)
    
    # Check if first argument is a file path (document processor mode)
    if len(sys.argv) == 2 and (sys.argv[1].endswith('.txt') or sys.argv[1].endswith('.pdf')):
        # Document processor mode - read file content
        file_path = sys.argv[1]
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                document_text = f.read()
            submission_id = f"doc-{int(time.time())}"
            title = "Document"
            source = ""
        except Exception as e:
            print(f"Error reading file {file_path}: {e}")
            sys.exit(1)
    else:
        # Original mode - arguments provided
        submission_id = sys.argv[1]
        document_text = sys.argv[2]
        title = sys.argv[3] if len(sys.argv) > 3 else "Document"
        source = sys.argv[4] if len(sys.argv) > 4 else ""
    
    result = run_heuristics(submission_id, document_text, title, source)
    print(f"Extracted {len(result.get('vulnerabilities', []))} vulnerabilities")
    print(f"Extracted {len(result.get('options_for_consideration', []))} OFCs")
