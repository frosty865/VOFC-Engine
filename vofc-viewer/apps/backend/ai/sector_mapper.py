"""
sector_mapper.py
----------------
Assigns sector and subsector based on keyword matches
from context/keyword_map.json.
"""

import json
import re
from pathlib import Path
from typing import Tuple, Dict, List
from datetime import datetime

# Get the keyword map path
MAP_PATH = Path(__file__).resolve().parents[1] / "context" / "keyword_map.json"

def load_keyword_map() -> Dict[str, List[str]]:
    """Load the keyword mapping from JSON file"""
    try:
        if MAP_PATH.exists():
            return json.loads(MAP_PATH.read_text(encoding="utf-8"))
        else:
            print(f"⚠️ Keyword map not found at {MAP_PATH}")
            return {"General": []}
    except Exception as e:
        print(f"❌ Error loading keyword map: {e}")
        return {"General": []}

# Load keyword map at module level
KEYWORD_MAP = load_keyword_map()

def infer_sector(text: str) -> Tuple[str, str]:
    """
    Infer sector and subsector from text based on keyword matching.
    Returns (sector, subsector_keyword)
    """
    if not text or not text.strip():
        return "General", "General"
    
    text_lower = text.lower()
    sector_scores = {}
    
    # Score each sector based on keyword matches
    for sector, keywords in KEYWORD_MAP.items():
        if sector == "General":
            continue
            
        score = 0
        matched_keywords = []
        
        for keyword in keywords:
            # Use word boundary matching for more precise results
            pattern = rf"\b{re.escape(keyword.lower())}\b"
            matches = re.findall(pattern, text_lower)
            
            if matches:
                score += len(matches)
                matched_keywords.extend(matches)
        
        if score > 0:
            sector_scores[sector] = {
                "score": score,
                "keywords": matched_keywords
            }
    
    # Return the sector with the highest score
    if sector_scores:
        best_sector = max(sector_scores.items(), key=lambda x: x[1]["score"])
        sector_name = best_sector[0]
        matched_keywords = best_sector[1]["keywords"]
        
        # Return the most specific keyword as subsector
        subsector = max(matched_keywords, key=len) if matched_keywords else "General"
        
        return sector_name, subsector
    
    return "General", "General"

def infer_sector_with_confidence(text: str) -> Dict[str, any]:
    """
    Infer sector with confidence scoring and detailed analysis.
    Returns detailed sector analysis.
    """
    if not text or not text.strip():
        return {
            "sector": "General",
            "subsector": "General",
            "confidence": 0.0,
            "matched_keywords": [],
            "analysis": "No text provided"
        }
    
    text_lower = text.lower()
    sector_analysis = {}
    
    # Analyze each sector
    for sector, keywords in KEYWORD_MAP.items():
        if sector == "General":
            continue
            
        matched_keywords = []
        total_matches = 0
        
        for keyword in keywords:
            pattern = rf"\b{re.escape(keyword.lower())}\b"
            matches = re.findall(pattern, text_lower)
            
            if matches:
                matched_keywords.extend(matches)
                total_matches += len(matches)
        
        if total_matches > 0:
            sector_analysis[sector] = {
                "score": total_matches,
                "keywords": matched_keywords,
                "keyword_count": len(set(matched_keywords)),
                "total_matches": total_matches
            }
    
    # Find the best match
    if sector_analysis:
        best_sector = max(sector_analysis.items(), key=lambda x: x[1]["score"])
        sector_name = best_sector[0]
        analysis = best_sector[1]
        
        # Calculate confidence based on keyword diversity and frequency
        confidence = min(analysis["score"] / 10.0, 1.0)  # Cap at 1.0
        confidence += analysis["keyword_count"] * 0.1  # Bonus for keyword diversity
        
        # Get the most specific keyword as subsector
        subsector = max(analysis["keywords"], key=len) if analysis["keywords"] else "General"
        
        return {
            "sector": sector_name,
            "subsector": subsector,
            "confidence": min(confidence, 1.0),
            "matched_keywords": analysis["keywords"],
            "total_matches": analysis["total_matches"],
            "keyword_diversity": analysis["keyword_count"],
            "analysis": f"Matched {analysis['keyword_count']} unique keywords with {analysis['total_matches']} total matches"
        }
    
    return {
        "sector": "General",
        "subsector": "General",
        "confidence": 0.0,
        "matched_keywords": [],
        "analysis": "No sector-specific keywords found"
    }

def map_document_sectors(records: List[Dict]) -> List[Dict]:
    """
    Map sectors for a list of document records.
    Updates records in place with sector information.
    """
    mapped_count = 0
    sector_distribution = {}
    
    for record in records:
        if "content" not in record:
            continue
        
        for entry in record["content"]:
            if "text" not in entry:
                continue
            
            # Get sector analysis
            sector_info = infer_sector_with_confidence(entry["text"])
            
            # Add sector information to entry
            entry["sector"] = sector_info["sector"]
            entry["subsector"] = sector_info["subsector"]
            entry["sector_confidence"] = sector_info["confidence"]
            entry["sector_analysis"] = sector_info["analysis"]
            
            # Track distribution
            sector = sector_info["sector"]
            sector_distribution[sector] = sector_distribution.get(sector, 0) + 1
            mapped_count += 1
    
    print(f"📊 Sector mapping complete:")
    print(f"  - Records mapped: {mapped_count}")
    print(f"  - Sector distribution: {sector_distribution}")
    
    return records

def get_sector_statistics(records: List[Dict]) -> Dict[str, any]:
    """Get statistics about sector distribution in records"""
    sector_stats = {}
    total_records = 0
    
    for record in records:
        if "content" not in record:
            continue
        
        for entry in record["content"]:
            if "sector" not in entry:
                continue
            
            sector = entry["sector"]
            subsector = entry.get("subsector", "Unknown")
            confidence = entry.get("sector_confidence", 0.0)
            
            if sector not in sector_stats:
                sector_stats[sector] = {
                    "count": 0,
                    "subsectors": {},
                    "avg_confidence": 0.0,
                    "confidence_scores": []
                }
            
            sector_stats[sector]["count"] += 1
            sector_stats[sector]["confidence_scores"].append(confidence)
            
            if subsector not in sector_stats[sector]["subsectors"]:
                sector_stats[sector]["subsectors"][subsector] = 0
            sector_stats[sector]["subsectors"][subsector] += 1
            
            total_records += 1
    
    # Calculate average confidence for each sector
    for sector, stats in sector_stats.items():
        if stats["confidence_scores"]:
            stats["avg_confidence"] = sum(stats["confidence_scores"]) / len(stats["confidence_scores"])
        del stats["confidence_scores"]  # Remove raw scores to clean up output
    
    return {
        "total_records": total_records,
        "sector_distribution": sector_stats,
        "analysis_timestamp": datetime.now().isoformat()
    }

def update_keyword_map(new_keywords: Dict[str, List[str]]) -> bool:
    """Update the keyword map with new keywords"""
    try:
        # Merge with existing keywords
        updated_map = KEYWORD_MAP.copy()
        for sector, keywords in new_keywords.items():
            if sector in updated_map:
                # Merge keywords, removing duplicates
                existing = set(updated_map[sector])
                new = set(keywords)
                updated_map[sector] = list(existing.union(new))
            else:
                updated_map[sector] = keywords
        
        # Save updated map
        MAP_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(MAP_PATH, 'w', encoding='utf-8') as f:
            json.dump(updated_map, f, indent=2, ensure_ascii=False)
        
        # Reload the global map
        global KEYWORD_MAP
        KEYWORD_MAP = updated_map
        
        print(f"✅ Keyword map updated with {len(new_keywords)} sectors")
        return True
        
    except Exception as e:
        print(f"❌ Error updating keyword map: {e}")
        return False

if __name__ == "__main__":
    # Test the sector mapper
    test_texts = [
        "The hospital should ensure redundant backup generators.",
        "The school campus needs better access control systems.",
        "The power grid substation requires enhanced monitoring.",
        "The airport terminal lacks proper security screening.",
        "The bank should implement multi-factor authentication.",
        "The water treatment plant needs backup systems.",
        "The manufacturing facility should upgrade its control systems.",
        "The government building requires improved physical security."
    ]
    
    print("🧪 Testing sector mapper...")
    
    for text in test_texts:
        sector, subsector = infer_sector(text)
        analysis = infer_sector_with_confidence(text)
        
        print(f"\n📝 Text: {text}")
        print(f"   Sector: {sector} / Subsector: {subsector}")
        print(f"   Confidence: {analysis['confidence']:.2f}")
        print(f"   Keywords: {analysis['matched_keywords']}")
    
    # Test statistics
    print(f"\n📊 Available sectors: {list(KEYWORD_MAP.keys())}")
    print(f"📊 Total keyword entries: {sum(len(keywords) for keywords in KEYWORD_MAP.values())}")
