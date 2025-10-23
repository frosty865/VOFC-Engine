"""
universal_workflow.py
--------------------
Complete workflow demonstrating the universal parser pipeline:
1. Parse any document with universal_parser.py
2. Normalize with normalize_universal.py using vofc-engine model
3. Validate and prepare for Supabase import
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from parsers.universal_parser import parse_document
from ai.normalize_universal import normalize_records, validate_normalized_records, export_normalized_data
from ai.sector_mapper import get_sector_statistics

class UniversalWorkflow:
    """Complete universal document processing workflow"""
    
    def __init__(self, output_dir: str = "data/universal_workflow"):
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    def run_complete_workflow(self, document_path: str, document_title: str = None) -> Dict[str, Any]:
        """
        Run the complete universal workflow from document to normalized VOFC data.
        """
        print("🔄 Starting Universal VOFC Workflow...")
        print(f"📄 Document: {document_path}")
        print(f"📝 Title: {document_title or 'Unknown'}")
        
        workflow_results = {
            "workflow_started": datetime.now().isoformat(),
            "document_path": document_path,
            "document_title": document_title,
            "steps_completed": [],
            "errors": [],
            "final_output": None
        }
        
        try:
            # Step 1: Parse document
            print("\n1️⃣ Step 1: Parsing document...")
            parsed_records = parse_document(document_path, document_title or "Unknown Document")
            
            if not parsed_records:
                raise Exception("No content extracted from document")
            
            # Save parsed data
            parsed_file = self.output_dir / "parsed_generic.json"
            with open(parsed_file, 'w', encoding='utf-8') as f:
                json.dump(parsed_records, f, indent=2, ensure_ascii=False)
            
            workflow_results["steps_completed"].append("document_parsing")
            workflow_results["parsed_records"] = len(parsed_records)
            print(f"✅ Document parsed: {len(parsed_records)} records")
            print(f"💾 Saved to: {parsed_file}")
            
            # Step 2: Normalize records
            print("\n2️⃣ Step 2: Normalizing records...")
            normalized_records = normalize_records(str(parsed_file))
            
            if not normalized_records:
                raise Exception("No records were normalized")
            
            workflow_results["steps_completed"].append("record_normalization")
            workflow_results["normalized_records"] = len(normalized_records)
            print(f"✅ Records normalized: {len(normalized_records)}")
            
            # Step 3: Validate records
            print("\n3️⃣ Step 3: Validating records...")
            validation_stats = validate_normalized_records(normalized_records)
            
            workflow_results["steps_completed"].append("record_validation")
            workflow_results["validation_stats"] = validation_stats
            print(f"✅ Validation complete: {validation_stats['valid_records']}/{validation_stats['total_records']} valid")
            
            # Step 4: Export final data
            print("\n4️⃣ Step 4: Exporting final data...")
            final_output = self.output_dir / "normalized_universal.json"
            export_path = export_normalized_data(normalized_records, str(final_output))
            
            workflow_results["steps_completed"].append("data_export")
            workflow_results["final_output"] = export_path
            print(f"✅ Final data exported: {export_path}")
            
            # Step 5: Generate workflow summary
            print("\n5️⃣ Step 5: Generating workflow summary...")
            summary = self._generate_workflow_summary(workflow_results, normalized_records)
            
            # Save workflow summary
            summary_file = self.output_dir / "workflow_summary.json"
            with open(summary_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2, ensure_ascii=False)
            
            workflow_results["workflow_completed"] = datetime.now().isoformat()
            workflow_results["summary"] = summary
            
            print(f"\n🎉 Universal workflow completed successfully!")
            print(f"📊 Summary:")
            print(f"  - Document: {document_title or 'Unknown'}")
            print(f"  - Parsed records: {workflow_results['parsed_records']}")
            print(f"  - Normalized records: {workflow_results['normalized_records']}")
            print(f"  - Valid records: {validation_stats['valid_records']}")
            print(f"  - Success rate: {validation_stats['valid_records']/validation_stats['total_records']*100:.1f}%")
            print(f"  - Final output: {export_path}")
            print(f"  - Summary: {summary_file}")
            
            return workflow_results
            
        except Exception as e:
            error_msg = f"Workflow error: {str(e)}"
            print(f"❌ {error_msg}")
            workflow_results["errors"].append(error_msg)
            workflow_results["workflow_failed"] = datetime.now().isoformat()
            return workflow_results
    
    def _generate_workflow_summary(self, workflow_results: Dict, normalized_records: List[Dict]) -> Dict[str, Any]:
        """Generate comprehensive workflow summary"""
        summary = {
            "workflow_info": {
                "document_path": workflow_results["document_path"],
                "document_title": workflow_results["document_title"],
                "workflow_started": workflow_results["workflow_started"],
                "workflow_completed": workflow_results.get("workflow_completed"),
                "steps_completed": workflow_results["steps_completed"],
                "errors": workflow_results["errors"]
            },
            "processing_stats": {
                "parsed_records": workflow_results.get("parsed_records", 0),
                "normalized_records": workflow_results.get("normalized_records", 0),
                "validation_stats": workflow_results.get("validation_stats", {})
            },
            "sector_analysis": {},
            "category_analysis": {},
            "output_files": {
                "parsed_data": str(self.output_dir / "parsed_generic.json"),
                "normalized_data": workflow_results.get("final_output"),
                "workflow_summary": str(self.output_dir / "workflow_summary.json")
            }
        }
        
        # Analyze sectors and categories
        if normalized_records:
            sector_stats = {}
            category_stats = {}
            
            for record in normalized_records:
                sector = record.get("sector", "Unknown")
                category = record.get("category", "Unknown")
                
                sector_stats[sector] = sector_stats.get(sector, 0) + 1
                category_stats[category] = category_stats.get(category, 0) + 1
            
            summary["sector_analysis"] = sector_stats
            summary["category_analysis"] = category_stats
        
        return summary
    
    def run_batch_workflow(self, documents: List[Dict[str, str]]) -> Dict[str, Any]:
        """Run workflow for multiple documents"""
        print(f"📚 Running batch workflow for {len(documents)} documents...")
        
        batch_results = {
            "batch_started": datetime.now().isoformat(),
            "total_documents": len(documents),
            "successful_documents": 0,
            "failed_documents": 0,
            "document_results": [],
            "combined_records": []
        }
        
        for i, doc in enumerate(documents, 1):
            print(f"\n📄 Processing document {i}/{len(documents)}: {doc.get('title', 'Unknown')}")
            
            try:
                result = self.run_complete_workflow(doc["path"], doc.get("title"))
                
                if result.get("workflow_completed"):
                    batch_results["successful_documents"] += 1
                    batch_results["document_results"].append(result)
                    
                    # Combine records if available
                    if result.get("final_output"):
                        try:
                            with open(result["final_output"], 'r', encoding='utf-8') as f:
                                records = json.load(f)
                                batch_results["combined_records"].extend(records)
                        except Exception as e:
                            print(f"⚠️ Could not load records from {result['final_output']}: {e}")
                else:
                    batch_results["failed_documents"] += 1
                    batch_results["document_results"].append(result)
                    
            except Exception as e:
                print(f"❌ Error processing document {doc.get('title', 'Unknown')}: {e}")
                batch_results["failed_documents"] += 1
                batch_results["document_results"].append({"error": str(e)})
        
        # Save combined results
        if batch_results["combined_records"]:
            combined_file = self.output_dir / "batch_normalized.json"
            with open(combined_file, 'w', encoding='utf-8') as f:
                json.dump(batch_results["combined_records"], f, indent=2, ensure_ascii=False)
            
            batch_results["combined_output"] = str(combined_file)
            print(f"💾 Combined results saved to: {combined_file}")
        
        batch_results["batch_completed"] = datetime.now().isoformat()
        
        print(f"\n📊 Batch workflow complete:")
        print(f"  - Total documents: {batch_results['total_documents']}")
        print(f"  - Successful: {batch_results['successful_documents']}")
        print(f"  - Failed: {batch_results['failed_documents']}")
        print(f"  - Combined records: {len(batch_results['combined_records'])}")
        
        return batch_results

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python universal_workflow.py <document_path> [document_title]")
        print("       python universal_workflow.py --batch <documents.json>")
        return
    
    workflow = UniversalWorkflow()
    
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
            
            result = workflow.run_batch_workflow(documents)
            
        except Exception as e:
            print(f"Error in batch processing: {e}")
    
    else:
        # Single document processing
        document_path = sys.argv[1]
        document_title = sys.argv[2] if len(sys.argv) > 2 else None
        
        if not Path(document_path).exists():
            print(f"Error: Document not found: {document_path}")
            return
        
        result = workflow.run_complete_workflow(document_path, document_title)
        
        if result.get("workflow_completed"):
            print("✅ Workflow completed successfully!")
        else:
            print("❌ Workflow failed")
            if result.get("errors"):
                for error in result["errors"]:
                    print(f"  - {error}")

if __name__ == "__main__":
    main()
