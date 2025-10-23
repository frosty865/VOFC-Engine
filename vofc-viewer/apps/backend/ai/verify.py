#!/usr/bin/env python3
"""
Data verification and integrity checking for VOFC data
Verifies citations, data consistency, and overall quality
"""

import sys
import json
import requests
from pathlib import Path
from typing import Dict, List, Any, Optional
import re

def call_ollama(prompt: str, model: str = "llama3:latest") -> str:
    """Call Ollama API for verification"""
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

def verify_citation_format(citation_text: str) -> Dict[str, Any]:
    """Verify citation format and structure"""
    issues = []
    score = 1.0
    
    # Check for common citation patterns
    patterns = {
        "author_year": r'[A-Z][a-z]+\s+\(\d{4}\)',
        "numbered": r'\[\d+\]',
        "url": r'https?://[^\s]+',
        "doi": r'doi:\s*[^\s]+',
        "isbn": r'ISBN\s*:?\s*[\d\-X]+'
    }
    
    found_patterns = []
    for pattern_name, pattern in patterns.items():
        if re.search(pattern, citation_text):
            found_patterns.append(pattern_name)
    
    if not found_patterns:
        issues.append("No recognizable citation format found")
        score -= 0.3
    
    # Check for minimum content
    if len(citation_text.strip()) < 10:
        issues.append("Citation text too short")
        score -= 0.2
    
    # Check for proper capitalization
    if not citation_text[0].isupper():
        issues.append("Citation should start with capital letter")
        score -= 0.1
    
    return {
        "citation_text": citation_text,
        "score": max(score, 0.0),
        "issues": issues,
        "patterns_found": found_patterns,
        "is_valid": score >= 0.7
    }

def verify_vulnerability_quality(vuln_text: str) -> Dict[str, Any]:
    """Verify vulnerability text quality"""
    issues = []
    score = 1.0
    
    # Check length
    if len(vuln_text.strip()) < 20:
        issues.append("Vulnerability text too short")
        score -= 0.3
    
    # Check for proper sentence structure
    sentences = re.split(r'[.!?]+', vuln_text)
    if len(sentences) < 1:
        issues.append("No complete sentences found")
        score -= 0.2
    
    # Check for security-related keywords
    security_keywords = [
        "vulnerability", "risk", "threat", "security", "attack", "breach",
        "compromise", "exploit", "weakness", "exposure"
    ]
    
    has_security_keywords = any(keyword in vuln_text.lower() for keyword in security_keywords)
    if not has_security_keywords:
        issues.append("No security-related keywords found")
        score -= 0.2
    
    # Check for proper grammar (basic check)
    if not vuln_text[0].isupper():
        issues.append("Should start with capital letter")
        score -= 0.1
    
    return {
        "vulnerability_text": vuln_text,
        "score": max(score, 0.0),
        "issues": issues,
        "is_valid": score >= 0.7
    }

def verify_ofc_quality(ofc_text: str) -> Dict[str, Any]:
    """Verify Options for Consideration quality"""
    issues = []
    score = 1.0
    
    # Check length
    if len(ofc_text.strip()) < 20:
        issues.append("OFC text too short")
        score -= 0.3
    
    # Check for action words
    action_words = [
        "implement", "establish", "develop", "create", "install", "configure",
        "train", "educate", "monitor", "review", "assess", "evaluate"
    ]
    
    has_action_words = any(word in ofc_text.lower() for word in action_words)
    if not has_action_words:
        issues.append("No action-oriented language found")
        score -= 0.2
    
    # Check for bullet points or structure
    has_structure = any(char in ofc_text for char in ['•', '-', '*', '1.', '2.'])
    if not has_structure and len(ofc_text) > 100:
        issues.append("Long text should be structured with bullet points")
        score -= 0.1
    
    # Check for proper grammar
    if not ofc_text[0].isupper():
        issues.append("Should start with capital letter")
        score -= 0.1
    
    return {
        "ofc_text": ofc_text,
        "score": max(score, 0.0),
        "issues": issues,
        "is_valid": score >= 0.7
    }

def verify_data_consistency(data: Dict[str, Any]) -> Dict[str, Any]:
    """Verify overall data consistency"""
    issues = []
    score = 1.0
    
    # Check for required fields
    required_fields = ["vulnerabilities", "options_for_consideration"]
    for field in required_fields:
        if field not in data:
            issues.append(f"Missing required field: {field}")
            score -= 0.3
    
    # Check for data relationships
    vulns = data.get("vulnerabilities", [])
    ofcs = data.get("options_for_consideration", [])
    
    if len(vulns) == 0:
        issues.append("No vulnerabilities found")
        score -= 0.2
    
    if len(ofcs) == 0:
        issues.append("No options for consideration found")
        score -= 0.2
    
    # Check for reasonable data ratios
    if len(vulns) > 0 and len(ofcs) > 0:
        ratio = len(ofcs) / len(vulns)
        if ratio < 0.5:
            issues.append("Low OFC to vulnerability ratio")
            score -= 0.1
        elif ratio > 10:
            issues.append("Very high OFC to vulnerability ratio")
            score -= 0.1
    
    return {
        "data_consistency_score": max(score, 0.0),
        "issues": issues,
        "is_consistent": score >= 0.7
    }

def generate_verification_report(data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate comprehensive verification report"""
    report = {
        "verification_timestamp": str(Path().cwd()),
        "source_file": data.get("source_file", ""),
        "vulnerabilities": [],
        "options_for_consideration": [],
        "citations": [],
        "overall_verification": {
            "total_items_verified": 0,
            "valid_items": 0,
            "invalid_items": 0,
            "overall_score": 0.0,
            "verification_status": "completed"
        }
    }
    
    # Verify vulnerabilities
    for vuln in data.get("vulnerabilities", []):
        verification = verify_vulnerability_quality(vuln.get("text", ""))
        report["vulnerabilities"].append({
            "original": vuln,
            "verification": verification
        })
    
    # Verify OFCs
    for ofc in data.get("options_for_consideration", []):
        verification = verify_ofc_quality(ofc.get("text", ""))
        report["options_for_consideration"].append({
            "original": ofc,
            "verification": verification
        })
    
    # Verify citations
    for citation in data.get("citations", []):
        verification = verify_citation_format(citation.get("text", ""))
        report["citations"].append({
            "original": citation,
            "verification": verification
        })
    
    # Overall data consistency
    consistency = verify_data_consistency(data)
    report["data_consistency"] = consistency
    
    # Calculate overall stats
    all_items = (
        report["vulnerabilities"] + 
        report["options_for_consideration"] + 
        report["citations"]
    )
    
    valid_items = sum(1 for item in all_items if item["verification"]["is_valid"])
    total_items = len(all_items)
    
    report["overall_verification"] = {
        "total_items_verified": total_items,
        "valid_items": valid_items,
        "invalid_items": total_items - valid_items,
        "overall_score": valid_items / total_items if total_items > 0 else 0.0,
        "verification_status": "completed"
    }
    
    return report

def main():
    """Main function for command-line usage"""
    if len(sys.argv) != 2:
        print("Usage: python verify.py <json_file_path>")
        sys.exit(1)
    
    json_path = sys.argv[1]
    
    try:
        # Load data
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Generate verification report
        report = generate_verification_report(data)
        
        # Output verification report
        print(json.dumps(report, indent=2))
        
    except Exception as e:
        error_result = {
            "error": str(e),
            "input_file": json_path,
            "verification_status": "failed"
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main()
