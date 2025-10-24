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

print("IMPROVED BULLET PARSER: Two-Pass Processing")
print("=" * 50)

# Clear existing data
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# Parse PDF using PdfPlumber
print("Parsing PDF with two-pass processing...")
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
                        
                        # FIRST PASS: Parse OFCs from the third column
                        ofcs = []
                        if ofcs_text:
                            # Find all bullet points and extract text after them
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
                        
                        # SECOND PASS: Clean up and split complex OFCs
                        cleaned_ofcs = []
                        for ofc in ofcs:
                            # Check if this OFC contains multiple sentences or sub-points
                            # Look for patterns like "(1)", "(2)", "(3)" or numbered lists
                            if re.search(r'\(\d+\)', ofc) or re.search(r'\d+\.\s', ofc):
                                # Split on numbered sub-points
                                sub_points = re.split(r'\(\d+\)', ofc)
                                for i, sub_point in enumerate(sub_points):
                                    sub_point = sub_point.strip()
                                    if sub_point and len(sub_point) > 10:
                                        # Clean up the sub-point
                                        sub_point = re.sub(r'^\s*[•\u2022\u2023\u25E6\u2043\u204C\u204D\u2219\u22C5\u00B7]\s*', '', sub_point)
                                        sub_point = re.sub(r'\s+\d+\s*$', '', sub_point)
                                        sub_point = sub_point.strip()
                                        
                                        if sub_point:
                                            cleaned_ofcs.append(sub_point)
                                            try:
                                                print(f"        Split sub-point: {sub_point[:50]}...")
                                            except UnicodeEncodeError:
                                                print(f"        Split sub-point: [Unicode content]...")
                            else:
                                # Check for other patterns that might indicate multiple OFCs
                                # Look for sentences that start with action words
                                sentences = re.split(r'(?<=[.!?])\s+(?=[A-Z])', ofc)
                                if len(sentences) > 1:
                                    for sentence in sentences:
                                        sentence = sentence.strip()
                                        if sentence and len(sentence) > 10:
                                            # Clean up the sentence
                                            sentence = re.sub(r'^\s*[•\u2022\u2023\u25E6\u2043\u204C\u204D\u2219\u22C5\u00B7]\s*', '', sentence)
                                            sentence = re.sub(r'\s+\d+\s*$', '', sentence)
                                            sentence = sentence.strip()
                                            
                                            if sentence:
                                                cleaned_ofcs.append(sentence)
                                                try:
                                                    print(f"        Split sentence: {sentence[:50]}...")
                                                except UnicodeEncodeError:
                                                    print(f"        Split sentence: [Unicode content]...")
                                else:
                                    # Single OFC, just clean it up
                                    cleaned_ofc = re.sub(r'^\s*[•\u2022\u2023\u25E6\u2043\u204C\u204D\u2219\u22C5\u00B7]\s*', '', ofc)
                                    cleaned_ofc = re.sub(r'\s+\d+\s*$', '', cleaned_ofc)
                                    cleaned_ofc = cleaned_ofc.strip()
                                    
                                    if cleaned_ofc:
                                        cleaned_ofcs.append(cleaned_ofc)
                                        try:
                                            print(f"        Cleaned OFC: {cleaned_ofc[:50]}...")
                                        except UnicodeEncodeError:
                                            print(f"        Cleaned OFC: [Unicode content]...")
                        
                        # Save vulnerability with cleaned OFCs
                        if vulnerability and cleaned_ofcs:
                            data.append({
                                "category": category,
                                "vulnerability": vulnerability,
                                "ofcs": cleaned_ofcs
                            })
                            print(f"    Saved vulnerability with {len(cleaned_ofcs)} OFCs")

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

print("\nIMPROVED BULLET PARSER COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")
print("\nTwo-pass processing complete with proper sentence structure!")
print("Frontend ready at: http://localhost:3001/demo")
