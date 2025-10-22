"""
Adaptive Prompts System for VOFC Engine
Dynamically evolves prompts based on learning events
"""

import json
import yaml
from typing import Dict, List, Any, Tuple
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add parent directory to path for imports
sys.path.append(str(Path(__file__).parent.parent))

class AdaptivePrompts:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.rules_file = Path("apps/backend/ollama/rules.yaml")
        self.prompts_file = Path("apps/backend/ollama/adaptive_prompts.yaml")
        
        # Adaptive configuration
        self.config = {
            "min_events_for_adaptation": 5,
            "confidence_threshold": 0.8,
            "max_rules_per_category": 20,
            "learning_rate": 0.1
        }
        
        # Prompt categories
        self.prompt_categories = {
            "vulnerability_parsing": "Vulnerability extraction and classification",
            "ofc_generation": "Options for Consideration creation",
            "sector_classification": "Sector and subsector identification",
            "correlation_analysis": "Cross-sector pattern recognition",
            "gap_analysis": "Missing OFC identification"
        }
    
    def analyze_learning_events(self, days_back: int = 7) -> Dict[str, Any]:
        """Analyze learning events to identify prompt improvements"""
        print(f"🧠 Analyzing learning events from the last {days_back} days...")
        
        if not self.supabase:
            print("⚠️ Supabase not available for prompt analysis")
            return {"error": "Supabase not available"}
        
        try:
            since_date = (datetime.now() - timedelta(days=days_back)).isoformat()
            
            # Get learning events
            result = self.supabase.table("learning_events").select("*").gte("created_at", since_date).execute()
            events = result.data
            
            print(f"📊 Found {len(events)} learning events to analyze")
            
            # Analyze events by category
            analysis = {}
            for category in self.prompt_categories.keys():
                category_events = [e for e in events if e.get("event_type", "").startswith(category.split("_")[0])]
                analysis[category] = self._analyze_category_events(category, category_events)
            
            # Generate adaptive rules
            adaptive_rules = self._generate_adaptive_rules(analysis)
            
            # Update prompt files
            rules_updated = self._update_rules_file(adaptive_rules)
            prompts_updated = self._update_prompts_file(adaptive_rules)
            
            return {
                "events_analyzed": len(events),
                "categories_analyzed": len(analysis),
                "adaptive_rules_generated": len(adaptive_rules),
                "rules_updated": rules_updated,
                "prompts_updated": prompts_updated,
                "analysis_timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"❌ Error analyzing learning events: {e}")
            return {"error": str(e)}
    
    def _analyze_category_events(self, category: str, events: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze events for a specific category"""
        if not events:
            return {"events_count": 0, "patterns": [], "suggestions": []}
        
        # Extract patterns from events
        patterns = []
        for event in events:
            pattern = self._extract_event_pattern(event)
            if pattern:
                patterns.append(pattern)
        
        # Generate suggestions based on patterns
        suggestions = self._generate_category_suggestions(category, patterns)
        
        return {
            "events_count": len(events),
            "patterns": patterns,
            "suggestions": suggestions,
            "confidence": min(len(patterns) / self.config["min_events_for_adaptation"], 1.0)
        }
    
    def _extract_event_pattern(self, event: Dict[str, Any]) -> Dict[str, Any]:
        """Extract pattern from a learning event"""
        try:
            event_type = event.get("event_type", "")
            metadata = event.get("metadata", {})
            confidence = event.get("confidence", 0.0)
            
            # Extract text patterns
            text_patterns = []
            if isinstance(metadata, dict):
                for key, value in metadata.items():
                    if isinstance(value, str) and len(value) > 5:
                        text_patterns.append({"key": key, "value": value})
            
            # Extract correction patterns
            correction_patterns = []
            if event.get("approved") == False and metadata:
                correction_patterns.append({
                    "type": "rejection",
                    "reason": metadata.get("reason", "unknown"),
                    "confidence": confidence
                })
            
            return {
                "event_type": event_type,
                "text_patterns": text_patterns,
                "correction_patterns": correction_patterns,
                "confidence": confidence,
                "timestamp": event.get("created_at", datetime.now().isoformat())
            }
            
        except Exception as e:
            print(f"❌ Error extracting event pattern: {e}")
            return None
    
    def _generate_category_suggestions(self, category: str, patterns: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate suggestions for a specific category"""
        suggestions = []
        
        # Analyze text patterns
        text_patterns = [p for p in patterns if p.get("text_patterns")]
        if text_patterns:
            suggestions.append({
                "type": "text_pattern_improvement",
                "category": category,
                "suggestion": f"Improve text pattern recognition for {category}",
                "confidence": len(text_patterns) / len(patterns) if patterns else 0
            })
        
        # Analyze correction patterns
        correction_patterns = [p for p in patterns if p.get("correction_patterns")]
        if correction_patterns:
            suggestions.append({
                "type": "correction_rule",
                "category": category,
                "suggestion": f"Add correction rules for {category} based on rejections",
                "confidence": len(correction_patterns) / len(patterns) if patterns else 0
            })
        
        # Generate specific improvements based on category
        if category == "vulnerability_parsing":
            suggestions.append({
                "type": "parsing_improvement",
                "category": category,
                "suggestion": "Enhance vulnerability text extraction accuracy",
                "confidence": 0.8
            })
        elif category == "ofc_generation":
            suggestions.append({
                "type": "generation_improvement",
                "category": category,
                "suggestion": "Improve OFC generation quality and relevance",
                "confidence": 0.8
            })
        elif category == "sector_classification":
            suggestions.append({
                "type": "classification_improvement",
                "category": category,
                "suggestion": "Enhance sector and subsector classification accuracy",
                "confidence": 0.8
            })
        
        return suggestions
    
    def _generate_adaptive_rules(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate adaptive rules from analysis"""
        adaptive_rules = []
        
        for category, category_analysis in analysis.items():
            if category_analysis.get("confidence", 0) >= self.config["confidence_threshold"]:
                # Generate rules for this category
                category_rules = self._generate_category_rules(category, category_analysis)
                adaptive_rules.extend(category_rules)
        
        return adaptive_rules
    
    def _generate_category_rules(self, category: str, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate rules for a specific category"""
        rules = []
        
        # Text pattern rules
        for pattern in analysis.get("patterns", []):
            for text_pattern in pattern.get("text_patterns", []):
                rule = {
                    "category": category,
                    "type": "text_pattern",
                    "pattern": text_pattern["value"],
                    "action": f"Improve recognition of '{text_pattern['value']}' in {category}",
                    "confidence": pattern.get("confidence", 0.0),
                    "created_at": datetime.now().isoformat()
                }
                rules.append(rule)
        
        # Correction rules
        for pattern in analysis.get("patterns", []):
            for correction in pattern.get("correction_patterns", []):
                if correction["type"] == "rejection":
                    rule = {
                        "category": category,
                        "type": "correction",
                        "pattern": correction["reason"],
                        "action": f"Avoid '{correction['reason']}' in {category}",
                        "confidence": correction.get("confidence", 0.0),
                        "created_at": datetime.now().isoformat()
                    }
                    rules.append(rule)
        
        # Category-specific rules
        for suggestion in analysis.get("suggestions", []):
            rule = {
                "category": category,
                "type": "improvement",
                "pattern": suggestion["suggestion"],
                "action": suggestion["suggestion"],
                "confidence": suggestion.get("confidence", 0.0),
                "created_at": datetime.now().isoformat()
            }
            rules.append(rule)
        
        return rules[:self.config["max_rules_per_category"]]
    
    def _update_rules_file(self, adaptive_rules: List[Dict[str, Any]]) -> bool:
        """Update the rules.yaml file with adaptive rules"""
        try:
            # Load existing rules
            existing_rules = []
            if self.rules_file.exists():
                with open(self.rules_file, 'r') as f:
                    content = f.read()
                    if content.strip():
                        existing_rules = self._parse_yaml_rules(content)
            
            # Merge with new rules
            all_rules = existing_rules + adaptive_rules
            
            # Generate YAML content
            yaml_content = self._generate_yaml_rules(all_rules)
            
            # Write updated rules
            with open(self.rules_file, 'w') as f:
                f.write(yaml_content)
            
            print(f"📝 Updated rules file with {len(adaptive_rules)} new rules")
            return True
            
        except Exception as e:
            print(f"❌ Error updating rules file: {e}")
            return False
    
    def _update_prompts_file(self, adaptive_rules: List[Dict[str, Any]]) -> bool:
        """Update the adaptive prompts file"""
        try:
            # Group rules by category
            category_rules = {}
            for rule in adaptive_rules:
                category = rule.get("category", "general")
                if category not in category_rules:
                    category_rules[category] = []
                category_rules[category].append(rule)
            
            # Generate adaptive prompts
            prompts = {
                "adaptive_prompts": {
                    "version": "1.0",
                    "last_updated": datetime.now().isoformat(),
                    "categories": {}
                }
            }
            
            for category, rules in category_rules.items():
                prompts["adaptive_prompts"]["categories"][category] = {
                    "description": self.prompt_categories.get(category, f"Adaptive prompts for {category}"),
                    "rules": rules,
                    "rule_count": len(rules)
                }
            
            # Write prompts file
            with open(self.prompts_file, 'w') as f:
                yaml.dump(prompts, f, default_flow_style=False, indent=2)
            
            print(f"📝 Updated prompts file with {len(adaptive_rules)} adaptive rules")
            return True
            
        except Exception as e:
            print(f"❌ Error updating prompts file: {e}")
            return False
    
    def _parse_yaml_rules(self, content: str) -> List[Dict[str, Any]]:
        """Parse existing YAML rules"""
        try:
            rules = yaml.safe_load(content)
            if isinstance(rules, dict) and "rules" in rules:
                return rules["rules"]
            return []
        except Exception as e:
            print(f"❌ Error parsing YAML rules: {e}")
            return []
    
    def _generate_yaml_rules(self, rules: List[Dict[str, Any]]) -> str:
        """Generate YAML content for rules"""
        yaml_content = "# VOFC Engine Adaptive Rules\n"
        yaml_content += f"# Generated at: {datetime.now().isoformat()}\n"
        yaml_content += f"# Total rules: {len(rules)}\n\n"
        
        yaml_content += "rules:\n"
        for rule in rules:
            yaml_content += f"  - category: \"{rule.get('category', 'general')}\"\n"
            yaml_content += f"    type: \"{rule.get('type', 'unknown')}\"\n"
            yaml_content += f"    pattern: \"{rule.get('pattern', '')}\"\n"
            yaml_content += f"    action: \"{rule.get('action', '')}\"\n"
            yaml_content += f"    confidence: {rule.get('confidence', 0.0)}\n"
            yaml_content += f"    created_at: \"{rule.get('created_at', '')}\"\n\n"
        
        return yaml_content
    
    def get_adaptive_prompts(self) -> Dict[str, Any]:
        """Get current adaptive prompts"""
        try:
            if self.prompts_file.exists():
                with open(self.prompts_file, 'r') as f:
                    return yaml.safe_load(f)
            return {"error": "No adaptive prompts file found"}
        except Exception as e:
            return {"error": str(e)}
    
    def get_prompt_evolution_summary(self) -> Dict[str, Any]:
        """Get summary of prompt evolution"""
        try:
            # Get current rules
            current_rules = []
            if self.rules_file.exists():
                with open(self.rules_file, 'r') as f:
                    content = f.read()
                    current_rules = self._parse_yaml_rules(content)
            
            # Analyze rule distribution
            category_counts = {}
            type_counts = {}
            
            for rule in current_rules:
                category = rule.get("category", "general")
                rule_type = rule.get("type", "unknown")
                
                category_counts[category] = category_counts.get(category, 0) + 1
                type_counts[rule_type] = type_counts.get(rule_type, 0) + 1
            
            return {
                "total_rules": len(current_rules),
                "category_distribution": category_counts,
                "type_distribution": type_counts,
                "last_updated": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}
    
    def run_adaptive_cycle(self) -> Dict[str, Any]:
        """Run a complete adaptive prompts cycle"""
        print("🔄 Running adaptive prompts cycle...")
        
        # Analyze learning events
        analysis = self.analyze_learning_events(days_back=7)
        
        # Get evolution summary
        evolution = self.get_prompt_evolution_summary()
        
        return {
            "analysis": analysis,
            "evolution": evolution,
            "cycle_completed": True,
            "timestamp": datetime.now().isoformat()
        }

if __name__ == "__main__":
    # Test the adaptive prompts system
    adaptive = AdaptivePrompts()
    
    # Run adaptive cycle
    result = adaptive.run_adaptive_cycle()
    
    print(f"Adaptive prompts cycle results:")
    print(f"  - Events analyzed: {result['analysis'].get('events_analyzed', 0)}")
    print(f"  - Rules generated: {result['analysis'].get('adaptive_rules_generated', 0)}")
    print(f"  - Total rules: {result['evolution'].get('total_rules', 0)}")
    
    # Get current prompts
    prompts = adaptive.get_adaptive_prompts()
    print(f"Current prompts: {prompts}")
