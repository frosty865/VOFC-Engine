import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Fixing vulnerability-OFC links...")

# Get all vulnerabilities
vulns = supabase.table('vulnerabilities').select('*').execute()
print(f"Found {len(vulns.data)} vulnerabilities")

# Get all OFCs
ofcs = supabase.table('options_for_consideration').select('*').execute()
print(f"Found {len(ofcs.data)} OFCs")

# Create links for our test data
test_links = [
    {
        "vulnerability": "The facility does not exchange information with the ISAC for its sector. Information exchange with the ISAC would enhance the security and resilience posture of the facility.",
        "ofcs": [
            "Consult your local PSA regarding opportunities to enhance information sharing with the appropriate ISAC.",
            "Additional information is available via the National Council of ISACs website, at https://www.nationalisacs.org."
        ]
    },
    {
        "vulnerability": "The facility does not have interoperable communications with the primary fire response agency. Without interoperable communications, the facility cannot communicate with first responders in order to coordinate response activities.",
        "ofcs": [
            "Collaborate with the agency on potential solutions to achieve cost-effective interoperable communications onsite.",
            "Explore the option of an interconnect system, such as a gateway that can allow communication between radio systems."
        ]
    },
    {
        "vulnerability": "The facility does not have a written security plan. Although the facility may have documentation that addresses security, it lacks a comprehensive, written security plan.",
        "ofcs": [
            "Develop a comprehensive, written security plan that addresses all aspects of facility security.",
            "Ensure the plan is regularly updated and reviewed by appropriate personnel."
        ]
    }
]

links_created = 0

for test_data in test_links:
    # Find the vulnerability
    vuln = next((v for v in vulns.data if v['vulnerability'] == test_data['vulnerability']), None)
    if not vuln:
        print(f"Vulnerability not found: {test_data['vulnerability'][:50]}...")
        continue
    
    print(f"Linking vulnerability: {vuln['vulnerability'][:50]}...")
    
    # Find and link OFCs
    for ofc_text in test_data['ofcs']:
        ofc = next((o for o in ofcs.data if o['option_text'] == ofc_text), None)
        if not ofc:
            print(f"  OFC not found: {ofc_text[:30]}...")
            continue
        
        # Create link
        result = supabase.table('vulnerability_ofc_links').insert({
            'vulnerability_id': vuln['id'],
            'ofc_id': ofc['id']
        }).execute()
        
        if result.data:
            links_created += 1
            print(f"  Linked OFC: {ofc_text[:30]}...")

print(f"Created {links_created} links")

# Verify links
links = supabase.table('vulnerability_ofc_links').select('*').execute()
print(f"Total links in database: {len(links.data)}")
