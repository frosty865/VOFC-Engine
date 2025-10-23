import re, json
from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

data = []
current_category = None
current_vulnerability = None
current_ofcs = []

print(f"Processing {len(reader.pages)} pages...")

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
        
        # Look for category "Information Sharing" or similar
        if line == "Information Sharing":
            # Save previous vulnerability if exists
            if current_vulnerability and current_ofcs:
                data.append({
                    "category": current_category,
                    "vulnerability": current_vulnerability,
                    "ofcs": current_ofcs
                })
                current_ofcs = []
            
            current_category = line
            current_vulnerability = None
            i += 1
            continue
        
        # Look for vulnerability patterns (starts with "The facility")
        if line.startswith("The facility"):
            # Save previous vulnerability if exists
            if current_vulnerability and current_ofcs:
                data.append({
                    "category": current_category,
                    "vulnerability": current_vulnerability,
                    "ofcs": current_ofcs
                })
                current_ofcs = []
            
            # Collect vulnerability text (may span multiple lines)
            vulnerability_text = line
            i += 1
            
            # Continue collecting vulnerability text until we hit an OFC or next vulnerability
            while i < len(lines):
                next_line = lines[i]
                
                # Check if this is an OFC (has citation like "4" or starts with bullet)
                if (re.search(r'\d+$', next_line) or  # Ends with number (citation)
                    next_line.startswith('•') or 
                    next_line.startswith('-') or
                    re.match(r'^\d+\.', next_line) or
                    re.search(r'\[cite:', next_line) or
                    next_line.startswith("The facility")):
                    break
                
                # If it's still part of the vulnerability, add it
                if next_line and not next_line.startswith('Category'):
                    vulnerability_text += " " + next_line
                    i += 1
                else:
                    break
            
            current_vulnerability = vulnerability_text.strip()
            continue
        
        # Look for OFCs (lines that end with citation numbers or start with bullets)
        if (re.search(r'\d+$', line) or  # Ends with number (citation)
            line.startswith('•') or 
            line.startswith('-') or
            re.match(r'^\d+\.', line) or
            re.search(r'\[cite:', line)):
            
            # Clean up the OFC text
            ofc_text = re.sub(r'^[•\-]\s*', '', line)
            ofc_text = re.sub(r'^\d+\.\s*', '', ofc_text)
            ofc_text = re.sub(r'\s+\d+$', '', ofc_text)  # Remove citation number at end
            ofc_text = ofc_text.strip()
            
            if ofc_text and len(ofc_text) > 10:  # Only add substantial OFCs
                current_ofcs.append(ofc_text)
        
        i += 1

# Save the last vulnerability
if current_vulnerability and current_ofcs:
    data.append({
        "category": current_category,
        "vulnerability": current_vulnerability,
        "ofcs": current_ofcs
    })

# Write results
with open("final_safe_vofc_library.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Extracted {len(data)} vulnerability groups")

# Show statistics
if data:
    categories_found = set(entry['category'] for entry in data if entry['category'])
    print(f"Categories found: {categories_found}")
    
    total_ofcs = sum(len(entry['ofcs']) for entry in data)
    print(f"Total OFCs: {total_ofcs}")
    
    print(f"\nSample vulnerability:")
    print(f"Category: {data[0]['category']}")
    print(f"Vulnerability: {data[0]['vulnerability'][:100]}...")
    print(f"OFCs: {len(data[0]['ofcs'])} options")
    
    # Show first few OFCs
    for i, ofc in enumerate(data[0]['ofcs'][:3]):
        print(f"  OFC {i+1}: {ofc[:50]}...")
