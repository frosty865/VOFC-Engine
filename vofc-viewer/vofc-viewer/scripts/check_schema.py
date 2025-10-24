import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load credentials
load_dotenv("../../.env")
SUPABASE_URL = os.getenv("SUPABASE_URL") or "https://wivohgbuuwxoyfyzntsd.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or "sb_secret_o6CXg_vuAGMAvnnsfgNDqw_9ZQoQyUk"

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

print("CHECKING DATABASE SCHEMA")
print("=" * 50)

# Check sources table
print("Sources table:")
sources = supabase.table("sources").select("*").limit(1).execute()
if sources.data:
    print("Columns:", list(sources.data[0].keys()))
else:
    print("No data in sources table")

# Check vulnerabilities table
print("\nVulnerabilities table:")
vulns = supabase.table("vulnerabilities").select("*").limit(1).execute()
if vulns.data:
    print("Columns:", list(vulns.data[0].keys()))
else:
    print("No data in vulnerabilities table")

# Check OFCs table
print("\nOptions for Consideration table:")
ofcs = supabase.table("options_for_consideration").select("*").limit(1).execute()
if ofcs.data:
    print("Columns:", list(ofcs.data[0].keys()))
else:
    print("No data in options_for_consideration table")
