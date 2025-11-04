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
            
        # Detect category (usually single words or short phrases, not sentences)
        if (len(line.split()) <= 3 and 
            not line.endswith('.') and 
            not line.startswith('The') and
            not line.startswith('Facility') and
            not line.startswith('April') and
            line not in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']):
            
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
        
        # Detect vulnerability (starts with "The facility" or similar)
        if (line.startswith("The facility") or 
            line.startswith("Facility personnel") or
            line.startswith("The primary") or
            line.startswith("The facility does not")):
            
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
            
            # Continue collecting vulnerability text until we hit an OFC
            while i < len(lines):
                next_line = lines[i]
                
                # Check if this is an OFC (starts with bullet or number)
                if (next_line.startswith('•') or 
                    next_line.startswith('-') or
                    re.match(r'^\d+\.', next_line) or
                    re.search(r'\[cite:', next_line)):
                    break
                
                # If it's still part of the vulnerability, add it
                if next_line and not next_line.startswith('Category'):
                    vulnerability_text += " " + next_line
                    i += 1
                else:
                    break
            
            current_vulnerability = vulnerability_text.strip()
            continue
        
        # Detect OFCs (bullet points, numbered items, or items with citations)
        if (line.startswith('•') or 
            line.startswith('-') or
            re.match(r'^\d+\.', line) or
            re.search(r'\[cite:', line)):
            
            # Clean up the OFC text
            ofc_text = re.sub(r'^[•\-]\s*', '', line)  # Remove bullet
            ofc_text = re.sub(r'^\d+\.\s*', '', ofc_text)  # Remove number
            ofc_text = ofc_text.strip()
            
            if ofc_text:
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
with open("improved_safe_vofc_library.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"Extracted {len(data)} vulnerability groups")
print(f"Categories found: {set(entry['category'] for entry in data if entry['category'])}")

# Show sample
if data:
    print(f"\nSample vulnerability:")
    print(f"Category: {data[0]['category']}")
    print(f"Vulnerability: {data[0]['vulnerability'][:100]}...")
    print(f"OFCs: {len(data[0]['ofcs'])} options")
