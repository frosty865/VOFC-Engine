"""
Real-Time Dashboard Updates for VOFC Engine
Provides live updates using Supabase real-time channels
"""

import json
import asyncio
from typing import Dict, List, Any, Callable
from datetime import datetime
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

class RealTimeDashboard:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.subscriptions = {}
        self.update_callbacks = {}
        
        # Real-time configuration
        self.config = {
            "enable_realtime": True,
            "update_interval_seconds": 5,
            "max_subscriptions": 10
        }
        
        # Dashboard metrics cache
        self.metrics_cache = {
            "last_updated": None,
            "vulnerability_count": 0,
            "ofc_count": 0,
            "gap_count": 0,
            "correlation_count": 0,
            "systemic_risk_count": 0
        }
    
    def start_realtime_updates(self):
        """Start real-time dashboard updates"""
        if not self.supabase:
            print("⚠️ Supabase not available for real-time updates")
            return
        
        print("🔄 Starting real-time dashboard updates...")
        
        try:
            # Subscribe to key tables
            self._subscribe_to_vulnerabilities()
            self._subscribe_to_ofcs()
            self._subscribe_to_correlations()
            self._subscribe_to_systemic_risks()
            
            print("✅ Real-time subscriptions established")
            
        except Exception as e:
            print(f"❌ Error starting real-time updates: {e}")
    
    def _subscribe_to_vulnerabilities(self):
        """Subscribe to vulnerabilities table changes"""
        try:
            subscription = self.supabase.table("vulnerabilities").on(
                "INSERT,UPDATE,DELETE", 
                callback=self._handle_vulnerability_change
            ).subscribe()
            
            self.subscriptions["vulnerabilities"] = subscription
            print("📊 Subscribed to vulnerabilities changes")
            
        except Exception as e:
            print(f"❌ Error subscribing to vulnerabilities: {e}")
    
    def _subscribe_to_ofcs(self):
        """Subscribe to OFCs table changes"""
        try:
            subscription = self.supabase.table("options_for_consideration").on(
                "INSERT,UPDATE,DELETE",
                callback=self._handle_ofc_change
            ).subscribe()
            
            self.subscriptions["ofcs"] = subscription
            print("📊 Subscribed to OFCs changes")
            
        except Exception as e:
            print(f"❌ Error subscribing to OFCs: {e}")
    
    def _subscribe_to_correlations(self):
        """Subscribe to correlation table changes"""
        try:
            subscription = self.supabase.table("cross_sector_correlations").on(
                "INSERT,UPDATE,DELETE",
                callback=self._handle_correlation_change
            ).subscribe()
            
            self.subscriptions["correlations"] = subscription
            print("📊 Subscribed to correlations changes")
            
        except Exception as e:
            print(f"❌ Error subscribing to correlations: {e}")
    
    def _subscribe_to_systemic_risks(self):
        """Subscribe to systemic risks table changes"""
        try:
            subscription = self.supabase.table("systemic_risks").on(
                "INSERT,UPDATE,DELETE",
                callback=self._handle_systemic_risk_change
            ).subscribe()
            
            self.subscriptions["systemic_risks"] = subscription
            print("📊 Subscribed to systemic risks changes")
            
        except Exception as e:
            print(f"❌ Error subscribing to systemic risks: {e}")
    
    def _handle_vulnerability_change(self, payload):
        """Handle vulnerability table changes"""
        try:
            event_type = payload.get("eventType", "UNKNOWN")
            record = payload.get("new", {}) or payload.get("old", {})
            
            print(f"🔄 Vulnerability {event_type}: {record.get('id', 'unknown')}")
            
            # Update metrics cache
            self._update_vulnerability_metrics()
            
            # Trigger dashboard update
            self._trigger_dashboard_update("vulnerabilities", {
                "event_type": event_type,
                "record": record,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error handling vulnerability change: {e}")
    
    def _handle_ofc_change(self, payload):
        """Handle OFC table changes"""
        try:
            event_type = payload.get("eventType", "UNKNOWN")
            record = payload.get("new", {}) or payload.get("old", {})
            
            print(f"🔄 OFC {event_type}: {record.get('id', 'unknown')}")
            
            # Update metrics cache
            self._update_ofc_metrics()
            
            # Trigger dashboard update
            self._trigger_dashboard_update("ofcs", {
                "event_type": event_type,
                "record": record,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error handling OFC change: {e}")
    
    def _handle_correlation_change(self, payload):
        """Handle correlation table changes"""
        try:
            event_type = payload.get("eventType", "UNKNOWN")
            record = payload.get("new", {}) or payload.get("old", {})
            
            print(f"🔄 Correlation {event_type}: {record.get('id', 'unknown')}")
            
            # Update metrics cache
            self._update_correlation_metrics()
            
            # Trigger dashboard update
            self._trigger_dashboard_update("correlations", {
                "event_type": event_type,
                "record": record,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error handling correlation change: {e}")
    
    def _handle_systemic_risk_change(self, payload):
        """Handle systemic risk table changes"""
        try:
            event_type = payload.get("eventType", "UNKNOWN")
            record = payload.get("new", {}) or payload.get("old", {})
            
            print(f"🔄 Systemic Risk {event_type}: {record.get('id', 'unknown')}")
            
            # Update metrics cache
            self._update_systemic_risk_metrics()
            
            # Trigger dashboard update
            self._trigger_dashboard_update("systemic_risks", {
                "event_type": event_type,
                "record": record,
                "timestamp": datetime.now().isoformat()
            })
            
        except Exception as e:
            print(f"❌ Error handling systemic risk change: {e}")
    
    def _update_vulnerability_metrics(self):
        """Update vulnerability metrics in cache"""
        try:
            result = self.supabase.table("vulnerabilities").select("id", count="exact").execute()
            self.metrics_cache["vulnerability_count"] = result.count
            self.metrics_cache["last_updated"] = datetime.now().isoformat()
            
        except Exception as e:
            print(f"❌ Error updating vulnerability metrics: {e}")
    
    def _update_ofc_metrics(self):
        """Update OFC metrics in cache"""
        try:
            result = self.supabase.table("options_for_consideration").select("id", count="exact").execute()
            self.metrics_cache["ofc_count"] = result.count
            self.metrics_cache["last_updated"] = datetime.now().isoformat()
            
        except Exception as e:
            print(f"❌ Error updating OFC metrics: {e}")
    
    def _update_correlation_metrics(self):
        """Update correlation metrics in cache"""
        try:
            result = self.supabase.table("cross_sector_correlations").select("id", count="exact").execute()
            self.metrics_cache["correlation_count"] = result.count
            self.metrics_cache["last_updated"] = datetime.now().isoformat()
            
        except Exception as e:
            print(f"❌ Error updating correlation metrics: {e}")
    
    def _update_systemic_risk_metrics(self):
        """Update systemic risk metrics in cache"""
        try:
            result = self.supabase.table("systemic_risks").select("id", count="exact").execute()
            self.metrics_cache["systemic_risk_count"] = result.count
            self.metrics_cache["last_updated"] = datetime.now().isoformat()
            
        except Exception as e:
            print(f"❌ Error updating systemic risk metrics: {e}")
    
    def _trigger_dashboard_update(self, table_name: str, update_data: Dict[str, Any]):
        """Trigger dashboard update for subscribers"""
        try:
            # Call registered update callbacks
            for callback_name, callback in self.update_callbacks.items():
                try:
                    callback(table_name, update_data)
                except Exception as e:
                    print(f"❌ Error in callback {callback_name}: {e}")
            
            # Log the update
            print(f"📊 Dashboard updated for {table_name}: {update_data.get('event_type', 'unknown')}")
            
        except Exception as e:
            print(f"❌ Error triggering dashboard update: {e}")
    
    def register_update_callback(self, name: str, callback: Callable):
        """Register a callback for dashboard updates"""
        self.update_callbacks[name] = callback
        print(f"📞 Registered update callback: {name}")
    
    def unregister_update_callback(self, name: str):
        """Unregister a dashboard update callback"""
        if name in self.update_callbacks:
            del self.update_callbacks[name]
            print(f"📞 Unregistered update callback: {name}")
    
    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Get current dashboard metrics"""
        return {
            "metrics": self.metrics_cache,
            "subscriptions": list(self.subscriptions.keys()),
            "callbacks": list(self.update_callbacks.keys()),
            "config": self.config
        }
    
    def get_live_updates(self, table_name: str = None) -> List[Dict[str, Any]]:
        """Get recent live updates"""
        # This would typically be stored in a cache or database
        # For now, return mock data
        return [
            {
                "table": "vulnerabilities",
                "event": "INSERT",
                "timestamp": datetime.now().isoformat(),
                "data": {"id": "new-vuln-123", "sector": "Healthcare"}
            },
            {
                "table": "correlations",
                "event": "INSERT",
                "timestamp": datetime.now().isoformat(),
                "data": {"similarity": 0.95, "sectors": ["Education", "Healthcare"]}
            }
        ]
    
    def stop_realtime_updates(self):
        """Stop real-time dashboard updates"""
        print("🛑 Stopping real-time dashboard updates...")
        
        try:
            # Unsubscribe from all subscriptions
            for name, subscription in self.subscriptions.items():
                subscription.unsubscribe()
                print(f"📊 Unsubscribed from {name}")
            
            self.subscriptions.clear()
            self.update_callbacks.clear()
            
            print("✅ Real-time updates stopped")
            
        except Exception as e:
            print(f"❌ Error stopping real-time updates: {e}")
    
    def force_dashboard_refresh(self):
        """Force a complete dashboard refresh"""
        print("🔄 Forcing dashboard refresh...")
        
        try:
            # Update all metrics
            self._update_vulnerability_metrics()
            self._update_ofc_metrics()
            self._update_correlation_metrics()
            self._update_systemic_risk_metrics()
            
            # Trigger refresh for all callbacks
            for callback_name, callback in self.update_callbacks.items():
                try:
                    callback("refresh", {"type": "force_refresh", "timestamp": datetime.now().isoformat()})
                except Exception as e:
                    print(f"❌ Error in refresh callback {callback_name}: {e}")
            
            print("✅ Dashboard refresh completed")
            
        except Exception as e:
            print(f"❌ Error forcing dashboard refresh: {e}")

if __name__ == "__main__":
    # Test the real-time dashboard system
    dashboard = RealTimeDashboard()
    
    # Register a test callback
    def test_callback(table_name, update_data):
        print(f"📊 Test callback received update for {table_name}: {update_data}")
    
    dashboard.register_update_callback("test", test_callback)
    
    # Get initial metrics
    metrics = dashboard.get_dashboard_metrics()
    print(f"Initial metrics: {metrics}")
    
    # Force a refresh
    dashboard.force_dashboard_refresh()
    
    # Note: In production, you would start real-time updates with:
    # dashboard.start_realtime_updates()
