#!/usr/bin/env python3
"""
AI-powered text normalization for VOFC data
Uses Ollama for intelligent text cleaning and structuring
"""

import sys
import json
import os
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional

# Ollama configuration
OLLAMA_BASE_URL = os.getenv("OLLAMA_API_BASE_URL", os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"))
OLLAMA_MODEL = "llama3:latest"

def call_ollama(prompt: str, model: str = OLLAMA_MODEL) -> str:
    """Call Ollama API for text processing"""
    try:
        response = requests.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": model,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
                "stream": False
            },
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            return data.get("message", {}).get("content", "")
        else:
            raise Exception(f"Ollama API error: {response.status_code}")
    
    except Exception as e:
        raise Exception(f"Failed to call Ollama: {str(e)}")

def normalize_vulnerability_text(text: str) -> Dict[str, Any]:
    """Normalize vulnerability text using AI"""
    prompt = f"""
    Normalize the following vulnerability text for clarity and consistency:
    
    Original: {text}
    
    Please:
    1. Fix grammar and spelling errors
    2. Improve clarity and readability
    3. Ensure proper sentence structure
    4. Maintain the original meaning
    5. Return only the normalized text
    
    Normalized text:"""
    
    try:
        normalized = call_ollama(prompt)
        return {
            "original": text,
            "normalized": normalized.strip(),
            "confidence": 0.9,
            "method": "ai_normalization"
        }
    except Exception as e:
        return {
            "original": text,
            "normalized": text,  # Fallback to original
            "confidence": 0.1,
            "method": "fallback",
            "error": str(e)
        }

def normalize_ofc_text(text: str) -> Dict[str, Any]:
    """Normalize Options for Consideration text using AI"""
    prompt = f"""
    Normalize the following Option for Consideration text for clarity and actionability:
    
    Original: {text}
    
    Please:
    1. Make it more actionable and specific
    2. Fix grammar and spelling errors
    3. Ensure proper bullet point formatting
    4. Improve clarity and readability
    5. Return only the normalized text
    
    Normalized text:"""
    
    try:
        normalized = call_ollama(prompt)
        return {
            "original": text,
            "normalized": normalized.strip(),
            "confidence": 0.9,
            "method": "ai_normalization"
        }
    except Exception as e:
        return {
            "original": text,
            "normalized": text,  # Fallback to original
            "confidence": 0.1,
            "method": "fallback",
            "error": str(e)
        }

def normalize_citation_text(text: str) -> Dict[str, Any]:
    """Normalize citation text using AI"""
    prompt = f"""
    Normalize the following citation text for consistency:
    
    Original: {text}
    
    Please:
    1. Standardize the format
    2. Fix any formatting issues
    3. Ensure proper citation structure
    4. Return only the normalized text
    
    Normalized text:"""
    
    try:
        normalized = call_ollama(prompt)
        return {
            "original": text,
            "normalized": normalized.strip(),
            "confidence": 0.8,
            "method": "ai_normalization"
        }
    except Exception as e:
        return {
            "original": text,
            "normalized": text,  # Fallback to original
            "confidence": 0.1,
            "method": "fallback",
            "error": str(e)
        }

def normalize_data(data: Dict[str, Any]) -> Dict[str, Any]:
    """Normalize entire dataset"""
    normalized_data = {
        "source_file": data.get("source_file", ""),
        "normalization_timestamp": str(Path().cwd()),
        "original_metadata": data.get("metadata", {}),
        "vulnerabilities": [],
        "options_for_consideration": [],
        "citations": [],
        "normalization_stats": {
            "total_vulnerabilities": 0,
            "total_ofcs": 0,
            "total_citations": 0,
            "normalization_confidence": 0.0
        }
    }
    
    # Normalize vulnerabilities
    for vuln in data.get("vulnerabilities", []):
        normalized_vuln = vuln.copy()
        if "text" in vuln:
            norm_result = normalize_vulnerability_text(vuln["text"])
            normalized_vuln["text"] = norm_result["normalized"]
            normalized_vuln["normalization"] = norm_result
        normalized_data["vulnerabilities"].append(normalized_vuln)
    
    # Normalize OFCs
    for ofc in data.get("options_for_consideration", []):
        normalized_ofc = ofc.copy()
        if "text" in ofc:
            norm_result = normalize_ofc_text(ofc["text"])
            normalized_ofc["text"] = norm_result["normalized"]
            normalized_ofc["normalization"] = norm_result
        normalized_data["options_for_consideration"].append(normalized_ofc)
    
    # Normalize citations
    for citation in data.get("citations", []):
        normalized_citation = citation.copy()
        if "text" in citation:
            norm_result = normalize_citation_text(citation["text"])
            normalized_citation["text"] = norm_result["normalized"]
            normalized_citation["normalization"] = norm_result
        normalized_data["citations"].append(normalized_citation)
    
    # Update stats
    normalized_data["normalization_stats"] = {
        "total_vulnerabilities": len(normalized_data["vulnerabilities"]),
        "total_ofcs": len(normalized_data["options_for_consideration"]),
        "total_citations": len(normalized_data["citations"]),
        "normalization_confidence": 0.8  # Average confidence
    }
    
    return normalized_data

def main():
    """Main function for command-line usage"""
    if len(sys.argv) != 2:
        print("Usage: python normalize.py <json_file_path>")
        sys.exit(1)
    
    json_path = sys.argv[1]
    
    try:
        # Load data
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Normalize data
        normalized_data = normalize_data(data)
        
        # Output normalized data
        print(json.dumps(normalized_data, indent=2))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "input_file": json_path,
            "processing_status": "failed"
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
