// src/BoatPageOverride.tsx (Role-aware boat management system - All in one file)
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override } from "framer"
import { useState, useEffect, useCallback } from "react"
import {
    FaEdit,
    FaTrashAlt,
    FaSearch,
    FaFilter,
    FaCheck,
    FaTimes,
    FaBuilding,
} from "react-icons/fa"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const BOAT_PATH = "/neptunus/boat"
const ORGANIZATION_PATH = "/neptunus/organization"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

// Status color mapping
const STATUS_COLORS = {
    Insured: { bg: "#dcfce7", text: "#166534" },
    Pending: { bg: "#fef3c7", text: "#92400e" },
    "Not Insured": { bg: "#fee2e2", text: "#991b1b" },
    "Out of stock": { bg: "#f3f4f6", text: "#374151" },
}

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

// ——— User Role Detection ———
interface UserInfo {
    sub: string
    role: 'admin' | 'user' | 'editor'
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

        const res = await fetch(`${API_BASE_URL}/neptunus/user/${cognitoSub}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const responseData = await res.json()
        
        console.log('fetchUserInfo - raw user data from API:', responseData)
        
        // Handle nested response structure
        const userData = responseData.user || responseData
        
        const processedUserInfo = {
            sub: cognitoSub,
            role: userData.role || 'user', // Default to user if role not found
            organization: userData.organization,
            organizations: userData.organizations || []
        }
        
        console.log('fetchUserInfo - processed user info:', processedUserInfo)
        
        return processedUserInfo
    } catch (error) {
        console.error('Failed to fetch user info:', error)
        return null
    }
}

function getUserInfo(): UserInfo | null {
    try {
        const token = getIdToken()
        if (!token) return null

        // Decode JWT to get cognito sub
        const payload = JSON.parse(atob(token.split('.')[1]))
        
        // Return basic info with sub - role will be fetched separately
        return {
            sub: payload.sub,
            role: 'user', // Temporary default, will be updated by fetchUserInfo
            organization: undefined,
            organizations: []
        }
    } catch (error) {
        console.error('Failed to decode user info:', error)
        return null
    }
}

function isAdmin(userInfo: UserInfo | null): boolean {
    return userInfo?.role === 'admin'
}

// ——— API Functions ———

// Fetch organization field configuration by organization name
async function fetchOrganizationConfigByName(orgName: string): Promise<Record<
    string,
    { visible: boolean; required: boolean }
> | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(`${API_BASE_URL}${ORGANIZATION_PATH}?name=${encodeURIComponent(orgName)}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const json = await res.json()

        if (json.organizations && json.organizations.length > 0) {
            return json.organizations[0].boat_fields_config
        }
        return null
    } catch (error) {
        console.error("Failed to fetch organization config by name:", error)
        return null
    }
}

// Fetch organization field configuration - role-aware
async function fetchOrganizationConfig(userInfo: UserInfo | null, selectedOrganization?: string | null): Promise<Record<
    string,
    { visible: boolean; required: boolean }
> | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        // For admin, don't apply any organization-specific field configuration for visibility
        if (isAdmin(userInfo)) {
            return null // This will show all fields by default
        }

        // For regular users, fetch their organization's configuration
        if (userInfo?.organization) {
            return await fetchOrganizationConfigByName(userInfo.organization)
        }

        // If showing all organizations, merge configurations from all user organizations
        if (selectedOrganization === "ALL_ORGANIZATIONS" && userInfo?.organizations && userInfo.organizations.length > 0) {
            const allConfigs = await Promise.all(
                userInfo.organizations.map(org => fetchOrganizationConfigByName(org))
            )
            
            // Merge all configurations - field is visible if visible in ANY organization
            // Field is required if required in ANY organization
            const mergedConfig: Record<string, { visible: boolean; required: boolean }> = {}
            
            allConfigs.forEach(config => {
                if (config) {
                    Object.entries(config).forEach(([field, settings]) => {
                        if (!mergedConfig[field]) {
                            mergedConfig[field] = { visible: settings.visible, required: settings.required }
                        } else {
                            mergedConfig[field].visible = mergedConfig[field].visible || settings.visible
                            mergedConfig[field].required = mergedConfig[field].required || settings.required
                        }
                    })
                }
            })
            
            return Object.keys(mergedConfig).length > 0 ? mergedConfig : null
        }

        // For selected single organization
        if (selectedOrganization && userInfo?.organizations?.includes(selectedOrganization)) {
            return await fetchOrganizationConfigByName(selectedOrganization)
        }

        return null
    } catch (error) {
        console.error("Failed to fetch organization config:", error)
        return null
    }
}

// Fetch all organizations for filtering
async function fetchOrganizations(): Promise<string[]> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(`${API_BASE_URL}${ORGANIZATION_PATH}`, {
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

// Fetch boats - can be filtered by organization for user view
async function fetchBoats(organizationFilter?: string): Promise<any[]> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    
    let url = `${API_BASE_URL}${BOAT_PATH}`
    if (organizationFilter) {
        url += `?organization=${encodeURIComponent(organizationFilter)}`
    }

    const res = await fetch(url, {
        method: "GET",
        headers,
        mode: "cors",
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const json = await res.json()
    return json.boats
}

// ——— Role-aware Boat Fetching ———
async function fetchBoatsForUser(userInfo: UserInfo | null, selectedOrganization?: string | null): Promise<any[]> {
    if (isAdmin(userInfo)) {
        // Admin sees all boats
        return await fetchBoats()
    } else if (userInfo?.organization) {
        // Regular user sees only their organization's boats
        return await fetchBoats(userInfo.organization)
    } else if (selectedOrganization === "ALL_ORGANIZATIONS") {
        // Fetch boats from all user organizations
        if (userInfo?.organizations && userInfo.organizations.length > 0) {
            const allBoats = await Promise.all(
                userInfo.organizations.map(org => fetchBoats(org))
            )
            return allBoats.flat()
        }
        return []
    } else if (selectedOrganization) {
        // Use selected organization
        return await fetchBoats(selectedOrganization)
    } else if (userInfo?.organizations && userInfo.organizations.length > 0) {
        // Use first organization from organizations array as fallback
        return await fetchBoats(userInfo.organizations[0])
    } else {
        // No organization info, return empty array
        return []
    }
}

// Approve boat (admin only)
async function approveBoat(boatId: string | number): Promise<void> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_BASE_URL}${BOAT_PATH}/${boatId}/approve`, {
        method: "PUT",
        headers,
        mode: "cors",
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || `${res.status} ${res.statusText}`)
    }
}

// Decline boat (admin only)
async function declineBoat(
    boatId: string | number,
    reason: string
): Promise<void> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_BASE_URL}${BOAT_PATH}/${boatId}/decline`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ reason }),
        mode: "cors",
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || `${res.status} ${res.statusText}`)
    }
}

// Delete boat
async function deleteBoat(boatId: string | number): Promise<void> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_BASE_URL}${BOAT_PATH}/${boatId}`, {
        method: "DELETE",
        headers,
        mode: "cors",
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || `${res.status} ${res.statusText}`)
    }
}

// Update boat
async function updateBoat(boatId: string | number, formData: any): Promise<void> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const res = await fetch(`${API_BASE_URL}${BOAT_PATH}/${boatId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(formData),
        mode: "cors",
    })

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || `${res.status} ${res.statusText}`)
    }
}

// ——— Column Groups and Definitions ———
type ColumnKey =
    | "boatNumber"
    | "insuranceStartDate"
    | "insuranceEndDate"
    | "boatBrand"
    | "engineType"
    | "boatType"
    | "yearOfConstruction"
    | "numberOfEngines"
    | "engineNumber"
    | "cinNumber"
    | "mooringLocation"
    | "organization"
    | "premiumPerMille"
    | "deductible"
    | "numberOfInsuredDays"
    | "totalAnnualPremium"
    | "totalPremiumForInsuredPeriod"
    | "value"
    | "status"
    | "notes"
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
    // Essential columns - Status is first and always visible by default
    {
        key: "status",
        label: "Status",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "boatNumber",
        label: "Boat #",
        priority: 1,
        group: "essential",
        width: "80px",
    },
    {
        key: "boatBrand",
        label: "Brand",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "boatType",
        label: "Type",
        priority: 1,
        group: "essential",
        width: "100px",
    },
    {
        key: "value",
        label: "Value",
        priority: 1,
        group: "essential",
        width: "100px",
    },

    // All other columns moved to "Additional" group
    {
        key: "insuranceStartDate",
        label: "Start",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "insuranceEndDate",
        label: "End",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "deductible",
        label: "Deductible",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "numberOfInsuredDays",
        label: "Days",
        priority: 2,
        group: "additional",
        width: "70px",
    },
    {
        key: "organization",
        label: "Organization",
        priority: 2,
        group: "additional",
        width: "120px",
    },
    {
        key: "engineType",
        label: "Engine",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "yearOfConstruction",
        label: "Year",
        priority: 2,
        group: "additional",
        width: "60px",
    },
    {
        key: "numberOfEngines",
        label: "#Eng",
        priority: 2,
        group: "additional",
        width: "50px",
    },
    {
        key: "engineNumber",
        label: "Engine #",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "cinNumber",
        label: "CIN #",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "mooringLocation",
        label: "Mooring Location",
        priority: 2,
        group: "additional",
        width: "150px",
    },
    {
        key: "premiumPerMille",
        label: "Premium ‰",
        priority: 2,
        group: "additional",
        width: "90px",
    },
    {
        key: "totalAnnualPremium",
        label: "Annual",
        priority: 2,
        group: "additional",
        width: "90px",
    },
    {
        key: "totalPremiumForInsuredPeriod",
        label: "Period",
        priority: 2,
        group: "additional",
        width: "90px",
    },
    {
        key: "notes",
        label: "Notes",
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

// ——— Validation ———
type BoatFormState = {
    boatNumber: string
    insuranceStartDate: string
    insuranceEndDate: string
    boatBrand: string
    engineType: string
    boatType: string
    yearOfConstruction: number
    numberOfEngines: number
    engineNumber: string
    cinNumber: string
    mooringLocation: string
    organization: string
    premiumPerMille: number
    deductible: number
    numberOfInsuredDays: number
    totalAnnualPremium: number
    totalPremiumForInsuredPeriod: number
    value: number
    status: string
    notes: string
}

function validateForm(
    form: BoatFormState,
    fieldConfig: Record<string, { visible: boolean; required: boolean }> | null
) {
    const errors: string[] = []

    if (fieldConfig) {
        // Validate based on field configuration
        Object.entries(fieldConfig).forEach(([field, config]) => {
            if (config.required && config.visible) {
                const value = form[field as keyof BoatFormState]
                if (
                    value === null ||
                    value === undefined ||
                    value === "" ||
                    (typeof value === "number" && value === 0)
                ) {
                    const columnDef = COLUMNS.find((col) => col.key === field)
                    const fieldLabel = columnDef?.label || field
                    errors.push(`${fieldLabel} is required.`)
                }
            }
        })
    } else {
        // Fallback validation
        if (form.value <= 0) errors.push("Value must be > 0.")
        if (!form.insuranceStartDate || !form.insuranceEndDate)
            errors.push("Both dates required.")
    }

    return errors
}

// ——— Custom Hook ———
function useBoatForm(initial: BoatFormState) {
    const [form, setForm] = useState(initial)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value, type } = e.target
        setError(null)
        setSuccess(null)
        setForm((f) => ({
            ...f,
            [name]: type === "number" ? parseFloat(value) : value,
        }))
    }
    return { form, setForm, handleChange, error, setError, success, setSuccess }
}

// ——— Filter Functions ———
function filterBoats(
    boats: any[],
    searchTerm: string,
    selectedOrganizations: Set<string>,
    organizations: string[]
): any[] {
    return boats.filter((boat) => {
        // Search filter
        if (searchTerm) {
            const matchesSearch = Object.values(boat).some((value) =>
                String(value)
                    .toLowerCase()
                    .includes(searchTerm.toLowerCase())
            )
            if (!matchesSearch) return false
        }

        // Organization filter - only filter if organizations are selected
        if (
            selectedOrganizations.size > 0 &&
            selectedOrganizations.size < organizations.length
        ) {
            const boatOrg = boat.organization
            if (!boatOrg || !selectedOrganizations.has(boatOrg))
                return false
        }

        return true
    })
}

// ——— Cell Value Renderer ———
function renderBoatCellValue(col: any, cellValue: any): React.ReactNode {
    if (cellValue == null) {
        return (
            <span
                style={{
                    color: "#9ca3af",
                }}
            >
                -
            </span>
        )
    }

    if (col.key === "status") {
        const statusConfig =
            STATUS_COLORS[
                cellValue as keyof typeof STATUS_COLORS
            ]
        return (
            <span
                style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    backgroundColor: statusConfig?.bg || "#6b7280",
                    color: statusConfig?.text || "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                }}
            >
                {cellValue}
            </span>
        )
    }

    if (
        col.key === "value" ||
        col.key.includes("Premium") ||
        col.key === "deductible"
    ) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cellValue)
    }

    if (col.key.includes("Date")) {
        return new Date(cellValue).toLocaleDateString()
    }

    return String(cellValue)
}

// ——— Dialog Components ———

// Decline Reason Dialog
function DeclineReasonDialog({
    onConfirm,
    onCancel,
}: {
    onConfirm: (reason: string) => void
    onCancel: () => void
}) {
    const [reason, setReason] = useState("")

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        onConfirm(reason)
    }

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
            <form onSubmit={handleSubmit}>
                <div
                    style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        marginBottom: "16px",
                        color: "#1f2937",
                    }}
                >
                    Decline Boat
                </div>
                <div
                    style={{
                        fontSize: "14px",
                        color: "#6b7280",
                        marginBottom: "16px",
                        lineHeight: "1.5",
                    }}
                >
                    Please provide a reason for declining this boat application:
                </div>
                <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter decline reason..."
                    required
                    rows={4}
                    style={{
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontFamily: FONT_STACK,
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

// Confirm Delete Dialog
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
                Delete Boat
            </div>
            <div
                style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "24px",
                    lineHeight: "1.5",
                }}
            >
                Are you sure you want to delete this boat? This action cannot be
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

// Error Notification
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

// Success Notification
function SuccessNotification({
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
                    color: "#059669",
                    marginBottom: "16px",
                }}
            >
                Success
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
                        backgroundColor: "#059669",
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
                        (e.target.style.backgroundColor = "#047857")
                    }
                    onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "#059669")
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
    fieldConfig,
    organizations,
    selectedOrganizations,
    onOrganizationChange,
    showOrgFilter = true,
    userInfo,
    selectedUserOrganization,
    onUserOrganizationChange,
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    visibleColumns: Set<string>
    onToggleColumn: (column: string) => void
    fieldConfig: Record<string, { visible: boolean; required: boolean }> | null
    organizations: string[]
    selectedOrganizations: Set<string>
    onOrganizationChange: (org: string) => void
    showOrgFilter?: boolean
    userInfo: UserInfo | null
    selectedUserOrganization?: string | null
    onUserOrganizationChange?: (org: string) => void
}) {
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [showOrgFilterDropdown, setShowOrgFilterDropdown] = useState(false)
    const [columnButtonRef, setColumnButtonRef] =
        useState<HTMLButtonElement | null>(null)
    const [orgButtonRef, setOrgButtonRef] = useState<HTMLButtonElement | null>(
        null
    )
    const [columnDropdownPosition, setColumnDropdownPosition] = useState({
        top: 0,
        right: 0,
    })
    const [orgDropdownPosition, setOrgDropdownPosition] = useState({
        top: 0,
        right: 0,
    })

    // Calculate dropdown positions
    useEffect(() => {
        if (columnButtonRef && showColumnFilter) {
            const rect = columnButtonRef.getBoundingClientRect()
            setColumnDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [columnButtonRef, showColumnFilter])

    useEffect(() => {
        if (orgButtonRef && showOrgFilterDropdown) {
            const rect = orgButtonRef.getBoundingClientRect()
            setOrgDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [orgButtonRef, showOrgFilterDropdown])

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

    // Filter columns based on field configuration - role-aware
    const getVisibleColumnsForConfig = () => {
        // Admin sees all columns regardless of organization configs
        if (isAdmin(userInfo)) {
            return COLUMNS
        }

        // Regular users see columns based on their organization config
        if (!fieldConfig) return COLUMNS

        return COLUMNS.filter((col) => {
            const config = fieldConfig[col.key]
            return config ? config.visible : true // Show by default if not configured
        })
    }

    const availableColumns = getVisibleColumnsForConfig()

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
                        placeholder="Search boats..."
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

                {/* User Organization Selector for Multi-Org Users */}
                {!isAdmin(userInfo) && userInfo?.organizations && userInfo.organizations.length > 1 && (
                    <div style={{ position: "relative" }}>
                        <select
                            value={selectedUserOrganization || ""}
                            onChange={(e) => onUserOrganizationChange?.(e.target.value)}
                            style={{
                                padding: "12px 16px",
                                backgroundColor: "#f8fafc",
                                color: "#374151",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: "500",
                                cursor: "pointer",
                                fontFamily: FONT_STACK,
                                transition: "all 0.2s",
                                minWidth: "150px",
                            }}
                            onMouseOver={(e) =>
                                (e.target.style.backgroundColor = "#f1f5f9")
                            }
                            onMouseOut={(e) =>
                                (e.target.style.backgroundColor = "#f8fafc")
                            }
                        >
                            <option value="ALL_ORGANIZATIONS">All Organizations</option>
                            {userInfo.organizations.map((org) => (
                                <option key={org} value={org}>
                                    {org}
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {showOrgFilter && (
                    <div style={{ position: "relative" }}>
                        <button
                            ref={setOrgButtonRef}
                            onClick={() => setShowOrgFilterDropdown(!showOrgFilterDropdown)}
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
                            <FaBuilding /> Organizations (
                            {selectedOrganizations.size})
                        </button>
                    </div>
                )}

                <div style={{ position: "relative" }}>
                    <button
                        ref={setColumnButtonRef}
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

            {/* Organization Filter Dropdown */}
            {showOrgFilter && showOrgFilterDropdown &&
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
                                right: `${orgDropdownPosition.right}px`,
                                backgroundColor: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                zIndex: 1000,
                                minWidth: "200px",
                                maxHeight: "300px",
                                overflowY: "auto",
                            }}
                        >
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
                                            organizations.forEach((org) => {
                                                if (
                                                    !selectedOrganizations.has(
                                                        org
                                                    )
                                                ) {
                                                    onOrganizationChange(org)
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
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => {
                                            organizations.forEach((org) => {
                                                if (
                                                    selectedOrganizations.has(
                                                        org
                                                    )
                                                ) {
                                                    onOrganizationChange(org)
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
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {organizations.map((org) => (
                                <label
                                    key={org}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 12px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        fontFamily: FONT_STACK,
                                        transition: "background-color 0.2s",
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
                                        checked={selectedOrganizations.has(org)}
                                        onChange={() =>
                                            onOrganizationChange(org)
                                        }
                                        style={{ cursor: "pointer" }}
                                    />
                                    <span>{org}</span>
                                </label>
                            ))}
                        </div>
                    </>,
                    document.body
                )}

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
                                right: `${columnDropdownPosition.right}px`,
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
                                            availableColumns
                                                .filter(
                                                    (col) =>
                                                        col.group !==
                                                        "essential"
                                                )
                                                .forEach((col) => {
                                                    if (
                                                        visibleColumns.has(
                                                            col.key
                                                        )
                                                    ) {
                                                        onToggleColumn(col.key)
                                                    }
                                                })
                                            availableColumns
                                                .filter(
                                                    (col) =>
                                                        col.group ===
                                                        "essential"
                                                )
                                                .forEach((col) => {
                                                    if (
                                                        !visibleColumns.has(
                                                            col.key
                                                        )
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
                                            availableColumns.forEach(
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

                            {Object.entries(COLUMN_GROUPS).map(
                                ([groupKey, group]) => {
                                    const groupColumns =
                                        availableColumns.filter(
                                            (col) => col.group === groupKey
                                        )

                                    if (groupColumns.length === 0) return null

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
                                            {groupColumns.map((col) => {
                                                const config =
                                                    fieldConfig?.[col.key]
                                                const isRequired =
                                                    config?.required || false

                                                return (
                                                    <label
                                                        key={col.key}
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "8px",
                                                            padding: "6px 20px",
                                                            cursor: "pointer",
                                                            fontSize: "13px",
                                                            fontFamily:
                                                                FONT_STACK,
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
                                                        <span
                                                            style={{ flex: 1 }}
                                                        >
                                                            {col.label}
                                                            {isRequired && (
                                                                <span
                                                                    style={{
                                                                        color: "#ef4444",
                                                                        marginLeft:
                                                                            "4px",
                                                                        fontSize:
                                                                            "12px",
                                                                    }}
                                                                >
                                                                    *
                                                                </span>
                                                            )}
                                                        </span>
                                                    </label>
                                                )
                                            })}
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

// ——— Action Buttons ———

// General Action buttons for boat table rows
function GeneralActionButtons({
    boat,
    onEdit,
    onDelete,
}: {
    boat: any
    onEdit: (id: string | number) => void
    onDelete: (id: string | number) => void
}) {
    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
            }}
        >
            <button
                onClick={() => onEdit(boat.id)}
                style={{
                    padding: "6px 10px",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
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
                <FaEdit size={9} /> Edit
            </button>
            <button
                onClick={() => onDelete(boat.id)}
                style={{
                    padding: "6px 10px",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
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
                <FaTrashAlt size={9} /> Delete
            </button>
        </div>
    )
}

// Status action buttons for admin view
function StatusActionButtons({
    boat,
    onApprove,
    onDecline,
}: {
    boat: any
    onApprove: (id: string | number) => void
    onDecline: (id: string | number) => void
}) {
    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
            }}
        >
            <button
                onClick={
                    boat.status === "Pending"
                        ? () => onApprove(boat.id)
                        : undefined
                }
                disabled={boat.status !== "Pending"}
                title={
                    boat.status !== "Pending"
                        ? "Only available for pending boats"
                        : "Approve this boat"
                }
                style={{
                    padding: "6px 10px",
                    backgroundColor:
                        boat.status === "Pending" ? "#059669" : "#f3f4f6",
                    color: boat.status === "Pending" ? "#fff" : "#9ca3af",
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                        boat.status === "Pending" ? "pointer" : "not-allowed",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#047857"
                    }
                }}
                onMouseOut={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#059669"
                    }
                }}
            >
                <FaCheck size={9} /> Approve
            </button>
            <button
                onClick={
                    boat.status === "Pending"
                        ? () => onDecline(boat.id)
                        : undefined
                }
                disabled={boat.status !== "Pending"}
                title={
                    boat.status !== "Pending"
                        ? "Only available for pending boats"
                        : "Decline this boat"
                }
                style={{
                    padding: "6px 10px",
                    backgroundColor:
                        boat.status === "Pending" ? "#dc2626" : "#f3f4f6",
                    color: boat.status === "Pending" ? "#fff" : "#9ca3af",
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                        boat.status === "Pending" ? "pointer" : "not-allowed",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#b91c1c"
                    }
                }}
                onMouseOut={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#dc2626"
                    }
                }}
            >
                <FaTimes size={9} /> Decline
            </button>
        </div>
    )
}

// ——— Enhanced Edit Form ———
function EditBoatForm({
    boat,
    onClose,
    refresh,
    fieldConfig,
    userInfo,
}: {
    boat: any
    onClose(): void
    refresh(): void
    fieldConfig: Record<string, { visible: boolean; required: boolean }> | null
    userInfo: UserInfo | null
}) {
    const { form, handleChange, error, setError, success, setSuccess } =
        useBoatForm({
            boatNumber: boat.boatNumber || "",
            insuranceStartDate: boat.insuranceStartDate || "",
            insuranceEndDate: boat.insuranceEndDate || "",
            boatBrand: boat.boatBrand || "",
            engineType: boat.engineType || "",
            boatType: boat.boatType || "",
            yearOfConstruction:
                boat.yearOfConstruction || new Date().getFullYear(),
            numberOfEngines: boat.numberOfEngines || 0,
            engineNumber: boat.engineNumber || "",
            cinNumber: boat.cinNumber || "",
            mooringLocation: boat.mooringLocation || "",
            organization: boat.organization || "",
            premiumPerMille: boat.premiumPerMille || 0,
            deductible: boat.deductible || 0,
            numberOfInsuredDays: boat.numberOfInsuredDays || 0,
            totalAnnualPremium: boat.totalAnnualPremium || 0,
            totalPremiumForInsuredPeriod:
                boat.totalPremiumForInsuredPeriod || 0,
            value: boat.value || 0,
            status: boat.status || "",
            notes: boat.notes || "",
        })

    // For edit form, we need to fetch the specific boat's organization config
    const [boatOrgConfig, setBoatOrgConfig] = useState<Record<string, { visible: boolean; required: boolean }> | null>(null)
    const [isLoadingBoatConfig, setIsLoadingBoatConfig] = useState(true)

    useEffect(() => {
        const loadBoatOrgConfig = async () => {
            if (boat.organization) {
                const config = await fetchOrganizationConfigByName(boat.organization)
                setBoatOrgConfig(config)
            }
            setIsLoadingBoatConfig(false)
        }
        loadBoatOrgConfig()
    }, [boat.organization])

    // Use boat-specific config for form validation and field visibility
    const effectiveFieldConfig = boatOrgConfig || fieldConfig

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validateForm(form, effectiveFieldConfig)
        if (errs.length) {
            setError(errs.join("\n"))
            return
        }
        try {
            await updateBoat(boat.id, form)
            setSuccess("Boat updated successfully.")
            setTimeout(() => {
                refresh()
                onClose()
            }, 1000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    // Filter form fields based on boat's organization configuration
    const getVisibleFields = () => {
        // Admin can edit all fields regardless of organization config
        if (isAdmin(userInfo)) {
            return Object.entries(form)
        }

        if (!effectiveFieldConfig) {
            return Object.entries(form)
        }

        return Object.entries(form).filter(([key]) => {
            const config = effectiveFieldConfig[key]
            return config ? config.visible : true // Show by default if not configured
        })
    }

    const isFieldRequired = (fieldKey: string) => {
        if (!effectiveFieldConfig) return false
        const config = effectiveFieldConfig[fieldKey]
        return config ? config.required : false
    }

    if (isLoadingBoatConfig) {
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
                    textAlign: "center",
                }}
            >
                Loading boat configuration...
            </div>
        )
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
                Edit Boat
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

            <form
                onSubmit={handleSubmit}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "20px",
                }}
            >
                {getVisibleFields().map(([key, val]) => {
                    const isNum = typeof val === "number"
                    const type = isNum
                        ? "number"
                        : /Date$/.test(key)
                          ? "date"
                          : "text"
                    const isNotes = key === "notes"
                    const isRequired = isFieldRequired(key)
                    const label = key
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^\w/, (c) => c.toUpperCase())

                    return (
                        <div
                            key={key}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gridColumn: isNotes ? "1 / -1" : "auto",
                            }}
                        >
                            <label
                                htmlFor={key}
                                style={{
                                    marginBottom: "8px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                }}
                            >
                                {label}
                                {isRequired && (
                                    <span
                                        style={{
                                            color: "#ef4444",
                                            marginLeft: "4px",
                                        }}
                                    >
                                        *
                                    </span>
                                )}
                            </label>
                            {isNotes ? (
                                <textarea
                                    id={key}
                                    name={key}
                                    value={val as string}
                                    onChange={handleChange}
                                    required={isRequired}
                                    rows={3}
                                    style={{
                                        padding: "12px",
                                        border: `1px solid ${isRequired ? "#f87171" : "#d1d5db"}`,
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: FONT_STACK,
                                        resize: "vertical",
                                        transition: "border-color 0.2s",
                                    }}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor = "#3b82f6")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor = isRequired
                                            ? "#f87171"
                                            : "#d1d5db")
                                    }
                                />
                            ) : (
                                <input
                                    id={key}
                                    name={key}
                                    type={type}
                                    value={val as any}
                                    onChange={handleChange}
                                    required={isRequired}
                                    style={{
                                        padding: "12px",
                                        border: `1px solid ${isRequired ? "#f87171" : "#d1d5db"}`,
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: FONT_STACK,
                                        transition: "border-color 0.2s",
                                    }}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor = "#3b82f6")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor = isRequired
                                            ? "#f87171"
                                            : "#d1d5db")
                                    }
                                />
                            )}
                        </div>
                    )
                })}

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
                        style={{
                            padding: "12px 24px",
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
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    )
}

// ——— The Role-Aware Enhanced Override ———
export function BoatPageOverride(): Override {
    const [boats, setBoats] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [editingBoat, setEditingBoat] = useState<any | null>(null)
    const [deletingBoatId, setDeletingBoatId] = useState<
        string | number | null
    >(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(
            COLUMNS.filter((col) => col.group === "essential").map(
                (col) => col.key
            )
        )
    )
    const [fieldConfig, setFieldConfig] = useState<Record<
        string,
        { visible: boolean; required: boolean }
    > | null>(null)
    const [organizations, setOrganizations] = useState<string[]>([])
    const [selectedOrganizations, setSelectedOrganizations] = useState<
        Set<string>
    >(new Set())
    const [successMessage, setSuccessMessage] = useState<string | null>(null)
    const [decliningBoatId, setDecliningBoatId] = useState<
        string | number | null
    >(null)
    
    // Role-aware state
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
    const [selectedUserOrganization, setSelectedUserOrganization] = useState<string | null>(null)

    const refresh = useCallback(() => {
        if (userInfo) {
            fetchBoatsForUser(userInfo, selectedUserOrganization)
                .then(setBoats)
                .catch((err) => {
                    console.error(err)
                    setError(err.message)
                })
        }
    }, [userInfo, selectedUserOrganization])

    // Load field configuration, user info, and organizations on mount
    useEffect(() => {
        // Load user info first
        const loadUserInfo = async () => {
            setIsLoadingUserInfo(true)
            const basicUserInfo = getUserInfo()
            
            if (basicUserInfo?.sub) {
                // Fetch complete user info from backend
                const completeUserInfo = await fetchUserInfo(basicUserInfo.sub)
                if (completeUserInfo) {
                    setUserInfo(completeUserInfo)
                    console.log('User info loaded successfully:', completeUserInfo)
                    
                    // Set initial selected organization for multi-org users
                    if (!isAdmin(completeUserInfo) && completeUserInfo.organizations && completeUserInfo.organizations.length > 0) {
                        if (completeUserInfo.organizations.length > 1) {
                            setSelectedUserOrganization("ALL_ORGANIZATIONS")
                        } else {
                            setSelectedUserOrganization(completeUserInfo.organizations[0])
                        }
                    }
                } else {
                    console.error('Failed to load complete user info')
                }
            } else {
                console.error('No basic user info found')
                setUserInfo(null)
            }
            setIsLoadingUserInfo(false)
        }

        loadUserInfo()
    }, [])

    // Load field configuration based on user role and selected organization
    useEffect(() => {
        if (!isLoadingUserInfo && userInfo) {
            fetchOrganizationConfig(userInfo, selectedUserOrganization)
                .then((config) => {
                    setFieldConfig(config)

                    if (config && !isAdmin(userInfo)) {
                        // Only apply config-based column visibility for non-admin users
                        const configuredVisibleColumns = new Set<string>()

                        COLUMNS.filter((col) => col.group === "essential").forEach(
                            (col) => {
                                const fieldConfigForCol = config[col.key]
                                if (fieldConfigForCol?.visible !== false) {
                                    configuredVisibleColumns.add(col.key)
                                }
                            }
                        )

                        // Show organization column when viewing boats from multiple organizations
                        if (selectedUserOrganization === "ALL_ORGANIZATIONS" || 
                            (userInfo?.organizations && userInfo.organizations.length > 1)) {
                            configuredVisibleColumns.add("organization")
                        }

                        setVisibleColumns(configuredVisibleColumns)
                    } else if (isAdmin(userInfo)) {
                        // Admin sees all essential columns by default plus organization
                        const essentialColumns = new Set(
                            COLUMNS.filter((col) => col.group === "essential").map(
                                (col) => col.key
                            )
                        )
                        essentialColumns.add("organization") // Always show organization for admins
                        setVisibleColumns(essentialColumns)
                    }
                })
                .catch((err) => {
                    console.error("Failed to load field configuration:", err)
                })
        }
    }, [userInfo, isLoadingUserInfo, selectedUserOrganization])

    // Load organizations after user info is loaded
    useEffect(() => {
        if (!isLoadingUserInfo && isAdmin(userInfo)) {
            fetchOrganizations()
                .then((orgs) => {
                    console.log("Loaded organizations:", orgs)
                    setOrganizations(orgs)
                    setSelectedOrganizations(new Set(orgs)) // Select all by default
                })
                .catch((err) => {
                    console.error("Failed to load organizations:", err)
                })
        }
    }, [userInfo, isLoadingUserInfo])

    // Load boats when user info changes
    useEffect(() => {
        if (!isLoadingUserInfo && userInfo) {
            refresh()
        }
    }, [userInfo, isLoadingUserInfo, refresh])

    // Role-aware filtering
    const filteredBoats = boats ? 
        filterBoats(boats, searchTerm, selectedOrganizations, organizations) : []

    // Debug logging
    console.log(
        "Total boats:",
        boats?.length,
        "Filtered boats:",
        filteredBoats.length,
        "User role:",
        userInfo?.role,
        "User org:",
        userInfo?.organization
    )

    const handleEdit = (id: string | number) =>
        setEditingBoat(boats?.find((b) => b.id === id) || null)

    const confirmDelete = (id: string | number) => setDeletingBoatId(id)

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

    const toggleOrganization = (org: string) => {
        setSelectedOrganizations((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(org)) {
                newSet.delete(org)
            } else {
                newSet.add(org)
            }
            return newSet
        })
    }

    const handleApprove = async (boatId: string | number) => {
        try {
            await approveBoat(boatId)
            setSuccessMessage("Boat approved successfully!")
            refresh()
        } catch (err: any) {
            setError(`Failed to approve boat: ${err.message}`)
        }
    }

    const handleDecline = async (boatId: string | number, reason: string) => {
        try {
            await declineBoat(boatId, reason)
            setSuccessMessage("Boat declined successfully!")
            setDecliningBoatId(null)
            refresh()
        } catch (err: any) {
            setError(`Failed to decline boat: ${err.message}`)
            setDecliningBoatId(null)
        }
    }

    async function handleDelete() {
        if (deletingBoatId == null) return
        const id = deletingBoatId
        setDeletingBoatId(null)
        try {
            await deleteBoat(id)
            setSuccessMessage("Boat deleted successfully!")
            refresh()
        } catch (err: any) {
            console.error(err)
            setDeleteError(`Failed to delete boat: ${err.message}`)
        }
    }

    if (boats === null || isLoadingUserInfo) {
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
                    {isLoadingUserInfo ? "Loading user information..." : "Loading boats..."}
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

    const getConfiguredVisibleColumns = () => {
        const baseVisibleColumns = COLUMNS.filter((col) =>
            visibleColumns.has(col.key)
        )

        // Admin sees all selected columns regardless of field config
        if (isAdmin(userInfo)) {
            return baseVisibleColumns
        }

        // Regular users see columns filtered by their organization's config
        if (!fieldConfig) return baseVisibleColumns

        return baseVisibleColumns.filter((col) => {
            const config = fieldConfig[col.key]
            return config ? config.visible : true
        })
    }

    const visibleColumnsList = getConfiguredVisibleColumns()

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
                                <div>
                                    <h1
                                        style={{
                                            fontSize: "28px",
                                            fontWeight: "700",
                                            color: "#1f2937",
                                            margin: 0,
                                            marginBottom: "4px",
                                        }}
                                    >
                                        {isAdmin(userInfo) ? "Boat Management - Admin" : "My Fleet"}
                                    </h1>
                                    <div
                                        style={{
                                            fontSize: "13px",
                                            color: "#6b7280",
                                            marginBottom: "8px",
                                        }}
                                    >
                                        {isAdmin(userInfo) ? (
                                            "Viewing as Admin"
                                        ) : userInfo?.organization ? (
                                            <>Viewing as {userInfo.role === 'editor' ? 'Editor' : 'User'} with access to: <strong>{userInfo.organization}</strong></>
                                        ) : (
                                            `Viewing as ${userInfo?.role === 'editor' ? 'Editor' : 'User'}`
                                        )}
                                    </div>
                                </div>
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "#6b7280",
                                        backgroundColor: "#f3f4f6",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                    }}
                                >
                                    {filteredBoats.length} boats
                                    {fieldConfig && (
                                        <span
                                            style={{
                                                marginLeft: "8px",
                                                fontSize: "12px",
                                            }}
                                        >
                                            • Config loaded
                                        </span>
                                    )}
                                </div>
                            </div>

                            <SearchAndFilterBar
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                visibleColumns={visibleColumns}
                                onToggleColumn={toggleColumn}
                                fieldConfig={fieldConfig}
                                organizations={organizations}
                                selectedOrganizations={selectedOrganizations}
                                onOrganizationChange={toggleOrganization}
                                showOrgFilter={isAdmin(userInfo)}
                                userInfo={userInfo}
                                selectedUserOrganization={selectedUserOrganization}
                                onUserOrganizationChange={setSelectedUserOrganization}
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
                                    minWidth: "1000px",
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
                                                width: "140px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            General Actions
                                        </th>
                                        {isAdmin(userInfo) && (
                                            <th
                                                style={{
                                                    textAlign: "left",
                                                    padding: "12px 8px",
                                                    borderBottom:
 "2px solid #e5e7eb",
                                                    fontWeight: "600",
                                                    color: "#374151",
                                                    width: "140px",
                                                    fontSize: "13px",
                                                }}
                                            >
                                                Status Actions
                                            </th>
                                        )}
                                        {visibleColumnsList.map((col) => {
                                            const config =
                                                fieldConfig?.[col.key]
                                            const isRequired =
                                                config?.required || false

                                            return (
                                                <th
                                                    key={col.key}
                                                    style={{
                                                        textAlign: "left",
                                                        padding: "12px 8px",
                                                        borderBottom:
                                                            "2px solid #e5e7eb",
                                                        fontWeight: "600",
                                                        color: "#374151",
                                                        width:
                                                            col.width || "auto",
                                                        minWidth: "80px",
                                                        fontSize: "13px",
                                                        lineHeight: "1.2",
                                                    }}
                                                >
                                                    {col.label}
                                                    {isRequired && (
                                                        <span
                                                            style={{
                                                                color: "#ef4444",
                                                                marginLeft:
                                                                    "4px",
                                                            }}
                                                        >
                                                            *
                                                        </span>
                                                    )}
                                                </th>
                                            )
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredBoats.map((boat, index) => (
                                        <tr
                                            key={boat.id}
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
                                                <GeneralActionButtons
                                                    boat={boat}
                                                    onEdit={handleEdit}
                                                    onDelete={confirmDelete}
                                                />
                                            </td>
                                            {isAdmin(userInfo) && (
                                                <td
                                                    style={{
                                                        padding: "12px 8px",
                                                        borderBottom:
                                                            "1px solid #f1f5f9",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    <StatusActionButtons
                                                        boat={boat}
                                                        onApprove={handleApprove}
                                                        onDecline={(id) => setDecliningBoatId(id)}
                                                    />
                                                </td>
                                            )}
                                            {visibleColumnsList.map((col) => {
                                                const cellValue = boat[col.key]
                                                const displayValue = renderBoatCellValue(col, cellValue)

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
                {editingBoat &&
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
                            <EditBoatForm
                                boat={editingBoat}
                                onClose={() => setEditingBoat(null)}
                                refresh={refresh}
                                fieldConfig={fieldConfig}
                                userInfo={userInfo}
                            />
                        </div>,
                        document.body
                    )}

                {deletingBoatId != null &&
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
                                onCancel={() => setDeletingBoatId(null)}
                            />
                        </div>,
                        document.body
                    )}

                {decliningBoatId != null &&
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
                            <DeclineReasonDialog
                                onConfirm={(reason) =>
                                    handleDecline(decliningBoatId, reason)
                                }
                                onCancel={() => setDecliningBoatId(null)}
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

                {error &&
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
                                message={error}
                                onClose={() => setError(null)}
                            />
                        </div>,
                        document.body
                    )}

                {successMessage &&
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
                            <SuccessNotification
                                message={successMessage}
                                onClose={() => setSuccessMessage(null)}
                            />
                        </div>,
                        document.body
                    )}
            </>
        ),
    }
}