import os, csv, json, uuid
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
csv_path = Path("C:/Users/frost/OneDrive/Desktop/Projects/Tools/CSV")

print("RESTRUCTURING CSV DATA: Grouping OFCs by Vulnerability")
print("=" * 50)

# Clear existing data
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("sources").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# Store ID mappings
source_id_map = {}
vuln_id_map = {}
ofc_id_map = {}

# Import sources
print("Importing sources...")
sources_file = csv_path / "VOFC_sources.csv"
sources_inserted = 0

with open(sources_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        new_id = str(uuid.uuid4())
        source_id_map[row['id']] = new_id
        
        source_data = {
            "id": new_id,
            "reference_number": row['id'],
            "source_text": row['source_text']
        }
        
        result = supabase.table("sources").insert(source_data).execute()
        if result.data:
            sources_inserted += 1

print(f"Inserted {sources_inserted} sources")

# Import vulnerabilities
print("Importing vulnerabilities...")
vulns_file = csv_path / "VOFC_vulnerabilities.csv"
vulns_inserted = 0

with open(vulns_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        new_id = str(uuid.uuid4())
        vuln_id_map[row['id']] = new_id
        
        vuln_data = {
            "id": new_id,
            "vulnerability": row['vulnerability'],
            "discipline": row['discipline']
        }
        
        result = supabase.table("vulnerabilities").insert(vuln_data).execute()
        if result.data:
            vulns_inserted += 1

print(f"Inserted {vulns_inserted} vulnerabilities")

# Group OFCs by vulnerability text (not ID) to find duplicates
print("Grouping OFCs by vulnerability text...")
vuln_groups = {}
ofcs_file = csv_path / "VOFC_options_for_consideration.csv"

with open(ofcs_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Use vulnerability text as the grouping key
        vuln_text = row.get('vulnerability_text', '')
        if vuln_text:
            if vuln_text not in vuln_groups:
                vuln_groups[vuln_text] = []
            vuln_groups[vuln_text].append(row)

print(f"Found {len(vuln_groups)} unique vulnerability texts")

# Import OFCs grouped by vulnerability
print("Importing OFCs grouped by vulnerability...")
ofcs_inserted = 0
links_inserted = 0

for vuln_text, ofcs in vuln_groups.items():
    # Find the vulnerability ID for this text
    vuln_id = None
    for vuln_old_id, new_id in vuln_id_map.items():
        # Get the original vulnerability text
        with open(vulns_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                if row['id'] == vuln_old_id and row['vulnerability'] == vuln_text:
                    vuln_id = new_id
                    break
        if vuln_id:
            break
    
    if not vuln_id:
        print(f"Warning: Could not find vulnerability ID for: {vuln_text[:50]}...")
        continue
    
    # Import all OFCs for this vulnerability
    for ofc_row in ofcs:
        new_ofc_id = str(uuid.uuid4())
        ofc_id_map[ofc_row['id']] = new_ofc_id
        
        ofc_data = {
            "id": new_ofc_id,
            "option_text": ofc_row['option_text'],
            "discipline": ofc_row['discipline']
        }
        
        result = supabase.table("options_for_consideration").insert(ofc_data).execute()
        if result.data:
            ofcs_inserted += 1
            
            # Create vulnerability-OFC link
            link_data = {
                "vulnerability_id": vuln_id,
                "ofc_id": new_ofc_id
            }
            
            link_result = supabase.table("vulnerability_ofc_links").insert(link_data).execute()
            if link_result.data:
                links_inserted += 1

print(f"Inserted {ofcs_inserted} OFCs")
print(f"Created {links_inserted} vulnerability-OFC links")

# Create OFC-Source links
print("Creating OFC-Source links...")
ofc_source_links = 0

with open(ofcs_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        if row['source']:
            ofc_id = ofc_id_map.get(row['id'])
            if ofc_id:
                source_refs = row['source'].split(';')
                for ref in source_refs:
                    ref = ref.strip()
                    if ref.isdigit():
                        source_id = source_id_map.get(ref)
                        if source_id:
                            link_result = supabase.table("ofc_sources").insert({
                                "ofc_id": ofc_id,
                                "source_id": source_id
                            }).execute()
                            if link_result.data:
                                ofc_source_links += 1

print(f"Created {ofc_source_links} OFC-Source links")

# Final verification
vulns = supabase.table('vulnerabilities').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()
sources = supabase.table('sources').select('*').execute()
vuln_links = supabase.table('vulnerability_ofc_links').select('*').execute()
ofc_links = supabase.table('ofc_sources').select('*').execute()

print("\nRESTRUCTURED CSV IMPORT COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")
print("\nData restructured to show multiple OFCs per vulnerability!")
print("Frontend ready at: http://localhost:3001/demo")
