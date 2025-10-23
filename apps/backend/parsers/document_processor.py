"""
document_processor.py
--------------------
Integration script that demonstrates how to use the universal parser
with the existing VOFC Engine infrastructure.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from parsers.enhanced_parser import parse_document_enhanced as parse_document
from parsers.universal_parser import parse_multiple_documents
from ai.sector_mapper import map_document_sectors, get_sector_statistics, infer_sector_with_confidence

class DocumentProcessor:
    """Process documents using the universal parser and sector mapper"""
    
    def __init__(self, output_dir: str = "data/processed"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def process_single_document(self, file_path: str, document_title: str = None) -> Dict[str, Any]:
        """Process a single document and return structured data"""
        if not Path(file_path).exists():
            return {"error": f"File not found: {file_path}"}
        
        if not document_title:
            document_title = Path(file_path).stem
        
        print(f"📄 Processing document: {document_title}")
        print(f"📁 File: {file_path}")
        
        try:
            # Parse the document
            records = parse_document(file_path, document_title)
            
            if not records:
                return {"error": "No content extracted from document"}
            
            # Map sectors for all records
            mapped_records = map_document_sectors(records)
            
            # Get sector statistics
            sector_stats = get_sector_statistics(mapped_records)
            
            # Create processing result
            result = {
                "document_info": {
                    "title": document_title,
                    "file_path": file_path,
                    "processed_at": datetime.now().isoformat(),
                    "total_records": len(mapped_records)
                },
                "sector_statistics": sector_stats,
                "records": mapped_records
            }
            
            # Save results
            output_file = self.output_dir / f"{Path(file_path).stem}_processed.json"
            with open(output_file, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Document processed successfully")
            print(f"📊 Records: {len(mapped_records)}")
            print(f"📊 Sectors: {len(sector_stats['sector_distribution'])}")
            print(f"💾 Saved to: {output_file}")
            
            return result
            
        except Exception as e:
            print(f"❌ Error processing document: {e}")
            return {"error": str(e)}
    
    def process_multiple_documents(self, documents: List[Dict[str, str]]) -> Dict[str, Any]:
        """Process multiple documents and combine results"""
        print(f"📚 Processing {len(documents)} documents...")
        
        all_records = []
        processing_errors = []
        
        for i, doc in enumerate(documents, 1):
            print(f"\n📄 Processing document {i}/{len(documents)}: {doc.get('title', 'Unknown')}")
            
            try:
                result = self.process_single_document(doc["path"], doc.get("title"))
                
                if "error" in result:
                    processing_errors.append({
                        "document": doc.get("title", "Unknown"),
                        "error": result["error"]
                    })
                else:
                    all_records.extend(result["records"])
                    
            except Exception as e:
                processing_errors.append({
                    "document": doc.get("title", "Unknown"),
                    "error": str(e)
                })
        
        # Get combined sector statistics
        combined_stats = get_sector_statistics(all_records)
        
        # Create combined result
        result = {
            "processing_info": {
                "total_documents": len(documents),
                "successful_documents": len(documents) - len(processing_errors),
                "failed_documents": len(processing_errors),
                "processed_at": datetime.now().isoformat()
            },
            "sector_statistics": combined_stats,
            "records": all_records,
            "errors": processing_errors
        }
        
        # Save combined results
        output_file = self.output_dir / "combined_processed.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"\n✅ Batch processing complete")
        print(f"📊 Total records: {len(all_records)}")
        print(f"📊 Successful documents: {len(documents) - len(processing_errors)}")
        print(f"📊 Failed documents: {len(processing_errors)}")
        print(f"💾 Combined results saved to: {output_file}")
        
        return result
    
    def analyze_sector_distribution(self, records: List[Dict]) -> Dict[str, Any]:
        """Analyze the distribution of sectors in processed records"""
        sector_analysis = {}
        total_entries = 0
        
        for record in records:
            if "content" not in record:
                continue
            
            for entry in record["content"]:
                total_entries += 1
                sector = entry.get("sector", "Unknown")
                subsector = entry.get("subsector", "Unknown")
                confidence = entry.get("sector_confidence", 0.0)
                entry_type = entry.get("type", "unknown")
                
                if sector not in sector_analysis:
                    sector_analysis[sector] = {
                        "total_entries": 0,
                        "ofc_count": 0,
                        "vulnerability_count": 0,
                        "subsectors": {},
                        "avg_confidence": 0.0,
                        "confidence_scores": []
                    }
                
                sector_analysis[sector]["total_entries"] += 1
                sector_analysis[sector]["confidence_scores"].append(confidence)
                
                if entry_type == "ofc":
                    sector_analysis[sector]["ofc_count"] += 1
                elif entry_type == "vulnerability":
                    sector_analysis[sector]["vulnerability_count"] += 1
                
                if subsector not in sector_analysis[sector]["subsectors"]:
                    sector_analysis[sector]["subsectors"][subsector] = 0
                sector_analysis[sector]["subsectors"][subsector] += 1
        
        # Calculate average confidence for each sector
        for sector, data in sector_analysis.items():
            if data["confidence_scores"]:
                data["avg_confidence"] = sum(data["confidence_scores"]) / len(data["confidence_scores"])
            del data["confidence_scores"]  # Clean up
        
        return {
            "total_entries": total_entries,
            "sector_analysis": sector_analysis,
            "analysis_timestamp": datetime.now().isoformat()
        }
    
    def export_for_ollama(self, records: List[Dict]) -> Dict[str, Any]:
        """Export processed records in a format suitable for Ollama processing"""
        ollama_data = {
            "source": "universal_parser",
            "extraction_timestamp": datetime.now().isoformat(),
            "total_records": len(records),
            "vulnerabilities": [],
            "options_for_consideration": [],
            "metadata": {
                "parser_version": "1.0.0",
                "sector_independent": True,
                "document_agnostic": True
            }
        }
        
        for record in records:
            if "content" not in record:
                continue
            
            for entry in record["content"]:
                entry_data = {
                    "text": entry.get("text", ""),
                    "sector": entry.get("sector", "General"),
                    "subsector": entry.get("subsector", "General"),
                    "confidence": entry.get("sector_confidence", 0.0),
                    "citations": entry.get("citations", []),
                    "source_title": record.get("source_title", "Unknown"),
                    "source_file": record.get("source_file", "Unknown")
                }
                
                if entry.get("type") == "vulnerability":
                    ollama_data["vulnerabilities"].append(entry_data)
                elif entry.get("type") == "ofc":
                    ollama_data["options_for_consideration"].append(entry_data)
        
        return ollama_data

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python document_processor.py <file_path> [document_title]")
        print("       python document_processor.py --batch <documents.json>")
        return
    
    processor = DocumentProcessor()
    
    if sys.argv[1] == "--batch":
        # Batch processing
        if len(sys.argv) < 3:
            print("Error: Batch processing requires a documents JSON file")
            return
        
        documents_file = sys.argv[2]
        if not Path(documents_file).exists():
            print(f"Error: Documents file not found: {documents_file}")
            return
        
        try:
            with open(documents_file, 'r', encoding='utf-8') as f:
                documents = json.load(f)
            
            result = processor.process_multiple_documents(documents)
            
            # Analyze results
            analysis = processor.analyze_sector_distribution(result["records"])
            print(f"\n📊 Sector Analysis:")
            for sector, data in analysis["sector_analysis"].items():
                print(f"  {sector}: {data['total_entries']} entries (OFCs: {data['ofc_count']}, Vulns: {data['vulnerability_count']})")
            
        except Exception as e:
            print(f"Error in batch processing: {e}")
    
    else:
        # Single document processing
        file_path = sys.argv[1]
        document_title = sys.argv[2] if len(sys.argv) > 2 else None
        
        result = processor.process_single_document(file_path, document_title)
        
        if "error" in result:
            print(f"❌ Processing failed: {result['error']}")
        else:
            # Export for Ollama
            ollama_data = processor.export_for_ollama(result["records"])
            ollama_file = processor.output_dir / f"{Path(file_path).stem}_ollama.json"
            
            with open(ollama_file, 'w', encoding='utf-8') as f:
                json.dump(ollama_data, f, indent=2, ensure_ascii=False)
            
            print(f"✅ Ollama export saved to: {ollama_file}")
            print(f"📊 Vulnerabilities: {len(ollama_data['vulnerabilities'])}")
            print(f"📊 OFCs: {len(ollama_data['options_for_consideration'])}")

if __name__ == "__main__":
    main()
