import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

print("Creating test data...")

# Clear existing data
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# Create test vulnerabilities
test_vulnerabilities = [
    {
        "vulnerability": "The facility does not exchange information with the ISAC for its sector. Information exchange with the ISAC would enhance the security and resilience posture of the facility.",
        "category": "Information Sharing",
        "discipline": "Information Sharing"
    },
    {
        "vulnerability": "The facility does not have interoperable communications with the primary fire response agency. Without interoperable communications, the facility cannot communicate with first responders in order to coordinate response activities.",
        "category": "First Preventers-Responders", 
        "discipline": "First Preventers-Responders"
    },
    {
        "vulnerability": "The facility does not have a written security plan. Although the facility may have documentation that addresses security, it lacks a comprehensive, written security plan.",
        "category": "Security Management",
        "discipline": "Security Management"
    }
]

# Insert vulnerabilities
vulnerability_ids = {}
for vuln in test_vulnerabilities:
    result = supabase.table("vulnerabilities").insert(vuln).execute()
    if result.data:
        vulnerability_ids[vuln["vulnerability"]] = result.data[0]["id"]

print(f"Inserted {len(vulnerability_ids)} vulnerabilities")

# Create test OFCs
test_ofcs = [
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

# Insert OFCs and links
total_ofcs = 0
total_links = 0

for test_data in test_ofcs:
    vuln_text = test_data["vulnerability"]
    vuln_id = vulnerability_ids.get(vuln_text)
    
    if not vuln_id:
        continue
    
    for ofc_text in test_data["ofcs"]:
        # Insert OFC
        ofc_result = supabase.table("options_for_consideration").insert({
            "option_text": ofc_text,
            "discipline": "Test"
        }).execute()
        
        if ofc_result.data:
            ofc_id = ofc_result.data[0]["id"]
            total_ofcs += 1
            
            # Create vulnerability-OFC link
            supabase.table("vulnerability_ofc_links").insert({
                "vulnerability_id": vuln_id,
                "ofc_id": ofc_id
            }).execute()
            total_links += 1

print(f"Inserted {total_ofcs} OFCs and {total_links} links")
print("Test data creation complete!")

# Verify the data
vulns = supabase.table('vulnerabilities').select('*').execute()
print(f"Total vulnerabilities in database: {len(vulns.data)}")

isac_vulns = [v for v in vulns.data if 'isac' in v['vulnerability'].lower()]
print(f"ISAC vulnerabilities: {len(isac_vulns)}")
if isac_vulns:
    print(f"ISAC vulnerability: {isac_vulns[0]['vulnerability'][:100]}...")
