// src/PolicyPageOverride.tsx
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override, Frame } from "framer"
import { useState, useEffect, useCallback } from "react"
import { FaEdit, FaTrashAlt, FaSearch, FaFilter, FaFileContract, FaArrowLeft, FaBuilding, FaUsers, FaClipboardList, FaPlus, FaClock } from "react-icons/fa"
import { NewPolicyButton, PolicyActionButtons } from "../components/InsuranceButtons.tsx"
import { UserInfoBanner } from "../components/UserInfoBanner"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const POLICY_PATH = "/neptunus/policy"
const INSURED_OBJECT_PATH = "/neptunus/insured-object"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
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

        const res = await fetch(`${API_BASE_URL}/neptunus/user/${cognitoSub}`, {
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

function getUserInfo(): UserInfo | null {
    try {
        const token = getIdToken()
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

// Check if user is admin
function isAdmin(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "admin"
}

// Check if user is broker/editor
function isBroker(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "editor"
}

// Check if user has access to an organization
function hasOrganizationAccess(userInfo: UserInfo | null, organization: string): boolean {
    if (!userInfo) return false
    if (isAdmin(userInfo)) return true // Admins can see everything
    if (userInfo.organization === organization) return true
    return userInfo.organizations?.includes(organization) || false
}
function navigateToBoats(policy: any) {
    // Store the selected policy data for the boats page
    sessionStorage.setItem(
        "selectedPolicy",
        JSON.stringify({
            id: policy.id,
            organization: policy.organization,
            polisnummer: policy.polisnummer,
            klantnaam: policy.klantnaam,
        })
    )

    // Navigate to the boats page
    window.open("/voorradscherm_overrides", "_blank")
}

async function fetchPolicies(userInfo: UserInfo | null): Promise<any[]> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}${POLICY_PATH}`, {
        method: "GET",
        headers,
        mode: "cors",
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const json = await res.json()
    let policies = json.policies || []
    
    // Filter policies based on user role and organization access
    if (userInfo && !isAdmin(userInfo)) {
        policies = policies.filter((policy: any) => 
            hasOrganizationAccess(userInfo, policy.organization)
        )
    }
    
    return policies
}

async function fetchPendingCount(): Promise<number> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`
        
        const res = await fetch(`${API_BASE_URL}${INSURED_OBJECT_PATH}?status=Pending`, {
            method: "GET",
            headers,
            mode: "cors",
        })
        
        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const data = await res.json()
        const result = data.items || data.objects || data.insuredObjects || data || []
        return Array.isArray(result) ? result.length : 0
    } catch (error) {
        console.error("Error fetching pending count:", error)
        return 0
    }
}

// ——— Column Groups and Definitions ———
type ColumnKey =
    | "polisnummer"
    | "klantnaam"
    | "inventaristype"
    | "openstaandeAanpassingen"
    | "makelaarsnaam"
    | "makelaarsemail"
    | "makelaarstelefoon"
    | "organization"
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
    // Essential columns - most important policy info
    {
        key: "polisnummer",
        label: "Polis #",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "klantnaam",
        label: "Klant Naam",
        priority: 1,
        group: "essential",
        width: "150px",
    },
    {
        key: "inventaristype",
        label: "Inventaris Type",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "organization",
        label: "Organisatie",
        priority: 1,
        group: "essential",
        width: "120px",
    },

    // Additional columns
    {
        key: "openstaandeAanpassingen",
        label: "Lopende Aanpassingen",
        priority: 2,
        group: "additional",
        width: "150px",
    },
    {
        key: "makelaarsnaam",
        label: "Makelaar Naam",
        priority: 2,
        group: "additional",
        width: "130px",
    },
    {
        key: "makelaarsemail",
        label: "Makelaar E-mail",
        priority: 2,
        group: "additional",
        width: "150px",
    },
    {
        key: "makelaarstelefoon",
        label: "Makelaar Telefoon",
        priority: 2,
        group: "additional",
        width: "140px",
    },
    {
        key: "createdAt",
        label: "Aangemaakt",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "updatedAt",
        label: "Bijgewerkt",
        priority: 2,
        group: "additional",
        width: "110px",
    },
]

// ——— Enhanced Confirm Delete Dialog ———
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
                Verwijder Polis
            </div>
            <div
                style={{
                    fontSize: "14px",
                    color: "#6b7280",
                    marginBottom: "24px",
                    lineHeight: "1.5",
                }}
            >
                Weet je zeker dat je deze polis wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
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
                    Annuleer
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
                    Verwijder
                </button>
            </div>
        </div>
    )
}

// ——— Enhanced Edit Form ———
type PolicyFormState = {
    polisnummer: string
    klantnaam: string
    inventaristype: string
    openstaandeAanpassingen: string
    makelaarsnaam: string
    makelaarsemail: string
    makelaarstelefoon: string
    organization: string
}

// Create Policy Form - for new policies
function CreatePolicyForm({
    onClose,
    refresh,
}: {
    onClose(): void
    refresh(): void
}) {
    const [form, setForm] = useState<PolicyFormState>({
        polisnummer: "",
        klantnaam: "",
        inventaristype: "",
        openstaandeAanpassingen: "",
        makelaarsnaam: "",
        makelaarsemail: "",
        makelaarstelefoon: "",
        organization: "",
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [organizations, setOrganizations] = useState<any[]>([])
    const [loadingOrganizations, setLoadingOrganizations] = useState(true)

    // Fetch organizations and filter out those that already have policies
    useEffect(() => {
        async function fetchOrganizationsAndPolicies() {
            try {
                // Fetch both organizations and existing policies in parallel
                const [orgsResponse, policiesResponse] = await Promise.all([
                    fetch(`${API_BASE_URL}/neptunus/organization`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${getIdToken()}`,
                        },
                    }),
                    fetch(`${API_BASE_URL}${POLICY_PATH}`, {
                        method: "GET",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${getIdToken()}`,
                        },
                    })
                ])

                if (orgsResponse.ok && policiesResponse.ok) {
                    const orgsData = await orgsResponse.json()
                    const policiesData = await policiesResponse.json()
                    
                    const allOrganizations = orgsData.organizations || []
                    const existingPolicies = policiesData.policies || []
                    
                    // Get organization names that already have policies
                    const organizationsWithPolicies = new Set(
                        existingPolicies.map((policy: any) => policy.organization)
                    )
                    
                    // Filter out organizations that already have policies
                    const availableOrganizations = allOrganizations.filter(
                        (org: any) => !organizationsWithPolicies.has(org.name)
                    )
                    
                    setOrganizations(availableOrganizations)
                } else {
                    console.error("Failed to fetch organizations or policies")
                    setError("Kon organisaties niet ophalen")
                }
            } catch (err) {
                console.error("Error fetching organizations and policies:", err)
                setError("Kon organisaties niet ophalen")
            } finally {
                setLoadingOrganizations(false)
            }
        }

        fetchOrganizationsAndPolicies()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError(null)
        setSuccess(null)
        
        // Validate that organization is selected
        if (!form.organization) {
            setError("Selecteer een organisatie")
            return
        }
        
        try {
            const res = await fetch(`${API_BASE_URL}${POLICY_PATH}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getIdToken()}`,
                },
                body: JSON.stringify(form),
            })
            
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || "Failed to create policy")
            }
            
            setSuccess("Polis succesvol aangemaakt!")
            setTimeout(() => {
                refresh()
                onClose()
            }, 1000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                backgroundColor: "white",
                border: "1px solid #d1d5db",
                borderRadius: 12,
                padding: 32,
                boxShadow: "0 25px 70px rgba(0,0,0,0.15)",
                minWidth: 400,
                maxWidth: 600,
                zIndex: 1000,
                fontFamily: FONT_STACK,
            }}
        >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>Nieuwe Polis Aanmaken</h2>
                <button
                    onClick={onClose}
                    style={{
                        border: "none",
                        background: "none",
                        fontSize: 16,
                        cursor: "pointer",
                        padding: 4,
                    }}
                >
                    ×
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
                    {Object.entries(form).map(([key, val]) => {
                        const label = key === "organization" ? "Organisatie" : key
                            .replace(/_/g, " ")
                            .replace(/^\w/, (c) => c.toUpperCase())

                        return (
                            <div key={key} style={{ display: "flex", flexDirection: "column" }}>
                                <label
                                    htmlFor={key}
                                    style={{
                                        marginBottom: 8,
                                        fontSize: 14,
                                        fontWeight: 500,
                                        color: "#374151",
                                    }}
                                >
                                    {label} {key === "organization" && <span style={{ color: "#ef4444" }}>*</span>}
                                </label>
                                {key === "organization" ? (
                                    <select
                                        id={key}
                                        name={key}
                                        value={val}
                                        onChange={handleChange}
                                        disabled={loadingOrganizations}
                                        required
                                        style={{
                                            padding: 12,
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontSize: 14,
                                            fontFamily: FONT_STACK,
                                            transition: "border-color 0.2s",
                                            backgroundColor: loadingOrganizations ? "#f9fafb" : "#fff",
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                                        onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                    >
                                        <option value="">
                                            {loadingOrganizations 
                                                ? "Organisaties laden..." 
                                                : organizations.length === 0 
                                                    ? "Alle organisaties hebben al een polis" 
                                                    : "Selecteer een organisatie"}
                                        </option>
                                        {organizations.map((org) => (
                                            <option key={org.id} value={org.name}>
                                                {org.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        id={key}
                                        name={key}
                                        type="text"
                                        value={val}
                                        onChange={handleChange}
                                        style={{
                                            padding: 12,
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontSize: 14,
                                            fontFamily: FONT_STACK,
                                            transition: "border-color 0.2s",
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = "#3b82f6"}
                                        onBlur={(e) => e.target.style.borderColor = "#d1d5db"}
                                    />
                                )}
                            </div>
                        )
                    })}
                </div>

                {error && (
                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        backgroundColor: "#fef2f2",
                        color: "#dc2626",
                        borderRadius: 8,
                        fontSize: 14,
                    }}>
                        {error}
                    </div>
                )}

                {success && (
                    <div style={{
                        marginTop: 16,
                        padding: 12,
                        backgroundColor: "#f0fdf4",
                        color: "#16a34a",
                        borderRadius: 8,
                        fontSize: 14,
                    }}>
                        {success}
                    </div>
                )}

                <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "flex-end" }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "12px 20px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: "12px 20px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
                            borderRadius: 8,
                            fontSize: 14,
                            fontWeight: 500,
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        Polis Aanmaken
                    </button>
                </div>
            </form>
        </div>
    )
}

function EditPolicyForm({
    policy,
    onClose,
    refresh,
}: {
    policy: any
    onClose(): void
    refresh(): void
}) {
    const [form, setForm] = useState<PolicyFormState>({
        polisnummer: policy.polisnummer || "",
        klantnaam: policy.klantnaam || "",
        inventaristype: policy.inventaristype || "",
        openstaandeAanpassingen: policy.openstaandeAanpassingen || "",
        makelaarsnaam: policy.makelaarsnaam || "",
        makelaarsemail: policy.makelaarsemail || "",
        makelaarstelefoon: policy.makelaarstelefoon || "",
        organization: policy.organization || "",
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [organizations, setOrganizations] = useState<any[]>([])
    const [loadingOrganizations, setLoadingOrganizations] = useState(true)

    // Fetch organizations for dropdown
    useEffect(() => {
        async function fetchOrganizations() {
            try {
                const res = await fetch(`${API_BASE_URL}/neptunus/organization`, {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                })
                
                if (res.ok) {
                    const data = await res.json()
                    setOrganizations(data.organizations || [])
                } else {
                    console.error("Failed to fetch organizations")
                    setError("Kon organisaties niet ophalen")
                }
            } catch (err) {
                console.error("Error fetching organizations:", err)
                setError("Kon organisaties niet ophalen")
            } finally {
                setLoadingOrganizations(false)
            }
        }
        
        fetchOrganizations()
    }, [])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setError(null)
        setSuccess(null)
        setForm((f) => ({ ...f, [name]: value }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        try {
            const res = await fetch(
                `${API_BASE_URL}${POLICY_PATH}/${policy.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                    body: JSON.stringify(form),
                }
            )
            const data = await res.json()
            if (!res.ok) {
                setError(
                    typeof data === "object"
                        ? JSON.stringify(data)
                        : String(data)
                )
                return
            }
            setSuccess("Polis succesvol bijgewerkt.")
            setTimeout(() => {
                refresh()
                onClose()
            }, 1000)
        } catch (err: any) {
            setError(err.message)
        }
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
                Bewerk Polis
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
                {Object.entries(form).map(([key, val]) => {
                    const label = key
                        .replace(/_/g, " ")
                        .replace(/^\w/, (c) => c.toUpperCase())

                    return (
                        <div
                            key={key}
                            style={{
                                display: "flex",
                                flexDirection: "column",
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
                                {label} {key === "organization" && <span style={{ color: "#ef4444" }}>*</span>}
                            </label>
                            {key === "organization" ? (
                                <select
                                    id={key}
                                    name={key}
                                    value={val}
                                    onChange={handleChange}
                                    disabled={loadingOrganizations}
                                    required
                                    style={{
                                        padding: "12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: FONT_STACK,
                                        transition: "border-color 0.2s",
                                        backgroundColor: loadingOrganizations ? "#f9fafb" : "#fff",
                                        cursor: loadingOrganizations ? "wait" : "pointer",
                                    }}
                                    onFocus={(e) => (e.target.style.borderColor = "#3b82f6")}
                                    onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                                >
                                    <option value="">
                                        {loadingOrganizations 
                                            ? "Organisaties laden..." 
                                            : "Selecteer een organisatie"}
                                    </option>
                                    {organizations.map((org) => (
                                        <option key={org.id} value={org.name}>
                                            {org.name}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    id={key}
                                    name={key}
                                    type="text"
                                    value={val}
                                    onChange={handleChange}
                                    style={{
                                        padding: "12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: FONT_STACK,
                                        transition: "border-color 0.2s",
                                    }}
                                    onFocus={(e) =>
                                        (e.target.style.borderColor = "#3b82f6")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor = "#d1d5db")
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
                        Annuleer
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
                        Opslaan
                    </button>
                </div>
            </form>
        </div>
    )
}

// ——— Enhanced Error Notification ———
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

// ——— Enhanced Search and Filter Bar ———
function SearchAndFilterBar({
    searchTerm,
    onSearchChange,
    visibleColumns,
    onToggleColumn,
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    visibleColumns: Set<string>
    onToggleColumn: (column: string) => void
}) {
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null)
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        right: 0,
    })

    // Calculate dropdown position when button reference changes or dropdown opens
    useEffect(() => {
        if (buttonRef && showColumnFilter) {
            const rect = buttonRef.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [buttonRef, showColumnFilter])

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
                        placeholder="Zoek polissen..."
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

                <div style={{ position: "relative" }}>
                    <button
                        ref={setButtonRef}
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
                        <FaFilter /> Kolommen ({visibleColumns.size})
                    </button>
                </div>
            </div>

            {/* Portal the dropdown to document.body */}
            {showColumnFilter &&
                ReactDOM.createPortal(
                    <>
                        {/* Backdrop to close dropdown when clicking outside */}
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

                        {/* The actual dropdown */}
                        <div
                            style={{
                                position: "fixed",
                                top: `${dropdownPosition.top}px`,
                                right: `${dropdownPosition.right}px`,
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
                            {/* Quick Actions */}
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
                                            // First, hide all non-essential columns
                                            COLUMNS.filter(
                                                (col) =>
                                                    col.group !== "essential"
                                            ).forEach((col) => {
                                                if (
                                                    visibleColumns.has(col.key)
                                                ) {
                                                    onToggleColumn(col.key)
                                                }
                                            })
                                            // Then, show all essential columns
                                            COLUMNS.filter(
                                                (col) =>
                                                    col.group === "essential"
                                            ).forEach((col) => {
                                                if (
                                                    !visibleColumns.has(col.key)
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
                                            COLUMNS.forEach(
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

                            {/* Grouped Columns */}
                            {Object.entries(COLUMN_GROUPS).map(
                                ([groupKey, group]) => {
                                    const groupColumns = COLUMNS.filter(
                                        (col) => col.group === groupKey
                                    )
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
                                            {groupColumns.map((col) => (
                                                <label
                                                    key={col.key}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        padding: "6px 20px",
                                                        cursor: "pointer",
                                                        fontSize: "13px",
                                                        fontFamily: FONT_STACK,
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
                                                    {col.label}
                                                </label>
                                            ))}
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

// ——— The Enhanced Override ———
export function PolicyPageOverride(): Override {
    const [policies, setPolicies] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [editingPolicy, setEditingPolicy] = useState<any | null>(null)
    const [showCreateForm, setShowCreateForm] = useState(false)
    const [deletingPolicyId, setDeletingPolicyId] = useState<
        string | number | null
    >(null)
    const [deleteError, setDeleteError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(COLUMNS.map((col) => col.key)) // Show all columns by default
    )
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
    const [pendingCount, setPendingCount] = useState<number>(0)

    const refresh = useCallback(() => {
        fetchPolicies(userInfo)
            .then(setPolicies)
            .catch((err) => {
                console.error(err)
                setError(err.message)
            })
    }, [userInfo])

    // Load user info on mount
    useEffect(() => {
        async function loadUserInfo() {
            const basicUserInfo = getUserInfo()
            if (basicUserInfo) {
                setUserInfo(basicUserInfo)
                
                // Fetch detailed user info from backend
                const detailedUserInfo = await fetchUserInfo(basicUserInfo.sub)
                if (detailedUserInfo) {
                    setUserInfo(detailedUserInfo)
                }
            }
            setIsLoadingUserInfo(false)
        }
        
        loadUserInfo()
    }, [])

    useEffect(() => {
        if (!isLoadingUserInfo) {
            refresh()
        }
    }, [refresh, isLoadingUserInfo])

    // Fetch pending count
    useEffect(() => {
        const loadPendingCount = async () => {
            const count = await fetchPendingCount()
            setPendingCount(count)
        }
        loadPendingCount()
    }, [])

    const filteredPolicies =
        policies?.filter((policy) => {
            if (!searchTerm) return true
            return Object.values(policy).some((value) =>
                String(value).toLowerCase().includes(searchTerm.toLowerCase())
            )
        }) || []

    const handleEdit = (id: string | number) =>
        setEditingPolicy(policies?.find((p) => p.id === id) || null)

    const confirmDelete = (id: string | number) => setDeletingPolicyId(id)

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

    async function handleDelete() {
        if (deletingPolicyId == null) return
        const id = deletingPolicyId
        setDeletingPolicyId(null)
        try {
            const res = await fetch(`${API_BASE_URL}${POLICY_PATH}/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${getIdToken()}` },
            })
            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
            refresh()
        } catch (err: any) {
            console.error(err)
            setDeleteError(`Failed to delete policy: ${err.message}`)
        }
    }

    if (policies === null || isLoadingUserInfo) {
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
                    Loading policies...
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

    const visibleColumnsList = COLUMNS.filter((col) =>
        visibleColumns.has(col.key)
    )

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
                    {/* User Info Banner */}
                    <div style={{ marginBottom: "20px" }}>
                        <UserInfoBanner />
                    </div>

                    <div
                        style={{
                            backgroundColor: "#fff",
                            borderRadius: "12px",
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
                            {[
                                { key: "organizations", label: "Organisaties", icon: FaBuilding, href: "/organizations" },
                                { key: "policies", label: "Polissen", icon: FaFileContract, href: "/policies" },
                                { key: "pending", label: "Pending Items", icon: FaClock, href: "/pending_overview" },
                                { key: "users", label: "Gebruikers", icon: FaUsers, href: "/users" },
                                { key: "changelog", label: "Wijzigingslogboek", icon: FaClipboardList, href: "/changelog" }
                            ].filter((tab) => {
                                // Hide pending, users and changelog tabs for regular users
                                if (userInfo?.role === "user" && (tab.key === "pending" || tab.key === "users" || tab.key === "changelog")) {
                                    return false
                                }
                                return true
                            }).map((tab) => {
                                const isActive = tab.key === "policies"
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
                                            fontFamily: FONT_STACK,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            transition: "all 0.2s",
                                            minHeight: "48px",
                                            boxShadow: isActive 
                                                ? "0 2px 8px rgba(59, 130, 246, 0.15)" 
                                                : "0 2px 4px rgba(0,0,0,0.05)",
                                            transform: isActive ? "translateY(-1px)" : "none",
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
                                        {tab.key === "pending" && pendingCount > 0 && (
                                            <span
                                                style={{
                                                    backgroundColor: isActive ? "rgba(255,255,255,0.3)" : "#dc2626",
                                                    color: "white",
                                                    borderRadius: "10px",
                                                    padding: "2px 6px",
                                                    fontSize: "12px",
                                                    fontWeight: "700",
                                                    minWidth: "18px",
                                                    textAlign: "center",
                                                    marginLeft: "4px",
                                                }}
                                            >
                                                {pendingCount}
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        
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
                                        <FaFileContract
                                            size={24}
                                            style={{
                                                color: "#3b82f6",
                                            }}
                                        />
                                        <h1
                                            style={{
                                                fontSize: "32px",
                                                fontWeight: "600",
                                                color: "#1f2937",
                                                margin: 0,
                                                letterSpacing: "-0.025em",
                                            }}
                                        >
                                            {isAdmin(userInfo) ? "Polis Beheer" : "Mijn Polissen"}
                                        </h1>
                                    </div>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                                    <div
                                        style={{
                                            fontSize: "14px",
                                            color: "#6b7280",
                                            backgroundColor: "#f3f4f6",
                                            padding: "6px 12px",
                                            borderRadius: "6px",
                                        }}
                                    >
                                        {filteredPolicies.length} polissen
                                    </div>
                                    <NewPolicyButton
                                        userInfo={userInfo}
                                        onClick={() => {
                                            setShowCreateForm(true)
                                        }}
                                        resourceOrganization={userInfo?.organization}
                                    />
                                </div>
                            </div>

                            <SearchAndFilterBar
                                searchTerm={searchTerm}
                                onSearchChange={setSearchTerm}
                                visibleColumns={visibleColumns}
                                onToggleColumn={toggleColumn}
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
                                    minWidth: "800px",
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
                                                width: "100px",
                                                fontSize: "13px",
                                            }}
                                        >
                                            Acties
                                        </th>
                                        {visibleColumnsList.map((col) => (
                                            <th
                                                key={col.key}
                                                style={{
                                                    textAlign: "left",
                                                    padding: "12px 8px",
                                                    borderBottom:
                                                        "2px solid #e5e7eb",
                                                    fontWeight: "600",
                                                    color: "#374151",
                                                    width: col.width || "auto",
                                                    minWidth: "80px",
                                                    fontSize: "13px",
                                                    lineHeight: "1.2",
                                                }}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPolicies.map((policy, index) => (
                                        <tr
                                            key={policy.id}
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
                                                <PolicyActionButtons
                                                    userInfo={userInfo}
                                                    onEdit={() => {
                                                        handleEdit(policy.id)
                                                    }}
                                                    onDelete={() => {
                                                        confirmDelete(policy.id)
                                                    }}
                                                    resourceOrganization={policy.organization}
                                                    policyStatus={policy.status || "active"}
                                                />
                                            </td>
                                            {visibleColumnsList.map((col) => {
                                                const cellValue =
                                                    policy[col.key]
                                                const displayValue =
                                                    policy[col.key] != null ? (
                                                        col.key.includes(
                                                            "Date"
                                                        ) ||
                                                        col.key ===
                                                            "createdAt" ||
                                                        col.key ===
                                                            "updatedAt" ? (
                                                            new Date(
                                                                policy[col.key]
                                                            ).toLocaleDateString()
                                                        ) : (
                                                            String(
                                                                policy[col.key]
                                                            )
                                                        )
                                                    ) : (
                                                        <span
                                                            style={{
                                                                color: "#9ca3af",
                                                            }}
                                                        >
                                                            -
                                                        </span>
                                                    )

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
                                                            cursor: "default", // Ensure cells don't show pointer cursor
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
                {showCreateForm &&
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
                            <CreatePolicyForm
                                onClose={() => setShowCreateForm(false)}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}

                {editingPolicy &&
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
                            <EditPolicyForm
                                policy={editingPolicy}
                                onClose={() => setEditingPolicy(null)}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}

                {deletingPolicyId != null &&
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
                                onCancel={() => setDeletingPolicyId(null)}
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
            </>
        ),
    }
}

// Additional exports for Framer compatibility
export function PolicyApp(): Override {
    return PolicyPageOverride()
}

export default PolicyPageOverride
