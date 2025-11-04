# Fix Ollama 403 Forbidden Error

## DNS Configuration Status
✅ **All DNS records are correctly configured:**
- `backend.frostech.site` → Tunnel ID `17152659-d3ad-4...` (Proxied)
- `flask.frostech.site` → Tunnel ID `17152659-d3ad-4...` (Proxied) ✓ Working
- `ollama.frostech.site` → Tunnel ID `17152659-d3ad-4...` (Proxied) ✗ 403 Error

## Root Cause
Since Flask works but Ollama doesn't, and they use the same tunnel, the issue is **Cloudflare Access/WAF blocking Ollama specifically**.

## Solution Steps

### Step 1: Check Cloudflare Access (Zero Trust)
1. Go to: **Cloudflare Dashboard** → **Zero Trust** → **Access** → **Applications**
2. Search for: `ollama.frostech.site`
3. If found:
   - **Option A**: Delete the Access application (if you want public access)
   - **Option B**: Edit it and add a public access policy:
     - Policy Name: "Public Access"
     - Action: Allow
     - Include: Everyone
     - Require: (leave empty or set to "Service Auth" if needed)

### Step 2: Check WAF Rules
1. Go to: **Cloudflare Dashboard** → **Security** → **WAF**
2. Check for any rules blocking `ollama.frostech.site`
3. Look for:
   - Rate limiting rules
   - Custom WAF rules
   - Firewall rules targeting this domain

### Step 3: Check Page Rules
1. Go to: **Cloudflare Dashboard** → **Rules** → **Page Rules**
2. Check if `ollama.frostech.site` has any rules that might be blocking it
3. Compare with `flask.frostech.site` rules (which is working)

### Step 4: Verify Tunnel Status
1. Go to: **Cloudflare Dashboard** → **Zero Trust** → **Networks** → **Tunnels**
2. Find tunnel: `17152659-d3ad-4abf-ae71-d0cc9d2b89e3`
3. Verify it shows as "Active" or "Healthy"
4. Check for any errors or warnings

### Step 5: Test After Changes
```powershell
# Test Ollama tunnel
curl https://ollama.frostech.site/api/tags

# Should return: {"models":[...]} instead of 403
```

## Quick Fix (If Access is the Issue)
If you find an Access application for `ollama.frostech.site`:

1. **Delete it** (simplest - allows public access)
2. **OR** Add public policy:
   - Include: `Everyone`
   - Action: `Allow`
   - No authentication required

## Why Flask Works But Ollama Doesn't
- Both use the same tunnel ✓
- Both are proxied ✓
- DNS is correct ✓
- **Difference**: Cloudflare Access/WAF settings are different for Ollama

This is a **Cloudflare configuration issue**, not a tunnel or service issue.

