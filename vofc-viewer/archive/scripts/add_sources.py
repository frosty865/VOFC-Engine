import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Adding sources to complete the data structure...")

# Create test sources
test_sources = [
    {
        "reference_number": 1,
        "source_text": "Interagency Security Committee (ISC) Risk Management Process for Federal Facilities"
    },
    {
        "reference_number": 2,
        "source_text": "DHS National Infrastructure Protection Plan (NIPP)"
    },
    {
        "reference_number": 3,
        "source_text": "FEMA Emergency Management Guide for Business and Industry"
    },
    {
        "reference_number": 4,
        "source_text": "National Council of ISACs - Information Sharing Best Practices"
    },
    {
        "reference_number": 5,
        "source_text": "FBI Joint Terrorism Task Force (JTTF) Guidelines"
    },
    {
        "reference_number": 6,
        "source_text": "DHS Homeland Security Information Network (HSIN) User Guide"
    }
]

# Insert sources
sources_inserted = 0
source_ids = {}

for source in test_sources:
    result = supabase.table('sources').insert(source).execute()
    if result.data:
        source_ids[source['reference_number']] = result.data[0]['id']
        sources_inserted += 1

print(f"Inserted {sources_inserted} sources")

# Get all OFCs
ofcs = supabase.table('options_for_consideration').select('*').execute()
print(f"Found {len(ofcs.data)} OFCs")

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
        source_id = source_ids.get(ref_num)
        if not source_id:
            print(f"  Source {ref_num} not found")
            continue
        
        # Create OFC-Source link
        result = supabase.table('ofc_sources').insert({
            'ofc_id': ofc['id'],
            'source_id': source_id
        }).execute()
        
        if result.data:
            links_created += 1
            print(f"  Linked source {ref_num}")

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
