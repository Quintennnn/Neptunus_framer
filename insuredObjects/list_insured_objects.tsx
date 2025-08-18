// src/InsuredObjectListOverride.tsx (Role-aware insured object management system)
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override } from "framer"
import { useState, useEffect, useCallback } from "react"
import { UserInfoBanner } from "../components/UserInfoBanner.tsx"
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
} from "react-icons/fa"
import { colors, styles, hover, FONT_STACK } from "../theme"
import { API_BASE_URL, API_PATHS, getIdToken } from "../utils"
import { ObjectType, OBJECT_TYPE_CONFIG } from "./create_insured_object"
import { useDynamicSchema, DEFAULT_SCHEMA, FieldSchema, getFieldsForObjectType as getSchemaFieldsForObjectType, getFieldKeysForObjectType } from "../hooks/useDynamicSchema"
import { formatErrorMessage, formatSuccessMessage } from "../utils"

// ——— Simple Create Button Component ———
function CreateObjectButton({ onCreateClick }: { onCreateClick: () => void }) {
    return (
        <button
            onClick={onCreateClick}
            style={{
                ...styles.primaryButton,
                padding: "8px 16px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                fontSize: "14px",
                fontWeight: "500",
                backgroundColor: colors.primary,
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                boxShadow: `0 2px 4px ${colors.primary}30`,
                transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
                const target = e.target as HTMLElement
                target.style.backgroundColor = `${colors.primary}dd`
                target.style.transform = "translateY(-1px)"
                target.style.boxShadow = `0 4px 8px ${colors.primary}40`
            }}
            onMouseOut={(e) => {
                const target = e.target as HTMLElement
                target.style.backgroundColor = colors.primary
                target.style.transform = "translateY(0)"
                target.style.boxShadow = `0 2px 4px ${colors.primary}30`
            }}
        >
            <FaPlus size={12} />
            Voeg verzekerd object toe
        </button>
    )
}

// ——— Object Type Selector Component ———
function ObjectTypeSelector({
    onSelect,
    onClose,
    onBack,
}: {
    onSelect: (type: ObjectType) => void
    onClose: () => void
    onBack?: () => void
}) {
    return (
        <div
            style={{
                ...styles.modal,
                width: "min(90vw, 600px)",
                padding: "32px",
            }}
        >
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    {onBack && (
                        <button
                            onClick={onBack}
                            style={{
                                ...styles.iconButton,
                                marginRight: "12px",
                            }}
                            onMouseOver={(e) => hover.iconButton(e.target as HTMLElement)}
                            onMouseOut={(e) => hover.resetIconButton(e.target as HTMLElement)}
                        >
                            <FaArrowLeft size={16} />
                        </button>
                    )}
                    <div style={styles.title}>
                        Choose Object Type
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={styles.iconButton}
                    onMouseOver={(e) => hover.iconButton(e.target as HTMLElement)}
                    onMouseOut={(e) => hover.resetIconButton(e.target as HTMLElement)}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            <div style={{ marginBottom: "24px", color: colors.gray600 }}>
                Selecteer het type object dat je wilt verzekeren:
            </div>

            {/* Object Type Grid */}
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "16px",
                }}
            >
                {Object.entries(OBJECT_TYPE_CONFIG).map(([type, config]) => {
                    const IconComponent = config.icon
                    return (
                        <button
                            key={type}
                            onClick={() => onSelect(type as ObjectType)}
                            style={{
                                ...styles.card,
                                padding: "24px",
                                border: `2px solid ${colors.gray200}`,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                textAlign: "left",
                            }}
                            onMouseOver={(e) => {
                                const element = e.target as HTMLElement
                                element.style.borderColor = config.color
                                element.style.backgroundColor = `${config.color}10`
                                element.style.transform = "translateY(-2px)"
                                element.style.boxShadow = `0 8px 25px ${config.color}20`
                            }}
                            onMouseOut={(e) => {
                                const element = e.target as HTMLElement
                                element.style.borderColor = colors.gray200
                                element.style.backgroundColor = colors.white
                                element.style.transform = "translateY(0)"
                                element.style.boxShadow = styles.card.boxShadow
                            }}
                        >
                            <div style={{ display: "flex", alignItems: "center", marginBottom: "12px" }}>
                                <IconComponent size={24} color={config.color} />
                                <div
                                    style={{
                                        marginLeft: "12px",
                                        fontSize: "18px",
                                        fontWeight: "600",
                                        color: colors.gray900,
                                    }}
                                >
                                    {config.label}
                                </div>
                            </div>
                            <div
                                style={{
                                    fontSize: "14px",
                                    color: colors.gray600,
                                    lineHeight: "1.4",
                                }}
                            >
                                {config.description}
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}

// ——— Organization Selector Component ———
function OrganizationSelector({
    userInfo,
    availableOrganizations,
    onSelect,
    onClose,
    onBack,
}: {
    userInfo: UserInfo
    availableOrganizations: string[]
    onSelect: (organization: string) => void
    onClose: () => void
    onBack: () => void
}) {
    return (
        <div
            style={{
                ...styles.modal,
                width: "min(90vw, 500px)",
                padding: "32px",
            }}
        >
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                        onClick={onBack}
                        style={{
                            ...styles.iconButton,
                            marginRight: "12px",
                        }}
                        onMouseOver={(e) => hover.iconButton(e.target as HTMLElement)}
                        onMouseOut={(e) => hover.resetIconButton(e.target as HTMLElement)}
                    >
                        <FaArrowLeft size={16} />
                    </button>
                    <div style={styles.title}>
                        Choose Organization
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={styles.iconButton}
                    onMouseOver={(e) => hover.iconButton(e.target as HTMLElement)}
                    onMouseOut={(e) => hover.resetIconButton(e.target as HTMLElement)}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            <div style={{ marginBottom: "24px", color: colors.gray600 }}>
                {userInfo.role === "admin" 
                    ? "Selecteer de organisatie waarvoor je het verzekerde object wilt aanmaken:"
                    : "Selecteer een van je organisaties:"}
            </div>

            {availableOrganizations.length === 0 ? (
                <div style={{
                    padding: "24px",
                    textAlign: "center",
                    color: colors.gray500,
                    backgroundColor: colors.gray50,
                    borderRadius: "8px",
                    border: `1px solid ${colors.gray200}`,
                }}>
                    Geen organisaties beschikbaar. Neem contact op met je beheerder.
                </div>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {availableOrganizations.map((orgName) => (
                        <button
                            key={orgName}
                            onClick={() => onSelect(orgName)}
                            style={{
                                ...styles.card,
                                padding: "16px",
                                border: `2px solid ${colors.gray200}`,
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                textAlign: "left",
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                            }}
                            onMouseOver={(e) => {
                                const element = e.target as HTMLElement
                                element.style.borderColor = colors.primary
                                element.style.backgroundColor = `${colors.primary}10`
                                element.style.transform = "translateY(-1px)"
                                element.style.boxShadow = `0 4px 12px ${colors.primary}20`
                            }}
                            onMouseOut={(e) => {
                                const element = e.target as HTMLElement
                                element.style.borderColor = colors.gray200
                                element.style.backgroundColor = colors.white
                                element.style.transform = "translateY(0)"
                                element.style.boxShadow = styles.card.boxShadow
                            }}
                        >
                            <FaUser size={20} color={colors.primary} />
                            <div style={{
                                fontSize: "16px",
                                fontWeight: "500",
                                color: colors.gray900,
                            }}>
                                {orgName}
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}

// ——— Main form component for creating insured objects ———
function InsuredObjectForm({
    objectType,
    selectedOrganization,
    onClose,
    onBack,
    onSuccess,
}: {
    objectType: ObjectType
    selectedOrganization: string
    onClose: () => void
    onBack: () => void
    onSuccess?: () => void
}) {
    const config = OBJECT_TYPE_CONFIG[objectType]
    const [form, setForm] = React.useState<InsuredObjectFormState>(() => {
        const defaultState = getDefaultFormState(objectType)
        return {
            ...defaultState,
            organization: selectedOrganization,
            ingangsdatum: new Date().toISOString().split('T')[0], // Set today's date in YYYY-MM-DD format
        }
    })
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isLoadingConfig, setIsLoadingConfig] = React.useState(config.useOrgConfig === true)
    
    // Use dynamic schema hook
    const { schema, loading: schemaLoading, error: schemaError } = useDynamicSchema(selectedOrganization)

    // Set loading state based on schema loading
    React.useEffect(() => {
        setIsLoadingConfig(schemaLoading)
        if (schemaError) {
            setError("Kon schema niet laden: " + schemaError)
        }
    }, [schemaLoading, schemaError])

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
        const { name, value, type } = e.target
        setError(null)
        setSuccess(null)
        setForm((prev) => ({
            ...prev,
            [name]: type === "number" ? (value === "" ? "" : parseFloat(value)) : value,
        }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            const res = await fetch(API_BASE_URL + API_PATHS.INSURED_OBJECT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getIdToken()}`,
                },
                body: JSON.stringify(form),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(formatErrorMessage(data))
            } else {
                setSuccess(formatSuccessMessage(data, `${config.label} insurance`))
                // Auto-close after success
                setTimeout(() => {
                    onSuccess?.()
                    onClose()
                }, 2000)
            }
        } catch (err: any) {
            setError(
                err.message ||
                    "Kon formulier niet verzenden. Controleer je verbinding en probeer opnieuw."
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderInput = (field: FieldSchema) => {
        const val = form[field.key as keyof InsuredObjectFormState]

        // Skip objectType and organization fields (handled separately)
        if (field.key === "objectType" || field.key === "organization") return null

        const isNumber = field.type === "number" || field.type === "currency"
        const isTextArea = field.type === "textarea"
        const isDateField = field.type === "date"
        const inputType = field.type === "currency" ? "number" : 
                         field.type === "number" ? "number" :
                         isDateField ? "date" : "text"

        const label = field.label
        const Component = isTextArea ? "textarea" : "input"

        return (
            <div key={field.key} style={{ marginBottom: "16px", width: "100%" }}>
                <label htmlFor={field.key} style={{
                    ...styles.label,
                    fontWeight: field.required ? "600" : "400",
                    color: field.required ? colors.gray900 : colors.gray700,
                }}>
                    {label}
                    {field.required && <span style={{ color: colors.error, marginLeft: "4px" }}>*</span>}
                </label>
                <Component
                    id={field.key}
                    name={field.key}
                    value={val === null || val === undefined ? "" : val}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required={field.required}
                    {...(Component === "input" ? { 
                        type: inputType,
                        ...(field.type === "currency" && { step: "0.01", min: "0" }),
                        ...(field.type === "number" && { step: "1", min: "0" })
                    } : { rows: 3 })}
                    placeholder={`Voer ${label.toLowerCase()} in${field.required ? ' (verplicht)' : ''}`}
                    style={{
                        ...styles.input,
                        backgroundColor: isSubmitting ? colors.gray50 : colors.white,
                        cursor: isSubmitting ? "not-allowed" : "text",
                        borderColor: field.required ? colors.gray300 : colors.gray200,
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
            </div>
        )
    }

    // Show loading state while fetching configuration
    if (isLoadingConfig) {
        return (
            <div
                style={{
                    ...styles.modal,
                    width: "min(90vw, 400px)",
                    padding: "32px",
                    textAlign: "center",
                }}
            >
                <div style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "500" }}>
                    Formulierconfiguratie laden...
                </div>
                <div
                    style={{
                        ...styles.spinner,
                        display: "inline-block",
                        width: "20px",
                        height: "20px",
                        border: `2px solid ${colors.gray100}`,
                        borderTop: `2px solid ${colors.primary}`,
                    }}
                />
            </div>
        )
    }

    const IconComponent = config.icon
    const fieldsToRender = getFieldsFromSchema(schema, objectType)

    return (
        <div
            style={{
                ...styles.modal,
                width: "min(90vw, 800px)",
                maxHeight: "90vh",
                padding: "32px",
            }}
        >
            {/* Header */}
            <div style={styles.header}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                        onClick={onBack}
                        style={{
                            ...styles.iconButton,
                            marginRight: "12px",
                        }}
                        onMouseOver={(e) => hover.iconButton(e.target as HTMLElement)}
                        onMouseOut={(e) => hover.resetIconButton(e.target as HTMLElement)}
                    >
                        <FaArrowLeft size={16} />
                    </button>
                    <IconComponent size={24} color={config.color} />
                    <div style={{ ...styles.title, marginLeft: "12px" }}>
                        Nieuwe {config.label} Toevoegen
                    </div>
                </div>
                <button
                    onClick={onClose}
                    style={styles.iconButton}
                    onMouseOver={(e) => hover.iconButton(e.target as HTMLElement)}
                    onMouseOut={(e) => hover.resetIconButton(e.target as HTMLElement)}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Error Display */}
            {error && <div style={styles.errorAlert}>{error}</div>}

            {/* Success Display */}
            {success && <div style={styles.successAlert}>{success}</div>}

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
                <div style={{ ...styles.buttonGroup, marginTop: "24px" }}>
                    <button
                        type="button"
                        onClick={onBack}
                        disabled={isSubmitting}
                        style={{
                            ...styles.secondaryButton,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                hover.secondaryButton(e.target as HTMLElement)
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) {
                                hover.resetSecondaryButton(e.target as HTMLElement)
                            }
                        }}
                    >
                        Terug
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: isSubmitting ? colors.disabled : config.color,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = `${config.color}dd`
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = config.color
                            }
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <div style={styles.spinner} />
                                Verzenden...
                            </>
                        ) : (
                            <>
                                <FaPlus size={12} />
                                {config.label} Toevoegen
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}

// ——— Main modal that orchestrates the entire create flow ———
function CreateObjectModal({ onClose }: { onClose: () => void }) {
    const [currentStep, setCurrentStep] = React.useState<'organization' | 'objectType' | 'form'>('organization')
    const [selectedOrganization, setSelectedOrganization] = React.useState<string>("")
    const [selectedObjectType, setSelectedObjectType] = React.useState<ObjectType | null>(null)
    const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null)
    const [availableOrganizations, setAvailableOrganizations] = React.useState<string[]>([])
    const [isLoading, setIsLoading] = React.useState(true)

    // Load user info and organizations on component mount
    React.useEffect(() => {
        const loadUserData = async () => {
            try {
                setIsLoading(true)
                const currentUser = getCurrentUserInfoForCreate()
                if (!currentUser) throw new Error("No user info available")

                // Fetch complete user info from backend
                const completeUserInfo = await fetchUserInfo(currentUser.sub)
                if (!completeUserInfo) throw new Error("Failed to fetch user details")

                setUserInfo(completeUserInfo)

                // Fetch available organizations for this user
                const orgs = await fetchUserOrganizationsForCreate(completeUserInfo)
                setAvailableOrganizations(orgs)

                // If user has only one organization, auto-select it
                if (orgs.length === 1) {
                    setSelectedOrganization(orgs[0])
                    setCurrentStep('objectType')
                }
            } catch (error) {
                console.error("Failed to load user data:", error)
                // Handle error - could show error message or close modal
            } finally {
                setIsLoading(false)
            }
        }

        loadUserData()
    }, [])

    const handleOrganizationSelect = (org: string) => {
        setSelectedOrganization(org)
        setCurrentStep('objectType')
    }

    const handleObjectTypeSelect = (type: ObjectType) => {
        setSelectedObjectType(type)
        setCurrentStep('form')
    }

    const handleBackToObjectType = () => {
        setCurrentStep('objectType')
        setSelectedObjectType(null)
    }

    const handleBackToOrganization = () => {
        setCurrentStep('organization')
        setSelectedOrganization("")
    }

    const handleSuccess = () => {
        // Optionally trigger a refresh of the list
        window.location.reload()
    }

    // Show loading state
    if (isLoading || !userInfo) {
        return (
            <div style={{
                ...styles.modal,
                width: "min(90vw, 400px)",
                padding: "32px",
                textAlign: "center",
            }}>
                <div style={styles.title}>Loading...</div>
            </div>
        )
    }

    return (
        <>
            {currentStep === 'organization' && (
                <OrganizationSelector
                    userInfo={userInfo}
                    availableOrganizations={availableOrganizations}
                    onSelect={handleOrganizationSelect}
                    onClose={onClose}
                    onBack={() => onClose()} // Close modal if going back from organization step
                />
            )}

            {currentStep === 'objectType' && (
                <ObjectTypeSelector
                    onSelect={handleObjectTypeSelect}
                    onClose={onClose}
                    onBack={handleBackToOrganization}
                />
            )}

            {currentStep === 'form' && selectedObjectType && (
                <InsuredObjectForm
                    objectType={selectedObjectType}
                    selectedOrganization={selectedOrganization}
                    onClose={onClose}
                    onBack={handleBackToObjectType}
                    onSuccess={handleSuccess}
                />
            )}
        </>
    )
}

// ——— Status color mapping ———
const STATUS_COLORS = {
    Insured: { bg: "#dcfce7", text: "#166534" },
    Pending: { bg: "#fef3c7", text: "#92400e" },
    Rejected: { bg: "#fee2e2", text: "#991b1b" },
    "Not Insured": { bg: "#f3f4f6", text: "#374151" },
}

// ——— User Role Detection ———
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    organization?: string
    organizations?: string[]
}

// Form state for creating insured objects (Dutch field names)
type InsuredObjectFormState = {
    objectType: ObjectType
    waarde: number
    organization: string
    ingangsdatum: string
    premiepromillage: number
    eigenRisico: number
    uitgangsdatum?: string
    notitie?: string
    
    // Boat-specific fields
    ligplaats?: string
    aantalMotoren?: number
    typeMerkMotor?: string
    merkBoot?: string
    typeBoot?: string
    bouwjaar?: number
    aantalVerzekerdeDagen?: number
    totalePremieOverHetJaar?: number
    totalePremieOverDeVerzekerdePeriode?: number
    bootnummer?: string
    motornummer?: string
    cinNummer?: string
    
    // Trailer-specific fields
    trailerRegistratienummer?: string
    
    // Motor-specific fields
    motorMerk?: string
    motorSerienummer?: string
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

// Helper functions for create form
function getCurrentUserInfoForCreate(): UserInfo | null {
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
        console.error("Failed to decode token:", error)
        return null
    }
}

async function fetchUserOrganizationsForCreate(userInfo: UserInfo): Promise<string[]> {
    try {
        const token = getIdToken()
        if (!token) return []

        // Admin can see all organizations
        if (userInfo.role === "admin") {
            const res = await fetch(`${API_BASE_URL}${API_PATHS.ORGANIZATION}`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            })
            if (!res.ok) return []
            const data = await res.json()
            return (data.organizations || []).map((org: any) => org.name)
        }

        // Non-admin users can only see their organizations
        const userOrgs: string[] = []
        if (userInfo.organization) userOrgs.push(userInfo.organization)
        if (userInfo.organizations) userOrgs.push(...userInfo.organizations)
        return [...new Set(userOrgs)] // Remove duplicates
    } catch (error) {
        console.error("Failed to fetch organizations:", error)
        return []
    }
}

function getDefaultFormState(objectType: ObjectType): InsuredObjectFormState {
    const baseState: InsuredObjectFormState = {
        objectType,
        waarde: 0,
        organization: "",
        ingangsdatum: "",
        premiepromillage: 0,
        eigenRisico: 0,
        uitgangsdatum: "",
        notitie: "",
    }

    // Add type-specific defaults
    switch (objectType) {
        case "boat":
            return {
                ...baseState,
                ligplaats: "",
                aantalMotoren: 1,
                typeMerkMotor: "",
                merkBoot: "",
                typeBoot: "",
                bouwjaar: new Date().getFullYear(),
                aantalVerzekerdeDagen: 365,
                totalePremieOverHetJaar: 0,
                totalePremieOverDeVerzekerdePeriode: 0,
                bootnummer: "",
                motornummer: "",
                cinNummer: "",
            }
        case "trailer":
            return {
                ...baseState,
                trailerRegistratienummer: "",
            }
        case "motor":
            return {
                ...baseState,
                motorMerk: "",
                motorSerienummer: "",
            }
        default:
            return baseState
    }
}

function getFieldsFromSchema(schema: FieldSchema[] | null, objectType: ObjectType): FieldSchema[] {
    if (!schema) {
        // Fallback to minimal required fields
        const commonFields: Partial<FieldSchema>[] = [
            { key: "waarde", label: "Waarde", type: "currency", required: true, visible: true },
            { key: "ingangsdatum", label: "Ingangsdatum", type: "date", required: false, visible: true },
            { key: "notitie", label: "Notitie", type: "textarea", required: false, visible: true },
        ]

        let typeSpecificFields: Partial<FieldSchema>[] = []
        switch (objectType) {
            case "boat":
                typeSpecificFields = [
                    { key: "merkBoot", label: "Merk Boot", type: "text", required: true, visible: true },
                    { key: "typeBoot", label: "Type Boot", type: "text", required: true, visible: true },
                ]
                break
            case "trailer":
                typeSpecificFields = [
                    { key: "trailerRegistratienummer", label: "Chassisnummer", type: "text", required: true, visible: true },
                ]
                break
            case "motor":
                typeSpecificFields = [
                    { key: "motorMerk", label: "Motor Merk", type: "text", required: true, visible: true },
                    { key: "motorSerienummer", label: "Motor Nummer", type: "text", required: true, visible: true },
                ]
                break
        }

        return [...typeSpecificFields, ...commonFields] as FieldSchema[]
    }

    // Filter fields for the specific object type and only show visible ones
    return schema.filter(field => {
        // Always show common fields (no objectTypes specified)
        if (!field.objectTypes || field.objectTypes.length === 0) {
            return field.visible
        }
        // Show fields specific to this object type
        return field.objectTypes.includes(objectType) && field.visible
    })
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
    status: "Insured" | "Pending" | "Rejected"
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
}

// Dynamic interface that allows for flexible field access
interface InsuredObject extends BaseInsuredObject {
    // Allow any additional fields from dynamic schema
    [key: string]: any
    
    // Common optional fields (for backwards compatibility)
    // Boat-specific fields (Dutch names)
    ligplaats?: string // mooringLocation
    merkBoot?: string // boatBrand
    typeBoot?: string // boatType
    aantalMotoren?: number // numberOfEngines
    typeMerkMotor?: string // engineType
    bouwjaar?: number // yearOfConstruction
    bootnummer?: string // boatNumber
    motornummer?: string // engineNumber
    cinNummer?: string // cinNumber

    // Trailer-specific fields (Dutch names)
    trailerMerk?: string
    trailerType?: string
    trailerGewicht?: number
    trailerCapaciteit?: number
    trailerAssen?: number
    trailerKenteken?: string
    trailerRegistratienummer?: string

    // Motor-specific fields (Dutch names)
    motorMerk?: string
    motorModel?: string
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
const COLUMN_GROUPS = {
    essential: { label: "Essentieel", color: "#059669" },
    identity: { label: "Identiteit", color: "#3b82f6" },
    technical: { label: "Technisch", color: "#8b5cf6" },
    financial: { label: "Financieel", color: "#f59e0b" },
    dates: { label: "Data", color: "#ef4444" },
    metadata: { label: "Metadata", color: "#6b7280" },
}

// Dynamic schema system now handles column definitions

// Helper function to render cell values using dynamic schema
function renderObjectCellValue(
    column: FieldSchema | { key: string; label: string },
    value: any
): string {
    if (value === null || value === undefined) return "-"

    // Use schema type information if available
    if ('type' in column) {
        const fieldSchema = column as FieldSchema
        
        switch (fieldSchema.type) {
            case "currency":
                return `€${Number(value).toLocaleString()}`
            case "number":
                return value ? String(value) : "-"
            case "date":
                if (!value) return "-"
                return new Date(value).toLocaleDateString()
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
                return `€${Number(value).toLocaleString()}`
            case "premiepromillage": // premiumPerMille
                return `${Number(value).toFixed(1)}‰`
            case "ingangsdatum": // insuranceStartDate
            case "uitgangsdatum": // insuranceEndDate
            case "createdAt":
                if (!value) return "-"
                return new Date(value).toLocaleDateString()
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

// Filter function for objects
function filterObjects(
    objects: InsuredObject[],
    searchTerm: string,
    selectedOrganizations: Set<string>,
    organizations: string[],
    selectedObjectTypes: Set<ObjectType>,
    isAdminUser: boolean = false,
    currentOrganization?: string | null
): InsuredObject[] {
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

        // Object type filter
        if (selectedObjectTypes.size > 0 && selectedObjectTypes.size < 4) {
            if (!selectedObjectTypes.has(object.objectType)) {
                return false
            }
        }

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

function isAdmin(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "admin"
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
    selectedObjectTypes,
    onObjectTypeChange,
    showOrgFilter = true,
    userInfo,
    columns,
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    visibleColumns: Set<string>
    onToggleColumn: (column: string) => void
    organizations: string[]
    selectedOrganizations: Set<string>
    onOrganizationChange: (org: string) => void
    selectedObjectTypes: Set<ObjectType>
    onObjectTypeChange: (objectType: ObjectType) => void
    showOrgFilter?: boolean
    userInfo: UserInfo | null
    columns: FieldSchema[]
}) {
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [showOrgFilterDropdown, setShowOrgFilterDropdown] = useState(false)
    const [showObjectTypeFilterDropdown, setShowObjectTypeFilterDropdown] =
        useState(false)
    const [columnButtonRef, setColumnButtonRef] =
        useState<HTMLButtonElement | null>(null)
    const [orgButtonRef, setOrgButtonRef] = useState<HTMLButtonElement | null>(
        null
    )
    const [objectTypeButtonRef, setObjectTypeButtonRef] =
        useState<HTMLButtonElement | null>(null)
    const [columnDropdownPosition, setColumnDropdownPosition] = useState({
        top: 0,
        right: 0,
    })
    const [orgDropdownPosition, setOrgDropdownPosition] = useState({
        top: 0,
        right: 0,
    })
    const [objectTypeDropdownPosition, setObjectTypeDropdownPosition] =
        useState({ top: 0, right: 0 })

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

    useEffect(() => {
        if (objectTypeButtonRef && showObjectTypeFilterDropdown) {
            const rect = objectTypeButtonRef.getBoundingClientRect()
            setObjectTypeDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [objectTypeButtonRef, showObjectTypeFilterDropdown])

    const toggleGroup = (groupKey: keyof typeof COLUMN_GROUPS) => {
        const groupColumns = columns.filter((col) => col.group === groupKey)
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

                <div style={{ position: "relative" }}>
                    <button
                        ref={setObjectTypeButtonRef}
                        onClick={() =>
                            setShowObjectTypeFilterDropdown(
                                !showObjectTypeFilterDropdown
                            )
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
                        <FaBox size={14} />
                        Object Typen ({selectedObjectTypes.size})
                    </button>
                </div>

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
                                right: `${orgDropdownPosition.right}px`,
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

            {/* Object Type Filter Dropdown */}
            {showObjectTypeFilterDropdown &&
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
                            onClick={() =>
                                setShowObjectTypeFilterDropdown(false)
                            }
                        />
                        <div
                            style={{
                                position: "fixed",
                                top: `${objectTypeDropdownPosition.top}px`,
                                right: `${objectTypeDropdownPosition.right}px`,
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
                                        const allObjectTypes: ObjectType[] = [
                                            "boat",
                                            "trailer",
                                            "motor",
                                        ]
                                        if (
                                            selectedObjectTypes.size ===
                                            allObjectTypes.length
                                        ) {
                                            allObjectTypes.forEach(
                                                onObjectTypeChange
                                            )
                                        } else {
                                            allObjectTypes.forEach((type) => {
                                                if (
                                                    !selectedObjectTypes.has(
                                                        type
                                                    )
                                                ) {
                                                    onObjectTypeChange(type)
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
                                    {selectedObjectTypes.size === 3
                                        ? "Alles Deselecteren"
                                        : "Alles Selecteren"}
                                </button>
                            </div>
                            {(["boat", "trailer", "motor"] as ObjectType[]).map(
                                (objectType) => {
                                    const config =
                                        OBJECT_TYPE_CONFIG[objectType]
                                    const IconComponent = config.icon
                                    return (
                                        <label
                                            key={objectType}
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
                                                checked={selectedObjectTypes.has(
                                                    objectType
                                                )}
                                                onChange={() =>
                                                    onObjectTypeChange(
                                                        objectType
                                                    )
                                                }
                                                style={{ marginRight: "8px" }}
                                            />
                                            <IconComponent
                                                size={16}
                                                color={config.color}
                                                style={{ marginRight: "8px" }}
                                            />
                                            {config.label}
                                        </label>
                                    )
                                }
                            )}
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
                                padding: "12px",
                                minWidth: "250px",
                                maxHeight: "400px",
                                overflowY: "auto",
                                zIndex: 1000,
                                fontFamily: FONT_STACK,
                            }}
                        >
                            <div style={{ marginBottom: "12px" }}>
                                <button
                                    onClick={() => {
                                        columns.filter(
                                            (col) => col.group !== "essential"
                                        ).forEach((col) => {
                                            if (visibleColumns.has(col.key)) {
                                                onToggleColumn(col.key)
                                            }
                                        })
                                        columns.filter(
                                            (col) => col.group === "essential"
                                        ).forEach((col) => {
                                            if (!visibleColumns.has(col.key)) {
                                                onToggleColumn(col.key)
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
                                    Reset naar Essentieel
                                </button>
                            </div>

                            {Object.entries(COLUMN_GROUPS).map(
                                ([groupKey, group]) => {
                                    const groupColumns = columns.filter(
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
                                                    color: group.color,
                                                    borderRadius: "6px",
                                                    marginBottom: "8px",
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <span>{group.label}</span>
                                                <button
                                                    onClick={() =>
                                                        toggleGroup(
                                                            groupKey as keyof typeof COLUMN_GROUPS
                                                        )
                                                    }
                                                    style={{
                                                        fontSize: "10px",
                                                        padding: "2px 6px",
                                                        backgroundColor:
                                                            group.color,
                                                        color: "white",
                                                        border: "none",
                                                        borderRadius: "4px",
                                                        cursor: "pointer",
                                                    }}
                                                >
                                                    {visibleInGroup}/
                                                    {groupColumns.length}
                                                </button>
                                            </div>
                                            <div
                                                style={{ marginBottom: "16px" }}
                                            >
                                                {groupColumns.map((col) => (
                                                    <label
                                                        key={col.key}
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
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
                                                                onToggleColumn(
                                                                    col.key
                                                                )
                                                            }
                                                            style={{
                                                                marginRight:
                                                                    "8px",
                                                            }}
                                                        />
                                                        {col.label}
                                                    </label>
                                                ))}
                                            </div>
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

// General Action buttons for object table rows
function GeneralActionButtons({
    object,
    onEdit,
    onDelete,
}: {
    object: InsuredObject
    onEdit: (object: InsuredObject) => void
    onDelete: (object: InsuredObject) => void
}) {
    return (
        <div
            style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                alignItems: "center",
            }}
        >
            <button
                onClick={() => onEdit(object)}
                style={{
                    ...styles.primaryButton,
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                }}
                onMouseOver={(e) =>
                    hover.primaryButton(e.target as HTMLElement)
                }
                onMouseOut={(e) =>
                    hover.resetPrimaryButton(e.target as HTMLElement)
                }
            >
                <FaEdit size={10} /> Bewerken
            </button>
            <button
                onClick={() => onDelete(object)}
                style={{
                    ...styles.primaryButton,
                    padding: "6px 12px",
                    fontSize: 12,
                    borderRadius: 6,
                    backgroundColor: colors.error,
                    display: "flex",
                    alignItems: "center",
                    gap: "4px",
                }}
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = "#dc2626"
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = colors.error
                }}
            >
                <FaTrashAlt size={10} /> Verwijderen
            </button>
        </div>
    )
}

// Status Action buttons for admin-only approval/decline actions
function StatusActionButtons({
    object,
    onApprove,
    onDecline,
}: {
    object: InsuredObject
    onApprove: (object: InsuredObject) => void
    onDecline: (object: InsuredObject) => void
}) {
    if (object.status !== "Pending") return null

    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
                alignItems: "center",
            }}
        >
            <button
                onClick={() => onApprove(object)}
                style={{
                    ...styles.iconButton,
                    backgroundColor: colors.success,
                    color: colors.white,
                }}
                title="Approve"
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = `${colors.success}dd`
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = colors.success
                }}
            >
                <FaCheck size={12} />
            </button>
            <button
                onClick={() => onDecline(object)}
                style={{
                    ...styles.iconButton,
                    backgroundColor: colors.error,
                    color: colors.white,
                }}
                title="Decline"
                onMouseOver={(e) => {
                    e.target.style.backgroundColor = `${colors.error}dd`
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = colors.error
                }}
            >
                <FaTimes size={12} />
            </button>
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
    const objectTypeName =
        OBJECT_TYPE_CONFIG[object.objectType].label.toLowerCase()

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
                {OBJECT_TYPE_CONFIG[object.objectType].label} Verwijderen
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
}: {
    object: InsuredObject
    onClose: () => void
    onSuccess: () => void
    schema: FieldSchema[]
}) {
    const config = OBJECT_TYPE_CONFIG[object.objectType]
    const [form, setForm] = useState<InsuredObject>(object)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isLoadingConfig, setIsLoadingConfig] = useState<boolean>(config.useOrgConfig)
    const [orgConfig, setOrgConfig] = useState<Record<string, any> | null>(null)

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
                return data.organization.boat_fields_config
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
            if (!config.useOrgConfig) {
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
    }, [config.useOrgConfig, object.organization])

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value, type } = e.target
        setError(null)
        setSuccess(null)
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
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}/${object.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                    body: JSON.stringify(form),
                }
            )

            if (!res.ok) {
                const data = await res.json()
                throw new Error(
                    data.message ||
                        `Failed to update: ${res.status} ${res.statusText}`
                )
            }

            setSuccess(`${config.label} succesvol bijgewerkt!`)

            // Auto-close after success
            setTimeout(() => {
                onSuccess()
                onClose()
            }, 1500)
        } catch (err: any) {
            setError(err.message || "Kon object niet bijwerken")
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderInput = (key: string) => {
        const val = form[key]

        // Get field schema information
        const fieldSchema = schema?.find(field => field.key === key)
        
        // Skip system fields that shouldn't be edited
        if (
            key === "objectType" ||
            key === "organization" ||
            key === "id" ||
            key === "status" ||
            key === "createdAt" ||
            key === "updatedAt" ||
            key === "lastUpdatedBy"
        )
            return null

        // Use schema type information if available, otherwise fall back to legacy logic
        let inputType = "text"
        let isTextArea = false
        let isRequired = false
        let label = key

        if (fieldSchema) {
            // Use schema information
            label = fieldSchema.label
            isRequired = fieldSchema.required
            isTextArea = fieldSchema.type === "textarea"
            
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
                "premiepromillage",
                "eigenRisico",
            ]
            const typeSpecificRequired = {
                trailer: ["trailerBrand", "trailerType"],
                motor: ["motorBrand", "motorModel"],
                boat: [],
            }
            isRequired =
                commonRequired.includes(key) ||
                (typeSpecificRequired[object.objectType] || []).includes(key)
                
            label = formatLabel(key)
        }
        const Component = isTextArea ? "textarea" : "input"

        return (
            <div key={key} style={{ marginBottom: "16px", width: "100%" }}>
                <label htmlFor={key} style={styles.label}>
                    {label}
                    {isRequired && (
                        <span style={{ color: colors.error }}> *</span>
                    )}
                </label>
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
    const fieldsToRender = getSchemaFieldsForObjectType(schema, object.objectType)
        .filter(field => field.visible) // Only show visible fields
        .map(field => field.key)

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
                Gelukt
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
                Fout
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
    
    // Dynamic schema hook
    const { schema, loading: schemaLoading, error: schemaError } = useDynamicSchema(currentOrganization || undefined)
    
    // Use dynamic schema or fallback to default
    const COLUMNS = schema || DEFAULT_SCHEMA
    
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
    
    // Update visible columns when schema changes
    useEffect(() => {
        if (COLUMNS.length > 0) {
            setVisibleColumns(
                new Set(
                    COLUMNS.filter((col) => col.group === "essential").map(
                        (col) => col.key
                    )
                )
            )
        }
    }, [COLUMNS])
    const [organizations, setOrganizations] = useState<string[]>([])
    const [selectedOrganizations, setSelectedOrganizations] = useState<
        Set<string>
    >(new Set())
    const [selectedObjectTypes, setSelectedObjectTypes] = useState<
        Set<ObjectType>
    >(new Set(["boat", "trailer", "motor"]))
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

    const toggleOrganization = (org: string) => {
        const newSelected = new Set(selectedOrganizations)
        if (newSelected.has(org)) {
            newSelected.delete(org)
        } else {
            newSelected.add(org)
        }
        setSelectedOrganizations(newSelected)
    }

    const toggleObjectType = (objectType: ObjectType) => {
        const newSelected = new Set(selectedObjectTypes)
        if (newSelected.has(objectType)) {
            newSelected.delete(objectType)
        } else {
            newSelected.add(objectType)
        }
        setSelectedObjectTypes(newSelected)
    }

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
            const objectsList = Array.isArray(data) ? data : data.items || []
            console.log(`Setting objects: ${objectsList.length} items`)
            setObjects(objectsList)
        } catch (err: any) {
            console.error("Error in fetchObjects:", err)
            throw new Error(err.message || "Failed to fetch insured objects")
        }
    }

    // Role-aware filtering with organization-specific context
    const filteredObjects = objects
        ? filterObjects(
              objects,
              searchTerm,
              selectedOrganizations,
              organizations,
              selectedObjectTypes,
              isAdmin(userInfo),
              currentOrganization // Pass current organization for filtering
          )
        : []

    const getVisibleColumnsList = () => {
        return COLUMNS.filter((col) => visibleColumns.has(col.key))
    }

    const visibleColumnsList = getVisibleColumnsList()

    // Action handlers
    const handleEdit = useCallback((object: InsuredObject) => {
        setEditingObject(object)
    }, [])

    const handleDelete = useCallback((object: InsuredObject) => {
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
            setSuccessMessage(
                `${OBJECT_TYPE_CONFIG[deletingObject.objectType].label} deleted successfully!`
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

    if (isLoading || schemaLoading) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <div style={styles.spinner} />
                <div style={{ marginTop: "16px", color: colors.gray600 }}>
                    {schemaLoading ? "Loading schema configuration..." : "Loading insured objects..."}
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

    return (
        <div style={{ padding: "24px", backgroundColor: "#f8fafc", minHeight: "100vh", fontFamily: FONT_STACK }}>
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
                            e.target.style.backgroundColor = "#e5e7eb"
                        }}
                        onMouseOut={(e) => {
                            e.target.style.backgroundColor = "#f3f4f6"
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
                    currentOrganization={currentOrganization}
                    showCurrentOrg={!!currentOrganization}
                />
            </div>

            <div
                style={{
                    backgroundColor: "#fff",
                    borderRadius: "12px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                    overflow: "hidden",
                }}
            >
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
                                gap: "8px",
                            }}
                        >
                            {userRole === "admin" && (
                                <FaUserShield size={20} color={colors.primary} />
                            )}
                            {userRole === "editor" && (
                                <FaUserEdit size={20} color={colors.secondary} />
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
                            <CreateObjectButton onCreateClick={() => setShowCreateForm(true)} />
                        </div>
                    </div>

                    <SearchAndFilterBar
                        searchTerm={searchTerm}
                        onSearchChange={setSearchTerm}
                        visibleColumns={visibleColumns}
                        onToggleColumn={toggleColumn}
                        organizations={organizations}
                        selectedOrganizations={selectedOrganizations}
                        onOrganizationChange={toggleOrganization}
                        selectedObjectTypes={selectedObjectTypes}
                        onObjectTypeChange={toggleObjectType}
                        showOrgFilter={
                            isAdmin(userInfo) && !currentOrganization
                        }
                        userInfo={userInfo}
                        columns={COLUMNS}
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
                                {/* Actions Column */}
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

                                {/* Status Actions Column (Admin only) */}
                                {isAdmin(userInfo) && (
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
                                        Status
                                    </th>
                                )}

                                {/* Dynamic columns */}
                                {visibleColumnsList.map((col) => (
                                    <th
                                        key={col.key}
                                        style={{
                                            padding: "12px 8px",
                                            textAlign: "left",
                                            borderBottom: "2px solid #e2e8f0",
                                            fontWeight: "600",
                                            color: "#475569",
                                            fontSize: "13px",
                                            cursor: col.sortable
                                                ? "pointer"
                                                : "default",
                                            width: col.width,
                                        }}
                                        onClick={() =>
                                            col.sortable &&
                                            console.log("Sort by", col.key)
                                        }
                                    >
                                        {col.label}
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
                                            index % 2 === 0
                                                ? "#ffffff"
                                                : "#f8fafc",
                                        transition: "background-color 0.2s",
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
                                    {/* Actions cell */}
                                    <td
                                        style={{
                                            padding: "12px 8px",
                                            borderBottom: "1px solid #f1f5f9",
                                            whiteSpace: "nowrap",
                                        }}
                                    >
                                        <GeneralActionButtons
                                            object={object}
                                            onEdit={handleEdit}
                                            onDelete={handleDelete}
                                        />
                                    </td>

                                    {/* Status Actions cell (Admin only) */}
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
                                                object={object}
                                                onApprove={handleApprove}
                                                onDecline={handleDecline}
                                            />
                                        </td>
                                    )}

                                    {/* Dynamic data cells */}
                                    {visibleColumnsList.map((col) => {
                                        // Special handling for objectType column to show icon + label
                                        if (col.key === "objectType") {
                                            const config =
                                                OBJECT_TYPE_CONFIG[
                                                    object.objectType
                                                ]
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
                                            const statusColor =
                                                STATUS_COLORS[object.status] ||
                                                STATUS_COLORS["Not Insured"]
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
                                                            padding: "4px 8px",
                                                            borderRadius:
                                                                "12px",
                                                            fontSize: "12px",
                                                            fontWeight: "500",
                                                            backgroundColor:
                                                                statusColor.bg,
                                                            color: statusColor.text,
                                                            display:
                                                                "inline-block",
                                                        }}
                                                    >
                                                        {object.status}
                                                    </div>
                                                </td>
                                            )
                                        }

                                        // Regular cell rendering
                                        const cellValue =
                                            object[
                                                col.key as keyof InsuredObject
                                            ]
                                        const displayValue =
                                            renderObjectCellValue(
                                                col,
                                                cellValue
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
                                                    wordBreak: "break-word",
                                                    whiteSpace: "normal",
                                                }}
                                                title={String(cellValue ?? "-")}
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
                                setSuccessMessage(
                                    `${OBJECT_TYPE_CONFIG[editingObject.objectType].label} updated successfully!`
                                )
                            }}
                            schema={COLUMNS}
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
                />
            )}
            </div>
    )
}

// Export Override
export function InsuredObjectListApp(): Override {
    return {
        children: <InsuredObjectList />,
    }
}
