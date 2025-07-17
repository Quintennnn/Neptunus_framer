import React from "react"
import { Override } from "framer"
import { useAuth } from "./AuthGuard"
import { 
    FaHome, 
    FaUsers, 
    FaBuilding, 
    FaFileContract, 
    FaShip, 
    FaClipboardList,
    FaSignOutAlt,
    FaUser
} from "react-icons/fa"

// Navigation Items Configuration
const getNavigationItems = (role: string) => {
    const items = []

    // Dashboard - available to all
    items.push({
        icon: FaHome,
        label: "Dashboard",
        href: "/dashboard",
        roles: ["admin", "user", "editor"]
    })

    // Boats - available to all
    items.push({
        icon: FaShip,
        label: "Boats",
        href: "/boats",
        roles: ["admin", "user", "editor"]
    })

    // Policies - available to all
    items.push({
        icon: FaFileContract,
        label: "Policies",
        href: "/policies",
        roles: ["admin", "user", "editor"]
    })

    // Organizations - admin and editor only
    if (role === "admin" || role === "editor") {
        items.push({
            icon: FaBuilding,
            label: "Organizations",
            href: "/organizations",
            roles: ["admin", "editor"]
        })
    }

    // Users - admin only
    if (role === "admin") {
        items.push({
            icon: FaUsers,
            label: "Users",
            href: "/users",
            roles: ["admin"]
        })
    }

    // Changelog - admin only
    if (role === "admin") {
        items.push({
            icon: FaClipboardList,
            label: "Changelog",
            href: "/changelog",
            roles: ["admin"]
        })
    }

    return items.filter(item => item.roles.includes(role))
}

// User Info Display
export function userInfoDisplay(): Override {
    const { user } = useAuth()

    if (!user) return { visible: false }

    return {
        children: () => (
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                backgroundColor: "#f8fafc",
                borderRadius: "8px",
                border: "1px solid #e2e8f0"
            }}>
                <div style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "16px",
                    fontWeight: "bold"
                }}>
                    <FaUser />
                </div>
                <div>
                    <div style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#1f2937"
                    }}>
                        {user.email}
                    </div>
                    <div style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        textTransform: "capitalize"
                    }}>
                        {user.role}
                        {user.organization && ` • ${user.organization}`}
                    </div>
                </div>
            </div>
        )
    }
}

// Navigation Menu
export function mainNavigation(): Override {
    const { user } = useAuth()

    if (!user) return { visible: false }

    const navigationItems = getNavigationItems(user.role)

    return {
        children: () => (
            <nav style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "16px",
                backgroundColor: "#ffffff",
                borderRight: "1px solid #e2e8f0",
                height: "100vh",
                minWidth: "250px"
            }}>
                {/* Logo/Title */}
                <div style={{
                    padding: "16px 0",
                    borderBottom: "1px solid #e2e8f0",
                    marginBottom: "16px"
                }}>
                    <h2 style={{
                        margin: 0,
                        fontSize: "20px",
                        fontWeight: "bold",
                        color: "#1f2937"
                    }}>
                        Hienfeld HAV
                    </h2>
                    <p style={{
                        margin: "4px 0 0 0",
                        fontSize: "14px",
                        color: "#6b7280"
                    }}>
                        Insurance Management
                    </p>
                </div>

                {/* Navigation Items */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "4px",
                    flex: 1
                }}>
                    {navigationItems.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "12px 16px",
                                borderRadius: "8px",
                                textDecoration: "none",
                                color: "#4b5563",
                                fontSize: "14px",
                                fontWeight: "500",
                                transition: "all 0.2s ease",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = "#f3f4f6"
                                e.currentTarget.style.color = "#1f2937"
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = "transparent"
                                e.currentTarget.style.color = "#4b5563"
                            }}
                        >
                            <item.icon size={16} />
                            {item.label}
                        </a>
                    ))}
                </div>

                {/* User Info at Bottom */}
                <div style={{
                    marginTop: "auto",
                    paddingTop: "16px",
                    borderTop: "1px solid #e2e8f0"
                }}>
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        padding: "12px 16px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "8px",
                        marginBottom: "8px"
                    }}>
                        <div style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            backgroundColor: "#3b82f6",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "14px"
                        }}>
                            <FaUser />
                        </div>
                        <div>
                            <div style={{
                                fontSize: "12px",
                                fontWeight: "600",
                                color: "#1f2937"
                            }}>
                                {user.email}
                            </div>
                            <div style={{
                                fontSize: "10px",
                                color: "#6b7280",
                                textTransform: "capitalize"
                            }}>
                                {user.role}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
        )
    }
}

// Logout Button
export function logoutButton(): Override {
    const { logout } = useAuth()

    return {
        children: () => (
            <button
                onClick={logout}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px 16px",
                    backgroundColor: "#dc2626",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "14px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    width: "100%"
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#b91c1c"
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#dc2626"
                }}
            >
                <FaSignOutAlt size={14} />
                Logout
            </button>
        )
    }
}

// Page Title Component
export function pageTitle(title: string): Override {
    return {
        children: () => (
            <div style={{
                padding: "24px 0 16px 0",
                borderBottom: "1px solid #e2e8f0",
                marginBottom: "24px"
            }}>
                <h1 style={{
                    margin: 0,
                    fontSize: "28px",
                    fontWeight: "700",
                    color: "#1f2937"
                }}>
                    {title}
                </h1>
            </div>
        )
    }
}

// Main Layout Wrapper
export function mainLayout(): Override {
    return {
        children: (children) => (
            <div style={{
                display: "flex",
                height: "100vh",
                backgroundColor: "#f9fafb"
            }}>
                {/* Navigation Sidebar */}
                <div style={{
                    flexShrink: 0
                }}>
                    {/* Navigation will be rendered here */}
                </div>

                {/* Main Content Area */}
                <div style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden"
                }}>
                    {/* Content Header */}
                    <header style={{
                        padding: "16px 24px",
                        backgroundColor: "white",
                        borderBottom: "1px solid #e2e8f0",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                    }}>
                        <div style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#1f2937"
                        }}>
                            Dashboard
                        </div>
                        <div>
                            {/* User info and logout button will go here */}
                        </div>
                    </header>

                    {/* Main Content */}
                    <main style={{
                        flex: 1,
                        padding: "24px",
                        overflow: "auto"
                    }}>
                        {children}
                    </main>
                </div>
            </div>
        )
    }
}