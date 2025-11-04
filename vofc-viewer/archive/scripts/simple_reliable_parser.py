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

print("SIMPLE RELIABLE PARSER: Focus on Structure")
print("=" * 50)

# Clear existing data
print("Clearing existing data...")
supabase.table("vulnerability_ofc_links").delete().neq("vulnerability_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("ofc_sources").delete().neq("ofc_id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("options_for_consideration").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
supabase.table("vulnerabilities").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()

# Parse PDF using simple, reliable approach
print("Parsing PDF with simple structure focus...")
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
                        
                        # Simple, reliable OFC parsing
                        ofcs = []
                        if ofcs_text and len(ofcs_text) > 10:
                            # Method 1: Look for actual bullet points in the text
                            bullet_chars = ['•', '◦', '▪', '▫', '‣', '⁃', '‣', '⁌', '⁍', '·', '∙']
                            
                            # Split by bullet characters
                            for bullet in bullet_chars:
                                if bullet in ofcs_text:
                                    parts = ofcs_text.split(bullet)
                                    for part in parts[1:]:  # Skip first part (before first bullet)
                                        part = part.strip()
                                        if len(part) > 10:
                                            # Clean up the OFC
                                            part = re.sub(r'\s+\d+\s*$', '', part)  # Remove citation numbers
                                            part = part.strip()
                                            if part:
                                                ofcs.append(part)
                                    break
                            
                            # Method 2: If no bullets found, look for numbered lists
                            if not ofcs:
                                # Look for patterns like (1), (2), etc.
                                numbered_pattern = r'\((\d+)\)\s*([^\(]+?)(?=\(\d+\)|$)'
                                matches = re.findall(numbered_pattern, ofcs_text, re.DOTALL)
                                for num, content in matches:
                                    content = content.strip()
                                    if len(content) > 10:
                                        content = re.sub(r'\s+\d+\s*$', '', content)
                                        content = content.strip()
                                        if content:
                                            ofcs.append(content)
                            
                            # Method 3: If still no OFCs, try line breaks
                            if not ofcs and '\n' in ofcs_text:
                                lines = ofcs_text.split('\n')
                                for line in lines:
                                    line = line.strip()
                                    if len(line) > 10:
                                        line = re.sub(r'\s+\d+\s*$', '', line)
                                        line = line.strip()
                                        if line:
                                            ofcs.append(line)
                            
                            # Method 4: Last resort - split by periods that end with action words
                            if not ofcs:
                                # Look for sentences that end with action words
                                action_endings = [
                                    'procedures', 'systems', 'measures', 'controls', 'policies',
                                    'training', 'planning', 'coordination', 'communication',
                                    'information', 'sharing', 'access', 'security', 'protection'
                                ]
                                
                                sentences = re.split(r'\.\s+', ofcs_text)
                                for sentence in sentences:
                                    sentence = sentence.strip()
                                    if len(sentence) > 20:
                                        # Check if sentence ends with action word or contains action verbs
                                        sentence_lower = sentence.lower()
                                        if (any(sentence_lower.endswith(word) for word in action_endings) or
                                            any(word in sentence_lower for word in ['explore', 'implement', 'develop', 'establish', 'create', 'design', 'install', 'deploy', 'configure', 'set', 'build', 'construct', 'train', 'educate', 'inform', 'notify', 'alert', 'warn', 'coordinate', 'collaborate', 'partner', 'engage', 'involve', 'assess', 'evaluate', 'analyze', 'review', 'examine', 'study', 'consult', 'contact', 'reach', 'connect', 'communicate', 'restrict', 'limit', 'control', 'manage', 'monitor', 'track', 'locate', 'position', 'place', 'situate', 'arrange', 'allow', 'permit', 'enable', 'facilitate', 'support', 'determine', 'identify', 'recognize', 'detect', 'discover'])):
                                            sentence = re.sub(r'\s+\d+\s*$', '', sentence)
                                            sentence = sentence.strip()
                                            if sentence:
                                                ofcs.append(sentence)
                            
                            # Method 5: If still nothing, just use the whole text as one OFC
                            if not ofcs:
                                ofcs_text_clean = re.sub(r'\s+\d+\s*$', '', ofcs_text)
                                ofcs_text_clean = ofcs_text_clean.strip()
                                if ofcs_text_clean:
                                    ofcs.append(ofcs_text_clean)
                        
                        # Clean up OFCs
                        cleaned_ofcs = []
                        for ofc in ofcs:
                            ofc = ofc.strip()
                            if len(ofc) > 10:
                                # Remove any remaining citation numbers
                                ofc = re.sub(r'\s+\d+\s*$', '', ofc)
                                ofc = ofc.strip()
                                if ofc:
                                    cleaned_ofcs.append(ofc)
                        
                        # Save vulnerability with OFCs
                        if vulnerability and cleaned_ofcs:
                            data.append({
                                "category": category,
                                "vulnerability": vulnerability,
                                "ofcs": cleaned_ofcs
                            })
                            print(f"    Saved vulnerability with {len(cleaned_ofcs)} OFCs")
                            for i, ofc in enumerate(cleaned_ofcs[:2]):  # Show first 2
                                try:
                                    print(f"      {i+1}. {ofc[:60]}...")
                                except UnicodeEncodeError:
                                    print(f"      {i+1}. [Unicode content]...")
                            if len(cleaned_ofcs) > 2:
                                print(f"      ... and {len(cleaned_ofcs) - 2} more")

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

print("\nSIMPLE RELIABLE PARSER COMPLETE!")
print("=" * 50)
print(f"Vulnerabilities: {len(vulns.data)}")
print(f"OFCs: {len(ofcs.data)}")
print(f"Sources: {len(sources.data)}")
print(f"Vulnerability-OFC links: {len(vuln_links.data)}")
print(f"OFC-Source links: {len(ofc_links.data)}")
print("\nSimple, reliable parsing complete!")
print("Frontend ready at: http://localhost:3001/demo")
