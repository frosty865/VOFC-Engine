import re, json
from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

print(f"Processing {len(reader.pages)} pages...")

# Look at specific pages that should have vulnerabilities
for page_num in [3, 4, 5]:
    page = reader.pages[page_num]
    text = page.extract_text()
    if not text:
        continue
    
    print(f"\n=== PAGE {page_num + 1} ===")
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    
    for i, line in enumerate(lines[:30]):  # First 30 lines
        try:
            print(f"{i+1:2d}: {line}")
        except UnicodeEncodeError:
            print(f"{i+1:2d}: [Unicode content]")
    
    print(f"... and {len(lines) - 30} more lines" if len(lines) > 30 else "")
