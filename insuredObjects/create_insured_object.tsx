import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes, FaShip, FaTruck, FaCog, FaArrowLeft, FaUser } from "react-icons/fa"
import { colors, styles, hover, animations, FONT_STACK } from "../Theme"
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
} from "../Utils"
import { useDynamicSchema, useCompleteSchema, getUserInputFieldsForObjectType, type FieldSchema } from "../hooks/UseDynamicSchema"


// Object type definitions
export type ObjectType = "boat" | "trailer" | "motor"

// User role definitions
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    organization?: string
    organizations?: string[]
}

// Dynamic form state - fields determined by schema from backend
type InsuredObjectFormState = Record<string, any> & {
    // Only enforce essential fields that are always required
    objectType: ObjectType
    organization: string
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

// Generate default form state based on dynamic schema
function getDefaultFormState(objectType: ObjectType, schema: FieldSchema[] | null): InsuredObjectFormState {
    const baseState: InsuredObjectFormState = {
        objectType,
        organization: "",
    }

    // If no schema available, return minimal state
    if (!schema) {
        return {
            ...baseState,
            waarde: 0,
            ingangsdatum: "",
        }
    }

    // Build form state from schema for this specific object type (shows all user input fields for create forms)
    const fieldsForType = getFieldsFromSchemaForCreateForm(schema, objectType)
    
    fieldsForType.forEach(field => {
        // Set default values based on field type
        switch (field.type) {
            case "number":
                baseState[field.key] = field.key === "bouwjaar" ? new Date().getFullYear() : 
                                     field.key === "aantalMotoren" ? 1 : 
                                     field.key === "aantalVerzekerdeDagen" ? 365 : 0
                break
            case "currency":
                baseState[field.key] = 0
                break
            case "date":
                // Set ingangsdatum to today by default, others empty
                baseState[field.key] = field.key === "ingangsdatum" ? "" : ""
                break
            case "dropdown":
                baseState[field.key] = ""  // Empty string for dropdown - user must select
                break
            case "text":
            case "textarea":
            default:
                baseState[field.key] = ""
                break
        }
    })

    return baseState
}


// Get fields to render based on dynamic schema - using schema as single source of truth
// For CREATE FORMS: Show ALL user input fields regardless of organization visible setting
function getFieldsFromSchemaForCreateForm(schema: FieldSchema[] | null, objectType: ObjectType): FieldSchema[] {
    console.log("🔍 getFieldsFromSchemaForCreateForm DEBUG START")
    console.log("Schema received:", schema)
    console.log("Object type:", objectType)
    
    if (!schema) {
        console.log("❌ No schema provided, returning empty array")
        return []
    }
    
    console.log("📊 Total fields in schema:", schema.length)
    console.log("📋 All schema fields:", schema.map(f => ({ key: f.key, label: f.label, objectTypes: f.objectTypes, visible: f.visible, inputType: f.inputType })))
    
    // Filter for this object type
    const fieldsForType = schema.filter(field => {
        if (!objectType) return !field.objectTypes || field.objectTypes.length === 0
        return !field.objectTypes || field.objectTypes.includes(objectType)
    })
    
    console.log("🎯 Fields matching object type '" + objectType + "':", fieldsForType.length)
    console.log("🎯 Fields for type:", fieldsForType.map(f => ({ key: f.key, label: f.label, objectTypes: f.objectTypes, visible: f.visible, inputType: f.inputType })))
    
    // Show ALL user input fields regardless of visible setting (for create forms only)
    const finalFields = fieldsForType.filter(field => {
        const isUserField = field.inputType === 'user'
        const isNotOrganizationField = !field.objectTypes || !field.objectTypes.includes('organization')
        
        console.log(`🔎 Field ${field.key}: isUserField=${isUserField}, isNotOrganizationField=${isNotOrganizationField}, inputType=${field.inputType}, objectTypes=${JSON.stringify(field.objectTypes)}`)
        
        // IMPORTANT: Do NOT check field.visible here - create forms show all user input fields
        return isUserField && isNotOrganizationField
    })
    
    console.log("✅ Final filtered fields for create form:", finalFields.length)
    console.log("✅ Final fields:", finalFields.map(f => ({ key: f.key, label: f.label, visible: f.visible, required: f.required })))
    console.log("🔍 getFieldsFromSchemaForCreateForm DEBUG END")
    
    return finalFields
}

// Legacy function for backward compatibility (used by list view)
function getFieldsFromSchema(schema: FieldSchema[] | null, objectType: ObjectType): FieldSchema[] {
    return getUserInputFieldsForObjectType(schema, objectType)
}


// Object Type Selector Component
export function ObjectTypeSelector({
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
export function OrganizationSelector({
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
    compatibilityMode = 'advanced',
    payloadFormat = 'cleaned',
    dateHandling = 'auto',
}: {
    objectType: ObjectType
    selectedOrganization: string
    onClose: () => void
    onBack: () => void
    onSuccess?: () => void
    
    // Compatibility props for list file integration
    compatibilityMode?: 'simple' | 'advanced'
    payloadFormat?: 'simple' | 'cleaned'
    dateHandling?: 'auto' | 'today'
}) {
    const config = OBJECT_TYPE_CONFIG[objectType]
    const [form, setForm] = React.useState<InsuredObjectFormState>(() => {
        // Initialize with minimal state - will be updated when schema loads
        return {
            objectType,
            organization: selectedOrganization,
        }
    })
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isLoadingConfig, setIsLoadingConfig] = React.useState(config.useOrgConfig)
    // Legacy state removed - now using useDynamicSchema hook
    
    // Use organization-specific schema but show ALL user input fields in create form
    const { schema: orgSchema, loading: schemaLoading, error: schemaError } = useDynamicSchema(selectedOrganization)

    // Legacy functions removed - now using useDynamicSchema hook

    // Update form state when schema loads
    React.useEffect(() => {
        console.log("🔄 Schema loading effect triggered")
        console.log("Schema loading:", schemaLoading)
        console.log("Schema error:", schemaError)
        console.log("Org schema:", orgSchema)
        console.log("Object type:", objectType)
        console.log("Selected organization:", selectedOrganization)
        
        setIsLoadingConfig(schemaLoading)
        
        if (schemaError) {
            console.log("❌ Schema error detected:", schemaError)
            setError("Kon schema niet laden: " + schemaError)
        }
        
        // Initialize form with schema-based defaults when schema is loaded
        if (orgSchema && !schemaLoading) {
            console.log("✅ Schema loaded, initializing form with defaults")
            const defaultState = getDefaultFormState(objectType, orgSchema)
            console.log("🎯 Default form state generated:", defaultState)
            
            setForm(prevForm => ({
                ...defaultState,
                organization: selectedOrganization,
                // Handle date initialization based on compatibility mode
                ingangsdatum: dateHandling === 'today' 
                    ? new Date().toISOString().split('T')[0] 
                    : (defaultState.ingangsdatum || new Date().toISOString().split('T')[0]),
                // Preserve any existing form data
                ...prevForm,
            }))
        }
    }, [schemaLoading, schemaError, orgSchema, objectType, selectedOrganization])

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
        const { name, value, type } = e.target
        setError(null)
        setSuccess(null)
        
        const formValue = type === "number" ? (value === "" ? "" : parseFloat(value)) : value
        
        setForm((prev) => {
            const updated = {
                ...prev,
                [name]: formValue,
            }
            
            // No field synchronization needed - using registry field names directly
            
            return updated
        })
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()


        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            // Prepare API payload based on compatibility mode
            let apiPayload: any
            
            if (payloadFormat === 'simple') {
                // Simple payload (list file behavior) - send form data directly
                apiPayload = { ...form }
            } else {
                // Advanced payload (create file behavior) - clean up empty values
                apiPayload = { ...form }
                Object.keys(apiPayload).forEach(key => {
                    if (apiPayload[key] === "" || apiPayload[key] === null || apiPayload[key] === undefined) {
                        delete apiPayload[key]
                    }
                })
            }

            // Debug logging - now fully dynamic
            const fieldsToRenderForDebug = getFieldsFromSchemaForCreateForm(orgSchema, objectType)
            console.log("=== FORM SUBMISSION DEBUG ===")
            console.log("Object Type:", objectType)
            console.log("Form data:", form)
            console.log("Fields to render:", fieldsToRenderForDebug.map(f => ({ key: f.key, label: f.label, required: f.required })))
            console.log("API Payload:", apiPayload)
            console.log("Payload keys:", Object.keys(apiPayload))
            console.log("Required fields filled:", 
                fieldsToRenderForDebug
                    .filter(f => f.required)
                    .map(f => ({ key: f.key, label: f.label, value: apiPayload[f.key], filled: !!apiPayload[f.key] }))
            )
            console.log("=== END DEBUG ===")

            const res = await fetch(API_BASE_URL + API_PATHS.INSURED_OBJECT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getIdToken()}`,
                },
                body: JSON.stringify(apiPayload),
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
        const val = form[field.key]

        // Skip objectType, organization fields (handled automatically by form logic)
        if (field.key === "objectType" || field.key === "organization") return null
        
        // All system/auto field filtering is now handled by getFieldsFromSchema()
        // No need for hardcoded exclusions here

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
                    {field.required && <span style={{ color: colors.red, marginLeft: "4px" }}>*</span>}
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
    const fieldsToRender = getFieldsFromSchemaForCreateForm(orgSchema, objectType)
    
    console.log("🎨 RENDER DEBUG - InsuredObjectForm")
    console.log("Org schema available:", !!orgSchema)
    console.log("Schema loading:", schemaLoading)
    console.log("Object type:", objectType)
    console.log("Selected organization:", selectedOrganization)
    console.log("Fields to render count:", fieldsToRender.length)
    console.log("Fields to render:", fieldsToRender.map(f => ({ key: f.key, label: f.label, type: f.type, required: f.required })))

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
                {fieldsToRender.length === 0 && !isLoadingConfig ? (
                    <div style={{
                        padding: "24px",
                        textAlign: "center",
                        color: colors.gray500,
                        backgroundColor: colors.gray50,
                        borderRadius: "8px",
                        border: `1px solid ${colors.gray200}`,
                        marginBottom: "24px",
                    }}>
                        Geen formuliervelden beschikbaar. Controleer de organisatieconfiguratie of neem contact op met de beheerder.
                    </div>
                ) : (
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
                )}

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

// Compatible CreateObjectModal for list file integration
export function CreateObjectModal({ 
    onClose, 
    onOrganizationSelect,
    onSuccess = () => window.location.reload()
}: {
    onClose: () => void
    onOrganizationSelect?: (org: string) => void  
    onSuccess?: () => void
}) {
    const [currentStep, setCurrentStep] = React.useState<"organization" | "selector" | "form">("organization")
    const [selectedType, setSelectedType] = React.useState<ObjectType | null>(null)
    const [selectedOrganization, setSelectedOrganization] = React.useState<string | null>(null)
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
                            onOrganizationSelect?.(orgs[0])
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
        
        loadUserData()
    }, [])

    const handleOrganizationSelect = (organization: string) => {
        setSelectedOrganization(organization)
        onOrganizationSelect?.(organization)
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

    const handleSuccess = () => {
        onSuccess()
    }

    const overlay = ReactDOM.createPortal(
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
                    onClose={onClose}
                    onBack={onClose}
                />
            ) : userInfo && currentStep === "selector" ? (
                <ObjectTypeSelector 
                    onSelect={handleTypeSelect} 
                    onClose={onClose}
                    onBack={availableOrganizations.length > 1 ? handleBackToOrganization : onClose}
                />
            ) : userInfo && selectedType && selectedOrganization ? (
                <InsuredObjectForm
                    objectType={selectedType}
                    selectedOrganization={selectedOrganization}
                    onClose={onClose}
                    onBack={handleBackToSelector}
                    onSuccess={handleSuccess}
                    
                    // Use simple compatibility mode for list file integration
                    compatibilityMode="simple"
                    payloadFormat="simple" 
                    dateHandling="today"
                />
            ) : null}
        </div>,
        document.body
    )

    return overlay
}

// Export Override
export function InsuredObjectFormApp(): Override {
    return {
        children: <InsuredObjectFormManager />,
    }
}