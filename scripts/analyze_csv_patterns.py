import csv
from collections import defaultdict, Counter

csv_path = "C:/Users/frost/OneDrive/Desktop/Projects/Tools/CSV"

print("ANALYZING CSV PATTERNS")
print("=" * 50)

# Load all data
vulns = {}
ofcs = {}
links = {}

# Load vulnerabilities
with open(f"{csv_path}/VOFC_vulnerabilities.csv", 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        vulns[row['id']] = row

# Load OFCs
with open(f"{csv_path}/VOFC_options_for_consideration.csv", 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        ofcs[row['id']] = row

# Load links
with open(f"{csv_path}/VOFC_vulnerability_ofc_links.csv", 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        links[row['id']] = row

print(f"Total vulnerabilities: {len(vulns)}")
print(f"Total OFCs: {len(ofcs)}")
print(f"Total links: {len(links)}")

# Check for duplicate vulnerability text
vuln_texts = [v['vulnerability'] for v in vulns.values()]
vuln_text_counts = Counter(vuln_texts)
duplicates = {text: count for text, count in vuln_text_counts.items() if count > 1}

print(f"\nDuplicate vulnerability texts: {len(duplicates)}")
if duplicates:
    print("First 5 duplicates:")
    for i, (text, count) in enumerate(list(duplicates.items())[:5]):
        print(f"  '{text[:50]}...' appears {count} times")

# Check for duplicate OFC text
ofc_texts = [o['option_text'] for o in ofcs.values()]
ofc_text_counts = Counter(ofc_texts)
ofc_duplicates = {text: count for text, count in ofc_text_counts.items() if count > 1}

print(f"\nDuplicate OFC texts: {len(ofc_duplicates)}")
if ofc_duplicates:
    print("First 5 duplicates:")
    for i, (text, count) in enumerate(list(ofc_duplicates.items())[:5]):
        print(f"  '{text[:50]}...' appears {count} times")

# Check discipline patterns
disciplines = [v['discipline'] for v in vulns.values()]
discipline_counts = Counter(disciplines)
print(f"\nDiscipline distribution:")
for disc, count in discipline_counts.most_common():
    print(f"  {disc}: {count}")

# Check if there are any patterns in the data that suggest grouping
print(f"\nAnalyzing potential grouping patterns...")

# Look for vulnerabilities that might be the same but with different IDs
similar_vulns = defaultdict(list)
for vuln_id, vuln in vulns.items():
    # Use first 50 characters as a similarity key
    key = vuln['vulnerability'][:50]
    similar_vulns[key].append(vuln_id)

potential_groups = {key: vulns for key, vulns in similar_vulns.items() if len(vulns) > 1}
print(f"Potential vulnerability groups: {len(potential_groups)}")

if potential_groups:
    print("First 3 potential groups:")
    for i, (key, vuln_ids) in enumerate(list(potential_groups.items())[:3]):
        print(f"  Group {i+1}: {len(vuln_ids)} vulnerabilities")
        for vuln_id in vuln_ids:
            vuln = vulns[vuln_id]
            print(f"    {vuln_id}: {vuln['vulnerability'][:80]}...")
