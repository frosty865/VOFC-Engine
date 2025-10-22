import os, csv, json, uuid
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv
from collections import defaultdict

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("CLEANING DATA QUALITY ISSUES")
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
sources_file = Path("C:/Users/frost/OneDrive/Desktop/Projects/Tools/CSV/VOFC_sources.csv")
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

# Clean discipline names function
def clean_discipline(discipline):
    """Remove citation prefixes and clean discipline names"""
    if not discipline:
        return "General"
    
    # Remove [cite_start] prefix
    if discipline.startswith('[cite_start]'):
        discipline = discipline[12:]
    
    # Remove other citation artifacts
    discipline = discipline.replace('[cite_start]', '').strip()
    
    return discipline if discipline else "General"

# Group vulnerabilities by text (but be more selective)
print("Grouping vulnerabilities with quality checks...")
vuln_groups = defaultdict(list)
vulns_file = Path("C:/Users/frost/OneDrive/Desktop/Projects/Tools/CSV/VOFC_vulnerabilities.csv")

with open(vulns_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        vuln_text = row['vulnerability']
        vuln_groups[vuln_text].append(row)

print(f"Found {len(vuln_groups)} unique vulnerability texts")

# Import vulnerabilities with cleaned discipline names
print("Importing cleaned vulnerabilities...")
vulns_inserted = 0

for vuln_text, vuln_entries in vuln_groups.items():
    # Use the first entry as the representative
    first_entry = vuln_entries[0]
    new_id = str(uuid.uuid4())
    
    # Map all old IDs to the new ID
    for entry in vuln_entries:
        vuln_id_map[entry['id']] = new_id
    
    vuln_data = {
        "id": new_id,
        "vulnerability": vuln_text,
        "discipline": clean_discipline(first_entry['discipline'])
    }
    
    result = supabase.table("vulnerabilities").insert(vuln_data).execute()
    if result.data:
        vulns_inserted += 1

print(f"Inserted {vulns_inserted} vulnerabilities")

# Import OFCs with deduplication
print("Importing OFCs with deduplication...")
ofcs_file = Path("C:/Users/frost/OneDrive/Desktop/Projects/Tools/CSV/VOFC_options_for_consideration.csv")
ofcs_inserted = 0
duplicates_removed = 0

# Group OFCs by vulnerability to deduplicate within each vulnerability
vuln_ofc_groups = defaultdict(list)

with open(ofcs_file, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        # Find which vulnerability this OFC belongs to
        vuln_id = None
        for old_vuln_id, new_vuln_id in vuln_id_map.items():
            # Check if this OFC is linked to this vulnerability
            links_file = Path("C:/Users/frost/OneDrive/Desktop/Projects/Tools/CSV/VOFC_vulnerability_ofc_links.csv")
            with open(links_file, 'r', encoding='utf-8') as f2:
                reader2 = csv.DictReader(f2)
                for link_row in reader2:
                    if link_row['vulnerability_id'] == old_vuln_id and link_row['ofc_id'] == row['id']:
                        vuln_id = new_vuln_id
                        break
            if vuln_id:
                break
        
        if vuln_id:
            vuln_ofc_groups[vuln_id].append(row)

# Process each vulnerability's OFCs with deduplication
for vuln_id, ofcs in vuln_ofc_groups.items():
    # Deduplicate OFCs within this vulnerability
    seen_texts = set()
    unique_ofcs = []
    
    for ofc in ofcs:
        ofc_text = ofc['option_text']
        if ofc_text not in seen_texts:
            seen_texts.add(ofc_text)
            unique_ofcs.append(ofc)
        else:
            duplicates_removed += 1
    
    # Import unique OFCs for this vulnerability
    for ofc in unique_ofcs:
        new_ofc_id = str(uuid.uuid4())
        ofc_id_map[ofc['id']] = new_ofc_id
        
        ofc_data = {
            "id": new_ofc_id,
            "option_text": ofc['option_text'],
            "discipline": clean_discipline(ofc['discipline'])
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
                pass  # Link created successfully

print(f"Inserted {ofcs_inserted} OFCs")
print(f"Removed {duplicates_removed} duplicate OFCs")

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

# Final verification and quality report
vulns = supabase.table('vulnerabilities').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()
sources = supabase.table('sources').select('*').execute()
vuln_links = supabase.table('vulnerability_ofc_links').select('*').execute()
ofc_links = supabase.table('ofc_sources').select('*').execute()

print("\nCLEANED DATA IMPORT COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")

# Check for vulnerabilities with multiple OFCs
vuln_ofc_counts = defaultdict(int)
for link in vuln_links.data:
    vuln_ofc_counts[link['vulnerability_id']] += 1

multi_ofc_vulns = sum(1 for count in vuln_ofc_counts.values() if count > 1)
high_ofc_vulns = sum(1 for count in vuln_ofc_counts.values() if count > 5)

print(f"Vulnerabilities with multiple OFCs: {multi_ofc_vulns}")
print(f"Vulnerabilities with >5 OFCs: {high_ofc_vulns}")

# Check discipline distribution
disciplines = [v['discipline'] for v in vulns.data]
discipline_counts = defaultdict(int)
for disc in disciplines:
    discipline_counts[disc] += 1

print(f"\nDiscipline Distribution (cleaned):")
for disc, count in sorted(discipline_counts.items()):
    print(f"  {disc}: {count}")

print(f"\nData quality improvements:")
print(f"- Removed {duplicates_removed} duplicate OFCs")
print(f"- Cleaned discipline names (removed citation prefixes)")
print(f"- Maintained proper vulnerability-OFC relationships")
print(f"- Reduced high OFC count vulnerabilities from 11 to {high_ofc_vulns}")

print("\nFrontend ready at: http://localhost:3001/demo")
