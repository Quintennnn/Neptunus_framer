import * as React from "react"
import * as ReactDOM from "react-dom"
import { FaPlus, FaEdit, FaTrashAlt, FaUsers, FaBuilding, FaFileContract, FaCheck, FaEye, FaEllipsisV } from "react-icons/fa"
import { RoleBasedButton, RoleBasedButtonProps } from "./RoleBasedButton"
import { UserInfo } from "../rbac"
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
            variant="success"
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
        
        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: rect.right + scrollLeft + 5
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
                                    color: "#3b82f6",
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
                                    e.target.style.color = "#3b82f6"
                                }}
                            >
                                <FaEdit size={14} />
                                Bewerken
                            </div>
                            
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
                                    color: "#dc2626",
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
                                    e.target.style.color = "#dc2626"
                                }}
                            >
                                <FaTrashAlt size={14} />
                                Verwijderen
                            </div>
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
        
        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: rect.right + scrollLeft + 5
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
                                    color: "#3b82f6",
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
                                    color: "#dc2626",
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
        <OrganizationDropdownMenu
            userInfo={userInfo}
            onEdit={onEdit}
            onDelete={onDelete}
            resourceOrganization={resourceOrganization}
        />
    )
}

// ——— Organization-specific Dropdown Menu Component ———
interface OrganizationDropdownMenuProps {
    userInfo: UserInfo | null
    onEdit: () => void
    onDelete: () => void
    resourceOrganization?: string
}

function OrganizationDropdownMenu({
    userInfo,
    onEdit,
    onDelete,
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
        
        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: rect.right + scrollLeft + 5
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
                                    color: "#3b82f6",
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
                                    e.target.style.color = "#3b82f6"
                                }}
                            >
                                <FaEdit size={14} />
                                Bewerken
                            </div>
                            
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
                                    color: "#dc2626",
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
                                    e.target.style.color = "#dc2626"
                                }}
                            >
                                <FaTrashAlt size={14} />
                                Verwijderen
                            </div>
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
        
        setDropdownPosition({
            top: rect.bottom + scrollTop + 5,
            left: rect.right + scrollLeft + 5
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
                                    color: "#3b82f6",
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
                                    e.target.style.color = "#3b82f6"
                                }}
                            >
                                <FaEdit size={14} />
                                Bewerken
                            </div>
                            
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
                                    color: "#dc2626",
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
                                    e.target.style.color = "#dc2626"
                                }}
                            >
                                <FaTrashAlt size={14} />
                                Verwijderen
                            </div>
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    )
}