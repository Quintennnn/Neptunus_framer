import * as React from "react"
import { FaPlus, FaEdit, FaTrashAlt, FaUsers, FaBuilding, FaFileContract, FaCheck, FaEye } from "react-icons/fa"
import { RoleBasedButton, RoleBasedButtonProps } from "./RoleBasedButton"
import { UserInfo } from "../rbac"

// Insurance-specific button components with pre-configured permissions and styling

interface InsuranceButtonBaseProps extends Omit<RoleBasedButtonProps, "permission" | "actionName" | "icon"> {
    userInfo: UserInfo | null
    onClick: () => void
}

// Policy Management Buttons
export function NewPolicyButton({ userInfo, onClick, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_CREATE"
            onClick={onClick}
            variant="success"
            actionName="Create Policy"
            icon={<FaPlus size={14} />}
            behavior="request"
            fallbackAction={() => {
                // For users without create permission, show contact broker message
                alert("To create a new policy, please contact your insurance broker.")
            }}
        >
            {userInfo?.role === "admin" ? "Nieuwe Polis" : 
             userInfo?.role === "editor" ? "Nieuwe Polis" :
             "Request New Policy"}
        </RoleBasedButton>
    )
}

export function EditPolicyButton({ userInfo, onClick, resourceOrganization, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_EDIT"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="secondary"
            size="small"
            actionName="Edit Policy"
            icon={<FaEdit size={12} />}
            behavior="request"
            fallbackAction={() => {
                // Since editors can only create policies (not edit), and users can only read them
                alert("To request changes to this policy, please contact your administrator.")
            }}
        >
            Edit
        </RoleBasedButton>
    )
}

export function DeletePolicyButton({ userInfo, onClick, resourceOrganization, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_DELETE"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="danger"
            size="small"
            actionName="Delete Policy"
            icon={<FaTrashAlt size={12} />}
            behavior="hide" // Hide delete button for unauthorized users - too destructive
        >
            Delete
        </RoleBasedButton>
    )
}

export function ApprovePolicyButton({ userInfo, onClick, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_APPROVE"
            onClick={onClick}
            variant="success"
            size="small"
            actionName="Approve Policy"
            icon={<FaCheck size={12} />}
            behavior="hide" // Only show to authorized users
        >
            Approve
        </RoleBasedButton>
    )
}

// Organization Management Buttons
export function NewOrganizationButton({ userInfo, onClick, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="ORG_CREATE"
            onClick={onClick}
            variant="success"
            actionName="Create Organization"
            icon={<FaBuilding size={14} />}
            behavior="request"
            fallbackAction={() => {
                // Now that editors can only READ organizations, they need admin help too
                alert("To add a new organization, please contact your administrator.")
            }}
        >
            Nieuwe Organisatie
        </RoleBasedButton>
    )
}

export function EditOrganizationButton({ userInfo, onClick, resourceOrganization, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="ORG_EDIT"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="secondary"
            size="small"
            actionName="Edit Organization"
            icon={<FaEdit size={12} />}
            behavior="disable"
        >
            Edit
        </RoleBasedButton>
    )
}

export function DeleteOrganizationButton({ userInfo, onClick, resourceOrganization, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="ORG_DELETE"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="danger"
            size="small"
            actionName="Delete Organization"
            icon={<FaTrashAlt size={12} />}
            behavior="hide" // Too destructive - hide from unauthorized users
        >
            Delete
        </RoleBasedButton>
    )
}

// User Management Buttons  
export function NewUserButton({ userInfo, onClick, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="USER_CREATE"
            onClick={onClick}
            variant="success"
            actionName="Create User"
            icon={<FaPlus size={14} />}
            behavior="request"
            fallbackAction={() => {
                // Now that editors can only READ users, they need admin help too
                alert("To add new users, please contact your administrator.")
            }}
        >
            Nieuwe Gebruiker
        </RoleBasedButton>
    )
}

export function EditUserButton({ userInfo, onClick, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="USER_EDIT"
            onClick={onClick}
            variant="secondary"
            size="small"
            actionName="Edit User"
            icon={<FaEdit size={12} />}
            behavior="disable"
        >
            Edit
        </RoleBasedButton>
    )
}

export function DeleteUserButton({ userInfo, onClick, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="USER_DELETE"
            onClick={onClick}
            variant="danger"
            size="small"
            actionName="Delete User"
            icon={<FaTrashAlt size={12} />}
            behavior="hide" // Hide delete button - too sensitive
        >
            Delete
        </RoleBasedButton>
    )
}

// View/Access Buttons (for features that require specific permissions to view)
export function ViewChangelogButton({ userInfo, onClick, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="CHANGELOG_VIEW"
            onClick={onClick}
            variant="secondary"
            actionName="View Changelog"
            icon={<FaEye size={14} />}
            behavior="disable"
        >
            View Changelog
        </RoleBasedButton>
    )
}

// Compound buttons for common workflows
interface PolicyActionButtonsProps {
    userInfo: UserInfo | null
    onEdit: () => void
    onDelete: () => void
    onApprove?: () => void
    resourceOrganization?: string
    policyStatus?: "draft" | "active" | "expired"
}

export function PolicyActionButtons({ 
    userInfo, 
    onEdit, 
    onDelete, 
    onApprove,
    resourceOrganization,
    policyStatus = "active"
}: PolicyActionButtonsProps) {
    return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <EditPolicyButton 
                userInfo={userInfo}
                onClick={onEdit}
                resourceOrganization={resourceOrganization}
            />
            
            <DeletePolicyButton
                userInfo={userInfo}  
                onClick={onDelete}
                resourceOrganization={resourceOrganization}
            />
            
            {policyStatus === "draft" && onApprove && (
                <ApprovePolicyButton
                    userInfo={userInfo}
                    onClick={onApprove}
                />
            )}
        </div>
    )
}

interface OrganizationActionButtonsProps {
    userInfo: UserInfo | null
    onEdit: () => void
    onDelete: () => void
    resourceOrganization?: string
}

export function OrganizationActionButtons({ 
    userInfo, 
    onEdit, 
    onDelete,
    resourceOrganization 
}: OrganizationActionButtonsProps) {
    return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <EditOrganizationButton
                userInfo={userInfo}
                onClick={onEdit}
                resourceOrganization={resourceOrganization}
            />
            
            <DeleteOrganizationButton
                userInfo={userInfo}
                onClick={onDelete}
                resourceOrganization={resourceOrganization}
            />
        </div>
    )
}