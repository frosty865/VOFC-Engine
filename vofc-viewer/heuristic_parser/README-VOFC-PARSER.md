
# VOFC Heuristic Parser

A comprehension-driven parser that extracts **Vulnerabilities** and **Options for Consideration (OFCs)** from unstructured documents (PDF/HTML/DOCX/TXT). It uses linguistic heuristics, section-aware context, and (optionally) sentence embeddings for smarter clustering.

## Install (optional deps)
```bash
python -m venv .venv && source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Usage
```bash
python vofc_heuristic_parser.py ./sample.pdf --source-url https://example
python vofc_heuristic_parser.py ./page.html --min-confidence 0.55 --out result.json
python vofc_heuristic_parser.py ./memo.txt --category-hint "Emergency Action Plan"
```
