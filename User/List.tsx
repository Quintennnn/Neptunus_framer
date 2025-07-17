import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override, Frame } from "framer"
import { useState, useEffect, useCallback } from "react"
import { FaEdit, FaTrashAlt, FaSearch, FaFilter } from "react-icons/fa"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const USER_PATH = "/neptunus/user"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}
export function getUserId(): string | null {
    return sessionStorage.getItem("userId")
}

async function fetchUsers(): Promise<any[]> {
    const token = getIdToken()
    if (!token) {
        throw new Error("No authentication token found. Please log in again.")
    }
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}${USER_PATH}`, {
        method: "GET",
        headers,
        mode: "cors",
    })
    if (!res.ok) {
        if (res.status === 403) {
            throw new Error("Authentication failed. Your session may have expired. Please log in again.")
        }
        throw new Error(`${res.status} ${res.statusText}`)
    }
    const json = await res.json()
    return json.users || json.data || json
}

async function fetchOrganizations(): Promise<any[]> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}/neptunus/organization`, {
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
    essential: { label: "Essential", priority: 1 },
    additional: { label: "Additional", priority: 2 },
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
        label: "Username",
        priority: 1,
        group: "essential",
        width: "150px",
    },
    {
        key: "email",
        label: "Email",
        priority: 1,
        group: "essential",
        width: "200px",
    },
    {
        key: "role",
        label: "Role",
        priority: 1,
        group: "essential",
        width: "100px",
    },

    // Additional columns
    {
        key: "organizations",
        label: "Organizations",
        priority: 2,
        group: "additional",
        width: "150px",
    },
    {
        key: "createdAt",
        label: "Created",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "updatedAt",
        label: "Updated",
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

// ——— Enhanced Confirm Delete Dialog ———
function ConfirmDeleteDialog({
    onConfirm,
    onCancel,
}: {
    onConfirm(): void
    onCancel(): void
}) {
    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "400px",
                padding: "24px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                fontFamily: FONT_STACK,
                zIndex: 1001,
            }}
        >
            <div
                style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    marginBottom: "16px",
                    color: "#1f2937",
                }}
            >
                Delete User
            </div>
            <div
                style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "24px",
                    lineHeight: "1.5",
                }}
            >
                Are you sure you want to delete this user? This action cannot be
                undone.
            </div>
            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "flex-end",
                }}
            >
                <button
                    onClick={onCancel}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#f3f4f6",
                        color: "#374151",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                        transition: "all 0.2s",
                    }}
                    onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#e5e7eb")
                    }
                    onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "#f3f4f6")
                    }
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                        transition: "all 0.2s",
                    }}
                    onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#dc2626")
                    }
                    onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "#ef4444")
                    }
                >
                    Delete
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

            // Convert organizations array back to appropriate format for API
            const submitData = {
                ...form,
                role: capitalizeFirstLetter(form.role), // Capitalize the role before submission
                organizations:
                    form.organizations.length === 0
                        ? "none"
                        : form.organizations,
            }
            // Use the user being edited, not the current session user
            const res = await fetch(
                `${API_BASE_URL}${USER_PATH}/${user.username}`, // ✅ Use user.username instead of getUserId()
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
                setError(
                    typeof data === "object"
                        ? JSON.stringify(data)
                        : String(data)
                )
                return
            }
            setSuccess("User updated successfully.")
            setTimeout(() => {
                // Check if we're editing the current user - if so, we might need to handle session changes
                const currentUserId = getUserId()
                if (user.username === currentUserId || user.id === currentUserId) {
                    setSuccess("User updated successfully. Note: If you changed your own permissions, you may need to log in again.")
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
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(90vw, 700px)",
                maxHeight: "90vh",
                padding: "32px",
                background: "#fff",
                borderRadius: "16px",
                boxShadow: "0 25px 70px rgba(0,0,0,0.15)",
                fontFamily: FONT_STACK,
                zIndex: 1001,
                overflow: "auto",
            }}
        >
            <div
                style={{
                    fontSize: "24px",
                    fontWeight: "600",
                    marginBottom: "24px",
                    color: "#1f2937",
                }}
            >
                Edit User
            </div>

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
                    Username (Cognito Sub)
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
                    This field cannot be edited as it's linked to your Cognito
                    identity.
                </div>
            </div>

            {error && (
                <div
                    style={{
                        color: "#dc2626",
                        backgroundColor: "#fef2f2",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        fontSize: "14px",
                        border: "1px solid #fecaca",
                        whiteSpace: "pre-wrap",
                    }}
                >
                    {error}
                </div>
            )}

            {success && (
                <div
                    style={{
                        color: "#059669",
                        backgroundColor: "#ecfdf5",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        fontSize: "14px",
                        border: "1px solid #a7f3d0",
                    }}
                >
                    {success}
                </div>
            )}

            {organizationsError && (
                <div
                    style={{
                        color: "#dc2626",
                        backgroundColor: "#fef2f2",
                        padding: "12px 16px",
                        borderRadius: "8px",
                        marginBottom: "24px",
                        fontSize: "14px",
                        border: "1px solid #fecaca",
                        fontWeight: "600",
                    }}
                >
                    {organizationsError}
                </div>
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
                    <label
                        htmlFor="email"
                        style={{
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                        }}
                    >
                        Email
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        style={{
                            padding: "12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontFamily: FONT_STACK,
                            transition: "border-color 0.2s",
                        }}
                        onFocus={(e) =>
                            (e.target.style.borderColor = "#3b82f6")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label
                        htmlFor="role"
                        style={{
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                        }}
                    >
                        Role
                    </label>
                    <select
                        id="role"
                        name="role"
                        value={form.role}
                        onChange={handleChange}
                        style={{
                            padding: "12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontFamily: FONT_STACK,
                            transition: "border-color 0.2s",
                            backgroundColor: "#fff",
                        }}
                        onFocus={(e) =>
                            (e.target.style.borderColor = "#3b82f6")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    >
                        <option value="user">User</option>
                        <option value="editor">Editor</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column" }}>
                    <label
                        style={{
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                        }}
                    >
                        Organizations
                    </label>
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
                                        width: "20px",
                                        height: "20px",
                                        border: "2px solid #e5e7eb",
                                        borderTop: "2px solid #3b82f6",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite",
                                        marginRight: "8px",
                                    }}
                                />
                                Loading organizations...
                                <style>
                                    {`
                                        @keyframes spin {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
                                        }
                                    `}
                                </style>
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
                                Organizations unavailable
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
                            padding: "12px 24px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) =>
                            (e.target.style.backgroundColor = "#e5e7eb")
                        }
                        onMouseOut={(e) =>
                            (e.target.style.backgroundColor = "#f3f4f6")
                        }
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={organizationsError !== null}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: organizationsError
                                ? "#9ca3af"
                                : "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: organizationsError
                                ? "not-allowed"
                                : "pointer",
                            fontFamily: FONT_STACK,
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                            if (!organizationsError) {
                                e.target.style.backgroundColor = "#2563eb"
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!organizationsError) {
                                e.target.style.backgroundColor = "#3b82f6"
                            }
                        }}
                    >
                        Save Changes
                    </button>
                </div>
            </form>
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
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "400px",
                padding: "24px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                fontFamily: FONT_STACK,
                zIndex: 1001,
            }}
        >
            <div
                style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: "#dc2626",
                    marginBottom: "16px",
                }}
            >
                Error
            </div>
            <div
                style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "24px",
                    lineHeight: "1.5",
                }}
            >
                {message}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button
                    onClick={onClose}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: "#3b82f6",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                        transition: "all 0.2s",
                    }}
                    onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#2563eb")
                    }
                    onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "#3b82f6")
                    }
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
                        placeholder="Search users..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px 12px 12px 40px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontFamily: FONT_STACK,
                            transition: "border-color 0.2s",
                        }}
                        onFocus={(e) =>
                            (e.target.style.borderColor = "#3b82f6")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                </div>

                <div style={{ position: "relative" }}>
                    <button
                        ref={setButtonRef}
                        onClick={() => setShowColumnFilter(!showColumnFilter)}
                        style={{
                            padding: "12px 16px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) =>
                            (e.target.style.backgroundColor = "#e5e7eb")
                        }
                        onMouseOut={(e) =>
                            (e.target.style.backgroundColor = "#f3f4f6")
                        }
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
                                        Essential Only
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
                                        Show All
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
    const [deletingUserId, setDeletingUserId] = useState<
        string | number | null
    >(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(COLUMNS.map((col) => col.key)) // Show all columns by default
    )

    const refresh = useCallback(() => {
        fetchUsers()
            .then(setUsers)
            .catch((err) => {
                console.error(err)
                if (err.message.includes("Authentication failed") || err.message.includes("session may have expired")) {
                    setError("Authentication failed. Please log in again to continue managing users.")
                } else {
                    setError(err.message)
                }
            })
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

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
            const res = await fetch(`${API_BASE_URL}${USER_PATH}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getIdToken()}` },
            })
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
            refresh()
        } catch (err: any) {
            console.error(err)
            setDeleteError(`Failed to delete user: ${err.message}`)
        }
    }

    if (users === null) {
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
                    Loading users...
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
                    Error: {error}
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
                    <div
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            overflow: "hidden",
                        }}
                    >
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
                                <h1
                                    style={{
                                        fontSize: "28px",
                                        fontWeight: "700",
                                        color: "#1f2937",
                                        margin: 0,
                                    }}
                                >
                                    User Management
                                </h1>
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "#6b7280",
                                        backgroundColor: "#f3f4f6",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                    }}
                                >
                                    {filteredUsers.length} users
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
                                            Actions
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
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        gap: "8px",
                                                    }}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            handleEdit(user.id)
                                                        }
                                                        style={{
                                                            padding: "8px 12px",
                                                            backgroundColor:
                                                                "#3b82f6",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            cursor: "pointer",
                                                            fontSize: "12px",
                                                            fontWeight: "500",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "4px",
                                                            fontFamily:
                                                                FONT_STACK,
                                                            transition:
                                                                "all 0.2s",
                                                        }}
                                                        onMouseOver={(e) =>
                                                            (e.target.style.backgroundColor =
                                                                "#2563eb")
                                                        }
                                                        onMouseOut={(e) =>
                                                            (e.target.style.backgroundColor =
                                                                "#3b82f6")
                                                        }
                                                    >
                                                        <FaEdit size={10} />{" "}
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() =>
                                                            confirmDelete(
                                                                user.id
                                                            )
                                                        }
                                                        style={{
                                                            padding: "8px 12px",
                                                            backgroundColor:
                                                                "#ef4444",
                                                            color: "#fff",
                                                            border: "none",
                                                            borderRadius: "6px",
                                                            cursor: "pointer",
                                                            fontSize: "12px",
                                                            fontWeight: "500",
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "4px",
                                                            fontFamily:
                                                                FONT_STACK,
                                                            transition:
                                                                "all 0.2s",
                                                        }}
                                                        onMouseOver={(e) =>
                                                            (e.target.style.backgroundColor =
                                                                "#dc2626")
                                                        }
                                                        onMouseOut={(e) =>
                                                            (e.target.style.backgroundColor =
                                                                "#ef4444")
                                                        }
                                                    >
                                                        <FaTrashAlt size={10} />{" "}
                                                        Delete
                                                    </button>
                                                </div>
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
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                backdropFilter: "blur(4px)",
                                zIndex: 1000,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <EditUserForm
                                user={editingUser}
                                onClose={() => setEditingUser(null)}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}

                {deletingUserId != null &&
                    ReactDOM.createPortal(
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                backdropFilter: "blur(4px)",
                                zIndex: 1000,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            <ConfirmDeleteDialog
                                onConfirm={handleDelete}
                                onCancel={() => setDeletingUserId(null)}
                            />
                        </div>,
                        document.body
                    )}

                {deleteError &&
                    ReactDOM.createPortal(
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                backdropFilter: "blur(4px)",
                                zIndex: 1000,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
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
