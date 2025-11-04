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

print("Starting SAFE VOFC database rebuild...")

# ---------- STEP 1: Clear existing data ----------
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# ---------- STEP 2: Parse the PDF ----------
print("Parsing PDF...")
reader = PdfReader(pdf_path)
data = []
current_category = None
current_vulnerability = None
current_ofcs = []

for page_num, page in enumerate(reader.pages):
    text = page.extract_text()
    if not text:
        continue
    
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # Skip header pages
    if page_num < 2:
        continue
    
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
                
                # Save previous vulnerability if exists
                if current_vulnerability and current_ofcs:
                    data.append({
                        "category": current_category,
                        "vulnerability": current_vulnerability,
                        "ofcs": current_ofcs
                    })
                    current_ofcs = []
                
                # Set category and start collecting vulnerability
                current_category = category_part
                current_vulnerability = vulnerability_start
                i += 1
                
                # Continue collecting vulnerability text
                while i < len(lines):
                    next_line = lines[i]
                    
                    # Check if this is an OFC (has citation number at end)
                    if re.search(r'\d+$', next_line) and len(next_line) > 10:
                        # This is an OFC
                        ofc_text = re.sub(r'\s+\d+$', '', next_line).strip()
                        if ofc_text:
                            current_ofcs.append(ofc_text)
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
                
                continue
        
        i += 1

# Save the last vulnerability
if current_vulnerability and current_ofcs:
    data.append({
        "category": current_category,
        "vulnerability": current_vulnerability,
        "ofcs": current_ofcs
    })

print(f"Extracted {len(data)} vulnerability groups")

# ---------- STEP 3: Insert vulnerabilities ----------
print("Inserting vulnerabilities...")
vulnerabilities_inserted = 0
vulnerability_ids = {}

for entry in data:
    vuln_text = entry["vulnerability"]
    category = entry["category"]
    
    # Insert vulnerability
    vuln_result = supabase.table("vulnerabilities").insert({
        "vulnerability": vuln_text,
        "category": category,
        "discipline": category  # Use category as discipline
    }).execute()
    
    if vuln_result.data:
        vuln_id = vuln_result.data[0]["id"]
        vulnerability_ids[vuln_text] = vuln_id
        vulnerabilities_inserted += 1

print(f"Inserted {vulnerabilities_inserted} vulnerabilities")

# ---------- STEP 4: Insert OFCs and links ----------
print("Inserting OFCs and links...")
ofcs_inserted = 0
links_inserted = 0

for entry in data:
    vuln_text = entry["vulnerability"]
    vuln_id = vulnerability_ids.get(vuln_text)
    
    if not vuln_id:
        continue
    
    for ofc_text in entry["ofcs"]:
        # Clean OFC text
        ofc_clean = re.sub(r'\s+\d+$', '', ofc_text).strip()
        if not ofc_clean:
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
print("SAFE VOFC database rebuild complete!")
