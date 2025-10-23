"""
submission_generator.py
-----------------------
Generates submission packages from parsed documents for staging review.
Creates complete VOFC schema + metadata for admin approval workflow.
"""

import json
import uuid
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any
from universal_parser import parse_document
from ai.sector_mapper import infer_sector

def generate_submission_package(
    document_path: str, 
    source_title: str, 
    uploaded_by: str,
    source_metadata: Dict = None
) -> Dict[str, Any]:
    """
    Generate a complete submission package from a document.
    
    Args:
        document_path: Path to the document file
        source_title: Title of the source document
        uploaded_by: User ID who uploaded the document
        source_metadata: Optional metadata about the source
    
    Returns:
        Complete submission package ready for staging
    """
    
    # Set default metadata
    if source_metadata is None:
        source_metadata = {}
    
    # Parse the document
    print(f"📄 Parsing document: {source_title}")
    parsed_data = parse_document(document_path, source_title, source_metadata)
    
    # Extract source information
    source_info = {
        "title": source_title,
        "authors": source_metadata.get('authors', []),
        "year": source_metadata.get('publication_year', datetime.now().year),
        "source_type": source_metadata.get('source_type', 'unknown'),
        "source_confidence": source_metadata.get('source_confidence', 0.8),
        "source_url": source_metadata.get('source_url'),
        "author_org": source_metadata.get('author_org'),
        "content_restriction": source_metadata.get('content_restriction', 'public')
    }
    
    # Process entries from parsed data
    entries = []
    for record in parsed_data:
        for item in record.get("content", []):
            if item["type"] in ["vulnerability", "ofc"]:
                # Infer sector and subsector
                sector, subsector = infer_sector(item["text"])
                
                entry = {
                    "id": str(uuid.uuid4()),
                    "category": item.get("category", "General"),
                    "vulnerability": item["text"] if item["type"] == "vulnerability" else "",
                    "ofc": item["text"] if item["type"] == "ofc" else "",
                    "sector": sector,
                    "subsector": subsector,
                    "citations": item.get("citations", []),
                    "confidence": item.get("confidence", 0.8),
                    "extracted_at": datetime.now().isoformat()
                }
                
                # Only add entries with substantial content
                if len(entry["vulnerability"]) > 10 or len(entry["ofc"]) > 10:
                    entries.append(entry)
    
    # Create submission package
    submission_package = {
        "status": "pending_review",
        "source": source_info,
        "entries": entries,
        "metadata": {
            "document_path": document_path,
            "parsed_at": datetime.now().isoformat(),
            "total_entries": len(entries),
            "parser_version": "1.0.0"
        }
    }
    
    print(f"📦 Generated submission package:")
    print(f"  - Source: {source_info['title']}")
    print(f"  - Entries: {len(entries)}")
    print(f"  - Status: {submission_package['status']}")
    
    return submission_package

def save_submission_package(
    submission_package: Dict[str, Any], 
    output_dir: str = "data/staging/submissions"
) -> str:
    """
    Save submission package to staging directory.
    
    Args:
        submission_package: The submission package to save
        output_dir: Directory to save the package
    
    Returns:
        Path to the saved file
    """
    
    # Ensure output directory exists
    Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Generate filename
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    source_title = submission_package["source"]["title"]
    safe_title = "".join(c for c in source_title if c.isalnum() or c in (' ', '-', '_')).rstrip()
    safe_title = safe_title.replace(' ', '_')[:50]
    
    filename = f"{timestamp}_{safe_title}.json"
    filepath = Path(output_dir) / filename
    
    # Save the package
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(submission_package, f, indent=2, ensure_ascii=False)
    
    print(f"💾 Saved submission package: {filepath}")
    return str(filepath)

def process_document_to_staging(
    document_path: str,
    source_title: str,
    uploaded_by: str,
    source_metadata: Dict = None
) -> Dict[str, Any]:
    """
    Complete workflow: parse document and save to staging.
    
    Args:
        document_path: Path to the document file
        source_title: Title of the source document
        uploaded_by: User ID who uploaded the document
        source_metadata: Optional metadata about the source
    
    Returns:
        Submission package with file path
    """
    
    # Generate submission package
    submission_package = generate_submission_package(
        document_path, source_title, uploaded_by, source_metadata
    )
    
    # Save to staging
    filepath = save_submission_package(submission_package)
    
    # Add file path to package
    submission_package["metadata"]["staging_file"] = filepath
    
    return submission_package

if __name__ == "__main__":
    # Example usage
    import sys
    
    if len(sys.argv) < 4:
        print("Usage: python submission_generator.py <document_path> <source_title> <uploaded_by>")
        sys.exit(1)
    
    document_path = sys.argv[1]
    source_title = sys.argv[2]
    uploaded_by = sys.argv[3]
    
    # Example metadata
    source_metadata = {
        "source_type": "government",
        "authors": ["CISA", "DHS"],
        "publication_year": 2023,
        "source_confidence": 0.95
    }
    
    # Process document
    result = process_document_to_staging(
        document_path, source_title, uploaded_by, source_metadata
    )
    
    print(f"✅ Submission package created: {result['metadata']['staging_file']}")
