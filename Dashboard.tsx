import React, { useState, useEffect } from "react"
import { Override } from "framer"
import { useAuth } from "./AuthGuard"
import { 
    FaShip, 
    FaFileContract, 
    FaUsers, 
    FaBuilding,
    FaChartLine,
    FaExclamationTriangle,
    FaCheckCircle,
    FaClock
} from "react-icons/fa"

// API Helper
const API_BASE_URL = "https://dev.api.hienfeld.io"

interface DashboardStats {
    totalBoats: number
    pendingBoats: number
    insuredBoats: number
    totalPolicies: number
    totalUsers: number
    totalOrganizations: number
}

// Quick Stats Card
function QuickStatsCard({ 
    icon: Icon, 
    title, 
    value, 
    color, 
    href 
}: { 
    icon: any, 
    title: string, 
    value: number, 
    color: string, 
    href?: string 
}) {
    const cardStyle = {
        backgroundColor: "white",
        borderRadius: "12px",
        padding: "20px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        border: "1px solid #e2e8f0",
        transition: "all 0.2s ease",
        cursor: href ? "pointer" : "default",
        textDecoration: "none",
        color: "inherit"
    }

    const handleClick = () => {
        if (href) {
            window.location.href = href
        }
    }

    return (
        <div 
            style={cardStyle}
            onClick={handleClick}
            onMouseEnter={(e) => {
                if (href) {
                    e.currentTarget.style.transform = "translateY(-2px)"
                    e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)"
                }
            }}
            onMouseLeave={(e) => {
                if (href) {
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)"
                }
            }}
        >
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "16px"
            }}>
                <div style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    backgroundColor: `${color}20`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: color
                }}>
                    <Icon size={24} />
                </div>
                <div>
                    <div style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        marginBottom: "4px"
                    }}>
                        {title}
                    </div>
                    <div style={{
                        fontSize: "28px",
                        fontWeight: "700",
                        color: "#1f2937"
                    }}>
                        {value}
                    </div>
                </div>
            </div>
        </div>
    )
}

// Recent Activity Item
function RecentActivityItem({ 
    icon: Icon, 
    title, 
    description, 
    time, 
    color 
}: { 
    icon: any, 
    title: string, 
    description: string, 
    time: string, 
    color: string 
}) {
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "12px 0",
            borderBottom: "1px solid #f3f4f6"
        }}>
            <div style={{
                width: "32px",
                height: "32px",
                borderRadius: "8px",
                backgroundColor: `${color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: color
            }}>
                <Icon size={16} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{
                    fontSize: "14px",
                    fontWeight: "500",
                    color: "#1f2937"
                }}>
                    {title}
                </div>
                <div style={{
                    fontSize: "12px",
                    color: "#6b7280"
                }}>
                    {description}
                </div>
            </div>
            <div style={{
                fontSize: "12px",
                color: "#9ca3af"
            }}>
                {time}
            </div>
        </div>
    )
}

// Main Dashboard Component
export function dashboard(): Override {
    const { user } = useAuth()
    const [stats, setStats] = useState<DashboardStats>({
        totalBoats: 0,
        pendingBoats: 0,
        insuredBoats: 0,
        totalPolicies: 0,
        totalUsers: 0,
        totalOrganizations: 0
    })
    const [loading, setLoading] = useState(true)

    // Fetch dashboard data
    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                const token = sessionStorage.getItem("idToken")
                if (!token) return

                const headers = {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }

                // Fetch boats data
                const boatsResponse = await fetch(`${API_BASE_URL}/neptunus/boat`, {
                    headers,
                    mode: "cors"
                })
                
                if (boatsResponse.ok) {
                    const boatsData = await boatsResponse.json()
                    const boats = boatsData.boats || []
                    
                    setStats(prev => ({
                        ...prev,
                        totalBoats: boats.length,
                        pendingBoats: boats.filter((boat: any) => boat.status === "Pending").length,
                        insuredBoats: boats.filter((boat: any) => boat.status === "Insured").length
                    }))
                }

                // Fetch other data only for admins
                if (user?.role === "admin") {
                    // Fetch organizations if admin
                    const orgsResponse = await fetch(`${API_BASE_URL}/neptunus/organization`, {
                        headers,
                        mode: "cors"
                    })
                    
                    if (orgsResponse.ok) {
                        const orgsData = await orgsResponse.json()
                        setStats(prev => ({
                            ...prev,
                            totalOrganizations: orgsData.organizations?.length || 0
                        }))
                    }
                }

            } catch (error) {
                console.error("Failed to fetch dashboard data:", error)
            } finally {
                setLoading(false)
            }
        }

        if (user) {
            fetchDashboardData()
        }
    }, [user])

    if (!user) return { visible: false }

    return {
        children: () => (
            <div style={{
                maxWidth: "1200px",
                margin: "0 auto"
            }}>
                {/* Welcome Section */}
                <div style={{
                    backgroundColor: "white",
                    borderRadius: "12px",
                    padding: "24px",
                    marginBottom: "24px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    border: "1px solid #e2e8f0"
                }}>
                    <h2 style={{
                        margin: "0 0 8px 0",
                        fontSize: "24px",
                        fontWeight: "700",
                        color: "#1f2937"
                    }}>
                        Welcome back, {user.email}!
                    </h2>
                    <p style={{
                        margin: 0,
                        fontSize: "16px",
                        color: "#6b7280"
                    }}>
                        Here's an overview of your {user.role === "admin" ? "system" : "organization"}.
                    </p>
                </div>

                {/* Quick Stats */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: "20px",
                    marginBottom: "24px"
                }}>
                    <QuickStatsCard
                        icon={FaShip}
                        title="Total Boats"
                        value={stats.totalBoats}
                        color="#3b82f6"
                        href="/boats"
                    />
                    <QuickStatsCard
                        icon={FaClock}
                        title="Pending Boats"
                        value={stats.pendingBoats}
                        color="#f59e0b"
                        href="/boats"
                    />
                    <QuickStatsCard
                        icon={FaCheckCircle}
                        title="Insured Boats"
                        value={stats.insuredBoats}
                        color="#10b981"
                        href="/boats"
                    />
                    {user.role === "admin" && (
                        <QuickStatsCard
                            icon={FaBuilding}
                            title="Organizations"
                            value={stats.totalOrganizations}
                            color="#8b5cf6"
                            href="/organizations"
                        />
                    )}
                </div>

                {/* Quick Actions */}
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                    gap: "20px"
                }}>
                    {/* Quick Actions Card */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        border: "1px solid #e2e8f0"
                    }}>
                        <h3 style={{
                            margin: "0 0 16px 0",
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#1f2937"
                        }}>
                            Quick Actions
                        </h3>
                        <div style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px"
                        }}>
                            <a
                                href="/boats/create"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "12px 16px",
                                    backgroundColor: "#f8fafc",
                                    borderRadius: "8px",
                                    textDecoration: "none",
                                    color: "#374151",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#e2e8f0"
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f8fafc"
                                }}
                            >
                                <FaShip size={16} />
                                <span>Add New Boat</span>
                            </a>
                            <a
                                href="/policies"
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "12px",
                                    padding: "12px 16px",
                                    backgroundColor: "#f8fafc",
                                    borderRadius: "8px",
                                    textDecoration: "none",
                                    color: "#374151",
                                    transition: "all 0.2s ease"
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = "#e2e8f0"
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = "#f8fafc"
                                }}
                            >
                                <FaFileContract size={16} />
                                <span>View Policies</span>
                            </a>
                            {user.role === "admin" && (
                                <a
                                    href="/users"
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        padding: "12px 16px",
                                        backgroundColor: "#f8fafc",
                                        borderRadius: "8px",
                                        textDecoration: "none",
                                        color: "#374151",
                                        transition: "all 0.2s ease"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#e2e8f0"
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f8fafc"
                                    }}
                                >
                                    <FaUsers size={16} />
                                    <span>Manage Users</span>
                                </a>
                            )}
                        </div>
                    </div>

                    {/* Recent Activity */}
                    <div style={{
                        backgroundColor: "white",
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                        border: "1px solid #e2e8f0"
                    }}>
                        <h3 style={{
                            margin: "0 0 16px 0",
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#1f2937"
                        }}>
                            Recent Activity
                        </h3>
                        <div>
                            <RecentActivityItem
                                icon={FaShip}
                                title="New boat added"
                                description="Boat #12345 was registered"
                                time="2 hours ago"
                                color="#3b82f6"
                            />
                            <RecentActivityItem
                                icon={FaCheckCircle}
                                title="Policy approved"
                                description="Insurance policy activated"
                                time="4 hours ago"
                                color="#10b981"
                            />
                            <RecentActivityItem
                                icon={FaExclamationTriangle}
                                title="Pending review"
                                description="2 boats need approval"
                                time="1 day ago"
                                color="#f59e0b"
                            />
                        </div>
                    </div>
                </div>
            </div>
        )
    }
}