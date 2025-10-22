"""
normalize_universal.py
----------------------
Takes the output from universal_parser.py and produces
fully normalized VOFC JSON using the vofc-engine Ollama model.
"""

import json
import os
import subprocess
import tempfile
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

# Import sector mapper
import sys
sys.path.append(str(Path(__file__).parent.parent))
from ai.sector_mapper import infer_sector_with_confidence

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "vofc-engine")
PROMPT_PATH = Path(__file__).parent / "prompts" / "normalize_universal_prompt.txt"

def normalize_records(parsed_json_path: str) -> List[Dict[str, Any]]:
    """
    Normalize parsed records using the vofc-engine Ollama model.
    """
    print(f"🔄 Normalizing records from {parsed_json_path}")
    
    try:
        # Load parsed records
        records = json.loads(Path(parsed_json_path).read_text(encoding="utf-8"))
        print(f"📊 Loaded {len(records)} records for normalization")
        
        # Load system prompt
        if not PROMPT_PATH.exists():
            print(f"❌ Prompt file not found: {PROMPT_PATH}")
            return []
        
        system_prompt = PROMPT_PATH.read_text(encoding="utf-8")
        
        normalized = []
        processed_count = 0
        error_count = 0
        
        for record in records:
            source = record.get("source_title", "Unknown Source")
            source_file = record.get("source_file", "Unknown File")
            
            print(f"📄 Processing record from: {source}")
            
            for item in record.get("content", []):
                text = item.get("text", "")
                item_type = item.get("type", "unknown")
                citations = item.get("citations", [])
                
                if not text.strip():
                    continue
                
                # Get sector information with confidence
                sector_info = infer_sector_with_confidence(text)
                sector = sector_info["sector"]
                subsector = sector_info["subsector"]
                confidence = sector_info["confidence"]
                
                # Create user prompt
                user_prompt = f"""Source: {source}
File: {source_file}
Sector: {sector}
Subsector: {subsector}
Type: {item_type}
Citations: {', '.join(citations) if citations else 'None'}

Text to normalize:
{text}"""
                
                try:
                    # Call Ollama model
                    result = call_ollama_model(system_prompt, user_prompt)
                    
                    if result:
                        # Parse JSON response
                        vofc_obj = json.loads(result)
                        
                        # Add metadata
                        vofc_obj["sector"] = sector
                        vofc_obj["subsector"] = subsector
                        vofc_obj["source_title"] = source
                        vofc_obj["source_file"] = source_file
                        vofc_obj["original_type"] = item_type
                        vofc_obj["sector_confidence"] = confidence
                        vofc_obj["citations"] = citations
                        vofc_obj["normalized_at"] = datetime.now().isoformat()
                        
                        normalized.append(vofc_obj)
                        processed_count += 1
                        
                        print(f"✅ Normalized: {vofc_obj.get('category', 'Unknown')} - {vofc_obj.get('vulnerability', 'No vulnerability')[:50]}...")
                    
                except json.JSONDecodeError as e:
                    print(f"❌ JSON parse error: {e}")
                    print(f"Raw output: {result[:200]}...")
                    error_count += 1
                    
                except Exception as e:
                    print(f"❌ Normalization error: {e}")
                    error_count += 1
        
        print(f"\n📊 Normalization complete:")
        print(f"  - Records processed: {processed_count}")
        print(f"  - Errors encountered: {error_count}")
        print(f"  - Success rate: {processed_count/(processed_count+error_count)*100:.1f}%" if (processed_count+error_count) > 0 else "N/A")
        
        return normalized
        
    except Exception as e:
        print(f"❌ Error in normalize_records: {e}")
        return []

def call_ollama_model(system_prompt: str, user_prompt: str) -> str:
    """
    Call the Ollama model with the given prompts.
    """
    try:
        # Use subprocess to call ollama
        cmd = [
            "ollama", "run", OLLAMA_MODEL,
            "--system", system_prompt,
            "--prompt", user_prompt
        ]
        
        result = subprocess.run(
            cmd, 
            capture_output=True, 
            text=True, 
            timeout=30  # 30 second timeout
        )
        
        if result.returncode != 0:
            print(f"❌ Ollama command failed: {result.stderr}")
            return None
        
        output = result.stdout.strip()
        
        # Clean up the output to extract JSON
        if "```json" in output:
            # Extract JSON from markdown code block
            start = output.find("```json") + 7
            end = output.find("```", start)
            if end > start:
                output = output[start:end].strip()
        elif "```" in output:
            # Extract from generic code block
            start = output.find("```") + 3
            end = output.find("```", start)
            if end > start:
                output = output[start:end].strip()
        
        return output
        
    except subprocess.TimeoutExpired:
        print("❌ Ollama model call timed out")
        return None
    except Exception as e:
        print(f"❌ Error calling Ollama model: {e}")
        return None

def validate_normalized_records(normalized_records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Validate normalized records and provide statistics.
    """
    validation_stats = {
        "total_records": len(normalized_records),
        "valid_records": 0,
        "invalid_records": 0,
        "sector_distribution": {},
        "category_distribution": {},
        "missing_fields": [],
        "validation_errors": []
    }
    
    required_fields = ["category", "vulnerability", "options_for_consideration"]
    
    for record in normalized_records:
        is_valid = True
        missing_fields = []
        
        # Check required fields
        for field in required_fields:
            if field not in record or not record[field]:
                missing_fields.append(field)
                is_valid = False
        
        # Check options_for_consideration structure
        if "options_for_consideration" in record:
            ofcs = record["options_for_consideration"]
            if not isinstance(ofcs, list) or len(ofcs) == 0:
                missing_fields.append("options_for_consideration (empty or not list)")
                is_valid = False
        
        if is_valid:
            validation_stats["valid_records"] += 1
            
            # Track sector distribution
            sector = record.get("sector", "Unknown")
            validation_stats["sector_distribution"][sector] = validation_stats["sector_distribution"].get(sector, 0) + 1
            
            # Track category distribution
            category = record.get("category", "Unknown")
            validation_stats["category_distribution"][category] = validation_stats["category_distribution"].get(category, 0) + 1
        else:
            validation_stats["invalid_records"] += 1
            validation_stats["missing_fields"].extend(missing_fields)
            validation_stats["validation_errors"].append({
                "record": record.get("source_title", "Unknown"),
                "missing_fields": missing_fields
            })
    
    return validation_stats

def export_normalized_data(normalized_records: List[Dict[str, Any]], output_path: str = None) -> str:
    """
    Export normalized records to JSON file.
    """
    if not output_path:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_path = f"normalized_universal_{timestamp}.json"
    
    try:
        # Create output directory if it doesn't exist
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Write normalized data
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(normalized_records, f, indent=2, ensure_ascii=False)
        
        print(f"💾 Normalized data exported to: {output_file}")
        return str(output_file)
        
    except Exception as e:
        print(f"❌ Error exporting normalized data: {e}")
        return ""

def main():
    """
    Main function for command-line usage.
    """
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python normalize_universal.py <parsed_json_path> [output_path]")
        print("Example: python normalize_universal.py parsed_generic.json normalized_universal.json")
        return
    
    input_path = sys.argv[1]
    output_path = sys.argv[2] if len(sys.argv) > 2 else "normalized_universal.json"
    
    if not Path(input_path).exists():
        print(f"❌ Input file not found: {input_path}")
        return
    
    print(f"🔄 Starting universal normalization...")
    print(f"📁 Input: {input_path}")
    print(f"📁 Output: {output_path}")
    print(f"🤖 Model: {OLLAMA_MODEL}")
    
    # Normalize records
    normalized = normalize_records(input_path)
    
    if not normalized:
        print("❌ No records were normalized")
        return
    
    # Validate records
    validation_stats = validate_normalized_records(normalized)
    
    print(f"\n📊 Validation Results:")
    print(f"  - Total records: {validation_stats['total_records']}")
    print(f"  - Valid records: {validation_stats['valid_records']}")
    print(f"  - Invalid records: {validation_stats['invalid_records']}")
    print(f"  - Success rate: {validation_stats['valid_records']/validation_stats['total_records']*100:.1f}%")
    
    if validation_stats['sector_distribution']:
        print(f"\n🏢 Sector Distribution:")
        for sector, count in validation_stats['sector_distribution'].items():
            print(f"  - {sector}: {count}")
    
    if validation_stats['category_distribution']:
        print(f"\n📋 Category Distribution:")
        for category, count in validation_stats['category_distribution'].items():
            print(f"  - {category}: {count}")
    
    # Export data
    export_path = export_normalized_data(normalized, output_path)
    
    if export_path:
        print(f"\n✅ Universal normalization complete!")
        print(f"📄 Output file: {export_path}")
        print(f"📊 Records normalized: {len(normalized)}")
    else:
        print("❌ Failed to export normalized data")

if __name__ == "__main__":
    main()
