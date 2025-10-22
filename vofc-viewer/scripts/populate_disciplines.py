#!/usr/bin/env python3
"""
Populate disciplines table with security disciplines
"""

import os
import sys
from supabase import create_client, Client

# Add the parent directory to the path to import from apps.backend
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'apps', 'backend'))

def get_supabase_client():
    """Get Supabase client"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("❌ Missing Supabase credentials")
        print("Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables")
        return None
    
    return create_client(url, key)

def populate_disciplines():
    """Populate the disciplines table"""
    supabase = get_supabase_client()
    if not supabase:
        return False
    
    disciplines = [
        # Physical Security Disciplines
        {
            "name": "Physical Security",
            "description": "Physical security measures and controls",
            "category": "Physical",
            "is_active": True
        },
        {
            "name": "Access Control",
            "description": "Physical and logical access control systems",
            "category": "Physical",
            "is_active": True
        },
        {
            "name": "Perimeter Security",
            "description": "Building and facility perimeter protection",
            "category": "Physical",
            "is_active": True
        },
        {
            "name": "Security Force",
            "description": "Security personnel and guard services",
            "category": "Physical",
            "is_active": True
        },
        {
            "name": "Surveillance",
            "description": "CCTV, monitoring, and observation systems",
            "category": "Physical",
            "is_active": True
        },
        {
            "name": "Emergency Response",
            "description": "Emergency preparedness and response procedures",
            "category": "Physical",
            "is_active": True
        },
        {
            "name": "Visitor Management",
            "description": "Guest and visitor access control",
            "category": "Physical",
            "is_active": True
        },
        {
            "name": "Asset Protection",
            "description": "Physical asset security and protection",
            "category": "Physical",
            "is_active": True
        },
        
        # Cybersecurity Disciplines
        {
            "name": "Cybersecurity",
            "description": "Information technology security",
            "category": "Cyber",
            "is_active": True
        },
        {
            "name": "Network Security",
            "description": "Network infrastructure protection",
            "category": "Cyber",
            "is_active": True
        },
        {
            "name": "Data Protection",
            "description": "Data security and privacy controls",
            "category": "Cyber",
            "is_active": True
        },
        {
            "name": "Identity Management",
            "description": "User authentication and authorization",
            "category": "Cyber",
            "is_active": True
        },
        {
            "name": "Incident Response",
            "description": "Cybersecurity incident handling",
            "category": "Cyber",
            "is_active": True
        },
        {
            "name": "Security Awareness",
            "description": "User training and security education",
            "category": "Cyber",
            "is_active": True
        },
        {
            "name": "Vulnerability Management",
            "description": "System vulnerability assessment and remediation",
            "category": "Cyber",
            "is_active": True
        },
        {
            "name": "Security Operations",
            "description": "Security monitoring and operations center",
            "category": "Cyber",
            "is_active": True
        },
        
        # Converged Security Disciplines
        {
            "name": "Security Management",
            "description": "Overall security program management",
            "category": "Converged",
            "is_active": True
        },
        {
            "name": "Risk Management",
            "description": "Security risk assessment and mitigation",
            "category": "Converged",
            "is_active": True
        },
        {
            "name": "Compliance",
            "description": "Regulatory and policy compliance",
            "category": "Converged",
            "is_active": True
        },
        {
            "name": "Security Architecture",
            "description": "Security system design and implementation",
            "category": "Converged",
            "is_active": True
        },
        {
            "name": "Business Continuity",
            "description": "Continuity planning and disaster recovery",
            "category": "Converged",
            "is_active": True
        },
        {
            "name": "Security Training",
            "description": "Security education and awareness programs",
            "category": "Converged",
            "is_active": True
        },
        {
            "name": "Security Assessment",
            "description": "Security evaluation and testing",
            "category": "Converged",
            "is_active": True
        },
        {
            "name": "Security Policy",
            "description": "Security policy development and enforcement",
            "category": "Converged",
            "is_active": True
        },
        
        # General Disciplines
        {
            "name": "General",
            "description": "General security considerations",
            "category": "General",
            "is_active": True
        },
        {
            "name": "Other",
            "description": "Other security disciplines not specifically categorized",
            "category": "General",
            "is_active": True
        }
    ]
    
    try:
        print("🔄 Populating disciplines table...")
        
        # Insert disciplines (ignore conflicts)
        for discipline in disciplines:
            try:
                result = supabase.table('disciplines').insert(discipline).execute()
                print(f"✅ Added discipline: {discipline['name']}")
            except Exception as e:
                if "duplicate key" in str(e).lower() or "unique constraint" in str(e).lower():
                    print(f"⚠️  Discipline already exists: {discipline['name']}")
                else:
                    print(f"❌ Error adding discipline {discipline['name']}: {e}")
        
        # Get final count
        result = supabase.table('disciplines').select('id', count='exact').execute()
        print(f"\n📊 Total disciplines in database: {result.count}")
        
        # Show disciplines by category
        result = supabase.table('disciplines').select('name, category').order('category, name').execute()
        
        categories = {}
        for disc in result.data:
            if disc['category'] not in categories:
                categories[disc['category']] = []
            categories[disc['category']].append(disc['name'])
        
        print("\n📋 Disciplines by category:")
        for category, names in categories.items():
            print(f"\n{category} ({len(names)}):")
            for name in names:
                print(f"  • {name}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error populating disciplines: {e}")
        return False

if __name__ == "__main__":
    print("🚀 Starting disciplines population...")
    success = populate_disciplines()
    
    if success:
        print("\n✅ Disciplines table populated successfully!")
    else:
        print("\n❌ Failed to populate disciplines table")
        sys.exit(1)
