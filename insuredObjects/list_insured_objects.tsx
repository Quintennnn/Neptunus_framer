// src/InsuredObjectListOverride.tsx (Role-aware insured object management system)
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override } from "framer"
import { useState, useEffect, useCallback } from "react"
import { UserInfoBanner } from "../components/UserInfoBanner.tsx"
import { UserInfo as RBACUserInfo, hasPermission } from "../Rbac"
import { colors, styles, hover, FONT_STACK } from "../theme"
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
    FaPrint,
} from "react-icons/fa"
import { colors, styles, hover, FONT_STACK } from "../Theme"
import { API_BASE_URL, API_PATHS, getIdToken, formatErrorMessage, formatSuccessMessage } from "../Utils"
import { ObjectType, OBJECT_TYPE_CONFIG, OrganizationSelector, ObjectTypeSelector, CreateObjectModal } from "./create_insured_object"
import { useDynamicSchema, FieldSchema, getFieldsForObjectType as getSchemaFieldsForObjectType, getFieldKeysForObjectType, getUserInputFieldsForObjectType } from "../hooks/UseDynamicSchema"


// Note: Unified field system removed - using direct field names from registry

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

// ——— Print Overview Button Component ———
function PrintOverviewButton({ onPrintClick }: { onPrintClick: () => void }) {
    return (
        <button
            onClick={onPrintClick}
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
            <FaPrint size={12} />
            Print overzicht
        </button>
    )
}





// Note: InsuredObjectForm is now imported from create_insured_object.tsx

// Legacy function - kept for backward compatibility but should be removed
function InsuredObjectForm_LEGACY({
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
    const [form, setForm] = React.useState<InsuredObjectFormState_LEGACY>(() => {
        const defaultState = getDefaultFormState_LEGACY(objectType)
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

    // Note: Organization defaults (premiepromillage, eigenRisico) are now applied by backend automatically

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
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
        const val = form[field.key as keyof InsuredObjectFormState_LEGACY]

        // Skip objectType, organization, and status fields (handled automatically)
        if (field.key === "objectType" || field.key === "organization" || field.key === "status") return null

        const isNumber = field.type === "number" || field.type === "currency"
        const isTextArea = field.type === "textarea"
        const isDateField = field.type === "date"
        const isDropdown = field.type === "dropdown"
        const inputType = field.type === "currency" ? "number" : 
                         field.type === "number" ? "number" :
                         isDateField ? "date" : "text"

        const label = field.label
        const Component = isDropdown ? "select" : isTextArea ? "textarea" : "input"

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
                {isDropdown ? (
                    <select
                        id={field.key}
                        name={field.key}
                        value={val === null || val === undefined ? "" : val}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        required={field.required}
                        style={{
                            ...styles.input,
                            backgroundColor: isSubmitting ? colors.gray50 : colors.white,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
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
                    >
                        <option value="">Selecteer {label.toLowerCase()}</option>
                        {field.options?.map((option) => (
                            <option key={option} value={option}>
                                {option}
                            </option>
                        ))}
                    </select>
                ) : (
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
                )}
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

// Note: CreateObjectModal is now imported from create_insured_object.tsx

// Legacy function - kept for backward compatibility but should be removed  
function CreateObjectModal_LEGACY({ onClose, onOrganizationSelect }: { onClose: () => void; onOrganizationSelect?: (org: string) => void }) {
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
                const currentUser = getCurrentUserInfoForCreate_LEGACY()
                if (!currentUser) throw new Error("No user info available")

                // Fetch complete user info from backend
                const completeUserInfo = await fetchUserInfo(currentUser.sub)
                if (!completeUserInfo) throw new Error("Failed to fetch user details")

                setUserInfo(completeUserInfo)

                // Fetch available organizations for this user
                const orgs = await fetchUserOrganizationsForCreate_LEGACY(completeUserInfo)
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
        onOrganizationSelect?.(org) // Notify parent component of organization change
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
                <InsuredObjectForm_LEGACY
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
    OutOfPolicy: { bg: "#f3f4f6", text: "#6b7280" }, // Grey/faded for sold boats
    "Not Insured": { bg: "#f3f4f6", text: "#374151" },
}

// ——— Status translation mapping ———
const STATUS_TRANSLATIONS = {
    Insured: "Verzekerd",
    Pending: "In behandeling",
    Rejected: "Afgewezen",
    OutOfPolicy: "Buiten polis",
    "Not Insured": "Niet verzekerd",
}

// ——— Simple Tooltip Component ———
function StatusTooltip({ 
    children, 
    tooltip, 
    show 
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
    const statusColor = STATUS_COLORS[object.status] || STATUS_COLORS["Not Insured"]

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
            {/* Status Badge with Decline Reason */}
            <StatusTooltip
                show={object.status === "Rejected" && !!object.declineReason}
                tooltip={object.declineReason || ""}
            >
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
                        border: object.status === "OutOfPolicy" ? "1px solid #9ca3af" : "none",
                    }}
                >
                    {STATUS_TRANSLATIONS[object.status] || object.status}
                    {object.status === "Rejected" && object.declineReason && (
                        <FaInfoCircle 
                            size={10} 
                            style={{ 
                                opacity: 0.8,
                                cursor: "help"
                            }} 
                        />
                    )}
                </div>
            </StatusTooltip>
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

// Note: InsuredObjectFormState type is now imported from create_insured_object.tsx
// Legacy type definition - should be removed
type InsuredObjectFormState_LEGACY = {
    objectType: ObjectType
    waarde: number
    organization: string
    ingangsdatum: string
    premiepromillage: number
    eigenRisico: number
    uitgangsdatum?: string
    notitie?: string
    
    // Boat-specific fields (registry field names)
    ligplaats?: string
    aantalMotoren?: number
    typeMotor?: string // Updated from typeMerkMotor
    merkMotor?: string // New field
    merkBoot?: string
    typeBoot?: string
    bouwjaar?: number
    aantalVerzekerdeDagen?: number
    totalePremieOverHetJaar?: number
    totalePremieOverDeVerzekerdePeriode?: number
    bootnummer?: string
    motornummer?: string
    cinNummer?: string
    
    // Trailer-specific fields (registry field names)
    chassisnummer?: string // Updated from trailerRegistratienummer
    
    // Motor fields shared with boats
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

// Fetch broker info from policies for the organization
async function fetchBrokerInfoForOrganization(organizationName: string): Promise<BrokerInfo | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        // Fetch policies for this organization
        const res = await fetch(`${API_BASE_URL}${API_PATHS.POLICY}?organization=${encodeURIComponent(organizationName)}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) {
            console.warn(`Failed to fetch policies for broker info: ${res.status} ${res.statusText}`)
            return null
        }
        
        const responseData = await res.json()
        const policies = responseData.policies || []

        if (policies.length === 0) {
            return null
        }

        // Get broker info from the first policy (assuming same broker for organization)
        const firstPolicy = policies[0]
        if (firstPolicy.makelaarsnaam && (firstPolicy.makelaarsemail || firstPolicy.makelaarstelefoon)) {
            return {
                name: firstPolicy.makelaarsnaam || "Onbekende Makelaar",
                email: firstPolicy.makelaarsemail || "",
                phone: firstPolicy.makelaarstelefoon || "",
                company: "Verzekeringsmakelaar" // You might want to add this field to policies
            }
        }

        return null
    } catch (error) {
        console.error("Failed to fetch broker info:", error)
        return null
    }
}

// Helper functions for create form
function getCurrentUserInfoForCreate_LEGACY(): UserInfo | null {
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

async function fetchUserOrganizationsForCreate_LEGACY(userInfo: UserInfo): Promise<string[]> {
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

// Note: getDefaultFormState function is now imported from create_insured_object.tsx
// Legacy function - should be removed
function getDefaultFormState_LEGACY(objectType: ObjectType): InsuredObjectFormState_LEGACY {
    const baseState: InsuredObjectFormState_LEGACY = {
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
                typeMotor: "",
                merkMotor: "",
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
                chassisnummer: "",
            }
        case "motor":
            return {
                ...baseState,
                typeMotor: "",
                merkMotor: "",
                motornummer: "",
            }
        default:
            return baseState
    }
}


function getFieldsFromSchema(schema: FieldSchema[] | null, objectType: ObjectType): FieldSchema[] {
    console.log("🔍 LIST getFieldsFromSchema DEBUG START")
    console.log("Schema received:", schema)
    console.log("Object type:", objectType)
    
    if (!schema) {
        console.log("❌ No schema provided, using fallback hardcoded fields")
        // Fallback to minimal required fields
        const commonFields: FieldSchema[] = [
            { key: "waarde", label: "Waarde", type: "currency", group: "basic", required: true, visible: true, sortable: true, width: "120px" },
            { key: "ingangsdatum", label: "Ingangsdatum", type: "date", group: "basic", required: false, visible: true, sortable: true, width: "120px" },
            { key: "notitie", label: "Notitie", type: "textarea", group: "metadata", required: false, visible: true, sortable: false, width: "200px" },
        ]

        let typeSpecificFields: FieldSchema[] = []
        switch (objectType) {
            case "boat":
                typeSpecificFields = [
                    { key: "merkBoot", label: "Merk Boot", type: "text", group: "basic", required: true, visible: true, sortable: true, width: "120px" },
                    { key: "typeBoot", label: "Type Boot", type: "text", group: "basic", required: true, visible: true, sortable: true, width: "120px" },
                ]
                break
            case "trailer":
                typeSpecificFields = [
                    { key: "chassisnummer", label: "Chassisnummer", type: "text", group: "basic", required: true, visible: true, sortable: true, width: "130px" },
                ]
                break
            case "motor":
                typeSpecificFields = [
                    { key: "merkMotor", label: "Merk Motor", type: "text", group: "basic", required: true, visible: true, sortable: true, width: "120px" },
                    { key: "typeMotor", label: "Type Motor", type: "text", group: "basic", required: true, visible: true, sortable: true, width: "120px" },
                    { key: "motornummer", label: "Motor Nummer", type: "text", group: "basic", required: true, visible: true, sortable: true, width: "120px" },
                ]
                break
        }

        const fallbackResult = [...typeSpecificFields, ...commonFields]
        console.log("✅ Using fallback fields:", fallbackResult.map(f => ({ key: f.key, label: f.label })))
        console.log("🔍 LIST getFieldsFromSchema DEBUG END")
        return fallbackResult
    }

    console.log("📊 Total fields in schema:", schema.length)
    console.log("📋 All schema fields:", schema.map(f => ({ key: f.key, label: f.label, objectTypes: f.objectTypes, visible: f.visible, inputType: f.inputType })))
    
    // Debug: Check if any fields have inputType
    const fieldsWithInputType = schema.filter(f => f.inputType)
    const fieldsWithoutInputType = schema.filter(f => !f.inputType)
    console.log(`🔍 Fields WITH inputType: ${fieldsWithInputType.length}`, fieldsWithInputType.map(f => ({ key: f.key, inputType: f.inputType })))
    console.log(`🔍 Fields WITHOUT inputType: ${fieldsWithoutInputType.length}`, fieldsWithoutInputType.map(f => f.key))
    
    // For CREATE FORMS: Show ALL user input fields regardless of visible setting
    const filteredFields = schema.filter(field => {
        // Filter by object type
        const matchesObjectType = !field.objectTypes || field.objectTypes.length === 0 || field.objectTypes.includes(objectType)
        
        // Only show user input fields (exclude system/auto fields)
        const isUserField = field.inputType === 'user'
        
        // Exclude organization-specific fields from insured object forms
        const isNotOrganizationField = !field.objectTypes || !field.objectTypes.includes('organization')
        
        console.log(`🔎 Field ${field.key}: matchesObjectType=${matchesObjectType}, isUserField=${isUserField}, isNotOrganizationField=${isNotOrganizationField}, inputType=${field.inputType}, objectTypes=${JSON.stringify(field.objectTypes)}, visible=${field.visible}`)
        
        // IMPORTANT: Do NOT check field.visible here - create forms show all user input fields
        return matchesObjectType && isUserField && isNotOrganizationField
    })
    
    console.log("✅ Final filtered fields:", filteredFields.length)
    console.log("✅ Final fields:", filteredFields.map(f => ({ key: f.key, label: f.label, visible: f.visible, required: f.required })))
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
    status: "Insured" | "Pending" | "Rejected" | "OutOfPolicy"
    waarde: number // value
    organization: string
    ingangsdatum: string // insuranceStartDate
    uitgangsdatum?: string // insuranceEndDate
    premiepromillage: number // premiumPerMille
    eigenRisico: number // deductible
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
    bootnummer?: string
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
    objects: InsuredObject[] | null,
    searchTerm: string,
    selectedOrganizations: Set<string>,
    organizations: string[],
    selectedObjectTypes: Set<ObjectType>,
    isAdminUser: boolean = false,
    currentOrganization?: string | null
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
        left: 0,
        useLeft: true,
    })
    const [orgDropdownPosition, setOrgDropdownPosition] = useState({
        top: 0,
        left: 0,
        useLeft: true,
    })
    const [objectTypeDropdownPosition, setObjectTypeDropdownPosition] =
        useState({ top: 0, left: 0, useLeft: true })

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

    useEffect(() => {
        if (objectTypeButtonRef && showObjectTypeFilterDropdown) {
            const rect = objectTypeButtonRef.getBoundingClientRect()
            const dropdownWidth = 180 // estimated width for object type dropdown
            const viewportWidth = window.innerWidth
            
            // Check if there's enough space on the right
            const spaceOnRight = viewportWidth - rect.right
            const useLeft = spaceOnRight >= dropdownWidth
            
            setObjectTypeDropdownPosition({
                top: rect.bottom + 8,
                left: useLeft ? rect.left : rect.right - dropdownWidth,
                useLeft: useLeft,
            })
        }
    }, [objectTypeButtonRef, showObjectTypeFilterDropdown])

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
                                left: `${objectTypeDropdownPosition.left}px`,
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
                            <div style={{ marginBottom: "12px" }}>
                                <button
                                    onClick={() => {
                                        // Reset to organization's default visible columns
                                        // Only consider non-organization columns
                                        const availableColumns = columns.filter(col => {
                                            return !col.objectTypes || !col.objectTypes.includes('organization')
                                        })
                                        
                                        // Get columns that should be visible from organization schema
                                        const visibleColumnsFromSchema = availableColumns
                                            .filter(col => col.visible)
                                            .map(col => col.key)
                                        
                                        // Fallback to essential columns if nothing is marked visible
                                        const defaultColumns = visibleColumnsFromSchema.length > 0 
                                            ? visibleColumnsFromSchema 
                                            : ['objectType', 'status', 'waarde']
                                        
                                        availableColumns.forEach((col) => {
                                            if (defaultColumns.includes(col.key)) {
                                                if (!visibleColumns.has(col.key)) {
                                                    onToggleColumn(col.key)
                                                }
                                            } else {
                                                if (visibleColumns.has(col.key)) {
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
                                    Reset naar Standaard
                                </button>
                            </div>

                            {/* Simple list of all columns - filter out organization fields */}
                            {columns
                                .filter(col => {
                                    // Filter out organization-specific fields
                                    return !col.objectTypes || !col.objectTypes.includes('organization')
                                })
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
                                        (e.currentTarget.style.backgroundColor = "#f3f4f6")
                                    }
                                    onMouseOut={(e) =>
                                        (e.currentTarget.style.backgroundColor = "transparent")
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        checked={visibleColumns.has(col.key)}
                                        onChange={() => onToggleColumn(col.key)}
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
    const canEdit = userInfo ? hasPermission(userInfo, 'INSURED_OBJECT_UPDATE') : false
    const canDelete = userInfo ? hasPermission(userInfo, 'INSURED_OBJECT_DELETE') : false

    console.log('ActionDropdownMenu permissions:', { 
        userInfo: !!userInfo, 
        canEdit, 
        canDelete,
        userRole: userInfo?.role,
        objectId: object?.id,
        hasUserInfo: !!userInfo
    })

    console.log('ActionDropdownMenu detailed permissions:', {
        'INSURED_OBJECT_UPDATE': userInfo ? hasPermission(userInfo, 'INSURED_OBJECT_UPDATE') : 'no user',
        'INSURED_OBJECT_DELETE': userInfo ? hasPermission(userInfo, 'INSURED_OBJECT_DELETE') : 'no user',
        userRole: userInfo?.role
    })

    // Don't render if user has no permissions
    if (!canEdit && !canDelete) {
        console.log('ActionDropdownMenu: No permissions, returning null')
        return null
    }

    // Calculate dropdown position when opening
    const handleToggle = () => {
        console.log('ActionDropdownMenu handleToggle clicked, isOpen:', isOpen)
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
        console.log('ActionDropdownMenu setIsOpen to:', !isOpen)
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
            document.addEventListener('mousedown', handleClickOutside)
        }
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [isOpen])

    const handleEdit = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('ActionDropdownMenu handleEdit called with object:', object)
        onEdit(object)
        setIsOpen(false)
    }

    const handleDelete = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        console.log('ActionDropdownMenu handleDelete called with object:', object)
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
            
            {isOpen && ReactDOM.createPortal(
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
                        {console.log('Rendering edit button for object:', object?.id)}
                        <button
                            onClick={(e) => {
                                console.log('Edit button clicked!', object?.id)
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
                                target.style.transform = "translateX(2px)"
                                target.style.boxShadow = "0 4px 8px rgba(59, 130, 246, 0.15)"
                            }}
                            onMouseOut={(e) => {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = "transparent"
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
                        {console.log('Rendering delete button for object:', object?.id)}
                        <button
                            onClick={(e) => {
                                console.log('Delete button clicked!', object?.id)
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
                                target.style.transform = "translateX(2px)"
                                target.style.boxShadow = "0 4px 8px rgba(220, 38, 38, 0.15)"
                            }}
                            onMouseOut={(e) => {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = "transparent"
                                target.style.color = "#dc2626"
                                target.style.transform = "translateX(0)"
                                target.style.boxShadow = "none"
                            }}
                        >
                            <FaTrashAlt size={14} color="currentColor" />
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
                // Use the new insured_object_fields_config structure
                const orgConfig = data.organization.insured_object_fields_config?.boat
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
                trailer: ["chassisnummer"],
                motor: ["merkMotor", "typeMotor"],
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
    const fieldsToRender = getUserInputFieldsForObjectType(schema, object.objectType)
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
                        (e.currentTarget.style.backgroundColor = colors.successHover)
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
                    onMouseOut={(e) => hover.resetPrimaryButton(e.currentTarget)}
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

async function fetchOrganizationAutoApprovalConfig(organizationName: string): Promise<AutoApprovalConfig | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(`${API_BASE_URL}${API_PATHS.ORGANIZATION}/by-name/${encodeURIComponent(organizationName)}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) {
            console.warn(`Failed to fetch organization config: ${res.status} ${res.statusText}`)
            return null
        }

        const data = await res.json()
        return data.organization?.auto_approval_config || null
    } catch (error) {
        console.error("Error fetching organization auto approval config:", error)
        return null
    }
}

function AutoAcceptRulesDisplay({ organizationName }: { organizationName: string }) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [config, setConfig] = useState<AutoApprovalConfig | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function loadConfig() {
            setIsLoading(true)
            const autoApprovalConfig = await fetchOrganizationAutoApprovalConfig(organizationName)
            setConfig(autoApprovalConfig)
            setIsLoading(false)
        }
        loadConfig()
    }, [organizationName])

    if (isLoading) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px",
                fontSize: "12px",
                color: colors.gray500,
            }}>
                <div style={{
                    width: "16px",
                    height: "16px",
                    border: `2px solid ${colors.gray300}`,
                    borderTop: `2px solid ${colors.primary}`,
                    borderRadius: "50%",
                    animation: "spin 1s linear infinite",
                }} />
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
            regex: "reguliere expressie"
        }
        return operatorMap[operator] || operator
    }

    const formatConditionValue = (condition: any): string => {
        // Handle multi-value conditions (e.g., 'in', 'between')
        if (Array.isArray(condition.values) && condition.values.length > 0) {
            if (condition.operator === 'between' && condition.values.length === 2) {
                return `${condition.values[0]} en ${condition.values[1]}`;
            }
            return condition.values.join(', ');
        }

        // Handle single-value conditions from 'value' property
        if (condition.value !== null && condition.value !== undefined && condition.value !== '') {
            return String(condition.value);
        }

        // Check if the condition has the value directly as a property with the field name
        // This handles cases where the backend might structure data differently
        const knownKeys = ['operator', 'values', 'value'];
        const otherKeys = Object.keys(condition).filter(k => !knownKeys.includes(k));
        
        for (const valueKey of otherKeys) {
            const value = condition[valueKey];
            if (value !== null && value !== undefined && value !== '') {
                // Handle arrays
                if (Array.isArray(value)) {
                    if (condition.operator === 'between' && value.length === 2) {
                        return `${value[0]} en ${value[1]}`;
                    }
                    return value.join(', ');
                }
                // Handle single values (string or number)
                return String(value);
            }
        }

        // Return debug info if no value found
        console.warn('No value found for condition:', condition);
        return '<geen waarde>';
    };

    const renderRule = (rule: AutoApprovalRule, index: number) => {
        const conditionCount = Object.keys(rule.conditions).length
        
        return (
            <div key={index} style={{
                padding: "12px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                marginBottom: "8px",
            }}>
                <div style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    color: colors.gray800,
                    marginBottom: "6px",
                }}>
                    {rule.name}
                </div>
                <div style={{
                    fontSize: "11px",
                    color: colors.gray600,
                    marginBottom: "8px",
                }}>
                    {conditionCount} voorwaarde{conditionCount !== 1 ? 'n' : ''} 
                    {conditionCount > 1 && ` (${rule.logic === 'AND' ? 'alle moeten waar zijn' : 'één moet waar zijn'})`}
                </div>
                {Object.entries(rule.conditions).map(([fieldKey, condition], condIndex) => (
                    <div key={condIndex} style={{
                        fontSize: "11px",
                        color: colors.gray700,
                        padding: "4px 8px",
                        backgroundColor: colors.white,
                        border: "1px solid #e5e7eb",
                        borderRadius: "4px",
                        marginBottom: "4px",
                        fontFamily: "monospace",
                    }}>
                        <strong>{fieldKey}</strong> {getOperatorLabel(condition.operator)} <strong>{formatConditionValue(condition)}</strong>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div style={{
            display: "inline-block",
            position: "relative",
        }}>
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
                <span style={{
                    display: "inline-block",
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    backgroundColor: config.enabled ? "#059669" : "#6b7280",
                }} />
                Goedkeuringsregels {config.enabled ? "actief" : "inactief"}
                <span style={{
                    fontSize: "10px",
                    transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s",
                }}>
                    ▼
                </span>
            </button>

            {isExpanded && (
                <div style={{
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
                }}>
                    <div style={{
                        fontSize: "14px",
                        fontWeight: "600",
                        color: colors.gray800,
                        marginBottom: "12px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                    }}>
                        Auto-Goedkeuringsregels voor {organizationName}
                        <div style={{
                            fontSize: "10px",
                            padding: "2px 6px",
                            borderRadius: "10px",
                            backgroundColor: config.enabled ? "#dcfce7" : "#f3f4f6",
                            color: config.enabled ? "#166534" : "#6b7280",
                            fontWeight: "500",
                        }}>
                            {config.enabled ? "ACTIEF" : "INACTIEF"}
                        </div>
                    </div>

                    {!config.enabled ? (
                        <div style={{
                            padding: "12px",
                            backgroundColor: "#fef3c7",
                            border: "1px solid #fcd34d",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#92400e",
                        }}>
                            Auto-goedkeuring is uitgeschakeld. Alle boten vereisen handmatige beoordeling.
                        </div>
                    ) : config.rules.length === 0 ? (
                        <div style={{
                            padding: "12px",
                            backgroundColor: "#fef2f2",
                            border: "1px solid #fca5a5",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#dc2626",
                        }}>
                            Geen regels geconfigureerd. Standaard actie: {config.default_action === "auto_approve" ? "automatisch goedkeuren" : "handmatige beoordeling"}.
                        </div>
                    ) : (
                        <>
                            <div style={{
                                fontSize: "12px",
                                color: colors.gray600,
                                marginBottom: "12px",
                                padding: "8px",
                                backgroundColor: "#f1f5f9",
                                borderRadius: "4px",
                            }}>
                                Boten worden automatisch goedgekeurd als ze voldoen aan <strong>één van de onderstaande regels</strong>:
                            </div>
                            {config.rules.map(renderRule)}
                            <div style={{
                                fontSize: "11px",
                                color: colors.gray600,
                                marginTop: "8px",
                                padding: "8px",
                                backgroundColor: "#f8fafc",
                                borderRadius: "4px",
                                borderLeft: "3px solid #e2e8f0",
                            }}>
                                <strong>Standaard actie:</strong> Als geen regel overeenkomt → {config.default_action === "auto_approve" ? "automatisch goedkeuren" : "handmatige beoordeling"}
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
    
    // Uitgangsdatum management state
    const [editingUitgangsdatum, setEditingUitgangsdatum] = useState<string | null>(null)
    const [showUitgangsdatumModal, setShowUitgangsdatumModal] = useState(false)
    const [selectedUitgangsdatum, setSelectedUitgangsdatum] = useState("")
    const [uitgangsdatumError, setUitgangsdatumError] = useState<string | null>(null)
    
    // Uitgangsdatum validation function
    const validateUitgangsdatum = (date: string): { isValid: boolean; error?: string } => {
        const selectedDate = new Date(date)
        const today = new Date()
        const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
        const endOfYear = new Date(today.getFullYear(), 11, 31) // December 31st of current year
        
        // Check if date is more than 1 week in the past
        if (selectedDate < oneWeekAgo) {
            return { 
                isValid: false, 
                error: "Uitgangsdatum kan niet meer dan 1 week in het verleden liggen. Neem contact op met de beheerders." 
            }
        }
        
        // Check if date is in the next year
        if (selectedDate.getFullYear() > today.getFullYear()) {
            return { 
                isValid: false, 
                error: "Uitgangsdatum kan niet in het volgende jaar liggen. Neem contact op met de beheerders." 
            }
        }
        
        return { isValid: true }
    }

    // Dynamic schema hook
    const { schema, loading: schemaLoading, error: schemaError } = useDynamicSchema(currentOrganization || undefined)
    
    // Use dynamic schema or fallback to empty array
    const COLUMNS = schema || []
    
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())
    
    // Update visible columns when schema changes - use organization's field visibility configuration
    useEffect(() => {
        if (COLUMNS.length > 0) {
            // Use fields marked as visible in the organization's schema configuration
            const visibleColumnsFromSchema = COLUMNS
                .filter((col) => col.visible)
                .map((col) => col.key)
            
            // If no columns are marked visible, fallback to essential columns
            const columnsToShow = visibleColumnsFromSchema.length > 0 
                ? visibleColumnsFromSchema 
                : ['objectType', 'status', 'waarde']
            
            setVisibleColumns(new Set(columnsToShow))
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
    
    // Print modal state
    const [showPrintModal, setShowPrintModal] = useState<boolean>(false)
    const [selectedPrintObjects, setSelectedPrintObjects] = useState<Set<string>>(new Set())
    const [selectedPrintFields, setSelectedPrintFields] = useState<Set<string>>(new Set())
    const [includeTotals, setIncludeTotals] = useState<boolean>(true)

    // Get insured object fields only (excluding organization fields)
    const printableFields = React.useMemo(() => {
        // Filter columns to only include fields that are relevant to insured objects
        // This excludes organization-specific fields
        return COLUMNS.filter(field => {
            // Exclude organization-only fields by checking objectTypes
            const isNotOrganizationField = !field.objectTypes || !field.objectTypes.includes('organization')
            
            // Include fields that are either user-input fields or commonly printed system fields
            const isRelevantField = field.inputType === 'user' || 
                                   field.inputType === 'system' || 
                                   field.inputType === 'auto' ||
                                   !field.inputType // fallback for fields without inputType
            
            return isNotOrganizationField && isRelevantField
        })
    }, [COLUMNS])

    // PDF Generation Function
    const generatePDF = () => {
        const selectedObjects = filteredObjects.filter(obj => selectedPrintObjects.has(obj.id))
        const selectedFields = printableFields.filter(col => selectedPrintFields.has(col.key))
        
        // Calculate totals for selected objects
        const totalWaarde = selectedObjects.reduce((sum, obj) => sum + (Number(obj.waarde) || 0), 0)
        const totalPremieVerzekerdePeriode = selectedObjects.reduce((sum, obj) => {
            const { periodPremium } = calculateObjectPremiums(obj)
            return sum + periodPremium
        }, 0)
        const totalPremieJaar = selectedObjects.reduce((sum, obj) => {
            const { yearlyPremium } = calculateObjectPremiums(obj)
            return sum + yearlyPremium
        }, 0)
        
        // Create a new window/tab for PDF content
        const printWindow = window.open('', '_blank', 'width=800,height=600')
        if (!printWindow) {
            alert('Popup geblokkeerd. Sta popups toe voor deze website.')
            return
        }

        const currentDate = new Date().toLocaleDateString('nl-NL')
        const organizationName = currentOrganization || 'Alle organisaties'
        
        // Generate HTML content for PDF
        const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Vloot Overzicht - ${organizationName}</title>
    <style>
        body { 
            font-family: ${FONT_STACK}; 
            margin: 40px; 
            color: #1f2937; 
            line-height: 1.4;
        }
        .header { 
            border-bottom: 2px solid ${colors.primary}; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .header h1 { 
            color: ${colors.primary}; 
            margin: 0; 
            font-size: 28px; 
            font-weight: 600;
        }
        .header .subtitle { 
            color: #6b7280; 
            margin: 8px 0 0 0; 
            font-size: 16px; 
        }
        .meta-info {
            background-color: #f8fafc;
            padding: 16px;
            border-radius: 8px;
            margin-bottom: 24px;
            border-left: 4px solid ${colors.primary};
        }
        .meta-info div {
            margin-bottom: 4px;
            font-size: 14px;
        }
        .meta-info strong {
            color: #374151;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 30px; 
            font-size: 12px;
        }
        th, td { 
            padding: 8px 6px; 
            text-align: left; 
            border-bottom: 1px solid #e5e7eb;
            vertical-align: top;
        }
        th { 
            background-color: ${colors.gray100}; 
            font-weight: 600; 
            color: #374151; 
            border-bottom: 2px solid ${colors.gray300};
        }
        tr:hover { 
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
            body { margin: 20px; }
            .header { page-break-after: avoid; }
            table { page-break-inside: avoid; }
            .totals { page-break-before: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Vloot Overzicht</h1>
        <div class="subtitle">${organizationName}</div>
    </div>
    
    <div class="meta-info">
        <div><strong>Datum:</strong> ${currentDate}</div>
        <div><strong>Aantal objecten:</strong> ${selectedObjects.length}</div>
        <div><strong>Geselecteerde velden:</strong> ${selectedFields.length}</div>
    </div>

    <table>
        <thead>
            <tr>
                ${selectedFields.map(field => `<th>${field.label}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${selectedObjects.map(obj => `
                <tr>
                    ${selectedFields.map(field => {
                        let value = obj[field.key as keyof typeof obj]
                        
                        // Format specific fields
                        if (field.key === 'waarde' || field.key === 'totalePremieOverHetJaar' || field.key === 'totalePremieOverDeVerzekerdePeriode') {
                            const numValue = Number(value) || 0
                            value = numValue.toLocaleString('nl-NL', { 
                                style: 'currency', 
                                currency: 'EUR',
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 0
                            })
                        } else if (field.key === 'premiepromillage') {
                            const numValue = Number(value) || 0
                            value = numValue.toFixed(2) + '‰'
                        }
                        
                        return `<td>${value || '-'}</td>`
                    }).join('')}
                </tr>
            `).join('')}
        </tbody>
    </table>

    ${includeTotals ? `
    <div class="totals">
        <h3>Totaaloverzicht</h3>
        <div class="totals-grid">
            <div class="totals-item">
                <div class="totals-label">Totale waarde</div>
                <div class="totals-value currency">€${totalWaarde.toLocaleString('nl-NL')}</div>
            </div>
            <div class="totals-item">
                <div class="totals-label">Totale premie (jaar)</div>
                <div class="totals-value currency">€${Math.round(totalPremieJaar).toLocaleString('nl-NL')}</div>
            </div>
            <div class="totals-item">
                <div class="totals-label">Totale premie (verzekerde periode)</div>
                <div class="totals-value currency">€${Math.round(totalPremieVerzekerdePeriode).toLocaleString('nl-NL')}</div>
            </div>
            <div class="totals-item">
                <div class="totals-label">Aantal objecten</div>
                <div class="totals-value">${selectedObjects.length}</div>
            </div>
        </div>
    </div>
    ` : ''}

    <script>
        window.onload = function() {
            // Automatically trigger print dialog
            setTimeout(() => {
                window.print();
                // Close window after printing (user can cancel this)
                window.onafterprint = function() {
                    setTimeout(() => {
                        window.close();
                    }, 1000);
                }
            }, 500);
        }
    </script>
</body>
</html>`

        printWindow.document.write(htmlContent)
        printWindow.document.close()
        
        // Close the modal
        setShowPrintModal(false)
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

    // Fetch broker info when organization changes
    useEffect(() => {
        async function loadBrokerInfo() {
            if (currentOrganization) {
                try {
                    const brokerData = await fetchBrokerInfoForOrganization(currentOrganization)
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
            } else if (data && typeof data === 'object' && Array.isArray(data.items)) {
                objectsList = data.items
            } else {
                console.warn('Unexpected API response format:', data)
                objectsList = []
            }
            
            console.log(`Setting objects: ${objectsList.length} items`)
            // Update all objects with calculated premium values for consistency
            const objectsWithCalculatedPremiums = objectsList.map(obj => updateObjectWithCalculatedPremiums(obj))
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
    console.log('Objects state before filtering:', objects, typeof objects, Array.isArray(objects))
    
    const filteredObjects = objects && Array.isArray(objects)
        ? filterObjects(
              objects,
              searchTerm,
              selectedOrganizations,
              organizations,
              selectedObjectTypes,
              isAdmin(userInfo),
              currentOrganization // Pass current organization for filtering
          ).map(obj => updateObjectWithCalculatedPremiums(obj)) // Ensure calculated fields are up-to-date
        : []

    const getVisibleColumnsList = () => {
        // Define the desired column order: actions, type, status, waarde, brand, model/type, CIN nummer
        const columnOrder = [
            'objectType',    // type
            'status',        // status  
            'waarde',        // waarde
            'brand',         // Unified brand/merk
            'type',          // Unified model/type
            'cinNummer',     // CIN nummer
            // All other fields follow in their original order
        ]
        
        // Filter columns based on visibility and data availability
        const filteredColumns = COLUMNS.filter((col) => {
            if (!visibleColumns.has(col.key)) return false
            
            // Hide columns that have no data in the current filtered set
            const columnHasData = filteredObjects.some(obj => {
                const value = obj[col.key as keyof InsuredObject]
                return value !== null && value !== undefined && value !== ''
            })
            
            // Always show essential columns even if empty
            const essentialColumns = ['objectType', 'status', 'waarde', 'merkBoot', 'typeBoot', 'merkMotor', 'typeMotor', 'chassisnummer', 'uitgangsdatum']
            if (essentialColumns.includes(col.key)) {
                return true
            }
            
            return columnHasData
        })
        
        // Sort columns based on the desired order
        return filteredColumns.sort((a, b) => {
            const aIndex = columnOrder.indexOf(a.key)
            const bIndex = columnOrder.indexOf(b.key)
            
            // If both columns are in the order list, sort by their position
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
        console.log('handleEdit called with object:', object)
        setEditingObject(object)
    }, [])

    const handleDelete = useCallback((object: InsuredObject) => {
        console.log('handleDelete called with object:', object)
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

    // Uitgangsdatum handlers
    const handleUitgangsdatumClick = useCallback((objectId: string, currentDate?: string) => {
        setEditingUitgangsdatum(objectId)
        setSelectedUitgangsdatum(currentDate || new Date().toISOString().split('T')[0])
        setUitgangsdatumError(null)
        setShowUitgangsdatumModal(true)
    }, [])

    const handleUitgangsdatumCancel = useCallback(() => {
        setEditingUitgangsdatum(null)
        setSelectedUitgangsdatum("")
        setUitgangsdatumError(null)
        setShowUitgangsdatumModal(false)
    }, [])

    const handleUitgangsdatumConfirm = useCallback(async () => {
        if (!editingUitgangsdatum || !selectedUitgangsdatum) return

        // Validate the date
        const validation = validateUitgangsdatum(selectedUitgangsdatum)
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
                        status: "OutOfPolicy" 
                    }),
                }
            )

            if (!res.ok) {
                throw new Error(`Failed to update: ${res.status} ${res.statusText}`)
            }

            // Show success message
            setSuccessMessage("Uitgangsdatum successfully set - object is now out of policy")

            // Refresh the list
            await fetchObjects()
            
            // Close modal
            handleUitgangsdatumCancel()
        } catch (err: any) {
            setUitgangsdatumError(err.message || "Failed to update uitgangsdatum")
        }
    }, [editingUitgangsdatum, selectedUitgangsdatum, validateUitgangsdatum, handleUitgangsdatumCancel])

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
                            (e.target as HTMLButtonElement).style.backgroundColor = "#e5e7eb"
                        }}
                        onMouseOut={(e) => {
                            (e.target as HTMLButtonElement).style.backgroundColor = "#f3f4f6"
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
                                <FaUserEdit size={20} color={colors.primary} />
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
                            <PrintOverviewButton onPrintClick={() => setShowPrintModal(true)} />
                            <CreateObjectButton onCreateClick={() => setShowCreateForm(true)} />
                        </div>
                    </div>

                    {/* Auto Accept Rules Display - only show when viewing specific organization */}
                    {currentOrganization && (
                        <div style={{
                            marginTop: "16px",
                            marginBottom: "8px",
                            display: "flex",
                            justifyContent: "flex-start",
                        }}>
                            <AutoAcceptRulesDisplay organizationName={currentOrganization} />
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
                                            object.status === "OutOfPolicy"
                                                ? "#f9fafb"
                                                : index % 2 === 0
                                                    ? "#ffffff"
                                                    : "#f8fafc",
                                        opacity: object.status === "OutOfPolicy" ? 0.6 : 1,
                                        transition: "background-color 0.2s, opacity 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                        if (object.status !== "OutOfPolicy") {
                                            e.currentTarget.style.backgroundColor = "#f1f5f9"
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        const originalBg = object.status === "OutOfPolicy"
                                            ? "#f9fafb"
                                            : index % 2 === 0
                                                ? "#ffffff"
                                                : "#f8fafc"
                                        e.currentTarget.style.backgroundColor = originalBg
                                    }}
                                >
                                    {/* Actions cell */}
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

                                        // Special handling for uitgangsdatum column to make it clickable
                                        if (col.key === "uitgangsdatum") {
                                            const cellValue = object.uitgangsdatum
                                            const hasValue = cellValue && cellValue.trim() !== ""
                                            
                                            return (
                                                <td
                                                    key={col.key}
                                                    style={{
                                                        padding: "12px 8px",
                                                        borderBottom: "1px solid #f1f5f9",
                                                        color: "#374151",
                                                        fontSize: "13px",
                                                        lineHeight: "1.3",
                                                        cursor: object.status !== "OutOfPolicy" ? "pointer" : "default",
                                                    }}
                                                    onClick={() => {
                                                        if (object.status !== "OutOfPolicy") {
                                                            handleUitgangsdatumClick(object.id, cellValue)
                                                        }
                                                    }}
                                                    onMouseOver={(e) => {
                                                        if (object.status !== "OutOfPolicy" && !hasValue) {
                                                            const div = e.currentTarget.querySelector('div')
                                                            if (div) {
                                                                div.style.backgroundColor = "#bfdbfe"
                                                                div.style.borderColor = "#1d4ed8"
                                                                div.style.transform = "scale(1.02)"
                                                            }
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (object.status !== "OutOfPolicy" && !hasValue) {
                                                            const div = e.currentTarget.querySelector('div')
                                                            if (div) {
                                                                div.style.backgroundColor = "#dbeafe"
                                                                div.style.borderColor = "#3b82f6"
                                                                div.style.transform = "scale(1)"
                                                            }
                                                        }
                                                    }}
                                                    title={
                                                        object.status !== "OutOfPolicy" 
                                                            ? "Klik om uitgangsdatum in te stellen"
                                                            : "Uitgangsdatum is al ingesteld"
                                                    }
                                                >
                                                    <div
                                                        style={{
                                                            padding: hasValue ? "6px 12px" : "8px 16px",
                                                            borderRadius: "8px",
                                                            backgroundColor: 
                                                                object.status !== "OutOfPolicy" 
                                                                    ? (hasValue ? "#f8fafc" : "#dbeafe")
                                                                    : "transparent",
                                                            border: 
                                                                object.status !== "OutOfPolicy" && !hasValue
                                                                    ? "1px solid #3b82f6"
                                                                    : hasValue
                                                                        ? "1px solid #e5e7eb"
                                                                        : "none",
                                                            color: 
                                                                object.status !== "OutOfPolicy"
                                                                    ? (hasValue ? "#374151" : "#1d4ed8")
                                                                    : "#d1d5db",
                                                            fontWeight: hasValue ? "normal" : "500",
                                                            fontSize: hasValue ? "13px" : "12px",
                                                            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif",
                                                            textAlign: "center",
                                                            minWidth: hasValue ? "auto" : "160px",
                                                            transition: "all 0.2s ease",
                                                            opacity: object.status === "OutOfPolicy" ? 0.8 : 1,
                                                        }}
                                                    >
                                                        {hasValue
                                                            ? new Date(cellValue).toLocaleDateString()
                                                            : object.status !== "OutOfPolicy"
                                                                ? "Klik hier om een uitgangsdatum aan te geven"
                                                                : "-"
                                                        }
                                                    </div>
                                                </td>
                                            )
                                        }

                                        // Regular cell rendering using direct field access
                                        const cellValue = object[col.key as keyof InsuredObject]

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
                                                {renderObjectCellValue(col, cellValue)}
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Totals Display */}
            <TotalsDisplay objects={filteredObjects} />

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
                    onOrganizationSelect={setCurrentOrganization}
                />
            )}

            {/* Uitgangsdatum Confirmation Modal */}
            {showUitgangsdatumModal && ReactDOM.createPortal(
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
                            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", fontWeight: "600", color: colors.gray800, fontFamily: FONT_STACK }}>
                                Uitgangsdatum instellen
                            </h3>
                            
                            <p style={{ ...styles.description, margin: "0 0 16px 0" }}>
                                Door het instellen van een uitgangsdatum wordt de status automatisch gewijzigd naar "Buiten Polis". Dit betekent dat het object niet meer onder het beleid valt.
                            </p>

                            <div style={{ marginBottom: "16px" }}>
                                <label style={styles.label}>
                                    Uitgangsdatum:
                                </label>
                                <input
                                    type="date"
                                    value={selectedUitgangsdatum}
                                    onChange={(e) => {
                                        setSelectedUitgangsdatum(e.target.value)
                                        setUitgangsdatumError(null) // Clear error when user changes date
                                    }}
                                    style={{
                                        ...styles.input,
                                        border: uitgangsdatumError ? `1px solid ${colors.error}` : `1px solid ${colors.gray300}`,
                                    }}
                                />
                            </div>

                            {uitgangsdatumError && (
                                <div style={{
                                    ...styles.errorAlert,
                                    marginBottom: "16px",
                                }}>
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
                                        e.currentTarget.style.backgroundColor = "#e5e7eb"
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#f3f4f6"
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
                                        backgroundColor: "#3b82f6",
                                        color: "#ffffff",
                                        borderColor: "#3b82f6",
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = "#2563eb"
                                        e.currentTarget.style.borderColor = "#2563eb"
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = "#3b82f6"
                                        e.currentTarget.style.borderColor = "#3b82f6"
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

            {/* Print Modal */}
            {showPrintModal && ReactDOM.createPortal(
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
                            <h3 style={{ 
                                margin: "0 0 24px 0", 
                                fontSize: "20px", 
                                fontWeight: "600", 
                                color: colors.gray800, 
                                fontFamily: FONT_STACK 
                            }}>
                                Print Overzicht
                            </h3>

                            <div style={{ marginBottom: "24px" }}>
                                <h4 style={{ 
                                    margin: "0 0 12px 0", 
                                    fontSize: "16px", 
                                    fontWeight: "500", 
                                    color: colors.gray700,
                                    fontFamily: FONT_STACK 
                                }}>
                                    Selecteer objecten ({filteredObjects.length} beschikbaar)
                                </h4>
                                
                                <div style={{ 
                                    display: "flex", 
                                    gap: "12px", 
                                    marginBottom: "16px" 
                                }}>
                                    <button
                                        onClick={() => setSelectedPrintObjects(new Set(filteredObjects.map(obj => obj.id)))}
                                        style={{
                                            ...styles.secondaryButton,
                                            padding: "6px 12px",
                                            fontSize: "12px",
                                        }}
                                    >
                                        Alles selecteren
                                    </button>
                                    <button
                                        onClick={() => setSelectedPrintObjects(new Set())}
                                        style={{
                                            ...styles.secondaryButton,
                                            padding: "6px 12px",
                                            fontSize: "12px",
                                        }}
                                    >
                                        Alles deselecteren
                                    </button>
                                </div>

                                <div style={{
                                    maxHeight: "200px",
                                    overflowY: "auto",
                                    border: `1px solid ${colors.gray200}`,
                                    borderRadius: "8px",
                                    padding: "12px",
                                    backgroundColor: colors.gray50
                                }}>
                                    {filteredObjects.map(obj => (
                                        <div key={obj.id} style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: "8px", 
                                            marginBottom: "8px" 
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedPrintObjects.has(obj.id)}
                                                onChange={(e) => {
                                                    const newSelected = new Set(selectedPrintObjects)
                                                    if (e.target.checked) {
                                                        newSelected.add(obj.id)
                                                    } else {
                                                        newSelected.delete(obj.id)
                                                    }
                                                    setSelectedPrintObjects(newSelected)
                                                }}
                                                style={{ cursor: "pointer" }}
                                            />
                                            <span style={{ 
                                                fontSize: "14px", 
                                                color: colors.gray700,
                                                fontFamily: FONT_STACK 
                                            }}>
                                                {(() => {
                                                    const objectType = obj.objectType || "onbekend"
                                                    
                                                    // Use actual available field names based on object type
                                                    let brand = ""
                                                    let type = ""
                                                    let identifier = ""
                                                    
                                                    if (objectType === "boot") {
                                                        brand = obj.merkBoot || "Onbekend merk"
                                                        type = obj.typeBoot || "Onbekend type"
                                                        identifier = obj.bootnummer || obj.cinNummer || ""
                                                    } else if (objectType === "motor") {
                                                        brand = obj.merkMotor || "Onbekend merk"  
                                                        type = obj.typeMotor || "Onbekend type"
                                                        identifier = obj.motornummer || obj.motorSerienummer || ""
                                                    } else if (objectType === "trailer") {
                                                        brand = obj.merkTrailer || "Onbekend merk"
                                                        type = obj.typeTrailer || "Onbekend type"
                                                        identifier = obj.chassisnummer || ""
                                                    } else {
                                                        // Fallback: try any available brand/type field
                                                        brand = obj.merkBoot || obj.merkMotor || obj.merkTrailer || "Onbekend merk"
                                                        type = obj.typeBoot || obj.typeMotor || obj.typeTrailer || "Onbekend type"
                                                        identifier = obj.bootnummer || obj.motornummer || obj.chassisnummer || obj.cinNummer || ""
                                                    }
                                                    
                                                    const typeLabel = objectType === "boot" ? "boot" : objectType === "motor" ? "motor" : objectType === "trailer" ? "trailer" : objectType
                                                    
                                                    return `${brand} ${type} (${typeLabel})${identifier ? ` - ${identifier}` : ""}`
                                                })()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: "24px" }}>
                                <h4 style={{ 
                                    margin: "0 0 12px 0", 
                                    fontSize: "16px", 
                                    fontWeight: "500", 
                                    color: colors.gray700,
                                    fontFamily: FONT_STACK 
                                }}>
                                    Selecteer velden
                                </h4>
                                
                                <div style={{ 
                                    display: "flex", 
                                    gap: "12px", 
                                    marginBottom: "16px" 
                                }}>
                                    <button
                                        onClick={() => setSelectedPrintFields(new Set(printableFields.map(col => col.key)))}
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
                                            const basicFields = ['objectType', 'merkBoot', 'typeBoot', 'merkMotor', 'typeMotor', 'waarde', 'premiepromillage', 'status']
                                            setSelectedPrintFields(new Set(basicFields.filter(field => printableFields.some(col => col.key === field))))
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
                                        onClick={() => setSelectedPrintFields(new Set())}
                                        style={{
                                            ...styles.secondaryButton,
                                            padding: "6px 12px",
                                            fontSize: "12px",
                                        }}
                                    >
                                        Geen velden
                                    </button>
                                </div>

                                <div style={{
                                    maxHeight: "150px",
                                    overflowY: "auto",
                                    border: `1px solid ${colors.gray200}`,
                                    borderRadius: "8px",
                                    padding: "12px",
                                    backgroundColor: colors.gray50,
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                                    gap: "8px"
                                }}>
                                    {printableFields.map(col => (
                                        <div key={col.key} style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: "8px" 
                                        }}>
                                            <input
                                                type="checkbox"
                                                checked={selectedPrintFields.has(col.key)}
                                                onChange={(e) => {
                                                    const newSelected = new Set(selectedPrintFields)
                                                    if (e.target.checked) {
                                                        newSelected.add(col.key)
                                                    } else {
                                                        newSelected.delete(col.key)
                                                    }
                                                    setSelectedPrintFields(newSelected)
                                                }}
                                                style={{ cursor: "pointer" }}
                                            />
                                            <span style={{ 
                                                fontSize: "13px", 
                                                color: colors.gray700,
                                                fontFamily: FONT_STACK 
                                            }}>
                                                {col.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div style={{ marginBottom: "24px" }}>
                                <div style={{ 
                                    display: "flex", 
                                    alignItems: "center", 
                                    gap: "8px" 
                                }}>
                                    <input
                                        type="checkbox"
                                        checked={includeTotals}
                                        onChange={(e) => setIncludeTotals(e.target.checked)}
                                        style={{ cursor: "pointer" }}
                                    />
                                    <span style={{ 
                                        fontSize: "14px", 
                                        color: colors.gray700,
                                        fontFamily: FONT_STACK 
                                    }}>
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
                                        if (selectedPrintObjects.size === 0) {
                                            alert("Selecteer minimaal één object om te printen.")
                                            return
                                        }
                                        if (selectedPrintFields.size === 0) {
                                            alert("Selecteer minimaal één veld om te printen.")
                                            return
                                        }
                                        generatePDF()
                                    }}
                                    style={{
                                        ...styles.primaryButton,
                                        opacity: (selectedPrintObjects.size === 0 || selectedPrintFields.size === 0) ? 0.6 : 1
                                    }}
                                >
                                    <FaPrint size={14} />
                                    PDF Genereren
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
const calculateInsurancePeriod = (obj: InsuredObject): number => {
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
    const daysDifference = Math.max(1, Math.ceil(timeDifference / (1000 * 3600 * 24)))
    
    return daysDifference
}

// Helper function to calculate individual premiums consistently
const calculateObjectPremiums = (obj: InsuredObject) => {
    const waarde = Number(obj.waarde) || 0
    const promillage = Number(obj.premiepromillage) || 0
    const yearlyPremium = waarde * promillage / 1000
    
    // Calculate actual period premium based on days
    const periodDays = calculateInsurancePeriod(obj)
    const periodPremium = yearlyPremium * (periodDays / 365)
    
    return {
        yearlyPremium,
        periodPremium,
        periodDays
    }
}

// Function to update object with calculated premium values
const updateObjectWithCalculatedPremiums = (obj: InsuredObject): InsuredObject => {
    const { yearlyPremium, periodPremium, periodDays } = calculateObjectPremiums(obj)
    
    return {
        ...obj,
        totalePremieOverHetJaar: yearlyPremium,
        totalePremieOverDeVerzekerdePeriode: periodPremium,
        aantalVerzekerdeDagen: periodDays
    }
}

// ——— Totals Display Component ———
function TotalsDisplay({ 
    objects, 
    label 
}: { 
    objects: InsuredObject[], 
    label?: string 
}) {
    if (!objects || objects.length === 0) {
        return null
    }

    // Use useMemo to recalculate totals efficiently when objects change
    const { totalWaarde, totalPremieVerzekerdePeriode, totalPremieJaar, difference, percentageDifference } = React.useMemo(() => {
        console.log('🧮 Recalculating totals for', objects.length, 'objects')
        
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
        const percentageDifference = totalPremieJaar > 0 ? ((difference / totalPremieJaar) * 100) : 0

        console.log('💰 Calculated totals:', {
            totalWaarde: totalWaarde.toLocaleString(),
            totalPremieJaar: Math.round(totalPremieJaar).toLocaleString(),
            totalPremieVerzekerdePeriode: Math.round(totalPremieVerzekerdePeriode).toLocaleString(),
            difference: Math.round(Math.abs(difference)).toLocaleString(),
            percentageDifference: percentageDifference.toFixed(1) + '%'
        })
        
        return {
            totalWaarde,
            totalPremieVerzekerdePeriode,
            totalPremieJaar,
            difference,
            percentageDifference
        }
    }, [objects]) // Recalculate when objects array changes

    return (
        <div style={{
            margin: "16px 0",
            padding: "16px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontFamily: FONT_STACK,
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                marginBottom: "12px"
            }}>
                <h3 style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "600",
                    color: "#1f2937"
                }}>
                    {label || "Totaaloverzicht"}
                </h3>
                <div style={{
                    marginLeft: "12px",
                    fontSize: "14px",
                    color: "#6b7280",
                    backgroundColor: "#e5e7eb",
                    padding: "4px 8px",
                    borderRadius: "4px"
                }}>
                    {objects.length} objecten
                </div>
            </div>
            
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                gap: "16px"
            }}>
                <div style={{
                    padding: "12px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "4px",
                        fontWeight: "500"
                    }}>
                        Totale waarde
                    </div>
                    <div style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#1f2937"
                    }}>
                        €{totalWaarde.toLocaleString()}
                    </div>
                </div>
                
                <div style={{
                    padding: "12px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "4px",
                        fontWeight: "500"
                    }}>
                        Totale premie over de verzekerde periode
                    </div>
                    <div style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: colors.primary
                    }}>
                        €{Math.round(totalPremieVerzekerdePeriode).toLocaleString()}
                    </div>
                </div>
                
                <div style={{
                    padding: "12px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "6px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "4px",
                        fontWeight: "500"
                    }}>
                        Totale premie over het jaar
                    </div>
                    <div style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: colors.secondary
                    }}>
                        €{Math.round(totalPremieJaar).toLocaleString()}
                    </div>
                </div>
                
                <div style={{
                    padding: "12px",
                    backgroundColor: difference > 0 ? "#fef3f2" : "#f0fdf4",
                    border: `1px solid ${difference > 0 ? "#fecaca" : "#bbf7d0"}`,
                    borderRadius: "6px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "4px",
                        fontWeight: "500"
                    }}>
                        Verschil (jaar - periode)
                    </div>
                    <div style={{
                        fontSize: "18px",
                        fontWeight: "600",
                        color: difference > 0 ? "#dc2626" : "#16a34a"
                    }}>
                        €{Math.round(Math.abs(difference)).toLocaleString()}
                    </div>
                    <div style={{
                        fontSize: "12px",
                        color: difference > 0 ? "#dc2626" : "#16a34a",
                        marginTop: "2px"
                    }}>
                        {difference > 0 ? "+" : ""}{percentageDifference.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
    )
}

// Export Override
export function InsuredObjectListApp(): Override {
    return {
        children: <InsuredObjectList />,
    }
}
