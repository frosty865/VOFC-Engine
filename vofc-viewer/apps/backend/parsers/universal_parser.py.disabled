"""
universal_parser.py
-------------------
Document-agnostic parser that extracts actionable sentences (best practices or
vulnerabilities) from PDFs, DOCX, or plaintext.  It identifies:
 - Options for Consideration (OFCs)
 - Vulnerabilities
 - Inline citations
"""

import re
import json
import pdfplumber
from pathlib import Path
from typing import Generator, Dict, List
from datetime import datetime

def clean_text(text: str) -> str:
    """Clean and normalize text content"""
    # Remove extra whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove special characters that might interfere with parsing
    text = re.sub(r'[^\w\s\.\,\;\:\!\?\-\(\)]', '', text)
    return text.strip()

def extract_blocks_from_pdf(path: str) -> Generator[str, None, None]:
    """Yield paragraphs or bullet blocks from a PDF file."""
    try:
        with pdfplumber.open(path) as pdf:
            for page_num, page in enumerate(pdf.pages):
                text = page.extract_text() or ""
                if not text.strip():
                    continue
                
                # Split on blank lines, bullets, or numbered lists
                blocks = re.split(r'(?:\n{2,}|•|\u2022|\u2023|\u25E6|- |\d+\.\s)', text)
                
                for block in blocks:
                    block = clean_text(block)
                    # Only yield substantial blocks (more than 6 words)
                    if len(block.split()) > 6:
                        yield block
                        
    except Exception as e:
        print(f"Error processing PDF {path}: {e}")
        return

def extract_blocks_from_text(path: str) -> Generator[str, None, None]:
    """Extract blocks from plain text files"""
    try:
        content = Path(path).read_text(encoding="utf-8", errors="ignore")
        
        # Split on paragraphs or bullet points
        blocks = re.split(r'(?:\n{2,}|•|\u2022|\u2023|\u25E6|- |\d+\.\s)', content)
        
        for block in blocks:
            block = clean_text(block)
            if len(block.split()) > 6:
                yield block
                
    except Exception as e:
        print(f"Error processing text file {path}: {e}")
        return

def detect_statements(text: str) -> Generator[Dict, None, None]:
    """Detect whether text is an OFC or Vulnerability sentence."""
    
    # OFC patterns - positive recommendations
    ofc_patterns = [
        r'\b(should|must|recommended|ensure|implement|encourage|establish|develop|create|install|configure|maintain|monitor|review|update|upgrade|enhance|improve|strengthen|secure|protect|safeguard)\b',
        r'\b(consider|evaluate|assess|analyze|examine|investigate|verify|validate|test|check|audit|inspect)\b',
        r'\b(provide|offer|deliver|supply|furnish|equip|outfit|prepare|organize|structure|arrange|coordinate)\b',
        r'\b(adopt|accept|embrace|utilize|leverage|employ|apply|use|deploy|activate|enable|facilitate)\b'
    ]
    
    # Vulnerability patterns - negative conditions
    vuln_patterns = [
        r'\b(lacks?|missing|fails?|not present|no\s+policy|insufficient|inadequate|deficient|weak|vulnerable|exposed|unprotected|unsecured|compromised|breached|violated|ignored|neglected|overlooked)\b',
        r'\b(absent|unavailable|inaccessible|disabled|broken|malfunctioning|outdated|obsolete|deprecated|unsupported|unpatched|unmaintained)\b',
        r'\b(limited|restricted|constrained|blocked|prevented|denied|rejected|failed|error|exception|fault|defect|flaw|weakness|gap|shortage)\b',
        r'\b(unauthorized|unapproved|unverified|unvalidated|unchecked|unmonitored|uncontrolled|unmanaged|unregulated|unrestricted|unlimited)\b'
    ]
    
    # Check for OFC patterns
    for pattern in ofc_patterns:
        if re.search(pattern, text, re.I):
            yield {
                "type": "ofc", 
                "text": text,
                "confidence": 0.8,
                "pattern_matched": pattern
            }
            break
    
    # Check for vulnerability patterns
    for pattern in vuln_patterns:
        if re.search(pattern, text, re.I):
            yield {
                "type": "vulnerability", 
                "text": text,
                "confidence": 0.8,
                "pattern_matched": pattern
            }
            break

def extract_citations(text: str) -> List[str]:
    """Extract citation references from text"""
    citations = []
    
    # Common citation patterns
    citation_patterns = [
        r'\[(\d+)\]',  # [1], [2], etc.
        r'\((\d+)\)',  # (1), (2), etc.
        r'Ref\.?\s*(\d+)',  # Ref 1, Ref. 1, etc.
        r'Source\s*(\d+)',  # Source 1, etc.
        r'See\s+(\d+)',  # See 1, etc.
    ]
    
    for pattern in citation_patterns:
        matches = re.findall(pattern, text, re.I)
        citations.extend(matches)
    
    return list(set(citations))  # Remove duplicates

def parse_document(path: str, source_title: str, source_metadata: Dict = None) -> List[Dict]:
    """
    Parse any document and extract OFCs and vulnerabilities with source-agnostic metadata.
    
    Args:
        path: Path to the document file
        source_title: Title of the source document
        source_metadata: Optional metadata dictionary containing:
            - source_type: Type of source (government, academic, corporate, field_note, media, unknown)
            - source_url: Optional URL to the source
            - author_org: Authoring organization
            - publication_year: Year of publication
            - submitted_by: PSA or analyst ID who submitted
            - content_restriction: Content restriction level (public, restricted, confidential, classified)
    """
    records = []
    ext = Path(path).suffix.lower()
    
    # Set default metadata
    if source_metadata is None:
        source_metadata = {}
    
    # Extract source metadata with defaults
    source_type = source_metadata.get('source_type', 'unknown')
    source_url = source_metadata.get('source_url')
    author_org = source_metadata.get('author_org')
    publication_year = source_metadata.get('publication_year')
    submitted_by = source_metadata.get('submitted_by')
    content_restriction = source_metadata.get('content_restriction', 'public')
    
    print(f"📄 Parsing document: {source_title}")
    print(f"📁 File type: {ext}")
    print(f"🏢 Source type: {source_type}")
    print(f"👤 Submitted by: {submitted_by or 'Unknown'}")
    
    # Choose extraction method based on file type
    if ext == ".pdf":
        blocks = extract_blocks_from_pdf(path)
    else:
        blocks = extract_blocks_from_text(path)
    
    total_blocks = 0
    ofc_count = 0
    vuln_count = 0
    
    for block in blocks:
        total_blocks += 1
        
        # Extract citations from the block
        citations = extract_citations(block)
        
        # Detect statements in the block
        entries = list(detect_statements(block))
        
        if entries:
            # Add citations to each entry
            for entry in entries:
                entry["citations"] = citations
                if entry["type"] == "ofc":
                    ofc_count += 1
                else:
                    vuln_count += 1
            
            records.append({
                "source_title": source_title,
                "source_type": source_type,
                "source_url": source_url,
                "author_org": author_org,
                "publication_year": publication_year,
                "submitted_by": submitted_by,
                "content_restriction": content_restriction,
                "source_file": path,
                "content": entries,
                "extraction_timestamp": datetime.now().isoformat(),
                "block_text": block[:200] + "..." if len(block) > 200 else block
            })
    
    print(f"📊 Extraction complete:")
    print(f"  - Total blocks processed: {total_blocks}")
    print(f"  - OFCs found: {ofc_count}")
    print(f"  - Vulnerabilities found: {vuln_count}")
    print(f"  - Records created: {len(records)}")
    
    return records

def parse_multiple_documents(documents: List[Dict[str, str]]) -> List[Dict]:
    """Parse multiple documents and combine results"""
    all_records = []
    
    for doc in documents:
        path = doc.get("path", "")
        title = doc.get("title", "Unknown Document")
        
        if not Path(path).exists():
            print(f"⚠️ File not found: {path}")
            continue
        
        try:
            records = parse_document(path, title)
            all_records.extend(records)
        except Exception as e:
            print(f"❌ Error parsing {path}: {e}")
            continue
    
    return all_records

if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) > 1:
        sample_path = sys.argv[1]
        sample_title = sys.argv[2] if len(sys.argv) > 2 else "Sample Document"
        
        if Path(sample_path).exists():
            data = parse_document(sample_path, sample_title)
            
            # Save results
            output_file = Path("parsed_universal.json")
            output_file.write_text(json.dumps(data, indent=2, ensure_ascii=False))
            
            print(f"✅ Results saved to {output_file}")
            print(f"📄 Extracted {len(data)} content blocks")
        else:
            print(f"❌ File not found: {sample_path}")
    else:
        print("Usage: python universal_parser.py <file_path> [document_title]")
        print("Example: python universal_parser.py sample.pdf 'FEMA Reference Manual 426'")
