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
        // organization: ['create', 'read', 'update', 'delete']
        "ORG_CREATE", "ORG_EDIT", "ORG_DELETE", "ORG_VIEW", "ORG_MANAGE_USERS",
        // policy: ['create', 'read', 'update', 'delete'] 
        "POLICY_CREATE", "POLICY_EDIT", "POLICY_DELETE", "POLICY_VIEW", "POLICY_APPROVE",
        "CHANGELOG_VIEW", "SYSTEM_CONFIG"
    ],
    editor: [
        // Editor/Broker permissions - matches backend 'editor' role exactly
        // insured_object: ['create', 'read', 'update'] - no delete
        "INSURED_OBJECT_CREATE", "INSURED_OBJECT_READ", "INSURED_OBJECT_UPDATE",
        // user: ['read'] - can only READ users
        "USER_VIEW",
        // organization: ['read'] - can only READ organizations  
        "ORG_VIEW",
        // policy: ['read', 'create'] - can READ and CREATE policies, no update/delete
        "POLICY_CREATE", "POLICY_VIEW",
        "CHANGELOG_VIEW"
    ],
    user: [
        // Regular user permissions - matches backend 'user' role exactly
        // insured_object: ['read', 'create', 'update'] - no delete
        "INSURED_OBJECT_CREATE", "INSURED_OBJECT_READ", "INSURED_OBJECT_UPDATE",
        // policy: ['read'] - can only READ policies
        "POLICY_VIEW",
        // organization: ['read'] - can only READ organizations
        "ORG_VIEW",
        "CHANGELOG_VIEW"
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

export function canManageOrganization(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "ORG_EDIT", orgId)
}

export function canCreatePolicy(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "POLICY_CREATE", orgId)
}

export function canDeletePolicy(userInfo: UserInfo | null, orgId?: string): boolean {
    return canPerformAction(userInfo, "POLICY_DELETE", orgId)
}