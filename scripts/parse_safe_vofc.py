# parse_safe_vofc.py
import re, json
from pathlib import Path
from PyPDF2 import PdfReader
import pandas as pd

pdf_path = Path("docs/data/SAFE VOFC Library.pdf")
reader = PdfReader(pdf_path)

data = []
current_category = None
current_vulnerability = None
current_ofcs = []

# simple text parser
for page in reader.pages:
    text = page.extract_text()
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        # Category lines often in ALL CAPS
        if re.match(r"^[A-Z ]{3,}$", line) and len(line.split()) <= 5:
            if current_vulnerability and current_ofcs:
                data.append({
                    "category": current_category,
                    "vulnerability": current_vulnerability,
                    "ofcs": current_ofcs
                })
                current_ofcs = []
            current_category = line.title()
            continue

        # Vulnerability line (ends with .)
        if re.match(r"^[A-Z].*?\.$", line) and not line.startswith("•"):
            if current_vulnerability and current_ofcs:
                data.append({
                    "category": current_category,
                    "vulnerability": current_vulnerability,
                    "ofcs": current_ofcs
                })
                current_ofcs = []
            current_vulnerability = line.strip()
            continue

        # Option for consideration
        if line.startswith("•") or line.startswith("-") or re.search(r"\[cite:", line):
            current_ofcs.append(line.lstrip("•- ").strip())

# append last
if current_vulnerability and current_ofcs:
    data.append({
        "category": current_category,
        "vulnerability": current_vulnerability,
        "ofcs": current_ofcs
    })

# write full JSON
with open("safe_vofc_library.json", "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)

# build link CSVs (stub for now)
links = []
sources = []
for entry in data:
    for ofc in entry["ofcs"]:
        cites = re.findall(r"\[cite: ([0-9, ]+)\]", ofc)
        if cites:
            for c in re.split(r", ?", cites[0]):
                sources.append({
                    "vulnerability": entry["vulnerability"],
                    "ofc_text": ofc,
                    "reference_number": int(c)
                })
        links.append({
            "vulnerability": entry["vulnerability"],
            "ofc_text": ofc
        })

pd.DataFrame(links).to_csv("vulnerability_ofc_links_import.csv", index=False)
pd.DataFrame(sources).to_csv("ofc_sources_import.csv", index=False)

print(f"Extracted {len(data)} vulnerability groups")
