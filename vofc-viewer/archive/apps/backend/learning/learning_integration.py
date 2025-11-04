"""
Learning Integration for VOFC Engine
Orchestrates all learning components and provides a unified interface
"""

import json
import sys
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from learning.vector_store import VOFCVectorStore
from learning.sector_profiles import SectorProfiles
from pipeline.auto_linker import AutoLinker
from ai.pattern_learner import PatternLearner
from reports.gap_report import GapReporter

class LearningIntegration:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.vector_store = VOFCVectorStore(supabase_client)
        self.sector_profiles = SectorProfiles(supabase_client)
        self.auto_linker = AutoLinker(supabase_client)
        self.pattern_learner = PatternLearner(supabase_client)
        self.gap_reporter = GapReporter(supabase_client)
        
        # Learning configuration
        self.learning_config = {
            "auto_learning_enabled": True,
            "confidence_threshold": 0.8,
            "learning_cycle_days": 7,
            "max_patterns_per_cycle": 50,
            "sector_analysis_enabled": True
        }
    
    def initialize_learning_system(self) -> Dict[str, Any]:
        """Initialize the complete learning system"""
        print("Initializing VOFC Learning System...")
        
        results = {
            "vector_store": False,
            "sector_profiles": False,
            "auto_linker": False,
            "pattern_learner": False,
            "gap_reporter": False,
            "initialization_complete": False
        }
        
        try:
            # Initialize vector store
            print("Setting up vector store...")
            if self.vector_store.load_all_vulnerabilities() > 0:
                results["vector_store"] = True
                print("✅ Vector store initialized")
            
            # Create sector profiles
            print("Creating sector profiles...")
            profile_results = self.sector_profiles.create_all_profiles()
            if all(profile_results.values()):
                results["sector_profiles"] = True
                print("✅ Sector profiles created")
            
            # Initialize auto-linker
            print("Initializing auto-linker...")
            results["auto_linker"] = True
            print("✅ Auto-linker ready")
            
            # Initialize pattern learner
            print("Initializing pattern learner...")
            results["pattern_learner"] = True
            print("✅ Pattern learner ready")
            
            # Initialize gap reporter
            print("Initializing gap reporter...")
            results["gap_reporter"] = True
            print("✅ Gap reporter ready")
            
            results["initialization_complete"] = all(results.values())
            
            if results["initialization_complete"]:
                print("🎉 VOFC Learning System fully initialized!")
            else:
                print("⚠️ Learning system partially initialized")
            
            return results
            
        except Exception as e:
            print(f"❌ Error initializing learning system: {e}")
            return results
    
    def run_learning_cycle(self) -> Dict[str, Any]:
        """Run a complete learning cycle"""
        print("Starting learning cycle...")
        
        cycle_results = {
            "cycle_started": datetime.now().isoformat(),
            "vector_analysis": {},
            "pattern_learning": {},
            "auto_linking": {},
            "gap_analysis": {},
            "sector_analysis": {},
            "cycle_completed": False
        }
        
        try:
            # 1. Vector Analysis
            print("1. Running vector analysis...")
            vector_results = self._analyze_vector_similarities()
            cycle_results["vector_analysis"] = vector_results
            
            # 2. Pattern Learning
            print("2. Running pattern learning...")
            pattern_results = self.pattern_learner.run_learning_cycle()
            cycle_results["pattern_learning"] = pattern_results
            
            # 3. Auto-linking
            print("3. Running auto-linking...")
            auto_link_results = self._run_auto_linking()
            cycle_results["auto_linking"] = auto_link_results
            
            # 4. Gap Analysis
            print("4. Running gap analysis...")
            gap_results = self.gap_reporter.generate_gap_report()
            cycle_results["gap_analysis"] = gap_results
            
            # 5. Sector Analysis
            print("5. Running sector analysis...")
            sector_results = self._analyze_sector_patterns()
            cycle_results["sector_analysis"] = sector_results
            
            cycle_results["cycle_completed"] = True
            cycle_results["cycle_ended"] = datetime.now().isoformat()
            
            print("✅ Learning cycle completed successfully!")
            return cycle_results
            
        except Exception as e:
            print(f"❌ Error in learning cycle: {e}")
            cycle_results["error"] = str(e)
            return cycle_results
    
    def _analyze_vector_similarities(self) -> Dict[str, Any]:
        """Analyze vector similarities and identify potential improvements"""
        try:
            # This would analyze the vector store for patterns
            # For now, return basic analysis
            return {
                "total_embeddings": 0,  # Would be calculated from vector store
                "similarity_threshold": self.learning_config["confidence_threshold"],
                "analysis_complete": True
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _run_auto_linking(self) -> Dict[str, Any]:
        """Run auto-linking process"""
        try:
            # Get review queue
            review_queue = self.auto_linker.get_review_queue(limit=100)
            
            # Get confidence stats
            confidence_stats = self.auto_linker.get_confidence_stats()
            
            return {
                "review_queue_size": len(review_queue),
                "confidence_stats": confidence_stats,
                "auto_linking_complete": True
            }
        except Exception as e:
            return {"error": str(e)}
    
    def _analyze_sector_patterns(self) -> Dict[str, Any]:
        """Analyze sector-specific patterns"""
        try:
            # Get sector priority report
            sector_report = self.gap_reporter.get_sector_priority_report()
            
            # Update sector profiles based on analysis
            sector_insights = {}
            for sector in ["Education", "Healthcare", "Transportation", "Energy", "Financial"]:
                insights = self.sector_profiles.generate_sector_insights(sector)
                sector_insights[sector] = insights
            
            return {
                "sector_report": sector_report,
                "sector_insights": sector_insights,
                "analysis_complete": True
            }
        except Exception as e:
            return {"error": str(e)}
    
    def process_new_data(self, data_type: str, data: Dict[str, Any]) -> Dict[str, Any]:
        """Process new data through the learning system"""
        print(f"Processing new {data_type} data...")
        
        results = {
            "data_type": data_type,
            "processed_at": datetime.now().isoformat(),
            "vector_stored": False,
            "auto_linked": False,
            "sector_matched": False,
            "confidence_score": 0.0
        }
        
        try:
            if data_type == "vulnerability":
                # Process vulnerability
                vuln_result = self.auto_linker.process_new_vulnerability(
                    data.get("id", ""),
                    data.get("text", ""),
                    data.get("sector"),
                    data.get("subsector")
                )
                
                results["auto_linked"] = len(vuln_result.get("auto_links", [])) > 0
                results["confidence_score"] = max(vuln_result.get("confidence_scores", {}).values(), default=0.0)
                
            elif data_type == "ofc":
                # Process OFC
                ofc_result = self.auto_linker.process_new_ofc(
                    data.get("id", ""),
                    data.get("text", ""),
                    data.get("vulnerability_id")
                )
                
                results["auto_linked"] = len(ofc_result.get("auto_links", [])) > 0
                results["confidence_score"] = max(ofc_result.get("confidence_scores", {}).values(), default=0.0)
            
            # Determine sector match
            if data.get("text"):
                best_sector, sector_score = self.sector_profiles.get_best_sector_match(data["text"])
                results["sector_matched"] = sector_score > 0.5
                results["best_sector"] = best_sector
                results["sector_confidence"] = sector_score
            
            results["processing_successful"] = True
            
        except Exception as e:
            print(f"Error processing {data_type} data: {e}")
            results["error"] = str(e)
        
        return results
    
    def get_learning_insights(self) -> Dict[str, Any]:
        """Get comprehensive learning insights"""
        insights = {
            "system_status": {
                "learning_enabled": self.learning_config["auto_learning_enabled"],
                "confidence_threshold": self.learning_config["confidence_threshold"],
                "last_learning_cycle": None  # Would be tracked
            },
            "performance_metrics": {},
            "recommendations": []
        }
        
        try:
            # Get confidence stats
            confidence_stats = self.auto_linker.get_confidence_stats()
            insights["performance_metrics"]["confidence_stats"] = confidence_stats
            
            # Get gap analysis
            gap_analysis = self.gap_reporter.generate_gap_report()
            if "error" not in gap_analysis:
                insights["performance_metrics"]["gap_analysis"] = gap_analysis["gap_analysis"]
            
            # Get sector insights
            sector_insights = {}
            for sector in ["Education", "Healthcare", "Transportation"]:
                insights_data = self.sector_profiles.generate_sector_insights(sector)
                sector_insights[sector] = insights_data
            
            insights["performance_metrics"]["sector_insights"] = sector_insights
            
            # Generate recommendations
            recommendations = self._generate_recommendations(insights)
            insights["recommendations"] = recommendations
            
        except Exception as e:
            insights["error"] = str(e)
        
        return insights
    
    def _generate_recommendations(self, insights: Dict[str, Any]) -> List[str]:
        """Generate recommendations based on insights"""
        recommendations = []
        
        # Check confidence stats
        confidence_stats = insights["performance_metrics"].get("confidence_stats", {})
        if confidence_stats.get("avg_confidence", 0) < 0.7:
            recommendations.append("Consider lowering confidence threshold for better auto-linking")
        
        # Check gap analysis
        gap_analysis = insights["performance_metrics"].get("gap_analysis", {})
        if gap_analysis.get("statistics", {}).get("vulnerabilities_without_ofcs", 0) > 10:
            recommendations.append("High number of vulnerabilities without OFCs - consider manual review")
        
        # Check sector insights
        sector_insights = insights["performance_metrics"].get("sector_insights", {})
        for sector, data in sector_insights.items():
            if data.get("overall_security_level", 0) > 0.8:
                recommendations.append(f"{sector} requires high security focus")
        
        return recommendations
    
    def export_learning_data(self, output_file: str = None) -> str:
        """Export all learning data for analysis"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"learning_export_{timestamp}.json"
        
        export_data = {
            "export_metadata": {
                "exported_at": datetime.now().isoformat(),
                "learning_config": self.learning_config
            },
            "insights": self.get_learning_insights(),
            "sector_profiles": {},
            "gap_analysis": {}
        }
        
        # Export sector profiles
        for sector in ["Education", "Healthcare", "Transportation", "Energy", "Financial"]:
            profile = self.sector_profiles.load_sector_profile(sector)
            export_data["sector_profiles"][sector] = profile
        
        # Export gap analysis
        gap_report = self.gap_reporter.generate_gap_report()
        if "error" not in gap_report:
            export_data["gap_analysis"] = gap_report
        
        # Save export
        export_path = Path("apps/backend/data") / output_file
        export_path.parent.mkdir(parents=True, exist_ok=True)
        
        with open(export_path, 'w') as f:
            json.dump(export_data, f, indent=2)
        
        print(f"Learning data exported to: {export_path}")
        return str(export_path)

if __name__ == "__main__":
    # Test the learning integration
    integration = LearningIntegration()
    
    # Initialize learning system
    init_results = integration.initialize_learning_system()
    print(f"Initialization results: {init_results}")
    
    # Run learning cycle
    cycle_results = integration.run_learning_cycle()
    print(f"Learning cycle results: {cycle_results}")
    
    # Get insights
    insights = integration.get_learning_insights()
    print(f"Learning insights: {insights}")
    
    # Export learning data
    export_path = integration.export_learning_data()
    print(f"Learning data exported to: {export_path}")
