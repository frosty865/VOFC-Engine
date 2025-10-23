#!/usr/bin/env python3
"""
ollama_parser.py
----------------
Ollama-based document parser that uses LLM for intelligent document analysis.
This parser leverages Ollama for sophisticated document understanding and extraction.
"""

import re
import json
import requests
import os
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Ollama configuration
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "vofc-engine:latest")
OLLAMA_BASE_URL = os.getenv("OLLAMA_API_BASE_URL", os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))

class OllamaParser:
    """Ollama-based document parser for intelligent extraction"""
    
    def __init__(self):
        self.model = OLLAMA_MODEL
        self.base_url = OLLAMA_BASE_URL
        
    def parse_document(self, file_path: str, source_title: str = "Document") -> Dict[str, Any]:
        """
        Parse document using Ollama LLM for intelligent extraction
        """
        try:
            print(f"Starting Ollama-based parsing for: {source_title}")
            
            # Read document content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Create system prompt for vulnerability and OFC extraction
            system_prompt = self._create_system_prompt()
            user_prompt = self._create_user_prompt(content, source_title)
            
            # Call Ollama model
            result = self._call_ollama_model(system_prompt, user_prompt)
            
            if result:
                # Parse the JSON response
                parsed_data = json.loads(result)
                
                # Process and structure the data
                structured_data = self._process_ollama_response(parsed_data, source_title)
                
                print(f"Ollama parsing completed successfully")
                print(f"Found {len(structured_data.get('vulnerabilities', []))} vulnerabilities")
                print(f"Found {len(structured_data.get('options_for_consideration', []))} OFCs")
                
                return structured_data
            else:
                print("Ollama parsing failed - no response")
                return self._create_empty_result(source_title)
                
        except Exception as e:
            print(f"Error in Ollama parsing: {e}")
            return self._create_empty_result(source_title)
    
    def _create_system_prompt(self) -> str:
        """Create system prompt for vulnerability and OFC extraction"""
        return """Extract security vulnerabilities and options for consideration from documents. Return JSON format:

{
  "vulnerabilities": [{"text": "description", "confidence": 0.8}],
  "options_for_consideration": [{"text": "recommendation", "confidence": 0.9}]
}"""
    
    def _create_user_prompt(self, content: str, source_title: str) -> str:
        """Create user prompt with document content"""
        return f"""Document: {source_title}
Content: {content[:2000]}

Extract vulnerabilities and recommendations as JSON."""
    
    def _call_ollama_model(self, system_prompt: str, user_prompt: str) -> Optional[str]:
        """Call Ollama model via HTTP API"""
        try:
            # Create combined prompt
            combined_prompt = f"System: {system_prompt}\n\nUser: {user_prompt}"
            
            # Call Ollama API
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": combined_prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,  # Low temperature for consistent output
                        "top_p": 0.9,
                        "max_tokens": 2000
                    }
                },
                timeout=120
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "").strip()
            else:
                print(f"Ollama API error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            print("Ollama request timed out")
            return None
        except requests.exceptions.ConnectionError:
            print("Cannot connect to Ollama server - is it running?")
            return None
        except Exception as e:
            print(f"Error calling Ollama: {e}")
            return None
    
    def _process_ollama_response(self, data: Dict[str, Any], source_title: str) -> Dict[str, Any]:
        """Process and structure Ollama response"""
        vulnerabilities = []
        options_for_consideration = []
        
        # Process vulnerabilities
        for vuln in data.get("vulnerabilities", []):
            vulnerabilities.append({
                "text": vuln.get("text", ""),
                "confidence": vuln.get("confidence", 0.8),
                "context": vuln.get("context", ""),
                "source_section": vuln.get("source_section", ""),
                "extraction_method": "ollama_llm",
                "parser_version": "ollama_v1.0"
            })
        
        # Process OFCs
        for ofc in data.get("options_for_consideration", []):
            options_for_consideration.append({
                "text": ofc.get("text", ""),
                "confidence": ofc.get("confidence", 0.8),
                "context": ofc.get("context", ""),
                "source_section": ofc.get("source_section", ""),
                "extraction_method": "ollama_llm",
                "parser_version": "ollama_v1.0"
            })
        
        return {
            "source_title": source_title,
            "source_type": "document_analysis",
            "document_type": "general",
            "vulnerabilities": vulnerabilities,
            "options_for_consideration": options_for_consideration,
            "extraction_stats": {
                "total_vulnerabilities": len(vulnerabilities),
                "total_ofcs": len(options_for_consideration),
                "parser_version": "ollama_v1.0",
                "extraction_method": "llm_analysis"
            },
            "parsed_at": datetime.now().isoformat(),
            "parser_version": "ollama_v1.0"
        }
    
    def _create_empty_result(self, source_title: str) -> Dict[str, Any]:
        """Create empty result structure"""
        return {
            "source_title": source_title,
            "source_type": "document_analysis",
            "document_type": "general",
            "vulnerabilities": [],
            "options_for_consideration": [],
            "extraction_stats": {
                "total_vulnerabilities": 0,
                "total_ofcs": 0,
                "parser_version": "ollama_v1.0",
                "extraction_method": "llm_analysis"
            },
            "parsed_at": datetime.now().isoformat(),
            "parser_version": "ollama_v1.0"
        }

def main():
    """Main function for command-line usage"""
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python ollama_parser.py <file_path> [source_title]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    source_title = sys.argv[2] if len(sys.argv) > 2 else "Document"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
    
    # Initialize parser
    parser = OllamaParser()
    
    # Parse document
    result = parser.parse_document(file_path, source_title)
    
    # Save result
    output_file = "parsed_ollama.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"Ollama parsing result saved to: {output_file}")
    print(f"Vulnerabilities: {len(result.get('vulnerabilities', []))}")
    print(f"OFCs: {len(result.get('options_for_consideration', []))}")

if __name__ == "__main__":
    main()
