import os
from supabase import create_client
from dotenv import load_dotenv

load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Check vulnerabilities
vulns = supabase.table('vulnerabilities').select('*').limit(5).execute()
print(f'Vulnerabilities found: {len(vulns.data)}')
if vulns.data:
    print(f'Sample vulnerability: {vulns.data[0]["vulnerability"][:100]}...')

# Check OFCs
ofcs = supabase.table('options_for_consideration').select('*').limit(5).execute()
print(f'OFCs found: {len(ofcs.data)}')
if ofcs.data:
    print(f'Sample OFC: {ofcs.data[0]["option_text"][:100]}...')

# Check links
links = supabase.table('vulnerability_ofc_links').select('*').limit(5).execute()
print(f'Links found: {len(links.data)}')

# Check ISAC vulnerability specifically
isac_vulns = supabase.table('vulnerabilities').select('*').ilike('vulnerability', '%ISAC%').execute()
print(f'ISAC vulnerabilities found: {len(isac_vulns.data)}')
if isac_vulns.data:
    print(f'ISAC vulnerability: {isac_vulns.data[0]["vulnerability"][:100]}...')
