#!/usr/bin/env python3
"""
Top-level orchestrator for VOFC processing pipeline
Coordinates: parse → normalize → link → verify
"""

import sys
import json
import subprocess
from pathlib import Path
from typing import Dict, List, Any, Optional
from datetime import datetime

def run_python_script(script_path: str, args: List[str]) -> Dict[str, Any]:
    """Run a Python script and return results"""
    try:
        result = subprocess.run(
            ["python", script_path] + args,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        if result.returncode == 0:
            try:
                return json.loads(result.stdout)
            except json.JSONDecodeError:
                return {
                    "success": True,
                    "output": result.stdout,
                    "raw_output": True
                }
        else:
            return {
                "success": False,
                "error": result.stderr,
                "returncode": result.returncode
            }
    
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "error": "Script execution timed out",
            "timeout": True
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "exception": True
        }

def parse_pdf(pdf_path: str) -> Dict[str, Any]:
    """Step 1: Parse PDF document"""
    print(f"📄 Parsing PDF: {pdf_path}")
    
    if not Path(pdf_path).exists():
        return {
            "success": False,
            "error": f"PDF file not found: {pdf_path}",
            "step": "parse_pdf"
        }
    
    result = run_python_script("parsers/pdf_parser.py", [pdf_path])
    result["step"] = "parse_pdf"
    result["input_file"] = pdf_path
    
    if result["success"]:
        print(f"✅ PDF parsed successfully")
    else:
        print(f"❌ PDF parsing failed: {result.get('error', 'Unknown error')}")
    
    return result

def normalize_data(parsed_data: Dict[str, Any]) -> Dict[str, Any]:
    """Step 2: Normalize parsed data"""
    print("🧹 Normalizing data...")
    
    # Save parsed data to temporary file
    temp_file = "data/temp_parsed.json"
    Path("data").mkdir(exist_ok=True)
    
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(parsed_data, f, indent=2)
    
    result = run_python_script("ai/normalize.py", [temp_file])
    result["step"] = "normalize"
    result["input_data"] = parsed_data
    
    if result["success"]:
        print("✅ Data normalized successfully")
    else:
        print(f"❌ Data normalization failed: {result.get('error', 'Unknown error')}")
    
    return result

def link_to_supabase(normalized_data: Dict[str, Any]) -> Dict[str, Any]:
    """Step 3: Link normalized data to Supabase"""
    print("🔗 Linking to Supabase...")
    
    # Save normalized data to temporary file
    temp_file = "data/temp_normalized.json"
    
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(normalized_data, f, indent=2)
    
    result = run_python_script("ai/linker.py", [temp_file])
    result["step"] = "link"
    result["input_data"] = normalized_data
    
    if result["success"]:
        print("✅ Data linked to Supabase successfully")
    else:
        print(f"❌ Data linking failed: {result.get('error', 'Unknown error')}")
    
    return result

def verify_data(linked_data: Dict[str, Any]) -> Dict[str, Any]:
    """Step 4: Verify data integrity"""
    print("🔍 Verifying data...")
    
    # Save linked data to temporary file
    temp_file = "data/temp_linked.json"
    
    with open(temp_file, 'w', encoding='utf-8') as f:
        json.dump(linked_data, f, indent=2)
    
    result = run_python_script("ai/verify.py", [temp_file])
    result["step"] = "verify"
    result["input_data"] = linked_data
    
    if result["success"]:
        print("✅ Data verification completed")
    else:
        print(f"❌ Data verification failed: {result.get('error', 'Unknown error')}")
    
    return result

def run_complete_pipeline(pdf_path: str, output_dir: str = "data") -> Dict[str, Any]:
    """Run the complete VOFC processing pipeline"""
    pipeline_start = datetime.now()
    
    print("🚀 Starting VOFC Processing Pipeline")
    print("=" * 50)
    
    # Ensure output directory exists
    Path(output_dir).mkdir(exist_ok=True)
    
    pipeline_results = {
        "pipeline_start": pipeline_start.isoformat(),
        "input_file": pdf_path,
        "output_directory": output_dir,
        "steps": {},
        "overall_success": True,
        "errors": []
    }
    
    try:
        # Step 1: Parse PDF
        parse_result = parse_pdf(pdf_path)
        pipeline_results["steps"]["parse"] = parse_result
        
        if not parse_result["success"]:
            pipeline_results["overall_success"] = False
            pipeline_results["errors"].append("PDF parsing failed")
            return pipeline_results
        
        # Step 2: Normalize data
        normalize_result = normalize_data(parse_result)
        pipeline_results["steps"]["normalize"] = normalize_result
        
        if not normalize_result["success"]:
            pipeline_results["overall_success"] = False
            pipeline_results["errors"].append("Data normalization failed")
            return pipeline_results
        
        # Step 3: Link to Supabase
        link_result = link_to_supabase(normalize_result)
        pipeline_results["steps"]["link"] = link_result
        
        if not link_result["success"]:
            pipeline_results["overall_success"] = False
            pipeline_results["errors"].append("Data linking failed")
            return pipeline_results
        
        # Step 4: Verify data
        verify_result = verify_data(link_result)
        pipeline_results["steps"]["verify"] = verify_result
        
        if not verify_result["success"]:
            pipeline_results["overall_success"] = False
            pipeline_results["errors"].append("Data verification failed")
            return pipeline_results
        
        # Save final results
        final_output = {
            "pipeline_results": pipeline_results,
            "parsed_data": parse_result,
            "normalized_data": normalize_result,
            "linked_data": link_result,
            "verification_report": verify_result
        }
        
        output_file = Path(output_dir) / "pipeline_results.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(final_output, f, indent=2)
        
        pipeline_results["output_file"] = str(output_file)
        
    except Exception as e:
        pipeline_results["overall_success"] = False
        pipeline_results["errors"].append(f"Pipeline error: {str(e)}")
        print(f"❌ Pipeline failed: {str(e)}")
    
    finally:
        pipeline_end = datetime.now()
        pipeline_results["pipeline_end"] = pipeline_end.isoformat()
        pipeline_results["duration_seconds"] = (pipeline_end - pipeline_start).total_seconds()
        
        print("=" * 50)
        if pipeline_results["overall_success"]:
            print("🎉 Pipeline completed successfully!")
        else:
            print("💥 Pipeline failed!")
            print("Errors:", pipeline_results["errors"])
        
        print(f"⏱️  Total duration: {pipeline_results['duration_seconds']:.2f} seconds")
    
    return pipeline_results

def main():
    """Main function for command-line usage"""
    if len(sys.argv) < 2:
        print("Usage: python run_all.py <pdf_path> [output_dir]")
        sys.exit(1)
    
    pdf_path = sys.argv[1]
    output_dir = sys.argv[2] if len(sys.argv) > 2 else "data"
    
    # Run the complete pipeline
    results = run_complete_pipeline(pdf_path, output_dir)
    
    # Output results
    print("\n" + "=" * 50)
    print("PIPELINE RESULTS")
    print("=" * 50)
    print(json.dumps(results, indent=2))

if __name__ == "__main__":
    main()
