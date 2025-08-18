import * as React from "react"
import { useState } from "react"
import { FaUser, FaUserTie, FaUserShield } from "react-icons/fa"
import { UserInfo, Role } from "../rbac"
import { 
    NewPolicyButton, 
    NewOrganizationButton, 
    NewUserButton,
    PolicyActionButtons,
    OrganizationActionButtons
} from "./InsuranceButtons"

// Demo component to showcase RBAC functionality
export function RBACDemo() {
    const [selectedRole, setSelectedRole] = useState<Role>("user")
    
    // Mock user data for different roles
    const mockUsers: Record<Role, UserInfo> = {
        admin: {
            sub: "admin-123",
            role: "admin",
            organization: "admin-org",
            organizations: []
        },
        editor: {
            sub: "editor-123", 
            role: "editor",
            organization: "broker-firm",
            organizations: ["company-a", "company-b", "company-c"]
        },
        user: {
            sub: "user-123",
            role: "user", 
            organization: "company-a",
            organizations: []
        }
    }
    
    const currentUser = mockUsers[selectedRole]
    
    const roleStyles = {
        admin: { color: "#dc2626", icon: FaUserShield },
        editor: { color: "#2563eb", icon: FaUserTie },
        user: { color: "#059669", icon: FaUser }
    }
    
    return (
        <div style={{
            padding: "24px",
            maxWidth: "800px",
            margin: "0 auto",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif"
        }}>
            <h1 style={{ marginBottom: "32px", color: "#1f2937" }}>
                RBAC Demo - Insurance Application
            </h1>
            
            {/* Role Selector */}
            <div style={{
                marginBottom: "32px",
                padding: "16px",
                backgroundColor: "#f9fafb",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
            }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#374151" }}>
                    Select Role to Test:
                </h3>
                <div style={{ display: "flex", gap: "16px" }}>
                    {(["admin", "editor", "user"] as Role[]).map(role => {
                        const IconComponent = roleStyles[role].icon
                        const isSelected = selectedRole === role
                        
                        return (
                            <button
                                key={role}
                                onClick={() => setSelectedRole(role)}
                                style={{
                                    padding: "8px 16px",
                                    border: isSelected ? "2px solid #3b82f6" : "2px solid #d1d5db",
                                    borderRadius: "8px",
                                    backgroundColor: isSelected ? "#eff6ff" : "#ffffff",
                                    color: isSelected ? "#1d4ed8" : "#374151",
                                    cursor: "pointer",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    fontWeight: "500",
                                    transition: "all 0.2s"
                                }}
                            >
                                <IconComponent size={16} color={roleStyles[role].color} />
                                {role.charAt(0).toUpperCase() + role.slice(1)}
                            </button>
                        )
                    })}
                </div>
                
                <div style={{
                    marginTop: "12px",
                    fontSize: "14px",
                    color: "#6b7280"
                }}>
                    <strong>Current User:</strong> {currentUser.role} | 
                    <strong> Organization:</strong> {currentUser.organization || "N/A"}
                </div>
            </div>
            
            {/* Create Buttons Demo */}
            <div style={{
                marginBottom: "32px",
                padding: "16px",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
            }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#374151" }}>
                    Create Actions
                </h3>
                <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <NewPolicyButton
                        userInfo={currentUser}
                        onClick={() => alert("Create Policy clicked!")}
                    />
                    
                    <NewOrganizationButton
                        userInfo={currentUser}
                        onClick={() => alert("Create Organization clicked!")}
                    />
                    
                    <NewUserButton
                        userInfo={currentUser}
                        onClick={() => alert("Create User clicked!")}
                    />
                </div>
            </div>
            
            {/* Table Row Actions Demo */}
            <div style={{
                marginBottom: "32px",
                padding: "16px",
                backgroundColor: "#ffffff",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
            }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#374151" }}>
                    Row-Level Actions
                </h3>
                
                <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "#6b7280" }}>
                        Policy from {currentUser.organization}
                    </h4>
                    <PolicyActionButtons
                        userInfo={currentUser}
                        onEdit={() => alert("Edit own policy")}
                        onDelete={() => alert("Delete own policy")}
                        resourceOrganization={currentUser.organization}
                        policyStatus="active"
                    />
                </div>
                
                <div style={{ marginBottom: "16px" }}>
                    <h4 style={{ margin: "0 0 8px 0", color: "#6b7280" }}>
                        Policy from different organization
                    </h4>
                    <PolicyActionButtons
                        userInfo={currentUser}
                        onEdit={() => alert("Edit other policy")}
                        onDelete={() => alert("Delete other policy")}
                        resourceOrganization="other-company"
                        policyStatus="active"
                    />
                </div>
                
                <div>
                    <h4 style={{ margin: "0 0 8px 0", color: "#6b7280" }}>
                        Organization Actions
                    </h4>
                    <OrganizationActionButtons
                        userInfo={currentUser}
                        onEdit={() => alert("Edit organization")}
                        onDelete={() => alert("Delete organization")}
                        resourceOrganization={currentUser.organization}
                    />
                </div>
            </div>
            
            {/* Permissions Overview */}
            <div style={{
                padding: "16px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e5e7eb"
            }}>
                <h3 style={{ margin: "0 0 16px 0", color: "#374151" }}>
                    Role Permissions Overview
                </h3>
                
                <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                    {selectedRole === "admin" && (
                        <div style={{ color: "#dc2626" }}>
                            <strong>Admin:</strong> Full system access - can create, edit, and delete anything.
                            All buttons are enabled and show confident language.
                        </div>
                    )}
                    
                    {selectedRole === "editor" && (
                        <div style={{ color: "#2563eb" }}>
                            <strong>Editor/Broker:</strong> Can help users with policies and organizations.
                            Can create and edit policies, but delete actions are hidden for safety.
                            Can only work with assigned organizations.
                        </div>
                    )}
                    
                    {selectedRole === "user" && (
                        <div style={{ color: "#059669" }}>
                            <strong>User/Organization Owner:</strong> Limited to viewing and requesting changes.
                            Create buttons show "Request" actions with helpful guidance.
                            Can only work with their own organization's resources.
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}