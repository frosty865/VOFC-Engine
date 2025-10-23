import csv
from collections import defaultdict

csv_path = "C:/Users/frost/OneDrive/Desktop/Projects/Tools/CSV/VOFC_vulnerability_ofc_links.csv"

print("CHECKING CSV STRUCTURE")
print("=" * 50)

vulns = defaultdict(list)

with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        vulns[row['vulnerability_id']].append(row['ofc_id'])

print(f"Total vulnerabilities: {len(vulns)}")
print(f"Total links: {sum(len(ofcs) for ofcs in vulns.values())}")

# Check for vulnerabilities with multiple OFCs
multi_ofc_vulns = {vuln: ofcs for vuln, ofcs in vulns.items() if len(ofcs) > 1}
print(f"\nVulnerabilities with multiple OFCs: {len(multi_ofc_vulns)}")

if multi_ofc_vulns:
    print("\nFirst 10 vulnerabilities with multiple OFCs:")
    for i, (vuln, ofcs) in enumerate(list(multi_ofc_vulns.items())[:10]):
        print(f"  {vuln}: {len(ofcs)} OFCs")
        for ofc in ofcs:
            print(f"    - {ofc}")

# Check for OFCs with multiple vulnerabilities
ofcs = defaultdict(list)
with open(csv_path, 'r', encoding='utf-8') as f:
    reader = csv.DictReader(f)
    for row in reader:
        ofcs[row['ofc_id']].append(row['vulnerability_id'])

multi_vuln_ofcs = {ofc: vulns for ofc, vulns in ofcs.items() if len(vulns) > 1}
print(f"\nOFCs with multiple vulnerabilities: {len(multi_vuln_ofcs)}")

if multi_vuln_ofcs:
    print("\nFirst 10 OFCs with multiple vulnerabilities:")
    for i, (ofc, vulns) in enumerate(list(multi_vuln_ofcs.items())[:10]):
        print(f"  {ofc}: {len(vulns)} vulnerabilities")
        for vuln in vulns:
            print(f"    - {vuln}")
