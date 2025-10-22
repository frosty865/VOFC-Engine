import re, json
from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

print(f"PDF has {len(reader.pages)} pages")

# Look at specific pages to find bullet patterns
for page_num in [3, 4, 5]:
    page = reader.pages[page_num]
    text = page.extract_text()
    if not text:
        continue
    
    print(f"\n=== PAGE {page_num + 1} ===")
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    # Look for lines that start with bullet-like characters
    bullet_lines = []
    for i, line in enumerate(lines):
        if (line.startswith('•') or 
            line.startswith('-') or 
            line.startswith('*') or
            re.match(r'^\s*[•\-*]\s', line)):
            bullet_lines.append((i, line))
    
    print(f"Found {len(bullet_lines)} bullet lines:")
    for i, (line_num, line) in enumerate(bullet_lines[:10]):  # First 10
        try:
            print(f"  {i+1}. Line {line_num}: {line[:100]}...")
        except UnicodeEncodeError:
            print(f"  {i+1}. Line {line_num}: [Unicode content]")
    
    # Also look for "The facility" lines
    facility_lines = []
    for i, line in enumerate(lines):
        if "The facility" in line:
            facility_lines.append((i, line))
    
    print(f"Found {len(facility_lines)} facility lines:")
    for i, (line_num, line) in enumerate(facility_lines[:5]):  # First 5
        try:
            print(f"  {i+1}. Line {line_num}: {line[:100]}...")
        except UnicodeEncodeError:
            print(f"  {i+1}. Line {line_num}: [Unicode content]")
