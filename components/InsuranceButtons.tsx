import * as React from "react"
import { FaPlus, FaEdit, FaTrashAlt, FaUsers, FaBuilding, FaFileContract, FaCheck, FaEye } from "react-icons/fa"
import { RoleBasedButton, RoleBasedButtonProps } from "./RoleBasedButton"
import { UserInfo } from "../rbac"

// Insurance-specific button components with pre-configured permissions and styling

interface InsuranceButtonBaseProps extends Omit<RoleBasedButtonProps, "permission" | "actionName" | "icon" | "children"> {
    userInfo: UserInfo | null
    onClick: () => void
    children?: React.ReactNode
}

// Policy Management Buttons
export function NewPolicyButton({ userInfo, onClick, children, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_CREATE"
            onClick={onClick}
            variant="success"
            actionName="Polis Aanmaken"
            icon={<FaPlus size={14} />}
            behavior="request"
            fallbackAction={() => {
                // For users without create permission, show contact broker message
                alert("Om een nieuwe polis aan te maken, neem contact op met je verzekeringsmakelaar.")
            }}
        >
            {children || (userInfo?.role === "admin" ? "Nieuwe Polis" : 
             userInfo?.role === "editor" ? "Nieuwe Polis" :
             "Nieuwe Polis Aanvragen")}
        </RoleBasedButton>
    )
}

export function EditPolicyButton({ userInfo, onClick, resourceOrganization, children, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_EDIT"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="blue"
            size="small"
            actionName="Polis Bewerken"
            icon={<FaEdit size={12} />}
            behavior="request"
            fallbackAction={() => {
                // Since editors can only create policies (not edit), and users can only read them
                alert("Om wijzigingen aan deze polis aan te vragen, neem contact op met je beheerder.")
            }}
        >
            {children || "Bewerken"}
        </RoleBasedButton>
    )
}

export function DeletePolicyButton({ userInfo, onClick, resourceOrganization, children, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_DELETE"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="danger"
            size="small"
            actionName="Polis Verwijderen"
            icon={<FaTrashAlt size={12} />}
            behavior="hide" // Hide delete button for unauthorized users - too destructive
        >
            {children || "Verwijderen"}
        </RoleBasedButton>
    )
}

export function ApprovePolicyButton({ userInfo, onClick, children, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="POLICY_APPROVE"
            onClick={onClick}
            variant="success"
            size="small"
            actionName="Polis Goedkeuren"
            icon={<FaCheck size={12} />}
            behavior="hide" // Only show to authorized users
        >
            {children || "Goedkeuren"}
        </RoleBasedButton>
    )
}

// Organization Management Buttons
export function NewOrganizationButton({ userInfo, onClick, children, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="ORG_CREATE"
            onClick={onClick}
            variant="success"
            actionName="Organisatie Aanmaken"
            icon={<FaBuilding size={14} />}
            behavior="hide"
        >
            {children || "Nieuwe Organisatie"}
        </RoleBasedButton>
    )
}

export function EditOrganizationButton({ userInfo, onClick, resourceOrganization, children, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="ORG_EDIT"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="secondary"
            size="small"
            actionName="Organisatie Bewerken"
            icon={<FaEdit size={12} />}
            behavior="disable"
        >
            Bewerken
        </RoleBasedButton>
    )
}

export function DeleteOrganizationButton({ userInfo, onClick, resourceOrganization, children, ...props }: InsuranceButtonBaseProps & { resourceOrganization?: string }) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="ORG_DELETE"
            onClick={onClick}
            resourceOrganization={resourceOrganization}
            variant="danger"
            size="small"
            actionName="Organisatie Verwijderen"
            icon={<FaTrashAlt size={12} />}
            behavior="hide" // Too destructive - hide from unauthorized users
        >
            Verwijderen
        </RoleBasedButton>
    )
}

// User Management Buttons  
export function NewUserButton({ userInfo, onClick, children, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="USER_CREATE"
            onClick={onClick}
            variant="success"
            actionName="Gebruiker Aanmaken"
            icon={<FaPlus size={14} />}
            behavior="request"
            fallbackAction={() => {
                // Now that editors can only READ users, they need admin help too
                alert("Om nieuwe gebruikers toe te voegen, neem contact op met je beheerder.")
            }}
        >
            {children || "Nieuwe Gebruiker"}
        </RoleBasedButton>
    )
}

export function EditUserButton({ userInfo, onClick, children, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="USER_EDIT"
            onClick={onClick}
            variant="secondary"
            size="small"
            actionName="Gebruiker Bewerken"
            icon={<FaEdit size={12} />}
            behavior="disable"
        >
            Bewerken
        </RoleBasedButton>
    )
}

export function DeleteUserButton({ userInfo, onClick, children, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="USER_DELETE"
            onClick={onClick}
            variant="danger"
            size="small"
            actionName="Gebruiker Verwijderen"
            icon={<FaTrashAlt size={12} />}
            behavior="hide" // Hide delete button - too sensitive
        >
            Verwijderen
        </RoleBasedButton>
    )
}

// View/Access Buttons (for features that require specific permissions to view)
export function ViewChangelogButton({ userInfo, onClick, children, ...props }: InsuranceButtonBaseProps) {
    return (
        <RoleBasedButton
            {...props}
            userInfo={userInfo}
            permission="CHANGELOG_VIEW"
            onClick={onClick}
            variant="secondary"
            actionName="Wijzigingslogboek Bekijken"
            icon={<FaEye size={14} />}
            behavior="disable"
        >
            {children || "Wijzigingslogboek Bekijken"}
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