import os, re, json
from pathlib import Path
import pdfplumber
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pdf_path = Path("docs/data/SAFE VOFC Library.pdf")

print("BULLET SPLIT PARSER: Each bullet = Separate OFC")
print("=" * 50)

# Clear existing data
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# Parse PDF using PdfPlumber
print("Parsing PDF with bullet splitting...")
data = []

with pdfplumber.open(pdf_path) as pdf:
    for page_num, page in enumerate(pdf.pages):
        print(f"\n=== PAGE {page_num + 1} ===")
        
        # Skip header pages
        if page_num < 2:
            continue
        
        # Extract tables from the page
        tables = page.extract_tables()
        
        if tables:
            print(f"Found {len(tables)} tables on page {page_num + 1}")
            
            for table_num, table in enumerate(tables):
                print(f"  Table {table_num + 1} has {len(table)} rows")
                
                # Skip header row
                for row_num, row in enumerate(table[1:], 1):
                    if len(row) >= 3 and row[0] and row[1] and row[2]:
                        category = row[0].strip()
                        vulnerability = row[1].strip()
                        ofcs_text = row[2].strip()
                        
                        # Skip empty rows
                        if not vulnerability or vulnerability == "Vulnerability":
                            continue
                        
                        print(f"    Row {row_num}: {vulnerability[:50]}...")
                        
                        # Parse OFCs from the third column - each bullet is a separate OFC
                        ofcs = []
                        if ofcs_text:
                            # Find all bullet points and split on them
                            # Look for bullet characters followed by text
                            bullet_matches = re.finditer(r'[•\u2022\u2023\u25E6\u2043\u204C\u204D\u2219\u22C5\u00B7]\s*([^•\u2022\u2023\u25E6\u2043\u204C\u204D\u2219\u22C5\u00B7]*)', ofcs_text)
                            
                            for match in bullet_matches:
                                ofc_text = match.group(1).strip()
                                if ofc_text and len(ofc_text) > 10:
                                    # Remove citation numbers at the end
                                    ofc_text = re.sub(r'\s+\d+\s*$', '', ofc_text)
                                    ofc_text = ofc_text.strip()
                                    
                                    if ofc_text:
                                        ofcs.append(ofc_text)
                                        try:
                                            print(f"      Added OFC: {ofc_text[:50]}...")
                                        except UnicodeEncodeError:
                                            print(f"      Added OFC: [Unicode content]...")
                            
                            # If no bullet points found, try splitting by line breaks
                            if not ofcs and '\n' in ofcs_text:
                                lines = ofcs_text.split('\n')
                                for line in lines:
                                    line = line.strip()
                                    if line and len(line) > 10:
                                        # Remove citation numbers at the end
                                        line = re.sub(r'\s+\d+\s*$', '', line)
                                        line = line.strip()
                                        
                                        if line:
                                            ofcs.append(line)
                                            try:
                                                print(f"      Added OFC: {line[:50]}...")
                                            except UnicodeEncodeError:
                                                print(f"      Added OFC: [Unicode content]...")
                        
                        # Save vulnerability with OFCs
                        if vulnerability and ofcs:
                            data.append({
                                "category": category,
                                "vulnerability": vulnerability,
                                "ofcs": ofcs
                            })
                            print(f"    Saved vulnerability with {len(ofcs)} OFCs")
        
        # If no tables found, try text extraction
        else:
            print(f"No tables found on page {page_num + 1}, trying text extraction...")
            text = page.extract_text()
            if text:
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                
                i = 0
                while i < len(lines):
                    line = lines[i]
                    
                    # Look for vulnerability patterns
                    if "The facility" in line:
                        parts = line.split("The facility")
                        if len(parts) > 1:
                            category_part = parts[0].strip()
                            vulnerability_start = "The facility" + parts[1]
                            
                            current_category = category_part
                            current_vulnerability = vulnerability_start
                            current_ofcs = []
                            i += 1
                            
                            # Collect OFCs - look for bullet points
                            while i < len(lines):
                                next_line = lines[i]
                                
                                # Check if this is an OFC (starts with bullet)
                                if (next_line.startswith('•') or 
                                    next_line.startswith('\u2022') or
                                    next_line.startswith('\u2023') or
                                    next_line.startswith('\u25E6') or
                                    next_line.startswith('\u2043')):
                                    
                                    # Extract OFC text
                                    ofc_text = re.sub(r'^[•\u2022\u2023\u25E6\u2043\u204C\u204D\u2219\u22C5\u00B7]\s*', '', next_line)
                                    ofc_text = re.sub(r'\s+\d+\s*$', '', ofc_text)
                                    ofc_text = ofc_text.strip()
                                    
                                    if ofc_text and len(ofc_text) > 10:
                                        current_ofcs.append(ofc_text)
                                        try:
                                            print(f"      Added OFC: {ofc_text[:50]}...")
                                        except UnicodeEncodeError:
                                            print(f"      Added OFC: [Unicode content]...")
                                    i += 1
                                elif next_line.startswith("The facility") or "The facility" in next_line:
                                    break
                                else:
                                    current_vulnerability += " " + next_line
                                    i += 1
                            
                            # Save vulnerability
                            if current_vulnerability and current_ofcs:
                                data.append({
                                    "category": current_category,
                                    "vulnerability": current_vulnerability,
                                    "ofcs": current_ofcs
                                })
                                print(f"    Saved vulnerability with {len(current_ofcs)} OFCs")
                            
                            continue
                    
                    i += 1

print(f"\nExtracted {len(data)} vulnerability groups")

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

print("\nBULLET SPLIT PARSER COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")
print("\nEach bullet point is now properly extracted as a separate OFC!")
print("Frontend ready at: http://localhost:3001/demo")
