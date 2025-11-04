# Check Cloudflare Settings for Ollama 403

Since Zero Trust Access is NOT configured, the 403 must be from:
- WAF Rules
- Firewall Rules
- Rate Limiting
- SSL/TLS Settings
- Page Rules

## Step-by-Step Check

### 1. Check WAF Rules
**Location:** Security → WAF → Custom Rules

1. Go to Cloudflare Dashboard → Security → WAF
2. Click "Custom Rules"
3. Look for rules that might:
   - Block `ollama.frostech.site`
   - Block `/api/*` paths
   - Have different rules for different subdomains

**Action:** Compare rules for `flask.frostech.site` (working) vs `ollama.frostech.site` (blocked)

### 2. Check Firewall Rules
**Location:** Security → WAF → Firewall Rules

1. Go to Security → WAF → Firewall Rules
2. Look for rules targeting:
   - Hostname contains `ollama`
   - URI path contains `/api`
   - Different actions for different subdomains

**Action:** Check if there's a rule blocking Ollama but allowing Flask

### 3. Check Rate Limiting
**Location:** Security → WAF → Rate Limiting Rules

1. Go to Security → WAF → Rate Limiting Rules
2. Check if any rate limits are:
   - Too restrictive for `/api/tags`
   - Different for different subdomains

### 4. Check SSL/TLS Settings
**Location:** SSL/TLS → Overview

1. Go to SSL/TLS → Overview
2. Check SSL/TLS encryption mode
3. Verify both `flask.frostech.site` and `ollama.frostech.site` have same settings

### 5. Check Page Rules
**Location:** Rules → Page Rules

1. Go to Rules → Page Rules
2. Check if there are different rules for:
   - `flask.frostech.site/*`
   - `ollama.frostech.site/*`

### 6. Check Bot Fight Mode
**Location:** Security → Bots

1. Go to Security → Bots
2. Check Bot Fight Mode settings
3. See if it's blocking API requests to Ollama

### 7. Check Workers/Transform Rules
**Location:** Rules → Transform Rules

1. Go to Rules → Transform Rules
2. Check if any transform rules are affecting Ollama differently

## Quick Test

Try accessing Ollama with different endpoints to see if it's specific:
```powershell
# Test root
curl https://ollama.frostech.site/

# Test /api/tags
curl https://ollama.frostech.site/api/tags

# Test /api/version
curl https://ollama.frostech.site/api/version
```

## Most Likely Causes (in order)

1. **WAF Custom Rule** - Different rule for Ollama subdomain
2. **Firewall Rule** - Blocking Ollama specifically
3. **Bot Fight Mode** - Blocking API requests
4. **Page Rule** - Different settings for Ollama

## Fix Priority

1. Check WAF → Custom Rules first (most common)
2. Check Firewall Rules
3. Check Bot Fight Mode
4. Compare all settings between Flask (working) and Ollama (blocked)

