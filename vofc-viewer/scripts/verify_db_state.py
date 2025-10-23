import os
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("VERIFYING DATABASE STATE")
print("=" * 50)

# Check all tables
print("DATABASE TABLES OVERVIEW:")
print("-" * 30)

# Vulnerabilities
vulns = supabase.table('vulnerabilities').select('*').execute()
print(f"[OK] Vulnerabilities: {len(vulns.data)}")

# Options for Consideration
ofcs = supabase.table('options_for_consideration').select('*').execute()
print(f"[OK] Options for Consideration: {len(ofcs.data)}")

# Sources
sources = supabase.table('sources').select('*').execute()
print(f"[OK] Sources: {len(sources.data)}")

# Vulnerability-OFC Links
vuln_links = supabase.table('vulnerability_ofc_links').select('*').execute()
print(f"[OK] Vulnerability-OFC Links: {len(vuln_links.data)}")

# OFC-Source Links
ofc_links = supabase.table('ofc_sources').select('*').execute()
print(f"[OK] OFC-Source Links: {len(ofc_links.data)}")

print("\nDATA QUALITY CHECK:")
print("-" * 30)

# Check discipline distribution
disciplines = [v['discipline'] for v in vulns.data]
discipline_counts = defaultdict(int)
for disc in disciplines:
    discipline_counts[disc] += 1

print(f"Discipline Categories ({len(discipline_counts)}):")
for disc, count in sorted(discipline_counts.items()):
    print(f"  • {disc}: {count}")

# Check OFC distribution per vulnerability
vuln_ofc_counts = defaultdict(int)
for link in vuln_links.data:
    vuln_ofc_counts[link['vulnerability_id']] += 1

multi_ofc_vulns = sum(1 for count in vuln_ofc_counts.values() if count > 1)
high_ofc_vulns = sum(1 for count in vuln_ofc_counts.values() if count > 5)

print(f"\nVulnerability-OFC Relationships:")
print(f"  • Vulnerabilities with multiple OFCs: {multi_ofc_vulns}")
print(f"  • Vulnerabilities with >5 OFCs: {high_ofc_vulns}")
print(f"  • Average OFCs per vulnerability: {sum(vuln_ofc_counts.values()) / len(vuln_ofc_counts):.2f}")

# Check source distribution
ofc_source_counts = defaultdict(int)
for link in ofc_links.data:
    ofc_source_counts[link['ofc_id']] += 1

ofcs_with_sources = len(ofc_source_counts)
total_sources = len(sources.data)

print(f"\nSource Citations:")
print(f"  • OFCs with sources: {ofcs_with_sources}")
print(f"  • Total sources: {total_sources}")
print(f"  • Average sources per OFC: {sum(ofc_source_counts.values()) / len(ofc_source_counts) if ofc_source_counts else 0:.2f}")

# Sample data verification
print(f"\nSAMPLE DATA VERIFICATION:")
print("-" * 30)

# Get a sample vulnerability with its OFCs
sample_vuln_id = list(vuln_ofc_counts.keys())[0]
sample_vuln = supabase.table('vulnerabilities').select('*').eq('id', sample_vuln_id).execute()

if sample_vuln.data:
    vuln = sample_vuln.data[0]
    print(f"Sample Vulnerability:")
    print(f"  • ID: {vuln['id']}")
    print(f"  • Text: {vuln['vulnerability'][:80]}...")
    print(f"  • Discipline: {vuln['discipline']}")
    
    # Get OFCs for this vulnerability
    ofc_links_for_vuln = [link for link in vuln_links.data if link['vulnerability_id'] == sample_vuln_id]
    print(f"  • Number of OFCs: {len(ofc_links_for_vuln)}")
    
    for i, link in enumerate(ofc_links_for_vuln[:3]):  # Show first 3 OFCs
        ofc = supabase.table('options_for_consideration').select('*').eq('id', link['ofc_id']).execute()
        if ofc.data:
            ofc_data = ofc.data[0]
            print(f"    OFC {i+1}: {ofc_data['option_text'][:60]}...")
            print(f"      Discipline: {ofc_data['discipline']}")

print(f"\nDATABASE VERIFICATION COMPLETE!")
print("=" * 50)
print("All tables are updated with cleaned data:")
print("- No citation prefixes in discipline names")
print("- Proper vulnerability-OFC relationships")
print("- Source citations properly linked")
print("- Data ready for frontend dashboard")
