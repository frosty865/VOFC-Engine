import os, re, json
from pathlib import Path
from PyPDF2 import PdfReader
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pdf_path = Path("docs/data/SAFE VOFC Library.pdf")

print("LINE PARSER: Each line after vulnerability = One OFC")
print("=" * 50)

# Clear existing data
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# Parse PDF - each line after vulnerability is a separate OFC
print("Parsing PDF - each line after vulnerability is an OFC...")
reader = PdfReader(pdf_path)
data = []

for page_num, page in enumerate(reader.pages):
    text = page.extract_text()
    if not text:
        continue
    
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # Skip header pages
    if page_num < 2:
        continue
    
    print(f"\n=== PAGE {page_num + 1} ===")
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip table headers
        if "Category" in line and "Vulnerability" in line:
            i += 1
            continue
        
        # Look for vulnerability patterns
        if "The facility" in line:
            parts = line.split("The facility")
            if len(parts) > 1:
                category_part = parts[0].strip()
                vulnerability_start = "The facility" + parts[1]
                
                print(f"Found vulnerability: {vulnerability_start[:50]}...")
                
                current_category = category_part
                current_vulnerability = vulnerability_start
                current_ofcs = []
                i += 1
                
                # Collect OFCs - each line after vulnerability is a separate OFC
                while i < len(lines):
                    next_line = lines[i]
                    
                    # Check if this is the next vulnerability
                    if next_line.startswith("The facility") or "The facility" in next_line:
                        # Next vulnerability, break
                        break
                    
                    # Skip empty lines
                    if not next_line:
                        i += 1
                        continue
                    
                    # Skip lines that are clearly not OFCs (too short, just numbers, etc.)
                    if len(next_line) < 10 or next_line.isdigit():
                        i += 1
                        continue
                    
                    # This line is an OFC
                    ofc_text = next_line.strip()
                    
                    if ofc_text and len(ofc_text) > 10:
                        current_ofcs.append(ofc_text)
                        try:
                            print(f"  Added OFC: {ofc_text[:50]}...")
                        except UnicodeEncodeError:
                            print(f"  Added OFC: [Unicode content]...")
                    i += 1
                
                # Save vulnerability
                if current_vulnerability and current_ofcs:
                    data.append({
                        "category": current_category,
                        "vulnerability": current_vulnerability,
                        "ofcs": current_ofcs
                    })
                    print(f"  Saved vulnerability with {len(current_ofcs)} OFCs")
                
                continue
        
        i += 1

print(f"Extracted {len(data)} vulnerability groups")

# Insert data
vulnerabilities_inserted = 0
vulnerability_ids = {}

for entry in data:
    vuln_text = entry["vulnerability"]
    category = entry["category"]
    
    vuln_clean = re.sub(r'\s+', ' ', vuln_text).strip()
    
    vuln_result = supabase.table("vulnerabilities").insert({
        "vulnerability": vuln_clean,
        "category": category,
        "discipline": category
    }).execute()
    
    if vuln_result.data:
        vuln_id = vuln_result.data[0]["id"]
        vulnerability_ids[vuln_clean] = vuln_id
        vulnerabilities_inserted += 1

print(f"Inserted {vulnerabilities_inserted} vulnerabilities")

# Insert OFCs and links
ofcs_inserted = 0
links_inserted = 0

for entry in data:
    vuln_text = entry["vulnerability"]
    vuln_clean = re.sub(r'\s+', ' ', vuln_text).strip()
    vuln_id = vulnerability_ids.get(vuln_clean)
    
    if not vuln_id:
        continue
    
    for ofc_text in entry["ofcs"]:
        ofc_clean = re.sub(r'\s+', ' ', ofc_text).strip()
        
        if not ofc_clean or len(ofc_clean) < 10:
            continue
        
        ofc_result = supabase.table("options_for_consideration").insert({
            "option_text": ofc_clean,
            "discipline": entry["category"]
        }).execute()
        
        if ofc_result.data:
            ofc_id = ofc_result.data[0]["id"]
            ofcs_inserted += 1
            
            supabase.table("vulnerability_ofc_links").insert({
                "vulnerability_id": vuln_id,
                "ofc_id": ofc_id
            }).execute()
            links_inserted += 1

print(f"Inserted {ofcs_inserted} OFCs and {links_inserted} links")

# Link existing sources to OFCs
print("Linking existing sources to OFCs...")
sources = supabase.table('sources').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()

print(f"Found {len(sources.data)} existing sources")
print(f"Found {len(ofcs.data)} OFCs")

# Create sample source links
sample_source_links = 0
import random

for ofc in ofcs.data:
    source = random.choice(sources.data)
    
    result = supabase.table('ofc_sources').insert({
        'ofc_id': ofc['id'],
        'source_id': source['id']
    }).execute()
    
    if result.data:
        sample_source_links += 1

print(f"Created {sample_source_links} OFC-Source links")

# Final verification
vulns = supabase.table('vulnerabilities').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()
sources = supabase.table('sources').select('*').execute()
vuln_links = supabase.table('vulnerability_ofc_links').select('*').execute()
ofc_links = supabase.table('ofc_sources').select('*').execute()

print("\nLINE PARSER COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")
print("\nEach line after vulnerability is now properly extracted as a separate OFC!")
print("Frontend ready at: http://localhost:3001/demo")
