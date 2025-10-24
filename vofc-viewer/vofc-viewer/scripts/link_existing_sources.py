import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Linking existing sources to OFCs...")

# Get existing sources
sources = supabase.table('sources').select('*').execute()
print(f"Found {len(sources.data)} existing sources")

# Get all OFCs
ofcs = supabase.table('options_for_consideration').select('*').execute()
print(f"Found {len(ofcs.data)} OFCs")

# Create source mappings (using existing reference numbers)
source_mappings = {
    1: "Interagency Security Committee (ISC) Risk Management Process for Federal Facilities",
    2: "DHS National Infrastructure Protection Plan (NIPP)", 
    3: "FEMA Emergency Management Guide for Business and Industry",
    4: "National Council of ISACs - Information Sharing Best Practices",
    5: "FBI Joint Terrorism Task Force (JTTF) Guidelines",
    6: "DHS Homeland Security Information Network (HSIN) User Guide"
}

# Link sources to OFCs
ofc_source_links = [
    # ISAC vulnerability OFCs
    {
        "ofc_text": "Consult your local PSA regarding opportunities to enhance information sharing with the appropriate ISAC.",
        "sources": [4, 1]
    },
    {
        "ofc_text": "Additional information is available via the National Council of ISACs website, at https://www.nationalisacs.org.",
        "sources": [4]
    },
    # Communications vulnerability OFCs
    {
        "ofc_text": "Collaborate with the agency on potential solutions to achieve cost-effective interoperable communications onsite.",
        "sources": [2, 3]
    },
    {
        "ofc_text": "Explore the option of an interconnect system, such as a gateway that can allow communication between radio systems.",
        "sources": [2]
    },
    # Security plan vulnerability OFCs
    {
        "ofc_text": "Develop a comprehensive, written security plan that addresses all aspects of facility security.",
        "sources": [1, 3]
    },
    {
        "ofc_text": "Ensure the plan is regularly updated and reviewed by appropriate personnel.",
        "sources": [1]
    }
]

links_created = 0

for link_data in ofc_source_links:
    # Find the OFC
    ofc = next((o for o in ofcs.data if o['option_text'] == link_data['ofc_text']), None)
    if not ofc:
        print(f"OFC not found: {link_data['ofc_text'][:30]}...")
        continue
    
    print(f"Linking sources to OFC: {ofc['option_text'][:30]}...")
    
    # Link each source
    for ref_num in link_data['sources']:
        # Find source by reference number
        source = next((s for s in sources.data if s['reference_number'] == ref_num), None)
        if not source:
            print(f"  Source {ref_num} not found")
            continue
        
        # Create OFC-Source link
        result = supabase.table('ofc_sources').insert({
            'ofc_id': ofc['id'],
            'source_id': source['id']
        }).execute()
        
        if result.data:
            links_created += 1
            print(f"  Linked source {ref_num}: {source['source_text'][:50]}...")

print(f"Created {links_created} OFC-Source links")

# Verify the complete data structure
vulns = supabase.table('vulnerabilities').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()
sources = supabase.table('sources').select('*').execute()
vuln_links = supabase.table('vulnerability_ofc_links').select('*').execute()
ofc_links = supabase.table('ofc_sources').select('*').execute()

print(f"\nComplete data structure:")
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")

print("\nData structure is now complete! 🚀")
