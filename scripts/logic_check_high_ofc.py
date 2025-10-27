import os
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("LOGIC CHECK: Vulnerabilities with >5 OFCs")
print("=" * 60)

# Get vulnerability-OFC links
vuln_ofc_links = supabase.table('vulnerability_ofc_links').select('*').execute()

# Count OFCs per vulnerability
vuln_ofc_counts = defaultdict(int)
for link in vuln_ofc_links.data:
    vuln_ofc_counts[link['vulnerability_id']] += 1

# Find vulnerabilities with >5 OFCs
high_ofc_vulns = {vuln_id: count for vuln_id, count in vuln_ofc_counts.items() if count > 5}

print(f"Vulnerabilities with >5 OFCs: {len(high_ofc_vulns)}")
print(f"Total vulnerabilities: {len(vuln_ofc_counts)}")
print(f"Percentage with >5 OFCs: {len(high_ofc_vulns)/len(vuln_ofc_counts)*100:.1f}%")

print("\n" + "="*60)
print("DETAILED ANALYSIS OF HIGH OFC VULNERABILITIES")
print("="*60)

for i, (vuln_id, ofc_count) in enumerate(sorted(high_ofc_vulns.items(), key=lambda x: x[1], reverse=True)):
    print(f"\n{i+1}. VULNERABILITY ID: {vuln_id}")
    print(f"   OFC Count: {ofc_count}")
    
    # Get vulnerability details
    vuln = supabase.table('vulnerabilities').select('*').eq('id', vuln_id).execute()
    if vuln.data:
        vuln_data = vuln.data[0]
        print(f"   Vulnerability: {vuln_data['vulnerability'][:100]}...")
        print(f"   Discipline: {vuln_data['discipline']}")
        
        # Get all OFCs for this vulnerability
        ofc_links = [link for link in vuln_ofc_links.data if link['vulnerability_id'] == vuln_id]
        print(f"   OFCs:")
        
        for j, link in enumerate(ofc_links):
            ofc = supabase.table('options_for_consideration').select('*').eq('id', link['ofc_id']).execute()
            if ofc.data:
                ofc_data = ofc.data[0]
                print(f"     {j+1}. {ofc_data['option_text'][:80]}...")
                print(f"        Discipline: {ofc_data['discipline']}")
                
                # Check if OFC has sources
                ofc_sources = supabase.table('ofc_sources').select('*').eq('ofc_id', link['ofc_id']).execute()
                if ofc_sources.data:
                    print(f"        Sources: {len(ofc_sources.data)}")
                else:
                    print(f"        Sources: None")
        
        # Check for patterns in OFC disciplines
        ofc_disciplines = []
        for link in ofc_links:
            ofc = supabase.table('options_for_consideration').select('*').eq('id', link['ofc_id']).execute()
            if ofc.data:
                ofc_disciplines.append(ofc.data[0]['discipline'])
        
        discipline_counts = defaultdict(int)
        for disc in ofc_disciplines:
            discipline_counts[disc] += 1
        
        print(f"   OFC Discipline Distribution:")
        for disc, count in discipline_counts.items():
            print(f"     {disc}: {count}")
        
        # Check if OFCs are similar (potential duplicates)
        ofc_texts = []
        for link in ofc_links:
            ofc = supabase.table('options_for_consideration').select('*').eq('id', link['ofc_id']).execute()
            if ofc.data:
                ofc_texts.append(ofc.data[0]['option_text'])
        
        # Look for similar OFC texts (first 50 chars)
        similar_groups = defaultdict(list)
        for i, text in enumerate(ofc_texts):
            key = text[:50]
            similar_groups[key].append(i)
        
        duplicate_groups = {key: indices for key, indices in similar_groups.items() if len(indices) > 1}
        if duplicate_groups:
            print(f"   POTENTIAL DUPLICATE OFCs:")
            for key, indices in duplicate_groups.items():
                print(f"     '{key}...' appears {len(indices)} times at positions: {indices}")
        
        print(f"   {'-'*50}")

print(f"\nSUMMARY:")
print(f"Total vulnerabilities analyzed: {len(high_ofc_vulns)}")
print(f"Average OFCs in high-count vulnerabilities: {sum(high_ofc_vulns.values())/len(high_ofc_vulns):.1f}")
print(f"Maximum OFCs for a single vulnerability: {max(high_ofc_vulns.values())}")

# Check if there are any obvious data quality issues
print(f"\nDATA QUALITY CHECKS:")
print(f"- Vulnerabilities with >10 OFCs: {sum(1 for count in high_ofc_vulns.values() if count > 10)}")
print(f"- Vulnerabilities with >20 OFCs: {sum(1 for count in high_ofc_vulns.values() if count > 20)}")
print(f"- Vulnerabilities with >30 OFCs: {sum(1 for count in high_ofc_vulns.values() if count > 30)}")
