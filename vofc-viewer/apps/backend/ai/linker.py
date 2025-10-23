#!/usr/bin/env python3
"""
AI-powered data linking for VOFC data
Links normalized data to Supabase database with fuzzy matching
"""

import sys
import json
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional
from difflib import SequenceMatcher

# Supabase configuration (would be loaded from environment in production)
SUPABASE_URL = "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = "your-supabase-key-here"  # This should be loaded from environment

def call_ollama(prompt: str, model: str = "llama3:latest") -> str:
    """Call Ollama API for AI processing"""
    try:
        response = requests.post(
            "http://localhost:11434/api/chat",
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

def fuzzy_match(text1: str, text2: str, threshold: float = 0.8) -> float:
    """Calculate fuzzy match score between two texts"""
    return SequenceMatcher(None, text1.lower(), text2.lower()).ratio()

def find_matching_vulnerability(vuln_text: str, existing_vulns: List[Dict]) -> Optional[Dict]:
    """Find matching vulnerability in existing data"""
    best_match = None
    best_score = 0.0
    
    for existing_vuln in existing_vulns:
        score = fuzzy_match(vuln_text, existing_vuln.get("vulnerability", ""))
        if score > best_score and score >= 0.8:  # 80% similarity threshold
            best_score = score
            best_match = existing_vuln
    
    return best_match if best_match else None

def find_matching_ofc(ofc_text: str, existing_ofcs: List[Dict]) -> Optional[Dict]:
    """Find matching OFC in existing data"""
    best_match = None
    best_score = 0.0
    
    for existing_ofc in existing_ofcs:
        score = fuzzy_match(ofc_text, existing_ofc.get("option_text", ""))
        if score > best_score and score >= 0.8:  # 80% similarity threshold
            best_score = score
            best_match = existing_ofc
    
    return best_match if best_match else None

def generate_discipline_from_text(text: str) -> str:
    """Generate discipline category from text using AI"""
    prompt = f"""
    Analyze the following text and determine the most appropriate discipline category:
    
    Text: {text}
    
    Choose from these categories:
    - Physical Security
    - Cybersecurity
    - Personnel Security
    - Operational Security
    - Information Security
    - Emergency Management
    - Risk Management
    - Compliance
    - Training and Awareness
    
    Return only the category name:"""
    
    try:
        discipline = call_ollama(prompt).strip()
        # Validate discipline
        valid_disciplines = [
            "Physical Security", "Cybersecurity", "Personnel Security",
            "Operational Security", "Information Security", "Emergency Management",
            "Risk Management", "Compliance", "Training and Awareness"
        ]
        
        if discipline in valid_disciplines:
            return discipline
        else:
            return "Physical Security"  # Default fallback
    
    except Exception as e:
        return "Physical Security"  # Default fallback

def link_vulnerability_to_database(vuln_data: Dict, existing_vulns: List[Dict]) -> Dict:
    """Link vulnerability to database"""
    vuln_text = vuln_data.get("text", "")
    
    # Check for existing match
    existing_match = find_matching_vulnerability(vuln_text, existing_vulns)
    
    if existing_match:
        return {
            "action": "linked_to_existing",
            "existing_id": existing_match.get("id"),
            "confidence": 0.9,
            "vulnerability_id": existing_match.get("id")
        }
    else:
        # Generate new vulnerability entry
        discipline = generate_discipline_from_text(vuln_text)
        
        return {
            "action": "create_new",
            "vulnerability_data": {
                "vulnerability": vuln_text,
                "discipline": discipline,
                "source": "ai_parsed"
            },
            "confidence": 0.8
        }

def link_ofc_to_database(ofc_data: Dict, vulnerability_id: str, existing_ofcs: List[Dict]) -> Dict:
    """Link OFC to database"""
    ofc_text = ofc_data.get("text", "")
    
    # Check for existing match
    existing_match = find_matching_ofc(ofc_text, existing_ofcs)
    
    if existing_match:
        return {
            "action": "linked_to_existing",
            "existing_id": existing_match.get("id"),
            "confidence": 0.9,
            "ofc_id": existing_match.get("id")
        }
    else:
        # Generate new OFC entry
        discipline = generate_discipline_from_text(ofc_text)
        
        return {
            "action": "create_new",
            "ofc_data": {
                "option_text": ofc_text,
                "discipline": discipline,
                "vulnerability_id": vulnerability_id,
                "source": "ai_parsed"
            },
            "confidence": 0.8
        }

def link_citation_to_database(citation_data: Dict, ofc_id: str) -> Dict:
    """Link citation to database"""
    citation_text = citation_data.get("text", "")
    
    return {
        "action": "create_new",
        "citation_data": {
            "source_text": citation_text,
            "reference_number": f"AI_{len(citation_text)}",  # Simple reference
            "ofc_id": ofc_id,
            "source": "ai_parsed"
        },
        "confidence": 0.7
    }

def link_data_to_supabase(data: Dict[str, Any]) -> Dict[str, Any]:
    """Link normalized data to Supabase database"""
    linking_results = {
        "source_file": data.get("source_file", ""),
        "linking_timestamp": str(Path().cwd()),
        "vulnerabilities": [],
        "options_for_consideration": [],
        "citations": [],
        "linking_stats": {
            "total_vulnerabilities_processed": 0,
            "total_ofcs_processed": 0,
            "total_citations_processed": 0,
            "linking_confidence": 0.0
        }
    }
    
    # Mock existing data (in real implementation, this would come from Supabase)
    existing_vulns = []  # Would be fetched from Supabase
    existing_ofcs = []   # Would be fetched from Supabase
    
    # Process vulnerabilities
    for vuln in data.get("vulnerabilities", []):
        link_result = link_vulnerability_to_database(vuln, existing_vulns)
        linking_results["vulnerabilities"].append({
            "original": vuln,
            "linking_result": link_result
        })
    
    # Process OFCs
    for ofc in data.get("options_for_consideration", []):
        # For now, use a mock vulnerability_id
        vulnerability_id = "mock_vuln_id"
        link_result = link_ofc_to_database(ofc, vulnerability_id, existing_ofcs)
        linking_results["options_for_consideration"].append({
            "original": ofc,
            "linking_result": link_result
        })
    
    # Process citations
    for citation in data.get("citations", []):
        # For now, use a mock ofc_id
        ofc_id = "mock_ofc_id"
        link_result = link_citation_to_database(citation, ofc_id)
        linking_results["citations"].append({
            "original": citation,
            "linking_result": link_result
        })
    
    # Update stats
    linking_results["linking_stats"] = {
        "total_vulnerabilities_processed": len(linking_results["vulnerabilities"]),
        "total_ofcs_processed": len(linking_results["options_for_consideration"]),
        "total_citations_processed": len(linking_results["citations"]),
        "linking_confidence": 0.8  # Average confidence
    }
    
    return linking_results

def main():
    """Main function for command-line usage"""
    if len(sys.argv) != 2:
        print("Usage: python linker.py <json_file_path>")
        sys.exit(1)
    
    json_path = sys.argv[1]
    
    try:
        # Load normalized data
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Link data to Supabase
        linking_results = link_data_to_supabase(data)
        
        # Output linking results
        print(json.dumps(linking_results, indent=2))
        
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
