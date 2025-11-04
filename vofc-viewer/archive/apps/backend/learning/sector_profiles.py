"""
Sector-Specific Profiles for VOFC Engine
Creates weighted profiles for different sectors to improve matching accuracy
"""

import json
from typing import Dict, List, Any, Tuple
from datetime import datetime
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

class SectorProfiles:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.profiles_dir = Path("apps/backend/learning/profiles")
        self.profiles_dir.mkdir(parents=True, exist_ok=True)
        
        # Base sector profiles with keywords and weights
        self.base_profiles = {
            "Education": {
                "keywords": [
                    "campus", "student", "faculty", "staff", "classroom", "dormitory",
                    "library", "laboratory", "research", "academic", "university", "college",
                    "school", "teacher", "student", "curriculum", "enrollment"
                ],
                "weights": {
                    "security": 0.8,
                    "access_control": 0.9,
                    "personnel": 0.7,
                    "physical": 0.6,
                    "cyber": 0.8
                },
                "priority_keywords": ["campus", "student", "faculty", "classroom"]
            },
            "Healthcare": {
                "keywords": [
                    "patient", "medical", "hospital", "clinic", "healthcare", "doctor",
                    "nurse", "treatment", "medical_record", "pharmacy", "emergency",
                    "surgery", "diagnosis", "therapy", "medication", "clinical"
                ],
                "weights": {
                    "security": 0.9,
                    "access_control": 0.8,
                    "personnel": 0.9,
                    "physical": 0.7,
                    "cyber": 0.9
                },
                "priority_keywords": ["patient", "medical", "hospital", "healthcare"]
            },
            "Transportation": {
                "keywords": [
                    "airport", "airline", "passenger", "flight", "terminal", "runway",
                    "aircraft", "pilot", "crew", "baggage", "cargo", "logistics",
                    "shipping", "freight", "vehicle", "fleet", "route"
                ],
                "weights": {
                    "security": 0.9,
                    "access_control": 0.8,
                    "personnel": 0.7,
                    "physical": 0.8,
                    "cyber": 0.7
                },
                "priority_keywords": ["airport", "airline", "passenger", "flight"]
            },
            "Energy": {
                "keywords": [
                    "power", "electricity", "grid", "generator", "transmission",
                    "distribution", "utility", "plant", "facility", "infrastructure",
                    "renewable", "solar", "wind", "nuclear", "coal", "gas"
                ],
                "weights": {
                    "security": 0.9,
                    "access_control": 0.8,
                    "personnel": 0.6,
                    "physical": 0.9,
                    "cyber": 0.8
                },
                "priority_keywords": ["power", "electricity", "grid", "utility"]
            },
            "Financial": {
                "keywords": [
                    "bank", "financial", "money", "transaction", "payment", "credit",
                    "loan", "investment", "trading", "account", "customer", "client",
                    "branch", "atm", "card", "currency", "exchange"
                ],
                "weights": {
                    "security": 0.9,
                    "access_control": 0.9,
                    "personnel": 0.8,
                    "physical": 0.7,
                    "cyber": 0.9
                },
                "priority_keywords": ["bank", "financial", "money", "transaction"]
            },
            "Government": {
                "keywords": [
                    "government", "federal", "state", "local", "municipal", "agency",
                    "department", "official", "citizen", "public", "service", "administration",
                    "policy", "regulation", "compliance", "law", "legal"
                ],
                "weights": {
                    "security": 0.9,
                    "access_control": 0.8,
                    "personnel": 0.8,
                    "physical": 0.8,
                    "cyber": 0.9
                },
                "priority_keywords": ["government", "federal", "agency", "public"]
            },
            "Critical Infrastructure": {
                "keywords": [
                    "infrastructure", "critical", "essential", "national", "security",
                    "defense", "military", "intelligence", "emergency", "disaster",
                    "response", "coordination", "command", "control", "communication"
                ],
                "weights": {
                    "security": 1.0,
                    "access_control": 0.9,
                    "personnel": 0.9,
                    "physical": 0.9,
                    "cyber": 1.0
                },
                "priority_keywords": ["critical", "infrastructure", "national", "security"]
            }
        }
    
    def create_sector_profile(self, sector: str, custom_keywords: List[str] = None) -> Dict[str, Any]:
        """Create or update a sector profile"""
        print(f"Creating profile for sector: {sector}")
        
        # Start with base profile if available
        profile = self.base_profiles.get(sector, {
            "keywords": [],
            "weights": {
                "security": 0.7,
                "access_control": 0.7,
                "personnel": 0.7,
                "physical": 0.7,
                "cyber": 0.7
            },
            "priority_keywords": []
        })
        
        # Add custom keywords if provided
        if custom_keywords:
            profile["keywords"].extend(custom_keywords)
            profile["keywords"] = list(set(profile["keywords"]))  # Remove duplicates
        
        # Add metadata
        profile["metadata"] = {
            "sector": sector,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "version": "1.0"
        }
        
        # Save profile
        self._save_profile(sector, profile)
        
        # Store in database if available
        if self.supabase:
            self._store_profile_in_db(sector, profile)
        
        return profile
    
    def _save_profile(self, sector: str, profile: Dict[str, Any]) -> bool:
        """Save profile to JSON file"""
        try:
            filename = f"{sector.lower().replace(' ', '_')}.json"
            filepath = self.profiles_dir / filename
            
            with open(filepath, 'w') as f:
                json.dump(profile, f, indent=2)
            
            print(f"Profile saved to: {filepath}")
            return True
            
        except Exception as e:
            print(f"Error saving profile: {e}")
            return False
    
    def _store_profile_in_db(self, sector: str, profile: Dict[str, Any]) -> bool:
        """Store profile in Supabase database"""
        if not self.supabase:
            return False
        
        try:
            result = self.supabase.table("sector_profiles").upsert({
                "sector": sector,
                "keywords": profile["keywords"],
                "weights": profile["weights"],
                "priority_keywords": profile.get("priority_keywords", []),
                "updated_at": datetime.now().isoformat()
            }).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error storing profile in database: {e}")
            return False
    
    def load_sector_profile(self, sector: str) -> Dict[str, Any]:
        """Load sector profile from file or database"""
        # Try database first
        if self.supabase:
            try:
                result = self.supabase.table("sector_profiles").select("*").eq("sector", sector).execute()
                if result.data:
                    profile = result.data[0]
                    profile["metadata"] = {
                        "sector": sector,
                        "source": "database",
                        "loaded_at": datetime.now().isoformat()
                    }
                    return profile
            except Exception as e:
                print(f"Error loading profile from database: {e}")
        
        # Fallback to file
        try:
            filename = f"{sector.lower().replace(' ', '_')}.json"
            filepath = self.profiles_dir / filename
            
            if filepath.exists():
                with open(filepath, 'r') as f:
                    profile = json.load(f)
                    profile["metadata"]["source"] = "file"
                    profile["metadata"]["loaded_at"] = datetime.now().isoformat()
                    return profile
        except Exception as e:
            print(f"Error loading profile from file: {e}")
        
        # Return base profile if available
        return self.base_profiles.get(sector, {})
    
    def calculate_sector_weight(self, text: str, sector: str) -> float:
        """Calculate how well text matches a sector profile"""
        profile = self.load_sector_profile(sector)
        if not profile:
            return 0.0
        
        keywords = profile.get("keywords", [])
        priority_keywords = profile.get("priority_keywords", [])
        weights = profile.get("weights", {})
        
        if not keywords:
            return 0.0
        
        # Convert text to lowercase for matching
        text_lower = text.lower()
        
        # Count keyword matches
        keyword_matches = sum(1 for keyword in keywords if keyword.lower() in text_lower)
        priority_matches = sum(1 for keyword in priority_keywords if keyword.lower() in text_lower)
        
        # Calculate base score
        base_score = keyword_matches / len(keywords) if keywords else 0
        
        # Apply priority keyword bonus
        priority_bonus = priority_matches * 0.2 if priority_keywords else 0
        
        # Apply sector-specific weights
        weighted_score = base_score * weights.get("security", 1.0)
        
        # Final score with priority bonus
        final_score = min(weighted_score + priority_bonus, 1.0)
        
        return final_score
    
    def get_best_sector_match(self, text: str) -> Tuple[str, float]:
        """Find the best sector match for given text"""
        best_sector = None
        best_score = 0.0
        
        # Test against all available sectors
        for sector in self.base_profiles.keys():
            score = self.calculate_sector_weight(text, sector)
            if score > best_score:
                best_score = score
                best_sector = sector
        
        return best_sector, best_score
    
    def update_sector_profile(self, sector: str, learning_data: List[Dict[str, Any]]) -> bool:
        """Update sector profile based on learning data"""
        print(f"Updating profile for sector: {sector}")
        
        # Load current profile
        profile = self.load_sector_profile(sector)
        
        # Extract new keywords from learning data
        new_keywords = []
        for data in learning_data:
            text = data.get("text", "")
            if text:
                # Extract potential keywords (simple approach)
                words = text.lower().split()
                for word in words:
                    if len(word) > 3 and word not in profile.get("keywords", []):
                        new_keywords.append(word)
        
        # Add new keywords
        if new_keywords:
            profile["keywords"] = list(set(profile.get("keywords", []) + new_keywords))
            profile["metadata"]["updated_at"] = datetime.now().isoformat()
            profile["metadata"]["version"] = str(float(profile["metadata"].get("version", "1.0")) + 0.1)
            
            # Save updated profile
            self._save_profile(sector, profile)
            if self.supabase:
                self._store_profile_in_db(sector, profile)
            
            print(f"Updated profile with {len(new_keywords)} new keywords")
            return True
        
        return False
    
    def generate_sector_insights(self, sector: str) -> Dict[str, Any]:
        """Generate insights about a sector based on its profile"""
        profile = self.load_sector_profile(sector)
        if not profile:
            return {"error": f"No profile found for sector: {sector}"}
        
        keywords = profile.get("keywords", [])
        weights = profile.get("weights", {})
        priority_keywords = profile.get("priority_keywords", [])
        
        insights = {
            "sector": sector,
            "total_keywords": len(keywords),
            "priority_keywords": len(priority_keywords),
            "security_focus": weights.get("security", 0),
            "access_control_focus": weights.get("access_control", 0),
            "personnel_focus": weights.get("personnel", 0),
            "physical_focus": weights.get("physical", 0),
            "cyber_focus": weights.get("cyber", 0),
            "overall_security_level": sum(weights.values()) / len(weights) if weights else 0,
            "top_keywords": keywords[:10],
            "priority_keywords": priority_keywords
        }
        
        # Generate recommendations
        recommendations = []
        if insights["overall_security_level"] > 0.8:
            recommendations.append(f"{sector} has high security requirements")
        if insights["cyber_focus"] > 0.8:
            recommendations.append(f"{sector} requires strong cybersecurity measures")
        if insights["access_control_focus"] > 0.8:
            recommendations.append(f"{sector} needs robust access control systems")
        
        insights["recommendations"] = recommendations
        
        return insights
    
    def create_all_profiles(self) -> Dict[str, bool]:
        """Create profiles for all base sectors"""
        results = {}
        
        for sector in self.base_profiles.keys():
            try:
                profile = self.create_sector_profile(sector)
                results[sector] = True
                print(f"✅ Created profile for {sector}")
            except Exception as e:
                results[sector] = False
                print(f"❌ Failed to create profile for {sector}: {e}")
        
        return results
    
    def export_profiles(self, output_file: str = None) -> str:
        """Export all profiles to a single JSON file"""
        if not output_file:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            output_file = f"all_sector_profiles_{timestamp}.json"
        
        filepath = self.profiles_dir / output_file
        
        all_profiles = {}
        for sector in self.base_profiles.keys():
            profile = self.load_sector_profile(sector)
            all_profiles[sector] = profile
        
        with open(filepath, 'w') as f:
            json.dump(all_profiles, f, indent=2)
        
        print(f"All profiles exported to: {filepath}")
        return str(filepath)

if __name__ == "__main__":
    # Test the sector profiles
    profiles = SectorProfiles()
    
    # Create all profiles
    results = profiles.create_all_profiles()
    print(f"Profile creation results: {results}")
    
    # Test sector matching
    test_texts = [
        "The campus lacks proper access control for student dormitories",
        "The hospital needs better security for patient medical records",
        "The airport requires enhanced screening procedures for passengers"
    ]
    
    for text in test_texts:
        best_sector, score = profiles.get_best_sector_match(text)
        print(f"Text: '{text[:50]}...'")
        print(f"Best match: {best_sector} (score: {score:.3f})")
        print()
    
    # Generate insights for Education sector
    insights = profiles.generate_sector_insights("Education")
    print(f"Education sector insights: {insights}")
