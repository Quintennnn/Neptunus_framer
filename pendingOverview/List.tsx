// src/PendingBoatsOverview.tsx (Admin-only pending boats overview system)
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override, Frame } from "framer"
import { useState, useEffect, useCallback } from "react"
import {
    FaEdit,
    FaTrashAlt,
    FaSearch,
    FaFilter,
    FaCheck,
    FaTimes,
    FaBuilding,
    FaShip,
    FaTruck,
    FaCog,
    FaBox,
    FaUserShield,
    FaUser,
    FaUserEdit,
    FaChevronDown,
    FaArrowLeft,
    FaPlus,
    FaClock,
    FaFileContract,
    FaUsers,
    FaClipboardList,
    FaEye,
    FaChevronUp,
    FaSortAmountDown,
    FaSortAmountUp,
    FaExclamationTriangle,
    FaCheckCircle
} from "react-icons/fa"
import { UserInfoBanner } from "../components/UserInfoBanner"
import { colors, styles, hover, FONT_STACK } from "../theme"
import { API_BASE_URL, API_PATHS, getIdToken } from "../utils"

// ——— Enhanced font stack for better typography ———
const ENHANCED_FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

// ——— Type Definitions ———
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    organization?: string
    organizations?: string[]
}

type ObjectType = "boat" | "trailer" | "motor"

interface PendingInsuredObject {
    id: string
    objectType: ObjectType
    status: "Pending"
    waarde: number // value
    organization: string
    ingangsdatum: string // insuranceStartDate
    uitgangsdatum?: string // insuranceEndDate
    premiepromillage: number // premiumPerMille
    eigenRisico: number // deductible
    notitie?: string // notes
    createdAt: string
    updatedAt: string
    lastUpdatedBy?: string
    
    // Dynamic fields based on object type
    [key: string]: any
}

interface PendingStats {
    total: number
    boats: number
    trailers: number
    motors: number
    organizationCount: number
    oldestPending: string | null
    totalValue: number
}

// ——— User Role Detection Functions ———
function getIdTokenFromStorage(): string | null {
    return sessionStorage.getItem("idToken")
}

function getCurrentUserInfo(): UserInfo | null {
    try {
        const token = getIdTokenFromStorage()
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

async function fetchUserInfo(cognitoSub: string): Promise<UserInfo | null> {
    try {
        const token = getIdTokenFromStorage()
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

        console.log("fetchUserInfo - raw user data from API:", responseData)

        // Handle nested response structure
        const userData = responseData.user || responseData

        const processedUserInfo = {
            sub: cognitoSub,
            role: userData.role || "user", // Default to user if role not found
            organization: userData.organization,
            organizations: userData.organizations || [],
        }

        console.log("fetchUserInfo - processed user info:", processedUserInfo)

        return processedUserInfo
    } catch (error) {
        console.error("Failed to fetch user info:", error)
        return null
    }
}

// Check if user is admin
function isAdmin(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "admin"
}

// ——— API Functions ———
async function fetchAllPendingObjects(): Promise<PendingInsuredObject[]> {
    try {
        const token = getIdTokenFromStorage()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(`${API_BASE_URL}${API_PATHS.INSURED_OBJECT}?status=Pending`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) {
            throw new Error(`Failed to fetch pending objects: ${res.status} ${res.statusText}`)
        }

        const data = await res.json()
        console.log("Fetched pending objects:", data)
        
        // Check for different possible response structures
        const result = data.items || data.objects || data.insuredObjects || data || []
        console.log("Extracted result from API:", result, "isArray:", Array.isArray(result))
        
        // Ensure we return an array
        const finalResult = Array.isArray(result) ? result : []
        console.log("Final result to return from fetchAllPendingObjects:", finalResult, "length:", finalResult.length)
        return finalResult
    } catch (error) {
        console.error("Error fetching pending objects:", error)
        throw error
    }
}

async function approveObject(objectId: string): Promise<void> {
    try {
        const token = getIdTokenFromStorage()
        if (!token) throw new Error("No authentication token")

        const res = await fetch(`${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${objectId}/approve`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        })

        if (!res.ok) {
            throw new Error(`Failed to approve object: ${res.status} ${res.statusText}`)
        }
    } catch (error) {
        console.error("Error approving object:", error)
        throw error
    }
}

async function declineObject(objectId: string, reason: string): Promise<void> {
    try {
        const token = getIdTokenFromStorage()
        if (!token) throw new Error("No authentication token")

        const res = await fetch(`${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${objectId}/decline`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ reason }),
        })

        if (!res.ok) {
            throw new Error(`Failed to decline object: ${res.status} ${res.statusText}`)
        }
    } catch (error) {
        console.error("Error declining object:", error)
        throw error
    }
}

async function bulkApproveObjects(objectIds: string[]): Promise<void> {
    try {
        // Since we don't have a bulk endpoint, we'll do individual approvals in parallel
        const approvalPromises = objectIds.map(id => approveObject(id))
        await Promise.all(approvalPromises)
    } catch (error) {
        console.error("Error in bulk approve:", error)
        throw error
    }
}

// ——— Utility Functions ———
function calculatePendingStats(objects: PendingInsuredObject[]): PendingStats {
    // Safety check to ensure objects is an array
    const safeObjects = Array.isArray(objects) ? objects : []
    
    const stats = {
        total: safeObjects.length,
        boats: safeObjects.filter(obj => obj.objectType === "boat").length,
        trailers: safeObjects.filter(obj => obj.objectType === "trailer").length,
        motors: safeObjects.filter(obj => obj.objectType === "motor").length,
        organizationCount: new Set(safeObjects.map(obj => obj.organization)).size,
        oldestPending: null as string | null,
        totalValue: safeObjects.reduce((sum, obj) => sum + (obj.waarde || 0), 0)
    }

    // Find oldest pending item
    if (safeObjects.length > 0) {
        const oldestObject = safeObjects.reduce((oldest, current) => {
            const oldestDate = new Date(oldest.createdAt)
            const currentDate = new Date(current.createdAt)
            return currentDate < oldestDate ? current : oldest
        })
        stats.oldestPending = oldestObject.createdAt
    }

    return stats
}

function formatCurrency(value: number): string {
    return new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: "EUR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value)
}

function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString)
        return date.toLocaleDateString("nl-NL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
    } catch {
        return dateString
    }
}

function formatDateTime(dateString: string): string {
    try {
        const date = new Date(dateString)
        return date.toLocaleString("nl-NL", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
    } catch {
        return dateString
    }
}

function getDaysAgo(dateString: string): number {
    try {
        const date = new Date(dateString)
        const now = new Date()
        const diffTime = Math.abs(now.getTime() - date.getTime())
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return diffDays
    } catch {
        return 0
    }
}

function getObjectTypeIcon(objectType: ObjectType) {
    switch (objectType) {
        case "boat":
            return <FaShip style={{ color: "#3b82f6" }} />
        case "trailer":
            return <FaTruck style={{ color: "#10b981" }} />
        case "motor":
            return <FaCog style={{ color: "#f59e0b" }} />
        default:
            return <FaBox style={{ color: "#6b7280" }} />
    }
}

function getObjectTypeName(objectType: ObjectType): string {
    switch (objectType) {
        case "boat":
            return "Boot"
        case "trailer":
            return "Trailer"
        case "motor":
            return "Motor"
        default:
            return "Object"
    }
}

function getObjectDisplayName(object: PendingInsuredObject): string {
    switch (object.objectType) {
        case "boat":
            const boatName = object.merkBoot || object.typeBoot || ""
            const boatNumber = object.bootnummer || ""
            if (boatName && boatNumber) {
                return `${boatName} (${boatNumber})`
            } else if (boatName) {
                return boatName
            } else if (boatNumber) {
                return `Boot ${boatNumber}`
            }
            return "Boot"
        case "trailer":
            return object.trailerRegistratienummer 
                ? `Trailer (${object.trailerRegistratienummer})`
                : "Trailer"
        case "motor":
            const motorBrand = object.motorMerk || ""
            const motorNumber = object.motorSerienummer || ""
            if (motorBrand && motorNumber) {
                return `${motorBrand} (${motorNumber})`
            } else if (motorBrand) {
                return motorBrand
            } else if (motorNumber) {
                return `Motor ${motorNumber}`
            }
            return "Motor"
        default:
            return `${getObjectTypeName(object.objectType)} ${object.id.slice(-8)}`
    }
}

// ——— Component Definitions ———

// Statistics Cards Component
function PendingStatisticsCards({ stats }: { stats: PendingStats }) {
    const cards = [
        {
            title: "Totaal Pending",
            value: stats.total.toString(),
            icon: <FaClock style={{ color: "#f59e0b" }} />,
            bgColor: "#fef3c7",
            textColor: "#92400e"
        },
        {
            title: "Organisaties",
            value: stats.organizationCount.toString(),
            icon: <FaBuilding style={{ color: "#3b82f6" }} />,
            bgColor: "#dbeafe",
            textColor: "#1e40af"
        },
        {
            title: "Totale Waarde",
            value: formatCurrency(stats.totalValue),
            icon: <FaFileContract style={{ color: "#10b981" }} />,
            bgColor: "#dcfce7",
            textColor: "#166534"
        },
        {
            title: "Oudste Item",
            value: stats.oldestPending ? `${getDaysAgo(stats.oldestPending)} dagen` : "N/A",
            icon: <FaExclamationTriangle style={{ color: "#dc2626" }} />,
            bgColor: "#fee2e2",
            textColor: "#991b1b"
        }
    ]

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: "16px",
                marginBottom: "24px",
            }}
        >
            {cards.map((card, index) => (
                <div
                    key={index}
                    style={{
                        backgroundColor: colors.white,
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: "12px",
                        padding: "20px",
                        boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                        transition: "all 0.2s",
                        cursor: "default",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "12px",
                            marginBottom: "8px",
                        }}
                    >
                        <div
                            style={{
                                padding: "8px",
                                backgroundColor: card.bgColor,
                                borderRadius: "8px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {card.icon}
                        </div>
                        <div>
                            <div
                                style={{
                                    fontSize: "14px",
                                    color: colors.gray600,
                                    fontWeight: "500",
                                    fontFamily: ENHANCED_FONT_STACK,
                                }}
                            >
                                {card.title}
                            </div>
                            <div
                                style={{
                                    fontSize: "24px",
                                    color: card.textColor,
                                    fontWeight: "700",
                                    fontFamily: ENHANCED_FONT_STACK,
                                    lineHeight: "1.2",
                                }}
                            >
                                {card.value}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}

// Object Type Filter Component
function ObjectTypeBreakdown({ stats }: { stats: PendingStats }) {
    const typeBreakdown = [
        { type: "boat", count: stats.boats, label: "Boten", icon: FaShip, color: "#3b82f6" },
        { type: "trailer", count: stats.trailers, label: "Trailers", icon: FaTruck, color: "#10b981" },
        { type: "motor", count: stats.motors, label: "Motoren", icon: FaCog, color: "#f59e0b" }
    ]

    return (
        <div
            style={{
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray200}`,
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
        >
            <h3
                style={{
                    margin: "0 0 16px 0",
                    fontSize: "18px",
                    fontWeight: "600",
                    color: colors.gray800,
                    fontFamily: ENHANCED_FONT_STACK,
                }}
            >
                Verdeling per Type
            </h3>
            <div
                style={{
                    display: "flex",
                    gap: "16px",
                    flexWrap: "wrap",
                }}
            >
                {typeBreakdown.map((item) => {
                    const Icon = item.icon
                    return (
                        <div
                            key={item.type}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "12px 16px",
                                backgroundColor: colors.gray50,
                                borderRadius: "8px",
                                border: `1px solid ${colors.gray200}`,
                            }}
                        >
                            <Icon style={{ color: item.color, fontSize: "16px" }} />
                            <div>
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: colors.gray600,
                                        fontFamily: ENHANCED_FONT_STACK,
                                    }}
                                >
                                    {item.label}
                                </div>
                                <div
                                    style={{
                                        fontSize: "18px",
                                        fontWeight: "600",
                                        color: colors.gray800,
                                        fontFamily: ENHANCED_FONT_STACK,
                                    }}
                                >
                                    {item.count}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// Bulk Actions Component
function BulkActionsBar({ 
    selectedCount, 
    onBulkApprove, 
    onBulkDecline, 
    onClearSelection,
    isLoading 
}: { 
    selectedCount: number
    onBulkApprove: () => void
    onBulkDecline: () => void
    onClearSelection: () => void
    isLoading: boolean
}) {
    if (selectedCount === 0) return null

    return (
        <div
            style={{
                backgroundColor: "#eff6ff",
                border: "2px solid #3b82f6",
                borderRadius: "12px",
                padding: "16px 20px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)",
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                }}
            >
                <FaCheckCircle style={{ color: "#3b82f6", fontSize: "18px" }} />
                <span
                    style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#1e40af",
                        fontFamily: ENHANCED_FONT_STACK,
                    }}
                >
                    {selectedCount} item{selectedCount > 1 ? "s" : ""} geselecteerd
                </span>
            </div>
            
            <div
                style={{
                    display: "flex",
                    gap: "8px",
                    alignItems: "center",
                }}
            >
                <button
                    onClick={onBulkApprove}
                    disabled={isLoading}
                    style={{
                        ...styles.primaryButton,
                        backgroundColor: "#10b981",
                        padding: "8px 16px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: isLoading ? 0.6 : 1,
                        cursor: isLoading ? "not-allowed" : "pointer",
                    }}
                    onMouseOver={(e) => {
                        if (!isLoading) {
                            (e.target as HTMLElement).style.backgroundColor = "#059669"
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!isLoading) {
                            (e.target as HTMLElement).style.backgroundColor = "#10b981"
                        }
                    }}
                >
                    <FaCheck />
                    {isLoading ? "Bezig..." : "Goedkeuren"}
                </button>
                
                <button
                    onClick={onBulkDecline}
                    disabled={isLoading}
                    style={{
                        ...styles.secondaryButton,
                        backgroundColor: "#dc2626",
                        color: colors.white,
                        padding: "8px 16px",
                        fontSize: "14px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: isLoading ? 0.6 : 1,
                        cursor: isLoading ? "not-allowed" : "pointer",
                    }}
                    onMouseOver={(e) => {
                        if (!isLoading) {
                            (e.target as HTMLElement).style.backgroundColor = "#b91c1c"
                        }
                    }}
                    onMouseOut={(e) => {
                        if (!isLoading) {
                            (e.target as HTMLElement).style.backgroundColor = "#dc2626"
                        }
                    }}
                >
                    <FaTimes />
                    Afwijzen
                </button>
                
                <button
                    onClick={onClearSelection}
                    disabled={isLoading}
                    style={{
                        ...styles.secondaryButton,
                        padding: "8px 16px",
                        fontSize: "14px",
                        opacity: isLoading ? 0.6 : 1,
                        cursor: isLoading ? "not-allowed" : "pointer",
                    }}
                >
                    Deselecteren
                </button>
            </div>
        </div>
    )
}

// Individual Pending Object Row Component
function PendingObjectRow({ 
    object, 
    isSelected,
    onToggleSelect,
    onApprove, 
    onDecline,
    onViewDetails,
    isLoading 
}: { 
    object: PendingInsuredObject
    isSelected: boolean
    onToggleSelect: (objectId: string) => void
    onApprove: (object: PendingInsuredObject) => void
    onDecline: (object: PendingInsuredObject, reason: string) => void
    onViewDetails: (object: PendingInsuredObject) => void
    isLoading: boolean
}) {
    console.log("PendingObjectRow rendering with object:", object)
    
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const [declineReason, setDeclineReason] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)

    // Add error handling for utility function calls
    let daysAgo = 0
    let isUrgent = false
    let displayName = "Unknown Object"
    let objectTypeName = "Unknown"
    let objectTypeIcon = <FaBox style={{ color: "#6b7280" }} />
    
    try {
        daysAgo = getDaysAgo(object.createdAt)
        isUrgent = daysAgo > 7
        console.log("Days ago calculation successful:", daysAgo, "isUrgent:", isUrgent)
    } catch (error) {
        console.error("Error calculating days ago for object:", object, error)
        daysAgo = 0
        isUrgent = false
    }

    try {
        displayName = getObjectDisplayName(object)
        console.log("Display name calculation successful:", displayName)
    } catch (error) {
        console.error("Error calculating display name for object:", object, error)
        displayName = `Object ${object.id?.slice(-8) || 'Unknown'}`
    }

    try {
        objectTypeName = getObjectTypeName(object.objectType)
        console.log("Object type name calculation successful:", objectTypeName)
    } catch (error) {
        console.error("Error calculating object type name for object:", object, error)
        objectTypeName = "Unknown"
    }

    try {
        objectTypeIcon = getObjectTypeIcon(object.objectType)
        console.log("Object type icon calculation successful")
    } catch (error) {
        console.error("Error calculating object type icon for object:", object, error)
        objectTypeIcon = <FaBox style={{ color: "#6b7280" }} />
    }
    
    const handleApprove = async () => {
        setIsProcessing(true)
        try {
            await onApprove(object)
        } catch (error) {
            console.error("Failed to approve:", error)
        } finally {
            setIsProcessing(false)
        }
    }

    const handleDeclineSubmit = async () => {
        if (!declineReason.trim()) return
        
        setIsProcessing(true)
        try {
            await onDecline(object, declineReason.trim())
            setShowDeclineModal(false)
            setDeclineReason("")
        } catch (error) {
            console.error("Failed to decline:", error)
        } finally {
            setIsProcessing(false)
        }
    }

    try {
        console.log("PendingObjectRow about to render JSX for object:", object.id)
        
        return (
            <>
                <div
                    style={{
                        backgroundColor: isSelected ? "#f0f9ff" : colors.white,
                        border: isSelected ? "2px solid #3b82f6" : `1px solid ${colors.gray200}`,
                        borderRadius: "12px",
                        padding: "20px",
                        marginBottom: "12px",
                        boxShadow: isSelected 
                            ? "0 4px 16px rgba(59, 130, 246, 0.15)" 
                            : "0 2px 8px rgba(0,0,0,0.05)",
                        transition: "all 0.2s",
                        position: "relative",
                    }}
                >
                {/* Urgent indicator */}
                {isUrgent && (
                    <div
                        style={{
                            position: "absolute",
                            top: "-8px",
                            right: "16px",
                            backgroundColor: "#dc2626",
                            color: colors.white,
                            padding: "4px 8px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                            display: "flex",
                            alignItems: "center",
                            gap: "4px",
                        }}
                    >
                        <FaExclamationTriangle size={10} />
                        {daysAgo}+ dagen
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: "16px",
                    }}
                >
                    {/* Selection checkbox */}
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(object.id)}
                        disabled={isLoading || isProcessing}
                        style={{
                            marginTop: "2px",
                            transform: "scale(1.2)",
                            cursor: isLoading || isProcessing ? "not-allowed" : "pointer",
                        }}
                    />

                    {/* Object type icon */}
                    <div
                        style={{
                            padding: "8px",
                            backgroundColor: colors.gray50,
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginTop: "4px",
                        }}
                    >
                        {objectTypeIcon}
                    </div>

                    {/* Main content */}
                    <div style={{ flex: 1 }}>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: "12px",
                            }}
                        >
                            <div>
                                <h4
                                    style={{
                                        margin: "0 0 4px 0",
                                        fontSize: "18px",
                                        fontWeight: "600",
                                        color: colors.gray800,
                                        fontFamily: ENHANCED_FONT_STACK,
                                    }}
                                >
                                    {displayName}
                                </h4>
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "12px",
                                        fontSize: "14px",
                                        color: colors.gray600,
                                        fontFamily: ENHANCED_FONT_STACK,
                                    }}
                                >
                                    <span>{objectTypeName}</span>
                                    <span>•</span>
                                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                                        <FaBuilding size={12} />
                                        {object.organization}
                                    </span>
                                    <span>•</span>
                                    <span>{formatCurrency(object.waarde)}</span>
                                </div>
                            </div>

                            {/* Action buttons */}
                            <div
                                style={{
                                    display: "flex",
                                    gap: "8px",
                                    alignItems: "center",
                                }}
                            >
                                <button
                                    onClick={() => onViewDetails(object)}
                                    disabled={isLoading || isProcessing}
                                    style={{
                                        ...styles.iconButton,
                                        backgroundColor: colors.gray100,
                                        color: colors.gray600,
                                        padding: "8px",
                                        borderRadius: "6px",
                                        opacity: isLoading || isProcessing ? 0.6 : 1,
                                        cursor: isLoading || isProcessing ? "not-allowed" : "pointer",
                                    }}
                                    title="Bekijk details"
                                    onMouseOver={(e) => {
                                        if (!isLoading && !isProcessing) {
                                            (e.target as HTMLElement).style.backgroundColor = colors.gray200
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isLoading && !isProcessing) {
                                            (e.target as HTMLElement).style.backgroundColor = colors.gray100
                                        }
                                    }}
                                >
                                    <FaEye size={14} />
                                </button>

                                <button
                                    onClick={handleApprove}
                                    disabled={isLoading || isProcessing}
                                    style={{
                                        backgroundColor: "#10b981",
                                        color: colors.white,
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "8px 12px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: isLoading || isProcessing ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontFamily: ENHANCED_FONT_STACK,
                                        transition: "all 0.2s",
                                        opacity: isLoading || isProcessing ? 0.6 : 1,
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isLoading && !isProcessing) {
                                            (e.target as HTMLElement).style.backgroundColor = "#059669"
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isLoading && !isProcessing) {
                                            (e.target as HTMLElement).style.backgroundColor = "#10b981"
                                        }
                                    }}
                                >
                                    <FaCheck size={12} />
                                    {isProcessing ? "..." : "Goedkeuren"}
                                </button>

                                <button
                                    onClick={() => setShowDeclineModal(true)}
                                    disabled={isLoading || isProcessing}
                                    style={{
                                        backgroundColor: "#dc2626",
                                        color: colors.white,
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "8px 12px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: isLoading || isProcessing ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontFamily: ENHANCED_FONT_STACK,
                                        transition: "all 0.2s",
                                        opacity: isLoading || isProcessing ? 0.6 : 1,
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isLoading && !isProcessing) {
                                            (e.target as HTMLElement).style.backgroundColor = "#b91c1c"
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isLoading && !isProcessing) {
                                            (e.target as HTMLElement).style.backgroundColor = "#dc2626"
                                        }
                                    }}
                                >
                                    <FaTimes size={12} />
                                    Afwijzen
                                </button>
                            </div>
                        </div>

                        {/* Additional details */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                                gap: "16px",
                                padding: "16px",
                                backgroundColor: colors.gray50,
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontFamily: ENHANCED_FONT_STACK,
                            }}
                        >
                            <div>
                                <div style={{ color: colors.gray600, marginBottom: "4px" }}>
                                    Ingangsdatum
                                </div>
                                <div style={{ color: colors.gray800, fontWeight: "500" }}>
                                    {formatDate(object.ingangsdatum)}
                                </div>
                            </div>
                            <div>
                                <div style={{ color: colors.gray600, marginBottom: "4px" }}>
                                    Aangemaakt
                                </div>
                                <div style={{ color: colors.gray800, fontWeight: "500" }}>
                                    {formatDateTime(object.createdAt)}
                                    <span style={{ color: colors.gray500, marginLeft: "8px" }}>
                                        ({daysAgo} dag{daysAgo !== 1 ? "en" : ""} geleden)
                                    </span>
                                </div>
                            </div>
                            <div>
                                <div style={{ color: colors.gray600, marginBottom: "4px" }}>
                                    Premie Promillage
                                </div>
                                <div style={{ color: colors.gray800, fontWeight: "500" }}>
                                    {object.premiepromillage}‰
                                </div>
                            </div>
                            <div>
                                <div style={{ color: colors.gray600, marginBottom: "4px" }}>
                                    Eigen Risico
                                </div>
                                <div style={{ color: colors.gray800, fontWeight: "500" }}>
                                    {formatCurrency(object.eigenRisico)}
                                </div>
                            </div>
                        </div>

                        {/* Notes if available */}
                        {object.notitie && (
                            <div
                                style={{
                                    marginTop: "12px",
                                    padding: "12px",
                                    backgroundColor: "#fef3c7",
                                    borderRadius: "8px",
                                    border: "1px solid #fde68a",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize: "12px",
                                        color: "#92400e",
                                        fontWeight: "600",
                                        marginBottom: "4px",
                                        textTransform: "uppercase",
                                        fontFamily: ENHANCED_FONT_STACK,
                                    }}
                                >
                                    Notitie
                                </div>
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "#92400e",
                                        fontFamily: ENHANCED_FONT_STACK,
                                    }}
                                >
                                    {object.notitie}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Decline modal */}
            {showDeclineModal &&
                ReactDOM.createPortal(
                    <div style={styles.modalOverlay}>
                        <div
                            style={{
                                ...styles.modal,
                                width: "min(90vw, 500px)",
                                padding: "32px",
                            }}
                        >
                            <div style={styles.header}>
                                <h2 style={styles.title}>Object Afwijzen</h2>
                                <button
                                    onClick={() => {
                                        setShowDeclineModal(false)
                                        setDeclineReason("")
                                    }}
                                    style={styles.iconButton}
                                    onMouseOver={(e) => hover.iconButton(e.target as HTMLElement)}
                                    onMouseOut={(e) => hover.resetIconButton(e.target as HTMLElement)}
                                >
                                    <FaTimes />
                                </button>
                            </div>

                            <div style={styles.description}>
                                Waarom wordt dit object afgewezen? Geef een duidelijke reden op.
                            </div>

                            <form onSubmit={(e) => { e.preventDefault(); handleDeclineSubmit(); }}>
                                <div style={{ marginBottom: "24px" }}>
                                    <label style={styles.label}>Reden voor afwijzing *</label>
                                    <textarea
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        placeholder="Geef een duidelijke reden voor de afwijzing..."
                                        required
                                        rows={4}
                                        style={{
                                            ...styles.input,
                                            minHeight: "100px",
                                            resize: "vertical",
                                        }}
                                        onFocus={(e) => hover.input(e.target as HTMLElement)}
                                        onBlur={(e) => hover.resetInput(e.target as HTMLElement)}
                                    />
                                </div>

                                <div style={styles.buttonGroup}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowDeclineModal(false)
                                            setDeclineReason("")
                                        }}
                                        style={styles.secondaryButton}
                                        disabled={isProcessing}
                                        onMouseOver={(e) => hover.secondaryButton(e.target as HTMLElement)}
                                        onMouseOut={(e) => hover.resetSecondaryButton(e.target as HTMLElement)}
                                    >
                                        Annuleren
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!declineReason.trim() || isProcessing}
                                        style={{
                                            ...styles.primaryButton,
                                            backgroundColor: colors.error,
                                            opacity: (!declineReason.trim() || isProcessing) ? 0.6 : 1,
                                            cursor: (!declineReason.trim() || isProcessing) ? "not-allowed" : "pointer",
                                        }}
                                        onMouseOver={(e) => {
                                            if (declineReason.trim() && !isProcessing) {
                                                (e.target as HTMLElement).style.backgroundColor = "#b91c1c"
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (declineReason.trim() && !isProcessing) {
                                                (e.target as HTMLElement).style.backgroundColor = colors.error
                                            }
                                        }}
                                    >
                                        {isProcessing ? "Bezig..." : "Object Afwijzen"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
            </>
        )
    } catch (error) {
        console.error("Error rendering PendingObjectRow:", error, "for object:", object)
        // Fallback minimal render in case of errors
        return (
            <div
                style={{
                    backgroundColor: colors.white,
                    border: `1px solid ${colors.gray200}`,
                    borderRadius: "12px",
                    padding: "20px",
                    marginBottom: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                }}
            >
                <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(object.id)}
                    disabled={isLoading}
                />
                <FaBox style={{ color: "#6b7280" }} />
                <div style={{ flex: 1 }}>
                    <div style={{ fontSize: "16px", fontWeight: "600", color: colors.gray800 }}>
                        Object {object.id?.slice(-8) || 'Unknown'}
                    </div>
                    <div style={{ fontSize: "14px", color: colors.gray600 }}>
                        {object.organization} • {formatCurrency(object.waarde || 0)}
                    </div>
                </div>
                <div style={{ color: "#dc2626", fontSize: "12px" }}>
                    Rendering Error - Check Console
                </div>
            </div>
        )
    }
}

// Filters and Search Component
function PendingFilters({ 
    searchTerm, 
    onSearchChange,
    selectedObjectType,
    onObjectTypeChange,
    selectedOrganization,
    onOrganizationChange,
    sortBy,
    onSortChange,
    sortDirection,
    onSortDirectionChange,
    availableOrganizations
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    selectedObjectType: ObjectType | "all"
    onObjectTypeChange: (type: ObjectType | "all") => void
    selectedOrganization: string
    onOrganizationChange: (org: string) => void
    sortBy: string
    onSortChange: (sort: string) => void
    sortDirection: "asc" | "desc"
    onSortDirectionChange: (direction: "asc" | "desc") => void
    availableOrganizations: string[]
}) {
    return (
        <div
            style={{
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray200}`,
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "24px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
            }}
        >
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr",
                    gap: "16px",
                    alignItems: "end",
                }}
            >
                {/* Search */}
                <div>
                    <label style={styles.label}>Zoeken</label>
                    <div style={{ position: "relative" }}>
                        <FaSearch
                            style={{
                                position: "absolute",
                                left: "12px",
                                top: "50%",
                                transform: "translateY(-50%)",
                                color: colors.gray400,
                                fontSize: "14px",
                            }}
                        />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => onSearchChange(e.target.value)}
                            placeholder="Zoek op naam, organisatie, notitie..."
                            style={{
                                ...styles.input,
                                paddingLeft: "40px",
                            }}
                        />
                    </div>
                </div>

                {/* Object Type Filter */}
                <div>
                    <label style={styles.label}>Type</label>
                    <select
                        value={selectedObjectType}
                        onChange={(e) => onObjectTypeChange(e.target.value as ObjectType | "all")}
                        style={styles.input}
                    >
                        <option value="all">Alle types</option>
                        <option value="boat">Boten</option>
                        <option value="trailer">Trailers</option>
                        <option value="motor">Motoren</option>
                    </select>
                </div>

                {/* Organization Filter */}
                <div>
                    <label style={styles.label}>Organisatie</label>
                    <select
                        value={selectedOrganization}
                        onChange={(e) => onOrganizationChange(e.target.value)}
                        style={styles.input}
                    >
                        <option value="">Alle organisaties</option>
                        {availableOrganizations.map((org) => (
                            <option key={org} value={org}>
                                {org}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Sort By */}
                <div>
                    <label style={styles.label}>Sorteren op</label>
                    <select
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                        style={styles.input}
                    >
                        <option value="createdAt">Aanmaakdatum</option>
                        <option value="organization">Organisatie</option>
                        <option value="objectType">Type</option>
                        <option value="waarde">Waarde</option>
                    </select>
                </div>

                {/* Sort Direction */}
                <div>
                    <label style={styles.label}>Volgorde</label>
                    <button
                        onClick={() => onSortDirectionChange(sortDirection === "asc" ? "desc" : "asc")}
                        style={{
                            ...styles.secondaryButton,
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "8px",
                        }}
                        onMouseOver={(e) => hover.secondaryButton(e.target as HTMLElement)}
                        onMouseOut={(e) => hover.resetSecondaryButton(e.target as HTMLElement)}
                    >
                        {sortDirection === "asc" ? (
                            <>
                                <FaSortAmountUp />
                                Oplopend
                            </>
                        ) : (
                            <>
                                <FaSortAmountDown />
                                Aflopend
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Main Component
export const PendingBoatsOverview: Override = () => {
    // State management
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [pendingObjects, setPendingObjects] = useState<PendingInsuredObject[]>([])
    const [filteredObjects, setFilteredObjects] = useState<PendingInsuredObject[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    
    // Selection state
    const [selectedObjectIds, setSelectedObjectIds] = useState<Set<string>>(new Set())
    const [selectAll, setSelectAll] = useState(false)
    
    // Filter state
    const [searchTerm, setSearchTerm] = useState("")
    const [selectedObjectType, setSelectedObjectType] = useState<ObjectType | "all">("all")
    const [selectedOrganization, setSelectedOrganization] = useState("")
    const [sortBy, setSortBy] = useState("createdAt")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
    
    // Action states
    const [isProcessing, setIsProcessing] = useState(false)
    
    // Content state for the override
    const [content, setContent] = useState<React.ReactNode>(null)

    // Debug: Monitor pendingObjects state changes
    useEffect(() => {
        console.log("pendingObjects state changed:", pendingObjects, "length:", Array.isArray(pendingObjects) ? pendingObjects.length : "not array")
    }, [pendingObjects])

    // Calculate statistics
    console.log("About to calculate stats - pendingObjects:", pendingObjects, "length:", Array.isArray(pendingObjects) ? pendingObjects.length : "not array")
    const stats = calculatePendingStats(pendingObjects)
    console.log("Calculated stats:", stats)
    const availableOrganizations = [...new Set((Array.isArray(pendingObjects) ? pendingObjects : []).map(obj => obj.organization))].sort()
    console.log("Available organizations:", availableOrganizations)

    // Initialize user info and fetch data
    useEffect(() => {
        async function initializeData() {
            try {
                setLoading(true)
                setError(null)

                // Get current user info
                const currentUserInfo = getCurrentUserInfo()
                if (!currentUserInfo) {
                    setError("Niet ingelogd. Ga terug naar de login pagina.")
                    return
                }

                // Fetch detailed user info
                const detailedUserInfo = await fetchUserInfo(currentUserInfo.sub)
                if (!detailedUserInfo) {
                    setError("Kan gebruikersinformatie niet ophalen.")
                    return
                }

                setUserInfo(detailedUserInfo)

                // Check if user is admin
                if (!isAdmin(detailedUserInfo)) {
                    setError("Toegang geweigerd. Deze pagina is alleen toegankelijk voor beheerders.")
                    return
                }

                // Fetch all pending objects
                await fetchPendingData()

            } catch (err: any) {
                console.error("Error initializing data:", err)
                setError(err.message || "Er is een fout opgetreden bij het laden van de gegevens.")
            } finally {
                setLoading(false)
            }
        }

        initializeData()
    }, [])

    // Fetch pending objects data
    const fetchPendingData = useCallback(async () => {
        try {
            console.log("fetchPendingData called - starting fetch")
            const objects = await fetchAllPendingObjects()
            console.log("Raw objects from API:", objects, "type:", typeof objects, "isArray:", Array.isArray(objects))
            
            if (!Array.isArray(objects)) {
                console.error("API returned non-array data:", objects)
                setPendingObjects([])
                return
            }
            
            // Process and validate the objects to ensure they have required fields
            const processedObjects = objects.map((obj, index) => {
                console.log(`Processing object ${index}:`, obj)
                
                return {
                    ...obj,
                    // Ensure required fields exist with fallbacks
                    id: obj.id || `temp-id-${index}`,
                    organization: obj.organization || 'Unknown Organization',
                    createdAt: obj.createdAt || obj.created_at || new Date().toISOString(),
                    updatedAt: obj.updatedAt || obj.updated_at || new Date().toISOString(),
                    objectType: obj.objectType || (obj.objectType === undefined && obj.motorMerk ? 'motor' : 'boat'),
                    waarde: obj.waarde || 0,
                    premiepromillage: obj.premiepromillage || 0,
                    eigenRisico: obj.eigenRisico || 0,
                    ingangsdatum: obj.ingangsdatum || obj.startDate || new Date().toISOString(),
                    status: 'Pending' as const // Ensure status is set
                }
            })
            
            console.log("Processed objects before setting state:", processedObjects, "length:", processedObjects.length)
            
            // Use setTimeout to ensure state update is async and check if it worked
            setPendingObjects(processedObjects)
            
            setTimeout(() => {
                console.log("State update should be complete - checking current state")
            }, 100)
            
        } catch (err: any) {
            console.error("Error fetching pending objects:", err)
            setError(err.message || "Kan pending objecten niet ophalen.")
        }
    }, [])

    // Filter and sort objects
    useEffect(() => {
        console.log("Filter useEffect triggered - pendingObjects:", pendingObjects, "type:", typeof pendingObjects, "isArray:", Array.isArray(pendingObjects))
        // Safety check to ensure pendingObjects is an array
        const safePendingObjects = Array.isArray(pendingObjects) ? pendingObjects : []
        console.log("Filtering objects - input:", safePendingObjects, "length:", safePendingObjects.length)
        let filtered = [...safePendingObjects]

        // Apply search filter
        if (searchTerm.trim()) {
            const searchLower = searchTerm.toLowerCase()
            filtered = filtered.filter(obj => {
                const displayName = getObjectDisplayName(obj).toLowerCase()
                const organization = obj.organization.toLowerCase()
                const notes = (obj.notitie || "").toLowerCase()
                const objectType = getObjectTypeName(obj.objectType).toLowerCase()
                
                return displayName.includes(searchLower) ||
                       organization.includes(searchLower) ||
                       notes.includes(searchLower) ||
                       objectType.includes(searchLower)
            })
        }

        // Apply object type filter
        if (selectedObjectType !== "all") {
            filtered = filtered.filter(obj => obj.objectType === selectedObjectType)
        }

        // Apply organization filter
        if (selectedOrganization) {
            filtered = filtered.filter(obj => obj.organization === selectedOrganization)
        }

        // Apply sorting
        filtered.sort((a, b) => {
            let aValue: any
            let bValue: any

            switch (sortBy) {
                case "createdAt":
                    aValue = new Date(a.createdAt).getTime()
                    bValue = new Date(b.createdAt).getTime()
                    break
                case "organization":
                    aValue = a.organization.toLowerCase()
                    bValue = b.organization.toLowerCase()
                    break
                case "objectType":
                    aValue = getObjectTypeName(a.objectType).toLowerCase()
                    bValue = getObjectTypeName(b.objectType).toLowerCase()
                    break
                case "waarde":
                    aValue = a.waarde
                    bValue = b.waarde
                    break
                default:
                    aValue = a.createdAt
                    bValue = b.createdAt
            }

            if (aValue < bValue) return sortDirection === "asc" ? -1 : 1
            if (aValue > bValue) return sortDirection === "asc" ? 1 : -1
            return 0
        })

        console.log("Filtering complete - filtered objects:", filtered)
        setFilteredObjects(filtered)
    }, [pendingObjects, searchTerm, selectedObjectType, selectedOrganization, sortBy, sortDirection])

    // Handle selection
    const handleToggleSelect = useCallback((objectId: string) => {
        setSelectedObjectIds(prev => {
            const newSet = new Set(prev)
            if (newSet.has(objectId)) {
                newSet.delete(objectId)
            } else {
                newSet.add(objectId)
            }
            return newSet
        })
    }, [])

    const handleToggleSelectAll = useCallback(() => {
        if (selectAll) {
            setSelectedObjectIds(new Set())
            setSelectAll(false)
        } else {
            setSelectedObjectIds(new Set(filteredObjects.map(obj => obj.id)))
            setSelectAll(true)
        }
    }, [selectAll, filteredObjects])

    const handleClearSelection = useCallback(() => {
        setSelectedObjectIds(new Set())
        setSelectAll(false)
    }, [])

    // Handle individual actions
    const handleApprove = useCallback(async (object: PendingInsuredObject) => {
        try {
            setIsProcessing(true)
            await approveObject(object.id)
            
            setSuccess(`${getObjectDisplayName(object)} is goedgekeurd.`)
            setTimeout(() => setSuccess(null), 5000)
            
            // Refresh data
            await fetchPendingData()
            
            // Remove from selection if it was selected
            setSelectedObjectIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(object.id)
                return newSet
            })
        } catch (err: any) {
            setError(`Fout bij goedkeuring: ${err.message}`)
            setTimeout(() => setError(null), 5000)
        } finally {
            setIsProcessing(false)
        }
    }, [fetchPendingData])

    const handleDecline = useCallback(async (object: PendingInsuredObject, reason: string = "") => {
        try {
            setIsProcessing(true)
            await declineObject(object.id, reason)
            
            setSuccess(`${getObjectDisplayName(object)} is afgewezen.`)
            setTimeout(() => setSuccess(null), 5000)
            
            // Refresh data
            await fetchPendingData()
            
            // Remove from selection if it was selected
            setSelectedObjectIds(prev => {
                const newSet = new Set(prev)
                newSet.delete(object.id)
                return newSet
            })
        } catch (err: any) {
            setError(`Fout bij afwijzing: ${err.message}`)
            setTimeout(() => setError(null), 5000)
        } finally {
            setIsProcessing(false)
        }
    }, [fetchPendingData])

    const handleViewDetails = useCallback((object: PendingInsuredObject) => {
        // Navigate to organization's insured objects page
        const orgParam = encodeURIComponent(object.organization)
        window.open(`/insuredobjects?org=${orgParam}`, '_blank')
    }, [])

    // Handle bulk actions
    const handleBulkApprove = useCallback(async () => {
        if (selectedObjectIds.size === 0) return

        try {
            setIsProcessing(true)
            const objectIds = Array.from(selectedObjectIds)
            await bulkApproveObjects(objectIds)
            
            setSuccess(`${objectIds.length} object${objectIds.length > 1 ? "en" : ""} goedgekeurd.`)
            setTimeout(() => setSuccess(null), 5000)
            
            // Refresh data and clear selection
            await fetchPendingData()
            handleClearSelection()
        } catch (err: any) {
            setError(`Fout bij bulk goedkeuring: ${err.message}`)
            setTimeout(() => setError(null), 5000)
        } finally {
            setIsProcessing(false)
        }
    }, [selectedObjectIds, fetchPendingData, handleClearSelection])

    const handleBulkDecline = useCallback(() => {
        // For now, we'll show a message that bulk decline needs individual reasons
        setError("Bulk afwijzing is nog niet beschikbaar. Wijs objecten individueel af met specifieke redenen.")
        setTimeout(() => setError(null), 5000)
    }, [])

    // Auto-clear messages
    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(null), 8000)
            return () => clearTimeout(timer)
        }
    }, [error])

    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 5000)
            return () => clearTimeout(timer)
        }
    }, [success])

    // Calculate derived values that won't cause re-renders
    const currentContent = React.useMemo(() => {
        // Loading state
        if (loading) {
            return (
                <div
                    style={{
                        minHeight: "100vh",
                        backgroundColor: "#f9fafb",
                        fontFamily: ENHANCED_FONT_STACK,
                        padding: "24px",
                    }}
                >
                    <div
                        style={{
                            maxWidth: "1400px",
                            margin: "0 auto",
                            display: "flex",
                            justifyContent: "center",
                            alignItems: "center",
                            minHeight: "60vh",
                        }}
                    >
                        <div style={{ textAlign: "center" }}>
                            <div
                                style={{
                                    width: "40px",
                                    height: "40px",
                                    border: `3px solid ${colors.gray300}`,
                                    borderTop: `3px solid ${colors.primary}`,
                                    borderRadius: "50%",
                                    animation: "spin 1s linear infinite",
                                    margin: "0 auto 16px",
                                }}
                            />
                            <div
                                style={{
                                    fontSize: "18px",
                                    fontWeight: "500",
                                    color: colors.gray700,
                                }}
                            >
                                Laden van pending objecten...
                            </div>
                        </div>
                    </div>
                </div>
            )
        }

        // Error state - not authorized or other errors
        if (error && (error.includes("Toegang geweigerd") || error.includes("Niet ingelogd"))) {
            return (
                <div
                    style={{
                        minHeight: "100vh",
                        backgroundColor: "#f9fafb",
                        fontFamily: ENHANCED_FONT_STACK,
                        padding: "24px",
                    }}
                >
                    <div
                        style={{
                            maxWidth: "600px",
                            margin: "60px auto",
                            textAlign: "center",
                        }}
                    >
                        <div
                            style={{
                                backgroundColor: colors.white,
                                borderRadius: "16px",
                                padding: "48px",
                                boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
                            }}
                        >
                            <FaUserShield
                                style={{
                                    fontSize: "64px",
                                    color: "#dc2626",
                                    marginBottom: "24px",
                                }}
                            />
                            <h1
                                style={{
                                    fontSize: "28px",
                                    fontWeight: "700",
                                    color: colors.gray800,
                                    marginBottom: "16px",
                                }}
                            >
                                Toegang Geweigerd
                            </h1>
                            <p
                                style={{
                                    fontSize: "18px",
                                    color: colors.gray600,
                                    marginBottom: "32px",
                                    lineHeight: "1.6",
                                }}
                            >
                                {error}
                            </p>
                            <button
                                onClick={() => (window.location.href = "/organizations")}
                                style={{
                                    ...styles.primaryButton,
                                    padding: "12px 24px",
                                    fontSize: "16px",
                                }}
                                onMouseOver={(e) => hover.primaryButton(e.target as HTMLElement)}
                                onMouseOut={(e) => hover.resetPrimaryButton(e.target as HTMLElement)}
                            >
                                <FaArrowLeft />
                                Terug naar Dashboard
                            </button>
                        </div>
                    </div>
                </div>
            )
        }

        // Main render
        return (
            <div
                style={{
                    minHeight: "100vh",
                    backgroundColor: "#f9fafb",
                    fontFamily: ENHANCED_FONT_STACK,
                    padding: "24px",
                }}
            >
                {/* Add CSS animation for spinner */}
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>

                <div
                    style={{
                        maxWidth: "1400px",
                        margin: "0 auto",
                    }}
                >
                    {/* Top navigation and user banner */}
                    <div style={{ marginBottom: "32px" }}>
                        <UserInfoBanner />
                    </div>

                    {/* Main content container */}
                    <div
                        style={{
                            backgroundColor: colors.white,
                            borderRadius: "16px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Enhanced Navigation Tabs */}
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
                            {(() => {
                                const tabs = [
                                    { key: "organizations", label: "Organisaties", icon: FaBuilding, href: "/organizations" },
                                    { key: "policies", label: "Polissen", icon: FaFileContract, href: "/policies" },
                                    { key: "users", label: "Gebruikers", icon: FaUsers, href: "/users" },
                                    { key: "pending", label: "Pending Items", icon: FaClock, href: "/pending-overview" },
                                    { key: "changelog", label: "Wijzigingslogboek", icon: FaClipboardList, href: "/changelog" }
                                ];
                                
                                return tabs.filter((tab) => {
                                    // Hide users, pending, and changelog tabs for regular users
                                    if (userInfo?.role === "user" && (tab.key === "users" || tab.key === "pending" || tab.key === "changelog")) {
                                        return false
                                    }
                                    return true
                                }).map((tab) => {
                                const isActive = tab.key === "pending"
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
                                            backgroundColor: isActive ? "#3b82f6" : "#ffffff",
                                            color: isActive ? "white" : "#6b7280",
                                            border: isActive ? "none" : "2px solid #e5e7eb",
                                            borderRadius: "12px",
                                            fontSize: "15px",
                                            fontWeight: "600",
                                            cursor: isActive ? "default" : "pointer",
                                            fontFamily: ENHANCED_FONT_STACK,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            transition: "all 0.2s",
                                            minHeight: "48px",
                                            boxShadow: isActive 
                                                ? "0 2px 8px rgba(59, 130, 246, 0.15)" 
                                                : "0 2px 4px rgba(0,0,0,0.05)",
                                            transform: isActive ? "translateY(-1px)" : "none",
                                            position: "relative",
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isActive) {
                                                const target = e.target as HTMLElement
                                                target.style.backgroundColor = "#f8fafc"
                                                target.style.borderColor = "#3b82f6"
                                                target.style.color = "#3b82f6"
                                                target.style.transform = "translateY(-1px)"
                                                target.style.boxShadow = "0 4px 12px rgba(59, 130, 246, 0.15)"
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isActive) {
                                                const target = e.target as HTMLElement
                                                target.style.backgroundColor = "#ffffff"
                                                target.style.borderColor = "#e5e7eb"
                                                target.style.color = "#6b7280"
                                                target.style.transform = "none"
                                                target.style.boxShadow = "0 2px 4px rgba(0,0,0,0.05)"
                                            }
                                        }}
                                    >
                                        <Icon size={14} />
                                        {tab.label}
                                        {/* Pending count badge */}
                                        {tab.key === "pending" && stats.total > 0 && (
                                            <span
                                                style={{
                                                    backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#dc2626",
                                                    color: isActive ? "white" : "white",
                                                    borderRadius: "10px",
                                                    padding: "2px 6px",
                                                    fontSize: "12px",
                                                    fontWeight: "700",
                                                    minWidth: "18px",
                                                    textAlign: "center",
                                                    marginLeft: "4px",
                                                }}
                                            >
                                                {stats.total}
                                            </span>
                                        )}
                                    </button>
                                )
                            });
                            })()}
                        </div>

                        {/* Page Content */}
                        <div style={{ padding: "32px" }}>
                            {/* Page Header */}
                            <div style={{ marginBottom: "32px" }}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        marginBottom: "16px",
                                    }}
                                >
                                    <div>
                                        <h1
                                            style={{
                                                fontSize: "32px",
                                                fontWeight: "700",
                                                color: colors.gray800,
                                                margin: "0 0 8px 0",
                                                fontFamily: ENHANCED_FONT_STACK,
                                            }}
                                        >
                                            Pending Items Overzicht
                                        </h1>
                                        <p
                                            style={{
                                                fontSize: "16px",
                                                color: colors.gray600,
                                                margin: 0,
                                                fontFamily: ENHANCED_FONT_STACK,
                                            }}
                                        >
                                            Beheer alle wachtende verzekeringsobjecten vanuit één centrale locatie
                                        </p>
                                    </div>
                                    
                                </div>

                                {/* Success/Error Messages */}
                                {success && (
                                    <div style={styles.successAlert}>
                                        <FaCheck style={{ marginRight: "8px" }} />
                                        {success}
                                    </div>
                                )}
                                
                                {error && !error.includes("Toegang geweigerd") && !error.includes("Niet ingelogd") && (
                                    <div style={styles.errorAlert}>
                                        <FaExclamationTriangle style={{ marginRight: "8px" }} />
                                        {error}
                                    </div>
                                )}
                            </div>

                            {/* Statistics Cards */}
                            <PendingStatisticsCards stats={stats} />

                            {/* Object Type Breakdown */}
                            <ObjectTypeBreakdown stats={stats} />

                            {/* Filters and Search */}
                            <PendingFilters
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                selectedObjectType={selectedObjectType}
                                onObjectTypeChange={setSelectedObjectType}
                                selectedOrganization={selectedOrganization}
                                onOrganizationChange={setSelectedOrganization}
                                sortBy={sortBy}
                                onSortChange={setSortBy}
                                sortDirection={sortDirection}
                                onSortDirectionChange={setSortDirection}
                                availableOrganizations={availableOrganizations}
                            />

                            {/* Bulk Actions */}
                            <BulkActionsBar
                                selectedCount={selectedObjectIds.size}
                                onBulkApprove={handleBulkApprove}
                                onBulkDecline={handleBulkDecline}
                                onClearSelection={handleClearSelection}
                                isLoading={isProcessing}
                            />

                            {/* Select All checkbox */}
                            {filteredObjects.length > 0 && (
                                <div
                                    style={{
                                        marginBottom: "16px",
                                        padding: "12px 16px",
                                        backgroundColor: colors.gray50,
                                        borderRadius: "8px",
                                        border: `1px solid ${colors.gray200}`,
                                    }}
                                >
                                    <label
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            color: colors.gray700,
                                            cursor: "pointer",
                                            fontFamily: ENHANCED_FONT_STACK,
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={selectAll}
                                            onChange={handleToggleSelectAll}
                                            disabled={isProcessing}
                                            style={{
                                                transform: "scale(1.2)",
                                                cursor: isProcessing ? "not-allowed" : "pointer",
                                            }}
                                        />
                                        Selecteer alle {filteredObjects.length} zichtbare item{filteredObjects.length !== 1 ? "s" : ""}
                                    </label>
                                </div>
                            )}

                            {/* Pending Objects List */}
                            <div>
                                {filteredObjects.length === 0 ? (
                                    <div
                                        style={{
                                            backgroundColor: colors.white,
                                            border: `1px solid ${colors.gray200}`,
                                            borderRadius: "12px",
                                            padding: "48px",
                                            textAlign: "center",
                                            color: colors.gray500,
                                        }}
                                    >
                                        {pendingObjects.length === 0 ? (
                                            <>
                                                <FaCheckCircle
                                                    style={{
                                                        fontSize: "48px",
                                                        color: "#10b981",
                                                        marginBottom: "16px",
                                                    }}
                                                />
                                                <h3
                                                    style={{
                                                        fontSize: "20px",
                                                        fontWeight: "600",
                                                        color: colors.gray700,
                                                        marginBottom: "8px",
                                                        fontFamily: ENHANCED_FONT_STACK,
                                                    }}
                                                >
                                                    Geen Pending Items
                                                </h3>
                                                <p
                                                    style={{
                                                        fontSize: "16px",
                                                        color: colors.gray500,
                                                        fontFamily: ENHANCED_FONT_STACK,
                                                    }}
                                                >
                                                    Alle verzekeringsobjecten zijn verwerkt. Goed werk!
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <FaSearch
                                                    style={{
                                                        fontSize: "48px",
                                                        color: colors.gray400,
                                                        marginBottom: "16px",
                                                    }}
                                                />
                                                <h3
                                                    style={{
                                                        fontSize: "20px",
                                                        fontWeight: "600",
                                                        color: colors.gray700,
                                                        marginBottom: "8px",
                                                        fontFamily: ENHANCED_FONT_STACK,
                                                    }}
                                                >
                                                    Geen Resultaten
                                                </h3>
                                                <p
                                                    style={{
                                                        fontSize: "16px",
                                                        color: colors.gray500,
                                                        fontFamily: ENHANCED_FONT_STACK,
                                                    }}
                                                >
                                                    Geen pending items gevonden met de huidige filters.
                                                    <br />
                                                    Probeer je zoekcriteria aan te passen.
                                                </p>
                                            </>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        {/* Results summary */}
                                        <div
                                            style={{
                                                marginBottom: "16px",
                                                fontSize: "14px",
                                                color: colors.gray600,
                                                fontFamily: ENHANCED_FONT_STACK,
                                            }}
                                        >
                                            {filteredObjects.length} van {pendingObjects.length} pending item{filteredObjects.length !== 1 ? "s" : ""}
                                            {selectedObjectIds.size > 0 &&
                                            (
                                               <span style={{ marginLeft: "12px", color: colors.primary }}>
                                                   • {selectedObjectIds.size} geselecteerd
                                               </span>
                                           )}
                                       </div>

                                       {/* Objects list */}
                                       {filteredObjects.map((object, index) => {
                                           return (
                                               <PendingObjectRow
                                                   key={object.id}
                                                   object={object}
                                                   isSelected={selectedObjectIds.has(object.id)}
                                                   onToggleSelect={handleToggleSelect}
                                                   onApprove={handleApprove}
                                                   onDecline={handleDecline}
                                                   onViewDetails={handleViewDetails}
                                                   isLoading={isProcessing}
                                               />
                                           )
                                       })}
                                   </div>
                               )}
                           </div>
                       </div>
                   </div>
               </div>
           </div>
       )
   }, [
       loading,
       error,
       userInfo?.role,
       stats.total,
       searchTerm,
       selectedObjectType,
       selectedOrganization,
       sortBy,
       sortDirection,
       selectedObjectIds.size,
       selectAll,
       isProcessing,
       success,
       filteredObjects.length,
       pendingObjects.length
   ])

   // Update content when it changes
   useEffect(() => {
       setContent(currentContent)
   }, [currentContent])

   // Return props for the Framer element
   return {
       children: content,
       style: {
           width: "100%",
           height: "100%",
           overflow: "auto"
       }
   }
}