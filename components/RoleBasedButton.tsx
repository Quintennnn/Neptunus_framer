import * as React from "react"
import { 
    Permission, 
    UserInfo, 
    hasPermission, 
    canPerformAction, 
    getActionText, 
    getTooltipText 
} from "../rbac"

// Enhanced font stack
const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

export type ButtonVariant = "primary" | "secondary" | "danger" | "success"
export type ButtonSize = "small" | "medium" | "large"
export type ButtonBehavior = "hide" | "disable" | "request"

export interface RoleBasedButtonProps {
    // Core functionality
    userInfo: UserInfo | null
    permission: Permission
    onClick: () => void
    children: React.ReactNode
    
    // RBAC behavior
    behavior?: ButtonBehavior // What to do when user lacks permission
    resourceOrganization?: string // For resource-specific permissions
    fallbackAction?: () => void // Alternative action for unauthorized users
    
    // Styling
    variant?: ButtonVariant
    size?: ButtonSize
    disabled?: boolean
    loading?: boolean
    icon?: React.ReactNode
    
    // Content customization
    actionName?: string // Used for generating help text
    unauthorizedText?: string // Custom text for unauthorized users
    tooltip?: string // Custom tooltip
    
    // HTML attributes
    className?: string
    style?: React.CSSProperties
    title?: string
    id?: string
}

export function RoleBasedButton({
    userInfo,
    permission,
    onClick,
    children,
    behavior = "disable",
    resourceOrganization,
    fallbackAction,
    variant = "primary",
    size = "medium",
    disabled = false,
    loading = false,
    icon,
    actionName = "perform this action",
    unauthorizedText,
    tooltip,
    className = "",
    style = {},
    title,
    id
}: RoleBasedButtonProps) {
    
    // Check permissions
    const hasAccess = canPerformAction(userInfo, permission, resourceOrganization)
    const isDisabled = disabled || loading || (!hasAccess && behavior !== "request")
    
    // Determine button text and behavior
    const getButtonContent = () => {
        if (loading) {
            return (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <div style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid transparent",
                        borderTop: "2px solid currentColor",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite"
                    }} />
                    Loading...
                </div>
            )
        }
        
        if (!hasAccess && behavior === "request") {
            return unauthorizedText || 
                   getActionText(actionName, userInfo?.role || "user", false)
        }
        
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {icon && icon}
                {children}
            </div>
        )
    }
    
    // Get tooltip text
    const getTooltip = () => {
        if (tooltip) return tooltip
        if (title) return title
        if (!hasAccess) {
            return getTooltipText(actionName, userInfo?.role || "user", hasAccess)
        }
        return undefined
    }
    
    // Handle click
    const handleClick = () => {
        if (isDisabled) return
        
        if (!hasAccess && behavior === "request" && fallbackAction) {
            fallbackAction()
        } else if (hasAccess) {
            onClick()
        }
    }
    
    // Don't render if behavior is "hide" and user lacks access
    if (!hasAccess && behavior === "hide") {
        return null
    }
    
    // Get button styles
    const getButtonStyles = (): React.CSSProperties => {
        const baseStyles: React.CSSProperties = {
            fontFamily: FONT_STACK,
            border: "none",
            borderRadius: "8px",
            cursor: isDisabled ? "not-allowed" : "pointer",
            transition: "all 0.2s ease",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "600",
            position: "relative",
            outline: "none",
            userSelect: "none",
            ...style
        }
        
        // Size styles
        const sizeStyles: Record<ButtonSize, React.CSSProperties> = {
            small: {
                padding: "6px 12px",
                fontSize: "12px",
                minHeight: "28px"
            },
            medium: {
                padding: "10px 16px", 
                fontSize: "14px",
                minHeight: "36px"
            },
            large: {
                padding: "12px 24px",
                fontSize: "16px",
                minHeight: "44px"
            }
        }
        
        // Variant styles
        const variantStyles: Record<ButtonVariant, React.CSSProperties> = {
            primary: {
                backgroundColor: isDisabled ? "#9ca3af" : "#10b981",
                color: "#ffffff",
                boxShadow: isDisabled ? "none" : "0 2px 4px rgba(16, 185, 129, 0.2)"
            },
            secondary: {
                backgroundColor: isDisabled ? "#f3f4f6" : "#f9fafb",
                color: isDisabled ? "#9ca3af" : "#374151",
                border: `1px solid ${isDisabled ? "#d1d5db" : "#d1d5db"}`
            },
            danger: {
                backgroundColor: isDisabled ? "#9ca3af" : "#dc2626",
                color: "#ffffff",
                boxShadow: isDisabled ? "none" : "0 2px 4px rgba(220, 38, 38, 0.2)"
            },
            success: {
                backgroundColor: isDisabled ? "#9ca3af" : "#059669",
                color: "#ffffff", 
                boxShadow: isDisabled ? "none" : "0 2px 4px rgba(5, 150, 105, 0.2)"
            }
        }
        
        return {
            ...baseStyles,
            ...sizeStyles[size],
            ...variantStyles[variant],
            opacity: isDisabled ? 0.6 : 1
        }
    }
    
    // Hover effects
    const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isDisabled) return
        
        const button = e.target as HTMLButtonElement
        if (variant === "primary") {
            button.style.backgroundColor = "#059669"
            button.style.transform = "translateY(-1px)"
            button.style.boxShadow = "0 4px 8px rgba(16, 185, 129, 0.3)"
        } else if (variant === "secondary") {
            button.style.backgroundColor = "#f3f4f6"
        } else if (variant === "danger") {
            button.style.backgroundColor = "#b91c1c"
            button.style.transform = "translateY(-1px)"
        }
    }
    
    const handleMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (isDisabled) return
        
        const button = e.target as HTMLButtonElement
        if (variant === "primary") {
            button.style.backgroundColor = "#10b981"
            button.style.transform = "translateY(0)"
            button.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.2)"
        } else if (variant === "secondary") {
            button.style.backgroundColor = "#f9fafb"
        } else if (variant === "danger") {
            button.style.backgroundColor = "#dc2626"
            button.style.transform = "translateY(0)"
        }
    }
    
    return (
        <>
            {/* Add CSS animation keyframes */}
            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
            
            <button
                id={id}
                className={className}
                style={getButtonStyles()}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                disabled={isDisabled}
                title={getTooltip()}
                aria-disabled={isDisabled}
                role="button"
            >
                {getButtonContent()}
            </button>
        </>
    )
}

// Convenience components for common use cases
export function CreateButton(props: Omit<RoleBasedButtonProps, "permission" | "variant" | "actionName">) {
    return (
        <RoleBasedButton
            {...props}
            permission="POLICY_CREATE"
            variant="primary"
            actionName="Create"
        />
    )
}

export function EditButton(props: Omit<RoleBasedButtonProps, "permission" | "variant" | "actionName">) {
    return (
        <RoleBasedButton
            {...props}
            permission="POLICY_EDIT"
            variant="secondary"
            actionName="Edit"
        />
    )
}

export function DeleteButton(props: Omit<RoleBasedButtonProps, "permission" | "variant" | "actionName" | "behavior">) {
    return (
        <RoleBasedButton
            {...props}
            permission="POLICY_DELETE"
            variant="danger"
            actionName="Delete"
            behavior="hide" // Hide delete buttons for unauthorized users
        />
    )
}