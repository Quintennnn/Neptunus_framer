// src/UserInfoOverride.tsx

import { Override } from "framer"
import { useState, useEffect } from "react"

const API_BASE_URL = "https://dev.api.hienfeld.io"
const USER_PATH = "/neptunus/user"

// Color palette for Neptunus theme consistency
const COLORS = {
    primary: "#2D3748",
    secondary: "#4A5568",
    accent: "#3182CE",
    background: "#F7FAFC",
    backgroundAlt: "#EDF2F7",
    success: "#38A169",
    error: "#E53E3E",
    border: "#E2E8F0",
    text: "#1A202C",
    textSecondary: "#718096",
}

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

// Animation constants
const TRANSITION = "all 0.2s ease-in-out"

interface UserData {
    email: string
    role: string
    organizations: string[]
    // add other fields from your user table as needed
}

export function getUserId(): string | null {
    return sessionStorage.getItem("userId")
}

// Helper to retrieve your auth token; adjust to suit your auth setup
function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

export function UserInfoOverride(): Override {
    const [userData, setUserData] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expanded, setExpanded] = useState(false)

    useEffect(() => {
        async function fetchCurrentUser() {
            try {
                const token = getIdToken()
                if (!token) throw new Error("No id token found")
                const user_id = getUserId()
                if (!user_id) throw new Error("No user ID found")

                const res = await fetch(
                    `${API_BASE_URL}${USER_PATH}/${user_id}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                )
                if (!res.ok) throw new Error(`Fetch failed: ${res.statusText}`)

                const json = await res.json()
                setUserData(json.user)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchCurrentUser()
    }, [])

    // Loading state
    if (loading) {
        return {
            children: (
                <div
                    style={{
                        padding: "12px 16px",
                        background: COLORS.backgroundAlt,
                        borderRadius: "8px",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontFamily: FONT_STACK,
                        fontSize: "13px",
                        color: COLORS.textSecondary,
                        height: "48px",
                        transition: TRANSITION,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <div
                            style={{
                                width: "16px",
                                height: "16px",
                                border: `2px solid ${COLORS.accent}`,
                                borderTopColor: "transparent",
                                borderRadius: "50%",
                                animation: "spin 1s linear infinite",
                                marginRight: "8px",
                            }}
                        />
                        <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
                        Loading user info...
                    </div>
                </div>
            ),
        }
    }

    // Error state
    if (error) {
        return {
            children: (
                <div
                    style={{
                        padding: "12px 16px",
                        background: "rgba(229, 62, 62, 0.1)",
                        borderRadius: "8px",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                        fontFamily: FONT_STACK,
                        fontSize: "13px",
                        color: COLORS.error,
                        border: `1px solid ${COLORS.error}`,
                        transition: TRANSITION,
                    }}
                >
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <svg
                            width="16"
                            height="16"
                            viewBox="0 0 16 16"
                            fill="none"
                            style={{ marginRight: "8px" }}
                        >
                            <path
                                d="M8 15A7 7 0 108 1a7 7 0 000 14zM8 4v4M8 12h.01"
                                stroke={COLORS.error}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </svg>
                        Error: {error}
                    </div>
                </div>
            ),
        }
    }

    if (!userData) {
        // If there's no user data, render nothing
        return { children: null }
    }

    // Helper to truncate long organization lists
    const formatOrganizations = () => {
        if (!userData.organizations || userData.organizations.length === 0)
            return null

        if (userData.organizations.length <= 2 || expanded) {
            return userData.organizations.join(", ")
        }

        return `${userData.organizations[0]}, ${userData.organizations[1]} +${userData.organizations.length - 2} more`
    }

    // Role badge style based on role type
    const getRoleBadgeStyle = () => {
        let color = COLORS.accent
        let background = "rgba(49, 130, 206, 0.1)"

        if (userData.role.toLowerCase().includes("admin")) {
            color = COLORS.success
            background = "rgba(56, 161, 105, 0.1)"
        }

        return {
            display: "inline-block",
            padding: "2px 8px",
            borderRadius: "4px",
            color,
            background,
            fontWeight: 500,
            fontSize: "11px",
            textTransform: "uppercase" as const,
            letterSpacing: "0.5px",
        }
    }

    // Render the user info card
    return {
        children: (
            <div
                style={{
                    padding: "12px 16px",
                    background: COLORS.background,
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    border: `1px solid ${COLORS.border}`,
                    fontFamily: FONT_STACK,
                    fontSize: "13px",
                    color: COLORS.text,
                    cursor:
                        userData.organizations.length > 2
                            ? "pointer"
                            : "default",
                    transition: TRANSITION,
                    position: "relative",
                    overflow: "hidden",
                }}
                onClick={() => {
                    if (userData.organizations.length > 2) {
                        setExpanded(!expanded)
                    }
                }}
            >
                {/* Accent bar on left side */}
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        bottom: 0,
                        width: "4px",
                        background: COLORS.accent,
                        borderTopLeftRadius: "8px",
                        borderBottomLeftRadius: "8px",
                    }}
                />

                {/* User email with icon */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: "6px",
                        fontWeight: 600,
                    }}
                >
                    <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        style={{ marginRight: "8px" }}
                    >
                        <path
                            d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"
                            stroke={COLORS.accent}
                            strokeWidth="1.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                    {userData.email}
                </div>

                {/* Role badge */}
                <div style={{ marginBottom: "6px" }}>
                    <span style={getRoleBadgeStyle()}>{userData.role}</span>
                </div>

                {/* Organizations list */}
                {userData.organizations.length > 0 && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            color: COLORS.textSecondary,
                            fontSize: "12px",
                        }}
                    >
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            style={{ marginRight: "8px" }}
                        >
                            <path
                                d="M12 3v18M3 6h18M3 12h18M3 18h18"
                                stroke={COLORS.textSecondary}
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span>
                            {formatOrganizations()}
                            {userData.organizations.length > 2 && (
                                <span
                                    style={{
                                        marginLeft: "6px",
                                        color: COLORS.accent,
                                        fontWeight: 500,
                                    }}
                                >
                                    {expanded ? "Show less" : "Show all"}
                                </span>
                            )}
                        </span>
                    </div>
                )}
            </div>
        ),
    }
}
