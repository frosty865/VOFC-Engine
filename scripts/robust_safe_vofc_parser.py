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
    
    print(f"\n=== PAGE {page_num + 1} ===")
    
    i = 0
    while i < len(lines):
        line = lines[i]
        
        # Skip table headers
        if "Category" in line and "Vulnerability" in line:
            i += 1
            continue
        
        # Debug: print first few lines of each page
        if i < 5:
            print(f"  Line {i}: {line}")
        
        # Look for category patterns (short, not sentences)
        if (len(line.split()) <= 4 and 
            not line.endswith('.') and 
            not line.startswith('The') and
            not line.startswith('Facility') and
            not line.startswith('April') and
            not line.isdigit() and
            line not in ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'] and
            line not in ['Category', 'Vulnerability', 'Options for Consideration']):
            
            print(f"  Found potential category: {line}")
            
            # Save previous vulnerability if exists
            if current_vulnerability and current_ofcs:
                data.append({
                    "category": current_category,
                    "vulnerability": current_vulnerability,
                    "ofcs": current_ofcs
                })
                print(f"  Saved vulnerability: {current_vulnerability[:50]}...")
                current_ofcs = []
            
            current_category = line
            current_vulnerability = None
            i += 1
            continue
        
        # Look for vulnerability patterns
        if (line.startswith("The facility") or 
            line.startswith("Facility personnel") or
            line.startswith("The primary") or
            line.startswith("The facility does not")):
            
            print(f"  Found potential vulnerability: {line[:50]}...")
            
            # Save previous vulnerability if exists
            if current_vulnerability and current_ofcs:
                data.append({
                    "category": current_category,
                    "vulnerability": current_vulnerability,
                    "ofcs": current_ofcs
                })
                print(f"  Saved vulnerability: {current_vulnerability[:50]}...")
                current_ofcs = []
            
            # Collect vulnerability text
            vulnerability_text = line
            i += 1
            
            # Continue collecting vulnerability text
            while i < len(lines):
                next_line = lines[i]
                
                # Check if this is an OFC
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
            print(f"  Set vulnerability: {current_vulnerability[:50]}...")
            continue
        
        # Look for OFCs
        if (line.startswith('•') or 
            line.startswith('-') or
            re.match(r'^\d+\.', line) or
            re.search(r'\[cite:', line)):
            
            ofc_text = re.sub(r'^[•\-]\s*', '', line)
            ofc_text = re.sub(r'^\d+\.\s*', '', ofc_text)
            ofc_text = ofc_text.strip()
            
            if ofc_text:
                current_ofcs.append(ofc_text)
                print(f"  Added OFC: {ofc_text[:30]}...")
        
        i += 1

# Save the last vulnerability
if current_vulnerability and current_ofcs:
    data.append({
        "category": current_category,
        "vulnerability": current_vulnerability,
        "ofcs": current_ofcs
    })

# Write results
with open("robust_safe_vofc_library.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

print(f"\nExtracted {len(data)} vulnerability groups")
print(f"Categories found: {set(entry['category'] for entry in data if entry['category'])}")

# Show sample
if data:
    print(f"\nSample vulnerability:")
    print(f"Category: {data[0]['category']}")
    print(f"Vulnerability: {data[0]['vulnerability'][:100]}...")
    print(f"OFCs: {len(data[0]['ofcs'])} options")
