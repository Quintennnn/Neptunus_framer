// boats/shared/boat_utils.tsx - Shared utilities for boat functionality
import * as React from "react"
import * as ReactDOM from "react-dom"
import { useState } from "react"
import { COLUMNS, FONT_STACK, type BoatFormState } from "./boat_table_components"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const BOAT_PATH = "/neptunus/boat"
const ORGANIZATION_PATH = "/neptunus/organization"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

// ——— API Functions ———

// Fetch organization field configuration
async function fetchOrganizationConfig(): Promise<Record<
    string,
    { visible: boolean; required: boolean }
> | null> {
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
            return json.organizations[0].boat_fields_config
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
async function updateBoat(boatId: string | number, formData: BoatFormState): Promise<void> {
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

// ——— Validation ———
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

// Export all utilities
export {
    // API functions
    fetchOrganizationConfig,
    fetchOrganizations,
    fetchBoats,
    approveBoat,
    declineBoat,
    deleteBoat,
    updateBoat,
    // Validation & forms
    validateForm,
    useBoatForm,
    // Filters
    filterBoats,
    // Dialog components
    DeclineReasonDialog,
    ConfirmDeleteDialog,
    ErrorNotification,
    SuccessNotification,
    // Constants
    API_BASE_URL,
    BOAT_PATH,
    ORGANIZATION_PATH,
    getIdToken,
}