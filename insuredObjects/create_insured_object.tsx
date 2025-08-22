import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes, FaShip, FaTruck, FaCog, FaArrowLeft, FaUser } from "react-icons/fa"
import { colors, styles, hover, animations, FONT_STACK } from "../theme"
import { 
    API_BASE_URL, 
    API_PATHS, 
    getIdToken, 
    getUserId,
    formatErrorMessage, 
    formatSuccessMessage,
    validateRequired,
    validateYear,
    validateNumberRange,
    formatLabel
} from "../utils"
import { useDynamicSchema, type FieldSchema } from "../hooks/useDynamicSchema"


// Object type definitions
export type ObjectType = "boat" | "trailer" | "motor"

// User role definitions
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    organization?: string
    organizations?: string[]
}

// Legacy types removed - now using dynamic schema

// Comprehensive form state for all insured object types (Dutch field names)
type InsuredObjectFormState = {
    // Required fields for all objects
    objectType: ObjectType
    waarde: number // value
    organization: string
    ingangsdatum: string // insuranceStartDate
    premiepromillage: number // premiumPerMille
    eigenRisico: number // deductible
    
    // Common optional fields
    uitgangsdatum?: string // insuranceEndDate
    notitie?: string // notes
    
    // Boat-specific fields (conditional) - Dutch names
    ligplaats?: string // mooringLocation
    aantalMotoren?: number // numberOfEngines
    typeMerkMotor?: string // engineType
    merkBoot?: string // boatBrand
    typeBoot?: string // boatType
    bouwjaar?: number // yearOfConstruction
    aantalVerzekerdeDagen?: number // numberOfInsuredDays
    totalePremieOverHetJaar?: number // totalAnnualPremium
    totalePremieOverDeVerzekerdePeriode?: number // totalPremiumForInsuredPeriod
    bootnummer?: string // boatNumber
    motornummer?: string // engineNumber
    cinNummer?: string // cinNumber
    
    // Trailer-specific fields (conditional) - Dutch names
    trailerRegistratienummer?: string
    
    // Motor-specific fields (conditional) - Dutch names
    motorMerk?: string
    motorSerienummer?: string
}

// Object type configurations
export const OBJECT_TYPE_CONFIG = {
    boat: {
        label: "Boat",
        icon: FaShip,
        description: "Zeilboten, motorboten, jachten en andere watervoertuigen",
        color: colors.blue || "#3b82f6",
        useOrgConfig: true, // All object types now use organization configuration
    },
    trailer: {
        label: "Trailer",
        icon: FaTruck,
        description: "Boottrailers, aanhangers en transporttrailers",
        color: colors.green || "#10b981",
        useOrgConfig: true, // Now uses dynamic schema configuration
    },
    motor: {
        label: "Motor",
        icon: FaCog,
        description: "Buitenboordmotoren, binnenboordmotoren en scheepsmotoren",
        color: colors.orange || "#f59e0b",
        useOrgConfig: true, // Now uses dynamic schema configuration
    },
} as const

// User and organization management functions
function getCurrentUserInfo(): UserInfo | null {
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

async function fetchUserInfo(cognitoSub: string): Promise<UserInfo | null> {
    try {
        const token = getIdToken()
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

        const userData = responseData.user || responseData
        return {
            sub: cognitoSub,
            role: userData.role || "user",
            organization: userData.organization,
            organizations: userData.organizations || [],
        }
    } catch (error) {
        console.error("Failed to fetch user info:", error)
        return null
    }
}

async function fetchUserOrganizations(userInfo: UserInfo): Promise<string[]> {
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
        const userOrgs = []
        if (userInfo.organization) userOrgs.push(userInfo.organization)
        if (userInfo.organizations) userOrgs.push(...userInfo.organizations)
        return [...new Set(userOrgs)] // Remove duplicates
    } catch (error) {
        console.error("Failed to fetch organizations:", error)
        return []
    }
}

// Get default form state based on object type (Dutch field names)
function getDefaultFormState(objectType: ObjectType): InsuredObjectFormState {
    const baseState: InsuredObjectFormState = {
        objectType,
        waarde: 0, // value
        organization: "",
        ingangsdatum: "", // insuranceStartDate
        premiepromillage: 0, // premiumPerMille
        eigenRisico: 0, // deductible
        uitgangsdatum: "", // insuranceEndDate
        notitie: "", // notes
    }

    // Add type-specific defaults
    switch (objectType) {
        case "boat":
            return {
                ...baseState,
                ligplaats: "", // mooringLocation
                aantalMotoren: 1, // numberOfEngines
                typeMerkMotor: "", // engineType
                merkBoot: "", // boatBrand
                typeBoot: "", // boatType
                bouwjaar: new Date().getFullYear(), // yearOfConstruction
                aantalVerzekerdeDagen: 365, // numberOfInsuredDays
                totalePremieOverHetJaar: 0, // totalAnnualPremium
                totalePremieOverDeVerzekerdePeriode: 0, // totalPremiumForInsuredPeriod
                bootnummer: "", // boatNumber
                motornummer: "", // engineNumber
                cinNummer: "", // cinNumber
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

// Get fields to render based on dynamic schema
function getFieldsFromSchema(schema: FieldSchema[] | null, objectType: ObjectType): FieldSchema[] {
    if (!schema) {
        // Fallback to minimal required fields
        const commonFields: FieldSchema[] = [
            { key: "waarde", label: "Waarde", type: "currency", group: "essential", required: true, visible: true, sortable: true, width: "120px" },
            { key: "ingangsdatum", label: "Ingangsdatum", type: "date", group: "dates", required: false, visible: true, sortable: true, width: "120px" },
            { key: "notitie", label: "Notitie", type: "textarea", group: "metadata", required: false, visible: true, sortable: false, width: "200px" },
        ]

        switch (objectType) {
            case "boat":
                return [
                    { key: "merkBoot", label: "Merk Boot", type: "text", group: "identity", required: true, visible: true, sortable: true, width: "120px" },
                    { key: "typeBoot", label: "Type Boot", type: "text", group: "identity", required: true, visible: true, sortable: true, width: "120px" },
                    ...commonFields
                ]
            case "trailer":
                return [
                    { key: "trailerRegistratienummer", label: "Chassisnummer", type: "text", group: "identity", required: true, visible: true, sortable: true, width: "130px" },
                    ...commonFields
                ]
            case "motor":
                return [
                    { key: "motorMerk", label: "Motor Merk", type: "text", group: "identity", required: true, visible: true, sortable: true, width: "120px" },
                    { key: "motorSerienummer", label: "Motor Nummer", type: "text", group: "identity", required: true, visible: true, sortable: true, width: "120px" },
                    ...commonFields
                ]
            default:
                return commonFields
        }
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


// Object Type Selector Component
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

// Organization Selector Component
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

// Main form component for creating insured objects
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
    const [isLoadingConfig, setIsLoadingConfig] = React.useState(config.useOrgConfig)
    // Legacy state removed - now using useDynamicSchema hook
    
    // Use dynamic schema hook
    const { schema, loading: schemaLoading, error: schemaError } = useDynamicSchema(selectedOrganization)

    // Legacy functions removed - now using useDynamicSchema hook

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

        // Skip objectType, organization, and status fields (handled automatically)
        if (field.key === "objectType" || field.key === "organization" || field.key === "status") return null

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
                    {field.required && <span style={{ color: colors.red, marginLeft: "4px" }}>*</span>}
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

    // Show loading state while fetching configuration (only for boats)
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
                <style>{animations}</style>
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

            <style>{animations}</style>
        </div>
    )
}

// Main component that manages the flow
function InsuredObjectFormManager() {
    const [currentStep, setCurrentStep] = React.useState<"organization" | "selector" | "form">("organization")
    const [selectedType, setSelectedType] = React.useState<ObjectType | null>(null)
    const [selectedOrganization, setSelectedOrganization] = React.useState<string | null>(null)
    const [showForm, setShowForm] = React.useState(false)
    const [userInfo, setUserInfo] = React.useState<UserInfo | null>(null)
    const [availableOrganizations, setAvailableOrganizations] = React.useState<string[]>([])
    const [isLoadingUser, setIsLoadingUser] = React.useState(true)

    // Load user info and organizations on mount
    React.useEffect(() => {
        async function loadUserData() {
            setIsLoadingUser(true)
            try {
                const basicUserInfo = getCurrentUserInfo()
                if (basicUserInfo) {
                    const detailedUserInfo = await fetchUserInfo(basicUserInfo.sub)
                    if (detailedUserInfo) {
                        setUserInfo(detailedUserInfo)
                        const orgs = await fetchUserOrganizations(detailedUserInfo)
                        setAvailableOrganizations(orgs)
                        
                        // If user has only one organization, pre-select it
                        if (orgs.length === 1) {
                            setSelectedOrganization(orgs[0])
                            setCurrentStep("selector")
                        }
                    }
                }
            } catch (error) {
                console.error("Failed to load user data:", error)
            } finally {
                setIsLoadingUser(false)
            }
        }
        
        if (showForm) {
            loadUserData()
        }
    }, [showForm])

    const handleOrganizationSelect = (organization: string) => {
        setSelectedOrganization(organization)
        setCurrentStep("selector")
    }

    const handleTypeSelect = (type: ObjectType) => {
        setSelectedType(type)
        setCurrentStep("form")
    }

    const handleBackToOrganization = () => {
        setCurrentStep("organization")
        setSelectedOrganization(null)
    }

    const handleBackToSelector = () => {
        setCurrentStep("selector")
        setSelectedType(null)
    }

    const handleClose = () => {
        setShowForm(false)
        setCurrentStep("organization")
        setSelectedType(null)
        setSelectedOrganization(null)
    }

    const handleSuccess = () => {
        console.log(`${selectedType} insurance created successfully for ${selectedOrganization}!`)
    }


    const overlay = showForm
        ? ReactDOM.createPortal(
              <div style={styles.modalOverlay}>
                  {isLoadingUser ? (
                      <div style={{
                          ...styles.modal,
                          width: "min(90vw, 400px)",
                          padding: "32px",
                          textAlign: "center",
                      }}>
                          <div style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "500" }}>
                              Laden...
                          </div>
                          <div style={{
                              ...styles.spinner,
                              display: "inline-block",
                              width: "20px",
                              height: "20px",
                              border: `2px solid ${colors.gray100}`,
                              borderTop: `2px solid ${colors.primary}`,
                          }} />
                      </div>
                  ) : userInfo && currentStep === "organization" ? (
                      <OrganizationSelector 
                          userInfo={userInfo}
                          availableOrganizations={availableOrganizations}
                          onSelect={handleOrganizationSelect}
                          onClose={handleClose}
                          onBack={handleClose}
                      />
                  ) : userInfo && currentStep === "selector" ? (
                      <ObjectTypeSelector 
                          onSelect={handleTypeSelect} 
                          onClose={handleClose}
                          onBack={availableOrganizations.length > 1 ? handleBackToOrganization : handleClose}
                      />
                  ) : userInfo && selectedType && selectedOrganization ? (
                      <InsuredObjectForm
                          objectType={selectedType}
                          selectedOrganization={selectedOrganization}
                          onClose={handleClose}
                          onBack={handleBackToSelector}
                          onSuccess={handleSuccess}
                      />
                  ) : null}
              </div>,
              document.body
          )
        : null

    return (
        <Frame width="100%" height="100%" background="transparent">
            <button
                onClick={() => setShowForm(true)}
                style={{
                    ...styles.primaryButton,
                    position: "absolute",
                    top: 20,
                    left: 20,
                    padding: "12px 20px",
                    boxShadow: `0 4px 12px ${colors.primary}30`,
                }}
                onMouseOver={(e) => {
                    hover.primaryButton(e.target as HTMLElement)
                    e.target.style.transform = "translateY(-1px)"
                    e.target.style.boxShadow = `0 6px 16px ${colors.primary}40`
                }}
                onMouseOut={(e) => {
                    hover.resetPrimaryButton(e.target as HTMLElement)
                    e.target.style.transform = "translateY(0)"
                    e.target.style.boxShadow = `0 4px 12px ${colors.primary}30`
                }}
            >
                <FaPlus size={14} />
                Add Insured Object
            </button>
            {overlay}
        </Frame>
    )
}

// Export Override
export function InsuredObjectFormApp(): Override {
    return {
        children: <InsuredObjectFormManager />,
    }
}