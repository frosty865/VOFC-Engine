import os, re, json
import pandas as pd
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

print("UNICODE BULLET PARSER: Handling all bullet types")
print("=" * 50)

# ---------- STEP 1: Clear existing data ----------
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# ---------- STEP 2: Parse the PDF with Unicode bullet handling ----------
print("Parsing PDF with Unicode bullet detection...")
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
                
                # Set category and start collecting vulnerability
                current_category = category_part
                current_vulnerability = vulnerability_start
                current_ofcs = []
                i += 1
                
                # Continue collecting vulnerability text until we hit a bullet point
                while i < len(lines):
                    next_line = lines[i]
                    
                    # Check if this is an OFC (starts with any type of bullet)
                    is_bullet = (
                        next_line.startswith('•') or  # Regular bullet
                        next_line.startswith('◦') or  # White bullet
                        next_line.startswith('▪') or  # Black small square
                        next_line.startswith('▫') or  # White small square
                        next_line.startswith('‣') or  # Triangular bullet
                        next_line.startswith('⁃') or  # Hyphen bullet
                        next_line.startswith('⁌') or  # Leftwards bullet
                        next_line.startswith('⁍') or  # Rightwards bullet
                        next_line.startswith('⁎') or  # Low asterisk
                        next_line.startswith('⁏') or  # Reversed semicolon
                        next_line.startswith('⁐') or  # Reversed not sign
                        next_line.startswith('⁑') or  # Two asterisks
                        next_line.startswith('⁒') or  # Reversed exclamation mark
                        next_line.startswith('⁓') or  # Tilde operator
                        next_line.startswith('⁔') or  # Inverted interrobang
                        next_line.startswith('⁕') or  # Flower punctuation mark
                        next_line.startswith('⁖') or  # Three dot punctuation
                        next_line.startswith('⁗') or  # Four dot punctuation
                        next_line.startswith('⁘') or  # Five dot punctuation
                        next_line.startswith('⁙') or  # Six dot punctuation
                        next_line.startswith('⁚') or  # Two dot punctuation
                        next_line.startswith('⁛') or  # Four dot mark
                        next_line.startswith('⁜') or  # Dotted cross
                        next_line.startswith('⁝') or  # Tricolon
                        next_line.startswith('⁞') or  # Vertical four dots
                        next_line.startswith('-') or  # Regular hyphen
                        next_line.startswith('*') or  # Asterisk
                        re.match(r'^\s*[•◦▪▫‣⁃⁌⁍⁎⁏⁐⁑⁒⁓⁔⁕⁖⁗⁘⁙⁚⁛⁜⁝⁞\-*]\s', next_line)  # Any bullet with spaces
                    )
                    
                    if is_bullet:
                        # This is an OFC - extract the text after the bullet
                        ofc_text = re.sub(r'^[•◦▪▫‣⁃⁌⁍⁎⁏⁐⁑⁒⁓⁔⁕⁖⁗⁘⁙⁚⁛⁜⁝⁞\-*]\s*', '', next_line)  # Remove any bullet
                        
                        # Clean up the OFC text
                        ofc_text = re.sub(r'\s+\d{2,3}\s*$', '', ofc_text)  # Remove citation numbers
                        ofc_text = ofc_text.strip()
                        
                        if ofc_text and len(ofc_text) > 10:
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
                
                # Save this vulnerability
                if current_vulnerability and current_ofcs:
                    data.append({
                        "category": current_category,
                        "vulnerability": current_vulnerability,
                        "ofcs": current_ofcs
                    })
                
                continue
        
        i += 1

print(f"Extracted {len(data)} vulnerability groups from PDF")

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
print("Inserting OFCs and creating links...")
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

# ---------- STEP 5: Final verification ----------
vulns = supabase.table('vulnerabilities').select('*').execute()
ofcs = supabase.table('options_for_consideration').select('*').execute()
sources = supabase.table('sources').select('*').execute()
vuln_links = supabase.table('vulnerability_ofc_links').select('*').execute()
ofc_links = supabase.table('ofc_sources').select('*').execute()

print("\nUNICODE BULLET PARSER COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")
print("\nUnicode bullets are now properly extracted as OFCs!")
print("Frontend ready at: http://localhost:3001/demo")
