// RBAC (Role-Based Access Control) System for Insurance Application
// Defines permissions and role-based access patterns

export type Role = "admin" | "editor" | "user"

export type Permission =
    // Insured Object permissions (boats/assets)
    | "INSURED_OBJECT_CREATE"
    | "INSURED_OBJECT_READ"
    | "INSURED_OBJECT_UPDATE"
    | "INSURED_OBJECT_DELETE"
    // Policy permissions
    | "POLICY_CREATE"
    | "POLICY_EDIT"
    | "POLICY_DELETE"
    | "POLICY_VIEW"
    | "POLICY_APPROVE"
    // Organization permissions
    | "ORG_CREATE"
    | "ORG_EDIT"
    | "ORG_DELETE"
    | "ORG_VIEW"
    | "ORG_MANAGE_USERS"
    // Organization detailed permissions (granular)
    | "ORG_EDIT_ADDRESS"        // Edit address data only
    | "ORG_EDIT_FIELD_CONFIG"   // Edit field configurations
    | "ORG_EDIT_ACCEPTANCE_RULES" // Edit acceptance rules
    // User permissions
    | "USER_CREATE"
    | "USER_EDIT"
    | "USER_DELETE"
    | "USER_VIEW"
    | "USER_ASSIGN_ROLES"
    // System permissions
    | "CHANGELOG_VIEW"
    | "SYSTEM_CONFIG"

// Role-based permission matrix - matches backend ROLE_PERMISSIONS exactly
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
    admin: [
        // Full access to everything - matches backend 'admin' role
        // insured_object: ['create', 'read', 'update', 'delete']
        "INSURED_OBJECT_CREATE", "INSURED_OBJECT_READ", "INSURED_OBJECT_UPDATE", "INSURED_OBJECT_DELETE",
        // user: ['create', 'read', 'update', 'delete']
        "USER_CREATE", "USER_EDIT", "USER_DELETE", "USER_VIEW", "USER_ASSIGN_ROLES",
        // organization: ['create', 'read', 'update', 'delete'] + granular permissions
        "ORG_CREATE", "ORG_EDIT", "ORG_DELETE", "ORG_VIEW", "ORG_MANAGE_USERS",
        "ORG_EDIT_ADDRESS", "ORG_EDIT_FIELD_CONFIG", "ORG_EDIT_ACCEPTANCE_RULES",
        // policy: ['create', 'read', 'update', 'delete']
        "POLICY_CREATE", "POLICY_EDIT", "POLICY_DELETE", "POLICY_VIEW", "POLICY_APPROVE",
        "CHANGELOG_VIEW", "SYSTEM_CONFIG"
    ],
    editor: [
        // Editor/Broker permissions - matches backend 'editor' role exactly
        // insured_object: ['create', 'read', 'update'] - no delete
        "INSURED_OBJECT_CREATE", "INSURED_OBJECT_READ", "INSURED_OBJECT_UPDATE",
        // organization: ['read'] - can only READ organizations
        "ORG_VIEW", "ORG_EDIT_ADDRESS",
        // policy: ['read', 'create'] - can READ and CREATE policies, no update/delete
        "POLICY_CREATE", "POLICY_VIEW", "POLICY_EDIT"
    ],
    user: [
        // Regular user permissions - matches backend 'user' role exactly
        // insured_object: ['read', 'create', 'update'] - no delete
        "INSURED_OBJECT_READ", 
        // policy: ['read'] - can only READ policies
        "POLICY_VIEW",
        // organization: ['read'] - can only READ organizations
        "ORG_VIEW",
       
    ]
}

// User info interface
export interface UserInfo {
    sub: string
    role: Role
    organization?: string
    organizations?: string[]
}

// Check if user has specific permission
export function hasPermission(userInfo: UserInfo | null, permission: Permission): boolean {
    if (!userInfo) return false
    return ROLE_PERMISSIONS[userInfo.role].includes(permission)
}

// Check if user can perform action on specific resource
export function canPerformAction(
    userInfo: UserInfo | null, 
    permission: Permission,
    resourceOrganization?: string
): boolean {
    if (!userInfo) return false
    
    // Admin can do everything
    if (userInfo.role === "admin") return hasPermission(userInfo, permission)
    
    // Editor can work with any organization they're assigned to
    if (userInfo.role === "editor") {
        if (!resourceOrganization) return hasPermission(userInfo, permission)
        return hasPermission(userInfo, permission) && 
               (userInfo.organizations?.includes(resourceOrganization) || false)
    }
    
    // User can only work with their own organization
    if (userInfo.role === "user") {
        if (!resourceOrganization) return hasPermission(userInfo, permission)
        return hasPermission(userInfo, permission) && 
               userInfo.organization === resourceOrganization
    }
    
    return false
}

// Get role-appropriate action text
export function getActionText(action: string, role: Role, hasAccess: boolean): string {
    if (hasAccess) {
        return role === "admin" ? action : 
               role === "editor" ? action :
               `Request ${action.toLowerCase()}`
    }
    
    return role === "user" ? `Contact Broker to ${action.toLowerCase()}` : 
           `Request ${action.toLowerCase()} Access`
}

// Get role-appropriate tooltip text
export function getTooltipText(action: string, role: Role, hasAccess: boolean): string {
    if (hasAccess) return `${action} this item`
    
    switch (role) {
        case "admin":
            return `You don't have permission to ${action.toLowerCase()}`
        case "editor":
            return `Contact administrator for ${action.toLowerCase()} permissions`
        case "user":
            return `Contact your broker to ${action.toLowerCase()} this item`
        default:
            return `Access restricted`
    }
}

// Insurance-specific helper functions
export function isAdmin(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "admin"
}

export function isEditor(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "editor"
}

export function isUser(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "user"
}

// Status-based permissions for insured objects
export type InsuredObjectStatus = "Pending" | "Insured" | "Rejected" | "Removed"

// Check if user can edit an insured object based on status
export function canEditInsuredObject(userInfo: UserInfo | null, status: InsuredObjectStatus): boolean {
    if (!userInfo) return false

    // Admins can always edit
    if (isAdmin(userInfo)) return true

    // Editors and users cannot edit if status is Rejected or Removed
    // They CAN edit Pending and Insured items
    const restrictedStatuses: InsuredObjectStatus[] = ["Rejected", "Removed"]
    if (restrictedStatuses.includes(status)) {
        return false
    }

    // Editors and users can edit Pending and Insured objects (but with field restrictions)
    return true
}

// Check if user can edit specific fields of an insured object
export function canEditInsuredObjectField(
    userInfo: UserInfo | null,
    status: InsuredObjectStatus,
    fieldName: string
): boolean {
    if (!userInfo) return false

    // Admins can always edit any field
    if (isAdmin(userInfo)) return true

    // First check if object is editable at all
    if (!canEditInsuredObject(userInfo, status)) return false

    // For Insured objects, restrict certain fields for non-admins
    // This includes user input fields and system-calculated fields
    if (status === "Insured") {
        const restrictedFields = [
            "waarde",
            "ingangsdatum",
            "uitgangsdatum",
            // System fields that only admins should be able to edit
            "premiepercentage",
            "eigenRisico",
            "aantalVerzekerdeDagen",
            "totalePremieOverHetJaar",
            "totalePremieOverDeVerzekerdePeriode"
        ]
        if (restrictedFields.includes(fieldName)) {
            return false
        }
    }

    return true
}

// Get tooltip text for disabled fields
export function getFieldDisabledTooltip(
    userInfo: UserInfo | null,
    status: InsuredObjectStatus,
    fieldName: string
): string {
    if (!userInfo) return "Niet ingelogd"

    if (isAdmin(userInfo)) return ""

    // Status-based restrictions
    if (status === "Rejected") {
        return "Dit vaartuig is afgewezen. Dien een nieuwe aanvraag in"
    }
    if (status === "Removed") {
        return "Dit vaartuig is afgevoerd en kan niet meer worden gewijzigd"
    }

    // Field-level restrictions for Insured objects
    if (status === "Insured") {
        const fieldLabels: Record<string, string> = {
            waarde: "waarde van het vaartuig",
            ingangsdatum: "ingangsdatum",
            uitgangsdatum: "uitgangsdatum",
            premiepercentage: "premie percentage",
            eigenRisico: "eigen risico",
            aantalVerzekerdeDagen: "aantal verzekerde dagen",
            totalePremieOverHetJaar: "totale premie over het jaar",
            totalePremieOverDeVerzekerdePeriode: "totale premie over de verzekerde periode"
        }

        const restrictedFields = [
            "waarde",
            "ingangsdatum",
            "uitgangsdatum",
            "premiepercentage",
            "eigenRisico",
            "aantalVerzekerdeDagen",
            "totalePremieOverHetJaar",
            "totalePremieOverDeVerzekerdePeriode"
        ]
        if (restrictedFields.includes(fieldName)) {
            return `De ${fieldLabels[fieldName] || fieldName} kan niet worden gewijzigd voor verzekerde objecten. Neem contact op met de beheerder.`
        }
    }

    return ""
}

export function canManageOrganization(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "ORG_EDIT", orgId)
}

export function canCreatePolicy(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "POLICY_CREATE", orgId)
}

export function canDeletePolicy(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "POLICY_DELETE", orgId)
}

// Action button group visibility helpers
export function canManageUsers(userInfo: UserInfo | null): boolean {
    return hasPermission(userInfo, "USER_EDIT") || hasPermission(userInfo, "USER_DELETE")
}

export function canManagePolicies(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "POLICY_EDIT", orgId) || canPerformAction(userInfo, "POLICY_DELETE", orgId)
}

export function canManageOrganizations(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "ORG_EDIT", orgId) || canPerformAction(userInfo, "ORG_DELETE", orgId)
}

// Enhanced organization permission helpers for granular access
export function canEditOrganizationAddress(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "ORG_EDIT_ADDRESS", orgId) || canPerformAction(userInfo, "ORG_EDIT", orgId)
}

export function canEditOrganizationFieldConfig(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "ORG_EDIT_FIELD_CONFIG", orgId) || canPerformAction(userInfo, "ORG_EDIT", orgId)
}

export function canEditOrganizationAcceptanceRules(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "ORG_EDIT_ACCEPTANCE_RULES", orgId) || canPerformAction(userInfo, "ORG_EDIT", orgId)
}