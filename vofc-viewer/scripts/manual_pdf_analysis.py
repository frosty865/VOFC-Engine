import re, json
from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

print(f"PDF has {len(reader.pages)} pages")

# Let's manually examine a few specific pages to understand the structure
for page_num in [3, 4, 5]:
    page = reader.pages[page_num]
    text = page.extract_text()
    if not text:
        continue
    
    print(f"\n=== PAGE {page_num + 1} FULL TEXT ===")
    try:
        print(text)
    except UnicodeEncodeError:
        print("[Unicode content - cannot display]")
    print("\n" + "="*80)
