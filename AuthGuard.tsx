import React, { useEffect, useState, createContext, useContext } from "react"
import { Override } from "framer"

// Types
interface UserInfo {
    sub: string
    email: string
    role: 'admin' | 'user' | 'editor'
    organization?: string
    organizations?: string[]
}

interface AuthContextType {
    user: UserInfo | null
    isAuthenticated: boolean
    isLoading: boolean
    login: (tokens: { idToken: string; accessToken: string; refreshToken: string }) => void
    logout: () => void
    checkAuth: () => Promise<boolean>
}

// JWT Helper
function decodeJWT(token: string): any {
    try {
        const base64Url = token.split(".")[1]
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
                .join("")
        )
        return JSON.parse(jsonPayload)
    } catch (error) {
        console.error("Error decoding JWT:", error)
        return null
    }
}

// API Helper
const API_BASE_URL = "https://dev.api.hienfeld.io"

async function fetchUserInfo(cognitoSub: string): Promise<UserInfo | null> {
    try {
        const token = sessionStorage.getItem("idToken")
        if (!token) return null

        const headers: Record<string, string> = {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        }

        const res = await fetch(`${API_BASE_URL}/neptunus/user/${cognitoSub}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const responseData = await res.json()
        
        const userData = responseData.user || responseData
        
        return {
            sub: cognitoSub,
            email: userData.email || "",
            role: userData.role || 'user',
            organization: userData.organization,
            organizations: userData.organizations || []
        }
    } catch (error) {
        console.error('Failed to fetch user info:', error)
        return null
    }
}

// Context
const AuthContext = createContext<AuthContextType>({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    login: () => {},
    logout: () => {},
    checkAuth: async () => false
})

export const useAuth = () => useContext(AuthContext)

// Auth Provider
export function authProvider(): Override {
    const [user, setUser] = useState<UserInfo | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    const checkAuth = async (): Promise<boolean> => {
        try {
            const idToken = sessionStorage.getItem("idToken")
            if (!idToken) {
                setIsLoading(false)
                return false
            }

            // Decode token to get user sub
            const decoded = decodeJWT(idToken)
            if (!decoded?.sub) {
                sessionStorage.clear()
                setIsLoading(false)
                return false
            }

            // Check token expiration
            const currentTime = Date.now() / 1000
            if (decoded.exp && decoded.exp < currentTime) {
                sessionStorage.clear()
                setIsLoading(false)
                return false
            }

            // Fetch user info from backend
            const userInfo = await fetchUserInfo(decoded.sub)
            if (userInfo) {
                setUser(userInfo)
                setIsLoading(false)
                return true
            } else {
                sessionStorage.clear()
                setIsLoading(false)
                return false
            }
        } catch (error) {
            console.error("Auth check failed:", error)
            sessionStorage.clear()
            setIsLoading(false)
            return false
        }
    }

    const login = (tokens: { idToken: string; accessToken: string; refreshToken: string }) => {
        sessionStorage.setItem("idToken", tokens.idToken)
        sessionStorage.setItem("accessToken", tokens.accessToken)
        sessionStorage.setItem("refreshToken", tokens.refreshToken)
        
        // Decode and set user immediately
        const decoded = decodeJWT(tokens.idToken)
        if (decoded?.sub) {
            sessionStorage.setItem("userId", decoded.sub)
            // Fetch full user info
            fetchUserInfo(decoded.sub).then(userInfo => {
                if (userInfo) {
                    setUser(userInfo)
                }
            })
        }
    }

    const logout = () => {
        sessionStorage.clear()
        setUser(null)
        // Redirect to login page
        window.location.href = "/login"
    }

    // Check auth on mount
    useEffect(() => {
        checkAuth()
    }, [])

    return {
        children: (children) => (
            <AuthContext.Provider
                value={{
                    user,
                    isAuthenticated: !!user,
                    isLoading,
                    login,
                    logout,
                    checkAuth
                }}
            >
                {children}
            </AuthContext.Provider>
        ),
    }
}

// Protected Route Component
export function protectedRoute(allowedRoles?: string[]): Override {
    const { user, isAuthenticated, isLoading } = useAuth()

    if (isLoading) {
        return {
            children: () => (
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    fontSize: "18px",
                    color: "#666"
                }}>
                    Loading...
                </div>
            )
        }
    }

    if (!isAuthenticated) {
        // Redirect to login
        if (typeof window !== "undefined") {
            window.location.href = "/login"
        }
        return {
            children: () => (
                <div style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100vh",
                    fontSize: "18px",
                    color: "#666"
                }}>
                    Redirecting to login...
                </div>
            )
        }
    }

    // Check role-based access
    if (allowedRoles && allowedRoles.length > 0) {
        if (!user?.role || !allowedRoles.includes(user.role)) {
            return {
                children: () => (
                    <div style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "100vh",
                        fontSize: "18px",
                        color: "#dc2626"
                    }}>
                        <h2>Access Denied</h2>
                        <p>You don't have permission to access this page.</p>
                        <p>Required roles: {allowedRoles.join(", ")}</p>
                        <p>Your role: {user?.role}</p>
                    </div>
                )
            }
        }
    }

    // If authenticated and authorized, render children normally
    return {}
}