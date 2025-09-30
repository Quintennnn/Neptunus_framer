import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override, Frame } from "framer"
import { useState, useEffect, useCallback } from "react"
import { FaEdit, FaTrashAlt, FaSearch, FaFilter, FaUsers, FaArrowLeft, FaBuilding, FaFileContract, FaClipboardList, FaPlus, FaClock } from "react-icons/fa"
import { NewUserButton, UserActionButtons } from "../components/InsuranceButtons.tsx"
import { UserInfoBanner } from "../components/UserInfoBanner"
import { colors, styles, hover, animations, FONT_STACK } from "../theme"
import {
    API_BASE_URL,
    API_PATHS,
    getIdToken,
    getUserId,
    formatErrorMessage,
    formatSuccessMessage,
    validateEmail,
} from "../utils"

// ——— User Role Detection ———
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    organization?: string
    organizations?: string[]
}

// Fetch user info from backend API
async function fetchUserInfo(cognitoSub: string): Promise<UserInfo | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(
            `${API_BASE_URL}${API_PATHS.USER}/${cognitoSub}`,
            {
                method: "GET",
                headers,
                mode: "cors",
            }
        )

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const responseData = await res.json()


        // Handle nested response structure
        const userData = responseData.user || responseData

        const processedUserInfo = {
            sub: cognitoSub,
            role: userData.role || "user", // Default to user if role not found
            organization: userData.organization,
            organizations: userData.organizations || [],
        }


        return processedUserInfo
    } catch (error) {
        console.error("Failed to fetch user info:", error)
        return null
    }
}

function getCurrentUserInfo(): UserInfo | null {
    try {
        const token = getIdToken()
        if (!token) return null

        // Decode JWT to get cognito sub
        const payload = JSON.parse(atob(token.split(".")[1]))

        // Return basic info with sub - role will be fetched separately
        return {
            sub: payload.sub,
            role: "user", // Temporary default, will be updated by fetchUserInfo
            organization: undefined,
            organizations: [],
        }
    } catch (error) {
        console.error("Failed to decode token:", error)
        return null
    }
}

// Check if user is admin
function isAdmin(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "admin"
}

// Check if user is broker/editor
function isBroker(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "editor"
}

// Check if user has access to an organization
function hasOrganizationAccess(
    userInfo: UserInfo | null,
    organization: string
): boolean {
    if (!userInfo) return false
    if (isAdmin(userInfo)) return true // Admins can see everything
    if (userInfo.organization === organization) return true
    return userInfo.organizations?.includes(organization) || false
}

async function fetchUsers(userInfo: UserInfo | null): Promise<any[]> {
    const token = getIdToken()
    if (!token) {
        throw new Error("No authentication token found. Please log in again.")
    }
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}${API_PATHS.USER}`, {
        method: "GET",
        headers,
        mode: "cors",
    })
    if (!res.ok) {
        if (res.status === 403) {
            throw new Error(
                "Authentication failed. Your session may have expired. Please log in again."
            )
        }
        throw new Error(`${res.status} ${res.statusText}`)
    }
    const json = await res.json()
    let users = json.users || json.data || json

    // Filter users based on user role and organization access
    // Editors can view users (have USER_VIEW permission), but users cannot
    if (userInfo && userInfo.role !== "admin" && userInfo.role !== "editor") {
        // Regular users can only see users from their own organizations
        users = users.filter((user: any) => {
            if (!user.organizations) return false
            return user.organizations.some((org: string) =>
                hasOrganizationAccess(userInfo, org)
            )
        })
    }

    return users
}

async function fetchOrganizations(): Promise<any[]> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}${API_PATHS.ORGANIZATION}`, {
        method: "GET",
        headers,
        mode: "cors",
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const json = await res.json()
    return json.organizations
}

// ——— Column Groups and Definitions ———
type ColumnKey =
    | "username"
    | "email"
    | "role"
    | "organizations"
    | "createdAt"
    | "updatedAt"

const COLUMN_GROUPS = {
    essential: { label: "Essentiële", priority: 1 },
    additional: { label: "Aanvullend", priority: 2 },
}

const COLUMNS: {
    key: ColumnKey
    label: string
    priority: number
    group: keyof typeof COLUMN_GROUPS
    width?: string
}[] = [
    // Essential columns - most important user info
    {
        key: "username",
        label: "Gebruikersnaam",
        priority: 1,
        group: "essential",
        width: "150px",
    },
    {
        key: "email",
        label: "E-mail",
        priority: 1,
        group: "essential",
        width: "200px",
    },
    {
        key: "role",
        label: "Rol",
        priority: 1,
        group: "essential",
        width: "100px",
    },

    // Additional columns
    {
        key: "organizations",
        label: "Organisaties",
        priority: 2,
        group: "additional",
        width: "150px",
    },
    {
        key: "createdAt",
        label: "Aangemaakt",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "updatedAt",
        label: "Bijgewerkt",
        priority: 2,
        group: "additional",
        width: "110px",
    },
]

// ——— Role Styling Helper ———
function getRoleStyle(role: string) {
    switch (role?.toLowerCase()) {
        case "admin":
            return {
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
            }
        case "editor":
            return {
                backgroundColor: "#fefce8",
                color: "#ca8a04",
                border: "1px solid #fde68a",
            }
        case "user":
        default:
            return {
                backgroundColor: "#f9fafb",
                color: "#6b7280",
                border: "1px solid #e5e7eb",
            }
    }
}

// ——— Button Variants ———
const buttonVariants = {
    base: {
        fontFamily: FONT_STACK,
        fontSize: "14px",
        fontWeight: "500",
        borderRadius: "6px",
        padding: "10px 16px",
        border: "1px solid",
        cursor: "pointer",
        transition: "all 0.15s ease",
        outline: "none",
    } as React.CSSProperties,
    
    primary: {
        backgroundColor: colors.primary,
        color: "#ffffff",
        borderColor: colors.primary,
    } as React.CSSProperties,
    
    secondary: {
        backgroundColor: "#f3f4f6",
        color: "#374151",
        borderColor: "#d1d5db",
    } as React.CSSProperties,
    
    danger: {
        backgroundColor: "#dc2626",
        color: "#ffffff",
        borderColor: "#dc2626",
    } as React.CSSProperties,
}

// ——— Enhanced Confirm Delete Dialog ———
function ConfirmDeleteDialog({
    onConfirm,
    onCancel,
    username,
}: {
    onConfirm(): void
    onCancel(): void
    username?: string
}) {
    const [hoveredButton, setHoveredButton] = useState<string | null>(null)
    
    const getButtonStyle = (variant: "primary" | "secondary" | "danger", isHovered: boolean) => {
        const baseStyle = { ...buttonVariants.base, ...buttonVariants[variant] }
        
        if (isHovered) {
            if (variant === "danger") {
                return { ...baseStyle, backgroundColor: "#b91c1c", borderColor: "#b91c1c" }
            } else if (variant === "primary") {
                return { ...baseStyle, backgroundColor: "#2563eb", borderColor: "#2563eb" }
            } else {
                return { ...baseStyle, backgroundColor: "#e5e7eb" }
            }
        }
        
        return baseStyle
    }

    return (
        <div 
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            aria-describedby="delete-description"
            style={{
                ...styles.modal,
                padding: "28px",
                maxWidth: "420px",
            }}
        >
            <div 
                id="delete-title"
                style={{
                    ...styles.title,
                    color: "#dc2626",
                    marginBottom: "16px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                }}
            >
                ⚠️ Gebruiker Verwijderen
            </div>
            <div 
                id="delete-description"
                style={{
                    ...styles.description,
                    backgroundColor: "#fef2f2",
                    color: "#991b1b",
                    padding: "16px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    marginBottom: "24px",
                    lineHeight: "1.5",
                }}
            >
                Weet je zeker dat je {username ? `gebruiker "${username}"` : "deze gebruiker"} wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt en zal alle bijbehorende gegevens permanent verwijderen.
            </div>
            <div style={{
                ...styles.buttonGroup,
                gap: "12px",
                justifyContent: "flex-end",
            }}>
                <button
                    onClick={onCancel}
                    style={getButtonStyle("secondary", hoveredButton === "cancel")}
                    onMouseEnter={() => setHoveredButton("cancel")}
                    onMouseLeave={() => setHoveredButton(null)}
                >
                    Annuleren
                </button>
                <button
                    onClick={onConfirm}
                    style={getButtonStyle("danger", hoveredButton === "delete")}
                    onMouseEnter={() => setHoveredButton("delete")}
                    onMouseLeave={() => setHoveredButton(null)}
                >
                    Gebruiker Verwijderen
                </button>
            </div>
        </div>
    )
}

// ——— Enhanced Edit Form ———
type UserFormState = {
    email: string
    role: string
    organizations: string[]
}

function EditUserForm({
    user,
    onClose,
    refresh,
}: {
    user: any
    onClose(): void
    refresh(): void
}) {
    // Convert user organizations to array format for editing
    const convertToArray = (orgs: any): string[] => {
        if (!orgs || orgs === "none") return []
        if (Array.isArray(orgs)) return orgs
        if (typeof orgs === "string") {
            return orgs
                .split(",")
                .map((org) => org.trim())
                .filter((org) => org.length > 0)
        }
        return []
    }

    const [form, setForm] = useState<UserFormState>({
        email: user.email || "",
        role: user.role || "",
        organizations: convertToArray(user.organizations),
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [availableOrganizations, setAvailableOrganizations] = useState<any[]>(
        []
    )
    const [organizationsLoading, setOrganizationsLoading] = useState(true)
    const [organizationsError, setOrganizationsError] = useState<string | null>(
        null
    )

    // Fetch organizations on component mount
    useEffect(() => {
        fetchOrganizations()
            .then((orgs) => {
                setAvailableOrganizations(orgs)
                setOrganizationsLoading(false)
            })
            .catch((err) => {
                console.error("Failed to fetch organizations:", err)
                setOrganizationsError(
                    "Could not fetch organizations. This is critical for the system to work."
                )
                setOrganizationsLoading(false)
            })
    }, [])

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setError(null)
        setSuccess(null)
        setForm((f) => ({ ...f, [name]: value }))
    }

    const handleOrganizationChange = (orgName: string, checked: boolean) => {
        setError(null)
        setSuccess(null)
        setForm((f) => ({
            ...f,
            organizations: checked
                ? [...f.organizations, orgName]
                : f.organizations.filter((org) => org !== orgName),
        }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            // Helper function to capitalize first letter
            const capitalizeFirstLetter = (str: string) => {
                return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
            }

            const toLower = (str: string) => str.trim().toLowerCase()

            const submitData = {
                ...form,
                role: toLower(form.role), // ← send lowercase only
                organizations:
                    form.organizations.length === 0
                        ? "none"
                        : form.organizations,
            }
            // Use the user being edited, not the current session user
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.USER}/${user.username}`, // ✅ Use user.username instead of getUserId()
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                    body: JSON.stringify(submitData),
                }
            )
            const data = await res.json()
            if (!res.ok) {
                setError(formatErrorMessage(data))
                return
            }
            setSuccess(formatSuccessMessage(data, "User"))
            setTimeout(() => {
                // Check if we're editing the current user - if so, we might need to handle session changes
                const currentUserId = getUserId()
                if (
                    user.username === currentUserId ||
                    user.id === currentUserId
                ) {
                    setSuccess(
                        "User updated successfully. Note: If you changed your own permissions, you may need to log in again."
                    )
                    setTimeout(() => {
                        onClose()
                        // Don't refresh automatically if editing own user to avoid 403 errors
                    }, 2000)
                } else {
                    // Safe to refresh for other users
                    refresh()
                    onClose()
                }
            }, 1000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    return (
        <div
            style={{
                ...styles.modal,
                width: "min(90vw, 700px)",
                maxHeight: "90vh",
                padding: "32px",
                overflow: "auto",
            }}
        >
            <div style={styles.title}>Edit User</div>

            {/* Display username as read-only information */}
            <div
                style={{
                    backgroundColor: "#f8fafc",
                    padding: "16px",
                    borderRadius: "8px",
                    marginBottom: "24px",
                    border: "1px solid #e2e8f0",
                }}
            >
                <div
                    style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                        marginBottom: "4px",
                    }}
                >
                    Gebruikersnaam (Cognito Sub)
                </div>
                <div
                    style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        fontFamily: "Monaco, 'Courier New', monospace",
                    }}
                >
                    {user.username}
                </div>
                <div
                    style={{
                        fontSize: "12px",
                        color: "#9ca3af",
                        marginTop: "4px",
                    }}
                >
                    Dit veld is een unieke identifier en kan niet veranderd worden
                </div>
            </div>

            {error && <div style={styles.errorAlert}>{error}</div>}

            {success && <div style={styles.successAlert}>{success}</div>}

            {organizationsError && (
                <div style={styles.errorAlert}>{organizationsError}</div>
            )}

            <form
                onSubmit={handleSubmit}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "20px",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label htmlFor="email" style={styles.label}>
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        style={styles.input}
                        onFocus={(e) => hover.input(e.target)}
                        onBlur={(e) => hover.resetInput(e.target)}
                    />
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label htmlFor="role" style={styles.label}>
                        Rol
                    </label>
                    <select
                        id="role"
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        style={{
                            ...styles.input,
                            backgroundColor: colors.white,
                        }}
                        onFocus={(e) => hover.input(e.target)}
                        onBlur={(e) => hover.resetInput(e.target)}
                    >
                        <option value="user">User</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label style={styles.label}>Organisaties</label>
                    <div
                        style={{
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            padding: "12px",
                            backgroundColor: "#fff",
                            minHeight: "120px",
                            maxHeight: "200px",
                            overflowY: "auto",
                        }}
                    >
                        {organizationsLoading ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "80px",
                                    color: "#6b7280",
                                    fontSize: "14px",
                                }}
                            >
                                <div
                                    style={{
                                        ...styles.spinner,
                                        marginRight: "8px",
                                    }}
                                />
                                Loading organizations...
                                <style>{animations}</style>
                            </div>
                        ) : organizationsError ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "80px",
                                    color: "#dc2626",
                                    fontSize: "14px",
                                    textAlign: "center",
                                }}
                            >
                                Organisaties niet beschikbaar
                            </div>
                        ) : availableOrganizations.length === 0 ? (
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    height: "80px",
                                    color: "#6b7280",
                                    fontSize: "14px",
                                }}
                            >
                                No organizations available
                            </div>
                        ) : (
                            <div
                                style={{
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: "8px",
                                }}
                            >
                                {availableOrganizations.map((org) => (
                                    <label
                                        key={org.id}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            cursor: "pointer",
                                            padding: "4px",
                                            borderRadius: "4px",
                                            transition: "background-color 0.2s",
                                        }}
                                        onMouseOver={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                "#f8fafc")
                                        }
                                        onMouseOut={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                "transparent")
                                        }
                                    >
                                        <input
                                            type="checkbox"
                                            checked={form.organizations.includes(
                                                org.name
                                            )}
                                            onChange={(e) =>
                                                handleOrganizationChange(
                                                    org.name,
                                                    e.target.checked
                                                )
                                            }
                                            style={{
                                                cursor: "pointer",
                                                accentColor: "#3b82f6",
                                            }}
                                        />
                                        <span
                                            style={{
                                                fontSize: "14px",
                                                color: "#374151",
                                            }}
                                        >
                                            {org.name}
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                    {!organizationsLoading && !organizationsError && (
                        <div
                            style={{
                                fontSize: "12px",
                                color: "#6b7280",
                                marginTop: "4px",
                            }}
                        >
                            Selected:{" "}
                            {form.organizations.length === 0
                                ? "none"
                                : form.organizations.join(", ")}
                        </div>
                    )}
                </div>

                <div
                    style={{
                        gridColumn: "1 / -1",
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                        marginTop: "24px",
                        paddingTop: "24px",
                        borderTop: "1px solid #e5e7eb",
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            ...buttonVariants.base,
                            ...buttonVariants.secondary,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#e5e7eb"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f3f4f6"
                        }}
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        disabled={organizationsError !== null}
                        style={{
                            ...buttonVariants.base,
                            ...(organizationsError 
                                ? {
                                    backgroundColor: "#9ca3af",
                                    color: "#ffffff",
                                    borderColor: "#9ca3af",
                                    cursor: "not-allowed",
                                  }
                                : buttonVariants.primary
                            ),
                        }}
                        onMouseEnter={(e) => {
                            if (!organizationsError) {
                                e.currentTarget.style.backgroundColor = "#2563eb"
                                e.currentTarget.style.borderColor = "#2563eb"
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!organizationsError) {
                                e.currentTarget.style.backgroundColor = colors.primary
                                e.currentTarget.style.borderColor = colors.primary
                            }
                        }}
                    >
                        Wijzigingen Opslaan
                    </button>
                </div>
            </form>
        </div>
    )
}

// ——— Create User Form ———
type CreateUserFormState = {
    email: string
}

function CreateUserForm({
    onClose,
    refresh,
}: {
    onClose(): void
    refresh(): void
}) {
    const [form, setForm] = useState<CreateUserFormState>({
        email: "",
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Validation helper
    function validateForm(form: CreateUserFormState): string[] {
        const errors: string[] = []
        const emailError = validateEmail(form.email)
        if (emailError) errors.push(emailError)
        return errors
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setError(null)
        setSuccess(null)
        setForm((f) => ({ ...f, [name]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()

        // Client-side validation
        const validationErrors = validateForm(form)
        if (validationErrors.length > 0) {
            setError(validationErrors.join("\n"))
            return
        }

        // Check if user is authenticated
        const token = getIdToken()
        if (!token) {
            setError(
                "Je moet ingelogd zijn om een gebruiker aan te maken. Log eerst in."
            )
            return
        }

        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            const res = await fetch(API_BASE_URL + API_PATHS.SIGNUP, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(form),
            })
            const data = await res.json()

            console.log("User creation response:", data)

            if (!res.ok) {
                setError(formatErrorMessage(data))
            } else {
                setSuccess(formatSuccessMessage(data, "User"))
                // Auto-close and refresh after success
                setTimeout(() => {
                    refresh()
                    onClose()
                }, 2000)
            }
        } catch (err: any) {
            console.error("User creation error:", err)
            setError(err.message || "Failed to submit form. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            style={{
                ...styles.modal,
                width: "min(90vw, 500px)",
                maxHeight: "90vh",
                padding: "32px",
            }}
        >
            {/* Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "24px",
            }}>
                <div style={styles.title}>
                    Nieuwe Gebruiker Aanmaken
                </div>
                <button
                    onClick={onClose}
                    style={{
                        ...buttonVariants.base,
                        ...buttonVariants.secondary,
                        padding: "8px",
                        minWidth: "auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#e5e7eb"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#f3f4f6"
                    }}
                >
                    ✕
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div style={styles.errorAlert}>
                    {error}
                </div>
            )}

            {/* Success Display */}
            {success && (
                <div style={styles.successAlert}>
                    {success}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "24px" }}>
                    <label htmlFor="email" style={styles.label}>
                        E-mailadres
                        <span style={{ color: colors.error }}>*</span>
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        placeholder="Voer e-mailadres gebruiker in"
                        style={{
                            ...styles.input,
                            backgroundColor: isSubmitting ? colors.gray50 : colors.white,
                            cursor: isSubmitting ? "not-allowed" : "text",
                        }}
                        onFocus={(e) => !isSubmitting && hover.input(e.target)}
                        onBlur={(e) => hover.resetInput(e.target)}
                    />
                </div>

                {/* Submit Buttons */}
                <div style={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            ...buttonVariants.base,
                            ...buttonVariants.secondary,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) => {
                            if (!isSubmitting) {
                                e.currentTarget.style.backgroundColor = "#e5e7eb"
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSubmitting) {
                                e.currentTarget.style.backgroundColor = "#f3f4f6"
                            }
                        }}
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            ...buttonVariants.base,
                            ...(isSubmitting 
                                ? {
                                    backgroundColor: colors.disabled,
                                    color: "#ffffff",
                                    borderColor: colors.disabled,
                                    cursor: "not-allowed",
                                  }
                                : buttonVariants.primary
                            ),
                        }}
                        onMouseEnter={(e) => {
                            if (!isSubmitting) {
                                e.currentTarget.style.backgroundColor = "#2563eb"
                                e.currentTarget.style.borderColor = "#2563eb"
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!isSubmitting) {
                                e.currentTarget.style.backgroundColor = colors.primary
                                e.currentTarget.style.borderColor = colors.primary
                            }
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <div style={{
                                    ...styles.spinner,
                                    marginRight: "8px",
                                }} />
                                Aanmaken...
                            </>
                        ) : (
                            <>
                                <FaPlus size={12} style={{ marginRight: "6px" }} />
                                Gebruiker Aanmaken
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Add spinning animation for loading spinner */}
            <style>{animations}</style>
        </div>
    )
}

// ——— Enhanced Error Notification ———
function ErrorNotification({
    message,
    onClose,
}: {
    message: string
    onClose(): void
}) {
    return (
        <div style={styles.modal}>
            <div style={{ ...styles.title, color: colors.error }}>Error</div>
            <div style={styles.description}>{message}</div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                    onClick={onClose}
                    style={{
                        ...buttonVariants.base,
                        ...buttonVariants.primary,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#2563eb"
                        e.currentTarget.style.borderColor = "#2563eb"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = colors.primary
                        e.currentTarget.style.borderColor = colors.primary
                    }}
                >
                    OK
                </button>
            </div>
        </div>
    )
}

// ——— Enhanced Search and Filter Bar ———
function SearchAndFilterBar({
    searchTerm,
    onSearchChange,
    visibleColumns,
    onToggleColumn,
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    visibleColumns: Set<string>
    onToggleColumn: (column: string) => void
}) {
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null)
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        right: 0,
    })

    // Calculate dropdown position when button reference changes or dropdown opens
    useEffect(() => {
        if (buttonRef && showColumnFilter) {
            const rect = buttonRef.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [buttonRef, showColumnFilter])

    const toggleGroup = (groupKey: keyof typeof COLUMN_GROUPS) => {
        const groupColumns = COLUMNS.filter((col) => col.group === groupKey)
        const allVisible = groupColumns.every((col) =>
            visibleColumns.has(col.key)
        )

        groupColumns.forEach((col) => {
            if (allVisible) {
                onToggleColumn(col.key) // Hide all
            } else if (!visibleColumns.has(col.key)) {
                onToggleColumn(col.key) // Show missing ones
            }
        })
    }

    return (
        <>
            <div
                style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        flex: "1",
                        minWidth: "200px",
                    }}
                >
                    <FaSearch
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#6b7280",
                            fontSize: "14px",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Zoek gebruikers..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{
                            ...styles.input,
                            width: "100%",
                            paddingLeft: "40px",
                        }}
                        onFocus={(e) => hover.input(e.target)}
                        onBlur={(e) => hover.resetInput(e.target)}
                    />
                </div>

                <div style={{ position: "relative" }}>
                    <button
                        ref={setButtonRef}
                        onClick={() => setShowColumnFilter(!showColumnFilter)}
                        style={{
                            ...buttonVariants.base,
                            ...buttonVariants.secondary,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#e5e7eb"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = "#f3f4f6"
                        }}
                    >
                        <FaFilter /> Columns ({visibleColumns.size})
                    </button>
                </div>
            </div>

            {/* Portal the dropdown to document.body */}
            {showColumnFilter &&
                ReactDOM.createPortal(
                    <>
                        {/* Backdrop to close dropdown when clicking outside */}
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 999,
                            }}
                            onClick={() => setShowColumnFilter(false)}
                        />

                        {/* The actual dropdown */}
                        <div
                            style={{
                                position: "fixed",
                                top: `${dropdownPosition.top}px`,
                                right: `${dropdownPosition.right}px`,
                                backgroundColor: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                zIndex: 1000,
                                minWidth: "250px",
                                maxHeight: "300px",
                                overflowY: "auto",
                            }}
                        >
                            {/* Quick Actions */}
                            <div
                                style={{
                                    padding: "12px",
                                    borderBottom: "1px solid #e5e7eb",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            // First, hide all non-essential columns
                                            COLUMNS.filter(
                                                (col) =>
                                                    col.group !== "essential"
                                            ).forEach((col) => {
                                                if (
                                                    visibleColumns.has(col.key)
                                                ) {
                                                    onToggleColumn(col.key)
                                                }
                                            })
                                            // Then, show all essential columns
                                            COLUMNS.filter(
                                                (col) =>
                                                    col.group === "essential"
                                            ).forEach((col) => {
                                                if (
                                                    !visibleColumns.has(col.key)
                                                ) {
                                                    onToggleColumn(col.key)
                                                }
                                            })
                                        }}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            backgroundColor: "#f3f4f6",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Alleen Essentiële
                                    </button>
                                    <button
                                        onClick={() =>
                                            COLUMNS.forEach(
                                                (col) =>
                                                    !visibleColumns.has(
                                                        col.key
                                                    ) && onToggleColumn(col.key)
                                            )
                                        }
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            backgroundColor: "#f3f4f6",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Toon Alles
                                    </button>
                                </div>
                            </div>

                            {/* Grouped Columns */}
                            {Object.entries(COLUMN_GROUPS).map(
                                ([groupKey, group]) => {
                                    const groupColumns = COLUMNS.filter(
                                        (col) => col.group === groupKey
                                    )
                                    const visibleInGroup = groupColumns.filter(
                                        (col) => visibleColumns.has(col.key)
                                    ).length

                                    return (
                                        <div key={groupKey}>
                                            <div
                                                style={{
                                                    padding: "8px 12px",
                                                    backgroundColor: "#f8fafc",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151",
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "center",
                                                    cursor: "pointer",
                                                }}
                                                onClick={() =>
                                                    toggleGroup(
                                                        groupKey as keyof typeof COLUMN_GROUPS
                                                    )
                                                }
                                            >
                                                <span>{group.label}</span>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: "#6b7280",
                                                    }}
                                                >
                                                    {visibleInGroup}/
                                                    {groupColumns.length}
                                                </span>
                                            </div>
                                            {groupColumns.map((col) => (
                                                <label
                                                    key={col.key}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        padding: "6px 20px",
                                                        cursor: "pointer",
                                                        fontSize: "13px",
                                                        fontFamily: FONT_STACK,
                                                        transition:
                                                            "background-color 0.2s",
                                                    }}
                                                    onMouseOver={(e) =>
                                                        (e.currentTarget.style.backgroundColor =
                                                            "#f9fafb")
                                                    }
                                                    onMouseOut={(e) =>
                                                        (e.currentTarget.style.backgroundColor =
                                                            "transparent")
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns.has(
                                                            col.key
                                                        )}
                                                        onChange={() =>
                                                            onToggleColumn(
                                                                col.key
                                                            )
                                                        }
                                                        style={{
                                                            cursor: "pointer",
                                                        }}
                                                    />
                                                    {col.label}
                                                </label>
                                            ))}
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    </>,
                    document.body
                )}
        </>
    )
}

// ——— The Enhanced Override ———
export function UserPageOverride(): Override {
    const [users, setUsers] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [editingUser, setEditingUser] = useState<any | null>(null)
    const [creatingUser, setCreatingUser] = useState(false)
    const [deletingUserId, setDeletingUserId] = useState<
        string | number | null
    >(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(COLUMNS.map((col) => col.key)) // Show all columns by default
    )
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
    const [pendingCount, setPendingCount] = useState<number>(0)

    async function fetchPendingCount(): Promise<number> {
        try {
            const token = getIdToken()
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            if (token) headers.Authorization = `Bearer ${token}`
            
            const res = await fetch(`${API_BASE_URL}${API_PATHS.INSURED_OBJECT}?status=Pending`, {
                method: "GET",
                headers,
                mode: "cors",
            })
            
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
            const data = await res.json()
            const result = data.items || data.objects || data.insuredObjects || data || []
            return Array.isArray(result) ? result.length : 0
        } catch (error) {
            console.error("Error fetching pending count:", error)
            return 0
        }
    }

    const refresh = useCallback(() => {
        fetchUsers(userInfo)
            .then(setUsers)
            .catch((err) => {
                console.error(err)
                if (
                    err.message.includes("Authentication failed") ||
                    err.message.includes("session may have expired")
                ) {
                    setError(
                        "Authentication failed. Please log in again to continue managing users."
                    )
                } else {
                    setError(err.message)
                }
            })
    }, [userInfo])

    // Load user info on mount
    useEffect(() => {
        async function loadUserInfo() {
            const basicUserInfo = getCurrentUserInfo()
            if (basicUserInfo) {
                setUserInfo(basicUserInfo)

                // Fetch detailed user info from backend
                const detailedUserInfo = await fetchUserInfo(basicUserInfo.sub)
                if (detailedUserInfo) {
                    setUserInfo(detailedUserInfo)
                }
            }
            setIsLoadingUserInfo(false)
        }

        loadUserInfo()
    }, [])

    useEffect(() => {
        if (!isLoadingUserInfo) {
            refresh()
        }
    }, [refresh, isLoadingUserInfo])

    // Fetch pending count
    useEffect(() => {
        const loadPendingCount = async () => {
            const count = await fetchPendingCount()
            setPendingCount(count)
        }
        loadPendingCount()
    }, [])

    const filteredUsers =
        users?.filter((user) => {
            if (!searchTerm) return true
            return Object.values(user).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        }) || []

    const handleEdit = (id: string | number) =>
        setEditingUser(users?.find((u) => u.id === id) || null)

    const confirmDelete = (id: string | number) => setDeletingUserId(id)

    const toggleColumn = (columnKey: string) => {
        setVisibleColumns((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(columnKey)) {
                newSet.delete(columnKey)
            } else {
                newSet.add(columnKey)
            }
            return newSet
        })
    }

    async function handleDelete() {
        if (deletingUserId == null) return
        const id = deletingUserId
        setDeletingUserId(null)
        try {
            // Find the user by ID to get their username
            const userToDelete = users?.find((u) => u.id === id)
            if (!userToDelete) {
                throw new Error("User not found")
            }

            // Use username for the API call instead of user ID
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.USER}/${userToDelete.username}`,
                {
                    method: "DELETE",
                    headers: { Authorization: `Bearer ${getIdToken()}` },
                }
            )
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
            refresh()
        } catch (err: any) {
            console.error(err)
            setDeleteError(`Failed to delete user: ${err.message}`)
        }
    }

    if (users === null || isLoadingUserInfo) {
        return {
            children: (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "200px",
                        fontSize: "16px",
                        color: "#6b7280",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Gebruikers laden...
                </div>
            ),
        }
    }

    if (error) {
        return {
            children: (
                <div
                    style={{
                        padding: "24px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        color: "#dc2626",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Fout: {error}
                </div>
            ),
        }
    }

    const visibleColumnsList = COLUMNS.filter((col) =>
        visibleColumns.has(col.key)
    )

    return {
        children: (
            <>
                <div
                    style={{
                        padding: "24px",
                        backgroundColor: "#f8fafc",
                        minHeight: "100vh",
                        fontFamily: FONT_STACK,
                    }}
                >
                    {/* User Info Banner */}
                    <div style={{ marginBottom: "20px" }}>
                        <UserInfoBanner />
                    </div>

                    <div
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Enhanced Navigation Tabs at Top */}
                        <div
                            style={{
                                padding: "20px 24px",
                                backgroundColor: "#f8fafc",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                gap: "8px",
                                overflowX: "auto",
                                alignItems: "center",
                            }}
                        >
                            {[
                                { key: "organizations", label: "Organisaties", icon: FaBuilding, href: "/organizations" },
                                { key: "policies", label: "Polissen", icon: FaFileContract, href: "/policies" },
                                { key: "pending", label: "Pending Items", icon: FaClock, href: "/pending_overview" },
                                { key: "users", label: "Gebruikers", icon: FaUsers, href: "/users" },
                                { key: "changelog", label: "Wijzigingslogboek", icon: FaClipboardList, href: "/changelog" }
                            ].filter((tab) => {
                                // Hide pending, users, and changelog tabs for regular users
                                if (userInfo?.role === "user" && (tab.key === "pending" || tab.key === "users" || tab.key === "changelog")) {
                                    return false
                                }
                                return true
                            }).map((tab) => {
                                const isActive = tab.key === "users"
                                const Icon = tab.icon
                                
                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            if (!isActive) {
                                                window.location.href = tab.href
                                            }
                                        }}
                                        style={{
                                            padding: "16px 24px",
                                            backgroundColor: isActive ? colors.navigationActive : colors.navigationInactive,
                                            color: isActive ? "white" : colors.gray500,
                                            border: isActive ? "none" : `2px solid ${colors.navigationInactiveBorder}`,
                                            borderRadius: "12px",
                                            fontSize: "15px",
                                            fontWeight: "600",
                                            cursor: isActive ? "default" : "pointer",
                                            fontFamily: FONT_STACK,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            transition: "all 0.2s",
                                            minHeight: "48px",
                                            boxShadow: isActive 
                                                ? "0 2px 8px rgba(59, 130, 246, 0.15)" 
                                                : "0 2px 4px rgba(0,0,0,0.05)",
                                            transform: isActive ? "translateY(-1px)" : "none",
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isActive) {
                                                const target = e.target as HTMLElement
                                                target.style.backgroundColor = colors.navigationInactiveHover
                                                target.style.borderColor = colors.navigationActive
                                                target.style.color = colors.navigationActive
                                                target.style.transform = "translateY(-1px)"
                                                target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.15)"
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isActive) {
                                                const target = e.target as HTMLElement
                                                target.style.backgroundColor = colors.navigationInactive
                                                target.style.borderColor = colors.navigationInactiveBorder
                                                target.style.color = colors.gray500
                                                target.style.transform = "none"
                                                target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"
                                            }
                                        }}
                                    >
                                        <Icon size={14} />
                                        {tab.label}
                                        {/* Pending count badge */}
                                        {tab.key === "pending" && pendingCount > 0 && (
                                            <span
                                                style={{
                                                    backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#dc2626",
                                                    color: "white",
                                                    borderRadius: "10px",
                                                    padding: "2px 6px",
                                                    fontSize: "12px",
                                                    fontWeight: "700",
                                                    minWidth: "18px",
                                                    textAlign: "center",
                                                    marginLeft: "4px",
                                                }}
                                            >
                                                {pendingCount}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        <div
                            style={{
                                padding: "24px",
                                borderBottom: "1px solid #e5e7eb",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: "20px",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "16px",
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        <FaUsers
                                            size={24}
                                            style={{
                                                color: colors.primary,
                                            }}
                                        />
                                        <h1
                                            style={{
                                                fontSize: "32px",
                                                fontWeight: "600",
                                                color: "#1f2937",
                                                margin: 0,
                                                letterSpacing: "-0.025em",
                                            }}
                                        >
                                            {isAdmin(userInfo)
                                                ? "Gebruiker Beheer"
                                                : "Team Leden"}
                                        </h1>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div
                                        style={{
                                            fontSize: "14px",
                                            color: "#6b7280",
                                            backgroundColor: "#f3f4f6",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                        }}
                                    >
                                        {filteredUsers.length} gebruikers
                                    </div>
                                    <NewUserButton
                                        userInfo={userInfo}
                                        onClick={() => setCreatingUser(true)}
                                    >
                                        Nieuwe Gebruiker
                                    </NewUserButton>
                                </div>
                            </div>

                            <SearchAndFilterBar
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                visibleColumns={visibleColumns}
                                onToggleColumn={toggleColumn}
                            />
                        </div>


                        <div
                            style={{
                                overflowX: "auto",
                                maxHeight: "70vh",
                                position: "relative",
                            }}
                        >
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: "14px",
                                    minWidth: "800px",
                                }}
                            >
                                <thead
                                    style={{
                                        position: "sticky",
                                        top: 0,
                                        backgroundColor: "#f8fafc",
                                        zIndex: 10,
                                    }}
                                >
                                    <tr>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: "12px 8px",
                                                borderBottom:
                                                    "2px solid #e5e7eb",
                                                fontWeight: "600",
                                                color: "#374151",
                                                width: "100px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            Acties
                                        </th>
                                        {visibleColumnsList.map((col) => (
                                            <th
                                                key={col.key}
                                                style={{
                                                    textAlign: "left",
                                                    padding: "12px 8px",
                                                    borderBottom:
                                                        "2px solid #e5e7eb",
                                                    fontWeight: "600",
                                                    color: "#374151",
                                                    width: col.width || "auto",
                                                    minWidth: "80px",
                                                    fontSize: "13px",
                                                    lineHeight: "1.2",
                                                }}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user, index) => (
                                        <tr
                                            key={user.id}
                                            style={{
                                                backgroundColor:
                                                    index % 2 === 0
                                                        ? "#ffffff"
                                                        : "#f8fafc",
                                                transition:
                                                    "background-color 0.2s",
                                            }}
                                            onMouseOver={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    "#f1f5f9")
                                            }
                                            onMouseOut={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    index % 2 === 0
                                                        ? "#ffffff"
                                                        : "#f8fafc")
                                            }
                                        >
                                            <td
                                                style={{
                                                    padding: "12px 8px",
                                                    borderBottom:
                                                        "1px solid #f1f5f9",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                <UserActionButtons
                                                    userInfo={userInfo}
                                                    onEdit={() => handleEdit(user.id)}
                                                    onDelete={() => confirmDelete(user.id)}
                                                />
                                            </td>
                                            {visibleColumnsList.map((col) => {
                                                const cellValue = user[col.key]
                                                let displayValue: React.ReactNode

                                                if (cellValue == null) {
                                                    displayValue = (
                                                        <span
                                                            style={{
                                                                color: "#9ca3af",
                                                            }}
                                                        >
                                                            -
                                                        </span>
                                                    )
                                                } else if (col.key === "role") {
                                                    const roleStyle =
                                                        getRoleStyle(cellValue)
                                                    displayValue = (
                                                        <span
                                                            style={{
                                                                ...roleStyle,
                                                                padding:
                                                                    "4px 8px",
                                                                borderRadius:
                                                                    "12px",
                                                                fontSize:
                                                                    "12px",
                                                                fontWeight:
                                                                    "500",
                                                                textTransform:
                                                                    "capitalize",
                                                            }}
                                                        >
                                                            {cellValue}
                                                        </span>
                                                    )
                                                } else if (
                                                    col.key === "organizations"
                                                ) {
                                                    // Handle both array and string formats for organizations
                                                    if (
                                                        Array.isArray(cellValue)
                                                    ) {
                                                        displayValue =
                                                            cellValue.length ===
                                                            0
                                                                ? "none"
                                                                : cellValue.join(
                                                                      ", "
                                                                  )
                                                    } else if (
                                                        cellValue === "none" ||
                                                        !cellValue
                                                    ) {
                                                        displayValue = "none"
                                                    } else {
                                                        displayValue =
                                                            String(cellValue)
                                                    }
                                                } else if (
                                                    col.key === "createdAt" ||
                                                    col.key === "updatedAt"
                                                ) {
                                                    displayValue = new Date(
                                                        cellValue
                                                    ).toLocaleDateString()
                                                } else {
                                                    displayValue =
                                                        String(cellValue)
                                                }

                                                return (
                                                    <td
                                                        key={col.key}
                                                        style={{
                                                            padding: "12px 8px",
                                                            borderBottom:
                                                                "1px solid #f1f5f9",
                                                            color: "#374151",
                                                            fontSize: "13px",
                                                            lineHeight: "1.3",
                                                            wordBreak:
                                                                "break-word",
                                                            whiteSpace:
                                                                "normal",
                                                        }}
                                                        title={String(
                                                            cellValue ?? "-"
                                                        )}
                                                    >
                                                        {displayValue}
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Overlays */}
                {editingUser &&
                    ReactDOM.createPortal(
                        <div style={styles.modalOverlay}>
                            <EditUserForm
                                user={editingUser}
                                onClose={() => setEditingUser(null)}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}

                {creatingUser &&
                    ReactDOM.createPortal(
                        <div style={styles.modalOverlay}>
                            <CreateUserForm
                                onClose={() => setCreatingUser(false)}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}

                {deletingUserId != null &&
                    ReactDOM.createPortal(
                        <div style={styles.modalOverlay}>
                            <ConfirmDeleteDialog
                                onConfirm={handleDelete}
                                onCancel={() => setDeletingUserId(null)}
                                username={users?.find(u => u.id === deletingUserId)?.username || users?.find(u => u.id === deletingUserId)?.email}
                            />
                        </div>,
                        document.body
                    )}

                {deleteError &&
                    ReactDOM.createPortal(
                        <div style={styles.modalOverlay}>
                            <ErrorNotification
                                message={deleteError}
                                onClose={() => setDeleteError(null)}
                            />
                        </div>,
                        document.body
                    )}
            </>
        ),
    }
}

// Additional exports for Framer compatibility
export function UserApp(): Override {
    return UserPageOverride()
}

export default UserPageOverride
