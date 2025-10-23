#!/usr/bin/env python3
"""
PDF Parser for VOFC Documents
Extracts vulnerabilities and options for consideration from PDF documents
"""

import sys
import json
import re
import pdfplumber
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

def extract_text_from_pdf(pdf_path: str) -> str:
    """Extract text from PDF using pdfplumber"""
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text
    except Exception as e:
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def clean_text(text: str) -> str:
    """Clean extracted text"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove page numbers and headers
    text = re.sub(r'^\d+\s*$', '', text, flags=re.MULTILINE)
    # Remove common PDF artifacts
    text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)\[\]\{\}\"\'\/]', '', text)
    return text.strip()

def extract_vulnerabilities(text: str) -> List[Dict[str, Any]]:
    """Extract vulnerabilities from text"""
    vulnerabilities = []
    
    # Look for vulnerability patterns
    vuln_patterns = [
        r'Vulnerability:\s*(.+?)(?=Option|$)',  # Simple pattern
        r'Risk:\s*(.+?)(?=Mitigation|$)',     # Risk-based pattern
        r'Threat:\s*(.+?)(?=Countermeasure|$)' # Threat-based pattern
    ]
    
    for pattern in vuln_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            vulnerability = {
                "id": f"vuln_{len(vulnerabilities) + 1}",
                "text": clean_text(match),
                "type": "vulnerability",
                "confidence": 0.8
            }
            vulnerabilities.append(vulnerability)
    
    return vulnerabilities

def extract_ofcs(text: str) -> List[Dict[str, Any]]:
    """Extract Options for Consideration from text"""
    ofcs = []
    
    # Look for OFC patterns
    ofc_patterns = [
        r'Option\s*for\s*Consideration:\s*(.+?)(?=Option|$)',  # Standard pattern
        r'Recommendation:\s*(.+?)(?=Recommendation|$)',        # Recommendation pattern
        r'Mitigation:\s*(.+?)(?=Mitigation|$)',              # Mitigation pattern
        r'Countermeasure:\s*(.+?)(?=Countermeasure|$)'       # Countermeasure pattern
    ]
    
    for pattern in ofc_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE | re.DOTALL)
        for match in matches:
            ofc = {
                "id": f"ofc_{len(ofcs) + 1}",
                "text": clean_text(match),
                "type": "option_for_consideration",
                "confidence": 0.8
            }
            ofcs.append(ofc)
    
    return ofcs

def extract_citations(text: str) -> List[Dict[str, Any]]:
    """Extract citations and references from text"""
    citations = []
    
    # Look for citation patterns
    citation_patterns = [
        r'\[(\d+)\]',  # Numbered citations
        r'\(([^)]+)\)',  # Parenthetical citations
        r'[A-Z][a-z]+\s+\(\d{4}\)',  # Author (Year) format
    ]
    
    for pattern in citation_patterns:
        matches = re.findall(pattern, text)
        for match in matches:
            citation = {
                "id": f"cite_{len(citations) + 1}",
                "text": match,
                "type": "citation",
                "confidence": 0.7
            }
            citations.append(citation)
    
    return citations

def parse_pdf(pdf_path: str) -> Dict[str, Any]:
    """Main parsing function"""
    try:
        # Validate input
        if not Path(pdf_path).exists():
            raise Exception(f"PDF file not found: {pdf_path}")
        
        # Extract text
        raw_text = extract_text_from_pdf(pdf_path)
        cleaned_text = clean_text(raw_text)
        
        # Extract components
        vulnerabilities = extract_vulnerabilities(cleaned_text)
        ofcs = extract_ofcs(cleaned_text)
        citations = extract_citations(cleaned_text)
        
        # Create result
        result = {
            "source_file": pdf_path,
            "extraction_timestamp": datetime.now().isoformat(),
            "raw_text_length": len(raw_text),
            "cleaned_text_length": len(cleaned_text),
            "vulnerabilities": vulnerabilities,
            "options_for_consideration": ofcs,
            "citations": citations,
            "metadata": {
                "total_vulnerabilities": len(vulnerabilities),
                "total_ofcs": len(ofcs),
                "total_citations": len(citations),
                "processing_status": "completed"
            }
        }
        
        # Validate with schema
        try:
            from ai.schemas import validate_vofc_data
            validated_result = validate_vofc_data(result)
            return validated_result.model_dump()
        except ImportError:
            # If schemas module not available, return raw result
            return result
        except Exception as e:
            print(f"Schema validation failed: {e}", file=sys.stderr)
            return result
        
    except Exception as e:
        return {
            "error": str(e),
            "source_file": pdf_path,
            "processing_status": "failed"
        }

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python pdf_parser.py <pdf_path>")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    result = parse_pdf(pdf_path)
    print(json.dumps(result, indent=2))
