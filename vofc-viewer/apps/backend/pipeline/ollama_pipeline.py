#!/usr/bin/env python3
"""
ollama_pipeline.py
------------------
Production-ready Ollama pipeline for VOFC Engine document processing.
Integrates with existing heuristic parser and provides structured output.
"""

import json
import requests
import os
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

# Add the heuristic parser to the path
sys.path.append(str(Path(__file__).parent.parent / "parsers"))

# Configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_API_BASE_URL", os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "vofc-engine:latest")  # Use vofc-engine model
MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", "4000"))

class OllamaPipeline:
    """Production Ollama pipeline for VOFC document processing"""
    
    def __init__(self):
        self.base_url = OLLAMA_BASE_URL
        self.model = OLLAMA_MODEL
        self.max_content = MAX_CONTENT_LENGTH
        
    def process_document(self, file_path: str, source_title: str = "Document") -> Dict[str, Any]:
        """
        Process document through Ollama pipeline with heuristic analysis
        """
        try:
            print(f"Starting Ollama pipeline processing for: {source_title}")
            
            # Read document content
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Truncate content if too long
            if len(content) > self.max_content:
                content = content[:self.max_content] + "..."
                print(f"Content truncated to {self.max_content} characters")
            
            # Step 1: Call Ollama for initial analysis
            print(f"Calling Ollama API with model: {self.model}")
            ollama_response = self._call_ollama_api(content, source_title)
            
            if not ollama_response:
                print("Ollama analysis failed, using fallback")
                return self._create_fallback_result(source_title)
            
            print(f"Ollama response length: {len(ollama_response) if ollama_response else 0}")
            print(f"Ollama response preview: {ollama_response[:200] if ollama_response else 'None'}...")
            print(f"Full Ollama response: {ollama_response}")
            
            # Step 2: Apply heuristic analysis to Ollama output
            structured_data = self._apply_heuristic_analysis(ollama_response, content, source_title)
            
            print(f"Pipeline completed successfully")
            print(f"Found {len(structured_data.get('vulnerabilities', []))} vulnerabilities")
            print(f"Found {len(structured_data.get('options_for_consideration', []))} OFCs")
            
            return structured_data
            
        except Exception as e:
            print(f"Error in Ollama pipeline: {e}")
            return self._create_fallback_result(source_title)
    
    def _call_ollama_api(self, content: str, source_title: str) -> Optional[str]:
        """Call Ollama API for document analysis"""
        try:
            # Create optimized prompt for VOFC analysis
            prompt = self._create_analysis_prompt(content, source_title)
            
            response = requests.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "top_p": 0.9,
                        "max_tokens": 3000,
                        "stop": ["```", "---", "END"]
                    }
                },
                timeout=180  # 3 minute timeout for complex documents
            )
            
            if response.status_code == 200:
                data = response.json()
                response_text = data.get("response", "").strip()
                print(f"Ollama API success, response length: {len(response_text)}")
                return response_text
            else:
                print(f"Ollama API error: {response.status_code} - {response.text}")
                return None
                
        except requests.exceptions.Timeout:
            print("Ollama request timed out")
            return None
        except requests.exceptions.ConnectionError:
            print("Cannot connect to Ollama server")
            return None
        except Exception as e:
            print(f"Error calling Ollama API: {e}")
            return None
    
    def _create_analysis_prompt(self, content: str, source_title: str) -> str:
        """Create optimized prompt for VOFC analysis"""
        return f"""You are a security analysis expert. Analyze this document and return ONLY valid JSON in this exact format:

{{
  "vulnerabilities": [
    {{"text": "specific vulnerability description", "confidence": 0.8}}
  ],
  "options_for_consideration": [
    {{"text": "specific recommendation", "confidence": 0.9}}
  ]
}}

Document: {source_title}
Content: {content}

Return ONLY the JSON object, no other text."""
    
    def _apply_heuristic_analysis(self, ollama_response: str, original_content: str, source_title: str) -> Dict[str, Any]:
        """Apply heuristic analysis to Ollama output"""
        try:
            # Parse Ollama JSON response
            try:
                # Try to extract JSON from the response (it might have extra text)
                json_start = ollama_response.find('{')
                json_end = ollama_response.rfind('}') + 1
                if json_start != -1 and json_end > json_start:
                    json_part = ollama_response[json_start:json_end]
                    ollama_data = json.loads(json_part)
                else:
                    ollama_data = json.loads(ollama_response)
            except json.JSONDecodeError:
                # If JSON parsing fails, create structured data from text
                ollama_data = self._parse_text_response(ollama_response)
            
            # Apply heuristic enhancements
            vulnerabilities = []
            options_for_consideration = []
            
            # Process vulnerabilities with heuristic scoring
            for vuln in ollama_data.get("vulnerabilities", []):
                enhanced_vuln = self._enhance_vulnerability(vuln, original_content)
                vulnerabilities.append(enhanced_vuln)
            
            # Process OFCs with heuristic scoring (handle both "options_for_consideration" and "recommendations")
            ofcs = ollama_data.get("options_for_consideration", []) or ollama_data.get("recommendations", [])
            for ofc in ofcs:
                enhanced_ofc = self._enhance_ofc(ofc, original_content)
                options_for_consideration.append(enhanced_ofc)
            
            # Create structured result
            return {
                "source_title": source_title,
                "source_type": "ollama_pipeline",
                "document_type": "security_analysis",
                "vulnerabilities": vulnerabilities,
                "options_for_consideration": options_for_consideration,
                "extraction_stats": {
                    "total_vulnerabilities": len(vulnerabilities),
                    "total_ofcs": len(options_for_consideration),
                    "pipeline_version": "ollama_v1.0",
                    "extraction_method": "ollama_heuristic_hybrid"
                },
                "parsed_at": datetime.now().isoformat(),
                "parser_version": "ollama_pipeline_v1.0"
            }
            
        except Exception as e:
            print(f"Error in heuristic analysis: {e}")
            return self._create_fallback_result(source_title)
    
    def _convert_array_to_object(self, parsed_array: List[Dict], full_response: str) -> Dict[str, Any]:
        """Convert array response to proper object format"""
        vulnerabilities = []
        recommendations = []
        
        # Look for the second array in the response (recommendations)
        response_parts = full_response.split('[')
        if len(response_parts) > 1:
            # Try to find the second array
            second_array_start = full_response.find('[', full_response.find(']') + 1)
            if second_array_start != -1:
                second_array_end = full_response.rfind(']') + 1
                second_array_text = full_response[second_array_start:second_array_end]
                try:
                    recommendations = json.loads(second_array_text)
                except json.JSONDecodeError:
                    pass
        
        # First array is vulnerabilities
        vulnerabilities = parsed_array
        
        return {
            "vulnerabilities": vulnerabilities,
            "recommendations": recommendations
        }
    
    def _parse_text_response(self, text_response: str) -> Dict[str, Any]:
        """Parse text response when JSON parsing fails"""
        vulnerabilities = []
        options_for_consideration = []
        
        # Simple text parsing as fallback
        lines = text_response.split('\n')
        current_section = None
        
        for line in lines:
            line = line.strip()
            if 'vulnerability' in line.lower() or 'risk' in line.lower():
                if line and not line.startswith('{'):
                    vulnerabilities.append({
                        "text": line,
                        "confidence": 0.7,
                        "context": "extracted from text"
                    })
            elif 'recommendation' in line.lower() or 'option' in line.lower() or 'consideration' in line.lower():
                if line and not line.startswith('{'):
                    options_for_consideration.append({
                        "text": line,
                        "confidence": 0.7,
                        "context": "extracted from text"
                    })
        
        return {
            "vulnerabilities": vulnerabilities,
            "options_for_consideration": options_for_consideration
        }
    
    def _enhance_vulnerability(self, vuln: Dict[str, Any], original_content: str) -> Dict[str, Any]:
        """Apply heuristic enhancements to vulnerability"""
        text = vuln.get("text", "")
        confidence = vuln.get("confidence", 0.8)
        
        # Handle null confidence values
        if confidence is None:
            confidence = 0.8
        
        # Heuristic confidence adjustment based on content analysis
        if any(keyword in text.lower() for keyword in ['critical', 'severe', 'high risk', 'urgent']):
            confidence = min(confidence + 0.1, 1.0)
        elif any(keyword in text.lower() for keyword in ['minor', 'low', 'potential']):
            confidence = max(confidence - 0.1, 0.3)
        
        # Check if vulnerability appears in original content
        if text.lower() in original_content.lower():
            confidence = min(confidence + 0.05, 1.0)
        
        return {
            "text": text,
            "confidence": round(confidence, 2),
            "context": vuln.get("context", ""),
            "extraction_method": "ollama_heuristic",
            "parser_version": "ollama_pipeline_v1.0"
        }
    
    def _enhance_ofc(self, ofc: Dict[str, Any], original_content: str) -> Dict[str, Any]:
        """Apply heuristic enhancements to OFC"""
        text = ofc.get("text", "")
        confidence = ofc.get("confidence", 0.8)
        
        # Handle null confidence values
        if confidence is None:
            confidence = 0.8
        
        # Heuristic confidence adjustment
        if any(keyword in text.lower() for keyword in ['implement', 'install', 'establish', 'create']):
            confidence = min(confidence + 0.1, 1.0)
        elif any(keyword in text.lower() for keyword in ['consider', 'evaluate', 'assess']):
            confidence = max(confidence - 0.05, 0.3)
        
        # Check if OFC appears in original content
        if text.lower() in original_content.lower():
            confidence = min(confidence + 0.05, 1.0)
        
        return {
            "text": text,
            "confidence": round(confidence, 2),
            "context": ofc.get("context", ""),
            "extraction_method": "ollama_heuristic",
            "parser_version": "ollama_pipeline_v1.0"
        }
    
    def _create_fallback_result(self, source_title: str) -> Dict[str, Any]:
        """Create fallback result when pipeline fails"""
        return {
            "source_title": source_title,
            "source_type": "ollama_pipeline",
            "document_type": "security_analysis",
            "vulnerabilities": [],
            "options_for_consideration": [],
            "extraction_stats": {
                "total_vulnerabilities": 0,
                "total_ofcs": 0,
                "pipeline_version": "ollama_v1.0",
                "extraction_method": "fallback"
            },
            "parsed_at": datetime.now().isoformat(),
            "parser_version": "ollama_pipeline_v1.0"
        }

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python ollama_pipeline.py <file_path> [source_title]")
        sys.exit(1)
    
    file_path = sys.argv[1]
    source_title = sys.argv[2] if len(sys.argv) > 2 else "Document"
    
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        sys.exit(1)
    
    # Initialize pipeline
    pipeline = OllamaPipeline()
    
    # Process document
    result = pipeline.process_document(file_path, source_title)
    
    # Save result
    output_file = "parsed_ollama_pipeline.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, indent=2, ensure_ascii=False)
    
    print(f"Pipeline result saved to: {output_file}")
    print(f"Vulnerabilities: {len(result.get('vulnerabilities', []))}")
    print(f"OFCs: {len(result.get('options_for_consideration', []))}")

if __name__ == "__main__":
    main()
