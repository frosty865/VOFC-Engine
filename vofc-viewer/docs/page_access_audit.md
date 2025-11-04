# VOFC Engine - Page Access Audit for User Groups

## User Groups Defined

Based on `create_user_groups.sql`:

### 1. **admin** - Administrator
- **Permissions**: Full system access
- **Can**: manage_users, edit_ofc, delete_ofc, submit_doc, view_analytics, manage_system

### 2. **spsa** - Senior PSA  
- **Permissions**: Elevated privileges
- **Can**: manage_users, edit_ofc, delete_ofc, submit_doc, view_analytics
- **Cannot**: manage_system

### 3. **psa** - PSA
- **Permissions**: Standard privileges  
- **Can**: edit_ofc, submit_doc, view_analytics
- **Cannot**: manage_users, delete_ofc, manage_system

### 4. **analyst** - Analyst
- **Permissions**: Read and submit privileges
- **Can**: edit_ofc, submit_doc
- **Cannot**: manage_users, delete_ofc, view_analytics, manage_system

## Current Page Access Analysis

### 🔴 **CRITICAL INCONSISTENCIES FOUND**

#### 1. **Admin Users Page** (`/admin/users/page.jsx`)
- **Current**: Only allows `admin` role
- **Issue**: Should allow `admin` AND `spsa` (both can manage users)
- **Fix Needed**: Update role check to include `spsa`

#### 2. **Admin OFCs Route** (`/api/admin/ofcs/route.js`)
- **Current**: Allows `['admin', 'spsa', 'analyst']`
- **Issue**: `analyst` should NOT have admin access to OFCs
- **Fix Needed**: Remove `analyst` from admin access

#### 3. **Admin Disciplines Page** (`/admin/disciplines/page.jsx`)
- **Current**: Allows `admin`, `spsa`, `analyst`
- **Issue**: `analyst` should NOT manage disciplines
- **Fix Needed**: Remove `analyst` from discipline management

#### 4. **Auth Server** (`/lib/auth-server.js`)
- **Current**: `requireAdmin` only allows `['admin', 'spsa']`
- **Issue**: Inconsistent with other admin checks
- **Fix Needed**: Standardize admin access across all components

#### 5. **Auth Library** (`/lib/auth.js`)
- **Current**: `canAccessAdmin` allows `['admin', 'spsa', 'analyst', 'psa']`
- **Issue**: Too permissive - `psa` and `analyst` should not have admin access
- **Fix Needed**: Restrict to `['admin', 'spsa']` only

## Recommended Access Control Matrix

| Page/Route | admin | spsa | psa | analyst | Notes |
|------------|-------|------|-----|---------|-------|
| `/admin` | ✅ | ✅ | ❌ | ❌ | Admin dashboard |
| `/admin/users` | ✅ | ✅ | ❌ | ❌ | User management |
| `/admin/ofcs` | ✅ | ✅ | ❌ | ❌ | OFC management |
| `/admin/disciplines` | ✅ | ✅ | ❌ | ❌ | Discipline management |
| `/profile` | ✅ | ✅ | ✅ | ✅ | Own profile |
| `/submit` | ✅ | ✅ | ✅ | ✅ | Document submission |
| `/api/admin/*` | ✅ | ✅ | ❌ | ❌ | Admin API routes |
| `/api/documents/*` | ✅ | ✅ | ✅ | ✅ | Document operations |

## Required Fixes

### 1. **Fix Admin Users Page**
```javascript
// Current (WRONG):
if (user.role !== 'admin') {
  router.push('/');
  return;
}

// Should be:
if (!['admin', 'spsa'].includes(user.role)) {
  router.push('/');
  return;
}
```

### 2. **Fix Admin OFCs Route**
```javascript
// Current (WRONG):
if (!['admin', 'spsa', 'analyst'].includes(authResult.user.role)) {

// Should be:
if (!['admin', 'spsa'].includes(authResult.user.role)) {
```

### 3. **Fix Admin Disciplines Page**
```javascript
// Current (WRONG):
if (!(user.role === 'admin' || user.role === 'spsa' || user.role === 'analyst')) {

// Should be:
if (!['admin', 'spsa'].includes(user.role)) {
```

### 4. **Fix Auth Library**
```javascript
// Current (WRONG):
return ['admin', 'spsa', 'analyst', 'psa'].includes(user.role);

// Should be:
return ['admin', 'spsa'].includes(user.role);
```

## Security Implications

### 🔴 **HIGH RISK**
- **Analysts have admin access** to OFCs and disciplines
- **PSAs have admin access** in auth library
- **Inconsistent role checks** across components

### 🟡 **MEDIUM RISK**  
- **SPSAs cannot access user management** (should be able to)
- **Mixed permission models** (hardcoded vs database)

## Recommendations

1. **Standardize all admin checks** to use `['admin', 'spsa']` only
2. **Remove analyst and psa** from admin access everywhere
3. **Create centralized permission checking** function
4. **Use database permissions** instead of hardcoded role checks
5. **Add comprehensive testing** for access control

## Next Steps

1. Fix all identified inconsistencies
2. Create centralized permission system
3. Add access control tests
4. Document permission model
5. Audit all remaining routes and pages
