import re
from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

print("DEBUG: Detailed Bullet Analysis")
print("=" * 50)

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
        # Check for various bullet types
        if (line.startswith('•') or 
            line.startswith('◦') or
            line.startswith('▪') or
            line.startswith('▫') or
            line.startswith('‣') or
            line.startswith('⁃') or
            line.startswith('-') or
            line.startswith('*') or
            re.match(r'^\s*[•◦▪▫‣⁃⁌⁍⁎⁏⁐⁑⁒⁓⁔⁕⁖⁗⁘⁙⁚⁛⁜⁝⁞\-*]\s', line)):
            bullet_lines.append((i, line))
    
    print(f"Found {len(bullet_lines)} bullet lines:")
    for i, (line_num, line) in enumerate(bullet_lines[:10]):  # First 10
        try:
            print(f"  {i+1}. Line {line_num}: {line[:100]}...")
        except UnicodeEncodeError:
            print(f"  {i+1}. Line {line_num}: [Unicode content]")
    
    # Also look for "The facility" lines and what comes after them
    facility_lines = []
    for i, line in enumerate(lines):
        if "The facility" in line:
            facility_lines.append((i, line))
            # Show the next few lines after each facility line
            print(f"\nFacility line {i}: {line[:50]}...")
            for j in range(1, 6):  # Next 5 lines
                if i + j < len(lines):
                    next_line = lines[i + j]
                    print(f"  +{j}: {next_line[:80]}...")
    
    print(f"Found {len(facility_lines)} facility lines")
    
    # Look for patterns that might be OFCs
    print(f"\nLooking for OFC patterns...")
    for i, line in enumerate(lines):
        if (line.startswith('Evaluate') or 
            line.startswith('Install') or 
            line.startswith('Explore') or
            line.startswith('Consult') or
            line.startswith('Develop') or
            line.startswith('Create') or
            line.startswith('Establish') or
            line.startswith('Maintain') or
            line.startswith('Ensure') or
            re.search(r'\d{2,3}\s*$', line)):  # Ends with citation number
            print(f"  Potential OFC line {i}: {line[:80]}...")
