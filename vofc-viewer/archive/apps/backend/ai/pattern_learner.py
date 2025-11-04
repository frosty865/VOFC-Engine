"""
Pattern Learner for VOFC Engine
Detects recurring patterns and generates correction rules
"""

import json
import re
from typing import List, Dict, Any, Tuple
from datetime import datetime, timedelta
from collections import Counter, defaultdict
from pathlib import Path

class PatternLearner:
    def __init__(self, supabase_client=None):
        self.supabase = supabase_client
        self.patterns_file = Path("apps/backend/ollama/rules.yaml")
        self.learning_threshold = 3  # Minimum occurrences to create a rule
        
    def analyze_learning_events(self, days_back: int = 30) -> Dict[str, Any]:
        """Analyze learning events to identify patterns"""
        print(f"Analyzing learning events from the last {days_back} days...")
        
        if not self.supabase:
            print("Supabase client not available for pattern analysis")
            return {"patterns": [], "corrections": []}
        
        try:
            # Get learning events from the last N days
            cutoff_date = datetime.now() - timedelta(days=days_back)
            result = self.supabase.table("learning_events").select("*").gte("created_at", cutoff_date.isoformat()).execute()
            events = result.data
            
            print(f"Found {len(events)} learning events to analyze")
            
            # Analyze patterns
            patterns = self._extract_patterns(events)
            corrections = self._identify_corrections(events)
            
            return {
                "patterns": patterns,
                "corrections": corrections,
                "total_events": len(events),
                "analysis_date": datetime.now().isoformat()
            }
            
        except Exception as e:
            print(f"Error analyzing learning events: {e}")
            return {"error": str(e)}
    
    def _extract_patterns(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract recurring patterns from learning events"""
        patterns = []
        
        # Group events by type
        event_groups = defaultdict(list)
        for event in events:
            event_groups[event.get("event_type", "unknown")].append(event)
        
        # Analyze each event type
        for event_type, group_events in event_groups.items():
            if len(group_events) < self.learning_threshold:
                continue
                
            # Extract common patterns
            if event_type == "link_rejected":
                patterns.extend(self._analyze_rejection_patterns(group_events))
            elif event_type == "link_approved":
                patterns.extend(self._analyze_approval_patterns(group_events))
            elif event_type == "vulnerability_processed":
                patterns.extend(self._analyze_vulnerability_patterns(group_events))
            elif event_type == "ofc_processed":
                patterns.extend(self._analyze_ofc_patterns(group_events))
        
        return patterns
    
    def _analyze_rejection_patterns(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze patterns in rejected links"""
        patterns = []
        
        # Look for common reasons for rejection
        rejection_reasons = []
        for event in events:
            metadata = event.get("metadata", {})
            if isinstance(metadata, dict):
                rejection_reasons.append(metadata.get("reason", "unknown"))
        
        # Find most common rejection reasons
        reason_counts = Counter(rejection_reasons)
        for reason, count in reason_counts.most_common(5):
            if count >= self.learning_threshold:
                patterns.append({
                    "type": "rejection_pattern",
                    "pattern": reason,
                    "frequency": count,
                    "confidence": min(count / len(events), 1.0),
                    "suggestion": f"Improve matching to avoid: {reason}"
                })
        
        return patterns
    
    def _analyze_approval_patterns(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze patterns in approved links"""
        patterns = []
        
        # Look for common characteristics of approved links
        confidence_scores = []
        for event in events:
            confidence = event.get("confidence")
            if confidence:
                confidence_scores.append(float(confidence))
        
        if confidence_scores:
            avg_confidence = sum(confidence_scores) / len(confidence_scores)
            patterns.append({
                "type": "approval_pattern",
                "pattern": f"Average confidence for approved links: {avg_confidence:.3f}",
                "frequency": len(confidence_scores),
                "confidence": avg_confidence,
                "suggestion": f"Use confidence threshold of {avg_confidence:.3f} for auto-linking"
            })
        
        return patterns
    
    def _analyze_vulnerability_patterns(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze patterns in vulnerability processing"""
        patterns = []
        
        # Look for common text patterns
        text_patterns = defaultdict(int)
        for event in events:
            metadata = event.get("metadata", {})
            if isinstance(metadata, dict):
                text = metadata.get("text", "")
                if text:
                    # Extract common phrases
                    phrases = self._extract_phrases(text)
                    for phrase in phrases:
                        text_patterns[phrase] += 1
        
        # Find frequently occurring phrases
        for phrase, count in text_patterns.items():
            if count >= self.learning_threshold:
                patterns.append({
                    "type": "text_pattern",
                    "pattern": phrase,
                    "frequency": count,
                    "confidence": min(count / len(events), 1.0),
                    "suggestion": f"Consider creating specific rules for: {phrase}"
                })
        
        return patterns
    
    def _analyze_ofc_patterns(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Analyze patterns in OFC processing"""
        patterns = []
        
        # Similar to vulnerability patterns but for OFCs
        text_patterns = defaultdict(int)
        for event in events:
            metadata = event.get("metadata", {})
            if isinstance(metadata, dict):
                text = metadata.get("text", "")
                if text:
                    phrases = self._extract_phrases(text)
                    for phrase in phrases:
                        text_patterns[phrase] += 1
        
        for phrase, count in text_patterns.items():
            if count >= self.learning_threshold:
                patterns.append({
                    "type": "ofc_pattern",
                    "pattern": phrase,
                    "frequency": count,
                    "confidence": min(count / len(events), 1.0),
                    "suggestion": f"Consider creating specific rules for OFC: {phrase}"
                })
        
        return patterns
    
    def _extract_phrases(self, text: str) -> List[str]:
        """Extract meaningful phrases from text"""
        # Simple phrase extraction - can be enhanced with NLP
        phrases = []
        
        # Extract 2-3 word phrases
        words = text.lower().split()
        for i in range(len(words) - 1):
            phrase = " ".join(words[i:i+2])
            if len(phrase) > 3:  # Filter out very short phrases
                phrases.append(phrase)
        
        # Extract 3-word phrases
        for i in range(len(words) - 2):
            phrase = " ".join(words[i:i+3])
            if len(phrase) > 5:
                phrases.append(phrase)
        
        return phrases
    
    def _identify_corrections(self, events: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Identify common corrections that can be automated"""
        corrections = []
        
        # Look for patterns in metadata that suggest corrections
        correction_patterns = defaultdict(int)
        for event in events:
            metadata = event.get("metadata", {})
            if isinstance(metadata, dict):
                corrections_data = metadata.get("corrections", [])
                if isinstance(corrections_data, list):
                    for correction in corrections_data:
                        if isinstance(correction, dict):
                            pattern = correction.get("pattern", "")
                            if pattern:
                                correction_patterns[pattern] += 1
        
        # Generate correction rules
        for pattern, count in correction_patterns.items():
            if count >= self.learning_threshold:
                corrections.append({
                    "pattern": pattern,
                    "frequency": count,
                    "confidence": min(count / len(events), 1.0),
                    "rule": f"Auto-correct: {pattern}"
                })
        
        return corrections
    
    def generate_rules(self, analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate rules based on pattern analysis"""
        rules = []
        
        patterns = analysis.get("patterns", [])
        corrections = analysis.get("corrections", [])
        
        # Generate rules from patterns
        for pattern in patterns:
            if pattern["confidence"] > 0.5:  # Only high-confidence patterns
                rule = {
                    "type": pattern["type"],
                    "pattern": pattern["pattern"],
                    "action": pattern["suggestion"],
                    "confidence": pattern["confidence"],
                    "frequency": pattern["frequency"],
                    "created_at": datetime.now().isoformat()
                }
                rules.append(rule)
        
        # Generate rules from corrections
        for correction in corrections:
            if correction["confidence"] > 0.5:
                rule = {
                    "type": "correction_rule",
                    "pattern": correction["pattern"],
                    "action": correction["rule"],
                    "confidence": correction["confidence"],
                    "frequency": correction["frequency"],
                    "created_at": datetime.now().isoformat()
                }
                rules.append(rule)
        
        return rules
    
    def save_rules(self, rules: List[Dict[str, Any]]) -> bool:
        """Save generated rules to the rules file"""
        try:
            # Create rules directory if it doesn't exist
            self.patterns_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Load existing rules
            existing_rules = []
            if self.patterns_file.exists():
                with open(self.patterns_file, 'r') as f:
                    content = f.read()
                    if content.strip():
                        # Parse existing YAML (simplified)
                        existing_rules = self._parse_yaml_rules(content)
            
            # Merge with new rules
            all_rules = existing_rules + rules
            
            # Write updated rules
            yaml_content = self._generate_yaml_rules(all_rules)
            with open(self.patterns_file, 'w') as f:
                f.write(yaml_content)
            
            print(f"Saved {len(rules)} new rules to {self.patterns_file}")
            return True
            
        except Exception as e:
            print(f"Error saving rules: {e}")
            return False
    
    def _parse_yaml_rules(self, content: str) -> List[Dict[str, Any]]:
        """Parse existing YAML rules (simplified)"""
        # This is a simplified parser - in production, use a proper YAML library
        rules = []
        lines = content.split('\n')
        current_rule = {}
        
        for line in lines:
            line = line.strip()
            if line.startswith('- '):
                if current_rule:
                    rules.append(current_rule)
                current_rule = {"pattern": line[2:]}
            elif line.startswith('  '):
                if 'action' in current_rule:
                    current_rule['action'] += f" {line.strip()}"
                else:
                    current_rule['action'] = line.strip()
        
        if current_rule:
            rules.append(current_rule)
        
        return rules
    
    def _generate_yaml_rules(self, rules: List[Dict[str, Any]]) -> str:
        """Generate YAML content for rules"""
        yaml_content = "# VOFC Engine Pattern Rules\n"
        yaml_content += "# Generated by Pattern Learner\n"
        yaml_content += f"# Generated at: {datetime.now().isoformat()}\n\n"
        
        yaml_content += "rules:\n"
        for rule in rules:
            yaml_content += f"  - pattern: \"{rule.get('pattern', '')}\"\n"
            yaml_content += f"    action: \"{rule.get('action', '')}\"\n"
            yaml_content += f"    confidence: {rule.get('confidence', 0.0)}\n"
            yaml_content += f"    frequency: {rule.get('frequency', 0)}\n"
            yaml_content += f"    type: \"{rule.get('type', 'unknown')}\"\n\n"
        
        return yaml_content
    
    def store_pattern_rule(self, rule: Dict[str, Any]) -> bool:
        """Store a pattern rule in the database"""
        if not self.supabase:
            print("Supabase client not available for storing pattern rules")
            return False
        
        try:
            result = self.supabase.table("pattern_rules").insert({
                "pattern_type": rule.get("type", "unknown"),
                "pattern_text": rule.get("pattern", ""),
                "correction": rule.get("action", ""),
                "confidence": rule.get("confidence", 0.0),
                "usage_count": rule.get("frequency", 0)
            }).execute()
            
            return len(result.data) > 0
            
        except Exception as e:
            print(f"Error storing pattern rule: {e}")
            return False
    
    def run_learning_cycle(self) -> Dict[str, Any]:
        """Run a complete learning cycle"""
        print("Starting learning cycle...")
        
        # Analyze recent events
        analysis = self.analyze_learning_events(days_back=30)
        
        # Generate rules
        rules = self.generate_rules(analysis)
        
        # Save rules
        rules_saved = self.save_rules(rules)
        
        # Store rules in database
        rules_stored = 0
        for rule in rules:
            if self.store_pattern_rule(rule):
                rules_stored += 1
        
        return {
            "analysis": analysis,
            "rules_generated": len(rules),
            "rules_saved": rules_saved,
            "rules_stored": rules_stored,
            "learning_cycle_complete": True
        }

if __name__ == "__main__":
    # Test the pattern learner
    learner = PatternLearner()
    
    # Run learning cycle
    result = learner.run_learning_cycle()
    
    print(f"Learning cycle complete:")
    print(f"  - Rules generated: {result['rules_generated']}")
    print(f"  - Rules saved: {result['rules_saved']}")
    print(f"  - Rules stored: {result['rules_stored']}")
    
    # Show some patterns if found
    patterns = result['analysis'].get('patterns', [])
    if patterns:
        print(f"\nTop patterns found:")
        for pattern in patterns[:3]:
            print(f"  - {pattern['pattern']} (confidence: {pattern['confidence']:.2f})")
