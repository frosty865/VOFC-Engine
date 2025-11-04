# Fix Ollama 403 Forbidden - Step by Step

## Confirmed Issues
- ✅ Flask: Working (200 OK)
- ❌ Ollama: 403 Forbidden from Cloudflare
- ❌ Ollama /api/version: 503 Service Unavailable
- ❌ Zero Trust Access: NOT configured (so not the issue)

## Root Cause
Cloudflare WAF or Firewall Rules are blocking Ollama specifically.

## Fix Steps (In Order)

### Step 1: Check WAF Custom Rules ⚠️ MOST LIKELY
1. Go to: **Cloudflare Dashboard** → **Security** → **WAF** → **Custom Rules**
2. Look for rules that:
   - Match hostname contains `ollama`
   - Match URI path contains `/api`
   - Have different actions for different subdomains
3. **Action:** 
   - If you find a rule blocking Ollama, either:
     - Delete it, OR
     - Modify it to exclude `ollama.frostech.site`, OR
     - Add `flask.frostech.site` to the same rule (so both are treated the same)

### Step 2: Check Firewall Rules
1. Go to: **Security** → **WAF** → **Firewall Rules**
2. Look for rules targeting:
   - `(http.host eq "ollama.frostech.site")`
   - `(http.request.uri.path contains "/api")`
3. **Action:** Disable or modify rules blocking Ollama

### Step 3: Check Rate Limiting
1. Go to: **Security** → **WAF** → **Rate Limiting Rules**
2. Check if any rate limits are too restrictive
3. **Action:** Adjust or disable if needed

### Step 4: Check Bot Fight Mode
1. Go to: **Security** → **Bots**
2. Check Bot Fight Mode settings
3. **Action:** If enabled, try disabling or adjusting for API endpoints

### Step 5: Check Page Rules
1. Go to: **Rules** → **Page Rules**
2. Compare rules for:
   - `flask.frostech.site/*`
   - `ollama.frostech.site/*`
3. **Action:** Ensure both have same settings

### Step 6: Check SSL/TLS Settings
1. Go to: **SSL/TLS** → **Overview**
2. Verify both subdomains have same SSL/TLS encryption mode
3. **Action:** Ensure both are using "Full" or "Full (strict)" mode

## Quick Fix (If You Find a WAF Rule)

If you find a WAF custom rule blocking Ollama:

**Option A: Delete the Rule**
- Simply delete the rule if it's not needed

**Option B: Modify the Rule**
- Change the rule expression to exclude Ollama:
  ```
  (http.host eq "ollama.frostech.site")
  ```
  Change to:
  ```
  (http.host eq "flask.frostech.site")
  ```
  Or add an exception:
  ```
  (http.host eq "ollama.frostech.site" and not http.request.uri.path contains "/api")
  ```

## Test After Each Fix

```powershell
curl https://ollama.frostech.site/api/tags
# Should return: {"models":[...]} instead of 403
```

## Most Likely Location
**95% chance it's in:** Security → WAF → Custom Rules

Look for any rule that mentions:
- `ollama`
- `/api`
- Different behavior for subdomains

## Why Flask Works But Ollama Doesn't
Even though they use the same tunnel, Cloudflare WAF/Firewall rules can target specific hostnames. There's likely a rule that:
- Blocks `ollama.frostech.site` specifically, OR
- Blocks `/api/*` paths but Flask has an exception, OR
- Has different rules based on subdomain

