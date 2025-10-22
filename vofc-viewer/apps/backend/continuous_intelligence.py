"""
Continuous Intelligence System for VOFC Engine
Orchestrates all Phase 5 capabilities for autonomous operation
"""

import json
import time
import schedule
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent))

from learning.continuous_learning import ContinuousLearningDaemon
from alerts.suggestions import ProactiveRecommendations
from analytics.correlation import CrossSectorCorrelation
from realtime.dashboard_updates import RealTimeDashboard
from ollama.adaptive_prompts import AdaptivePrompts

class ContinuousIntelligence:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        
        # Initialize all components
        self.continuous_learning = ContinuousLearningDaemon(supabase_client)
        self.proactive_recommendations = ProactiveRecommendations(supabase_client)
        self.correlation_analyzer = CrossSectorCorrelation(supabase_client)
        self.dashboard_updates = RealTimeDashboard(supabase_client)
        self.adaptive_prompts = AdaptivePrompts(supabase_client)
        
        # Intelligence configuration
        self.config = {
            "enable_continuous_learning": True,
            "enable_proactive_recommendations": True,
            "enable_correlation_analysis": True,
            "enable_realtime_updates": True,
            "enable_adaptive_prompts": True,
            "learning_interval_hours": 4,
            "recommendation_interval_hours": 6,
            "correlation_interval_hours": 12,
            "prompt_adaptation_interval_hours": 8
        }
        
        # Intelligence state
        self.intelligence_state = {
            "last_learning_run": None,
            "last_recommendation_run": None,
            "last_correlation_run": None,
            "last_prompt_adaptation": None,
            "total_cycles_completed": 0,
            "system_health": "healthy"
        }
    
    def start_intelligence_system(self):
        """Start the complete continuous intelligence system"""
        print("🧠 Starting Continuous Intelligence System...")
        
        try:
            # Schedule all intelligence components
            self._schedule_components()
            
            # Start real-time updates
            if self.config["enable_realtime_updates"]:
                self.dashboard_updates.start_realtime_updates()
            
            # Run initial intelligence cycle
            self.run_intelligence_cycle()
            
            print("✅ Continuous Intelligence System started")
            print("🔄 System will run autonomously with scheduled cycles")
            
            # Keep the system running
            while True:
                try:
                    schedule.run_pending()
                    time.sleep(60)  # Check every minute
                except KeyboardInterrupt:
                    print("🛑 Stopping Continuous Intelligence System...")
                    self.stop_intelligence_system()
                    break
                except Exception as e:
                    print(f"❌ Error in intelligence loop: {e}")
                    time.sleep(300)  # Wait 5 minutes before retrying
                    
        except Exception as e:
            print(f"❌ Error starting intelligence system: {e}")
    
    def _schedule_components(self):
        """Schedule all intelligence components"""
        # Continuous learning
        if self.config["enable_continuous_learning"]:
            schedule.every(self.config["learning_interval_hours"]).hours.do(
                self._run_continuous_learning
            )
            print(f"📅 Scheduled continuous learning every {self.config['learning_interval_hours']} hours")
        
        # Proactive recommendations
        if self.config["enable_proactive_recommendations"]:
            schedule.every(self.config["recommendation_interval_hours"]).hours.do(
                self._run_proactive_recommendations
            )
            print(f"📅 Scheduled proactive recommendations every {self.config['recommendation_interval_hours']} hours")
        
        # Correlation analysis
        if self.config["enable_correlation_analysis"]:
            schedule.every(self.config["correlation_interval_hours"]).hours.do(
                self._run_correlation_analysis
            )
            print(f"📅 Scheduled correlation analysis every {self.config['correlation_interval_hours']} hours")
        
        # Adaptive prompts
        if self.config["enable_adaptive_prompts"]:
            schedule.every(self.config["prompt_adaptation_interval_hours"]).hours.do(
                self._run_adaptive_prompts
            )
            print(f"📅 Scheduled prompt adaptation every {self.config['prompt_adaptation_interval_hours']} hours")
    
    def run_intelligence_cycle(self) -> Dict[str, Any]:
        """Run a complete intelligence cycle"""
        print("🔄 Running complete intelligence cycle...")
        
        cycle_results = {
            "cycle_started": datetime.now().isoformat(),
            "continuous_learning": {},
            "proactive_recommendations": {},
            "correlation_analysis": {},
            "adaptive_prompts": {},
            "cycle_completed": False
        }
        
        try:
            # 1. Continuous Learning
            if self.config["enable_continuous_learning"]:
                print("1. Running continuous learning...")
                learning_result = self._run_continuous_learning()
                cycle_results["continuous_learning"] = learning_result
            
            # 2. Proactive Recommendations
            if self.config["enable_proactive_recommendations"]:
                print("2. Running proactive recommendations...")
                recommendation_result = self._run_proactive_recommendations()
                cycle_results["proactive_recommendations"] = recommendation_result
            
            # 3. Correlation Analysis
            if self.config["enable_correlation_analysis"]:
                print("3. Running correlation analysis...")
                correlation_result = self._run_correlation_analysis()
                cycle_results["correlation_analysis"] = correlation_result
            
            # 4. Adaptive Prompts
            if self.config["enable_adaptive_prompts"]:
                print("4. Running adaptive prompts...")
                prompt_result = self._run_adaptive_prompts()
                cycle_results["adaptive_prompts"] = prompt_result
            
            # Update intelligence state
            self.intelligence_state["total_cycles_completed"] += 1
            self.intelligence_state["last_learning_run"] = datetime.now().isoformat()
            
            cycle_results["cycle_completed"] = True
            cycle_results["cycle_ended"] = datetime.now().isoformat()
            
            print("✅ Intelligence cycle completed successfully!")
            return cycle_results
            
        except Exception as e:
            print(f"❌ Error in intelligence cycle: {e}")
            cycle_results["error"] = str(e)
            self.intelligence_state["system_health"] = "degraded"
            return cycle_results
    
    def _run_continuous_learning(self) -> Dict[str, Any]:
        """Run continuous learning component"""
        try:
            result = self.continuous_learning.run_learning_cycle()
            self.intelligence_state["last_learning_run"] = datetime.now().isoformat()
            return result
        except Exception as e:
            print(f"❌ Error in continuous learning: {e}")
            return {"error": str(e)}
    
    def _run_proactive_recommendations(self) -> Dict[str, Any]:
        """Run proactive recommendations component"""
        try:
            result = self.proactive_recommendations.run_proactive_cycle()
            self.intelligence_state["last_recommendation_run"] = datetime.now().isoformat()
            return result
        except Exception as e:
            print(f"❌ Error in proactive recommendations: {e}")
            return {"error": str(e)}
    
    def _run_correlation_analysis(self) -> Dict[str, Any]:
        """Run correlation analysis component"""
        try:
            result = self.correlation_analyzer.analyze_cross_sector_patterns()
            self.intelligence_state["last_correlation_run"] = datetime.now().isoformat()
            return result
        except Exception as e:
            print(f"❌ Error in correlation analysis: {e}")
            return {"error": str(e)}
    
    def _run_adaptive_prompts(self) -> Dict[str, Any]:
        """Run adaptive prompts component"""
        try:
            result = self.adaptive_prompts.run_adaptive_cycle()
            self.intelligence_state["last_prompt_adaptation"] = datetime.now().isoformat()
            return result
        except Exception as e:
            print(f"❌ Error in adaptive prompts: {e}")
            return {"error": str(e)}
    
    def get_intelligence_status(self) -> Dict[str, Any]:
        """Get current intelligence system status"""
        return {
            "system_status": "running" if self.config["enable_continuous_learning"] else "stopped",
            "intelligence_state": self.intelligence_state,
            "config": self.config,
            "component_status": {
                "continuous_learning": self.continuous_learning.get_learning_status(),
                "dashboard_updates": self.dashboard_updates.get_dashboard_metrics(),
                "adaptive_prompts": self.adaptive_prompts.get_prompt_evolution_summary()
            }
        }
    
    def get_intelligence_insights(self) -> Dict[str, Any]:
        """Get comprehensive intelligence insights"""
        insights = {
            "system_overview": self.get_intelligence_status(),
            "learning_insights": {},
            "recommendation_insights": {},
            "correlation_insights": {},
            "prompt_insights": {}
        }
        
        try:
            # Get learning insights
            learning_status = self.continuous_learning.get_learning_status()
            insights["learning_insights"] = {
                "total_events_processed": learning_status.get("learning_stats", {}).get("total_events_processed", 0),
                "successful_retrains": learning_status.get("learning_stats", {}).get("successful_retrains", 0),
                "last_learning_run": learning_status.get("last_learning_run")
            }
            
            # Get recommendation insights
            recommendation_summary = self.proactive_recommendations.get_suggestion_summary()
            insights["recommendation_insights"] = recommendation_summary
            
            # Get correlation insights
            correlation_dashboard = self.correlation_analyzer.get_correlation_dashboard()
            insights["correlation_insights"] = correlation_dashboard
            
            # Get prompt insights
            prompt_evolution = self.adaptive_prompts.get_prompt_evolution_summary()
            insights["prompt_insights"] = prompt_evolution
            
        except Exception as e:
            insights["error"] = str(e)
        
        return insights
    
    def force_intelligence_cycle(self):
        """Force an immediate intelligence cycle"""
        print("🔄 Forcing immediate intelligence cycle...")
        return self.run_intelligence_cycle()
    
    def stop_intelligence_system(self):
        """Stop the continuous intelligence system"""
        print("🛑 Stopping Continuous Intelligence System...")
        
        try:
            # Stop all components
            self.continuous_learning.stop_daemon()
            self.dashboard_updates.stop_realtime_updates()
            
            # Clear all schedules
            schedule.clear()
            
            # Update state
            self.intelligence_state["system_health"] = "stopped"
            
            print("✅ Continuous Intelligence System stopped")
            
        except Exception as e:
            print(f"❌ Error stopping intelligence system: {e}")
    
    def update_config(self, new_config: Dict[str, Any]):
        """Update intelligence system configuration"""
        try:
            self.config.update(new_config)
            print(f"📝 Updated intelligence configuration: {new_config}")
            
            # Restart scheduling if needed
            if "learning_interval_hours" in new_config:
                schedule.clear()
                self._schedule_components()
            
            return True
            
        except Exception as e:
            print(f"❌ Error updating configuration: {e}")
            return False
    
    def export_intelligence_data(self, output_file: str = None) -> str:
        """Export all intelligence data for analysis"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"intelligence_export_{timestamp}.json"
        
        try:
            # Gather all intelligence data
            export_data = {
                "export_metadata": {
                    "exported_at": datetime.now().isoformat(),
                    "intelligence_config": self.config,
                    "intelligence_state": self.intelligence_state
                },
                "insights": self.get_intelligence_insights(),
                "learning_data": self.continuous_learning.get_learning_status(),
                "recommendation_data": self.proactive_recommendations.get_suggestion_summary(),
                "correlation_data": self.correlation_analyzer.get_correlation_dashboard(),
                "prompt_data": self.adaptive_prompts.get_prompt_evolution_summary()
            }
            
            # Save export
            export_path = Path("apps/backend/data") / output_file
            export_path.parent.mkdir(parents=True, exist_ok=True)
            
            with open(export_path, 'w') as f:
                json.dump(export_data, f, indent=2)
            
            print(f"📊 Intelligence data exported to: {export_path}")
            return str(export_path)
            
        except Exception as e:
            print(f"❌ Error exporting intelligence data: {e}")
            return ""

if __name__ == "__main__":
    # Test the continuous intelligence system
    intelligence = ContinuousIntelligence()
    
    # Get initial status
    status = intelligence.get_intelligence_status()
    print(f"Initial intelligence status: {status}")
    
    # Run a test intelligence cycle
    cycle_result = intelligence.run_intelligence_cycle()
    print(f"Intelligence cycle result: {cycle_result}")
    
    # Get insights
    insights = intelligence.get_intelligence_insights()
    print(f"Intelligence insights: {insights}")
    
    # Export data
    export_path = intelligence.export_intelligence_data()
    print(f"Intelligence data exported to: {export_path}")
    
    # Note: In production, you would start the system with:
    # intelligence.start_intelligence_system()
