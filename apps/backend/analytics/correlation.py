"""
Cross-Sector Correlation Analysis for VOFC Engine
Identifies systemic risks and patterns across sectors
"""

import json
import numpy as np
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import sys
from collections import defaultdict, Counter

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from learning.vector_store import VOFCVectorStore

class CrossSectorCorrelation:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.vector_store = VOFCVectorStore(supabase_client)
        
        # Correlation configuration
        self.config = {
            "similarity_threshold": 0.8,
            "min_sector_count": 2,
            "max_correlations": 50,
            "analysis_window_days": 30
        }
        
        # Sector mapping for analysis
        self.sector_groups = {
            "Critical Infrastructure": ["Energy", "Transportation", "Healthcare"],
            "Public Services": ["Education", "Government", "Healthcare"],
            "Economic": ["Financial", "Transportation", "Energy"],
            "Security": ["Government", "Critical Infrastructure", "Healthcare"]
        }
    
    def analyze_cross_sector_patterns(self) -> Dict[str, Any]:
        """Analyze patterns across sectors to identify systemic risks"""
        print("🔍 Analyzing cross-sector patterns...")
        
        try:
            # Get vulnerabilities from all sectors
            all_vulnerabilities = self._get_all_vulnerabilities()
            
            # Find cross-sector similarities
            correlations = self._find_cross_sector_similarities(all_vulnerabilities)
            
            # Identify systemic risks
            systemic_risks = self._identify_systemic_risks(correlations)
            
            # Generate correlation insights
            insights = self._generate_correlation_insights(correlations, systemic_risks)
            
            # Store correlation data
            stored_count = self._store_correlation_data(correlations, systemic_risks)
            
            return {
                "vulnerabilities_analyzed": len(all_vulnerabilities),
                "correlations_found": len(correlations),
                "systemic_risks_identified": len(systemic_risks),
                "insights_generated": len(insights),
                "data_stored": stored_count,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error in cross-sector analysis: {e}")
            return {"error": str(e)}
    
    def _get_all_vulnerabilities(self) -> List[Dict[str, Any]]:
        """Get vulnerabilities from all sectors"""
        if not self.supabase:
            print("⚠️ Supabase not available for vulnerability analysis")
            return []
        
        try:
            # Get vulnerabilities with sector information
            result = self.supabase.table("vulnerabilities").select("id, vulnerability, sector, subsector").execute()
            vulnerabilities = result.data
            
            print(f"📊 Retrieved {len(vulnerabilities)} vulnerabilities for analysis")
            return vulnerabilities
            
        except Exception as e:
            print(f"❌ Error retrieving vulnerabilities: {e}")
            return []
    
    def _find_cross_sector_similarities(self, vulnerabilities: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find similarities between vulnerabilities across sectors"""
        correlations = []
        
        # Group vulnerabilities by sector
        sector_groups = defaultdict(list)
        for vuln in vulnerabilities:
            sector = vuln.get("sector", "Unknown")
            sector_groups[sector].append(vuln)
        
        # Compare vulnerabilities across sectors
        sectors = list(sector_groups.keys())
        
        for i, sector1 in enumerate(sectors):
            for sector2 in sectors[i+1:]:
                correlations.extend(self._compare_sectors(
                    sector_groups[sector1], 
                    sector_groups[sector2], 
                    sector1, 
                    sector2
                ))
        
        # Sort by similarity score
        correlations.sort(key=lambda x: x["similarity"], reverse=True)
        
        return correlations[:self.config["max_correlations"]]
    
    def _compare_sectors(self, vulns1: List[Dict], vulns2: List[Dict], sector1: str, sector2: str) -> List[Dict[str, Any]]:
        """Compare vulnerabilities between two sectors"""
        correlations = []
        
        for vuln1 in vulns1:
            for vuln2 in vulns2:
                # Calculate similarity
                similarity = self._calculate_text_similarity(
                    vuln1["vulnerability"], 
                    vuln2["vulnerability"]
                )
                
                if similarity >= self.config["similarity_threshold"]:
                    correlations.append({
                        "vulnerability1_id": vuln1["id"],
                        "vulnerability1_text": vuln1["vulnerability"],
                        "vulnerability1_sector": sector1,
                        "vulnerability2_id": vuln2["id"],
                        "vulnerability2_text": vuln2["vulnerability"],
                        "vulnerability2_sector": sector2,
                        "similarity": similarity,
                        "correlation_type": "cross_sector_similarity",
                        "created_at": datetime.now().isoformat()
                    })
        
        return correlations
    
    def _calculate_text_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two text strings"""
        try:
            # Simple word-based similarity
            words1 = set(text1.lower().split())
            words2 = set(text2.lower().split())
            
            if not words1 or not words2:
                return 0.0
            
            intersection = words1.intersection(words2)
            union = words1.union(words2)
            
            jaccard_similarity = len(intersection) / len(union)
            
            # Boost similarity for security-related keywords
            security_keywords = ["access", "control", "security", "authentication", "authorization", "encryption", "firewall", "intrusion", "malware", "phishing"]
            security_matches = len(intersection.intersection(set(security_keywords)))
            
            if security_matches > 0:
                jaccard_similarity += security_matches * 0.1
            
            return min(jaccard_similarity, 1.0)
            
        except Exception as e:
            print(f"❌ Error calculating similarity: {e}")
            return 0.0
    
    def _identify_systemic_risks(self, correlations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify systemic risks from correlations"""
        systemic_risks = []
        
        # Group correlations by vulnerability patterns
        pattern_groups = defaultdict(list)
        for correlation in correlations:
            # Create a pattern key based on common words
            pattern_key = self._extract_pattern_key(correlation)
            pattern_groups[pattern_key].append(correlation)
        
        # Identify patterns that appear across multiple sectors
        for pattern, correlations in pattern_groups.items():
            if len(correlations) >= self.config["min_sector_count"]:
                sectors_involved = set()
                for corr in correlations:
                    sectors_involved.add(corr["vulnerability1_sector"])
                    sectors_involved.add(corr["vulnerability2_sector"])
                
                if len(sectors_involved) >= 2:
                    systemic_risk = {
                        "pattern": pattern,
                        "sectors_affected": list(sectors_involved),
                        "correlation_count": len(correlations),
                        "avg_similarity": sum(c["similarity"] for c in correlations) / len(correlations),
                        "risk_level": self._calculate_risk_level(len(sectors_involved), len(correlations)),
                        "correlations": correlations,
                        "created_at": datetime.now().isoformat()
                    }
                    systemic_risks.append(systemic_risk)
        
        # Sort by risk level
        systemic_risks.sort(key=lambda x: x["risk_level"], reverse=True)
        
        return systemic_risks
    
    def _extract_pattern_key(self, correlation: Dict[str, Any]) -> str:
        """Extract a pattern key from correlation data"""
        text1 = correlation["vulnerability1_text"].lower()
        text2 = correlation["vulnerability2_text"].lower()
        
        # Find common words
        words1 = set(text1.split())
        words2 = set(text2.split())
        common_words = words1.intersection(words2)
        
        # Filter for meaningful words (length > 3)
        meaningful_words = [w for w in common_words if len(w) > 3]
        
        # Sort and join to create pattern key
        return "_".join(sorted(meaningful_words))
    
    def _calculate_risk_level(self, sector_count: int, correlation_count: int) -> str:
        """Calculate risk level based on sector count and correlation count"""
        if sector_count >= 4 and correlation_count >= 10:
            return "Critical"
        elif sector_count >= 3 and correlation_count >= 5:
            return "High"
        elif sector_count >= 2 and correlation_count >= 3:
            return "Medium"
        else:
            return "Low"
    
    def _generate_correlation_insights(self, correlations: List[Dict], systemic_risks: List[Dict]) -> List[Dict[str, Any]]:
        """Generate insights from correlation analysis"""
        insights = []
        
        # Insight 1: Most correlated sectors
        sector_pairs = defaultdict(int)
        for corr in correlations:
            pair = tuple(sorted([corr["vulnerability1_sector"], corr["vulnerability2_sector"]]))
            sector_pairs[pair] += 1
        
        top_pairs = sorted(sector_pairs.items(), key=lambda x: x[1], reverse=True)[:5]
        
        insights.append({
            "type": "sector_correlation",
            "title": "Most Correlated Sector Pairs",
            "data": [{"sectors": pair, "correlation_count": count} for pair, count in top_pairs],
            "priority": "High"
        })
        
        # Insight 2: High-risk systemic patterns
        critical_risks = [r for r in systemic_risks if r["risk_level"] == "Critical"]
        if critical_risks:
            insights.append({
                "type": "systemic_risk",
                "title": "Critical Systemic Risks Identified",
                "data": [{"pattern": r["pattern"], "sectors": r["sectors_affected"], "risk_level": r["risk_level"]} for r in critical_risks],
                "priority": "Critical"
            })
        
        # Insight 3: Emerging patterns
        recent_correlations = [c for c in correlations if c.get("created_at", "") > (datetime.now() - timedelta(days=7)).isoformat()]
        if len(recent_correlations) > len(correlations) * 0.3:
            insights.append({
                "type": "emerging_pattern",
                "title": "Emerging Cross-Sector Patterns",
                "data": {"recent_correlations": len(recent_correlations), "total_correlations": len(correlations)},
                "priority": "Medium"
            })
        
        return insights
    
    def _store_correlation_data(self, correlations: List[Dict], systemic_risks: List[Dict]) -> int:
        """Store correlation data in database"""
        if not self.supabase:
            return 0
        
        try:
            stored_count = 0
            
            # Store correlations
            if correlations:
                result = self.supabase.table("cross_sector_correlations").insert(correlations).execute()
                stored_count += len(result.data) if result.data else 0
            
            # Store systemic risks
            if systemic_risks:
                result = self.supabase.table("systemic_risks").insert(systemic_risks).execute()
                stored_count += len(result.data) if result.data else 0
            
            print(f"💾 Stored {stored_count} correlation records")
            return stored_count
            
        except Exception as e:
            print(f"❌ Error storing correlation data: {e}")
            return 0
    
    def get_correlation_dashboard(self) -> Dict[str, Any]:
        """Get correlation data for dashboard display"""
        if not self.supabase:
            return {"error": "Supabase not available"}
        
        try:
            # Get recent correlations
            since_date = (datetime.now() - timedelta(days=7)).isoformat()
            
            correlations_result = self.supabase.table("cross_sector_correlations").select("*").gte("created_at", since_date).execute()
            correlations = correlations_result.data
            
            systemic_risks_result = self.supabase.table("systemic_risks").select("*").gte("created_at", since_date).execute()
            systemic_risks = systemic_risks_result.data
            
            # Generate dashboard data
            dashboard = {
                "total_correlations": len(correlations),
                "total_systemic_risks": len(systemic_risks),
                "risk_levels": Counter([r["risk_level"] for r in systemic_risks]),
                "sector_pairs": self._get_top_sector_pairs(correlations),
                "recent_insights": self._get_recent_insights(correlations, systemic_risks)
            }
            
            return dashboard
            
        except Exception as e:
            return {"error": str(e)}
    
    def _get_top_sector_pairs(self, correlations: List[Dict]) -> List[Dict[str, Any]]:
        """Get top sector pairs from correlations"""
        sector_pairs = defaultdict(int)
        for corr in correlations:
            pair = tuple(sorted([corr["vulnerability1_sector"], corr["vulnerability2_sector"]]))
            sector_pairs[pair] += 1
        
        return [{"sectors": list(pair), "count": count} for pair, count in sorted(sector_pairs.items(), key=lambda x: x[1], reverse=True)[:10]]
    
    def _get_recent_insights(self, correlations: List[Dict], systemic_risks: List[Dict]) -> List[Dict[str, Any]]:
        """Get recent insights from correlation data"""
        insights = []
        
        # High similarity correlations
        high_similarity = [c for c in correlations if c.get("similarity", 0) > 0.9]
        if high_similarity:
            insights.append({
                "type": "high_similarity",
                "message": f"Found {len(high_similarity)} highly similar vulnerabilities across sectors",
                "priority": "High"
            })
        
        # Critical systemic risks
        critical_risks = [r for r in systemic_risks if r.get("risk_level") == "Critical"]
        if critical_risks:
            insights.append({
                "type": "critical_risk",
                "message": f"Identified {len(critical_risks)} critical systemic risks",
                "priority": "Critical"
            })
        
        return insights

if __name__ == "__main__":
    # Test the cross-sector correlation analysis
    analyzer = CrossSectorCorrelation()
    
    # Run analysis
    result = analyzer.analyze_cross_sector_patterns()
    
    print(f"Cross-sector analysis results:")
    print(f"  - Vulnerabilities analyzed: {result.get('vulnerabilities_analyzed', 0)}")
    print(f"  - Correlations found: {result.get('correlations_found', 0)}")
    print(f"  - Systemic risks identified: {result.get('systemic_risks_identified', 0)}")
    
    # Get dashboard data
    dashboard = analyzer.get_correlation_dashboard()
    print(f"Dashboard data: {dashboard}")
