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

print("Starting clean SAFE VOFC database rebuild...")

# ---------- STEP 1: Clear existing data ----------
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# ---------- STEP 2: Parse the PDF with better text cleaning ----------
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
                
                # Continue collecting vulnerability text until we hit an OFC
                while i < len(lines):
                    next_line = lines[i]
                    
                    # Check if this is an OFC (starts with bullet or has citation number at end)
                    if (next_line.startswith('•') or 
                        next_line.startswith('-') or
                        re.search(r'\d{3}$', next_line) or  # Ends with 3-digit citation
                        re.search(r'\d{2,3}\s*$', next_line)):  # Ends with 2-3 digit citation
                        
                        # This is an OFC - clean it up
                        ofc_text = re.sub(r'^[•\-]\s*', '', next_line)  # Remove bullet
                        ofc_text = re.sub(r'\s+\d{2,3}\s*$', '', ofc_text)  # Remove citation number
                        ofc_text = ofc_text.strip()
                        
                        if ofc_text and len(ofc_text) > 10:  # Only add substantial OFCs
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

# ---------- STEP 3: Clean and insert vulnerabilities ----------
print("Inserting cleaned vulnerabilities...")
vulnerabilities_inserted = 0
vulnerability_ids = {}

for entry in data:
    vuln_text = entry["vulnerability"]
    category = entry["category"]
    
    # Clean vulnerability text - remove bullet points and citations
    vuln_clean = re.sub(r'•\s*', '', vuln_text)  # Remove bullet points
    vuln_clean = re.sub(r'\s+\d{2,3}\s*$', '', vuln_clean)  # Remove citation numbers at end
    vuln_clean = re.sub(r'\s+', ' ', vuln_clean).strip()  # Clean up whitespace
    
    # Insert vulnerability
    vuln_result = supabase.table("vulnerabilities").insert({
        "vulnerability": vuln_clean,
        "category": category,
        "discipline": category  # Use category as discipline
    }).execute()
    
    if vuln_result.data:
        vuln_id = vuln_result.data[0]["id"]
        vulnerability_ids[vuln_clean] = vuln_id
        vulnerabilities_inserted += 1

print(f"Inserted {vulnerabilities_inserted} vulnerabilities")

# ---------- STEP 4: Insert clean OFCs and links ----------
print("Inserting clean OFCs and links...")
ofcs_inserted = 0
links_inserted = 0

for entry in data:
    vuln_text = entry["vulnerability"]
    vuln_clean = re.sub(r'•\s*', '', vuln_text)
    vuln_clean = re.sub(r'\s+\d{2,3}\s*$', '', vuln_clean)
    vuln_clean = re.sub(r'\s+', ' ', vuln_clean).strip()
    
    vuln_id = vulnerability_ids.get(vuln_clean)
    
    if not vuln_id:
        continue
    
    for ofc_text in entry["ofcs"]:
        # Clean OFC text
        ofc_clean = re.sub(r'•\s*', '', ofc_text)  # Remove bullet points
        ofc_clean = re.sub(r'\s+\d{2,3}\s*$', '', ofc_clean)  # Remove citation numbers
        ofc_clean = re.sub(r'\s+', ' ', ofc_clean).strip()  # Clean up whitespace
        
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
print("Clean SAFE VOFC database rebuild complete!")

# Show sample of cleaned data
if data:
    print(f"\nSample cleaned vulnerability:")
    sample = data[0]
    vuln_clean = re.sub(r'•\s*', '', sample["vulnerability"])
    vuln_clean = re.sub(r'\s+\d{2,3}\s*$', '', vuln_clean)
    vuln_clean = re.sub(r'\s+', ' ', vuln_clean).strip()
    print(f"Category: {sample['category']}")
    print(f"Vulnerability: {vuln_clean[:100]}...")
    print(f"OFCs: {len(sample['ofcs'])} options")
    
    for i, ofc in enumerate(sample['ofcs'][:2]):
        ofc_clean = re.sub(r'•\s*', '', ofc)
        ofc_clean = re.sub(r'\s+\d{2,3}\s*$', '', ofc_clean)
        ofc_clean = re.sub(r'\s+', ' ', ofc_clean).strip()
        print(f"  OFC {i+1}: {ofc_clean[:50]}...")
