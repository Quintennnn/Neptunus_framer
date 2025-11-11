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
import { UserInfoBanner } from "../components/UserInfoBanner.tsx"
import { colors, styles, hover, FONT_STACK } from "../Theme.tsx"
import { 
    API_BASE_URL, 
    API_PATHS, 
    getIdToken, 
    formatErrorMessage, 
    formatSuccessMessage, 
    validatePromillage, 
    normalizePromillageValue,
    PremiumCalculationMethod,
    PremiumConfig,
    calculatePremium,
    validatePremiumConfig,
    formatPremiumDisplay,
    OwnRiskCalculationMethod,
    OwnRiskConfig,
    calculateOwnRisk,
    validateOwnRiskConfig,
    formatOwnRiskDisplay
} from "../utils.tsx"

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

type ObjectType = "boot" | "trailer" | "motor"

interface PendingInsuredObject {
    id: string
    objectType: ObjectType
    status: "Pending" | "Rejected"  // Include rejected items for admin review/reconsideration
    waarde: number // value
    organization: string
    ingangsdatum: string // insuranceStartDate
    uitgangsdatum?: string // insuranceEndDate
    premiepercentage: number // premiumPerMille (for percentage method: stores the %, for fixed: not used)
    eigenRisico: number // deductible (calculated amount)

    // Premium fields (match auto-approver behavior)
    premiumMethod?: "percentage" | "fixed" // Premium calculation method
    premiumPercentage?: number // Premium percentage value (when method is percentage)
    premiumFixedAmount?: number // Premium fixed amount (when method is fixed)

    naam?: string // name/title
    notitie?: string // notes
    createdAt: string
    updatedAt: string
    lastUpdatedBy?: string
    rejectionReasons?: {
        reason: string
        timestamp: string
        ingangsdatum_override?: boolean
        rules_evaluated?: Array<{
            rule_name: string
            logic: string
            failed_conditions: Array<{
                field: string
                reason: string
                expected: any
                actual: any
                operator: string
            }>
            passed_conditions: number
            total_conditions: number
        }>
    }

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

        // Fetch both Pending and Rejected items for review
        // Rejected items are kept visible as rejection history for potential reconsideration
        const res = await fetch(`${API_BASE_URL}${API_PATHS.INSURED_OBJECT}?status=Pending,Rejected`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) {
            throw new Error(`Failed to fetch pending/rejected objects: ${res.status} ${res.statusText}`)
        }

        const data = await res.json()
        console.log("Fetched pending and rejected objects:", data)
        
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

async function approveObjectWithCustomValues(
    objectId: string, 
    premiumConfig: PremiumConfig,
    ownRiskConfig: OwnRiskConfig
): Promise<void> {
    try {
        const token = getIdTokenFromStorage()
        if (!token) throw new Error("No authentication token")

        // Prepare the payload with method and value for both premium and eigenRisico
        const payload: any = {
            premium: {
                method: premiumConfig.method,
                value: premiumConfig.method === "fixed" 
                    ? parseFloat(String(premiumConfig.fixedAmount || 0))
                    : parseFloat(String(premiumConfig.percentage || 0))
            },
            eigenRisico: {
                method: ownRiskConfig.method,
                value: ownRiskConfig.method === "fixed"
                    ? parseFloat(String(ownRiskConfig.fixedAmount || 0))
                    : parseFloat(String(ownRiskConfig.percentage || 0))
            }
        }

        console.log("Sending approval with custom values:", payload)

        const res = await fetch(`${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${objectId}/approve`, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
        })

        if (!res.ok) {
            throw new Error(`Failed to approve object with custom values: ${res.status} ${res.statusText}`)
        }
    } catch (error) {
        console.error("Error approving object with custom values:", error)
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

// Rounding helper functions
function roundPremieToZero(value: number): number {
    // Round premie to 2 decimal places (e.g., 1.25, 2.50)
    return Math.round(value * 100) / 100
}

function roundBootWaardeToNearest50(value: number): number {
    // Round boot value to nearest 50
    return Math.round(value / 50) * 50
}

function calculatePendingStats(objects: PendingInsuredObject[]): PendingStats {
    // Safety check to ensure objects is an array
    const safeObjects = Array.isArray(objects) ? objects : []
    
    const stats = {
        total: safeObjects.length,
        boats: safeObjects.filter(obj => obj.objectType === "boot").length,
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
        case "boot":
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
        case "boot":
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
    // If the object has a custom name, use that first
    if (object.naam) {
        return object.naam
    }
    
    switch (object.objectType) {
        case "boot":
            const boatName = object.merkBoot || object.typeBoot || ""
            const boatNumber = object.rompnummer || ""
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

// DEPRECATED: CalculatedFieldEditor - replaced by EnhancedPremiumInput and EnhancedOwnRiskInput
// This component is kept for backward compatibility but should not be used in new code
// Calculated Field Editor Component - allows admins to edit calculated values inline
function CalculatedFieldEditor({
    label,
    value,
    suffix,
    type,
    objectId,
    onUpdate,
    boatValue,
}: {
    label: string
    value: number
    suffix: string
    type: "promillage" | "currency"
    objectId: string
    onUpdate: (newValue: number) => void
    boatValue?: number // Optional boat value for percentage calculations
}) {
    const [isEditing, setIsEditing] = React.useState(false)
    const [editValue, setEditValue] = React.useState(value.toString())
    const [isSaving, setIsSaving] = React.useState(false)

    // Split value into integer and decimal parts for percentage inputs
    const getCurrentValue = () => {
        if (value === null || value === undefined) return { integer: "", decimal: "" }
        const numValue = typeof value === "string" ? parseFloat(value) : value
        if (isNaN(numValue)) return { integer: "", decimal: "" }
        const [intPart, decPart] = numValue.toString().split(".")
        return { integer: intPart || "", decimal: decPart || "" }
    }

    const [integerValue, setIntegerValue] = React.useState(() => getCurrentValue().integer)
    const [decimalValue, setDecimalValue] = React.useState(() => getCurrentValue().decimal)

    const handleIntegerChange = (newInteger: string) => {
        // Only allow digits
        if (newInteger !== "" && !/^\d+$/.test(newInteger)) return
        setIntegerValue(newInteger)
    }

    const handleDecimalChange = (newDecimal: string) => {
        // Only allow digits, max 3 digits
        if (newDecimal !== "" && (!/^\d+$/.test(newDecimal) || newDecimal.length > 3)) return
        setDecimalValue(newDecimal)
    }

    const handleSave = async () => {
        if (type === "promillage") {
            if (!boatValue) {
                console.warn("Cannot calculate promillage without boat value")
                setIsEditing(false)
                return
            }

            const integer = integerValue || "0"
            const decimal = decimalValue
            const combinedValue = decimal ? `${integer}.${decimal}` : integer
            const promillage = parseFloat(combinedValue)
            
            if (isNaN(promillage) || promillage < 0) {
                console.warn("Invalid promillage value:", combinedValue)
                const current = getCurrentValue()
                setIntegerValue(current.integer)
                setDecimalValue(current.decimal)
                setIsEditing(false)
                return
            }

            // Round the promillage value to 3 decimals
            const finalValue = Math.round(promillage * 1000) / 1000

            setIsSaving(true)
            try {
                onUpdate(finalValue)
                setIsEditing(false)
            } catch (error) {
                console.error("Failed to update promillage field:", error)
                const current = getCurrentValue()
                setIntegerValue(current.integer)
                setDecimalValue(current.decimal)
            } finally {
                setIsSaving(false)
            }
        } else {
            // Currency validation with rounding to nearest 50
            const numValue = parseFloat(editValue)
            if (isNaN(numValue) || numValue < 0) {
                setEditValue(value.toString())
                setIsEditing(false)
                return
            }

            // Round currency values (eigen risico) to nearest 50
            const roundedValue = roundBootWaardeToNearest50(numValue)

            setIsSaving(true)
            try {
                onUpdate(roundedValue)
                setIsEditing(false)
            } catch (error) {
                console.error("Failed to update currency field:", error)
                setEditValue(value.toString())
            } finally {
                setIsSaving(false)
            }
        }
    }

    const handleCancel = () => {
        if (type === "promillage") {
            const current = getCurrentValue()
            setIntegerValue(current.integer)
            setDecimalValue(current.decimal)
        } else {
            setEditValue(value.toString())
        }
        setIsEditing(false)
    }

    const formatDisplayValue = (val: number) => {
        if (type === "currency") {
            return formatCurrency(val)
        }
        // For promillage, show as promillage with up to 3 decimals
        return `${val.toFixed(3)}‰`
    }

    return (
        <div>
            <div style={{ color: colors.gray600, marginBottom: "4px" }}>
                {label}
                <span style={{
                    fontSize: "12px",
                    color: colors.gray500,
                    marginLeft: "4px",
                    fontStyle: "italic"
                }}>
                    (klik om te bewerken
                    {type === "promillage" && " - max 3 decimalen"}
                    {type === "currency" && " - wordt afgerond op 50-tallen"}
                    )
                </span>
            </div>
            {isEditing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {/* Input field */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        {type === "promillage" ? (
                            <>
                                <input
                                    type="text"
                                    value={integerValue}
                                    onChange={(e) => handleIntegerChange(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="0"
                                    style={{
                                        width: "60px",
                                        padding: "4px 8px",
                                        border: `2px solid ${colors.primary}`,
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        textAlign: "right",
                                        backgroundColor: isSaving ? colors.gray50 : colors.white,
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSave()
                                        if (e.key === "Escape") handleCancel()
                                    }}
                                    autoFocus
                                />
                                <span style={{ fontSize: "16px", fontWeight: "600", color: "#374151" }}>.</span>
                                <input
                                    type="text"
                                    value={decimalValue}
                                    onChange={(e) => handleDecimalChange(e.target.value)}
                                    disabled={isSaving}
                                    placeholder="000"
                                    maxLength={3}
                                    style={{
                                        width: "50px",
                                        padding: "4px 8px",
                                        border: `2px solid ${colors.primary}`,
                                        borderRadius: "4px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        backgroundColor: isSaving ? colors.gray50 : colors.white,
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleSave()
                                        if (e.key === "Escape") handleCancel()
                                    }}
                                />
                                <span style={{ fontSize: "14px", color: colors.gray600, fontWeight: "500" }}>
                                    ‰
                                </span>
                            </>
                        ) : (
                            <input
                                type="number"
                                step="1"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                disabled={isSaving}
                                style={{
                                    padding: "4px 8px",
                                    border: `2px solid ${colors.primary}`,
                                    borderRadius: "4px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    width: "80px",
                                    backgroundColor: isSaving ? colors.gray50 : colors.white,
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleSave()
                                    if (e.key === "Escape") handleCancel()
                                }}
                                autoFocus
                            />
                        )}
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            style={{
                                padding: "2px 6px",
                                backgroundColor: colors.primary,
                                color: colors.white,
                                border: "none",
                                borderRadius: "3px",
                                fontSize: "12px",
                                cursor: isSaving ? "not-allowed" : "pointer",
                                opacity: isSaving ? 0.6 : 1,
                            }}
                        >
                            ✓
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            style={{
                                padding: "2px 6px",
                                backgroundColor: colors.gray400,
                                color: colors.white,
                                border: "none",
                                borderRadius: "3px",
                                fontSize: "12px",
                                cursor: isSaving ? "not-allowed" : "pointer",
                                opacity: isSaving ? 0.6 : 1,
                            }}
                        >
                            ✕
                        </button>
                    </div>
                </div>
            ) : (
                <div 
                    onClick={() => setIsEditing(true)}
                    style={{ 
                        color: colors.gray800, 
                        fontWeight: "500",
                        cursor: "pointer",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        border: "2px solid transparent",
                        transition: "all 0.2s",
                        display: "inline-block",
                    }}
                    onMouseOver={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = colors.gray50
                        ;(e.target as HTMLElement).style.borderColor = colors.gray300
                    }}
                    onMouseOut={(e) => {
                        (e.target as HTMLElement).style.backgroundColor = "transparent"
                        ;(e.target as HTMLElement).style.borderColor = "transparent"
                    }}
                >
                    {formatDisplayValue(value)}
                </div>
            )}
        </div>
    )
}

// Enhanced Premium Input Component - allows admins to set premium as fixed amount or percentage
function EnhancedPremiumInput({
    config,
    onChange,
    boatValue,
}: {
    config: PremiumConfig
    onChange: (config: PremiumConfig) => void
    boatValue: number
}) {
    const handleMethodChange = (method: PremiumCalculationMethod) => {
        // Preserve existing values when switching methods
        const newConfig: PremiumConfig = {
            ...config,
            method,
            fixedAmount: config.fixedAmount || 0,
            percentage: config.percentage || 0,
        }
        onChange(newConfig)
    }

    const handleValueChange = (value: string | number) => {
        // Store raw value to allow partial decimals
        if (config.method === "fixed") {
            onChange({ ...config, fixedAmount: value })
        } else {
            onChange({ ...config, percentage: value })
        }
    }

    const handleBlur = (value: string) => {
        if (value === "" || value === ".") {
            // Reset to 0 if empty or just a dot
            if (config.method === "fixed") {
                onChange({ ...config, fixedAmount: 0 })
            } else {
                onChange({ ...config, percentage: 0 })
            }
            return
        }

        const numValue = parseFloat(value)
        if (!isNaN(numValue)) {
            if (config.method === "fixed") {
                // Round to 2 decimals for fixed amount on blur
                const roundedValue = Math.round(numValue * 100) / 100
                onChange({ ...config, fixedAmount: roundedValue })
            } else {
                // Round to 2 decimals for percentage on blur
                const roundedValue = Math.round(numValue * 100) / 100
                onChange({ ...config, percentage: roundedValue })
            }
        }
    }

    // Split value into integer and decimal parts
    const getCurrentValue = () => {
        const value = config.method === "fixed" ? config.fixedAmount : config.percentage
        if (value === "" || value == null) return { integer: "", decimal: "" }
        const numValue = typeof value === "string" ? parseFloat(value) : value
        if (isNaN(numValue)) return { integer: "", decimal: "" }
        const [intPart, decPart] = numValue.toString().split(".")
        return { integer: intPart || "", decimal: decPart || "" }
    }

    const currentValue = getCurrentValue()

    const handleIntegerChange = (newInteger: string) => {
        // Only allow digits
        if (newInteger !== "" && !/^\d+$/.test(newInteger)) return
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${newInteger || "0"}.${decimal}` : newInteger || "0"
        handleValueChange(combinedValue)
    }

    const handleDecimalChange = (newDecimal: string) => {
        // Only allow digits, max 3 digits
        if (newDecimal !== "" && (!/^\d+$/.test(newDecimal) || newDecimal.length > 3)) return
        const integer = currentValue.integer || "0"
        const combinedValue = newDecimal ? `${integer}.${newDecimal}` : integer
        handleValueChange(combinedValue)
    }

    const handleIntegerBlur = () => {
        // Ensure at least "0" if empty
        if (!currentValue.integer) {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `0.${decimal}` : "0"
            handleBlur(combinedValue)
        } else {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `${currentValue.integer}.${decimal}` : currentValue.integer
            handleBlur(combinedValue)
        }
    }

    const handleDecimalBlur = () => {
        const integer = currentValue.integer || "0"
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${integer}.${decimal}` : integer
        handleBlur(combinedValue)
    }

    // Calculate and display final value
    const calculatedPremium = calculatePremium(config, boatValue)

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ color: colors.gray600, fontSize: "14px", marginBottom: "4px", fontFamily: ENHANCED_FONT_STACK }}>
                Premie Berekening
            </div>
            
            {/* Value Input - Conditional based on method */}
            <div>
                {config.method === "percentage" ? (
                    // Split Integer and Decimal for percentage
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="text"
                                value={currentValue.integer}
                                onChange={(e) => handleIntegerChange(e.target.value)}
                                onBlur={handleIntegerBlur}
                                placeholder="0"
                                style={{
                                    width: "60px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: ENHANCED_FONT_STACK,
                                    textAlign: "right",
                                }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>.</span>
                            <input
                                type="text"
                                value={currentValue.decimal}
                                onChange={(e) => handleDecimalChange(e.target.value)}
                                onBlur={handleDecimalBlur}
                                placeholder="000"
                                maxLength={3}
                                style={{
                                    width: "50px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: ENHANCED_FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>%</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Percentage (max 3 decimalen) = {formatCurrency(calculatedPremium)}
                        </span>
                    </>
                ) : (
                    // Regular input for fixed amount
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="number"
                                step="0.01"
                                value={config.fixedAmount || ""}
                                onChange={(e) => handleValueChange(e.target.value)}
                                onBlur={(e) => handleBlur(e.target.value)}
                                placeholder="0.00"
                                style={{
                                    width: "120px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: ENHANCED_FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>€</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Euro (max 2 decimalen)
                        </span>
                    </>
                )}
            </div>

            {/* Method Selection */}
            <div style={{ display: "flex", gap: "16px" }}>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: ENHANCED_FONT_STACK,
                    }}
                >
                    <input
                        type="radio"
                        name="premiumMethod"
                        value="fixed"
                        checked={config.method === "fixed"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as PremiumCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Vast bedrag
                </label>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: ENHANCED_FONT_STACK,
                    }}
                >
                    <input
                        type="radio"
                        name="premiumMethod"
                        value="percentage"
                        checked={config.method === "percentage"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as PremiumCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Percentage van bootwaarde
                </label>
            </div>
        </div>
    )
}

// Enhanced Own Risk Input Component - allows admins to set eigen risico as fixed amount or percentage
function EnhancedOwnRiskInput({
    config,
    onChange,
    boatValue,
}: {
    config: OwnRiskConfig
    onChange: (config: OwnRiskConfig) => void
    boatValue: number
}) {
    const handleMethodChange = (method: OwnRiskCalculationMethod) => {
        // Preserve existing values when switching methods
        const newConfig: OwnRiskConfig = {
            ...config,
            method,
            fixedAmount: config.fixedAmount || 0,
            percentage: config.percentage || 0,
        }
        onChange(newConfig)
    }

    const handleValueChange = (value: string | number) => {
        // Store raw value to allow partial decimals
        if (config.method === "fixed") {
            onChange({ ...config, fixedAmount: value })
        } else {
            onChange({ ...config, percentage: value })
        }
    }

    const handleBlur = (value: string) => {
        if (value === "" || value === ".") {
            // Reset to 0 if empty or just a dot
            if (config.method === "fixed") {
                onChange({ ...config, fixedAmount: 0 })
            } else {
                onChange({ ...config, percentage: 0 })
            }
            return
        }

        const numValue = parseFloat(value)
        if (!isNaN(numValue)) {
            if (config.method === "fixed") {
                // Round to nearest 50 for fixed amount on blur
                const roundedValue = Math.round(numValue / 50) * 50
                onChange({ ...config, fixedAmount: roundedValue })
            } else {
                // Round to 3 decimals for percentage on blur
                const roundedValue = Math.round(numValue * 1000) / 1000
                onChange({ ...config, percentage: roundedValue })
            }
        }
    }

    // Split value into integer and decimal parts
    const getCurrentValue = () => {
        const value = config.method === "fixed" ? config.fixedAmount : config.percentage
        if (value === "" || value == null) return { integer: "", decimal: "" }
        const numValue = typeof value === "string" ? parseFloat(value) : value
        if (isNaN(numValue)) return { integer: "", decimal: "" }
        const [intPart, decPart] = numValue.toString().split(".")
        return { integer: intPart || "", decimal: decPart || "" }
    }

    const currentValue = getCurrentValue()

    const handleIntegerChange = (newInteger: string) => {
        // Only allow digits
        if (newInteger !== "" && !/^\d+$/.test(newInteger)) return
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${newInteger || "0"}.${decimal}` : newInteger || "0"
        handleValueChange(combinedValue)
    }

    const handleDecimalChange = (newDecimal: string) => {
        // Only allow digits, max 3 digits
        if (newDecimal !== "" && (!/^\d+$/.test(newDecimal) || newDecimal.length > 3)) return
        const integer = currentValue.integer || "0"
        const combinedValue = newDecimal ? `${integer}.${newDecimal}` : integer
        handleValueChange(combinedValue)
    }

    const handleIntegerBlur = () => {
        // Ensure at least "0" if empty
        if (!currentValue.integer) {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `0.${decimal}` : "0"
            handleBlur(combinedValue)
        } else {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `${currentValue.integer}.${decimal}` : currentValue.integer
            handleBlur(combinedValue)
        }
    }

    const handleDecimalBlur = () => {
        const integer = currentValue.integer || "0"
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${integer}.${decimal}` : integer
        handleBlur(combinedValue)
    }

    // Calculate and display final value
    const calculatedOwnRisk = calculateOwnRisk(config, boatValue)

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ color: colors.gray600, fontSize: "14px", marginBottom: "4px", fontFamily: ENHANCED_FONT_STACK }}>
                Eigen Risico Berekening
            </div>
            
            {/* Value Input - Conditional based on method */}
            <div>
                {config.method === "percentage" ? (
                    // Split Integer and Decimal for percentage
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="text"
                                value={currentValue.integer}
                                onChange={(e) => handleIntegerChange(e.target.value)}
                                onBlur={handleIntegerBlur}
                                placeholder="0"
                                style={{
                                    width: "60px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: ENHANCED_FONT_STACK,
                                    textAlign: "right",
                                }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>.</span>
                            <input
                                type="text"
                                value={currentValue.decimal}
                                onChange={(e) => handleDecimalChange(e.target.value)}
                                onBlur={handleDecimalBlur}
                                placeholder="000"
                                maxLength={3}
                                style={{
                                    width: "50px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: ENHANCED_FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>%</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Percentage (max 3 decimalen) = {formatCurrency(calculatedOwnRisk)}
                        </span>
                    </>
                ) : (
                    // Regular input for fixed amount
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="number"
                                step="50"
                                value={config.fixedAmount || ""}
                                onChange={(e) => handleValueChange(e.target.value)}
                                onBlur={(e) => handleBlur(e.target.value)}
                                placeholder="0"
                                style={{
                                    width: "120px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: ENHANCED_FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>€</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Euro (afgerond op €50)
                        </span>
                    </>
                )}
            </div>

            {/* Method Selection */}
            <div style={{ display: "flex", gap: "16px" }}>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: ENHANCED_FONT_STACK,
                    }}
                >
                    <input
                        type="radio"
                        name="ownRiskMethod"
                        value="fixed"
                        checked={config.method === "fixed"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as OwnRiskCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Vast bedrag
                </label>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                        fontFamily: ENHANCED_FONT_STACK,
                    }}
                >
                    <input
                        type="radio"
                        name="ownRiskMethod"
                        value="percentage"
                        checked={config.method === "percentage"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as OwnRiskCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Percentage van bootwaarde
                </label>
            </div>
        </div>
    )
}

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
        { type: "boot", count: stats.boats, label: "Boten", icon: FaShip, color: "#3b82f6" },
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
    onApprove: (object: PendingInsuredObject, customValues?: { premiumConfig: PremiumConfig, ownRiskConfig: OwnRiskConfig }) => void
    onDecline: (object: PendingInsuredObject, reason: string) => void
    onViewDetails: (object: PendingInsuredObject) => void
    isLoading: boolean
}) {
    console.log("PendingObjectRow rendering with object:", object)
    
    const [showDeclineModal, setShowDeclineModal] = useState(false)
    const [declineReason, setDeclineReason] = useState("")
    const [isProcessing, setIsProcessing] = useState(false)
    
    // State for edited calculated field values with calculation methods
    // Initialize with existing values if available, otherwise use defaults
    const [premiumConfig, setPremiumConfig] = useState<PremiumConfig>(() => {
        // Match auto-approver behavior: read from premiumPercentage or premiumFixedAmount
        if (object.premiumMethod) {
            return {
                method: object.premiumMethod,
                percentage: object.premiumMethod === "percentage" ? (object.premiumPercentage || object.premiepercentage || 0) : 0,
                fixedAmount: object.premiumMethod === "fixed" ? (object.premiumFixedAmount || 0) : 0
            }
        }
        // Otherwise, default to percentage method with 0
        return {
            method: "percentage",
            percentage: 0,
            fixedAmount: 0
        }
    })

    const [ownRiskConfig, setOwnRiskConfig] = useState<OwnRiskConfig>(() => {
        // For eigenRisico, we only have the calculated amount, so default to fixed with that amount
        // Admin can change the method and value as needed
        return {
            method: "fixed",
            fixedAmount: object.eigenRisico || 0,
            percentage: 0
        }
    })
    
    // Calculate final values based on method
    const finalPremiumValue = calculatePremium(premiumConfig, object.waarde)
    const finalOwnRiskValue = calculateOwnRisk(ownRiskConfig, object.waarde)
    
    // Track if values have been edited
    const hasEditedValues = finalPremiumValue !== object.premiepercentage || 
                           finalOwnRiskValue !== object.eigenRisico

    // Add error handling for utility function calls
    let daysAgo = 0
    let isUrgent = false
    let displayName = "Onbekend Object"
    let objectTypeName = "Onbekend"
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
        displayName = `Object ${object.id?.slice(-8) || 'Onbekend'}`
    }

    try {
        objectTypeName = getObjectTypeName(object.objectType)
        console.log("Object type name calculation successful:", objectTypeName)
    } catch (error) {
        console.error("Error calculating object type name for object:", object, error)
        objectTypeName = "Onbekend"
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
            // Pass custom values if they've been edited
            if (hasEditedValues) {
                await onApprove(object, {
                    premiumConfig: premiumConfig,
                    ownRiskConfig: ownRiskConfig
                })
            } else {
                await onApprove(object)
            }
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
                                    disabled={isLoading || isProcessing || finalPremiumValue === 0 || finalOwnRiskValue === 0}
                                    style={{
                                        backgroundColor: hasEditedValues ? "#f59e0b" : "#10b981",
                                        color: colors.white,
                                        border: "none",
                                        borderRadius: "6px",
                                        padding: "8px 12px",
                                        fontSize: "14px",
                                        fontWeight: "500",
                                        cursor: (isLoading || isProcessing || finalPremiumValue === 0 || finalOwnRiskValue === 0) ? "not-allowed" : "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        fontFamily: ENHANCED_FONT_STACK,
                                        transition: "all 0.2s",
                                        opacity: (isLoading || isProcessing || finalPremiumValue === 0 || finalOwnRiskValue === 0) ? 0.6 : 1,
                                    }}
                                    title={
                                        finalPremiumValue === 0 || finalOwnRiskValue === 0
                                            ? "Premie promillage en eigen risico moeten beide ingevuld zijn"
                                            : hasEditedValues
                                            ? "Goedkeuren met aangepaste waarden"
                                            : "Goedkeuren met standaard waarden"
                                    }
                                    onMouseOver={(e) => {
                                        if (!isLoading && !isProcessing && finalPremiumValue !== 0 && finalOwnRiskValue !== 0) {
                                            (e.target as HTMLElement).style.backgroundColor = hasEditedValues ? "#d97706" : "#059669"
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isLoading && !isProcessing && finalPremiumValue !== 0 && finalOwnRiskValue !== 0) {
                                            (e.target as HTMLElement).style.backgroundColor = hasEditedValues ? "#f59e0b" : "#10b981"
                                        }
                                    }}
                                >
                                    <FaCheck size={12} />
                                    {isProcessing ? "..." : hasEditedValues ? "Goedkeuren*" : "Goedkeuren"}
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
                            <EnhancedPremiumInput
                                config={premiumConfig}
                                onChange={setPremiumConfig}
                                boatValue={object.waarde}
                            />
                            <EnhancedOwnRiskInput
                                config={ownRiskConfig}
                                onChange={setOwnRiskConfig}
                                boatValue={object.waarde}
                            />
                        </div>

                        {/* Validation warning */}
                        {(finalPremiumValue === 0 || finalOwnRiskValue === 0) && (
                            <div
                                style={{
                                    marginTop: "12px",
                                    padding: "12px",
                                    backgroundColor: "#fef3c7",
                                    borderRadius: "8px",
                                    border: "1px solid #fde68a",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <FaExclamationTriangle style={{ color: "#92400e", fontSize: "14px" }} />
                                <div
                                    style={{
                                        fontSize: "13px",
                                        color: "#92400e",
                                        fontFamily: ENHANCED_FONT_STACK,
                                    }}
                                >
                                    <strong>Let op:</strong> Premie promillage en eigen risico moeten beide ingevuld zijn voordat het object goedgekeurd kan worden.
                                </div>
                            </div>
                        )}

                        {/* Rejection Reasons */}
                        {object.rejectionReasons && (
                            <div
                                style={{
                                    marginTop: "12px",
                                    padding: "16px",
                                    backgroundColor: "#fef2f2",
                                    borderRadius: "8px",
                                    border: "1px solid #fecaca",
                                }}
                            >
                                <div
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        marginBottom: "12px",
                                    }}
                                >
                                    <FaExclamationTriangle style={{ color: "#dc2626", fontSize: "16px" }} />
                                    <div
                                        style={{
                                            fontSize: "14px",
                                            fontWeight: "600",
                                            color: "#991b1b",
                                            fontFamily: ENHANCED_FONT_STACK,
                                        }}
                                    >
                                        Waarom dit object niet automatisch is goedgekeurd
                                    </div>
                                </div>

                                {object.rejectionReasons.ingangsdatum_override && (
                                    <div
                                        style={{
                                            padding: "8px 12px",
                                            backgroundColor: "#ffffff",
                                            borderRadius: "6px",
                                            marginBottom: "8px",
                                            border: "1px solid #fca5a5",
                                        }}
                                    >
                                        <div style={{ fontSize: "13px", color: "#7f1d1d", fontFamily: ENHANCED_FONT_STACK }}>
                                            <strong>Ingangsdatum te ver in het verleden:</strong> De ingangsdatum ligt meer dan één week in het verleden. Objecten met een ingangsdatum ouder dan 7 dagen vereisen altijd handmatige goedkeuring.
                                        </div>
                                    </div>
                                )}

                                {object.rejectionReasons.rules_evaluated && object.rejectionReasons.rules_evaluated.length > 0 && (
                                    <div
                                        style={{
                                            fontSize: "13px",
                                            color: "#7f1d1d",
                                            fontFamily: ENHANCED_FONT_STACK,
                                        }}
                                    >
                                        <div style={{ marginBottom: "8px", fontWeight: "500" }}>
                                            Auto-goedkeuringsregels gecontroleerd: {object.rejectionReasons.rules_evaluated.length}
                                        </div>
                                        {object.rejectionReasons.rules_evaluated.map((rule, idx) => (
                                            <div
                                                key={idx}
                                                style={{
                                                    padding: "12px",
                                                    backgroundColor: "#ffffff",
                                                    borderRadius: "6px",
                                                    marginBottom: "8px",
                                                    border: "1px solid #fca5a5",
                                                }}
                                            >
                                                <div style={{ fontWeight: "600", marginBottom: "8px" }}>
                                                    Regel: {rule.rule_name} ({rule.logic})
                                                </div>
                                                <div style={{ marginBottom: "4px", color: "#991b1b" }}>
                                                    Doorstaan: {rule.passed_conditions}/{rule.total_conditions} voorwaarden
                                                </div>
                                                {rule.failed_conditions.length > 0 && (
                                                    <div style={{ marginTop: "8px" }}>
                                                        <div style={{ fontWeight: "500", marginBottom: "4px" }}>
                                                            Niet voldaan aan:
                                                        </div>
                                                        {rule.failed_conditions.map((condition, cidx) => (
                                                            <div
                                                                key={cidx}
                                                                style={{
                                                                    padding: "6px 8px",
                                                                    backgroundColor: "#fef2f2",
                                                                    borderRadius: "4px",
                                                                    marginBottom: "4px",
                                                                    fontSize: "12px",
                                                                }}
                                                            >
                                                                <div>
                                                                    <strong>{condition.field}:</strong> Verwacht {condition.operator === 'between' ? 'tussen' : condition.operator === 'in' ? 'een van' : condition.operator} {JSON.stringify(condition.expected)}
                                                                </div>
                                                                <div style={{ color: "#991b1b" }}>
                                                                    Daadwerkelijk: {JSON.stringify(condition.actual)}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {!object.rejectionReasons.ingangsdatum_override && (!object.rejectionReasons.rules_evaluated || object.rejectionReasons.rules_evaluated.length === 0) && (
                                    <div
                                        style={{
                                            padding: "8px 12px",
                                            backgroundColor: "#ffffff",
                                            borderRadius: "6px",
                                            fontSize: "13px",
                                            color: "#7f1d1d",
                                            fontFamily: ENHANCED_FONT_STACK,
                                        }}
                                    >
                                        {object.rejectionReasons.reason || 'Geen auto-goedkeuringsregels geconfigureerd voor deze organisatie.'}
                                    </div>
                                )}
                            </div>
                        )}

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
                        <option value="boot">Boten</option>
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
                    premiepercentage: obj.premiepercentage || 0,
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
    const handleApprove = useCallback(async (
        object: PendingInsuredObject,
        customValues?: { premiumConfig: PremiumConfig, ownRiskConfig: OwnRiskConfig }
    ) => {
        try {
            setIsProcessing(true)

            // If custom values are provided, validate them
            if (customValues) {
                const finalPremium = calculatePremium(customValues.premiumConfig, object.waarde)
                const finalOwnRisk = calculateOwnRisk(customValues.ownRiskConfig, object.waarde)

                if (finalPremium === 0 || finalOwnRisk === 0) {
                    setError("Premiepromillage en eigen risico moeten beide ingevuld zijn voordat u kunt goedkeuren.")
                    setTimeout(() => setError(null), 5000)
                    setIsProcessing(false)
                    return
                }

                await approveObjectWithCustomValues(object.id, customValues.premiumConfig, customValues.ownRiskConfig)
                setSuccess(`${getObjectDisplayName(object)} is goedgekeurd met aangepaste waarden.`)
            } else {
                // Validate default values
                if (object.premiepercentage === 0 || object.eigenRisico === 0) {
                    setError("Premiepromillage en eigen risico moeten beide ingevuld zijn voordat u kunt goedkeuren.")
                    setTimeout(() => setError(null), 5000)
                    setIsProcessing(false)
                    return
                }

                await approveObject(object.id)
                setSuccess(`${getObjectDisplayName(object)} is goedgekeurd.`)
            }
            
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
                                    { key: "pending", label: "Pending Items", icon: FaClock, href: "/pending-overview" },
                                    { key: "users", label: "Gebruikers", icon: FaUsers, href: "/users" },
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
                                            backgroundColor: isActive ? colors.navigationActive : colors.navigationInactive,
                                            color: isActive ? "white" : colors.gray500,
                                            border: isActive ? "none" : `2px solid ${colors.navigationInactiveBorder}`,
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