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
    name?: string
    phone?: string
}

// Broker info for fleet viewing
interface BrokerInfo {
    name: string
    email: string
    phone: string
    company?: string
}

// Role configurations
const ROLE_CONFIG = {
    admin: {
        icon: FaUserShield,
        color: "#dc2626",
        label: "Beheerder",
        description: "Volledige systeem toegang"
    },
    editor: {
        icon: FaUserEdit,
        color: "#0891b2",
        label: "Makelaar/Editor", 
        description: "Helpt gebruikers met polissen"
    },
    user: {
        icon: FaUser,
        color: "#059669",
        label: "Organisatie Eigenaar",
        description: "Beheer vloot en polissen"
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

// Fetch broker info from policies for the organization
async function fetchBrokerInfoForOrganization(organizationName: string): Promise<BrokerInfo | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        // Fetch policies for this organization
        const res = await fetch(`${API_BASE_URL}${API_PATHS.POLICY}?organization=${encodeURIComponent(organizationName)}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) {
            console.warn(`Failed to fetch policies for broker info: ${res.status} ${res.statusText}`)
            return null
        }
        
        const responseData = await res.json()
        const policies = responseData.policies || []

        if (policies.length === 0) {
            return null
        }

        // Get broker info from the first policy (assuming same broker for organization)
        const firstPolicy = policies[0]
        if (firstPolicy.makelaarsnaam && (firstPolicy.makelaarsemail || firstPolicy.makelaarstelefoon)) {
            return {
                name: firstPolicy.makelaarsnaam || "Onbekende Makelaar",
                email: firstPolicy.makelaarsemail || "",
                phone: firstPolicy.makelaarstelefoon || "",
                company: "Verzekeringsmakelaar"
            }
        }

        return null
    } catch (error) {
        console.error("Failed to fetch broker info:", error)
        return null
    }
}

interface UserInfoBannerProps {
    currentOrganization?: string
    showCurrentOrg?: boolean
    brokerInfo?: BrokerInfo
}

export function UserInfoBanner({ currentOrganization, showCurrentOrg = false, brokerInfo }: UserInfoBannerProps) {
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [showUserDetails, setShowUserDetails] = useState(false)
    const [localBrokerInfo, setLocalBrokerInfo] = useState<BrokerInfo | null>(null)

    // Use provided brokerInfo or fetch it based on user's organization
    const effectiveBrokerInfo = brokerInfo || localBrokerInfo

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
                        
                        // Auto-fetch broker info if not provided and user has organization
                        if (!brokerInfo && detailedUserInfo.role === "user") {
                            // Try to get organization from detailedUserInfo.organization or first in organizations array
                            const targetOrg = detailedUserInfo.organization || 
                                              (detailedUserInfo.organizations && detailedUserInfo.organizations.length > 0 ? detailedUserInfo.organizations[0] : null)
                            
                            console.log("Auto-fetching broker info for user:", detailedUserInfo.role, "org:", targetOrg)
                            
                            if (targetOrg) {
                                try {
                                    const fetchedBrokerInfo = await fetchBrokerInfoForOrganization(targetOrg)
                                    console.log("Fetched broker info:", fetchedBrokerInfo)
                                    setLocalBrokerInfo(fetchedBrokerInfo)
                                } catch (error) {
                                    console.warn("Could not fetch broker info:", error)
                                }
                            } else {
                                console.log("No organization found for broker info fetch")
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error loading user info:", error)
            } finally {
                setIsLoading(false)
            }
        }
        
        loadUserInfo()
    }, [brokerInfo])

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showUserDetails) {
                const target = event.target as Element
                if (!target.closest("[data-user-details]")) {
                    setShowUserDetails(false)
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [showUserDetails])

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
                Gebruikersinfo laden...
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
                Gebruikersinfo niet beschikbaar
            </div>
        )
    }

    const roleConfig = ROLE_CONFIG[userInfo.role]
    const RoleIcon = roleConfig.icon

    return (
        <div style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            fontFamily: FONT_STACK,
        }}>
            {/* Main User Info Bar */}
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "12px 20px",
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray300}`,
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
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
                                    Bekijk Vloot Voor:
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
                    
                    <div style={{ flex: 1 }}>
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
                            marginBottom: userInfo?.role === "user" && effectiveBrokerInfo ? "4px" : "0px",
                        }}>
                            {roleConfig.label} • {roleConfig.description}
                        </div>
                        
                        {/* Broker Contact Info - Only for users */}
                        {userInfo?.role === "user" && effectiveBrokerInfo && (
                            <div style={{
                                fontSize: "11px",
                                color: "#0369a1",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                flexWrap: "wrap",
                            }}>
                                <span style={{ fontWeight: "500" }}>
                                    📞 Uw makelaar: {effectiveBrokerInfo.name}
                                </span>
                                {effectiveBrokerInfo.email && (
                                    <a 
                                        href={`mailto:${effectiveBrokerInfo.email}`}
                                        style={{
                                            color: "#0284c7",
                                            textDecoration: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "2px",
                                        }}
                                    >
                                        📧 {effectiveBrokerInfo.email}
                                    </a>
                                )}
                                {effectiveBrokerInfo.phone && (
                                    <a 
                                        href={`tel:${effectiveBrokerInfo.phone}`}
                                        style={{
                                            color: "#0284c7",
                                            textDecoration: "none",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "2px",
                                        }}
                                    >
                                        📞 {effectiveBrokerInfo.phone}
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* User Details Toggle */}
                <div style={{ position: "relative" }} data-user-details>
                    <button
                        onClick={() => setShowUserDetails(!showUserDetails)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                            padding: "8px 12px",
                            backgroundColor: showUserDetails ? colors.gray100 : "transparent",
                            border: "1px solid",
                            borderColor: showUserDetails ? colors.gray300 : "transparent",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "12px",
                            color: colors.gray700,
                            transition: "all 0.2s ease",
                        }}
                        onMouseEnter={(e) => {
                            if (!showUserDetails) {
                                (e.target as HTMLButtonElement).style.backgroundColor = colors.gray50
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (!showUserDetails) {
                                (e.target as HTMLButtonElement).style.backgroundColor = "transparent"
                            }
                        }}
                    >
                        <FaChevronDown 
                            size={12} 
                            style={{ 
                                transform: showUserDetails ? "rotate(180deg)" : "rotate(0deg)",
                                transition: "transform 0.2s ease"
                            }} 
                        />
                    </button>

                    {showUserDetails && (
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
                            minWidth: "200px",
                            overflow: "hidden",
                        }}>
                            {/* User Details Section */}
                            <div style={{
                                padding: "12px 16px",
                                backgroundColor: colors.gray50,
                            }}>
                                <div style={{
                                    fontSize: "12px",
                                    color: colors.gray600,
                                    marginBottom: "4px",
                                }}>
                                    Gebruiker ID: {userInfo.sub?.slice(-8) || "Onbekend"}
                                </div>
                                {userInfo.organization && (
                                    <div style={{
                                        fontSize: "12px",
                                        color: colors.gray600,
                                    }}>
                                        Primaire Org: {userInfo.organization}
                                    </div>
                                )}
                                {userInfo.phone && (
                                    <div style={{
                                        fontSize: "12px",
                                        color: colors.gray600,
                                    }}>
                                        Telefoon: {userInfo.phone}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Direct Sign Out Button */}
                <button
                    onClick={handleLogout}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 16px",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = "#fecaca"
                    }}
                    onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = "#fee2e2"
                    }}
                >
                    <FaSignOutAlt size={14} />
                    Uitloggen
                </button>
            </div>

        </div>
    )
}