"""
Proactive Recommendations System for VOFC Engine
Suggests mitigations and OFCs before users ask
"""

import json
import requests
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

class ProactiveRecommendations:
    def __init__(self, supabase_client=None, ollama_base_url: str = "http://localhost:11434"):
        self.supabase = supabase_client
        self.ollama_base_url = ollama_base_url
        self.model = "llama3:latest"
        
        # Recommendation configuration
        self.config = {
            "min_gap_threshold": 0.3,  # Minimum gap percentage to trigger recommendations
            "max_recommendations": 5,
            "confidence_threshold": 0.7,
            "sector_priorities": {
                "Critical Infrastructure": 10,
                "Healthcare": 9,
                "Energy": 8,
                "Transportation": 7,
                "Education": 6,
                "Financial": 5
            }
        }
        
        # Alert channels
        self.alert_channels = {
            "email": False,
            "webhook": False,
            "database": True,
            "console": True
        }
    
    def check_gaps_and_suggest(self) -> Dict[str, Any]:
        """Check for gaps and generate proactive suggestions"""
        print("🔍 Checking for gaps and generating suggestions...")
        
        try:
            # Get vulnerabilities without OFCs
            gap_data = self._get_gap_data()
            
            suggestions = []
            for gap in gap_data:
                if self._should_suggest_for_gap(gap):
                    suggestion = self._generate_suggestion(gap)
                    if suggestion:
                        suggestions.append(suggestion)
            
            # Store suggestions
            stored_count = self._store_suggestions(suggestions)
            
            # Send alerts for high-priority suggestions
            alert_count = self._send_alerts(suggestions)
            
            return {
                "gaps_analyzed": len(gap_data),
                "suggestions_generated": len(suggestions),
                "suggestions_stored": stored_count,
                "alerts_sent": alert_count,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error in gap checking: {e}")
            return {"error": str(e)}
    
    def _get_gap_data(self) -> List[Dict[str, Any]]:
        """Get vulnerability data with gap analysis"""
        if not self.supabase:
            print("⚠️ Supabase not available for gap analysis")
            return []
        
        try:
            # Get vulnerabilities without OFCs
            result = self.supabase.rpc('get_gap_report', {'sector_filter': None}).execute()
            gap_data = result.data
            
            # Filter for vulnerabilities without OFCs
            gaps = [v for v in gap_data if not v.get("has_ofcs", False)]
            
            print(f"📊 Found {len(gaps)} vulnerabilities without OFCs")
            return gaps
            
        except Exception as e:
            print(f"❌ Error getting gap data: {e}")
            return []
    
    def _should_suggest_for_gap(self, gap: Dict[str, Any]) -> bool:
        """Determine if we should generate suggestions for this gap"""
        sector = gap.get("sector", "Unknown")
        priority = self.config["sector_priorities"].get(sector, 1)
        
        # Higher priority sectors get more attention
        return priority >= 5
    
    def _generate_suggestion(self, gap: Dict[str, Any]) -> Dict[str, Any]:
        """Generate a proactive suggestion for a gap"""
        try:
            vulnerability_text = gap.get("vulnerability_text", "")
            sector = gap.get("sector", "Unknown")
            subsector = gap.get("subsector", "Unknown")
            
            # Create context for Ollama
            context = f"""
            Vulnerability: {vulnerability_text}
            Sector: {sector}
            Subsector: {subsector}
            
            Generate 3-5 specific Options for Consideration (OFCs) that would address this vulnerability.
            Focus on practical, actionable mitigations appropriate for the {sector} sector.
            """
            
            # Call Ollama for suggestions
            suggestions = self._call_ollama_for_suggestions(context)
            
            if suggestions:
                return {
                    "vulnerability_id": gap.get("vulnerability_id"),
                    "vulnerability_text": vulnerability_text,
                    "sector": sector,
                    "subsector": subsector,
                    "suggested_ofcs": suggestions,
                    "confidence": 0.8,  # High confidence for AI-generated suggestions
                    "generated_at": datetime.now().isoformat(),
                    "priority": self.config["sector_priorities"].get(sector, 1)
                }
            
            return None
            
        except Exception as e:
            print(f"❌ Error generating suggestion: {e}")
            return None
    
    def _call_ollama_for_suggestions(self, context: str) -> List[str]:
        """Call Ollama to generate OFC suggestions"""
        try:
            response = requests.post(
                f"{self.ollama_base_url}/api/chat",
                json={
                    "model": self.model,
                    "messages": [
                        {
                            "role": "system",
                            "content": "You are a cybersecurity expert specializing in vulnerability mitigation. Generate specific, actionable Options for Consideration (OFCs) for the given vulnerability. Focus on practical solutions that can be implemented by the organization."
                        },
                        {
                            "role": "user",
                            "content": context
                        }
                    ],
                    "stream": False,
                    "options": {
                        "temperature": 0.7,
                        "top_p": 0.9
                    }
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("message", {}).get("content", "")
                
                # Parse the response to extract OFCs
                ofcs = self._parse_ofc_suggestions(content)
                return ofcs
            else:
                print(f"❌ Ollama API error: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Error calling Ollama: {e}")
            return []
    
    def _parse_ofc_suggestions(self, content: str) -> List[str]:
        """Parse OFC suggestions from Ollama response"""
        try:
            # Simple parsing - look for bullet points or numbered lists
            lines = content.split('\n')
            ofcs = []
            
            for line in lines:
                line = line.strip()
                if line and (line.startswith('-') or line.startswith('•') or line.startswith('*') or line.startswith('1.') or line.startswith('2.') or line.startswith('3.')):
                    # Clean up the line
                    ofc = line.lstrip('-•*123456789. ').strip()
                    if len(ofc) > 10:  # Only include substantial suggestions
                        ofcs.append(ofc)
            
            # If no bullet points found, try to split by sentences
            if not ofcs:
                sentences = content.split('.')
                for sentence in sentences:
                    sentence = sentence.strip()
                    if len(sentence) > 20 and any(word in sentence.lower() for word in ['implement', 'establish', 'create', 'develop', 'install', 'configure']):
                        ofcs.append(sentence)
            
            return ofcs[:5]  # Limit to 5 suggestions
            
        except Exception as e:
            print(f"❌ Error parsing OFC suggestions: {e}")
            return []
    
    def _store_suggestions(self, suggestions: List[Dict[str, Any]]) -> int:
        """Store suggestions in the database"""
        if not self.supabase or not suggestions:
            return 0
        
        try:
            # Store in suggestions table
            result = self.supabase.table("proactive_suggestions").insert(suggestions).execute()
            stored_count = len(result.data) if result.data else 0
            
            print(f"💾 Stored {stored_count} proactive suggestions")
            return stored_count
            
        except Exception as e:
            print(f"❌ Error storing suggestions: {e}")
            return 0
    
    def _send_alerts(self, suggestions: List[Dict[str, Any]]) -> int:
        """Send alerts for high-priority suggestions"""
        if not suggestions:
            return 0
        
        alert_count = 0
        
        # Filter high-priority suggestions
        high_priority = [s for s in suggestions if s.get("priority", 0) >= 8]
        
        for suggestion in high_priority:
            try:
                # Console alert
                if self.alert_channels["console"]:
                    print(f"🚨 HIGH PRIORITY SUGGESTION:")
                    print(f"   Vulnerability: {suggestion['vulnerability_text'][:100]}...")
                    print(f"   Sector: {suggestion['sector']}")
                    print(f"   Suggested OFCs: {len(suggestion['suggested_ofcs'])}")
                    print(f"   Priority: {suggestion['priority']}")
                
                # Database alert
                if self.alert_channels["database"] and self.supabase:
                    self.supabase.table("alerts").insert({
                        "type": "proactive_suggestion",
                        "priority": suggestion["priority"],
                        "vulnerability_id": suggestion["vulnerability_id"],
                        "message": f"Generated {len(suggestion['suggested_ofcs'])} OFC suggestions for {suggestion['sector']} vulnerability",
                        "created_at": datetime.now().isoformat()
                    }).execute()
                
                alert_count += 1
                
            except Exception as e:
                print(f"❌ Error sending alert: {e}")
        
        return alert_count
    
    def get_suggestion_summary(self, days_back: int = 7) -> Dict[str, Any]:
        """Get summary of recent suggestions"""
        if not self.supabase:
            return {"error": "Supabase not available"}
        
        try:
            since_date = (datetime.now() - timedelta(days=days_back)).isoformat()
            
            result = self.supabase.table("proactive_suggestions").select("*").gte("generated_at", since_date).execute()
            suggestions = result.data
            
            # Analyze suggestions
            sector_counts = {}
            total_suggestions = 0
            
            for suggestion in suggestions:
                sector = suggestion.get("sector", "Unknown")
                sector_counts[sector] = sector_counts.get(sector, 0) + 1
                total_suggestions += len(suggestion.get("suggested_ofcs", []))
            
            return {
                "period_days": days_back,
                "total_suggestions": len(suggestions),
                "total_ofcs_generated": total_suggestions,
                "sector_breakdown": sector_counts,
                "average_ofcs_per_suggestion": total_suggestions / len(suggestions) if suggestions else 0
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def run_proactive_cycle(self) -> Dict[str, Any]:
        """Run a complete proactive recommendation cycle"""
        print("🔄 Running proactive recommendation cycle...")
        
        # Check gaps and generate suggestions
        gap_result = self.check_gaps_and_suggest()
        
        # Get summary
        summary = self.get_suggestion_summary()
        
        return {
            "gap_analysis": gap_result,
            "summary": summary,
            "cycle_completed": True,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Test the proactive recommendations system
    recommender = ProactiveRecommendations()
    
    # Run proactive cycle
    result = recommender.run_proactive_cycle()
    
    print(f"Proactive cycle results:")
    print(f"  - Gaps analyzed: {result['gap_analysis'].get('gaps_analyzed', 0)}")
    print(f"  - Suggestions generated: {result['gap_analysis'].get('suggestions_generated', 0)}")
    print(f"  - Alerts sent: {result['gap_analysis'].get('alerts_sent', 0)}")
    
    # Get summary
    summary = recommender.get_suggestion_summary()
    print(f"Summary: {summary}")
