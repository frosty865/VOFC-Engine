"""
Continuous Learning Daemon for VOFC Engine
Automatically retrains embeddings and rules based on human feedback
"""

import json
import time
import schedule
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from learning.vector_store import VOFCVectorStore
from learning.sector_profiles import SectorProfiles
from ai.pattern_learner import PatternLearner
from pipeline.auto_linker import AutoLinker

class ContinuousLearningDaemon:
    def __init__(self, supabase_client=None, check_interval_hours: int = 4):
        self.supabase = supabase_client
        self.vector_store = VOFCVectorStore(supabase_client)
        self.sector_profiles = SectorProfiles(supabase_client)
        self.pattern_learner = PatternLearner(supabase_client)
        self.auto_linker = AutoLinker(supabase_client)
        self.check_interval_hours = check_interval_hours
        
        # Learning configuration
        self.config = {
            "min_events_for_retrain": 10,
            "confidence_threshold": 0.8,
            "max_retrain_events": 1000,
            "learning_rate": 0.1,
            "enable_continuous_learning": True
        }
        
        # Learning state tracking
        self.last_learning_run = None
        self.learning_stats = {
            "total_events_processed": 0,
            "successful_retrains": 0,
            "failed_retrains": 0,
            "rules_generated": 0,
            "embeddings_updated": 0
        }
    
    def start_daemon(self):
        """Start the continuous learning daemon"""
        print(f"🧠 Starting Continuous Learning Daemon (checking every {self.check_interval_hours} hours)")
        
        # Schedule the learning check
        schedule.every(self.check_interval_hours).hours.do(self.run_learning_cycle)
        
        # Run initial learning cycle
        self.run_learning_cycle()
        
        # Keep the daemon running
        while True:
            try:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
            except KeyboardInterrupt:
                print("🛑 Stopping Continuous Learning Daemon...")
                break
            except Exception as e:
                print(f"❌ Error in daemon loop: {e}")
                time.sleep(300)  # Wait 5 minutes before retrying
    
    def run_learning_cycle(self):
        """Run a complete learning cycle"""
        print(f"🔄 Running learning cycle at {datetime.now().isoformat()}")
        
        try:
            # 1. Process recent learning events
            events_processed = self._process_recent_events()
            
            # 2. Update vector embeddings
            embeddings_updated = self._update_embeddings()
            
            # 3. Generate new rules
            rules_generated = self._generate_rules()
            
            # 4. Update sector profiles
            profiles_updated = self._update_sector_profiles()
            
            # 5. Retrain auto-linker
            retrain_success = self._retrain_auto_linker()
            
            # Update stats
            self.learning_stats["total_events_processed"] += events_processed
            self.learning_stats["embeddings_updated"] += embeddings_updated
            self.learning_stats["rules_generated"] += rules_generated
            
            if retrain_success:
                self.learning_stats["successful_retrains"] += 1
            else:
                self.learning_stats["failed_retrains"] += 1
            
            self.last_learning_run = datetime.now().isoformat()
            
            print(f"✅ Learning cycle completed:")
            print(f"  - Events processed: {events_processed}")
            print(f"  - Embeddings updated: {embeddings_updated}")
            print(f"  - Rules generated: {rules_generated}")
            print(f"  - Profiles updated: {profiles_updated}")
            print(f"  - Auto-linker retrained: {retrain_success}")
            
            # Save learning state
            self._save_learning_state()
            
        except Exception as e:
            print(f"❌ Error in learning cycle: {e}")
            self.learning_stats["failed_retrains"] += 1
    
    def _process_recent_events(self) -> int:
        """Process recent learning events for retraining"""
        if not self.supabase:
            print("⚠️ Supabase not available for event processing")
            return 0
        
        try:
            # Get events from the last learning cycle
            since_time = self.last_learning_run or (datetime.now() - timedelta(hours=self.check_interval_hours)).isoformat()
            
            result = self.supabase.table("learning_events").select("*").gte("created_at", since_time).execute()
            events = result.data
            
            print(f"📊 Processing {len(events)} recent learning events")
            
            # Process each event
            processed_count = 0
            for event in events:
                if self._process_learning_event(event):
                    processed_count += 1
            
            return processed_count
            
        except Exception as e:
            print(f"❌ Error processing events: {e}")
            return 0
    
    def _process_learning_event(self, event: Dict[str, Any]) -> bool:
        """Process a single learning event"""
        try:
            event_type = event.get("event_type", "")
            approved = event.get("approved", False)
            confidence = event.get("confidence", 0.0)
            
            # Only process approved events with sufficient confidence
            if not approved or confidence < self.config["confidence_threshold"]:
                return False
            
            # Update vector weights based on event type
            if event_type in ["link_approved", "vulnerability_processed"]:
                source_id = event.get("source_id")
                target_id = event.get("target_id")
                
                if source_id and target_id:
                    self._update_vector_weights(source_id, target_id, confidence)
                    return True
            
            return False
            
        except Exception as e:
            print(f"❌ Error processing event {event.get('id', 'unknown')}: {e}")
            return False
    
    def _update_vector_weights(self, source_id: str, target_id: str, confidence: float):
        """Update vector weights based on successful matches"""
        try:
            # This would update the similarity cache with improved weights
            # For now, we'll cache the similarity with the confidence score
            self.vector_store.cache_similarity(source_id, target_id, confidence)
            
            # Update learning rate based on confidence
            learning_rate = self.config["learning_rate"] * confidence
            
            print(f"📈 Updated weights for {source_id} -> {target_id} (confidence: {confidence:.3f}, rate: {learning_rate:.3f})")
            
        except Exception as e:
            print(f"❌ Error updating vector weights: {e}")
    
    def _update_embeddings(self) -> int:
        """Update embeddings based on recent feedback"""
        try:
            # Reload all vulnerabilities and OFCs to update embeddings
            vuln_count = self.vector_store.load_all_vulnerabilities()
            ofc_count = self.vector_store.load_all_ofcs()
            
            total_updated = vuln_count + ofc_count
            print(f"🔄 Updated {total_updated} embeddings")
            
            return total_updated
            
        except Exception as e:
            print(f"❌ Error updating embeddings: {e}")
            return 0
    
    def _generate_rules(self) -> int:
        """Generate new rules from learning events"""
        try:
            # Run pattern learner to generate new rules
            learning_cycle = self.pattern_learner.run_learning_cycle()
            
            rules_generated = learning_cycle.get("rules_generated", 0)
            print(f"📝 Generated {rules_generated} new rules")
            
            return rules_generated
            
        except Exception as e:
            print(f"❌ Error generating rules: {e}")
            return 0
    
    def _update_sector_profiles(self) -> int:
        """Update sector profiles based on recent data"""
        try:
            # Get recent learning data for each sector
            sectors = ["Education", "Healthcare", "Transportation", "Energy", "Financial"]
            profiles_updated = 0
            
            for sector in sectors:
                # Get recent events for this sector
                if self.supabase:
                    result = self.supabase.table("learning_events").select("*").eq("sector", sector).gte("created_at", (datetime.now() - timedelta(days=7)).isoformat()).execute()
                    recent_events = result.data
                    
                    if len(recent_events) >= 5:  # Minimum events for profile update
                        # Update sector profile with recent data
                        success = self.sector_profiles.update_sector_profile(sector, recent_events)
                        if success:
                            profiles_updated += 1
            
            print(f"🏢 Updated {profiles_updated} sector profiles")
            return profiles_updated
            
        except Exception as e:
            print(f"❌ Error updating sector profiles: {e}")
            return 0
    
    def _retrain_auto_linker(self) -> bool:
        """Retrain the auto-linker based on recent feedback"""
        try:
            # Get confidence statistics
            confidence_stats = self.auto_linker.get_confidence_stats()
            
            # Adjust thresholds based on performance
            if confidence_stats.get("avg_confidence", 0) > 0.8:
                # High confidence - can lower threshold slightly
                self.auto_linker.auto_link_threshold = 0.85
                self.auto_linker.review_threshold = 0.7
            elif confidence_stats.get("avg_confidence", 0) < 0.6:
                # Low confidence - raise threshold
                self.auto_linker.auto_link_threshold = 0.95
                self.auto_linker.review_threshold = 0.8
            
            print(f"🎯 Auto-linker thresholds updated: auto={self.auto_linker.auto_link_threshold}, review={self.auto_linker.review_threshold}")
            return True
            
        except Exception as e:
            print(f"❌ Error retraining auto-linker: {e}")
            return False
    
    def _save_learning_state(self):
        """Save the current learning state"""
        try:
            state = {
                "last_learning_run": self.last_learning_run,
                "learning_stats": self.learning_stats,
                "config": self.config,
                "auto_linker_thresholds": {
                    "auto_link": self.auto_linker.auto_link_threshold,
                    "review": self.auto_linker.review_threshold
                }
            }
            
            state_file = Path("apps/backend/data/learning_state.json")
            state_file.parent.mkdir(parents=True, exist_ok=True)
            
            with open(state_file, 'w') as f:
                json.dump(state, f, indent=2)
            
            print(f"💾 Learning state saved to {state_file}")
            
        except Exception as e:
            print(f"❌ Error saving learning state: {e}")
    
    def get_learning_status(self) -> Dict[str, Any]:
        """Get current learning status and statistics"""
        return {
            "daemon_status": "running" if self.config["enable_continuous_learning"] else "stopped",
            "last_learning_run": self.last_learning_run,
            "check_interval_hours": self.check_interval_hours,
            "learning_stats": self.learning_stats,
            "config": self.config
        }
    
    def force_learning_cycle(self):
        """Force an immediate learning cycle"""
        print("🔄 Forcing immediate learning cycle...")
        self.run_learning_cycle()
    
    def stop_daemon(self):
        """Stop the continuous learning daemon"""
        print("🛑 Stopping continuous learning daemon...")
        self.config["enable_continuous_learning"] = False
        self._save_learning_state()

if __name__ == "__main__":
    # Test the continuous learning daemon
    daemon = ContinuousLearningDaemon(check_interval_hours=1)
    
    # Get initial status
    status = daemon.get_learning_status()
    print(f"Initial status: {status}")
    
    # Run a test learning cycle
    daemon.run_learning_cycle()
    
    # Show updated status
    status = daemon.get_learning_status()
    print(f"Updated status: {status}")
    
    # Note: In production, you would start the daemon with:
    # daemon.start_daemon()
