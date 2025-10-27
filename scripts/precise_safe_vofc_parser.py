import os, re, json
import pandas as pd
from pathlib import Path
from PyPDF2 import PdfReader
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# If not found in .env, set directly
if not SUPABASE_URL:
    SUPABASE_URL = "https://wivohgbuuwxoyfyzntsd.supabase.co"
if not SUPABASE_KEY:
    SUPABASE_KEY = "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pdf_path = Path("docs/data/SAFE VOFC Library.pdf")

print("Starting precise SAFE VOFC database rebuild...")

# ---------- STEP 1: Clear existing data ----------
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# ---------- STEP 2: Parse the PDF with precise separation ----------
print("Parsing PDF...")
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
        
        # Look for vulnerability patterns that start with "The facility"
        if "The facility" in line:
            # Extract category from the line (usually before "The facility")
            parts = line.split("The facility")
            if len(parts) > 1:
                category_part = parts[0].strip()
                vulnerability_start = "The facility" + parts[1]
                
                print(f"Found vulnerability: {vulnerability_start[:50]}...")
                
                # Set category and start collecting vulnerability
                current_category = category_part
                current_vulnerability = vulnerability_start
                current_ofcs = []
                i += 1
                
                # Continue collecting vulnerability text until we hit an OFC
                vulnerability_complete = False
                while i < len(lines) and not vulnerability_complete:
                    next_line = lines[i]
                    
                    # Check if this is an OFC (starts with bullet, ends with citation, or is clearly an action)
                    is_ofc = (
                        next_line.startswith('•') or 
                        next_line.startswith('-') or
                        re.search(r'\d{2,3}\s*$', next_line) or  # Ends with citation
                        next_line.startswith('Evaluate') or
                        next_line.startswith('Install') or
                        next_line.startswith('Explore') or
                        next_line.startswith('Consult') or
                        next_line.startswith('Invite') or
                        next_line.startswith('Provide') or
                        next_line.startswith('Design') or
                        next_line.startswith('Implement') or
                        next_line.startswith('Develop') or
                        next_line.startswith('Create') or
                        next_line.startswith('Establish') or
                        next_line.startswith('Maintain') or
                        next_line.startswith('Ensure') or
                        next_line.startswith('Consider') or
                        next_line.startswith('Review') or
                        next_line.startswith('Update') or
                        next_line.startswith('Train') or
                        next_line.startswith('Conduct') or
                        next_line.startswith('Schedule') or
                        next_line.startswith('Coordinate') or
                        next_line.startswith('Communicate') or
                        next_line.startswith('Share') or
                        next_line.startswith('Exchange') or
                        next_line.startswith('Enhance') or
                        next_line.startswith('Improve') or
                        next_line.startswith('Strengthen') or
                        next_line.startswith('Increase') or
                        next_line.startswith('Reduce') or
                        next_line.startswith('Minimize') or
                        next_line.startswith('Maximize') or
                        next_line.startswith('Optimize')
                    )
                    
                    if is_ofc:
                        # This is an OFC - clean it up
                        ofc_text = re.sub(r'^[•\-]\s*', '', next_line)  # Remove bullet
                        ofc_text = re.sub(r'\s+\d{2,3}\s*$', '', ofc_text)  # Remove citation
                        ofc_text = ofc_text.strip()
                        
                        if ofc_text and len(ofc_text) > 10:
                            current_ofcs.append(ofc_text)
                            try:
                                print(f"  Added OFC: {ofc_text[:50]}...")
                            except UnicodeEncodeError:
                                print(f"  Added OFC: [Unicode content]")
                        i += 1
                    elif next_line.startswith("The facility"):
                        # Next vulnerability, break
                        break
                    elif "The facility" in next_line:
                        # Next vulnerability, break
                        break
                    else:
                        # Continue vulnerability text
                        current_vulnerability += " " + next_line
                        i += 1
                
                # Save this vulnerability
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

# ---------- STEP 3: Insert vulnerabilities ----------
print("Inserting vulnerabilities...")
vulnerabilities_inserted = 0
vulnerability_ids = {}

for entry in data:
    vuln_text = entry["vulnerability"]
    category = entry["category"]
    
    # Clean vulnerability text
    vuln_clean = re.sub(r'\s+', ' ', vuln_text).strip()
    
    # Insert vulnerability
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

# ---------- STEP 4: Insert OFCs and links ----------
print("Inserting OFCs and links...")
ofcs_inserted = 0
links_inserted = 0

for entry in data:
    vuln_text = entry["vulnerability"]
    vuln_clean = re.sub(r'\s+', ' ', vuln_text).strip()
    vuln_id = vulnerability_ids.get(vuln_clean)
    
    if not vuln_id:
        continue
    
    for ofc_text in entry["ofcs"]:
        # Clean OFC text
        ofc_clean = re.sub(r'\s+', ' ', ofc_text).strip()
        
        if not ofc_clean or len(ofc_clean) < 10:
            continue
        
        # Insert OFC
        ofc_result = supabase.table("options_for_consideration").insert({
            "option_text": ofc_clean,
            "discipline": entry["category"]
        }).execute()
        
        if ofc_result.data:
            ofc_id = ofc_result.data[0]["id"]
            ofcs_inserted += 1
            
            # Create vulnerability-OFC link
            supabase.table("vulnerability_ofc_links").insert({
                "vulnerability_id": vuln_id,
                "ofc_id": ofc_id
            }).execute()
            links_inserted += 1

print(f"Inserted {ofcs_inserted} OFCs and {links_inserted} links")
print("Precise SAFE VOFC database rebuild complete!")

# Show sample of data
if data:
    print(f"\nSample vulnerability:")
    sample = data[0]
    print(f"Category: {sample['category']}")
    print(f"Vulnerability: {sample['vulnerability'][:100]}...")
    print(f"OFCs: {len(sample['ofcs'])} options")
    
    for i, ofc in enumerate(sample['ofcs'][:3]):
        print(f"  OFC {i+1}: {ofc[:50]}...")
