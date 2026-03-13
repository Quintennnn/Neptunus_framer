# Impact Analysis: Allowing Duplicate Organization Names

## Executive Summary

The Framer frontend **heavily relies on organization names as unique identifiers**. Allowing duplicate names would cause **critical security and data integrity issues** across 7+ files and multiple core features.

---

## Critical Findings

### 1. Access Control System (CRITICAL)

**Files Affected:**
- `Organization/List.tsx:4070-4071` - Organization filtering
- `Organization/List.tsx:151-159` - `hasOrganizationAccess()` function
- `rbac.ts:103,110` - `canPerformAction()` permission checks

**Current Behavior:**
```typescript
// Organization/List.tsx:151-159
function hasOrganizationAccess(userInfo, organization: string): boolean {
    if (userInfo.organization === organization) return true
    return userInfo.organizations?.includes(organization) || false
}

// rbac.ts:103
userInfo.organizations?.includes(resourceOrganization)
```

**Impact:** If two organizations have name "Acme Inc", a user assigned to one "Acme Inc" would gain access to BOTH organizations.

---

### 2. User Token Storage (CRITICAL - Backend Dependency)

**File:** `utils.ts:65-66`

```typescript
organization: payload['custom:organization'],      // Single org name
organizations: payload['custom:organizations']?.split(','), // Multiple org names
```

**Issue:** Cognito tokens store organization **names**, not IDs. This is the root cause - all downstream access control inherits this limitation.

---

### 3. Insured Objects Organization Lookup (HIGH)

**File:** `insuredObjects/list_insured_objects.tsx:5754-5766`

```typescript
targetOrg = fullOrganizations.find(org => org.name === currentOrganization)
```

**Impact:** Logo retrieval and organization display returns first match only. Wrong organization data may display.

---

### 4. Organization Selector in Object Creation (HIGH)

**File:** `insuredObjects/create_insured_object.tsx:131`

```typescript
return (data.organizations || []).map((org: any) => org.name)
```

**Impact:** Dropdown shows only names - user cannot distinguish between duplicate-named organizations when creating insured objects.

---

### 5. User Management Assignment (HIGH)

**File:** `User/List.tsx:491,879,895,899`

```typescript
handleOrganizationChange = (orgName: string, checked: boolean) => {
    setForm(f => ({
        ...f,
        organizations: checked
            ? [...f.organizations, orgName]
            : f.organizations.filter(org => org !== orgName),
    }))
}
```

**Impact:** Cannot assign users to the correct organization when names duplicate.

---

### 6. Pending Overview Filtering (MEDIUM)

**File:** `pendingOverview/List.tsx:3302-3306`

```typescript
filtered = filtered.filter(obj => obj.organization === selectedOrganization)
```

**Impact:** Admin cannot properly filter pending items by organization.

---

### 7. Changelog Display (MEDIUM)

**File:** `Changelog/List.tsx:359-361,1987,1993`

```typescript
displayName = org.name
organization = org.name
```

**Impact:** Audit logs cannot distinguish between organizations with same name.

---

## Dependency Chain

```
Cognito Token (custom:organization = "Name")
    ↓
utils.ts → getUserInfoFromToken() extracts NAMES
    ↓
Organization/List.tsx → hasOrganizationAccess(userInfo, org.name)
    ↓
rbac.ts → canPerformAction() checks names
    ↓
All components → filter/select by name
```

---

## Impact Summary Table

| Component | Severity | Issue |
|-----------|----------|-------|
| Access Control (RBAC) | CRITICAL | Users could access wrong organizations |
| User Assignment | CRITICAL | Cannot assign to correct duplicate-named org |
| Insured Object Creation | HIGH | Objects assigned to wrong organization |
| Organization Display | HIGH | Shows first match, may be wrong |
| Pending Overview Filter | MEDIUM | Cannot filter properly |
| Changelog | MEDIUM | Cannot distinguish in audit logs |

---

## Files Requiring Changes

| File | Changes Needed |
|------|---------------|
| `utils.ts` | Store org IDs from token (requires backend change) |
| `rbac.ts` | Compare by ID instead of name |
| `Organization/List.tsx` | `hasOrganizationAccess()` use ID |
| `insuredObjects/list_insured_objects.tsx` | Find org by ID |
| `insuredObjects/create_insured_object.tsx` | Map org ID + name, pass ID |
| `User/List.tsx` | Store/compare org IDs |
| `pendingOverview/List.tsx` | Filter by org ID |
| `Changelog/List.tsx` | Display org name but track by ID |

---

## Required Backend Changes (Pre-requisite)

Before frontend changes can work:

1. **Cognito Token Claims**: Change `custom:organization` and `custom:organizations` to store organization **IDs** instead of names
2. **API Responses**: Ensure all endpoints return organization ID consistently
3. **Insured Object Schema**: Verify `organization` field stores ID, not name

---

## Recommended Migration Approach

### Phase 1: Backend (Required First)
- Update Cognito claims to use IDs
- Update all API responses to include org IDs
- Create migration for existing data

### Phase 2: Frontend Core
- Update `utils.ts` to extract org IDs from token
- Update `rbac.ts` to compare IDs
- Update `hasOrganizationAccess()` to use IDs

### Phase 3: Frontend Components
- Update all selectors to show "name (type/info)" but pass ID
- Update all filters to use ID
- Update displays to show name but track by ID

### Phase 4: UI Enhancements
- Add distinguishing info in org selectors (type, extra_info)
- Update table displays to show distinguishing info
- Consider adding org ID display for admins

---

## Risk Assessment

**If implemented without proper migration:**
- Existing user assignments would break
- Existing insured objects could become inaccessible
- Access control would fail for all non-admin users

**Recommended:** Complete backend changes first, then migrate frontend with backwards compatibility layer.

---

*Analysis generated: January 2026*
