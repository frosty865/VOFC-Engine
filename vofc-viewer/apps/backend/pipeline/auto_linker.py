"""
Auto-Linking Pipeline for VOFC Engine
Automatically links similar vulnerabilities and OFCs with confidence scoring
"""

import json
from typing import List, Dict, Any, Tuple
from datetime import datetime
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

from learning.vector_store import VOFCVectorStore

class AutoLinker:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.vector_store = VOFCVectorStore(supabase_client)
        
        # Confidence thresholds
        self.auto_link_threshold = 0.9
        self.review_threshold = 0.75
        self.min_threshold = 0.5
    
    def process_new_vulnerability(self, vuln_id: str, text: str, sector: str = None, subsector: str = None) -> Dict[str, Any]:
        """Process a new vulnerability and find potential links"""
        print(f"Processing vulnerability: {vuln_id}")
        
        # Store vulnerability in vector store
        self.vector_store.store_vulnerability(vuln_id, text, sector, subsector)
        
        # Find similar vulnerabilities
        similar_vulns = self.vector_store.find_similar_vulnerabilities(
            text, 
            limit=5, 
            threshold=self.min_threshold
        )
        
        results = {
            "vulnerability_id": vuln_id,
            "text": text,
            "sector": sector,
            "subsector": subsector,
            "similar_vulnerabilities": [],
            "auto_links": [],
            "review_queue": [],
            "confidence_scores": {}
        }
        
        for similar in similar_vulns:
            confidence = similar["similarity"]
            results["confidence_scores"][similar["id"]] = confidence
            
            if confidence >= self.auto_link_threshold:
                # Auto-link high confidence matches
                link_result = self._create_auto_link(vuln_id, similar["id"], confidence, "vulnerability")
                if link_result:
                    results["auto_links"].append(link_result)
                    results["similar_vulnerabilities"].append({
                        "id": similar["id"],
                        "text": similar["text"],
                        "confidence": confidence,
                        "status": "auto_linked"
                    })
            
            elif confidence >= self.review_threshold:
                # Queue for human review
                review_result = self._create_review_item(vuln_id, similar["id"], confidence, "vulnerability")
                if review_result:
                    results["review_queue"].append(review_result)
                    results["similar_vulnerabilities"].append({
                        "id": similar["id"],
                        "text": similar["text"],
                        "confidence": confidence,
                        "status": "needs_review"
                    })
        
        # Store results in learning events
        self._store_learning_event("vulnerability_processed", vuln_id, None, results)
        
        return results
    
    def process_new_ofc(self, ofc_id: str, text: str, vulnerability_id: str = None) -> Dict[str, Any]:
        """Process a new OFC and find potential links"""
        print(f"Processing OFC: {ofc_id}")
        
        # Store OFC in vector store
        self.vector_store.store_ofc(ofc_id, text, vulnerability_id)
        
        # Find similar OFCs
        similar_ofcs = self.vector_store.find_similar_ofcs(
            text,
            limit=5,
            threshold=self.min_threshold
        )
        
        results = {
            "ofc_id": ofc_id,
            "text": text,
            "vulnerability_id": vulnerability_id,
            "similar_ofcs": [],
            "auto_links": [],
            "review_queue": [],
            "confidence_scores": {}
        }
        
        for similar in similar_ofcs:
            confidence = similar["similarity"]
            results["confidence_scores"][similar["id"]] = confidence
            
            if confidence >= self.auto_link_threshold:
                # Auto-link high confidence matches
                link_result = self._create_auto_link(ofc_id, similar["id"], confidence, "ofc")
                if link_result:
                    results["auto_links"].append(link_result)
                    results["similar_ofcs"].append({
                        "id": similar["id"],
                        "text": similar["text"],
                        "confidence": confidence,
                        "status": "auto_linked"
                    })
            
            elif confidence >= self.review_threshold:
                # Queue for human review
                review_result = self._create_review_item(ofc_id, similar["id"], confidence, "ofc")
                if review_result:
                    results["review_queue"].append(review_result)
                    results["similar_ofcs"].append({
                        "id": similar["id"],
                        "text": similar["text"],
                        "confidence": confidence,
                        "status": "needs_review"
                    })
        
        # Store results in learning events
        self._store_learning_event("ofc_processed", ofc_id, None, results)
        
        return results
    
    def _create_auto_link(self, source_id: str, target_id: str, confidence: float, link_type: str) -> Dict[str, Any]:
        """Create an automatic link between items"""
        link_data = {
            "source_id": source_id,
            "target_id": target_id,
            "confidence": round(confidence, 3),
            "link_type": link_type,
            "status": "auto",
            "created_at": datetime.now().isoformat()
        }
        
        if self.supabase:
            try:
                # Store in Supabase
                if link_type == "vulnerability":
                    table = "vulnerability_links"
                else:
                    table = "ofc_links"
                
                result = self.supabase.table(table).insert(link_data).execute()
                link_data["id"] = result.data[0]["id"] if result.data else None
                
                # Cache similarity for future use
                self.vector_store.cache_similarity(source_id, target_id, confidence)
                
                return link_data
            except Exception as e:
                print(f"Error creating auto link in Supabase: {e}")
                return None
        else:
            # Store locally
            try:
                link_data["id"] = f"{source_id}_{target_id}_{link_type}"
                self.vector_store.cache_similarity(source_id, target_id, confidence)
                return link_data
            except Exception as e:
                print(f"Error creating auto link locally: {e}")
                return None
    
    def _create_review_item(self, source_id: str, target_id: str, confidence: float, link_type: str) -> Dict[str, Any]:
        """Create a review item for human approval"""
        review_data = {
            "source_id": source_id,
            "target_id": target_id,
            "confidence": round(confidence, 3),
            "link_type": link_type,
            "status": "pending_review",
            "created_at": datetime.now().isoformat()
        }
        
        if self.supabase:
            try:
                result = self.supabase.table("review_queue").insert(review_data).execute()
                review_data["id"] = result.data[0]["id"] if result.data else None
                return review_data
            except Exception as e:
                print(f"Error creating review item in Supabase: {e}")
                return None
        else:
            # Store locally
            review_data["id"] = f"review_{source_id}_{target_id}_{link_type}"
            return review_data
    
    def _store_learning_event(self, event_type: str, source_id: str, target_id: str, data: Dict[str, Any]):
        """Store learning event for future analysis"""
        event_data = {
            "event_type": event_type,
            "source_id": source_id,
            "target_id": target_id,
            "confidence": data.get("confidence_scores", {}),
            "auto_links_count": len(data.get("auto_links", [])),
            "review_queue_count": len(data.get("review_queue", [])),
            "created_at": datetime.now().isoformat()
        }
        
        if self.supabase:
            try:
                self.supabase.table("learning_events").insert(event_data).execute()
            except Exception as e:
                print(f"Error storing learning event: {e}")
        else:
            # Store locally
            print(f"Learning event: {event_type} for {source_id}")
    
    def approve_link(self, link_id: str, approved: bool) -> bool:
        """Approve or reject a suggested link"""
        try:
            if self.supabase:
                # Update link status
                self.supabase.table("review_queue").update({
                    "status": "approved" if approved else "rejected",
                    "updated_at": datetime.now().isoformat()
                }).eq("id", link_id).execute()
                
                # If approved, create the actual link
                if approved:
                    review_item = self.supabase.table("review_queue").select("*").eq("id", link_id).execute()
                    if review_item.data:
                        item = review_item.data[0]
                        self._create_auto_link(
                            item["source_id"],
                            item["target_id"],
                            item["confidence"],
                            item["link_type"]
                        )
                
                # Store learning event
                self._store_learning_event(
                    "link_approved" if approved else "link_rejected",
                    link_id,
                    None,
                    {"approved": approved}
                )
                
                return True
            else:
                print(f"Link {link_id} {'approved' if approved else 'rejected'}")
                return True
        except Exception as e:
            print(f"Error approving link: {e}")
            return False
    
    def get_review_queue(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get items pending review"""
        if self.supabase:
            try:
                result = self.supabase.table("review_queue").select("*").eq("status", "pending_review").limit(limit).execute()
                return result.data
            except Exception as e:
                print(f"Error getting review queue: {e}")
                return []
        else:
            print("Review queue not available without Supabase")
            return []
    
    def get_confidence_stats(self) -> Dict[str, Any]:
        """Get confidence statistics for analysis"""
        if self.supabase:
            try:
                # Get auto-links with confidence scores
                auto_links = self.supabase.table("vulnerability_links").select("confidence").execute()
                ofc_links = self.supabase.table("ofc_links").select("confidence").execute()
                
                all_confidences = []
                all_confidences.extend([link["confidence"] for link in auto_links.data])
                all_confidences.extend([link["confidence"] for link in ofc_links.data])
                
                if all_confidences:
                    return {
                        "total_links": len(all_confidences),
                        "avg_confidence": sum(all_confidences) / len(all_confidences),
                        "min_confidence": min(all_confidences),
                        "max_confidence": max(all_confidences),
                        "high_confidence": len([c for c in all_confidences if c >= 0.9]),
                        "medium_confidence": len([c for c in all_confidences if 0.7 <= c < 0.9]),
                        "low_confidence": len([c for c in all_confidences if c < 0.7])
                    }
                else:
                    return {"total_links": 0}
            except Exception as e:
                print(f"Error getting confidence stats: {e}")
                return {"error": str(e)}
        else:
            return {"message": "Confidence stats not available without Supabase"}

if __name__ == "__main__":
    # Test the auto-linker
    linker = AutoLinker()
    
    # Test vulnerability processing
    test_vuln = "The facility lacks proper access control for special events"
    result = linker.process_new_vulnerability("test-vuln-1", test_vuln, "Security", "Access Control")
    
    print(f"Processed vulnerability with {len(result['auto_links'])} auto-links and {len(result['review_queue'])} review items")
    
    # Test OFC processing
    test_ofc = "Implement visitor access control procedures"
    ofc_result = linker.process_new_ofc("test-ofc-1", test_ofc, "test-vuln-1")
    
    print(f"Processed OFC with {len(ofc_result['auto_links'])} auto-links and {len(ofc_result['review_queue'])} review items")
    
    # Get confidence stats
    stats = linker.get_confidence_stats()
    print(f"Confidence stats: {stats}")
