// src/components/UserInfoBanner.tsx
import * as React from "react"
import { useState, useEffect } from "react"
import { 
    FaUserShield, 
    FaUserEdit, 
    FaUser, 
    FaBuilding, 
    FaSignOutAlt,
    FaChevronDown 
} from "react-icons/fa"
import { colors, FONT_STACK } from "../theme"
import { API_BASE_URL, API_PATHS, getIdToken } from "../utils"

// User role types
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    email?: string
    organization?: string
    organizations?: string[]
}

// Role configurations
const ROLE_CONFIG = {
    admin: {
        icon: FaUserShield,
        color: "#dc2626",
        label: "Administrator",
        description: "Full system access"
    },
    editor: {
        icon: FaUserEdit,
        color: "#0891b2",
        label: "Broker/Editor", 
        description: "Help users with policies"
    },
    user: {
        icon: FaUser,
        color: "#059669",
        label: "Organization Owner",
        description: "Manage fleet and policies"
    }
}

// Fetch user info from backend
async function fetchUserInfo(cognitoSub: string): Promise<UserInfo | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(`${API_BASE_URL}${API_PATHS.USER}/${cognitoSub}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const responseData = await res.json()

        const userData = responseData.user || responseData

        return {
            sub: cognitoSub,
            role: userData.role || "user",
            email: userData.email,
            organization: userData.organization,
            organizations: userData.organizations || [],
        }
    } catch (error) {
        console.error("Failed to fetch user info:", error)
        return null
    }
}

// Get current user info from token
function getCurrentUserInfo(): UserInfo | null {
    try {
        const token = getIdToken()
        if (!token) return null

        const payload = JSON.parse(atob(token.split(".")[1]))

        return {
            sub: payload.sub,
            role: "user", // Will be updated by fetchUserInfo
            email: payload.email,
            organization: undefined,
            organizations: [],
        }
    } catch (error) {
        console.error("Failed to decode token:", error)
        return null
    }
}

// Logout function
const handleLogout = () => {
    // Clear session storage
    sessionStorage.removeItem("idToken")
    sessionStorage.removeItem("accessToken")
    sessionStorage.removeItem("refreshToken")
    sessionStorage.removeItem("userId")
    
    // Redirect to login page
    window.location.href = "https://neptunus.framer.website/login_old"
}

interface UserInfoBannerProps {
    currentOrganization?: string
    showCurrentOrg?: boolean
}

export function UserInfoBanner({ currentOrganization, showCurrentOrg = false }: UserInfoBannerProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showDropdown, setShowDropdown] = useState(false)

    useEffect(() => {
        async function loadUserInfo() {
            setIsLoading(true)
            try {
                const basicUserInfo = getCurrentUserInfo()
                if (basicUserInfo) {
                    setUserInfo(basicUserInfo)
                    
                    // Fetch detailed user info from backend
                    const detailedUserInfo = await fetchUserInfo(basicUserInfo.sub)
                    if (detailedUserInfo) {
                        setUserInfo(detailedUserInfo)
                    }
                }
            } catch (error) {
                console.error("Error loading user info:", error)
            } finally {
                setIsLoading(false)
            }
        }
        
        loadUserInfo()
    }, [])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showDropdown) {
                const target = event.target as Element
                if (!target.closest("[data-user-dropdown]")) {
                    setShowDropdown(false)
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [showDropdown])

    if (isLoading) {
        return (
            <div style={{
                padding: "12px 20px",
                backgroundColor: colors.gray100,
                borderRadius: "8px",
                fontFamily: FONT_STACK,
                fontSize: "14px",
                color: colors.gray600,
            }}>
                Loading user info...
            </div>
        )
    }

    if (!userInfo) {
        return (
            <div style={{
                padding: "12px 20px",
                backgroundColor: "#fee2e2",
                borderRadius: "8px",
                fontFamily: FONT_STACK,
                fontSize: "14px",
                color: "#dc2626",
            }}>
                User info not available
            </div>
        )
    }

    const roleConfig = ROLE_CONFIG[userInfo.role]
    const RoleIcon = roleConfig.icon

    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            padding: "12px 20px",
            backgroundColor: colors.white,
            border: `1px solid ${colors.gray300}`,
            borderRadius: "12px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            fontFamily: FONT_STACK,
        }}>
            {/* Current Organization Display */}
            {showCurrentOrg && currentOrganization && (
                <>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        backgroundColor: "#eff6ff",
                        borderRadius: "8px",
                        border: "1px solid #dbeafe",
                    }}>
                        <FaBuilding size={16} color="#3b82f6" />
                        <div>
                            <div style={{ 
                                fontSize: "12px", 
                                color: "#6b7280", 
                                fontWeight: "500" 
                            }}>
                                Viewing Fleet For:
                            </div>
                            <div style={{ 
                                fontSize: "14px", 
                                fontWeight: "600",
                                color: "#1f2937"
                            }}>
                                {currentOrganization}
                            </div>
                        </div>
                    </div>
                    <div style={{
                        width: "1px",
                        height: "32px",
                        backgroundColor: colors.gray300,
                    }} />
                </>
            )}

            {/* User Info */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                flex: 1,
            }}>
                <RoleIcon size={20} color={roleConfig.color} />
                
                <div>
                    <div style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: colors.gray900,
                        marginBottom: "2px",
                    }}>
                        {userInfo.email || "Unknown User"}
                    </div>
                    <div style={{
                        fontSize: "12px",
                        color: colors.gray600,
                    }}>
                        {roleConfig.label} • {roleConfig.description}
                    </div>
                </div>
            </div>

            {/* User Dropdown Menu */}
            <div style={{ position: "relative" }} data-user-dropdown>
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        padding: "8px 12px",
                        backgroundColor: showDropdown ? colors.gray100 : "transparent",
                        border: "1px solid",
                        borderColor: showDropdown ? colors.gray300 : "transparent",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                        fontSize: "12px",
                        color: colors.gray700,
                        transition: "all 0.2s ease",
                    }}
                    onMouseOver={(e) => {
                        if (!showDropdown) {
                            e.target.style.backgroundColor = colors.gray50
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!showDropdown) {
                            e.target.style.backgroundColor = "transparent"
                        }
                    }}
                >
                    <FaChevronDown size={12} />
                </button>

                {showDropdown && (
                    <div style={{
                        position: "absolute",
                        top: "100%",
                        right: 0,
                        marginTop: "4px",
                        backgroundColor: colors.white,
                        border: `1px solid ${colors.gray300}`,
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.15)",
                        zIndex: 1000,
                        minWidth: "180px",
                        fontFamily: FONT_STACK,
                        overflow: "hidden",
                    }}>
                        {/* User Details Section */}
                        <div style={{
                            padding: "12px 16px",
                            borderBottom: `1px solid ${colors.gray200}`,
                            backgroundColor: colors.gray50,
                        }}>
                            <div style={{
                                fontSize: "12px",
                                color: colors.gray600,
                                marginBottom: "4px",
                            }}>
                                User ID: {userInfo.sub?.slice(-8) || "Unknown"}
                            </div>
                            {userInfo.organization && (
                                <div style={{
                                    fontSize: "12px",
                                    color: colors.gray600,
                                }}>
                                    Primary Org: {userInfo.organization}
                                </div>
                            )}
                        </div>

                        {/* Logout Button */}
                        <button
                            onClick={() => {
                                setShowDropdown(false)
                                handleLogout()
                            }}
                            style={{
                                width: "100%",
                                padding: "12px 16px",
                                border: "none",
                                backgroundColor: "transparent",
                                color: "#dc2626",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                fontFamily: FONT_STACK,
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                textAlign: "left",
                                transition: "background-color 0.2s ease",
                            }}
                            onMouseOver={(e) => {
                                e.target.style.backgroundColor = "#fee2e2"
                            }}
                            onMouseOut={(e) => {
                                e.target.style.backgroundColor = "transparent"
                            }}
                        >
                            <FaSignOutAlt size={14} />
                            Sign Out
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}