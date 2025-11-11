import * as React from "react"
import * as ReactDOM from "react-dom"
import { FaPlus, FaEdit, FaTrashAlt, FaUsers, FaBuilding, FaFileContract, FaCheck, FaEye, FaEllipsisV } from "react-icons/fa"
import { RoleBasedButton, RoleBasedButtonProps } from "./RoleBasedButton"
import { UserInfo, canManageOrganizations, canManageUsers, canManagePolicies, canPerformAction } from "../rbac"
import { colors, styles, hover, FONT_STACK } from "../theme"

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
            variant="create"
            actionName="Polis Aanmaken"
            icon={<FaPlus size={14} />}
            behavior="hide"
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
            variant="edit"
            size="small"
            actionName="Polis Bewerken"
            icon={<FaEdit size={12} />}
            behavior="hide"
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
            variant="delete"
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
            variant="create"
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
            variant="edit"
            size="small"
            actionName="Organisatie Bewerken"
            icon={<FaEdit size={12} />}
            behavior="hide"
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
            variant="delete"
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
            variant="create"
            actionName="Gebruiker Aanmaken"
            icon={<FaPlus size={14} />}
            behavior="hide"
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
            variant="edit"
            size="small"
            actionName="Gebruiker Bewerken"
            icon={<FaEdit size={12} />}
            behavior="hide"
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
            variant="delete"
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
            behavior="hide"
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
    // Hide entire action buttons group if user has no policy management permissions
    if (!canManagePolicies(userInfo, resourceOrganization)) {
        return null
    }

    return (
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <PolicyDropdownMenu
                userInfo={userInfo}
                onEdit={onEdit}
                onDelete={onDelete}
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

// ——— Policy-specific Dropdown Menu Component ———
interface PolicyDropdownMenuProps {
    userInfo: UserInfo | null
    onEdit: () => void
    onDelete: () => void
    resourceOrganization?: string
}

function PolicyDropdownMenu({
    userInfo,
    onEdit,
    onDelete,
    resourceOrganization
}: PolicyDropdownMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 })
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

    const handleToggle = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!buttonRef.current) return

        const rect = buttonRef.current.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

        // Check if dropdown would overflow viewport on the right
        const dropdownWidth = 140 // minWidth from dropdown style
        const viewportWidth = window.innerWidth
        const spaceOnRight = viewportWidth - rect.right

        // If not enough space on right, position to the left of the button
        const left = spaceOnRight < dropdownWidth + 20
            ? rect.left + scrollLeft - dropdownWidth - 5  // Position to the left
            : rect.right + scrollLeft + 5                 // Position to the right

        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: left
        })

        setIsOpen(prev => !prev)
    }, [])

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    return (
        <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    ...styles.iconButton,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: "6px",
                    padding: "8px",
                    backgroundColor: "transparent",
                }}
                onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    hover.iconButton(target)
                    target.style.borderColor = colors.primary
                    target.style.color = colors.primary
                }}
                onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    hover.resetIconButton(target)
                    target.style.borderColor = colors.gray300
                    target.style.color = colors.gray500
                }}
            >
                <FaEllipsisV size={12} />
            </button>
            
            {isOpen && ReactDOM.createPortal(
                <>
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.gray200}`,
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            minWidth: "140px",
                            padding: "8px 0",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        <div>
                            {/* Edit option - only show if user has POLICY_EDIT permission */}
                            {canPerformAction(userInfo, "POLICY_EDIT", resourceOrganization) && (
                                <div 
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onMouseUp={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onEdit()
                                        setIsOpen(false)
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px", 
                                        cursor: "pointer",
                                        backgroundColor: "transparent",
                                        color: colors.actionEdit,
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        borderRadius: "6px",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = "#f3f4f6"
                                        e.target.style.color = "#2563eb"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = "transparent"
                                        e.target.style.color = colors.actionEdit
                                    }}
                                >
                                    <FaEdit size={14} />
                                    Bewerken
                                </div>
                            )}
                            
                            {/* Delete option - only show if user has POLICY_DELETE permission */}
                            {canPerformAction(userInfo, "POLICY_DELETE", resourceOrganization) && (
                                <div 
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onMouseUp={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onDelete()
                                        setIsOpen(false)
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px", 
                                        cursor: "pointer",
                                        backgroundColor: "transparent",
                                        color: colors.actionDelete,
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        borderRadius: "6px",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = "#fef2f2"
                                        e.target.style.color = "#b91c1c"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = "transparent"
                                        e.target.style.color = colors.actionDelete
                                    }}
                                >
                                    <FaTrashAlt size={14} />
                                    Verwijderen
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}

// ——— Reusable Action Dropdown Menu Component ———
interface ActionDropdownMenuProps {
    canEdit?: boolean
    canDelete?: boolean
    onEdit?: () => void
    onDelete?: () => void
    editLabel?: string
    deleteLabel?: string
}

function ActionDropdownMenu({
    canEdit = true,
    canDelete = true,
    onEdit,
    onDelete,
    editLabel = "Bewerken",
    deleteLabel = "Verwijderen"
}: ActionDropdownMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 })
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

    const handleToggle = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!buttonRef.current) return

        const rect = buttonRef.current.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

        // Check if dropdown would overflow viewport on the right
        const dropdownWidth = 140 // minWidth from dropdown style
        const viewportWidth = window.innerWidth
        const spaceOnRight = viewportWidth - rect.right

        // If not enough space on right, position to the left of the button
        const left = spaceOnRight < dropdownWidth + 20
            ? rect.left + scrollLeft - dropdownWidth - 5  // Position to the left
            : rect.right + scrollLeft + 5                 // Position to the right

        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: left
        })

        setIsOpen(prev => !prev)
    }, [])

    const handleEdit = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onEdit?.()
        setIsOpen(false)
    }, [onEdit])

    const handleDelete = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        onDelete?.()
        setIsOpen(false)
    }, [onDelete])

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    return (
        <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    ...styles.iconButton,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: "6px",
                    padding: "8px",
                    backgroundColor: "transparent",
                }}
                onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    hover.iconButton(target)
                    target.style.borderColor = colors.primary
                    target.style.color = colors.primary
                }}
                onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    hover.resetIconButton(target)
                    target.style.borderColor = colors.gray300
                    target.style.color = colors.gray500
                }}
            >
                <FaEllipsisV size={12} />
            </button>
            
            {isOpen && ReactDOM.createPortal(
                <>
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.gray200}`,
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            minWidth: "140px",
                            padding: "8px 0",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        {canEdit && onEdit && (
                            <button
                                onClick={handleEdit}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    border: "none",
                                    backgroundColor: "transparent",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: colors.actionEdit,
                                    textAlign: "left",
                                    transition: "all 0.2s ease",
                                    fontFamily: FONT_STACK,
                                    borderRadius: "6px",
                                    boxShadow: "none",
                                }}
                                onMouseOver={(e) => {
                                    const target = e.target as HTMLElement
                                    target.style.backgroundColor = "#f3f4f6"
                                    target.style.color = "#2563eb"
                                    target.style.transform = "translateX(2px)"
                                    target.style.boxShadow = "0 4px 8px rgba(59, 130, 246, 0.15)"
                                }}
                                onMouseOut={(e) => {
                                    const target = e.target as HTMLElement
                                    target.style.backgroundColor = "transparent"
                                    target.style.color = "#3b82f6"
                                    target.style.transform = "translateX(0)"
                                    target.style.boxShadow = "none"
                                }}
                            >
                                <FaEdit size={14} color="currentColor" />
                                {editLabel}
                            </button>
                        )}
                        {canDelete && onDelete && (
                            <button
                                onClick={handleDelete}
                                style={{
                                    width: "100%",
                                    padding: "12px 16px",
                                    border: "none",
                                    backgroundColor: "transparent",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    color: colors.actionDelete,
                                    textAlign: "left",
                                    transition: "all 0.2s ease",
                                    fontFamily: FONT_STACK,
                                    borderRadius: "6px",
                                    boxShadow: "none",
                                }}
                                onMouseOver={(e) => {
                                    const target = e.target as HTMLElement
                                    target.style.backgroundColor = "#fef2f2"
                                    target.style.color = "#b91c1c"
                                    target.style.transform = "translateX(2px)"
                                    target.style.boxShadow = "0 4px 8px rgba(220, 38, 38, 0.15)"
                                }}
                                onMouseOut={(e) => {
                                    const target = e.target as HTMLElement
                                    target.style.backgroundColor = "transparent"
                                    target.style.color = "#dc2626"
                                    target.style.transform = "translateX(0)"
                                    target.style.boxShadow = "none"
                                }}
                            >
                                <FaTrashAlt size={14} color="currentColor" />
                                {deleteLabel}
                            </button>
                        )}
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}

interface OrganizationActionButtonsProps {
    userInfo: UserInfo | null
    onEdit: () => void
    onDelete?: () => void  // Optional - kept for backwards compatibility but not used
    resourceOrganization?: string
}

export function OrganizationActionButtons({
    userInfo,
    onEdit,
    onDelete,  // No longer passed to dropdown
    resourceOrganization
}: OrganizationActionButtonsProps) {
    // Hide entire action buttons group if user has no management permissions
    if (!canManageOrganizations(userInfo, resourceOrganization)) {
        return null
    }

    return (
        <OrganizationDropdownMenu
            userInfo={userInfo}
            onEdit={onEdit}
            resourceOrganization={resourceOrganization}
        />
    )
}

// ——— Organization-specific Dropdown Menu Component ———
interface OrganizationDropdownMenuProps {
    userInfo: UserInfo | null
    onEdit: () => void
    resourceOrganization?: string
}

function OrganizationDropdownMenu({
    userInfo,
    onEdit,
    resourceOrganization
}: OrganizationDropdownMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 })
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

    const handleToggle = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!buttonRef.current) return

        const rect = buttonRef.current.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

        // Check if dropdown would overflow viewport on the right
        const dropdownWidth = 140 // minWidth from dropdown style
        const viewportWidth = window.innerWidth
        const spaceOnRight = viewportWidth - rect.right

        // If not enough space on right, position to the left of the button
        const left = spaceOnRight < dropdownWidth + 20
            ? rect.left + scrollLeft - dropdownWidth - 5  // Position to the left
            : rect.right + scrollLeft + 5                 // Position to the right

        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: left
        })

        setIsOpen(prev => !prev)
    }, [])

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    return (
        <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    ...styles.iconButton,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: "6px",
                    padding: "8px",
                    backgroundColor: "transparent",
                }}
                onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    hover.iconButton(target)
                    target.style.borderColor = colors.primary
                    target.style.color = colors.primary
                }}
                onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    hover.resetIconButton(target)
                    target.style.borderColor = colors.gray300
                    target.style.color = colors.gray500
                }}
            >
                <FaEllipsisV size={12} />
            </button>
            
            {isOpen && ReactDOM.createPortal(
                <>
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.gray200}`,
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            minWidth: "140px",
                            padding: "8px 0",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        <div>
                            {/* Edit option - only show if user has ORG_EDIT permission */}
                            {canPerformAction(userInfo, "ORG_EDIT", resourceOrganization) && (
                                <div
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onMouseUp={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onEdit()
                                        setIsOpen(false)
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        cursor: "pointer",
                                        backgroundColor: "transparent",
                                        color: colors.actionEdit,
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        borderRadius: "6px",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = "#f3f4f6"
                                        e.target.style.color = "#2563eb"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = "transparent"
                                        e.target.style.color = colors.actionEdit
                                    }}
                                >
                                    <FaEdit size={14} />
                                    Bewerken
                                </div>
                            )}

                            {/* Delete option removed - organizations should not be deleted from frontend */}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}

interface UserActionButtonsProps {
    userInfo: UserInfo | null
    onEdit: () => void
    onDelete: () => void
}

export function UserActionButtons({ 
    userInfo, 
    onEdit, 
    onDelete 
}: UserActionButtonsProps) {
    // Hide entire action buttons group if user has no user management permissions
    if (!canManageUsers(userInfo)) {
        return null
    }

    return (
        <UserDropdownMenu
            userInfo={userInfo}
            onEdit={onEdit}
            onDelete={onDelete}
        />
    )
}

// ——— User-specific Dropdown Menu Component ———
interface UserDropdownMenuProps {
    userInfo: UserInfo | null
    onEdit: () => void
    onDelete: () => void
}

function UserDropdownMenu({
    userInfo,
    onEdit,
    onDelete
}: UserDropdownMenuProps) {
    const [isOpen, setIsOpen] = React.useState(false)
    const [dropdownPosition, setDropdownPosition] = React.useState({ top: 0, left: 0 })
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)

    const handleToggle = React.useCallback((e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()

        if (!buttonRef.current) return

        const rect = buttonRef.current.getBoundingClientRect()
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft

        // Check if dropdown would overflow viewport on the right
        const dropdownWidth = 140 // minWidth from dropdown style
        const viewportWidth = window.innerWidth
        const spaceOnRight = viewportWidth - rect.right

        // If not enough space on right, position to the left of the button
        const left = spaceOnRight < dropdownWidth + 20
            ? rect.left + scrollLeft - dropdownWidth - 5  // Position to the left
            : rect.right + scrollLeft + 5                 // Position to the right

        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: left
        })

        setIsOpen(prev => !prev)
    }, [])

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    return (
        <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    ...styles.iconButton,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: "6px",
                    padding: "8px",
                    backgroundColor: "transparent",
                }}
                onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    hover.iconButton(target)
                    target.style.borderColor = colors.primary
                    target.style.color = colors.primary
                }}
                onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    hover.resetIconButton(target)
                    target.style.borderColor = colors.gray300
                    target.style.color = colors.gray500
                }}
            >
                <FaEllipsisV size={12} />
            </button>
            
            {isOpen && ReactDOM.createPortal(
                <>
                    <div
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            zIndex: 999,
                        }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div
                        style={{
                            position: "fixed",
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.gray200}`,
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            minWidth: "140px",
                            padding: "8px 0",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        <div>
                            {/* Edit option - only show if user has USER_EDIT permission */}
                            {canPerformAction(userInfo, "USER_EDIT") && (
                                <div 
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onMouseUp={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onEdit()
                                        setIsOpen(false)
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px", 
                                        cursor: "pointer",
                                        backgroundColor: "transparent",
                                        color: colors.actionEdit,
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        borderRadius: "6px",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = "#f3f4f6"
                                        e.target.style.color = "#2563eb"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = "transparent"
                                        e.target.style.color = colors.actionEdit
                                    }}
                                >
                                    <FaEdit size={14} />
                                    Bewerken
                                </div>
                            )}
                            
                            {/* Delete option - only show if user has USER_DELETE permission */}
                            {canPerformAction(userInfo, "USER_DELETE") && (
                                <div 
                                    onMouseDown={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onMouseUp={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                    }}
                                    onClick={(e) => {
                                        e.preventDefault()
                                        e.stopPropagation()
                                        onDelete()
                                        setIsOpen(false)
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px", 
                                        cursor: "pointer",
                                        backgroundColor: "transparent",
                                        color: colors.actionDelete,
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        borderRadius: "6px",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor = "#fef2f2"
                                        e.target.style.color = "#b91c1c"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor = "transparent"
                                        e.target.style.color = colors.actionDelete
                                    }}
                                >
                                    <FaTrashAlt size={14} />
                                    Verwijderen
                                </div>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}