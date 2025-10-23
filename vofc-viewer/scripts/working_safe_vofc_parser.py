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

# Write results
with open("working_safe_vofc_library.json", "w", encoding="utf-8") as f:
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
