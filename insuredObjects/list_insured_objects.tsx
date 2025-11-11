// src/InsuredObjectListOverride.tsx (Role-aware insured object management system)
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override } from "framer"
import { useState, useEffect, useCallback } from "react"
import { UserInfoBanner } from "https://framer.com/m/UserInfoBanner-R7Q1.js@U72OHgHMkersQv4QWNRo"
import {
    UserInfo as RBACUserInfo,
    hasPermission,
    isEditor,
    isAdmin,
    isUser,
    canEditInsuredObject,
    canEditInsuredObjectField,
    getFieldDisabledTooltip,
    type InsuredObjectStatus,
} from "../Rbac.tsx"
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
    FaEllipsisV,
    FaInfoCircle,
    FaFilePdf,
    FaExclamationTriangle,
} from "react-icons/fa"
import { colors, styles, hover, FONT_STACK } from "../Theme.tsx"
import {
    API_BASE_URL,
    API_PATHS,
    getIdToken,
    formatErrorMessage,
    formatSuccessMessage,
} from "../Utils.tsx"
import {
    ObjectType,
    OBJECT_TYPE_CONFIG,
    OrganizationSelector,
    ObjectTypeSelector,
    CreateObjectModal,
} from "./Create.tsx"
import {
    getAllFilterableFields,
    getEditableFieldsForObjectType,
    getFieldKeysForObjectType,
    getFieldsForObjectType as getSchemaFieldsForObjectType,
    getFilterableFieldsForObjectType,
    getPrintableFieldsForObjectType,
    getUserInputFieldsForObjectType,
    useCompleteSchema,
    useDynamicSchema,
    useOrganizationSchema,
    type FieldSchema,
} from "https://framer.com/m/UseDynamicSchema2-sydl.js@gU5g5fSgmxqlpbHHdwQy"
import { EnhancedTotalsDisplay } from "../components/EnhancedTotalsDisplay.tsx"
import {
    calculateEnhancedTotals,
    calculateInsurancePeriod,
    calculateObjectPremiums,
    formatCalculationResults,
    generateStatusTooltip,
    shouldIncludeInPremiumCalculation,
    shouldIncludeInValueCalculation,
    updateObjectWithCalculatedPremiums,
    type InsuredObject as EnhancedInsuredObject,
} from "../premiumCalculations.tsx"

// Note: Unified field system removed - using direct field names from registry

// ——— XLSX CDN Hook ———
// Custom hook to load XLSX library from CDN (Framer-compatible)
const useXLSX = () => {
    const [XLSX, setXLSX] = useState<any>(null)

    useEffect(() => {
        // Check if already loaded
        if ((window as any).XLSX) {
            setXLSX((window as any).XLSX)
            return
        }

        const script = document.createElement("script")
        script.src = "https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js"
        script.onload = () => {
            setXLSX((window as any).XLSX)
        }
        script.onerror = () => {
            console.error("Failed to load XLSX library from CDN")
        }
        document.head.appendChild(script)

        return () => {
            // Cleanup: remove script if component unmounts
            if (script.parentNode) {
                script.parentNode.removeChild(script)
            }
        }
    }, [])

    return XLSX
}

// ——— html2canvas CDN Hook ———
// Custom hook to load html2canvas library from CDN (Framer-compatible)
const useHtml2Canvas = () => {
    const [html2canvas, setHtml2canvas] = useState<any>(null)

    useEffect(() => {
        // Check if already loaded
        if ((window as any).html2canvas) {
            setHtml2canvas(() => (window as any).html2canvas)
            return
        }

        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"
        script.onload = () => {
            setHtml2canvas(() => (window as any).html2canvas)
        }
        script.onerror = () => {
            console.error("Failed to load html2canvas library from CDN")
        }
        document.head.appendChild(script)

        return () => {
            // Cleanup: remove script if component unmounts
            if (script.parentNode) {
                script.parentNode.removeChild(script)
            }
        }
    }, [])

    return html2canvas
}

// ——— jsPDF CDN Hook ———
// Custom hook to load jsPDF library from CDN (Framer-compatible)
const useJsPDF = () => {
    const [jsPDF, setJsPDF] = useState<any>(null)

    useEffect(() => {
        // Check if already loaded
        if ((window as any).jspdf?.jsPDF) {
            setJsPDF(() => (window as any).jspdf.jsPDF)
            return
        }

        const script = document.createElement("script")
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"
        script.onload = () => {
            setJsPDF(() => (window as any).jspdf.jsPDF)
        }
        script.onerror = () => {
            console.error("Failed to load jsPDF library from CDN")
        }
        document.head.appendChild(script)

        return () => {
            // Cleanup: remove script if component unmounts
            if (script.parentNode) {
                script.parentNode.removeChild(script)
            }
        }
    }, [])

    return jsPDF
}

// ——— Simple Create Button Component ———
function CreateObjectButton({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <button
            onClick={onCreateClick}
            style={{
                ...styles.createButton,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: colors.actionCreate,
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: `0 2px 4px ${colors.actionCreate}30`,
                transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
                const target = e.target as HTMLElement
                hover.createButton(target)
                target.style.transform = "translateY(-1px)"
                target.style.boxShadow = `0 4px 8px ${colors.actionCreate}40`
            }}
            onMouseOut={(e) => {
                const target = e.target as HTMLElement
                hover.resetCreateButton(target)
                target.style.transform = "translateY(0)"
                target.style.boxShadow = `0 2px 4px ${colors.actionCreate}30`
            }}
        >
            <FaPlus size={12} />
            Voeg verzekerd object toe
        </button>
    )
}

// ——— Export to PDF Button Component ———
function ExportPdfButton({ onExportClick }: { onExportClick: () => void }) {
    return (
        <button
            onClick={onExportClick}
            style={{
                ...styles.secondaryButton,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: colors.gray100,
                color: colors.gray700,
                border: `1px solid ${colors.gray200}`,
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: `0 1px 2px ${colors.gray400}20`,
                transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
                const target = e.target as HTMLElement
                target.style.backgroundColor = colors.gray200
                target.style.transform = "translateY(-1px)"
                target.style.boxShadow = `0 2px 4px ${colors.gray400}30`
            }}
            onMouseOut={(e) => {
                const target = e.target as HTMLElement
                target.style.backgroundColor = colors.gray100
                target.style.transform = "translateY(0)"
                target.style.boxShadow = `0 1px 2px ${colors.gray400}20`
            }}
        >
            <FaFilePdf size={12} />
            Exporteer als PDF
        </button>
    )
}

// ——— Export to Excel Button Component ———
function ExportExcelButton({ onExportClick }: { onExportClick: () => void }) {
    return (
        <button
            onClick={onExportClick}
            style={{
                ...styles.secondaryButton,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: "#10b981",
                color: "#ffffff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(16, 185, 129, 0.2)",
                transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
                const target = e.target as HTMLElement
                target.style.backgroundColor = "#059669"
                target.style.transform = "translateY(-1px)"
                target.style.boxShadow = "0 2px 4px rgba(16, 185, 129, 0.3)"
            }}
            onMouseOut={(e) => {
                const target = e.target as HTMLElement
                target.style.backgroundColor = "#10b981"
                target.style.transform = "translateY(0)"
                target.style.boxShadow = "0 1px 2px rgba(16, 185, 129, 0.2)"
            }}
        >
            <FaFileContract size={12} />
            Export naar Excel
        </button>
    )
}

// ——— Status color mapping ———
const STATUS_COLORS = {
    Insured: { bg: "#dcfce7", text: "#166534" },
    Pending: { bg: "#fef3c7", text: "#92400e" },
    Rejected: { bg: "#fee2e2", text: "#991b1b" },
    Removed: { bg: "#f3f4f6", text: "#6b7280" }, // Grey/faded for sold boats
    "Not Insured": { bg: "#f3f4f6", text: "#374151" },
}

// ——— Status translation mapping ———
const STATUS_TRANSLATIONS = {
    Insured: "Verzekerd",
    Pending: "In behandeling",
    Rejected: "Afgewezen",
    Removed: "Afgevoerd",
    "Not Insured": "Niet verzekerd",
}

// ——— Premium Method translation mapping ———
const PREMIUM_METHOD_TRANSLATIONS = {
    fixed: "vast",
    percentage: "percentage",
}

// ——— Simple Tooltip Component ———
function StatusTooltip({
    children,
    tooltip,
    show,
}: {
    children: React.ReactNode
    tooltip: string
    show: boolean
}) {
    const [isVisible, setIsVisible] = useState(false)

    if (!show) return <>{children}</>

    return (
        <div
            style={{ position: "relative", display: "inline-block" }}
            onMouseEnter={() => setIsVisible(true)}
            onMouseLeave={() => setIsVisible(false)}
        >
            {children}
            {isVisible && (
                <div
                    style={{
                        position: "absolute",
                        bottom: "calc(100% + 8px)",
                        left: "50%",
                        transform: "translateX(-50%)",
                        backgroundColor: "#1f2937",
                        color: "white",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        lineHeight: "1.4",
                        whiteSpace: "nowrap",
                        maxWidth: "250px",
                        whiteSpace: "normal",
                        zIndex: 1000,
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        pointerEvents: "none",
                        animation: "fadeIn 0.2s ease-out",
                    }}
                >
                    {tooltip}
                    <div
                        style={{
                            position: "absolute",
                            top: "100%",
                            left: "50%",
                            transform: "translateX(-50%)",
                            width: 0,
                            height: 0,
                            borderLeft: "6px solid transparent",
                            borderRight: "6px solid transparent",
                            borderTop: "6px solid #1f2937",
                        }}
                    />
                </div>
            )}
        </div>
    )
}

// ——— Unified Status Component ———
function UnifiedStatusCell({
    object,
    userInfo,
}: {
    object: InsuredObject
    userInfo: UserInfo | null
}) {
    const statusColor =
        STATUS_COLORS[object.status] || STATUS_COLORS["Not Insured"]

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                position: "relative",
                minWidth: "80px",
            }}
        >
            {/* Combined Status Badge - with decline reason for rejected objects */}
            {object.status === "Rejected" && object.declineReason ? (
                <div
                    style={{
                        padding: "10px 12px",
                        borderRadius: "8px",
                        backgroundColor: "#fee2e2",
                        border: "1px solid #fca5a5",
                        fontSize: "12px",
                        lineHeight: "1.5",
                        color: "#7f1d1d",
                        maxWidth: "280px",
                        wordBreak: "break-word",
                        whiteSpace: "normal",
                    }}
                >
                    <div style={{ 
                        fontWeight: "600", 
                        marginBottom: "6px", 
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        whiteSpace: "nowrap"
                    }}>
                        {STATUS_TRANSLATIONS[object.status] || object.status}
                    </div>
                    <div style={{ fontSize: "11px", lineHeight: "1.4", wordBreak: "break-word" }}>
                        {object.declineReason}
                    </div>
                </div>
            ) : (
                <div
                    style={{
                        padding: "4px 8px",
                        borderRadius: "12px",
                        backgroundColor: statusColor.bg,
                        color: statusColor.text,
                        fontSize: "12px",
                        fontWeight: "500",
                        whiteSpace: "nowrap",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        border:
                            object.status === "Removed"
                                ? "1px solid #9ca3af"
                                : "none",
                    }}
                >
                    {STATUS_TRANSLATIONS[object.status] || object.status}
                </div>
            )}
        </div>
    )
}

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

        const userData = responseData.user || responseData

        const processedUserInfo = {
            sub: cognitoSub,
            role: userData.role || "user",
            organization: userData.organization,
            organizations: userData.organizations || [],
        }

        return processedUserInfo
    } catch (error) {
        console.error("Failed to fetch user info:", error)
        return null
    }
}

// Broker info interface (matching UserInfoBanner)
interface BrokerInfo {
    name: string
    email: string
    phone: string
    company?: string
}

// Organization info interface
interface OrganizationInfo {
    id: string
    name: string
    polisnummer?: string
    street?: string
    postal_code?: string
    city?: string
    country?: string
    type_organisatie?: string
}

// Fetch organization details
async function fetchOrganizationInfo(
    organizationName: string
): Promise<OrganizationInfo | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }

        if (token) {
            headers["Authorization"] = `Bearer ${token}`
        }

        const url = `${API_BASE_URL}/neptunus/organization/by-name/${encodeURIComponent(organizationName)}`
        console.log("Fetching organization from URL:", url)

        const response = await fetch(url, {
            method: "GET",
            headers,
        })

        console.log("Organization fetch response status:", response.status)

        if (!response.ok) {
            const errorText = await response.text()
            console.warn(`Failed to fetch organization info: ${response.status} - ${errorText}`)
            return null
        }

        const data = await response.json()
        console.log("Organization API response:", data)
        return data.organization || null
    } catch (error) {
        console.error("Error fetching organization info:", error)
        return null
    }
}

// Fetch broker info from policies for the organization
async function fetchBrokerInfoForOrganization(
    organizationName: string
): Promise<BrokerInfo | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        // Fetch policies for this organization
        const res = await fetch(
            `${API_BASE_URL}${API_PATHS.POLICY}?organization=${encodeURIComponent(organizationName)}`,
            {
                method: "GET",
                headers,
                mode: "cors",
            }
        )

        if (!res.ok) {
            console.warn(
                `Failed to fetch policies for broker info: ${res.status} ${res.statusText}`
            )
            return null
        }

        const responseData = await res.json()
        const policies = responseData.policies || []

        if (policies.length === 0) {
            return null
        }

        // Get broker info from the first policy (assuming same broker for organization)
        const firstPolicy = policies[0]
        if (
            firstPolicy.makelaarsnaam &&
            (firstPolicy.makelaarsemail || firstPolicy.makelaarstelefoon)
        ) {
            return {
                name: firstPolicy.makelaarsnaam || "Onbekende Makelaar",
                email: firstPolicy.makelaarsemail || "",
                phone: firstPolicy.makelaarstelefoon || "",
                company: "Verzekeringsmakelaar", // You might want to add this field to policies
            }
        }

        return null
    } catch (error) {
        console.error("Failed to fetch broker info:", error)
        return null
    }
}

function getFieldsFromSchema(
    schema: FieldSchema[] | null,
    objectType: ObjectType
): FieldSchema[] {
    console.log("🔍 LIST getFieldsFromSchema DEBUG START")
    console.log("Schema received:", schema)
    console.log("Object type:", objectType)

    if (!schema) {
        console.log("❌ No schema provided, using fallback hardcoded fields")
        // Fallback to minimal required fields
        const commonFields: FieldSchema[] = [
            {
                key: "waarde",
                label: "Waarde",
                type: "currency",
                group: "basic",
                required: true,
                visible: true,
                sortable: true,
                width: "120px",
            },
            {
                key: "ingangsdatum",
                label: "Ingangsdatum",
                type: "date",
                group: "basic",
                required: false,
                visible: true,
                sortable: true,
                width: "120px",
            },
            {
                key: "naam",
                label: "Naam",
                type: "text",
                group: "basic",
                required: false,
                visible: true,
                sortable: true,
                width: "150px",
            },
            {
                key: "notitie",
                label: "Notitie",
                type: "textarea",
                group: "metadata",
                required: false,
                visible: true,
                sortable: false,
                width: "200px",
            },
        ]

        let typeSpecificFields: FieldSchema[] = []
        switch (objectType) {
            case "boot":
                typeSpecificFields = [
                    {
                        key: "merkBoot",
                        label: "Merk Boot",
                        type: "text",
                        group: "basic",
                        required: true,
                        visible: true,
                        sortable: true,
                        width: "120px",
                    },
                    {
                        key: "typeBoot",
                        label: "Type Boot",
                        type: "text",
                        group: "basic",
                        required: true,
                        visible: true,
                        sortable: true,
                        width: "120px",
                    },
                ]
                break
            case "trailer":
                typeSpecificFields = [
                    {
                        key: "chassisnummer",
                        label: "Chassisnummer",
                        type: "text",
                        group: "basic",
                        required: true,
                        visible: true,
                        sortable: true,
                        width: "130px",
                    },
                ]
                break
            case "motor":
                typeSpecificFields = [
                    {
                        key: "merkMotor",
                        label: "Merk Motor",
                        type: "text",
                        group: "basic",
                        required: true,
                        visible: true,
                        sortable: true,
                        width: "120px",
                    },
                    {
                        key: "typeMotor",
                        label: "Type Motor",
                        type: "text",
                        group: "basic",
                        required: true,
                        visible: true,
                        sortable: true,
                        width: "120px",
                    },
                    {
                        key: "motornummer",
                        label: "Motor Nummer",
                        type: "text",
                        group: "basic",
                        required: true,
                        visible: true,
                        sortable: true,
                        width: "120px",
                    },
                ]
                break
        }

        const fallbackResult = [...typeSpecificFields, ...commonFields]
        console.log(
            "✅ Using fallback fields:",
            fallbackResult.map((f) => ({ key: f.key, label: f.label }))
        )
        console.log("🔍 LIST getFieldsFromSchema DEBUG END")
        return fallbackResult
    }

    console.log("📊 Total fields in schema:", schema.length)
    console.log(
        "📋 All schema fields:",
        schema.map((f) => ({
            key: f.key,
            label: f.label,
            objectTypes: f.objectTypes,
            visible: f.visible,
            inputType: f.inputType,
        }))
    )

    // Debug: Check if any fields have inputType
    const fieldsWithInputType = schema.filter((f) => f.inputType)
    const fieldsWithoutInputType = schema.filter((f) => !f.inputType)
    console.log(
        `🔍 Fields WITH inputType: ${fieldsWithInputType.length}`,
        fieldsWithInputType.map((f) => ({ key: f.key, inputType: f.inputType }))
    )
    console.log(
        `🔍 Fields WITHOUT inputType: ${fieldsWithoutInputType.length}`,
        fieldsWithoutInputType.map((f) => f.key)
    )

    // For CREATE FORMS: Show ALL user input fields regardless of visible setting
    const filteredFields = getUserInputFieldsForObjectType(schema, objectType)

    console.log("✅ Final filtered fields:", filteredFields.length)
    console.log(
        "✅ Final fields:",
        filteredFields.map((f) => ({
            key: f.key,
            label: f.label,
            visible: f.visible,
            required: f.required,
        }))
    )
    console.log("🔍 LIST getFieldsFromSchema DEBUG END")

    return filteredFields
}

function getUserInfo(): UserInfo | null {
    try {
        const token = getIdToken()
        if (!token) return null

        const payload = JSON.parse(atob(token.split(".")[1]))

        return {
            sub: payload.sub,
            role: "user", // Temporary default, will be updated by fetchUserInfo
            organization: undefined,
            organizations: [],
        }
    } catch (error) {
        console.error("Failed to decode user info:", error)
        return null
    }
}

// ——— Insured Object Interface ———
// Base interface with core required fields
interface BaseInsuredObject {
    id: string
    objectType: ObjectType
    status: InsuredObjectStatus
    waarde: number // value
    organization: string
    ingangsdatum: string // insuranceStartDate
    uitgangsdatum?: string // insuranceEndDate
    premiepercentage: number // premiumPerMille (for percentage method: stores the %, for fixed: not used)
    premiepromillage?: number // Old legacy field (per mille - backward compatibility)
    premiumMethod?: "percentage" | "fixed" // Premium calculation method
    premiumPercentage?: number // Premium percentage value (when method is percentage)
    premiumFixedAmount?: number // Premium fixed amount (when method is fixed)
    eigenRisico: number // deductible (calculated amount)
    naam?: string // name/title
    notitie?: string // notes
    declineReason?: string // reason for rejection
    createdAt: string
    updatedAt: string
    lastUpdatedBy?: string
}

// Dynamic interface that allows for flexible field access
interface InsuredObject extends BaseInsuredObject {
    // Allow any additional fields from dynamic schema
    [key: string]: any

    // Common optional fields (for backwards compatibility)
    // Boat-specific fields (Registry field names - camelCase Dutch)
    ligplaats?: string
    merkBoot?: string
    typeBoot?: string
    aantalMotoren?: number
    typeMotor?: string // Updated from typeMerkMotor
    merkMotor?: string // New field from registry
    bouwjaar?: number
    rompnummer?: string // Updated from bootnummer
    motornummer?: string
    cinNummer?: string

    // Trailer-specific fields (Registry field names)
    chassisnummer?: string // Updated from trailerRegistratienummer

    // Motor-specific fields share with boats - no separate fields needed
    motorVermogen?: number
    motorSerienummer?: string
    motorBrandstoftype?: string
    motorJaar?: number

    // Other object fields
    objectDescription?: string
    objectBrand?: string
    objectModel?: string
    objectSerialNumber?: string
}

// ——— Column Groups and Definitions ———
// Removed COLUMN_GROUPS - no more basic/metadata separation

// Dynamic schema system now handles column definitions

// Helper function to render cell values using dynamic schema
function renderObjectCellValue(
    column: FieldSchema | { key: string; label: string },
    value: any,
    obj?: any
): string {
    if (value === null || value === undefined) return "-"

    // Use schema type information if available
    if ("type" in column) {
        const fieldSchema = column as FieldSchema

        switch (fieldSchema.type) {
            case "currency":
                return `€${Number(value).toLocaleString("nl-NL", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                })}`
            case "number":
                // Handle backward compatibility for premiepercentage/premiepromillage
                if (column.key === "premiepercentage" && obj) {
                    let percentageValue = Number(value)
                    if ((percentageValue === 0 || !percentageValue) && obj.premiepromillage) {
                        // Convert promillage to percentage (divide by 10)
                        percentageValue = Number(obj.premiepromillage) / 10
                    }
                    return `${percentageValue.toFixed(2)}%`
                }
                return value ? String(value) : "-"
            case "date":
                if (!value) return "-"
                return new Date(value).toLocaleDateString("nl-NL")
            case "status":
                return String(value)
            case "textarea":
            case "text":
            default:
                return String(value)
        }
    } else {
        // Fallback to legacy key-based logic for backwards compatibility
        switch (column.key) {
            case "waarde": // value
            case "eigenRisico": // deductible
                return `€${Math.round(Number(value)).toLocaleString("nl-NL")}`
            case "totalePremieOverDeVerzekerdePeriode": // period premium
            case "totalePremieOverHetJaar": // yearly premium
                return formatCurrency(Number(value), "EUR", 2)
            case "premiepercentage": // premium percentage
                // Handle backward compatibility with premiepromillage
                let percentageValue = Number(value)
                if ((percentageValue === 0 || !percentageValue) && obj.premiepromillage) {
                    // Convert promillage to percentage (divide by 10)
                    percentageValue = Number(obj.premiepromillage) / 10
                }
                return `${percentageValue.toFixed(2)}%`
            case "ingangsdatum": // insuranceStartDate
            case "uitgangsdatum": // insuranceEndDate
            case "createdAt":
                if (!value) return "-"
                return new Date(value).toLocaleDateString("nl-NL")
            case "aantalMotoren": // numberOfEngines
            case "trailerAxles":
                return value ? String(value) : "-"
            case "trailerWeight":
            case "trailerCapacity":
                return value ? `${value}kg` : "-"
            case "motorPower":
                return value ? `${value}HP` : "-"
            case "bouwjaar": // yearOfConstruction
            case "motorYear":
                return value ? String(value) : "-"
            default:
                return String(value)
        }
    }
}

// Sort function for objects
function sortObjects(
    objects: InsuredObject[],
    sortColumn: string | null,
    sortDirection: 'asc' | 'desc' | null
): InsuredObject[] {
    if (!sortColumn || !sortDirection) {
        return objects
    }

    return [...objects].sort((a, b) => {
        const aValue = a[sortColumn as keyof InsuredObject]
        const bValue = b[sortColumn as keyof InsuredObject]

        // Handle null/undefined values - put them at the end
        if (aValue == null && bValue == null) return 0
        if (aValue == null) return 1
        if (bValue == null) return -1

        // Convert to comparable values
        let aComp: string | number = aValue
        let bComp: string | number = bValue

        // Handle different data types
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            aComp = aValue
            bComp = bValue
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            // Case-insensitive string comparison
            aComp = aValue.toLowerCase()
            bComp = bValue.toLowerCase()
        } else {
            // Convert to string for comparison
            aComp = String(aValue).toLowerCase()
            bComp = String(bValue).toLowerCase()
        }

        // Compare
        if (aComp < bComp) {
            return sortDirection === 'asc' ? -1 : 1
        }
        if (aComp > bComp) {
            return sortDirection === 'asc' ? 1 : -1
        }
        return 0
    })
}

// Filter function for objects
function filterObjects(
    objects: InsuredObject[] | null,
    searchTerm: string,
    selectedOrganizations: Set<string>,
    organizations: string[],
    isAdminUser: boolean = false,
    currentOrganization?: string | null,
    columnFilters?: Record<string, string>
): InsuredObject[] {
    // Add null safety check
    if (!objects || !Array.isArray(objects)) {
        return []
    }

    return objects.filter((object) => {
        // Organization-specific filter (when coming from organization page)
        if (currentOrganization) {
            if (object.organization !== currentOrganization) {
                return false
            }
        }

        // Search filter
        if (searchTerm) {
            const matchesSearch = Object.values(object).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
            if (!matchesSearch) return false
        }

        // Column-specific filters
        if (columnFilters && Object.keys(columnFilters).length > 0) {
            for (const [columnKey, filterValue] of Object.entries(columnFilters)) {
                if (filterValue && filterValue.trim() !== "") {
                    const objectValue = object[columnKey as keyof InsuredObject]
                    const objectValueStr = String(objectValue || "").toLowerCase()
                    const filterValueStr = filterValue.toLowerCase().trim()

                    // Case-insensitive partial match
                    if (!objectValueStr.includes(filterValueStr)) {
                        return false
                    }
                }
            }
        }

        // Object type filter removed - show all object types

        // Organization filter - only apply if we're in admin mode and have organization filters
        // Skip this if we already have a specific organization context
        if (!currentOrganization && isAdminUser && organizations.length > 0) {
            // Only filter if not all organizations are selected
            if (
                selectedOrganizations.size > 0 &&
                selectedOrganizations.size < organizations.length
            ) {
                const objectOrg = object.organization
                if (!objectOrg || !selectedOrganizations.has(objectOrg)) {
                    return false
                }
            }
        }

        return true
    })
}

// ——— Enhanced Search and Filter Bar ———
function SearchAndFilterBar({
    searchTerm,
    onSearchChange,
    visibleColumns,
    onToggleColumn,
    organizations,
    selectedOrganizations,
    onOrganizationChange,
    showOrgFilter = true,
    userInfo,
    columns,
    onResetColumnOrder,
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    visibleColumns: Set<string>
    onToggleColumn: (column: string) => void
    organizations: string[]
    selectedOrganizations: Set<string>
    onOrganizationChange: (org: string) => void
    showOrgFilter?: boolean
    userInfo: UserInfo | null
    columns: FieldSchema[]
    onResetColumnOrder: () => void
}) {
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [showOrgFilterDropdown, setShowOrgFilterDropdown] = useState(false)
    // Object type filter removed
    const [columnButtonRef, setColumnButtonRef] =
        useState<HTMLButtonElement | null>(null)
    const [orgButtonRef, setOrgButtonRef] = useState<HTMLButtonElement | null>(
        null
    )
    // Object type button ref removed
    const [columnDropdownPosition, setColumnDropdownPosition] = useState({
        top: 0,
        left: 0,
        useLeft: true,
    })
    const [orgDropdownPosition, setOrgDropdownPosition] = useState({
        top: 0,
        left: 0,
        useLeft: true,
    })
    // Object type dropdown position removed

    // Calculate dropdown positions
    useEffect(() => {
        if (columnButtonRef && showColumnFilter) {
            const rect = columnButtonRef.getBoundingClientRect()
            const dropdownWidth = 250 // minWidth from the dropdown
            const viewportWidth = window.innerWidth

            // Check if there's enough space on the right
            const spaceOnRight = viewportWidth - rect.right
            const useLeft = spaceOnRight >= dropdownWidth

            setColumnDropdownPosition({
                top: rect.bottom + 8,
                left: useLeft ? rect.left : rect.right - dropdownWidth,
                useLeft: useLeft,
            })
        }
    }, [columnButtonRef, showColumnFilter])

    useEffect(() => {
        if (orgButtonRef && showOrgFilterDropdown) {
            const rect = orgButtonRef.getBoundingClientRect()
            const dropdownWidth = 200 // estimated width for org dropdown
            const viewportWidth = window.innerWidth

            // Check if there's enough space on the right
            const spaceOnRight = viewportWidth - rect.right
            const useLeft = spaceOnRight >= dropdownWidth

            setOrgDropdownPosition({
                top: rect.bottom + 8,
                left: useLeft ? rect.left : rect.right - dropdownWidth,
                useLeft: useLeft,
            })
        }
    }, [orgButtonRef, showOrgFilterDropdown])

    // Object type filter useEffect removed

    // Removed toggleGroup function - no more basic/metadata grouping

    return (
        <>
            <div
                style={{
                    display: "flex",
                    gap: "12px",
                    alignItems: "center",
                    marginBottom: "16px",
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
                        size={16}
                        color={colors.gray400}
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Objecten zoeken..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{
                            ...styles.input,
                            paddingLeft: "40px",
                        }}
                        onFocus={(e) => hover.input(e.target as HTMLElement)}
                        onBlur={(e) =>
                            hover.resetInput(e.target as HTMLElement)
                        }
                    />
                </div>

                {showOrgFilter && (
                    <div style={{ position: "relative" }}>
                        <button
                            ref={setOrgButtonRef}
                            onClick={() =>
                                setShowOrgFilterDropdown(!showOrgFilterDropdown)
                            }
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
                            }}
                            onMouseOver={(e) =>
                                (e.target.style.backgroundColor = "#e5e7eb")
                            }
                            onMouseOut={(e) =>
                                (e.target.style.backgroundColor = "#f3f4f6")
                            }
                        >
                            <FaBuilding size={14} />
                            Organisaties ({selectedOrganizations.size})
                        </button>
                    </div>
                )}

                {/* Object type filter button removed */}

                <div style={{ position: "relative" }}>
                    <button
                        ref={setColumnButtonRef}
                        onClick={() => setShowColumnFilter(!showColumnFilter)}
                        style={{
                            padding: "12px 16px",
                            backgroundColor: colors.gray100,
                            color: colors.gray700,
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                        onMouseOver={(e) =>
                            (e.target.style.backgroundColor = colors.gray200)
                        }
                        onMouseOut={(e) =>
                            (e.target.style.backgroundColor = colors.gray100)
                        }
                    >
                        <FaFilter /> Kolommen ({visibleColumns.size})
                    </button>
                </div>
            </div>

            {/* Organization Filter Dropdown */}
            {showOrgFilter &&
                showOrgFilterDropdown &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 999,
                            }}
                            onClick={() => setShowOrgFilterDropdown(false)}
                        />
                        <div
                            style={{
                                position: "fixed",
                                top: `${orgDropdownPosition.top}px`,
                                left: `${orgDropdownPosition.left}px`,
                                backgroundColor: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                padding: "8px",
                                minWidth: "200px",
                                maxHeight: "300px",
                                overflowY: "auto",
                                zIndex: 1000,
                                fontFamily: FONT_STACK,
                            }}
                        >
                            <div
                                style={{
                                    padding: "8px 0",
                                    borderBottom: "1px solid #e5e7eb",
                                    marginBottom: "8px",
                                }}
                            >
                                <button
                                    onClick={() => {
                                        if (
                                            selectedOrganizations.size ===
                                            organizations.length
                                        ) {
                                            organizations.forEach(
                                                onOrganizationChange
                                            )
                                        } else {
                                            organizations.forEach((org) => {
                                                if (
                                                    !selectedOrganizations.has(
                                                        org
                                                    )
                                                ) {
                                                    onOrganizationChange(org)
                                                }
                                            })
                                        }
                                    }}
                                    style={{
                                        padding: "6px 12px",
                                        backgroundColor: colors.primary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        fontFamily: FONT_STACK,
                                    }}
                                >
                                    {selectedOrganizations.size ===
                                    organizations.length
                                        ? "Alles Deselecteren"
                                        : "Alles Selecteren"}
                                </button>
                            </div>
                            {organizations.map((org) => (
                                <label
                                    key={org}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: "6px 12px",
                                        cursor: "pointer",
                                        borderRadius: "6px",
                                        fontSize: "14px",
                                    }}
                                    onMouseOver={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            "#f3f4f6")
                                    }
                                    onMouseOut={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            "transparent")
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedOrganizations.has(org)}
                                        onChange={() =>
                                            onOrganizationChange(org)
                                        }
                                        style={{ marginRight: "8px" }}
                                    />
                                    {org}
                                </label>
                            ))}
                        </div>
                    </>,
                    document.body
                )}

            {/* Object Type Filter Dropdown completely removed */}

            {/* Column Filter Dropdown */}
            {showColumnFilter &&
                ReactDOM.createPortal(
                    <>
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
                        <div
                            style={{
                                position: "fixed",
                                top: `${columnDropdownPosition.top}px`,
                                left: `${columnDropdownPosition.left}px`,
                                backgroundColor: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                padding: "12px",
                                minWidth: "250px",
                                maxHeight: "400px",
                                overflowY: "auto",
                                zIndex: 1000,
                                fontFamily: FONT_STACK,
                            }}
                        >
                            <div style={{ marginBottom: "12px", display: "flex", gap: "8px", flexDirection: "column" }}>
                                <button
                                    onClick={() => {
                                        // Reset to organization's default visible columns
                                        // Get ALL filterable columns from Field Registry (all object types)
                                        const availableColumns =
                                            getAllFilterableFields(columns)

                                        // Get columns that should be visible from organization schema
                                        // ADMIN BYPASS: Admins see all filterable fields regardless of visible:false
                                        const visibleColumnsFromSchema =
                                            userInfo && isAdmin(userInfo)
                                                ? availableColumns.map(
                                                      (col) => col.key
                                                  ) // Admins see all filterable fields
                                                : availableColumns
                                                      .filter(
                                                          (col) =>
                                                              col.visible !==
                                                              false
                                                      )
                                                      .map((col) => col.key) // Users respect visible:false

                                        // Fallback to essential filterable columns if nothing is marked visible (only for users)
                                        const defaultColumns =
                                            visibleColumnsFromSchema.length > 0
                                                ? visibleColumnsFromSchema
                                                : availableColumns
                                                      .filter((col) =>
                                                          [
                                                              "objectType",
                                                              "status",
                                                              "waarde",
                                                          ].includes(col.key)
                                                      )
                                                      .map((col) => col.key)

                                        availableColumns.forEach((col) => {
                                            if (
                                                defaultColumns.includes(col.key)
                                            ) {
                                                if (
                                                    !visibleColumns.has(col.key)
                                                ) {
                                                    onToggleColumn(col.key)
                                                }
                                            } else {
                                                if (
                                                    visibleColumns.has(col.key)
                                                ) {
                                                    onToggleColumn(col.key)
                                                }
                                            }
                                        })
                                    }}
                                    style={{
                                        padding: "6px 12px",
                                        backgroundColor: colors.primary,
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        fontFamily: FONT_STACK,
                                    }}
                                >
                                    Reset Kolommen naar Standaard
                                </button>
                                <button
                                    onClick={onResetColumnOrder}
                                    style={{
                                        padding: "6px 12px",
                                        backgroundColor: "#6b7280",
                                        color: "white",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "12px",
                                        cursor: "pointer",
                                        fontFamily: FONT_STACK,
                                    }}
                                >
                                    Reset Kolom Volgorde
                                </button>
                            </div>

                            <div style={{
                                fontSize: "11px",
                                color: "#6b7280",
                                padding: "8px 12px",
                                backgroundColor: "#f9fafb",
                                borderRadius: "4px",
                                marginBottom: "12px",
                                fontStyle: "italic"
                            }}>
                                💡 Tip: Sleep kolom headers om de volgorde te wijzigen
                            </div>

                            {/* List of filterable columns using Field Registry - admins see all, users respect visible:false */}
                            {getAllFilterableFields(columns)
                                .filter((col) =>
                                    userInfo && isAdmin(userInfo)
                                        ? true
                                        : col.visible !== false
                                )
                                .map((col) => (
                                    <label
                                        key={col.key}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            padding: "4px 12px",
                                            cursor: "pointer",
                                            fontSize: "13px",
                                        }}
                                        onMouseOver={(e) =>
                                            (e.currentTarget.style.backgroundColor =
                                                "#f3f4f6")
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
                                                onToggleColumn(col.key)
                                            }
                                            style={{
                                                marginRight: "8px",
                                            }}
                                        />
                                        {col.label}
                                    </label>
                                ))}
                        </div>
                    </>,
                    document.body
                )}
        </>
    )
}

// ——— Action Buttons ———

// Action dropdown menu for object table rows
function ActionDropdownMenu({
    object,
    onEdit,
    onDelete,
    userInfo,
}: {
    object: InsuredObject
    onEdit: (object: InsuredObject) => void
    onDelete: (object: InsuredObject) => void
    userInfo: UserInfo | null
}) {
    const [isOpen, setIsOpen] = useState(false)
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        left: 0,
        useLeft: true,
    })
    const dropdownRef = React.useRef<HTMLDivElement>(null)
    const buttonRef = React.useRef<HTMLButtonElement>(null)
    const menuRef = React.useRef<HTMLDivElement>(null)

    // Check permissions
    const hasEditPermission = userInfo
        ? hasPermission(userInfo, "INSURED_OBJECT_UPDATE")
        : false

    // New RBAC rules for edit button visibility:
    // - Users: NO edit button at all (removed completely)
    // - Editors: ONLY show edit button when status = "Insured" or "Pending" (with field restrictions)
    // - Admins: Always show edit button (all statuses)
    const canEdit = hasEditPermission && (
        isAdmin(userInfo) || // Admins can edit all statuses
        (isEditor(userInfo) && (object.status === "Insured" || object.status === "Pending")) // Editors for Insured and Pending status
        // Users: no edit button (isUser check removed)
    )

    const canDelete = userInfo
        ? hasPermission(userInfo, "INSURED_OBJECT_DELETE")
        : false

    console.log("ActionDropdownMenu permissions:", {
        userInfo: !!userInfo,
        canEdit,
        canDelete,
        userRole: userInfo?.role,
        objectId: object?.id,
        hasUserInfo: !!userInfo,
    })

    console.log("ActionDropdownMenu detailed permissions:", {
        INSURED_OBJECT_UPDATE: userInfo
            ? hasPermission(userInfo, "INSURED_OBJECT_UPDATE")
            : "no user",
        INSURED_OBJECT_DELETE: userInfo
            ? hasPermission(userInfo, "INSURED_OBJECT_DELETE")
            : "no user",
        userRole: userInfo?.role,
    })

    // Don't render if user has no permissions
    if (!canEdit && !canDelete) {
        console.log("ActionDropdownMenu: No permissions, returning null")
        return null
    }

    // Calculate dropdown position when opening
    const handleToggle = () => {
        console.log("ActionDropdownMenu handleToggle clicked, isOpen:", isOpen)
        if (!isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect()
            const dropdownWidth = 120 // minWidth from the dropdown
            const viewportWidth = window.innerWidth

            // Check if there's enough space on the right
            const spaceOnRight = viewportWidth - rect.right
            const useLeft = spaceOnRight >= dropdownWidth

            setDropdownPosition({
                top: rect.bottom + 2,
                left: useLeft ? rect.left : rect.right - dropdownWidth,
                useLeft: useLeft,
            })
        }
        setIsOpen(!isOpen)
        console.log("ActionDropdownMenu setIsOpen to:", !isOpen)
    }

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node
            if (
                isOpen &&
                buttonRef.current &&
                !buttonRef.current.contains(target) &&
                menuRef.current &&
                !menuRef.current.contains(target)
            ) {
                setIsOpen(false)
            }
        }

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside)
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [isOpen])

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        console.log("ActionDropdownMenu handleEdit called with object:", object)
        onEdit(object)
        setIsOpen(false)
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        console.log(
            "ActionDropdownMenu handleDelete called with object:",
            object
        )
        onDelete(object)
        setIsOpen(false)
    }

    return (
        <div style={{ position: "relative" }} ref={dropdownRef}>
            <button
                ref={buttonRef}
                onClick={handleToggle}
                style={{
                    ...styles.iconButton,
                    border: `1px solid ${colors.gray300}`,
                    borderRadius: "6px",
                    padding: "8px",
                    backgroundColor: "transparent",
                }}
                onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    hover.iconButton(target)
                    target.style.borderColor = colors.primary
                    target.style.color = colors.primary
                }}
                onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    hover.resetIconButton(target)
                    target.style.borderColor = colors.gray300
                    target.style.color = colors.gray500
                }}
            >
                <FaEllipsisV size={12} />
            </button>

            {isOpen &&
                ReactDOM.createPortal(
                    <div
                        ref={menuRef}
                        style={{
                            position: "fixed",
                            top: `${dropdownPosition.top}px`,
                            left: `${dropdownPosition.left}px`,
                            backgroundColor: colors.white,
                            border: `1px solid ${colors.gray200}`,
                            borderRadius: "8px",
                            boxShadow: "0 10px 25px rgba(0, 0, 0, 0.1)",
                            zIndex: 1000,
                            minWidth: "140px",
                            padding: "8px 0",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        {canEdit && (
                            <>
                                {console.log(
                                    "Rendering edit button for object:",
                                    object?.id
                                )}
                                <button
                                    onClick={(e) => {
                                        console.log(
                                            "Edit button clicked!",
                                            object?.id
                                        )
                                        handleEdit(e)
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "none",
                                        backgroundColor: "transparent",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        color: "#3b82f6",
                                        textAlign: "left",
                                        transition: "all 0.2s ease",
                                        fontFamily: FONT_STACK,
                                        borderRadius: "6px",
                                        boxShadow: "none",
                                    }}
                                    onMouseOver={(e) => {
                                        const target = e.target as HTMLElement
                                        target.style.backgroundColor = "#f3f4f6"
                                        target.style.color = "#2563eb"
                                        target.style.transform =
                                            "translateX(2px)"
                                        target.style.boxShadow =
                                            "0 4px 8px rgba(59, 130, 246, 0.15)"
                                    }}
                                    onMouseOut={(e) => {
                                        const target = e.target as HTMLElement
                                        target.style.backgroundColor =
                                            "transparent"
                                        target.style.color = "#3b82f6"
                                        target.style.transform = "translateX(0)"
                                        target.style.boxShadow = "none"
                                    }}
                                >
                                    <FaEdit size={14} color="currentColor" />
                                    Bewerken
                                </button>
                            </>
                        )}
                        {canDelete && (
                            <>
                                {console.log(
                                    "Rendering delete button for object:",
                                    object?.id
                                )}
                                <button
                                    onClick={(e) => {
                                        console.log(
                                            "Delete button clicked!",
                                            object?.id
                                        )
                                        handleDelete(e)
                                    }}
                                    style={{
                                        width: "100%",
                                        padding: "12px 16px",
                                        border: "none",
                                        backgroundColor: "transparent",
                                        cursor: "pointer",
                                        fontSize: "14px",
                                        fontWeight: "600",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        color: "#dc2626",
                                        textAlign: "left",
                                        transition: "all 0.2s ease",
                                        fontFamily: FONT_STACK,
                                        borderRadius: "6px",
                                        boxShadow: "none",
                                    }}
                                    onMouseOver={(e) => {
                                        const target = e.target as HTMLElement
                                        target.style.backgroundColor = "#fef2f2"
                                        target.style.color = "#b91c1c"
                                        target.style.transform =
                                            "translateX(2px)"
                                        target.style.boxShadow =
                                            "0 4px 8px rgba(220, 38, 38, 0.15)"
                                    }}
                                    onMouseOut={(e) => {
                                        const target = e.target as HTMLElement
                                        target.style.backgroundColor =
                                            "transparent"
                                        target.style.color = "#dc2626"
                                        target.style.transform = "translateX(0)"
                                        target.style.boxShadow = "none"
                                    }}
                                >
                                    <FaTrashAlt
                                        size={14}
                                        color="currentColor"
                                    />
                                    Verwijderen
                                </button>
                            </>
                        )}
                    </div>,
                    document.body
                )}
        </div>
    )
}

// ——— Modal Dialog Components ———
function ConfirmDeleteDialog({
    object,
    onConfirm,
    onCancel,
}: {
    object: InsuredObject
    onConfirm: () => void
    onCancel: () => void
}) {
    // Case-insensitive lookup to handle both "Boot" and "boot"
    const config = OBJECT_TYPE_CONFIG[object.objectType?.toLowerCase() as ObjectType]
    const objectTypeName = config?.label?.toLowerCase() || "object"

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
                    color: colors.gray800,
                }}
            >
                {config?.label || "Object"} Verwijderen
            </div>
            <div
                style={{
                    fontSize: "14px",
                    color: colors.gray500,
                    marginBottom: "24px",
                    lineHeight: "1.5",
                }}
            >
                Weet je zeker dat je dit {objectTypeName} wilt verwijderen? Dit
                action cannot be undone.
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
                        backgroundColor: colors.gray100,
                        color: colors.gray700,
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                        transition: "all 0.2s",
                    }}
                    onMouseOver={(e) =>
                        (e.target.style.backgroundColor = colors.gray200)
                    }
                    onMouseOut={(e) =>
                        (e.target.style.backgroundColor = colors.gray100)
                    }
                >
                    Annuleren
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        padding: "10px 20px",
                        backgroundColor: colors.error,
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
                        (e.target.style.backgroundColor = colors.error)
                    }
                >
                    Verwijderen
                </button>
            </div>
        </div>
    )
}

function EditInsuredObjectDialog({
    object,
    onClose,
    onSuccess,
    schema,
    userInfo,
}: {
    object: InsuredObject
    onClose: () => void
    onSuccess: () => void
    schema: FieldSchema[]
    userInfo: UserInfo | null
}) {
    // Case-insensitive lookup to handle both "Boot" and "boot"
    const config = OBJECT_TYPE_CONFIG[object.objectType?.toLowerCase() as ObjectType]

    // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL RETURNS
    const [form, setForm] = useState<InsuredObject>(object)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [ingangsdatumWarning, setIngangsdatumWarning] = useState<string | null>(null)
    const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(
        config?.useOrgConfig || false
    )
    const [orgConfig, setOrgConfig] = useState<Record<string, any> | null>(null)

    // Track custom values when "Anders" is selected
    const [customValues, setCustomValues] = useState<Record<string, string>>({
        merkMotor: "",
        ligplaats: "",
    })

    // Check if config exists for this object type
    if (!config) {
        return ReactDOM.createPortal(
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1001,
                }}
                onClick={onClose}
            >
                <div
                    style={{
                        backgroundColor: "white",
                        padding: "32px",
                        borderRadius: "8px",
                        maxWidth: "500px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        textAlign: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <FaExclamationTriangle size={48} color={colors.error} style={{ marginBottom: "16px" }} />
                    <h3 style={{ margin: "0 0 16px", fontFamily: FONT_STACK, fontSize: "20px", color: colors.gray900 }}>
                        Ongeldig objecttype
                    </h3>
                    <p style={{ margin: "0 0 24px", fontFamily: FONT_STACK, fontSize: "14px", color: colors.gray700, lineHeight: "1.5" }}>
                        Het objecttype "{object.objectType}" is niet geldig. Neem contact op met de beheerder.
                    </p>
                    <button
                        onClick={onClose}
                        style={{
                            ...styles.button,
                            backgroundColor: colors.primary,
                            color: "white",
                            border: "none",
                        }}
                        onMouseOver={(e) => hover.button(e.target as HTMLElement)}
                        onMouseOut={(e) => {
                            const target = e.target as HTMLElement
                            target.style.backgroundColor = colors.primary
                        }}
                    >
                        Sluiten
                    </button>
                </div>
            </div>,
            document.body
        )
    }

    // Check if user can edit this object based on status
    const objectStatus = object.status as InsuredObjectStatus
    const canEdit = canEditInsuredObject(userInfo, objectStatus)

    // If user cannot edit, show message and return early
    if (!canEdit) {
        const statusMessages: Record<string, string> = {
            Pending: "Dit vaartuig is in behandeling door de beheerder en kan niet worden gewijzigd.",
            Rejected: "Dit vaartuig is afgewezen. Dien een nieuwe aanvraag in als u dit vaartuig alsnog wilt verzekeren.",
            Removed: "Dit vaartuig is afgevoerd en kan niet meer worden gewijzigd."
        }

        return ReactDOM.createPortal(
            <div
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 1001,
                }}
                onClick={onClose}
            >
                <div
                    style={{
                        backgroundColor: "white",
                        padding: "32px",
                        borderRadius: "8px",
                        maxWidth: "500px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                        textAlign: "center",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <FaInfoCircle size={48} color={colors.error} style={{ marginBottom: "16px" }} />
                    <h3 style={{ margin: "0 0 16px", fontFamily: FONT_STACK, fontSize: "20px", color: colors.gray900 }}>
                        Bewerken niet toegestaan
                    </h3>
                    <p style={{ margin: "0 0 24px", fontFamily: FONT_STACK, fontSize: "14px", color: colors.gray700, lineHeight: "1.5" }}>
                        {statusMessages[objectStatus] || "Dit vaartuig kan niet worden gewijzigd."}
                    </p>
                    <button
                        onClick={onClose}
                        style={{
                            ...styles.primaryButton,
                            padding: "10px 24px",
                        }}
                    >
                        Sluiten
                    </button>
                </div>
            </div>,
            document.body
        )
    }

    // Function to fetch organization configuration (only for boats)
    async function fetchOrganizationConfig(organizationName: string) {
        try {
            const response = await fetch(
                `${API_BASE_URL}${API_PATHS.ORGANIZATION}/by-name/${organizationName}`,
                {
                    headers: {
                        Authorization: `Bearer ${getIdToken()}`,
                        "Content-Type": "application/json",
                    },
                }
            )

            if (response.ok) {
                const data = await response.json()
                // Use the new insured_object_fields_config structure
                const orgConfig =
                    data.organization.insured_object_fields_config?.boat
                return orgConfig
            } else {
                console.warn(
                    "Failed to fetch organization config:",
                    response.status,
                    response.statusText
                )
            }
        } catch (err) {
            console.warn("Error fetching organization config:", err)
        }
        return null
    }

    // Load organization configuration on component mount (only for boats)
    useEffect(() => {
        async function loadConfig() {
            if (!config?.useOrgConfig) {
                setIsLoadingConfig(false)
                return
            }

            setIsLoadingConfig(true)
            try {
                if (object.organization) {
                    const orgConfig = await fetchOrganizationConfig(
                        object.organization
                    )
                    if (orgConfig) {
                        setOrgConfig(orgConfig)
                    }
                }
            } catch (err) {
                setError("Kon organisatieconfiguratie niet laden")
                console.error("Error loading org config:", err)
            } finally {
                setIsLoadingConfig(false)
            }
        }

        loadConfig()
    }, [config?.useOrgConfig, object.organization])

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value, type } = e.target
        setError(null)
        setSuccess(null)

        // Check if ingangsdatum is more than one week in the past (skip warning for admins)
        if (name === 'ingangsdatum' && value && userInfo?.role !== 'admin') {
            try {
                const selectedDate = new Date(value)
                const today = new Date()
                const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)

                if (selectedDate < oneWeekAgo) {
                    setIngangsdatumWarning(
                        "Let op: De ingangsdatum ligt meer dan een week in het verleden. " +
                        "Dit vaartuig zal handmatige goedkeuring vereisen en kan niet automatisch worden goedgekeurd."
                    )
                } else {
                    setIngangsdatumWarning(null)
                }
            } catch (err) {
                // Invalid date format, ignore
                setIngangsdatumWarning(null)
            }
        } else if (name === 'ingangsdatum' && userInfo?.role === 'admin') {
            // Clear warning for admins
            setIngangsdatumWarning(null)
        }

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "number"
                    ? value === ""
                        ? ""
                        : parseFloat(value)
                    : value,
        }))
    }

    // Get fields to render based on object type - now using dynamic schema
    // This function is legacy and should be removed, use getSchemaFieldsForObjectType directly

    // Format field label
    function formatLabel(key: string): string {
        return key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .replace(/\b\w/g, (l) => l.toUpperCase())
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        // Basic validation
        if (!form.waarde || form.waarde <= 0) {
            setError("Waarde moet groter dan 0 zijn")
            return
        }
        if (!form.ingangsdatum) {
            setError("Ingangsdatum is verplicht")
            return
        }

        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            // Prepare the update data
            let updateData = { ...form }

            // Replace "Anders" with custom values if provided
            if (updateData.merkMotor === "Anders" && customValues.merkMotor) {
                updateData.merkMotor = customValues.merkMotor
            }
            if (updateData.ligplaats === "Anders" && customValues.ligplaats) {
                updateData.ligplaats = customValues.ligplaats
            }

            // CRITICAL: If editor is editing an Insured or Rejected object, change status to Pending for re-approval
            if (isEditor(userInfo) && (object.status === "Insured" || object.status === "Rejected")) {
                updateData = {
                    ...updateData,
                    status: "Pending"
                }
                console.log(`Editor editing ${object.status} object - status changed to Pending for re-approval`)
            }

            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${object.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                    body: JSON.stringify(updateData),
                }
            )

            const data = await res.json()

            if (!res.ok) {
                throw new Error(
                    data.message ||
                        `Failed to update: ${res.status} ${res.statusText}`
                )
            }

            // Show appropriate success message based on actual final status
            if (isEditor(userInfo) && (object.status === "Insured" || object.status === "Rejected")) {
                // Editor edited an Insured/Rejected object
                if (data.status === "Insured") {
                    // Auto-approved!
                    setSuccess(`${config.label} succesvol bijgewerkt en automatisch goedgekeurd!`)
                } else if (data.status === "Pending") {
                    // Needs manual review
                    setSuccess(`${config.label} succesvol bijgewerkt! Status is gewijzigd naar "In behandeling" voor hergoedkeuring.`)
                } else {
                    setSuccess(`${config.label} succesvol bijgewerkt!`)
                }
            } else if (object.status === "Pending") {
                // Anyone editing a Pending object
                if (data.status === "Insured") {
                    // Auto-approved!
                    setSuccess(`${config.label} succesvol bijgewerkt en automatisch goedgekeurd!`)
                } else if (data.status === "Pending") {
                    // Stayed Pending
                    setSuccess(`${config.label} succesvol bijgewerkt! Blijft in behandeling voor beoordeling.`)
                } else {
                    setSuccess(`${config.label} succesvol bijgewerkt!`)
                }
            } else {
                setSuccess(`${config.label} succesvol bijgewerkt!`)
            }

            // Call onSuccess to refresh the list, but don't auto-close
            // User will manually close by clicking the Cancel/Close button
            onSuccess()
        } catch (err: any) {
            setError(err.message || "Kon object niet bijwerken")
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderInput = (key: string) => {
        const val = form[key]

        // Get field schema information
        const fieldSchema = schema?.find((field) => field.key === key)

        // Field filtering is now handled by getEditableFieldsForObjectType()
        // No need for hardcoded exclusions - Field Registry controls this

        // Use schema type information if available, otherwise fall back to legacy logic
        let inputType = "text"
        let isTextArea = false
        let isDropdown = false
        let isRequired = false
        let label = key

        if (fieldSchema) {
            // Use schema information
            label = fieldSchema.label
            isRequired = fieldSchema.required
            isTextArea = fieldSchema.type === "textarea"
            isDropdown = fieldSchema.type === "dropdown"

            switch (fieldSchema.type) {
                case "number":
                case "currency":
                    inputType = "number"
                    break
                case "date":
                    inputType = "date"
                    break
                case "textarea":
                    inputType = "text"
                    isTextArea = true
                    break
                case "dropdown":
                    // dropdown is handled separately
                    break
                default:
                    inputType = "text"
            }
        } else {
            // Fallback to legacy logic
            const isNumber = typeof val === "number"
            isTextArea = key === "notitie" || key === "objectDescription"
            inputType = isNumber
                ? "number"
                : /Date$/.test(key)
                  ? "date"
                  : "text"

            // Legacy required field logic
            const commonRequired = [
                "waarde",
                "ingangsdatum",
                "premiepercentage",
                "eigenRisico",
            ]
            const typeSpecificRequired = {
                trailer: ["chassisnummer"],
                motor: ["merkMotor", "typeMotor"],
                boat: [],
            }
            isRequired =
                commonRequired.includes(key) ||
                (typeSpecificRequired[object.objectType] || []).includes(key)

            label = formatLabel(key)
        }
        const Component = isDropdown ? "select" : isTextArea ? "textarea" : "input"

        return (
            <div key={key} style={{ marginBottom: "16px", width: "100%" }}>
                <label htmlFor={key} style={styles.label}>
                    {label}
                    {isRequired && (
                        <span style={{ color: colors.error }}> *</span>
                    )}
                </label>
                {isDropdown && fieldSchema?.options ? (
                    <>
                        <select
                            id={key}
                            name={key}
                            value={val === null || val === undefined ? "" : val}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            required={isRequired}
                            style={{
                                ...styles.input,
                                backgroundColor: isSubmitting
                                    ? colors.gray50
                                    : colors.white,
                                cursor: isSubmitting ? "not-allowed" : "pointer",
                            }}
                            onFocus={(e) => {
                                if (!isSubmitting) {
                                    hover.input(e.target as HTMLElement)
                                }
                            }}
                            onBlur={(e) => {
                                hover.resetInput(e.target as HTMLElement)
                            }}
                        >
                            <option value="">Selecteer {label.toLowerCase()}</option>
                            {fieldSchema.options.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                        {/* Show custom input when "Anders" is selected */}
                        {(key === "merkMotor" || key === "ligplaats") &&
                            val === "Anders" && (
                                <input
                                    type="text"
                                    placeholder={`Voer ${label.toLowerCase()} in`}
                                    value={customValues[key] || ""}
                                    onChange={(e) => {
                                        setCustomValues((prev) => ({
                                            ...prev,
                                            [key]: e.target.value,
                                        }))
                                    }}
                                    disabled={isSubmitting}
                                    style={{
                                        ...styles.input,
                                        marginTop: "8px",
                                        backgroundColor: isSubmitting
                                            ? colors.gray50
                                            : colors.white,
                                        cursor: isSubmitting
                                            ? "not-allowed"
                                            : "text",
                                    }}
                                    onFocus={(e) => {
                                        if (!isSubmitting) {
                                            hover.input(e.target as HTMLElement)
                                        }
                                    }}
                                    onBlur={(e) => {
                                        hover.resetInput(e.target as HTMLElement)
                                    }}
                                />
                            )}
                    </>
                ) : (
                    <Component
                        id={key}
                        name={key}
                        value={val === null || val === undefined ? "" : val}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required={isRequired}
                        {...(Component === "input"
                            ? { type: inputType }
                            : { rows: 3 })}
                        placeholder={`Enter ${label.toLowerCase()}`}
                        style={{
                            ...styles.input,
                            backgroundColor: isSubmitting
                                ? colors.gray50
                                : colors.white,
                            cursor: isSubmitting ? "not-allowed" : "text",
                        }}
                        onFocus={(e) => {
                            if (!isSubmitting) {
                                hover.input(e.target as HTMLElement)
                            }
                        }}
                        onBlur={(e) => {
                            hover.resetInput(e.target as HTMLElement)
                        }}
                    />
                )}
                {/* Show warning for ingangsdatum if more than one week in the past */}
                {key === 'ingangsdatum' && ingangsdatumWarning && (
                    <div
                        style={{
                            marginTop: "8px",
                            padding: "12px",
                            backgroundColor: "#fef3c7",
                            border: "1px solid #f59e0b",
                            borderRadius: "6px",
                            display: "flex",
                            alignItems: "start",
                            gap: "8px",
                        }}
                    >
                        <FaExclamationTriangle
                            size={16}
                            style={{
                                color: "#f59e0b",
                                flexShrink: 0,
                                marginTop: "2px",
                            }}
                        />
                        <span
                            style={{
                                fontSize: "13px",
                                color: "#92400e",
                                lineHeight: "1.5",
                                fontFamily: FONT_STACK,
                            }}
                        >
                            {ingangsdatumWarning}
                        </span>
                    </div>
                )}
            </div>
        )
    }

    // Show loading state while fetching configuration (only for boats)
    if (isLoadingConfig) {
        return (
            <div
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "400px",
                    padding: "32px",
                    background: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                    fontFamily: FONT_STACK,
                    zIndex: 1001,
                    textAlign: "center",
                }}
            >
                <div
                    style={{
                        marginBottom: "16px",
                        fontSize: "18px",
                        fontWeight: "500",
                    }}
                >
                    Formulierconfiguratie laden...
                </div>
                <div style={styles.spinner} />
            </div>
        )
    }

    const IconComponent = config.icon
    // ADMIN BYPASS: Admin users can edit ALL fields (user, edit_only, AND system fields)
    // This allows admins to modify fields that are normally read-only for regular users
    // including premium tariff (premiepercentage) and deductible (eigenRisico)
    const fieldsToRender = isAdmin(userInfo)
        ? getSchemaFieldsForObjectType(schema, object.objectType)
              .filter((field) =>
                  field.inputType === "user" ||
                  field.inputType === "edit_only" ||
                  field.inputType === "system"
              ) // Admins can edit user, edit_only, AND system fields
              .map((field) => field.key)
        : getEditableFieldsForObjectType(schema, object.objectType).map(
              (field) => field.key
          )

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(90vw, 800px)",
                maxHeight: "90vh",
                padding: "32px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                fontFamily: FONT_STACK,
                zIndex: 1001,
                overflowY: "auto",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                }}
            >
                <div style={{ display: "flex", alignItems: "center" }}>
                    <IconComponent size={24} color={config.color} />
                    <div
                        style={{
                            marginLeft: "12px",
                            fontSize: "20px",
                            fontWeight: "600",
                            color: colors.gray900,
                        }}
                    >
                        {config.label} Bewerken
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={styles.iconButton}
                    onMouseOver={(e) =>
                        hover.iconButton(e.target as HTMLElement)
                    }
                    onMouseOut={(e) =>
                        hover.resetIconButton(e.target as HTMLElement)
                    }
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Error Display */}
            {error && (
                <div
                    style={{
                        padding: "12px 16px",
                        backgroundColor: "#fee2e2",
                        color: "#dc2626",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        fontSize: "14px",
                        whiteSpace: "pre-line",
                    }}
                >
                    {error}
                </div>
            )}

            {/* Success Display */}
            {success && (
                <div
                    style={{
                        padding: "12px 16px",
                        backgroundColor: "#dcfce7",
                        color: "#166534",
                        borderRadius: "8px",
                        marginBottom: "16px",
                        fontSize: "14px",
                    }}
                >
                    {success}
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        columnGap: "24px",
                        rowGap: "12px",
                    }}
                >
                    {fieldsToRender.map(renderInput)}
                </div>

                {/* Submit Buttons */}
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end",
                        marginTop: "24px",
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: colors.gray100,
                            color: colors.gray700,
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            fontFamily: FONT_STACK,
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                e.target.style.backgroundColor = colors.gray200
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) {
                                e.target.style.backgroundColor = colors.gray100
                            }
                        }}
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: isSubmitting
                                ? colors.disabled
                                : config.color,
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            fontFamily: FONT_STACK,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                e.target.style.backgroundColor = `${config.color}dd`
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) {
                                e.target.style.backgroundColor = config.color
                            }
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <div style={styles.spinner} />
                                Updating...
                            </>
                        ) : (
                            <>Wijzigingen Opslaan</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

// ——— Notification Components ———
function SuccessNotification({
    message,
    onClose,
}: {
    message: string
    onClose: () => void
}) {
    return (
        <div
            style={{
                ...styles.modal,
                width: "400px",
                padding: "24px",
            }}
        >
            <div
                style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: colors.success,
                    marginBottom: "16px",
                    fontFamily: FONT_STACK,
                }}
            >
                Gelukt
            </div>
            <div
                style={{
                    ...styles.description,
                    marginBottom: "24px",
                }}
            >
                {message}
            </div>
            <div style={styles.buttonGroup}>
                <button
                    onClick={onClose}
                    style={{
                        ...styles.primaryButton,
                        backgroundColor: colors.success,
                        padding: "10px 20px",
                    }}
                    onMouseOver={(e) =>
                        (e.currentTarget.style.backgroundColor =
                            colors.successHover)
                    }
                    onMouseOut={(e) =>
                        (e.currentTarget.style.backgroundColor = colors.success)
                    }
                >
                    OK
                </button>
            </div>
        </div>
    )
}

function ErrorNotification({
    message,
    onClose,
}: {
    message: string
    onClose: () => void
}) {
    return (
        <div
            style={{
                ...styles.modal,
                width: "400px",
                padding: "24px",
            }}
        >
            <div
                style={{
                    fontSize: "18px",
                    fontWeight: "600",
                    color: colors.error,
                    marginBottom: "16px",
                    fontFamily: FONT_STACK,
                }}
            >
                Fout
            </div>
            <div
                style={{
                    ...styles.description,
                    marginBottom: "24px",
                }}
            >
                {message}
            </div>
            <div style={styles.buttonGroup}>
                <button
                    onClick={onClose}
                    style={{
                        ...styles.primaryButton,
                        padding: "10px 20px",
                    }}
                    onMouseOver={(e) => hover.primaryButton(e.currentTarget)}
                    onMouseOut={(e) =>
                        hover.resetPrimaryButton(e.currentTarget)
                    }
                >
                    OK
                </button>
            </div>
        </div>
    )
}

function DeclineReasonDialog({
    onSubmit,
    onCancel,
}: {
    onSubmit: (reason: string) => void
    onCancel: () => void
}) {
    const [reason, setReason] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (reason.trim()) {
            onSubmit(reason.trim())
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "500px",
                padding: "24px",
                background: "#fff",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                fontFamily: FONT_STACK,
                zIndex: 1001,
            }}
        >
            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        marginBottom: "16px",
                        color: colors.gray800,
                    }}
                >
                    Decline Object
                </div>
                <div
                    style={{
                        fontSize: "14px",
                        color: colors.gray500,
                        marginBottom: "16px",
                        lineHeight: "1.5",
                    }}
                >
                    Please provide a reason for declining this insured object:
                </div>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter decline reason..."
                    required
                    style={{
                        ...styles.input,
                        width: "100%",
                        height: "100px",
                        resize: "vertical",
                        marginBottom: "24px",
                    }}
                />
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end",
                    }}
                >
                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            padding: "10px 20px",
                            backgroundColor: colors.gray100,
                            color: colors.gray700,
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) =>
                            (e.target.style.backgroundColor = colors.gray200)
                        }
                        onMouseOut={(e) =>
                            (e.target.style.backgroundColor = colors.gray100)
                        }
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
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
                        Decline
                    </button>
                </div>
            </form>
        </div>
    )
}

// Fetch all organizations for filtering
async function fetchOrganizations(): Promise<string[]> {
    try {
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

        if (json.organizations && json.organizations.length > 0) {
            return json.organizations
                .map((org: any) => org.name || org.id)
                .filter(Boolean)
        }
        return []
    } catch (error) {
        console.error("Failed to fetch organizations:", error)
        return []
    }
}

// Fetch full organization objects (with id and name) for logo display
async function fetchFullOrganizations(): Promise<
    Array<{ id: string; name: string }>
> {
    try {
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

        if (json.organizations && json.organizations.length > 0) {
            return json.organizations
                .map((org: any) => ({
                    id: org.id,
                    name: org.name || org.id,
                }))
                .filter((org: any) => org.id && org.name)
        }
        return []
    } catch (error) {
        console.error("Error fetching full organizations:", error)
        return []
    }
}

// ——— Auto Accept Rules Display Component ———
interface AutoApprovalRule {
    name: string
    conditions: Record<string, any>
    logic: "AND" | "OR"
}

interface AutoApprovalConfig {
    enabled: boolean
    rules: AutoApprovalRule[]
    default_action: "pending" | "auto_approve"
}

async function fetchOrganizationAutoApprovalConfig(
    organizationName: string
): Promise<AutoApprovalConfig | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(
            `${API_BASE_URL}${API_PATHS.ORGANIZATION}/by-name/${encodeURIComponent(organizationName)}`,
            {
                method: "GET",
                headers,
                mode: "cors",
            }
        )

        if (!res.ok) {
            console.warn(
                `Failed to fetch organization config: ${res.status} ${res.statusText}`
            )
            return null
        }

        const data = await res.json()
        return data.organization?.auto_approval_config || null
    } catch (error) {
        console.error(
            "Error fetching organization auto approval config:",
            error
        )
        return null
    }
}

async function saveOrganizationAutoApprovalConfig(
    organizationName: string,
    config: AutoApprovalConfig
): Promise<boolean> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(
            `${API_BASE_URL}${API_PATHS.ORGANIZATION}/by-name/${encodeURIComponent(organizationName)}/auto-approval-config`,
            {
                method: "PUT",
                headers,
                body: JSON.stringify(config),
                mode: "cors",
            }
        )

        if (!res.ok) {
            console.error(
                `Failed to save organization auto approval config: ${res.status} ${res.statusText}`
            )
            return false
        }

        return true
    } catch (error) {
        console.error("Error saving organization auto approval config:", error)
        return false
    }
}

function AutoAcceptRulesDisplay({
    organizationName,
}: {
    organizationName: string
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [config, setConfig] = useState<AutoApprovalConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    // Editing state removed - dropdown is now read-only

    useEffect(() => {
        async function loadConfig() {
            setIsLoading(true)
            const autoApprovalConfig =
                await fetchOrganizationAutoApprovalConfig(organizationName)
            setConfig(autoApprovalConfig)
            setIsLoading(false)
        }
        loadConfig()
    }, [organizationName])

    if (isLoading) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "8px",
                    fontSize: "12px",
                    color: colors.gray500,
                }}
            >
                <div
                    style={{
                        width: "16px",
                        height: "16px",
                        border: `2px solid ${colors.gray300}`,
                        borderTop: `2px solid ${colors.primary}`,
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                    }}
                />
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                        @keyframes fadeIn {
                            0% { opacity: 0; transform: translateX(-50%) translateY(4px); }
                            100% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        }
                    `}
                </style>
                Loading acceptance rules...
            </div>
        )
    }

    if (!config) {
        return null // Don't show anything if no config is found
    }

    const getOperatorLabel = (operator: string) => {
        const operatorMap: Record<string, string> = {
            eq: "gelijk aan",
            ne: "niet gelijk aan",
            lt: "kleiner dan",
            le: "kleiner dan of gelijk aan",
            gt: "groter dan",
            ge: "groter dan of gelijk aan",
            between: "tussen",
            in: "in lijst",
            not_in: "niet in lijst",
            contains: "bevat",
            starts_with: "begint met",
            ends_with: "eindigt met",
            regex: "reguliere expressie",
        }
        return operatorMap[operator] || operator
    }

    const formatConditionValue = (condition: any): string => {
        // Handle multi-value conditions (e.g., 'in', 'between')
        if (Array.isArray(condition.values) && condition.values.length > 0) {
            if (
                condition.operator === "between" &&
                condition.values.length === 2
            ) {
                return `${condition.values[0]} en ${condition.values[1]}`
            }
            return condition.values.join(", ")
        }

        // Handle single-value conditions from 'value' property
        if (
            condition.value !== null &&
            condition.value !== undefined &&
            condition.value !== ""
        ) {
            return String(condition.value)
        }

        // Check if the condition has the value directly as a property with the field name
        // This handles cases where the backend might structure data differently
        const knownKeys = ["operator", "values", "value"]
        const otherKeys = Object.keys(condition).filter(
            (k) => !knownKeys.includes(k)
        )

        for (const valueKey of otherKeys) {
            const value = condition[valueKey]
            if (value !== null && value !== undefined && value !== "") {
                // Handle arrays
                if (Array.isArray(value)) {
                    if (
                        condition.operator === "between" &&
                        value.length === 2
                    ) {
                        return `${value[0]} en ${value[1]}`
                    }
                    return value.join(", ")
                }
                // Handle single values (string or number)
                return String(value)
            }
        }

        // Return debug info if no value found
        console.warn("No value found for condition:", condition)
        return "<geen waarde>"
    }

    // Editing helper functions removed - dropdown is now read-only

    const renderRule = (
        rule: AutoApprovalRule,
        index: number,
        isLast: boolean = false
    ) => {
        const conditionCount = Object.keys(rule.conditions).length

        return (
            <div
                key={index}
                style={{
                    padding: "16px",
                    backgroundColor: "#f8fafc",
                    border: "2px solid #e2e8f0",
                    borderRadius: "8px",
                    marginBottom: isLast ? "12px" : "16px",
                    position: "relative",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
            >
                <div
                    style={{
                        fontSize: "13px",
                        fontWeight: "600",
                        color: colors.gray800,
                        marginBottom: "6px",
                    }}
                >
                    {rule.name}
                </div>
                <div
                    style={{
                        fontSize: "11px",
                        color: colors.gray600,
                        marginBottom: "8px",
                    }}
                >
                    {conditionCount} voorwaarde{conditionCount !== 1 ? "n" : ""}
                    {conditionCount > 1 &&
                        ` (${rule.logic === "AND" ? "alle moeten waar zijn" : "één moet waar zijn"})`}
                </div>
                {Object.entries(rule.conditions).map(
                    ([fieldKey, condition], condIndex) => (
                        <div
                            key={condIndex}
                            style={{
                                fontSize: "11px",
                                color: colors.gray700,
                                padding: "4px 8px",
                                backgroundColor: colors.white,
                                border: "1px solid #e5e7eb",
                                borderRadius: "4px",
                                marginBottom: "4px",
                                fontFamily: "monospace",
                            }}
                        >
                            <strong>{fieldKey}</strong>{" "}
                            {getOperatorLabel(condition.operator)}{" "}
                            <strong>{formatConditionValue(condition)}</strong>
                        </div>
                    )
                )}
                {/* Duplicate/Delete buttons removed - dropdown is read-only */}
            </div>
        )
    }

    return (
        <div
            style={{
                display: "inline-block",
                position: "relative",
            }}
        >
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    backgroundColor: config.enabled ? "#ecfdf5" : "#f3f4f6",
                    color: config.enabled ? "#059669" : "#6b7280",
                    border: `1px solid ${config.enabled ? "#a7f3d0" : "#d1d5db"}`,
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    fontFamily: FONT_STACK,
                }}
                onMouseOver={(e) => {
                    const target = e.currentTarget
                    if (config.enabled) {
                        target.style.backgroundColor = "#d1fae5"
                        target.style.borderColor = "#6ee7b7"
                    } else {
                        target.style.backgroundColor = "#e5e7eb"
                    }
                }}
                onMouseOut={(e) => {
                    const target = e.currentTarget
                    if (config.enabled) {
                        target.style.backgroundColor = "#ecfdf5"
                        target.style.borderColor = "#a7f3d0"
                    } else {
                        target.style.backgroundColor = "#f3f4f6"
                        target.style.borderColor = "#d1d5db"
                    }
                }}
            >
                <span
                    style={{
                        display: "inline-block",
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: config.enabled ? "#059669" : "#6b7280",
                    }}
                />
                Goedkeuringsregels {config.enabled ? "actief" : "inactief"}
                <span
                    style={{
                        fontSize: "10px",
                        transform: isExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                        transition: "transform 0.2s",
                    }}
                >
                    ▼
                </span>
            </button>

            {isExpanded && (
                <div
                    style={{
                        position: "absolute",
                        top: "100%",
                        left: 0,
                        minWidth: "320px",
                        maxWidth: "500px",
                        backgroundColor: colors.white,
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                        zIndex: 1000,
                        marginTop: "4px",
                        padding: "16px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "14px",
                            fontWeight: "600",
                            color: colors.gray800,
                            marginBottom: "12px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                            }}
                        >
                            Auto-Goedkeuringsregels voor {organizationName}
                            <div
                                style={{
                                    fontSize: "10px",
                                    padding: "2px 6px",
                                    borderRadius: "10px",
                                    backgroundColor: config.enabled
                                        ? "#dcfce7"
                                        : "#f3f4f6",
                                    color: config.enabled
                                        ? "#166534"
                                        : "#6b7280",
                                    fontWeight: "500",
                                }}
                            >
                                {config.enabled ? "ACTIEF" : "INACTIEF"}
                            </div>
                        </div>
                        {/* Edit buttons removed - dropdown is read-only */}
                    </div>

                    {!config.enabled ? (
                        <div
                            style={{
                                padding: "12px",
                                backgroundColor: "#fef3c7",
                                border: "1px solid #fcd34d",
                                borderRadius: "6px",
                                fontSize: "12px",
                                color: "#92400e",
                            }}
                        >
                            Auto-goedkeuring is uitgeschakeld. Alle boten
                            vereisen handmatige beoordeling.
                        </div>
                    ) : config.rules.length === 0 ? (
                        <div
                            style={{
                                padding: "12px",
                                backgroundColor: "#fef2f2",
                                border: "1px solid #fca5a5",
                                borderRadius: "6px",
                                fontSize: "12px",
                                color: "#dc2626",
                            }}
                        >
                            Geen regels geconfigureerd. Standaard actie:{" "}
                            {config.default_action === "auto_approve"
                                ? "automatisch goedkeuren"
                                : "handmatige beoordeling"}
                            .
                        </div>
                    ) : (
                        <>
                            <div
                                style={{
                                    fontSize: "12px",
                                    color: colors.gray600,
                                    marginBottom: "12px",
                                    padding: "8px",
                                    backgroundColor: "#f1f5f9",
                                    borderRadius: "4px",
                                }}
                            >
                                Boten worden automatisch goedgekeurd als
                                ze voldoen aan{" "}
                                <strong>
                                    één van de onderstaande regels
                                </strong>
                                :
                            </div>
                            {config.rules.map((rule, index, array) =>
                                renderRule(
                                    rule,
                                    index,
                                    index === array.length - 1
                                )
                            )}
                            <div
                                style={{
                                    fontSize: "11px",
                                    color: colors.gray600,
                                    marginTop: "8px",
                                    padding: "8px",
                                    backgroundColor: "#f8fafc",
                                    borderRadius: "4px",
                                    borderLeft: "3px solid #e2e8f0",
                                }}
                            >
                                <strong>Standaard actie:</strong> Als geen regel
                                overeenkomt →{" "}
                                {config.default_action === "auto_approve"
                                    ? "automatisch goedkeuren"
                                    : "handmatige beoordeling"}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    )
}

// ——— Main List Component ———
function InsuredObjectList() {
    const [objects, setObjects] = useState<InsuredObject[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [currentOrganization, setCurrentOrganization] = useState<
        string | null
    >(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [brokerInfo, setBrokerInfo] = useState<BrokerInfo | null>(null)

    // Load XLSX library from CDN
    const XLSX = useXLSX()

    // Load html2canvas and jsPDF libraries from CDN
    const html2canvas = useHtml2Canvas()
    const jsPDF = useJsPDF()

    // Sorting state - default to newest first (createdAt DESC)
    const [sortColumn, setSortColumn] = useState<string | null>("createdAt")
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>("desc")

    // Column-specific filters state
    const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})

    // Uitgangsdatum management state
    const [editingUitgangsdatum, setEditingUitgangsdatum] = useState<
        string | null
    >(null)
    const [showUitgangsdatumModal, setShowUitgangsdatumModal] = useState(false)
    const [selectedUitgangsdatum, setSelectedUitgangsdatum] = useState("")
    const [uitgangsdatumError, setUitgangsdatumError] = useState<string | null>(
        null
    )

    // Uitgangsdatum validation function
    const validateUitgangsdatum = (
        date: string,
        objectId?: string
    ): { isValid: boolean; error?: string } => {
        const selectedDate = new Date(date)
        const today = new Date()
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const endOfYear = new Date(today.getFullYear(), 11, 31) // December 31st of current year

        // Check if uitgangsdatum is before ingangsdatum
        if (objectId) {
            const object = objects.find(obj => obj.id === objectId)
            if (object && object.ingangsdatum) {
                const ingangsdatum = new Date(object.ingangsdatum)
                if (selectedDate < ingangsdatum) {
                    return {
                        isValid: false,
                        error: "Uitgangsdatum mag niet vóór de ingangsdatum liggen.",
                    }
                }
            }
        }

        // Admins can set any date (except uitgangsdatum before ingangsdatum which is checked above)
        if (userInfo?.role === 'admin') {
            return { isValid: true }
        }

        // Non-admin restrictions
        // Check if date is more than 1 week in the past
        if (selectedDate < oneWeekAgo) {
            return {
                isValid: false,
                error: "Uitgangsdatum kan niet meer dan 1 week in het verleden liggen. Neem contact op met de beheerders.",
            }
        }

        // Check if date is in the next year
        if (selectedDate.getFullYear() > today.getFullYear()) {
            return {
                isValid: false,
                error: "Uitgangsdatum kan niet in het volgende jaar liggen. Neem contact op met de beheerders.",
            }
        }

        return { isValid: true }
    }

    // Sorting handler - implements 3-state cycle: none → asc → desc → none
    const handleSort = useCallback((columnKey: string) => {
        setSortColumn(prevColumn => {
            // If clicking a different column, start with ascending
            if (prevColumn !== columnKey) {
                setSortDirection('asc')
                return columnKey
            }

            // Same column - cycle through states
            setSortDirection(prevDirection => {
                if (prevDirection === null || prevDirection === 'desc') {
                    // none → asc OR desc → none
                    return prevDirection === 'desc' ? null : 'asc'
                } else {
                    // asc → desc
                    return 'desc'
                }
            })

            // If we're going back to null, clear the column too
            if (sortDirection === 'desc') {
                return null
            }
            return columnKey
        })
    }, [sortDirection])

    // Dynamic schema hook
    const {
        schema,
        loading: schemaLoading,
        error: schemaError,
    } = useDynamicSchema(currentOrganization || undefined)

    // Use dynamic schema or fallback to empty array
    const COLUMNS = schema || []

    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())

    // Column order state management with localStorage persistence
    const [columnOrder, setColumnOrder] = useState<string[]>([])
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

    // Default column order
    const defaultColumnOrder = [
        "objectType", // type
        "status", // status
        "waarde", // waarde
        "naam", // custom name
        "brand", // Unified brand/merk
        "type", // Unified model/type
        "cinNummer", // CIN nummer
    ]

    // Load column order from localStorage or use default
    useEffect(() => {
        const savedOrder = localStorage.getItem('insuredObjects_columnOrder')
        if (savedOrder) {
            try {
                const parsedOrder = JSON.parse(savedOrder)
                if (Array.isArray(parsedOrder)) {
                    setColumnOrder(parsedOrder)
                } else {
                    setColumnOrder(defaultColumnOrder)
                }
            } catch (error) {
                console.warn('Failed to parse saved column order, using default:', error)
                setColumnOrder(defaultColumnOrder)
            }
        } else {
            setColumnOrder(defaultColumnOrder)
        }
    }, [])

    // Save column order to localStorage whenever it changes
    useEffect(() => {
        if (columnOrder.length > 0) {
            localStorage.setItem('insuredObjects_columnOrder', JSON.stringify(columnOrder))
        }
    }, [columnOrder])

    // Update column order when new columns are available (but preserve user customizations)
    useEffect(() => {
        if (COLUMNS.length > 0 && columnOrder.length > 0) {
            const availableColumnKeys = COLUMNS.map(col => col.key)
            const newColumns = availableColumnKeys.filter(key => !columnOrder.includes(key))

            if (newColumns.length > 0) {
                // Add new columns at the end of the user's custom order
                setColumnOrder(prev => [...prev, ...newColumns])
            }
        }
    }, [COLUMNS, columnOrder.length])

    // Update visible columns when schema changes - use filterable fields from Field Registry
    useEffect(() => {
        if (COLUMNS.length > 0) {
            // Get ALL filterable fields from Field Registry (all object types)
            const filterableFields = getAllFilterableFields(COLUMNS)

            // ADMIN BYPASS: Admins can see all filterable fields regardless of visible:false
            // Regular users respect organization's visibility settings
            const visibleFilterableFields = isAdmin(userInfo)
                ? filterableFields // Admins see all filterable fields
                : filterableFields.filter((field) => field.visible !== false) // Users respect visible:false
            const visibleFilterableColumnKeys = visibleFilterableFields.map(
                (field) => field.key
            )

            setVisibleColumns(new Set(visibleFilterableColumnKeys))
        }
    }, [COLUMNS, userInfo])
    const [organizations, setOrganizations] = useState<string[]>([])
    const [fullOrganizations, setFullOrganizations] = useState<
        Array<{ id: string; name: string }>
    >([])
    const [selectedOrganizations, setSelectedOrganizations] = useState<
        Set<string>
    >(new Set())
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)
    const [decliningObjectId, setDecliningObjectId] = useState<string | null>(
        null
    )
    const [editingObject, setEditingObject] = useState<InsuredObject | null>(
        null
    )
    const [deletingObject, setDeletingObject] = useState<InsuredObject | null>(
        null
    )
    const [showCreateForm, setShowCreateForm] = useState<boolean>(false)

    // PDF export modal state
    const [showPrintModal, setShowPrintModal] = useState<boolean>(false)

    // Export to Excel function
    const handleExportToExcel = async () => {
        // Check if XLSX library is loaded
        if (!XLSX) {
            alert("Excel bibliotheek wordt nog geladen. Probeer het over een paar seconden opnieuw.")
            return
        }

        if (!filteredObjects || filteredObjects.length === 0) {
            alert("Geen objecten om te exporteren")
            return
        }

        try {
            // Get visible columns
            const columnsToExport = visibleColumnsList

            // Create data array with formatted values
            const data = filteredObjects.map(obj => {
                const row: any = {}
                columnsToExport.forEach(col => {
                    let value = obj[col.key as keyof InsuredObject]

                    // Handle null/undefined
                    if (value === null || value === undefined) {
                        row[col.label] = ""
                        return
                    }

                    // Format dates
                    if (col.key.includes("datum") || col.key.includes("date")) {
                        row[col.label] = value ? new Date(value).toLocaleDateString("nl-NL") : ""
                        return
                    }

                    // Format currency as numbers (Excel will handle formatting)
                    if (col.key.includes("waarde") || col.key.includes("premie") || col.key === "eigenRisico") {
                        row[col.label] = typeof value === "number" ? value : value
                        return
                    }

                    // Format objectType to use Dutch labels (case-insensitive)
                    if (col.key === "objectType" && typeof value === "string") {
                        const lowerValue = value.toLowerCase()
                        if (lowerValue in OBJECT_TYPE_CONFIG) {
                            row[col.label] = OBJECT_TYPE_CONFIG[lowerValue as ObjectType].label
                        } else {
                            row[col.label] = value
                        }
                        return
                    }

                    // Translate status to Dutch
                    if (col.key === "status" && typeof value === "string") {
                        row[col.label] = STATUS_TRANSLATIONS[value as keyof typeof STATUS_TRANSLATIONS] || value
                        return
                    }

                    // Translate premiumMethod to Dutch
                    if (col.key === "premiumMethod" && typeof value === "string") {
                        row[col.label] = PREMIUM_METHOD_TRANSLATIONS[value as keyof typeof PREMIUM_METHOD_TRANSLATIONS] || value
                        return
                    }

                    row[col.label] = value
                })
                return row
            })

            // Create worksheet from data
            const worksheet = XLSX.utils.json_to_sheet(data)

            // Set column widths (auto-size based on content)
            const columnWidths = columnsToExport.map(col => ({
                wch: Math.max(col.label.length + 2, 15) // Min width of 15 characters, add padding
            }))
            worksheet['!cols'] = columnWidths

            // Add autofilter to enable Excel's filter dropdowns
            const ref = worksheet['!ref']
            if (ref) {
                worksheet['!autofilter'] = { ref: ref }
            }

            // Style the header row (row 1)
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1')
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col })
                if (!worksheet[cellAddress]) continue

                // Apply header styling
                worksheet[cellAddress].s = {
                    font: {
                        bold: true,
                        color: { rgb: "FFFFFF" },
                        sz: 12
                    },
                    fill: {
                        fgColor: { rgb: "4472C4" } // Blue background
                    },
                    alignment: {
                        horizontal: "center",
                        vertical: "center",
                        wrapText: true
                    },
                    border: {
                        top: { style: "thin", color: { rgb: "000000" } },
                        bottom: { style: "thin", color: { rgb: "000000" } },
                        left: { style: "thin", color: { rgb: "000000" } },
                        right: { style: "thin", color: { rgb: "000000" } }
                    }
                }
            }

            // Style data rows with alternating colors and borders
            for (let row = range.s.r + 1; row <= range.e.r; row++) {
                const isEvenRow = row % 2 === 0
                for (let col = range.s.c; col <= range.e.c; col++) {
                    const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
                    if (!worksheet[cellAddress]) continue

                    // Determine if this is a currency column
                    const colHeader = columnsToExport[col]
                    const isCurrency = colHeader && (
                        colHeader.key.includes("waarde") ||
                        colHeader.key.includes("premie") ||
                        colHeader.key === "eigenRisico"
                    )

                    worksheet[cellAddress].s = {
                        fill: {
                            fgColor: { rgb: isEvenRow ? "F2F2F2" : "FFFFFF" } // Alternating row colors
                        },
                        alignment: {
                            horizontal: isCurrency ? "right" : "left",
                            vertical: "center"
                        },
                        border: {
                            top: { style: "thin", color: { rgb: "D3D3D3" } },
                            bottom: { style: "thin", color: { rgb: "D3D3D3" } },
                            left: { style: "thin", color: { rgb: "D3D3D3" } },
                            right: { style: "thin", color: { rgb: "D3D3D3" } }
                        }
                    }

                    // Apply number formatting for currency
                    if (isCurrency && typeof worksheet[cellAddress].v === 'number') {
                        worksheet[cellAddress].z = '€#,##0.00' // Euro currency format
                    }
                }
            }

            // Freeze the header row
            worksheet['!freeze'] = { xSplit: 0, ySplit: 1 }

            // Create workbook and add worksheet
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, "Vloot Overzicht")

            // Generate filename
            const filename = `vloot_overzicht_${currentOrganization || "alle_organisaties"}_${new Date().toISOString().split("T")[0]}.xlsx`

            // Write file with cellStyles option enabled
            XLSX.writeFile(workbook, filename, { cellStyles: true })
        } catch (error) {
            console.error("Excel export failed:", error)
            alert("Fout bij exporteren naar Excel")
        }
    }
    const [selectedPrintObjects, setSelectedPrintObjects] = useState<
        Set<string>
    >(new Set())
    const [selectedPrintFields, setSelectedPrintFields] = useState<Set<string>>(
        new Set()
    )
    const [includeTotals, setIncludeTotals] = useState<boolean>(true)

    // Get printable fields using Field Registry logic
    // ADMIN BYPASS: Admin users can print ALL fields regardless of visible:false settings
    const printableFields = React.useMemo(() => {
        let fields
        if (isAdmin(userInfo)) {
            // Admins can print all user and system fields (exclude only auto fields like IDs)
            // Admins ignore visible:false restrictions - they can see all fields
            // Get fields from ALL object types for mixed printing
            const allObjectTypes = ["boot", "trailer", "motor"]
            const allFields = new Map<string, FieldSchema>()

            // Get fields for each object type
            for (const objectType of allObjectTypes) {
                const objectFields = getSchemaFieldsForObjectType(
                    schema,
                    objectType
                ).filter((field) => field.inputType !== "auto")
                objectFields.forEach((field) => allFields.set(field.key, field))
            }

            // Also get fields that don't specify object types (generic fields)
            const genericFields = getSchemaFieldsForObjectType(
                schema,
                undefined
            ).filter((field) => field.inputType !== "auto")
            genericFields.forEach((field) => allFields.set(field.key, field))

            fields = Array.from(allFields.values())
        } else {
            // Regular users can only print fields marked as printable in field registry
            // Regular users respect visible:false restrictions set by organization
            // Get printable fields from ALL object types for mixed printing
            const allObjectTypes = ["boot", "trailer", "motor"]
            const allFields = new Map<string, FieldSchema>()

            // Get printable fields for each object type
            for (const objectType of allObjectTypes) {
                const objectFields = getPrintableFieldsForObjectType(
                    schema,
                    objectType
                ).filter((field) => field.visible !== false)
                objectFields.forEach((field) => allFields.set(field.key, field))
            }

            // Also get generic printable fields
            const genericFields = getPrintableFieldsForObjectType(
                schema,
                undefined
            ).filter((field) => field.visible !== false)
            genericFields.forEach((field) => allFields.set(field.key, field))

            fields = Array.from(allFields.values())
        }

        return fields
    }, [schema, userInfo])

    // PDF Generation Function
    const generatePDF = async () => {
        // Check if libraries are loaded
        if (!html2canvas || !jsPDF) {
            alert("PDF bibliotheken worden nog geladen. Probeer het over een paar seconden opnieuw.")
            return
        }

        const selectedObjects = filteredObjects.filter((obj) =>
            selectedPrintObjects.has(obj.id)
        )
        // Filter selected fields and sort them according to user's column order
        const selectedFields = printableFields
            .filter((col) => selectedPrintFields.has(col.key))
            .sort((a, b) => {
                const aIndex = columnOrder.indexOf(a.key)
                const bIndex = columnOrder.indexOf(b.key)

                // If both fields are in the user's order list, sort by their position
                if (aIndex !== -1 && bIndex !== -1) {
                    return aIndex - bIndex
                }

                // If only 'a' is in the order list, it comes first
                if (aIndex !== -1) return -1

                // If only 'b' is in the order list, it comes first
                if (bIndex !== -1) return 1

                // If neither is in the order list, maintain original order (by key alphabetically)
                return a.key.localeCompare(b.key)
            })

        // Calculate enhanced totals for selected objects with status awareness
        const enhancedTotals = calculateEnhancedTotals(
            selectedObjects as EnhancedInsuredObject[]
        )
        const totalWaarde = enhancedTotals.totalValue
        const totalPremieVerzekerdePeriode = enhancedTotals.totalPeriodPremium
        const totalPremieJaar = enhancedTotals.totalYearlyPremium

        const currentDate = new Date().toLocaleDateString("nl-NL")
        const organizationName = currentOrganization || "Alle organisaties"

        // Fetch organization details for address information
        let organizationInfo: OrganizationInfo | null = null
        if (currentOrganization) {
            try {
                console.log("Fetching organization info for:", currentOrganization)
                organizationInfo = await fetchOrganizationInfo(currentOrganization)
                console.log("Organization info received:", organizationInfo)
            } catch (error) {
                console.error("Failed to fetch organization info for PDF:", error)
            }
        } else {
            console.log("No current organization set for PDF generation")
        }

        // Fetch organization logo if we have an organization ID
        let logoSrc: string | null = null
        if (organizationInfo?.id) {
            try {
                console.log("Fetching logo for organization ID:", organizationInfo.id)
                const logoData = await getOrganizationLogo(organizationInfo.id)
                if (logoData?.logoData) {
                    logoSrc = `data:image/png;base64,${logoData.logoData}`
                    console.log("Logo loaded successfully")
                } else {
                    console.log("No logo found for organization")
                }
            } catch (error) {
                console.error("Failed to fetch organization logo for print:", error)
            }
        }

        // Generate HTML content for PDF
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Vloot Overzicht - ${organizationName}</title>
    <style>
        @page {
            size: A4 landscape;
            margin: 15mm;
        }
        body {
            font-family: ${FONT_STACK};
            margin: 0;
            color: #1f2937;
            line-height: 1.3;
            font-size: 11px;
        }
        .header {
            border-bottom: 3px solid ${colors.primary};
            padding-bottom: 20px;
            margin-bottom: 25px;
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
        }
        .header-logo {
            width: 120px;
            height: auto;
            margin-right: 20px;
        }
        .header-logo-placeholder {
            width: 120px;
            height: 60px;
            background: linear-gradient(135deg, ${colors.primary} 0%, ${colors.primaryHover} 100%);
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: 600;
            font-size: 12px;
            text-align: center;
            padding: 8px;
            margin-right: 20px;
        }
        .header-left h1 {
            color: ${colors.primary};
            margin: 0 0 8px 0;
            font-size: 32px;
            font-weight: 700;
        }
        .header-left .organization-name {
            color: #1f2937;
            margin: 0 0 6px 0;
            font-size: 22px;
            font-weight: 700;
        }
        .header-left .organization-address {
            color: #6b7280;
            margin: 0;
            font-size: 14px;
            line-height: 1.4;
        }
        .header-right {
            text-align: right;
            color: #6b7280;
            font-size: 13px;
        }
        .meta-info {
            background-color: #f8fafc;
            padding: 12px 16px;
            border-radius: 6px;
            margin-bottom: 20px;
            border-left: 4px solid ${colors.primary};
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
        }
        .meta-info div {
            font-size: 12px;
            white-space: nowrap;
        }
        .meta-info strong {
            color: #374151;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            font-size: 9px;
            table-layout: auto;
        }
        th, td {
            padding: 4px 3px;
            text-align: left;
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
            word-wrap: break-word;
            max-width: 80px;
            overflow: hidden;
        }
        th {
            background-color: ${colors.gray100};
            font-weight: 600;
            color: #374151;
            border-bottom: 2px solid ${colors.gray300};
            font-size: 8px;
            position: sticky;
            top: 0;
        }
        td {
            font-size: 8px;
        }
        tr:nth-child(even) {
            background-color: #f9fafb;
        }
        .totals { 
            background-color: #f0f9ff; 
            padding: 20px; 
            border-radius: 8px; 
            border: 1px solid ${colors.primary}40;
            margin-top: 24px;
        }
        .totals h3 { 
            color: ${colors.primary}; 
            margin-top: 0; 
            font-size: 18px; 
        }
        .totals-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        .totals-item {
            background: white;
            padding: 12px;
            border-radius: 6px;
            border: 1px solid ${colors.gray200};
        }
        .totals-label {
            font-size: 13px;
            color: #6b7280;
            margin-bottom: 4px;
        }
        .totals-value {
            font-size: 16px;
            font-weight: 600;
            color: #1f2937;
        }
        .currency {
            color: ${colors.primary};
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            table {
                page-break-inside: auto;
                font-size: 8px;
            }
            th { font-size: 7px; }
            td { font-size: 7px; }
            .totals {
                page-break-before: avoid;
                font-size: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        ${logoSrc ? `
        <img src="${logoSrc}" class="header-logo" alt="${organizationName} logo" />
        ` : ``}
        <div class="header-left">
            <h1>Vloot Overzicht</h1>
            <div class="organization-name">${organizationName}</div>
            ${organizationInfo && (organizationInfo.polisnummer || organizationInfo.street || organizationInfo.postal_code || organizationInfo.city || organizationInfo.country) ? `
            <div class="organization-address">
                ${organizationInfo.polisnummer ? `<strong>Polisnummer:</strong> ${organizationInfo.polisnummer}<br>` : ''}
                ${organizationInfo.street ? `${organizationInfo.street}<br>` : ''}
                ${organizationInfo.postal_code || organizationInfo.city ?
                    `${organizationInfo.postal_code || ''} ${organizationInfo.city || ''}`.trim() + '<br>' : ''}
                ${organizationInfo.country || ''}
            </div>
            ` : `
            <div class="organization-address" style="color: #ef4444; font-size: 12px;">
                Adresgegevens niet beschikbaar
            </div>
            `}
        </div>
        <div class="header-right">
            <div><strong>Datum:</strong> ${currentDate}</div>
            <div><strong>Aantal objecten:</strong> ${selectedObjects.length}</div>
            <div><strong>Geselecteerde velden:</strong> ${selectedFields.length}</div>
        </div>
    </div>

    <table>
        <thead>
            <tr>
                ${selectedFields.map((field) => `<th>${field.label}</th>`).join("")}
            </tr>
        </thead>
        <tbody>
            ${selectedObjects
                .map(
                    (obj) => `
                <tr>
                    ${selectedFields
                        .map((field) => {
                            let value = obj[field.key as keyof typeof obj]

                            // Format specific fields
                            if (field.key === "waarde" || field.key === "eigenRisico") {
                                const numValue = Number(value) || 0
                                value = numValue.toLocaleString("nl-NL", {
                                    style: "currency",
                                    currency: "EUR",
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 0,
                                })
                            } else if (
                                field.key === "totalePremieOverHetJaar" ||
                                field.key === "totalePremieOverDeVerzekerdePeriode"
                            ) {
                                const numValue = Number(value) || 0
                                value = numValue.toLocaleString("nl-NL", {
                                    style: "currency",
                                    currency: "EUR",
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                })
                            } else if (field.key === "premiepercentage") {
                                const numValue = Number(value) || 0
                                value = numValue.toFixed(2) + "%"
                            } else if (field.key === "objectType" && typeof value === "string") {
                                // Format objectType to use Dutch labels (case-insensitive)
                                const lowerValue = value.toLowerCase()
                                if (lowerValue in OBJECT_TYPE_CONFIG) {
                                    value = OBJECT_TYPE_CONFIG[lowerValue as ObjectType].label
                                }
                            } else if (field.key === "status" && typeof value === "string") {
                                // Translate status to Dutch
                                value = STATUS_TRANSLATIONS[value as keyof typeof STATUS_TRANSLATIONS] || value
                            } else if (field.key === "premiumMethod" && typeof value === "string") {
                                // Translate premiumMethod to Dutch
                                value = PREMIUM_METHOD_TRANSLATIONS[value as keyof typeof PREMIUM_METHOD_TRANSLATIONS] || value
                            }

                            return `<td>${value || "-"}</td>`
                        })
                        .join("")}
                </tr>
            `
                )
                .join("")}
        </tbody>
    </table>

    ${
        includeTotals
            ? `
    <div class="totals">
        <h3>Totaaloverzicht (Status-bewuste berekening)</h3>
        <div class="totals-grid">
            <div class="totals-item">
                <div class="totals-label">Totale verzekerde waarde van de objecten</div>
                <div class="totals-value currency">€${totalWaarde.toLocaleString("nl-NL")}</div>
            </div>
            <div class="totals-item">
                <div class="totals-label">Totale premie over de verzekerde periode</div>
                <div class="totals-value currency">€${totalPremieVerzekerdePeriode.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div class="totals-item">
                <div class="totals-label">Totale jaarpremie over het kalenderjaar</div>
                <div class="totals-value currency">€${totalPremieJaar.toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
        </div>
        <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
            * Alleen objecten met status "Verzekerd" en "Afgevoerd" worden meegerekend in premieberekeningen
        </div>
    </div>
    `
            : ""
    }
</body>
</html>`

        // Create a temporary container to hold the HTML content
        const tempContainer = document.createElement("div")
        tempContainer.id = "pdf-temp-container"

        // Set the full HTML including styles
        tempContainer.innerHTML = htmlContent.replace('<!DOCTYPE html>', '').replace(/<\/?html[^>]*>/g, '').replace(/<\/?head[^>]*>/g, '').replace(/<\/?body[^>]*>/g, '')

        // Style the container - position it in viewport
        tempContainer.style.position = "fixed"
        tempContainer.style.top = "0"
        tempContainer.style.left = "0"
        tempContainer.style.width = "1120px" // Approximate A4 landscape width in pixels
        tempContainer.style.minHeight = "100px" // Force minimum height
        tempContainer.style.fontFamily = FONT_STACK
        tempContainer.style.fontSize = "11px"
        tempContainer.style.color = "#1f2937"
        tempContainer.style.backgroundColor = "#ffffff"
        tempContainer.style.padding = "20px"
        tempContainer.style.boxSizing = "border-box"
        tempContainer.style.zIndex = "999999" // On top for capture
        tempContainer.style.pointerEvents = "none" // Don't intercept clicks
        document.body.appendChild(tempContainer)

        // Wait for browser to calculate dimensions and load images
        await new Promise(resolve => setTimeout(resolve, 300))

        console.log("Container dimensions:", tempContainer.offsetWidth, "x", tempContainer.offsetHeight)
        console.log("Container child count:", tempContainer.children.length)

        // Check if we have content
        if (tempContainer.offsetHeight === 0) {
            console.error("Container has no height! Content may not be rendering.")
            console.log("Container HTML:", tempContainer.innerHTML.substring(0, 500))
        }

        // Configure PDF options
        const opt = {
            margin: [15, 15, 15, 15],
            filename: `Vloot_Overzicht_${organizationName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: true,
                backgroundColor: '#ffffff'
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
        }

        // Generate PDF using direct html2canvas call for better debugging
        try {
            console.log("Starting PDF generation...")

            // Manually call html2canvas with detailed options
            console.log("Calling html2canvas directly on element...")
            const canvas = await html2canvas(tempContainer, {
                scale: 2,
                useCORS: true,
                logging: true,
                backgroundColor: '#ffffff',
                width: tempContainer.offsetWidth,
                height: tempContainer.offsetHeight,
                windowWidth: tempContainer.scrollWidth,
                windowHeight: tempContainer.scrollHeight
            })

            console.log("Canvas created:", canvas.width, "x", canvas.height)

            if (canvas.width === 0 || canvas.height === 0) {
                console.error("Canvas has invalid dimensions!")
                alert("Failed to generate PDF: Canvas has no dimensions")
                document.body.removeChild(tempContainer)
                return
            }

            // Check if canvas has content
            const ctx = canvas.getContext('2d')
            const imageData = ctx?.getImageData(0, 0, Math.min(100, canvas.width), Math.min(100, canvas.height))
            const hasContent = imageData?.data.some((pixel, i) => i % 4 === 3 && pixel > 0) || false
            console.log("Canvas has content:", hasContent)

            // Convert canvas to image data URL
            const imgData = canvas.toDataURL('image/jpeg', 0.98)
            console.log("Image data URL created, length:", imgData.length)

            // Create jsPDF instance
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            })

            // Calculate dimensions to fit on page
            const pageWidth = pdf.internal.pageSize.getWidth()
            const pageHeight = pdf.internal.pageSize.getHeight()
            const margin = 15

            const availableWidth = pageWidth - (2 * margin)
            const availableHeight = pageHeight - (2 * margin)

            const imgWidth = canvas.width
            const imgHeight = canvas.height
            const ratio = Math.min(availableWidth / (imgWidth * 0.264583), availableHeight / (imgHeight * 0.264583))

            const finalWidth = imgWidth * 0.264583 * ratio
            const finalHeight = imgHeight * 0.264583 * ratio

            console.log("Adding image to PDF:", finalWidth, "x", finalHeight)

            // Add image to PDF
            pdf.addImage(imgData, 'JPEG', margin, margin, finalWidth, finalHeight)

            // Save the PDF
            const filename = `Vloot_Overzicht_${organizationName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
            pdf.save(filename)

            console.log("PDF saved successfully")

            // Clean up
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer)
            }
            setShowPrintModal(false)

        } catch (error) {
            console.error("Failed to generate PDF:", error)
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer)
            }
            throw error
        }
    }

    // Toggle functions
    const toggleColumn = (column: string) => {
        const newVisibleColumns = new Set(visibleColumns)
        if (newVisibleColumns.has(column)) {
            newVisibleColumns.delete(column)
        } else {
            newVisibleColumns.add(column)
        }
        setVisibleColumns(newVisibleColumns)
    }

    // Column reordering functions
    const moveColumn = (dragIndex: number, hoverIndex: number) => {
        const newOrder = [...columnOrder]
        const draggedColumn = newOrder[dragIndex]

        // Remove the dragged column from its current position
        newOrder.splice(dragIndex, 1)
        // Insert it at the new position
        newOrder.splice(hoverIndex, 0, draggedColumn)

        setColumnOrder(newOrder)
    }

    const resetColumnOrder = () => {
        setColumnOrder([...defaultColumnOrder])
        localStorage.removeItem('insuredObjects_columnOrder')
    }

    // Drag and drop event handlers
    const handleDragStart = (e: React.DragEvent, columnKey: string) => {
        setDraggedColumn(columnKey)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', columnKey)

        // Add some visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5'
        }
    }

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedColumn(null)
        setDragOverColumn(null)

        // Reset visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1'
        }
    }

    const handleDragOver = (e: React.DragEvent, columnKey: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverColumn(columnKey)
    }

    const handleDragLeave = () => {
        setDragOverColumn(null)
    }

    const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
        e.preventDefault()

        const draggedColumnKey = e.dataTransfer.getData('text/plain')
        if (draggedColumnKey && draggedColumnKey !== targetColumnKey) {
            const dragIndex = columnOrder.indexOf(draggedColumnKey)
            const hoverIndex = columnOrder.indexOf(targetColumnKey)

            if (dragIndex !== -1 && hoverIndex !== -1) {
                moveColumn(dragIndex, hoverIndex)
            }
        }

        setDraggedColumn(null)
        setDragOverColumn(null)
    }

    const toggleOrganization = (org: string) => {
        const newSelected = new Set(selectedOrganizations)
        if (newSelected.has(org)) {
            newSelected.delete(org)
        } else {
            newSelected.add(org)
        }
        setSelectedOrganizations(newSelected)
    }

    // Object type filter removed

    // Load data and parse URL parameters
    useEffect(() => {
        // Parse URL parameters for organization context
        const urlParams = new URLSearchParams(window.location.search)
        const orgParam = urlParams.get("org")
        if (orgParam) {
            setCurrentOrganization(decodeURIComponent(orgParam))
        }

        async function loadData() {
            setIsLoading(true)
            setError(null)

            try {
                // Get user info first
                const basicUserInfo = getUserInfo()
                if (!basicUserInfo) {
                    throw new Error("Log in om verzekerde objecten te bekijken")
                }

                // Fetch detailed user info from backend
                const detailedUserInfo = await fetchUserInfo(basicUserInfo.sub)
                if (detailedUserInfo) {
                    setUserInfo(detailedUserInfo)
                } else {
                    setUserInfo(basicUserInfo)
                }

                // Load organizations
                await loadOrganizations()

                // Don't fetch objects here if we have an org param - let the other useEffect handle it
                if (!orgParam) {
                    await fetchObjects()
                }
            } catch (err: any) {
                setError(err.message || "Kon gegevens niet laden")
            } finally {
                setIsLoading(false)
            }
        }

        async function loadOrganizations() {
            try {
                const orgs = await fetchOrganizations()
                setOrganizations(orgs)
                setSelectedOrganizations(new Set(orgs)) // Select all by default

                // Also load full organization objects for logo display
                const fullOrgs = await fetchFullOrganizations()
                setFullOrganizations(fullOrgs)
            } catch (err) {
                console.error("Failed to load organizations:", err)
            }
        }

        loadData()
    }, [])

    // Refetch objects when organization context changes
    useEffect(() => {
        if (userInfo && currentOrganization !== null) {
            setIsLoading(true)
            fetchObjects()
                .catch((err) => {
                    console.error("Failed to refetch objects:", err)
                    setError(err.message || "Kon objecten niet ophalen")
                })
                .finally(() => {
                    setIsLoading(false)
                })
        }
    }, [currentOrganization, userInfo])

    // Fetch broker info when organization changes
    useEffect(() => {
        async function loadBrokerInfo() {
            if (currentOrganization) {
                try {
                    const brokerData =
                        await fetchBrokerInfoForOrganization(
                            currentOrganization
                        )
                    setBrokerInfo(brokerData)
                } catch (error) {
                    console.error("Failed to fetch broker info:", error)
                    setBrokerInfo(null)
                }
            } else {
                setBrokerInfo(null)
            }
        }

        loadBrokerInfo()
    }, [currentOrganization])

    async function fetchObjects() {
        try {
            const token = getIdToken()
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            if (token) headers.Authorization = `Bearer ${token}`

            // Build URL with organization parameter if needed
            let url = `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}`
            if (currentOrganization) {
                url += `?organization=${encodeURIComponent(currentOrganization)}`
            }

            console.log(`Fetching objects from: ${url}`)
            console.log(`Current organization: ${currentOrganization}`)

            const res = await fetch(url, {
                method: "GET",
                headers,
                mode: "cors",
            })

            if (!res.ok) {
                throw new Error(
                    `Failed to fetch objects: ${res.status} ${res.statusText}`
                )
            }

            const data = await res.json()
            console.log(`Received data:`, data)

            // More robust data parsing with null safety
            let objectsList: InsuredObject[] = []
            if (Array.isArray(data)) {
                objectsList = data
            } else if (
                data &&
                typeof data === "object" &&
                Array.isArray(data.items)
            ) {
                objectsList = data.items
            } else {
                console.warn("Unexpected API response format:", data)
                objectsList = []
            }

            console.log(`Setting objects: ${objectsList.length} items`)
            // Update all objects with calculated premium values for consistency
            const objectsWithCalculatedPremiums = objectsList.map((obj) =>
                updateObjectWithCalculatedPremiums(obj)
            )
            setObjects(objectsWithCalculatedPremiums)
        } catch (err: any) {
            console.error("Error in fetchObjects:", err)
            // Ensure objects remains an empty array on error, not null
            setObjects([])
            throw new Error(err.message || "Failed to fetch insured objects")
        }
    }

    // Role-aware filtering with organization-specific context
    // Debug logging to understand objects state
    console.log(
        "Objects state before filtering:",
        objects,
        typeof objects,
        Array.isArray(objects)
    )

    const filteredObjects =
        objects && Array.isArray(objects)
            ? sortObjects(
                  filterObjects(
                      objects,
                      searchTerm,
                      selectedOrganizations,
                      organizations,
                      isAdmin(userInfo),
                      currentOrganization, // Pass current organization for filtering
                      columnFilters // Pass column-specific filters
                  ).map((obj) => updateObjectWithCalculatedPremiums(obj)), // Ensure calculated fields are up-to-date
                  sortColumn,
                  sortDirection
              )
            : []

    const getVisibleColumnsList = () => {
        // Filter columns based on visibility and filterable flag from field registry
        // REMOVED data availability filtering to show ALL filterable fields
        const filteredColumns = COLUMNS.filter((col) => {
            if (!visibleColumns.has(col.key)) return false

            // Only show columns that are filterable according to field registry
            if (!col.filterable) return false

            // Show all filterable fields regardless of whether they have data
            // This allows users to filter by any filterable field from the Field Registry
            return true
        })

        // Sort columns based on user-defined column order
        return filteredColumns.sort((a, b) => {
            const aIndex = columnOrder.indexOf(a.key)
            const bIndex = columnOrder.indexOf(b.key)

            // If both columns are in the user's order list, sort by their position
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex
            }

            // If only 'a' is in the order list, it comes first
            if (aIndex !== -1) return -1

            // If only 'b' is in the order list, it comes first
            if (bIndex !== -1) return 1

            // If neither is in the order list, maintain original order (by key alphabetically)
            return a.key.localeCompare(b.key)
        })
    }

    const visibleColumnsList = getVisibleColumnsList()

    // Action handlers
    const handleEdit = useCallback((object: InsuredObject) => {
        console.log("handleEdit called with object:", object)
        setEditingObject(object)
    }, [])

    const handleDelete = useCallback((object: InsuredObject) => {
        console.log("handleDelete called with object:", object)
        setDeletingObject(object)
    }, [])

    const handleConfirmDelete = useCallback(async () => {
        if (!deletingObject) return

        try {
            const token = getIdToken()
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${deletingObject.id}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            )

            if (!res.ok) {
                throw new Error(
                    `Failed to delete: ${res.status} ${res.statusText}`
                )
            }

            // Show success message
            const objectLabel = OBJECT_TYPE_CONFIG[deletingObject.objectType?.toLowerCase() as ObjectType]?.label || "Object"
            setSuccessMessage(
                `${objectLabel} deleted successfully!`
            )

            // Refresh the list
            await fetchObjects()
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to delete object")
        } finally {
            setDeletingObject(null)
        }
    }, [deletingObject])

    const handleApprove = useCallback(async (object: InsuredObject) => {
        try {
            const token = getIdToken()
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${object.id}/approve`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({}),
                }
            )

            if (!res.ok) {
                throw new Error(
                    `Failed to approve: ${res.status} ${res.statusText}`
                )
            }

            // Show success message
            setSuccessMessage("Object approved successfully!")

            // Refresh the list
            await fetchObjects()
        } catch (err: any) {
            setErrorMessage(err.message || "Failed to approve object")
        }
    }, [])

    const handleDecline = useCallback((object: InsuredObject) => {
        setDecliningObjectId(object.id)
    }, [])

    const handleDeclineWithReason = useCallback(
        async (reason: string) => {
            if (!decliningObjectId) return

            try {
                const token = getIdToken()
                const res = await fetch(
                    `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${decliningObjectId}/decline`,
                    {
                        method: "PUT",
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({ reason }),
                    }
                )

                if (!res.ok) {
                    throw new Error(
                        `Failed to decline: ${res.status} ${res.statusText}`
                    )
                }

                // Show success message
                setSuccessMessage("Object declined successfully!")

                // Refresh the list
                await fetchObjects()
            } catch (err: any) {
                setErrorMessage(err.message || "Failed to decline object")
            } finally {
                setDecliningObjectId(null)
            }
        },
        [decliningObjectId]
    )

    // Uitgangsdatum handlers
    const handleUitgangsdatumClick = useCallback(
        (objectId: string, currentDate?: string) => {
            setEditingUitgangsdatum(objectId)
            setSelectedUitgangsdatum(
                currentDate || new Date().toISOString().split("T")[0]
            )
            setUitgangsdatumError(null)
            setShowUitgangsdatumModal(true)
        },
        []
    )

    const handleUitgangsdatumCancel = useCallback(() => {
        setEditingUitgangsdatum(null)
        setSelectedUitgangsdatum("")
        setUitgangsdatumError(null)
        setShowUitgangsdatumModal(false)
    }, [])

    const handleUitgangsdatumConfirm = useCallback(async () => {
        if (!editingUitgangsdatum || !selectedUitgangsdatum) return

        // Validate the date with object ID for ingangsdatum comparison
        const validation = validateUitgangsdatum(selectedUitgangsdatum, editingUitgangsdatum)
        if (!validation.isValid) {
            setUitgangsdatumError(validation.error || "Invalid date")
            return
        }

        try {
            const token = getIdToken()
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${editingUitgangsdatum}`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        uitgangsdatum: selectedUitgangsdatum,
                        status: "Removed",
                    }),
                }
            )

            if (!res.ok) {
                throw new Error(
                    `Failed to update: ${res.status} ${res.statusText}`
                )
            }

            // Show success message
            setSuccessMessage(
                "Uitgangsdatum successfully set - object is now out of policy"
            )

            // Refresh the list
            await fetchObjects()

            // Close modal
            handleUitgangsdatumCancel()
        } catch (err: any) {
            setUitgangsdatumError(
                err.message || "Failed to update uitgangsdatum"
            )
        }
    }, [
        editingUitgangsdatum,
        selectedUitgangsdatum,
        validateUitgangsdatum,
        handleUitgangsdatumCancel,
    ])

    if (isLoading || schemaLoading) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <div style={styles.spinner} />
                <div style={{ marginTop: "16px", color: colors.gray600 }}>
                    {schemaLoading
                        ? "Loading schema configuration..."
                        : "Loading insured objects..."}
                </div>
            </div>
        )
    }

    // Handle schema loading errors
    if (schemaError && !schema) {
        console.warn("Schema loading error:", schemaError)
        // Continue with default schema - error is logged but not blocking
    }

    if (error) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <div style={{ color: colors.error, marginBottom: "16px" }}>
                    {error}
                </div>
                <button
                    onClick={() => window.location.reload()}
                    style={styles.primaryButton}
                >
                    Retry
                </button>
            </div>
        )
    }

    const userRole = userInfo?.role || "user"

    // Check if current user can perform any actions (for showing Actions column)
    const canPerformActions = userInfo ? (
        hasPermission(userInfo, "INSURED_OBJECT_UPDATE") ||
        hasPermission(userInfo, "INSURED_OBJECT_DELETE")
    ) : false

    return (
        <div
            style={{
                padding: "24px",
                backgroundColor: "#f8fafc",
                minHeight: "100vh",
                fontFamily: FONT_STACK,
            }}
        >
            {/* Back Navigation (when viewing specific organization) */}
            {currentOrganization && (
                <div style={{ marginBottom: "16px" }}>
                    <button
                        onClick={() => {
                            window.location.href = "/organizations"
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "10px 16px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "13px",
                            fontWeight: "500",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) => {
                            ;(
                                e.target as HTMLButtonElement
                            ).style.backgroundColor = "#e5e7eb"
                        }}
                        onMouseOut={(e) => {
                            ;(
                                e.target as HTMLButtonElement
                            ).style.backgroundColor = "#f3f4f6"
                        }}
                    >
                        <FaArrowLeft size={12} />
                        <FaBuilding size={12} />
                        Organisaties
                    </button>
                </div>
            )}

            {/* User Info Banner */}
            <div style={{ marginBottom: "20px" }}>
                <UserInfoBanner
                    currentOrganization={currentOrganization || undefined}
                    showCurrentOrg={!!currentOrganization}
                    brokerInfo={brokerInfo || undefined}
                />
            </div>

            {/* Logo banners removed - logo integrated into table header instead */}

            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    overflow: "hidden",
                }}
            >
                {/* Logo moved to main title area */}
                {/* Header */}
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
                                {userRole === "admin" && (
                                    <FaUserShield
                                        size={20}
                                        color={colors.primary}
                                    />
                                )}
                                {userRole === "editor" && (
                                    <FaUserEdit
                                        size={20}
                                        color={colors.primary}
                                    />
                                )}
                                {userRole === "user" && (
                                    <FaUser size={20} color={colors.gray500} />
                                )}
                                <h1
                                    style={{
                                        fontSize: "32px",
                                        fontWeight: "600",
                                        color: "#1f2937",
                                        margin: 0,
                                        letterSpacing: "-0.025em",
                                    }}
                                >
                                    Vloot Beheer
                                </h1>
                            </div>
                            {/* Logo next to main title */}
                            {userInfo &&
                                fullOrganizations.length > 0 &&
                                (() => {
                                    // Determine which organization to show logo for
                                    let targetOrg = null

                                    if (currentOrganization) {
                                        // Find matching organization when specific org is selected
                                        targetOrg =
                                            fullOrganizations.find(
                                                (org) =>
                                                    org.name ===
                                                    currentOrganization
                                            ) ||
                                            fullOrganizations.find(
                                                (org) =>
                                                    org.name &&
                                                    currentOrganization &&
                                                    org.name
                                                        .toLowerCase()
                                                        .trim() ===
                                                        currentOrganization
                                                            .toLowerCase()
                                                            .trim()
                                            )
                                    } else if (
                                        isUser(userInfo) &&
                                        fullOrganizations.length === 1
                                    ) {
                                        // Show logo for single-org users
                                        targetOrg = fullOrganizations[0]
                                    }

                                    if (!targetOrg) return null

                                    return (
                                        <LogoDisplay
                                            organizationId={targetOrg.id}
                                            organizationName={targetOrg.name}
                                            size="large"
                                            showFallback={false}
                                        />
                                    )
                                })()}
                        </div>
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                            }}
                        >
                            <div
                                style={{
                                    fontSize: "14px",
                                    color: "#6b7280",
                                    backgroundColor: "#f3f4f6",
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                }}
                            >
                                {filteredObjects.length} objecten
                            </div>
                            {/* Clear filters button - show when filters are active */}
                            {Object.keys(columnFilters).some(key => columnFilters[key]?.trim()) && (
                                <button
                                    onClick={() => setColumnFilters({})}
                                    style={{
                                        padding: "8px 12px",
                                        backgroundColor: colors.primary,
                                        color: "#ffffff",
                                        border: "none",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        fontWeight: "500",
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "background-color 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.primaryHover
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.primary
                                    }}
                                >
                                    <FaTimes size={12} />
                                    Clear Filters
                                </button>
                            )}
                            <ExportPdfButton
                                onExportClick={() => setShowPrintModal(true)}
                            />
                            <ExportExcelButton
                                onExportClick={handleExportToExcel}
                            />
                            {userInfo &&
                                hasPermission(
                                    userInfo,
                                    "INSURED_OBJECT_CREATE"
                                ) && (
                                    <CreateObjectButton
                                        onCreateClick={() =>
                                            setShowCreateForm(true)
                                        }
                                    />
                                )}
                        </div>
                    </div>

                    {/* Auto Accept Rules Display - only show when viewing specific organization */}
                    {currentOrganization && (
                        <div
                            style={{
                                marginTop: "16px",
                                marginBottom: "8px",
                                display: "flex",
                                justifyContent: "flex-start",
                            }}
                        >
                            <AutoAcceptRulesDisplay
                                organizationName={currentOrganization}
                            />
                        </div>
                    )}

                    <SearchAndFilterBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                        organizations={organizations}
                        selectedOrganizations={selectedOrganizations}
                        onOrganizationChange={toggleOrganization}
                        // Object type filter props removed
                        showOrgFilter={
                            isAdmin(userInfo) && !currentOrganization
                        }
                        userInfo={userInfo}
                        columns={COLUMNS}
                        onResetColumnOrder={resetColumnOrder}
                    />
                </div>

                <div
                    style={{
                        overflowX: "auto",
                        position: "relative",
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: "14px",
                            minWidth: "1000px",
                            tableLayout: "auto", // Dynamic column widths based on content
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
                                {/* Actions Column - only show if user can perform actions */}
                                {canPerformActions && (
                                    <th
                                        style={{
                                            padding: "12px 8px",
                                            textAlign: "left",
                                            borderBottom: "2px solid #e2e8f0",
                                            fontWeight: "600",
                                            color: "#475569",
                                            fontSize: "13px",
                                            width: "100px",
                                        }}
                                    >
                                        Actions
                                    </th>
                                )}

                                {/* Dynamic columns */}
                                {visibleColumnsList.map((col) => (
                                    <th
                                        key={col.key}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, col.key)}
                                        onDragEnd={handleDragEnd}
                                        onDragOver={(e) => handleDragOver(e, col.key)}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, col.key)}
                                        style={{
                                            padding: "12px 8px",
                                            textAlign: "left",
                                            borderBottom: "2px solid #e2e8f0",
                                            fontWeight: "600",
                                            color: "#475569",
                                            fontSize: "13px",
                                            cursor: col.sortable ? "pointer" : "move", // Show pointer for sortable columns
                                            minWidth: col.width, // Use minWidth instead of width for dynamic sizing
                                            whiteSpace: "nowrap", // Prevent text wrapping for better readability
                                            backgroundColor:
                                                dragOverColumn === col.key
                                                    ? "#e2e8f0"
                                                    : draggedColumn === col.key
                                                    ? "#f1f5f9"
                                                    : "transparent",
                                            transition: "background-color 0.2s ease",
                                            userSelect: "none",
                                            position: "relative",
                                        }}
                                        onClick={() =>
                                            col.sortable && handleSort(col.key)
                                        }
                                    >
                                        {col.label}
                                        {col.sortable && sortColumn === col.key && (
                                            <span style={{ marginLeft: "4px", fontSize: "12px" }}>
                                                {sortDirection === 'asc' ? '↑' : '↓'}
                                            </span>
                                        )}
                                        {dragOverColumn === col.key && (
                                            <div style={{
                                                position: "absolute",
                                                left: "0",
                                                top: "0",
                                                bottom: "0",
                                                width: "3px",
                                                backgroundColor: "#3b82f6",
                                                borderRadius: "1px"
                                            }} />
                                        )}
                                    </th>
                                ))}
                            </tr>
                            {/* Filter row */}
                            <tr>
                                {/* Empty cell for Actions column */}
                                {canPerformActions && (
                                    <th
                                        style={{
                                            padding: "8px",
                                            borderBottom: "1px solid #e2e8f0",
                                            backgroundColor: "#f8fafc",
                                        }}
                                    />
                                )}

                                {/* Filter inputs for each column */}
                                {visibleColumnsList.map((col) => (
                                    <th
                                        key={`filter-${col.key}`}
                                        style={{
                                            padding: "8px",
                                            borderBottom: "1px solid #e2e8f0",
                                            backgroundColor: "#f8fafc",
                                        }}
                                    >
                                        {col.filterable && (
                                            <input
                                                type="text"
                                                placeholder={`Filter ${col.label}...`}
                                                value={columnFilters[col.key] || ""}
                                                onChange={(e) => {
                                                    setColumnFilters(prev => ({
                                                        ...prev,
                                                        [col.key]: e.target.value
                                                    }))
                                                }}
                                                onClick={(e) => e.stopPropagation()}
                                                style={{
                                                    width: "100%",
                                                    padding: "6px 8px",
                                                    fontSize: "12px",
                                                    border: "1px solid #cbd5e1",
                                                    borderRadius: "4px",
                                                    backgroundColor: "#ffffff",
                                                    color: "#1e293b",
                                                    outline: "none",
                                                }}
                                                onFocus={(e) => {
                                                    e.target.style.borderColor = colors.primary
                                                    e.target.style.boxShadow = `0 0 0 1px ${colors.primary}`
                                                }}
                                                onBlur={(e) => {
                                                    e.target.style.borderColor = "#cbd5e1"
                                                    e.target.style.boxShadow = "none"
                                                }}
                                            />
                                        )}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredObjects.map((object, index) => (
                                <tr
                                    key={object.id}
                                    style={{
                                        backgroundColor:
                                            object.status === "Removed"
                                                ? "#f9fafb"
                                                : index % 2 === 0
                                                  ? "#ffffff"
                                                  : "#f8fafc",
                                        opacity:
                                            object.status === "Removed"
                                                ? 0.6
                                                : 1,
                                        transition:
                                            "background-color 0.2s, opacity 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                        if (object.status !== "Removed") {
                                            e.currentTarget.style.backgroundColor =
                                                "#f1f5f9"
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        const originalBg =
                                            object.status === "Removed"
                                                ? "#f9fafb"
                                                : index % 2 === 0
                                                  ? "#ffffff"
                                                  : "#f8fafc"
                                        e.currentTarget.style.backgroundColor =
                                            originalBg
                                    }}
                                >
                                    {/* Actions cell - only show if user can perform actions */}
                                    {canPerformActions && (
                                        <td
                                            style={{
                                                padding: "12px 8px",
                                                borderBottom: "1px solid #f1f5f9",
                                                whiteSpace: "nowrap",
                                                textAlign: "right",
                                            }}
                                        >
                                            <ActionDropdownMenu
                                                object={object}
                                                onEdit={handleEdit}
                                                onDelete={handleDelete}
                                                userInfo={userInfo}
                                            />
                                        </td>
                                    )}

                                    {/* Dynamic data cells */}
                                    {visibleColumnsList.map((col) => {
                                        // Special handling for objectType column to show icon + label
                                        if (col.key === "objectType") {
                                            // Case-insensitive lookup to handle both "Boot" and "boot"
                                            const config =
                                                OBJECT_TYPE_CONFIG[
                                                    object.objectType?.toLowerCase() as ObjectType
                                                ]
                                            if (!config) {
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
                                                        }}
                                                    >
                                                        <span>{object.objectType || "Onbekend"}</span>
                                                    </td>
                                                )
                                            }
                                            const IconComponent = config.icon
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
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "8px",
                                                        }}
                                                    >
                                                        <IconComponent
                                                            size={16}
                                                            color={config.color}
                                                        />
                                                        <span>
                                                            {config.label}
                                                        </span>
                                                    </div>
                                                </td>
                                            )
                                        }

                                        // Special handling for status column to show colored badge
                                        if (col.key === "status") {
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
                                                    }}
                                                >
                                                    <UnifiedStatusCell
                                                        object={object}
                                                        userInfo={userInfo}
                                                    />
                                                </td>
                                            )
                                        }

                                        // Special handling for uitgangsdatum column to make it clickable (Admin/Editor only)
                                        if (col.key === "uitgangsdatum") {
                                            const cellValue =
                                                object.uitgangsdatum
                                            const hasValue =
                                                cellValue &&
                                                cellValue.trim() !== ""

                                            // Check if user has permission to edit uitgangsdatum
                                            const canEditUitgangsdatum = userInfo && (isAdmin(userInfo) || isEditor(userInfo))

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
                                                        cursor:
                                                            canEditUitgangsdatum && object.status !==
                                                            "Removed"
                                                                ? "pointer"
                                                                : "default",
                                                    }}
                                                    onClick={() => {
                                                        if (
                                                            canEditUitgangsdatum &&
                                                            object.status !==
                                                            "Removed"
                                                        ) {
                                                            handleUitgangsdatumClick(
                                                                object.id,
                                                                cellValue
                                                            )
                                                        }
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if (
                                                            canEditUitgangsdatum &&
                                                            object.status !==
                                                                "Removed" &&
                                                            !hasValue
                                                        ) {
                                                            const div =
                                                                e.currentTarget.querySelector(
                                                                    "div"
                                                                )
                                                            if (div) {
                                                                div.style.backgroundColor =
                                                                    "#bfdbfe"
                                                                div.style.borderColor =
                                                                    "#1d4ed8"
                                                                div.style.transform =
                                                                    "scale(1.02)"
                                                            }
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (
                                                            canEditUitgangsdatum &&
                                                            object.status !==
                                                                "Removed" &&
                                                            !hasValue
                                                        ) {
                                                            const div =
                                                                e.currentTarget.querySelector(
                                                                    "div"
                                                                )
                                                            if (div) {
                                                                div.style.backgroundColor =
                                                                    "#dbeafe"
                                                                div.style.borderColor =
                                                                    colors.primary
                                                                div.style.transform =
                                                                    "scale(1)"
                                                            }
                                                        }
                                                    }}
                                                    title={
                                                        !canEditUitgangsdatum
                                                            ? "Alleen Admin en Editors kunnen uitgangsdatum instellen"
                                                            : object.status !==
                                                              "Removed"
                                                            ? "Klik om uitgangsdatum in te stellen"
                                                            : "Uitgangsdatum is al ingesteld"
                                                    }
                                                >
                                                    <div
                                                        style={{
                                                            padding: hasValue
                                                                ? "6px 12px"
                                                                : "8px 16px",
                                                            borderRadius: "8px",
                                                            backgroundColor:
                                                                canEditUitgangsdatum && object.status !==
                                                                "Removed"
                                                                    ? hasValue
                                                                        ? "#f8fafc"
                                                                        : "#dbeafe"
                                                                    : "transparent",
                                                            border:
                                                                canEditUitgangsdatum && object.status !==
                                                                    "Removed" &&
                                                                !hasValue
                                                                    ? "1px solid #3b82f6"
                                                                    : hasValue
                                                                      ? "1px solid #e5e7eb"
                                                                      : "none",
                                                            color:
                                                                canEditUitgangsdatum && object.status !==
                                                                "Removed"
                                                                    ? hasValue
                                                                        ? "#374151"
                                                                        : "#1d4ed8"
                                                                    : "#d1d5db",
                                                            fontWeight: hasValue
                                                                ? "normal"
                                                                : canEditUitgangsdatum ? "500" : "normal",
                                                            fontSize: hasValue
                                                                ? "13px"
                                                                : "12px",
                                                            fontFamily:
                                                                "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                                                            textAlign: "center",
                                                            minWidth: hasValue
                                                                ? "auto"
                                                                : canEditUitgangsdatum ? "160px" : "auto",
                                                            transition:
                                                                "all 0.2s ease",
                                                            opacity:
                                                                object.status ===
                                                                "Removed" || !canEditUitgangsdatum
                                                                    ? 0.8
                                                                    : 1,
                                                        }}
                                                    >
                                                        {hasValue
                                                            ? new Date(
                                                                  cellValue
                                                              ).toLocaleDateString("nl-NL")
                                                            : canEditUitgangsdatum && object.status !== "Removed"
                                                              ? "Klik hier om een uitgangsdatum aan te geven"
                                                              : "-"}
                                                    </div>
                                                </td>
                                            )
                                        }

                                        // Regular cell rendering using direct field access
                                        const cellValue =
                                            object[
                                                col.key as keyof InsuredObject
                                            ]

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
                                                    wordBreak: "break-word",
                                                    whiteSpace: "normal",
                                                }}
                                                title={String(cellValue ?? "-")}
                                            >
                                                {renderObjectCellValue(
                                                    col,
                                                    cellValue,
                                                    object
                                                )}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enhanced Totals Display with Status-Aware Calculations */}
            <EnhancedTotalsDisplay
                objects={filteredObjects as EnhancedInsuredObject[]}
                showBreakdown={true}
            />

            {/* Notifications */}
            {successMessage &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                zIndex: 1000,
                            }}
                        />
                        <SuccessNotification
                            message={successMessage}
                            onClose={() => setSuccessMessage(null)}
                        />
                    </>,
                    document.body
                )}

            {errorMessage &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                zIndex: 1000,
                            }}
                        />
                        <ErrorNotification
                            message={errorMessage}
                            onClose={() => setErrorMessage(null)}
                        />
                    </>,
                    document.body
                )}

            {decliningObjectId &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                zIndex: 1000,
                            }}
                        />
                        <DeclineReasonDialog
                            onSubmit={handleDeclineWithReason}
                            onCancel={() => setDecliningObjectId(null)}
                        />
                    </>,
                    document.body
                )}

            {editingObject &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                zIndex: 1000,
                            }}
                        />
                        <EditInsuredObjectDialog
                            object={editingObject}
                            onClose={() => setEditingObject(null)}
                            onSuccess={async () => {
                                await fetchObjects()
                                const objectLabel = OBJECT_TYPE_CONFIG[editingObject.objectType?.toLowerCase() as ObjectType]?.label || "Object"
                                setSuccessMessage(
                                    `${objectLabel} updated successfully!`
                                )
                            }}
                            schema={COLUMNS}
                            userInfo={userInfo}
                        />
                    </>,
                    document.body
                )}

            {deletingObject &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                zIndex: 1000,
                            }}
                        />
                        <ConfirmDeleteDialog
                            object={deletingObject}
                            onConfirm={handleConfirmDelete}
                            onCancel={() => setDeletingObject(null)}
                        />
                    </>,
                    document.body
                )}

            {showCreateForm && (
                <CreateObjectModal
                    onClose={() => setShowCreateForm(false)}
                    onOrganizationSelect={setCurrentOrganization}
                    defaultOrganization={currentOrganization}
                />
            )}

            {/* Uitgangsdatum Confirmation Modal */}
            {showUitgangsdatumModal &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={styles.modalOverlay}
                            onClick={handleUitgangsdatumCancel}
                        >
                            <div
                                style={{
                                    ...styles.modal,
                                    width: "400px",
                                    maxWidth: "90vw",
                                    padding: "24px",
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3
                                    style={{
                                        margin: "0 0 16px 0",
                                        fontSize: "18px",
                                        fontWeight: "600",
                                        color: colors.gray800,
                                        fontFamily: FONT_STACK,
                                    }}
                                >
                                    Uitgangsdatum instellen
                                </h3>

                                <p
                                    style={{
                                        ...styles.description,
                                        margin: "0 0 16px 0",
                                    }}
                                >
                                    Door het instellen van een uitgangsdatum
                                    wordt de status automatisch gewijzigd naar
                                    "Buiten Polis". Dit betekent dat het object
                                    niet meer onder het beleid valt.
                                </p>

                                <div style={{ marginBottom: "16px" }}>
                                    <label style={styles.label}>
                                        Uitgangsdatum:
                                    </label>
                                    <input
                                        type="date"
                                        value={selectedUitgangsdatum}
                                        onChange={(e) => {
                                            setSelectedUitgangsdatum(
                                                e.target.value
                                            )
                                            setUitgangsdatumError(null) // Clear error when user changes date
                                        }}
                                        style={{
                                            ...styles.input,
                                            border: uitgangsdatumError
                                                ? `1px solid ${colors.error}`
                                                : `1px solid ${colors.gray300}`,
                                        }}
                                    />
                                </div>

                                {uitgangsdatumError && (
                                    <div
                                        style={{
                                            ...styles.errorAlert,
                                            marginBottom: "16px",
                                        }}
                                    >
                                        {uitgangsdatumError}
                                    </div>
                                )}

                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={handleUitgangsdatumCancel}
                                        style={{
                                            fontFamily: FONT_STACK,
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            borderRadius: "6px",
                                            padding: "10px 16px",
                                            border: "1px solid",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            outline: "none",
                                            backgroundColor: "#f3f4f6",
                                            color: "#374151",
                                            borderColor: "#d1d5db",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "#e5e7eb"
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "#f3f4f6"
                                        }}
                                    >
                                        Annuleren
                                    </button>
                                    <button
                                        onClick={handleUitgangsdatumConfirm}
                                        style={{
                                            fontFamily: FONT_STACK,
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            borderRadius: "6px",
                                            padding: "10px 16px",
                                            border: "1px solid",
                                            cursor: "pointer",
                                            transition: "all 0.15s ease",
                                            outline: "none",
                                            backgroundColor: colors.primary,
                                            color: "#ffffff",
                                            borderColor: colors.primary,
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                "#2563eb"
                                            e.currentTarget.style.borderColor =
                                                "#2563eb"
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                                colors.primary
                                            e.currentTarget.style.borderColor =
                                                colors.primary
                                        }}
                                    >
                                        Bevestigen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}

            {/* PDF Export Modal */}
            {showPrintModal &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={styles.modalOverlay}
                            onClick={() => setShowPrintModal(false)}
                        >
                            <div
                                style={{
                                    ...styles.modal,
                                    width: "800px",
                                    maxWidth: "90vw",
                                    maxHeight: "90vh",
                                    padding: "24px",
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <h3
                                    style={{
                                        margin: "0 0 24px 0",
                                        fontSize: "20px",
                                        fontWeight: "600",
                                        color: colors.gray800,
                                        fontFamily: FONT_STACK,
                                    }}
                                >
                                    Exporteer als PDF
                                </h3>

                                <div style={{ marginBottom: "24px" }}>
                                    <h4
                                        style={{
                                            margin: "0 0 12px 0",
                                            fontSize: "16px",
                                            fontWeight: "500",
                                            color: colors.gray700,
                                            fontFamily: FONT_STACK,
                                        }}
                                    >
                                        Selecteer objecten (
                                        {filteredObjects.length} beschikbaar)
                                    </h4>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "12px",
                                            marginBottom: "16px",
                                        }}
                                    >
                                        <button
                                            onClick={() =>
                                                setSelectedPrintObjects(
                                                    new Set(
                                                        filteredObjects.map(
                                                            (obj) => obj.id
                                                        )
                                                    )
                                                )
                                            }
                                            style={{
                                                ...styles.secondaryButton,
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            Alles selecteren
                                        </button>
                                        <button
                                            onClick={() =>
                                                setSelectedPrintObjects(
                                                    new Set()
                                                )
                                            }
                                            style={{
                                                ...styles.secondaryButton,
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            Alles deselecteren
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            maxHeight: "200px",
                                            overflowY: "auto",
                                            border: `1px solid ${colors.gray200}`,
                                            borderRadius: "8px",
                                            padding: "12px",
                                            backgroundColor: colors.gray50,
                                        }}
                                    >
                                        {filteredObjects.map((obj) => (
                                            <div
                                                key={obj.id}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    marginBottom: "8px",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPrintObjects.has(
                                                        obj.id
                                                    )}
                                                    onChange={(e) => {
                                                        const newSelected =
                                                            new Set(
                                                                selectedPrintObjects
                                                            )
                                                        if (e.target.checked) {
                                                            newSelected.add(
                                                                obj.id
                                                            )
                                                        } else {
                                                            newSelected.delete(
                                                                obj.id
                                                            )
                                                        }
                                                        setSelectedPrintObjects(
                                                            newSelected
                                                        )
                                                    }}
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        fontSize: "14px",
                                                        color: colors.gray700,
                                                        fontFamily: FONT_STACK,
                                                    }}
                                                >
                                                    {(() => {
                                                        const objectType =
                                                            obj.objectType ||
                                                            "onbekend"

                                                        // Use actual available field names based on object type
                                                        let brand = ""
                                                        let type = ""
                                                        let identifier = ""
                                                        const naam =
                                                            obj.naam || ""

                                                        if (
                                                            objectType ===
                                                            "boot"
                                                        ) {
                                                            brand =
                                                                obj.merkBoot ||
                                                                "Onbekend merk"
                                                            type =
                                                                obj.typeBoot ||
                                                                "Onbekend type"
                                                            identifier =
                                                                obj.rompnummer ||
                                                                obj.cinNummer ||
                                                                ""
                                                        } else if (
                                                            objectType ===
                                                            "motor"
                                                        ) {
                                                            brand =
                                                                obj.merkMotor ||
                                                                "Onbekend merk"
                                                            type =
                                                                obj.typeMotor ||
                                                                "Onbekend type"
                                                            identifier =
                                                                obj.motornummer ||
                                                                obj.motorSerienummer ||
                                                                ""
                                                        } else if (
                                                            objectType ===
                                                            "trailer"
                                                        ) {
                                                            brand =
                                                                obj.merkTrailer ||
                                                                "Onbekend merk"
                                                            type =
                                                                obj.typeTrailer ||
                                                                "Onbekend type"
                                                            identifier =
                                                                obj.chassisnummer ||
                                                                ""
                                                        } else {
                                                            // Fallback: try any available brand/type field
                                                            brand =
                                                                obj.merkBoot ||
                                                                obj.merkMotor ||
                                                                obj.merkTrailer ||
                                                                "Onbekend merk"
                                                            type =
                                                                obj.typeBoot ||
                                                                obj.typeMotor ||
                                                                obj.typeTrailer ||
                                                                "Onbekend type"
                                                            identifier =
                                                                obj.rompnummer ||
                                                                obj.motornummer ||
                                                                obj.chassisnummer ||
                                                                obj.cinNummer ||
                                                                ""
                                                        }

                                                        // Get proper Dutch label from OBJECT_TYPE_CONFIG (case-insensitive)
                                                        const lowerObjectType = objectType?.toLowerCase()
                                                        const typeLabel = lowerObjectType && lowerObjectType in OBJECT_TYPE_CONFIG
                                                            ? OBJECT_TYPE_CONFIG[lowerObjectType as ObjectType].label
                                                            : objectType

                                                        // Include naam in the display if it exists
                                                        const nameDisplay = naam
                                                            ? `${naam} - `
                                                            : ""

                                                        return `${nameDisplay}${brand} ${type} (${typeLabel})${identifier ? ` - ${identifier}` : ""}`
                                                    })()}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: "24px" }}>
                                    <h4
                                        style={{
                                            margin: "0 0 12px 0",
                                            fontSize: "16px",
                                            fontWeight: "500",
                                            color: colors.gray700,
                                            fontFamily: FONT_STACK,
                                        }}
                                    >
                                        Selecteer velden
                                    </h4>

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "12px",
                                            marginBottom: "16px",
                                        }}
                                    >
                                        <button
                                            onClick={() =>
                                                setSelectedPrintFields(
                                                    new Set(
                                                        printableFields.map(
                                                            (col) => col.key
                                                        )
                                                    )
                                                )
                                            }
                                            style={{
                                                ...styles.secondaryButton,
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            Alle velden
                                        </button>
                                        <button
                                            onClick={() => {
                                                const basicFields = [
                                                    "objectType",
                                                    "merkBoot",
                                                    "typeBoot",
                                                    "merkMotor",
                                                    "typeMotor",
                                                    "waarde",
                                                    "premiepercentage",
                                                    "status",
                                                ]
                                                setSelectedPrintFields(
                                                    new Set(
                                                        basicFields.filter(
                                                            (field) =>
                                                                printableFields.some(
                                                                    (col) =>
                                                                        col.key ===
                                                                        field
                                                                )
                                                        )
                                                    )
                                                )
                                            }}
                                            style={{
                                                ...styles.secondaryButton,
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            Basis velden
                                        </button>
                                        <button
                                            onClick={() =>
                                                setSelectedPrintFields(
                                                    new Set()
                                                )
                                            }
                                            style={{
                                                ...styles.secondaryButton,
                                                padding: "6px 12px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            Geen velden
                                        </button>
                                    </div>

                                    <div
                                        style={{
                                            maxHeight: "150px",
                                            overflowY: "auto",
                                            border: `1px solid ${colors.gray200}`,
                                            borderRadius: "8px",
                                            padding: "12px",
                                            backgroundColor: colors.gray50,
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(auto-fill, minmax(200px, 1fr))",
                                            gap: "8px",
                                        }}
                                    >
                                        {printableFields.map((col) => (
                                            <div
                                                key={col.key}
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                }}
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedPrintFields.has(
                                                        col.key
                                                    )}
                                                    onChange={(e) => {
                                                        const newSelected =
                                                            new Set(
                                                                selectedPrintFields
                                                            )
                                                        if (e.target.checked) {
                                                            newSelected.add(
                                                                col.key
                                                            )
                                                        } else {
                                                            newSelected.delete(
                                                                col.key
                                                            )
                                                        }
                                                        setSelectedPrintFields(
                                                            newSelected
                                                        )
                                                    }}
                                                    style={{
                                                        cursor: "pointer",
                                                    }}
                                                />
                                                <span
                                                    style={{
                                                        fontSize: "13px",
                                                        color: colors.gray700,
                                                        fontFamily: FONT_STACK,
                                                    }}
                                                >
                                                    {col.label}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div style={{ marginBottom: "24px" }}>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={includeTotals}
                                            onChange={(e) =>
                                                setIncludeTotals(
                                                    e.target.checked
                                                )
                                            }
                                            style={{ cursor: "pointer" }}
                                        />
                                        <span
                                            style={{
                                                fontSize: "14px",
                                                color: colors.gray700,
                                                fontFamily: FONT_STACK,
                                            }}
                                        >
                                            Totaaloverzicht toevoegen
                                        </span>
                                    </div>
                                </div>

                                <div style={styles.buttonGroup}>
                                    <button
                                        onClick={() => setShowPrintModal(false)}
                                        style={styles.secondaryButton}
                                    >
                                        Annuleren
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (
                                                selectedPrintObjects.size === 0
                                            ) {
                                                alert(
                                                    "Selecteer minimaal één object om te exporteren."
                                                )
                                                return
                                            }
                                            if (
                                                selectedPrintFields.size === 0
                                            ) {
                                                alert(
                                                    "Selecteer minimaal één veld om te exporteren."
                                                )
                                                return
                                            }
                                            generatePDF().catch(error => {
                                                console.error("Failed to generate PDF:", error)
                                                alert("Er is een fout opgetreden bij het genereren van de PDF.")
                                            })
                                        }}
                                        style={{
                                            ...styles.primaryButton,
                                            opacity:
                                                selectedPrintObjects.size ===
                                                    0 ||
                                                selectedPrintFields.size === 0
                                                    ? 0.6
                                                    : 1,
                                        }}
                                    >
                                        <FaFilePdf size={14} />
                                        Genereer PDF
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>,
                    document.body
                )}
        </div>
    )
}

// ——— Premium Calculation Utilities ———
// IMPORTANT: These utilities ensure consistent premium calculations across the application.
// The totals overview will always be calculated from the actual field values using these
// utility functions, preventing discrepancies between individual object values and totals.

// Helper function to calculate insurance period in days
// Legacy function - replaced by enhanced version in utils/premiumCalculations.ts
const calculateInsurancePeriod_LEGACY = (obj: InsuredObject): number => {
    const startDate = obj.ingangsdatum ? new Date(obj.ingangsdatum) : new Date()
    let endDate: Date

    if (obj.uitgangsdatum && obj.uitgangsdatum.trim() !== "") {
        endDate = new Date(obj.uitgangsdatum)
    } else {
        // If no end date, calculate until end of current year
        const currentYear = new Date().getFullYear()
        endDate = new Date(currentYear, 11, 31) // December 31st
    }

    // Calculate difference in days
    const timeDifference = endDate.getTime() - startDate.getTime()
    const daysDifference = Math.max(
        1,
        Math.ceil(timeDifference / (1000 * 3600 * 24))
    )

    return daysDifference
}

// Helper function to calculate individual premiums consistently
// Legacy function - replaced by enhanced version in utils/premiumCalculations.ts
const calculateObjectPremiums_LEGACY = (obj: InsuredObject) => {
    const waarde = Number(obj.waarde) || 0
    const promillage = Number(obj.premiepercentage) || 0
    const yearlyPremium = (waarde * promillage) / 1000

    // Calculate actual period premium based on days
    const periodDays = calculateInsurancePeriod_LEGACY(obj)
    const periodPremium = yearlyPremium * (periodDays / 365)

    return {
        yearlyPremium,
        periodPremium,
        periodDays,
    }
}

// Function to update object with calculated premium values
// Legacy function - replaced by enhanced version in utils/premiumCalculations.ts
const updateObjectWithCalculatedPremiums_LEGACY = (
    obj: InsuredObject
): InsuredObject => {
    const { yearlyPremium, periodPremium, periodDays } =
        calculateObjectPremiums_LEGACY(obj)

    return {
        ...obj,
        totalePremieOverHetJaar: yearlyPremium,
        totalePremieOverDeVerzekerdePeriode: periodPremium,
        aantalVerzekerdeDagen: periodDays,
    }
}

// ——— Totals Display Component ———
function TotalsDisplay({
    objects,
    label,
}: {
    objects: InsuredObject[]
    label?: string
}) {
    if (!objects || objects.length === 0) {
        return null
    }

    // Use useMemo to recalculate totals efficiently when objects change
    const {
        totalWaarde,
        totalPremieVerzekerdePeriode,
        totalPremieJaar,
        difference,
        percentageDifference,
    } = React.useMemo(() => {
        console.log("🧮 Recalculating totals for", objects.length, "objects")

        const totalWaarde = objects.reduce((sum, obj) => {
            return sum + (Number(obj.waarde) || 0)
        }, 0)

        const totalPremieVerzekerdePeriode = objects.reduce((sum, obj) => {
            const { periodPremium } = calculateObjectPremiums(obj)
            return sum + periodPremium
        }, 0)

        const totalPremieJaar = objects.reduce((sum, obj) => {
            const { yearlyPremium } = calculateObjectPremiums(obj)
            return sum + yearlyPremium
        }, 0)

        // Calculate difference and percentage
        const difference = totalPremieJaar - totalPremieVerzekerdePeriode
        const percentageDifference =
            totalPremieJaar > 0 ? (difference / totalPremieJaar) * 100 : 0

        console.log("💰 Calculated totals:", {
            totalWaarde: totalWaarde.toLocaleString("nl-NL"),
            totalPremieJaar: totalPremieJaar.toLocaleString("nl-NL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            totalPremieVerzekerdePeriode: totalPremieVerzekerdePeriode.toLocaleString("nl-NL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            difference: Math.abs(difference).toLocaleString("nl-NL", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }),
            percentageDifference: percentageDifference.toFixed(1) + "%",
        })

        return {
            totalWaarde,
            totalPremieVerzekerdePeriode,
            totalPremieJaar,
            difference,
            percentageDifference,
        }
    }, [objects]) // Recalculate when objects array changes

    return (
        <div
            style={{
                margin: "16px 0",
                padding: "16px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                fontFamily: FONT_STACK,
            }}
        >
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    marginBottom: "12px",
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#1f2937",
                    }}
                >
                    {label || "Totaaloverzicht"}
                </h3>
                <div
                    style={{
                        marginLeft: "12px",
                        fontSize: "14px",
                        color: "#6b7280",
                        backgroundColor: "#e5e7eb",
                        padding: "4px 8px",
                        borderRadius: "4px",
                    }}
                >
                    {objects.length} objecten
                </div>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "16px",
                }}
            >
                <div
                    style={{
                        padding: "12px",
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "4px",
                            fontWeight: "500",
                        }}
                    >
                        Totale waarde
                    </div>
                    <div
                        style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: "#1f2937",
                        }}
                    >
                        €{totalWaarde.toLocaleString("nl-NL")}
                    </div>
                </div>

                <div
                    style={{
                        padding: "12px",
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "4px",
                            fontWeight: "500",
                        }}
                    >
                        Totale premie over de verzekerde periode
                    </div>
                    <div
                        style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: colors.primary,
                        }}
                    >
                        €
                        {totalPremieVerzekerdePeriode.toLocaleString("nl-NL", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </div>
                </div>

                <div
                    style={{
                        padding: "12px",
                        backgroundColor: "white",
                        border: "1px solid #e5e7eb",
                        borderRadius: "6px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "4px",
                            fontWeight: "500",
                        }}
                    >
                        Totale premie over het jaar
                    </div>
                    <div
                        style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: colors.primary,
                        }}
                    >
                        €{totalPremieJaar.toLocaleString("nl-NL", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </div>
                </div>

                <div
                    style={{
                        padding: "12px",
                        backgroundColor: difference > 0 ? "#fef3f2" : "#f0fdf4",
                        border: `1px solid ${difference > 0 ? "#fecaca" : "#bbf7d0"}`,
                        borderRadius: "6px",
                    }}
                >
                    <div
                        style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            marginBottom: "4px",
                            fontWeight: "500",
                        }}
                    >
                        Verschil (jaar - periode)
                    </div>
                    <div
                        style={{
                            fontSize: "18px",
                            fontWeight: "600",
                            color: difference > 0 ? "#dc2626" : "#16a34a",
                        }}
                    >
                        €{Math.abs(difference).toLocaleString("nl-NL", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                        })}
                    </div>
                    <div
                        style={{
                            fontSize: "12px",
                            color: difference > 0 ? "#dc2626" : "#16a34a",
                            marginTop: "2px",
                        }}
                    >
                        {difference > 0 ? "+" : ""}
                        {percentageDifference.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

// ——— Logo Display Components ———

// Types
interface LogoData {
    organizationId: string
    logoData?: string
    fileName?: string
    uploadedAt?: string
    fileSize?: number
}

interface LogoDisplayProps {
    organizationId?: string
    organizationName?: string
    size?: "small" | "medium" | "large"
    showFallback?: boolean
    style?: React.CSSProperties
    className?: string
}

// Size Configurations
const SIZE_CONFIG = {
    small: {
        width: 32,
        height: 32,
        fontSize: 12,
        iconSize: 12,
    },
    medium: {
        width: 48,
        height: 48,
        fontSize: 14,
        iconSize: 16,
    },
    large: {
        width: 80,
        height: 80,
        fontSize: 16,
        iconSize: 24,
    },
}

// API Functions
async function getOrganizationLogo(
    organizationId: string
): Promise<LogoData | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const response = await fetch(
            `${API_BASE_URL}/neptunus/organization/${organizationId}/logo`,
            {
                method: "GET",
                headers,
                mode: "cors",
            }
        )

        if (response.status === 404) {
            return null // No logo found
        }

        if (!response.ok) {
            return null // Failed to load, show fallback
        }

        const logoData = await response.json()
        return logoData
    } catch (error) {
        console.warn("Failed to load organization logo:", error)
        return null
    }
}

// Logo Display Component
function LogoDisplay({
    organizationId,
    organizationName = "Organization",
    size = "medium",
    showFallback = true,
    style = {},
    className = "",
}: LogoDisplayProps) {
    const [logoData, setLogoData] = useState<LogoData | null>(null)
    const [loading, setLoading] = useState(!!organizationId)
    const [error, setError] = useState(false)

    const config = SIZE_CONFIG[size]

    // Load logo when organizationId changes
    useEffect(() => {
        if (!organizationId) {
            setLogoData(null)
            setLoading(false)
            return
        }

        let isMounted = true

        const loadLogo = async () => {
            try {
                setLoading(true)
                setError(false)
                const logo = await getOrganizationLogo(organizationId)
                if (isMounted) {
                    setLogoData(logo)
                }
            } catch (err) {
                if (isMounted) {
                    setError(true)
                    setLogoData(null)
                }
            } finally {
                if (isMounted) {
                    setLoading(false)
                }
            }
        }

        loadLogo()

        return () => {
            isMounted = false
        }
    }, [organizationId])

    // Base container style
    const containerStyle: React.CSSProperties = {
        width: config.width,
        height: config.height,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "6px",
        overflow: "hidden",
        backgroundColor: colors.gray100,
        border: `1px solid ${colors.gray200}`,
        fontFamily: FONT_STACK,
        ...style,
    }

    // Loading state
    if (loading) {
        return (
            <div
                style={{
                    ...containerStyle,
                    backgroundColor: colors.gray50,
                }}
                className={className}
            >
                <div
                    style={{
                        fontSize: config.fontSize - 2,
                        color: colors.gray400,
                        animation: "pulse 2s infinite",
                    }}
                >
                    ...
                </div>
            </div>
        )
    }

    // Logo found - display it
    if (logoData?.logoData) {
        const logoSrc = `data:image/png;base64,${logoData.logoData}`

        return (
            <div
                style={containerStyle}
                className={className}
                title={`${organizationName} logo`}
            >
                <img
                    src={logoSrc}
                    alt={`${organizationName} logo`}
                    style={{
                        maxWidth: "100%",
                        maxHeight: "100%",
                        objectFit: "contain",
                    }}
                    onError={() => setError(true)}
                />
            </div>
        )
    }

    // No logo or error - show fallback if enabled
    if (showFallback) {
        return (
            <div
                style={{
                    ...containerStyle,
                    backgroundColor: colors.gray100,
                    flexDirection: "column",
                    gap: size === "large" ? "4px" : "2px",
                }}
                className={className}
                title={organizationName}
            >
                <FaBuilding size={config.iconSize} color={colors.gray400} />
                {size === "large" && (
                    <div
                        style={{
                            fontSize: config.fontSize - 4,
                            color: colors.gray500,
                            textAlign: "center",
                            maxWidth: "100%",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            lineHeight: 1,
                        }}
                    >
                        {organizationName}
                    </div>
                )}
            </div>
        )
    }

    // No fallback - return nothing
    return null
}

// Logo Banner Component
function LogoBanner({
    organizationId,
    organizationName,
    showForSingleOrg = true,
    showForMultiOrg = false,
}: {
    organizationId?: string
    organizationName?: string
    showForSingleOrg?: boolean
    showForMultiOrg?: boolean
}) {
    // Context-dependent display logic
    const shouldShow = showForSingleOrg || showForMultiOrg

    if (!shouldShow || !organizationId) {
        return null
    }

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "12px 16px",
                backgroundColor: colors.white,
                border: `1px solid ${colors.gray200}`,
                borderRadius: "8px",
                marginBottom: "16px",
            }}
        >
            <LogoDisplay
                organizationId={organizationId}
                organizationName={organizationName}
                size="medium"
                showFallback={true}
            />
            <div>
                <div
                    style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: colors.gray900,
                        marginBottom: "2px",
                    }}
                >
                    {organizationName}
                </div>
                <div
                    style={{
                        fontSize: "13px",
                        color: colors.gray500,
                    }}
                >
                    Organisatie overzicht
                </div>
            </div>
        </div>
    )
}

// Fleet Overview Logo Component
function FleetLogoHeader({
    organizations,
    showLogos = true,
}: {
    organizations: Array<{ id: string; name: string }>
    showLogos?: boolean
}) {
    if (!showLogos || organizations.length === 0) {
        return null
    }

    return (
        <div
            style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "12px",
                padding: "16px",
                backgroundColor: colors.gray50,
                border: `1px solid ${colors.gray200}`,
                borderRadius: "8px",
                marginBottom: "16px",
            }}
        >
            {organizations.map((org) => (
                <div
                    key={org.id}
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        padding: "8px 12px",
                        backgroundColor: colors.white,
                        border: `1px solid ${colors.gray200}`,
                        borderRadius: "6px",
                    }}
                >
                    <LogoDisplay
                        organizationId={org.id}
                        organizationName={org.name}
                        size="small"
                        showFallback={true}
                    />
                    <span
                        style={{
                            fontSize: "14px",
                            color: colors.gray700,
                            fontWeight: "500",
                        }}
                    >
                        {org.name}
                    </span>
                </div>
            ))}
        </div>
    )
}

// Export Override
export function InsuredObjectListApp(): Override {
    return {
        children: <InsuredObjectList />,
    }
}
