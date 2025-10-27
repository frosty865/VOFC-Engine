import re, json
from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

print(f"PDF has {len(reader.pages)} pages")

# Examine first few pages to understand structure
for page_num in range(min(5, len(reader.pages))):
    print(f"\n=== PAGE {page_num + 1} ===")
    text = reader.pages[page_num].extract_text()
    if text:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        for i, line in enumerate(lines[:20]):  # First 20 lines
            try:
                print(f"{i+1:2d}: {line}")
            except UnicodeEncodeError:
                print(f"{i+1:2d}: [Unicode content]")
        if len(lines) > 20:
            print(f"... and {len(lines) - 20} more lines")
    else:
        print("No text extracted from this page")
