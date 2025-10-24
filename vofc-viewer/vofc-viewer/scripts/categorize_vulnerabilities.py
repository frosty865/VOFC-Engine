#!/usr/bin/env python3
"""
Categorize existing vulnerabilities into the new discipline taxonomy
"""

import os
import sys
from supabase import create_client, Client
import re
from collections import defaultdict

def get_supabase_client():
    """Get Supabase client"""
    url = os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY') or os.getenv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
    
    if not url or not key:
        print("Missing Supabase credentials")
        return None
    
    return create_client(url, key)

def get_discipline_mapping():
    """Get mapping of keywords to disciplines"""
    return {
        # Physical Security Keywords
        'Physical Security': [
            'physical', 'facility', 'building', 'premises', 'site', 'location',
            'guard', 'security guard', 'patrol', 'watch', 'monitor', 'observe',
            'access control', 'entry', 'exit', 'door', 'gate', 'barrier', 'fence',
            'perimeter', 'boundary', 'surveillance', 'camera', 'cctv', 'alarm',
            'emergency', 'evacuation', 'response', 'incident', 'threat',
            'visitor', 'guest', 'badge', 'identification', 'credential',
            'asset', 'property', 'equipment', 'inventory', 'theft', 'vandalism'
        ],
        
        # Cybersecurity Keywords
        'Cybersecurity': [
            'cyber', 'digital', 'computer', 'system', 'network', 'internet',
            'data', 'information', 'database', 'server', 'software', 'application',
            'password', 'authentication', 'authorization', 'login', 'access',
            'firewall', 'encryption', 'security patch', 'vulnerability', 'exploit',
            'malware', 'virus', 'phishing', 'hacking', 'breach', 'intrusion',
            'monitoring', 'logging', 'audit', 'compliance', 'policy'
        ],
        
        # Network Security Keywords
        'Network Security': [
            'network', 'infrastructure', 'router', 'switch', 'firewall',
            'wireless', 'wifi', 'ethernet', 'protocol', 'traffic', 'bandwidth',
            'connection', 'connectivity', 'dns', 'ip', 'tcp', 'udp'
        ],
        
        # Data Protection Keywords
        'Data Protection': [
            'data', 'information', 'privacy', 'confidential', 'sensitive',
            'personal', 'pii', 'encryption', 'backup', 'storage', 'retention',
            'classification', 'handling', 'disposal', 'gdpr', 'compliance'
        ],
        
        # Identity Management Keywords
        'Identity Management': [
            'identity', 'user', 'account', 'authentication', 'authorization',
            'credential', 'password', 'login', 'access', 'permission', 'role',
            'privilege', 'single sign-on', 'sso', 'mfa', 'multi-factor'
        ],
        
        # Incident Response Keywords
        'Incident Response': [
            'incident', 'response', 'emergency', 'crisis', 'breach', 'attack',
            'threat', 'alert', 'notification', 'escalation', 'recovery',
            'forensics', 'investigation', 'analysis', 'containment'
        ],
        
        # Security Awareness Keywords
        'Security Awareness': [
            'training', 'education', 'awareness', 'user', 'personnel', 'staff',
            'phishing', 'social engineering', 'human', 'behavior', 'culture',
            'policy', 'procedure', 'guideline', 'best practice'
        ],
        
        # Vulnerability Management Keywords
        'Vulnerability Management': [
            'vulnerability', 'patch', 'update', 'fix', 'remediation', 'mitigation',
            'assessment', 'scan', 'test', 'penetration', 'pen test', 'audit',
            'risk', 'threat', 'exposure', 'weakness', 'flaw'
        ],
        
        # Security Operations Keywords
        'Security Operations': [
            'operations', 'soc', 'monitoring', 'alert', 'detection', 'analysis',
            'log', 'siem', 'correlation', 'investigation', 'response',
            'analyst', 'operator', 'center', 'command'
        ],
        
        # Security Management Keywords
        'Security Management': [
            'management', 'program', 'governance', 'strategy', 'planning',
            'budget', 'resource', 'staffing', 'organization', 'structure',
            'leadership', 'executive', 'director', 'manager', 'supervisor'
        ],
        
        # Risk Management Keywords
        'Risk Management': [
            'risk', 'assessment', 'analysis', 'evaluation', 'mitigation',
            'acceptance', 'transfer', 'avoidance', 'reduction', 'control',
            'threat', 'vulnerability', 'impact', 'likelihood', 'probability'
        ],
        
        # Compliance Keywords
        'Compliance': [
            'compliance', 'regulatory', 'standard', 'framework', 'requirement',
            'audit', 'assessment', 'certification', 'accreditation', 'control',
            'policy', 'procedure', 'documentation', 'evidence', 'reporting'
        ],
        
        # Security Architecture Keywords
        'Security Architecture': [
            'architecture', 'design', 'system', 'infrastructure', 'framework',
            'model', 'pattern', 'blueprint', 'specification', 'requirement',
            'integration', 'interoperability', 'standard', 'guideline'
        ],
        
        # Business Continuity Keywords
        'Business Continuity': [
            'continuity', 'disaster', 'recovery', 'backup', 'redundancy',
            'resilience', 'availability', 'uptime', 'downtime', 'outage',
            'planning', 'preparedness', 'response', 'recovery', 'restoration'
        ],
        
        # Security Training Keywords
        'Security Training': [
            'training', 'education', 'learning', 'development', 'skill',
            'competency', 'certification', 'qualification', 'workshop',
            'seminar', 'course', 'program', 'curriculum', 'instruction'
        ],
        
        # Security Assessment Keywords
        'Security Assessment': [
            'assessment', 'evaluation', 'review', 'audit', 'inspection',
            'examination', 'analysis', 'testing', 'testing', 'validation',
            'verification', 'check', 'survey', 'inquiry', 'investigation'
        ],
        
        # Security Policy Keywords
        'Security Policy': [
            'policy', 'procedure', 'guideline', 'standard', 'rule',
            'regulation', 'requirement', 'mandate', 'directive', 'instruction',
            'framework', 'governance', 'compliance', 'enforcement', 'violation'
        ]
    }

def analyze_vulnerability_text(text):
    """Analyze vulnerability text to determine the best discipline match"""
    if not text:
        return 'General'
    
    text_lower = text.lower()
    
    # Count keyword matches for each discipline
    discipline_scores = defaultdict(int)
    
    for discipline, keywords in get_discipline_mapping().items():
        for keyword in keywords:
            if keyword.lower() in text_lower:
                discipline_scores[discipline] += 1
    
    # Return the discipline with the highest score
    if discipline_scores:
        return max(discipline_scores, key=discipline_scores.get)
    
    return 'General'

def categorize_vulnerabilities():
    """Categorize all vulnerabilities into disciplines"""
    supabase = get_supabase_client()
    if not supabase:
        return False
    
    try:
        print("Analyzing vulnerabilities for discipline categorization...")
        
        # Get all vulnerabilities
        result = supabase.table('vulnerabilities').select('id, vulnerability, discipline').execute()
        
        if not result.data:
            print("No vulnerabilities found")
            return False
        
        print(f"Found {len(result.data)} vulnerabilities to analyze")
        
        # Get all disciplines
        disciplines_result = supabase.table('disciplines').select('id, name').execute()
        discipline_map = {disc['name']: disc['id'] for disc in disciplines_result.data}
        
        # Analyze each vulnerability
        updates = []
        analysis_results = defaultdict(list)
        
        for vuln in result.data:
            vuln_text = vuln.get('vulnerability', '')
            current_discipline = vuln.get('discipline', '')
            
            # Analyze the text to determine best discipline
            suggested_discipline = analyze_vulnerability_text(vuln_text)
            
            # Get the discipline ID
            discipline_id = discipline_map.get(suggested_discipline)
            
            if discipline_id:
                updates.append({
                    'id': vuln['id'],
                    'discipline_id': discipline_id,
                    'suggested_discipline': suggested_discipline
                })
                analysis_results[suggested_discipline].append(vuln['id'])
        
        print(f"\nDiscipline categorization results:")
        for discipline, vuln_ids in analysis_results.items():
            print(f"  {discipline}: {len(vuln_ids)} vulnerabilities")
        
        # Show some examples
        print(f"\nSample categorizations:")
        for i, update in enumerate(updates[:5]):
            vuln = next(v for v in result.data if v['id'] == update['id'])
            print(f"  {i+1}. {vuln['vulnerability'][:50]}...")
            print(f"     -> {update['suggested_discipline']}")
        
        # Ask for confirmation before updating
        print(f"\nReady to update {len(updates)} vulnerabilities with discipline IDs")
        print("This will categorize vulnerabilities into the new discipline taxonomy")
        
        return True
        
    except Exception as e:
        print(f"Error categorizing vulnerabilities: {e}")
        return False

def update_vulnerability_disciplines():
    """Update vulnerabilities with discipline IDs"""
    supabase = get_supabase_client()
    if not supabase:
        return False
    
    try:
        print("Updating vulnerabilities with discipline IDs...")
        
        # Get all vulnerabilities
        result = supabase.table('vulnerabilities').select('id, vulnerability, discipline').execute()
        
        if not result.data:
            print("No vulnerabilities found")
            return False
        
        # Get all disciplines
        disciplines_result = supabase.table('disciplines').select('id, name').execute()
        discipline_map = {disc['name']: disc['id'] for disc in disciplines_result.data}
        
        updated_count = 0
        
        for vuln in result.data:
            vuln_text = vuln.get('vulnerability', '')
            suggested_discipline = analyze_vulnerability_text(vuln_text)
            discipline_id = discipline_map.get(suggested_discipline)
            
            if discipline_id:
                # Update the vulnerability with discipline_id
                update_result = supabase.table('vulnerabilities').update({
                    'discipline_id': discipline_id
                }).eq('id', vuln['id']).execute()
                
                if update_result.data:
                    updated_count += 1
        
        print(f"Updated {updated_count} vulnerabilities with discipline IDs")
        return True
        
    except Exception as e:
        print(f"Error updating vulnerabilities: {e}")
        return False

if __name__ == "__main__":
    print("Starting vulnerability categorization...")
    
    # First, analyze and show what would be categorized
    success1 = categorize_vulnerabilities()
    
    if success1:
        print("\nCategorization analysis completed!")
        print("Review the results above before proceeding with updates")
        
        # Uncomment the line below to actually perform the updates
        # success2 = update_vulnerability_disciplines()
    else:
        print("Categorization analysis failed")
        sys.exit(1)
