import re, json
from pathlib import Path
from PyPDF2 import PdfReader

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

all_text = []
for page_num, page in enumerate(reader.pages):
    text = page.extract_text()
    if text:
        lines = [l.strip() for l in text.split("\n") if l.strip()]
        all_text.extend([(page_num + 1, line) for line in lines])

# Look for patterns
print("Looking for 'The facility' patterns:")
facility_lines = [line for page, line in all_text if "The facility" in line]
for i, line in enumerate(facility_lines[:10]):  # First 10
    print(f"{i+1}: {line}")

print("\nLooking for 'Information Sharing' patterns:")
info_lines = [line for page, line in all_text if "Information Sharing" in line]
for i, line in enumerate(info_lines[:10]):
    print(f"{i+1}: {line}")

print("\nLooking for citation patterns (ending with numbers):")
citation_lines = [line for page, line in all_text if re.search(r'\d+$', line) and len(line) > 20]
for i, line in enumerate(citation_lines[:10]):
    print(f"{i+1}: {line}")

print(f"\nTotal lines extracted: {len(all_text)}")
print(f"Lines with 'The facility': {len(facility_lines)}")
print(f"Lines with 'Information Sharing': {len(info_lines)}")
print(f"Lines ending with numbers: {len(citation_lines)}")
