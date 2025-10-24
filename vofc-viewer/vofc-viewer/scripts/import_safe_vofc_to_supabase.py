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

print(f"SUPABASE_URL: {SUPABASE_URL}")
print(f"SUPABASE_KEY: {SUPABASE_KEY[:20]}..." if SUPABASE_KEY else "None")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("❌ Missing Supabase credentials in .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
pdf_path = Path("docs/data/SAFE VOFC Library.pdf")

print(f"PDF path: {pdf_path}")
print(f"PDF exists: {pdf_path.exists()}")
print(f"Current working directory: {os.getcwd()}")

# ---------- STEP 1: Parse the PDF ----------
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

Path("safe_vofc_library.json").write_text(json.dumps(data, indent=2), encoding="utf-8")
print(f"Extracted {len(data)} vulnerability groups")

# ---------- STEP 2: Map to Supabase Tables ----------
def get_id(table: str, field: str, value: str):
    res = supabase.table(table).select("id").eq(field, value).execute()
    if res.data:
        return res.data[0]["id"]
    return None

def insert_if_missing(table: str, record: dict, unique_field: str):
    res = supabase.table(table).select("id").eq(unique_field, record[unique_field]).execute()
    if res.data:
        return res.data[0]["id"]
    ins = supabase.table(table).insert(record).execute()
    return ins.data[0]["id"]

# clear and rebuild link tables
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()

links_added = 0
citations_added = 0

for entry in data:
    v_text = entry["vulnerability"]
    v_id = get_id("vulnerabilities", "vulnerability", v_text)
    if not v_id:
        try:
            print(f"Skipping unknown vulnerability: {v_text}")
        except UnicodeEncodeError:
            print(f"Skipping unknown vulnerability: [Unicode content]")
        continue

    for ofc_text in entry["ofcs"]:
        # strip citations for OFC matching
        ofc_clean = re.sub(r"\[cite:.*?\]", "", ofc_text).strip()
        ofc_id = insert_if_missing(
            "options_for_consideration",
            {"option_text": ofc_clean, "vulnerability_id": v_id},
            "option_text"
        )

        # link vulnerability ↔ OFC
        supabase.table("vulnerability_ofc_links").insert({
            "vulnerability_id": v_id,
            "ofc_id": ofc_id
        }).execute()
        links_added += 1

        # map [cite: #]
        cites = re.findall(r"\[cite: ([0-9, ]+)\]", ofc_text)
        if cites:
            for c in re.split(r", ?", cites[0]):
                c = c.strip()
                if not c.isdigit():
                    continue
                s_res = supabase.table("sources").select("id").eq("reference_number", int(c)).execute()
                if s_res.data:
                    s_id = s_res.data[0]["id"]
                    supabase.table("ofc_sources").insert({
                        "ofc_id": ofc_id,
                        "source_id": s_id
                    }).execute()
                    citations_added += 1

print(f"{links_added} links added, {citations_added} citations linked.")
print("vulnerability_ofc_links and ofc_sources successfully rebuilt.")
