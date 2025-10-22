import os
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("CHECKING LINK TABLES")
print("=" * 50)

# Check vulnerability-OFC links
print("Vulnerability-OFC Links:")
vuln_ofc_links = supabase.table('vulnerability_ofc_links').select('*').execute()
print(f"Total links: {len(vuln_ofc_links.data)}")

# Count OFCs per vulnerability
vuln_ofc_counts = defaultdict(int)
for link in vuln_ofc_links.data:
    vuln_ofc_counts[link['vulnerability_id']] += 1

print(f"Vulnerabilities with multiple OFCs: {sum(1 for count in vuln_ofc_counts.values() if count > 1)}")
print(f"Average OFCs per vulnerability: {sum(vuln_ofc_counts.values()) / len(vuln_ofc_counts):.2f}")

# Show some examples
print("\nFirst 10 vulnerabilities with their OFC counts:")
for i, (vuln_id, count) in enumerate(list(vuln_ofc_counts.items())[:10]):
    print(f"  {vuln_id}: {count} OFCs")

# Check OFC-Source links
print("\nOFC-Source Links:")
ofc_source_links = supabase.table('ofc_sources').select('*').execute()
print(f"Total OFC-Source links: {len(ofc_source_links.data)}")

# Count sources per OFC
ofc_source_counts = defaultdict(int)
for link in ofc_source_links.data:
    ofc_source_counts[link['ofc_id']] += 1

print(f"OFCs with sources: {len(ofc_source_counts)}")
print(f"Average sources per OFC: {sum(ofc_source_counts.values()) / len(ofc_source_counts) if ofc_source_counts else 0:.2f}")

# Show some examples
print("\nFirst 10 OFCs with their source counts:")
for i, (ofc_id, count) in enumerate(list(ofc_source_counts.items())[:10]):
    print(f"  {ofc_id}: {count} sources")

# Get a sample vulnerability with its OFCs
print("\nSample vulnerability with OFCs:")
sample_vuln_id = list(vuln_ofc_counts.keys())[0]
sample_vuln = supabase.table('vulnerabilities').select('*').eq('id', sample_vuln_id).execute()
if sample_vuln.data:
    vuln = sample_vuln.data[0]
    print(f"Vulnerability: {vuln['vulnerability'][:100]}...")
    print(f"Discipline: {vuln['discipline']}")
    
    # Get OFCs for this vulnerability
    ofc_links = [link for link in vuln_ofc_links.data if link['vulnerability_id'] == sample_vuln_id]
    print(f"Number of OFCs: {len(ofc_links)}")
    
    for i, link in enumerate(ofc_links[:3]):  # Show first 3 OFCs
        ofc = supabase.table('options_for_consideration').select('*').eq('id', link['ofc_id']).execute()
        if ofc.data:
            ofc_data = ofc.data[0]
            print(f"  OFC {i+1}: {ofc_data['option_text'][:80]}...")
            
            # Get sources for this OFC
            ofc_sources = [s for s in ofc_source_links.data if s['ofc_id'] == link['ofc_id']]
            if ofc_sources:
                print(f"    Sources: {len(ofc_sources)}")
                for source_link in ofc_sources:
                    source = supabase.table('sources').select('*').eq('id', source_link['source_id']).execute()
                    if source.data:
                        print(f"      - {source.data[0]['source_text'][:60]}...")
            else:
                print(f"    Sources: None")
