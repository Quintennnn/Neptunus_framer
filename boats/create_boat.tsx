import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes } from "react-icons/fa"
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

// Type for organization field configuration
type FieldConfig = {
    required: boolean
    visible: boolean
}

type OrganizationConfig = {
    organization: {
        id: string
        name: string
        boat_fields_config: Record<string, FieldConfig>
        [key: string]: any
    }
}

// Define our form state shape matching backend NeptunusBoatData
type BoatFormState = {
    mooringLocation: string
    numberOfEngines: number
    engineType: string
    boatBrand: string
    boatType: string
    yearOfConstruction: number
    value: number
    insuranceStartDate: string
    premiumPerMille: number
    deductible: number
    numberOfInsuredDays: number
    totalAnnualPremium: number
    totalPremiumForInsuredPeriod: number
    organization: string
    // Optional fields
    boatNumber?: string
    engineNumber?: string
    cinNumber?: string
    insuranceEndDate?: string
    notes?: string
}

// Validation helper - now takes organization config
function validateForm(
    form: BoatFormState,
    orgConfig?: Record<string, FieldConfig>
): string[] {
    const errors: string[] = []

    // If no org config provided, fall back to basic validation
    if (!orgConfig) {
        if (!form.mooringLocation.trim())
            errors.push("Mooring location is required")
        if (!form.engineType.trim()) errors.push("Engine type is required")
        if (!form.boatBrand.trim()) errors.push("Boat brand is required")
        if (!form.boatType.trim()) errors.push("Boat type is required")
        if (!form.insuranceStartDate)
            errors.push("Insurance start date is required")
        if (!form.organization.trim()) errors.push("Organization is required")

        const enginesError = validateNumberRange(form.numberOfEngines, "Number of engines", 1)
        if (enginesError) errors.push(enginesError)
        const yearError = validateYear(form.yearOfConstruction, "Year of construction")
        if (yearError) errors.push(yearError)
        const valueError = validateNumberRange(form.value, "Value", 1)
        if (valueError) errors.push(valueError)
        const premiumError = validateNumberRange(form.premiumPerMille, "Premium per mille", 0.01)
        if (premiumError) errors.push(premiumError)
        const deductibleError = validateNumberRange(form.deductible, "Deductible", 0)
        if (deductibleError) errors.push(deductibleError)
        const daysError = validateNumberRange(form.numberOfInsuredDays, "Number of insured days", 1)
        if (daysError) errors.push(daysError)

        return errors
    }

    // Validate based on organization configuration
    Object.entries(form).forEach(([fieldName, value]) => {
        const fieldConfig = orgConfig?.[fieldName]
        if (fieldConfig?.required) {
            // Check if field is empty based on type
            if (typeof value === "string" && !value.trim()) {
                const label = formatLabel(fieldName)
                errors.push(`${label} is required`)
            } else if (typeof value === "number") {
                // For required number fields, check if empty or invalid
                if (value === "" || isNaN(value)) {
                    const label = formatLabel(fieldName)
                    errors.push(`${label} is required`)
                } else if (value <= 0) {
                    // Only check greater than 0 if field has a value and is required
                    const label = formatLabel(fieldName)
                    errors.push(
                        `${label} must be a valid number greater than 0`
                    )
                }
            }
        }
    })

    // Additional business logic validations for visible fields
    if (
        orgConfig.yearOfConstruction?.visible &&
        orgConfig.yearOfConstruction?.required
    ) {
        if (
            form.yearOfConstruction <= 1900 ||
            form.yearOfConstruction > new Date().getFullYear()
        ) {
            errors.push(
                "Year of construction must be between 1900 and current year"
            )
        }
    }

    if (orgConfig.deductible?.visible && form.deductible < 0) {
        errors.push("Deductible cannot be negative")
    }

    return errors
}

// Helper functions moved to utils.ts

// Core form component with enhanced styling
function BoatForm({
    onClose,
    onSuccess,
}: {
    onClose: () => void
    onSuccess?: () => void
}) {
    const [form, setForm] = React.useState<BoatFormState>({
        mooringLocation: "",
        numberOfEngines: 1,
        engineType: "",
        boatBrand: "",
        boatType: "",
        yearOfConstruction: new Date().getFullYear(),
        value: 0,
        insuranceStartDate: "",
        premiumPerMille: 0,
        deductible: 0,
        numberOfInsuredDays: 365,
        totalAnnualPremium: 0,
        totalPremiumForInsuredPeriod: 0,
        organization: "",
        boatNumber: "",
        engineNumber: "",
        cinNumber: "",
        insuranceEndDate: "",
        notes: "",
    })
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [isLoadingConfig, setIsLoadingConfig] = React.useState(true)
    const [orgConfig, setOrgConfig] = React.useState<Record<
        string,
        FieldConfig
    > | null>(null)
    const [userOrganizationName, setUserOrganizationName] = React.useState<
        string | null
    >(null)

    // Function to fetch user's organization name
    async function fetchUserOrganization() {
        try {
            const token = getIdToken()
            if (!token) throw new Error("No id token found")

            const user_id = getUserId()
            if (!user_id) throw new Error("No user ID found")

            const response = await fetch(
                `${API_BASE_URL}${API_PATHS.USER}/${user_id}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            )

            if (response.ok) {
                const json = await response.json()
                const userData = json.user

                // Users are tied to a single organization, so take the first organization name
                const orgName =
                    userData.organizations && userData.organizations.length > 0
                        ? userData.organizations[0]
                        : null

                return orgName
            } else {
                console.warn(
                    "Failed to fetch user data:",
                    response.status,
                    response.statusText
                )
            }
        } catch (err) {
            console.warn("Could not fetch user organization:", err)
        }
        return null
    }

    // Function to fetch organization configuration
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
                const data: OrganizationConfig = await response.json()
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

    // Load organization configuration on component mount
    React.useEffect(() => {
        async function loadConfig() {
            setIsLoadingConfig(true)
            try {
                // First, try to get user's organization
                const orgName = await fetchUserOrganization()
                if (orgName) {
                    setUserOrganizationName(orgName)
                    // Set the organization in the form
                    setForm((prev) => ({ ...prev, organization: orgName }))

                    // Fetch the organization's field configuration
                    const config = await fetchOrganizationConfig(orgName)
                    if (config) {
                        setOrgConfig(config)
                    }
                } else {
                    // If we can't get user's org, provide more specific error
                    setError(
                        "Could not determine your organization. Please ensure you are logged in and assigned to an organization."
                    )
                }
            } catch (err) {
                setError("Failed to load organization configuration")
                console.error("Error loading org config:", err)
            } finally {
                setIsLoadingConfig(false)
            }
        }

        loadConfig()
    }, [])

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

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        // Client-side validation
        const validationErrors = validateForm(form, orgConfig || undefined)
        if (validationErrors.length > 0) {
            setError(validationErrors.join("\n"))
            return
        }

        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            const res = await fetch(API_BASE_URL + API_PATHS.BOAT, {
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
                setSuccess(formatSuccessMessage(data, "Boat insurance"))
                // Auto-close after success
                setTimeout(() => {
                    onSuccess?.()
                    onClose()
                }, 2000)
            }
        } catch (err: any) {
            setError(
                err.message ||
                    "Failed to submit form. Please check your connection and try again."
            )
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderInput = (key: string, val: any) => {
        // Check if field should be visible based on org config
        if (orgConfig && !orgConfig[key]?.visible) {
            return null // Don't render hidden fields
        }

        // Remove status field from rendering
        if (key === "status") return null

        const isNumber = typeof val === "number"
        const isTextArea = key === "notes"
        const inputType = isNumber
            ? "number"
            : /Date$/.test(key)
              ? "date"
              : "text"

        // Determine if field is required based on org config
        const isRequired = orgConfig
            ? orgConfig[key]?.required || false
            : [
                  "mooringLocation",
                  "engineType",
                  "boatBrand",
                  "boatType",
                  "insuranceStartDate",
                  "organization",
                  "numberOfEngines",
                  "yearOfConstruction",
                  "value",
                  "premiumPerMille",
                  "deductible",
                  "numberOfInsuredDays",
              ].includes(key)

        // Format label from camelCase to Title Case with spaces
        const label = formatLabel(key)

        const Component = isTextArea ? "textarea" : "input"

        return (
            <div
                key={key}
                style={{
                    marginBottom: "16px",
                    width: "100%",
                }}
            >
                <label htmlFor={key} style={styles.label}>
                    {label}
                    {isRequired && <span style={{ color: colors.error }}> *</span>}
                </label>
                <Component
                    id={key}
                    name={key}
                    value={val === null ? "" : val}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    required={isRequired}
                    {...(Component === "input"
                        ? { type: inputType }
                        : { rows: 3 })}
                    placeholder={`Enter ${label.toLowerCase()}`}
                    style={{
                        ...styles.input,
                        backgroundColor: isSubmitting ? colors.gray50 : colors.white,
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
                <div
                    style={{
                        marginBottom: "16px",
                        fontSize: "18px",
                        fontWeight: "500",
                    }}
                >
                    Loading form configuration...
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
                <style>
                    {`
                        @keyframes spin {
                            0% { transform: rotate(0deg); }
                            100% { transform: rotate(360deg); }
                        }
                    `}
                </style>
            </div>
        )
    }

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
                <div style={styles.title}>
                    Add New Boat
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
            {error && (
                <div style={styles.errorAlert}>
                    {error}
                </div>
            )}

            {/* Success Display */}
            {success && (
                <div style={styles.successAlert}>
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
                    {Object.entries(form).map(([key, val]) =>
                        renderInput(key, val)
                    )}
                </div>

                {/* Submit Buttons */}
                <div style={{ ...styles.buttonGroup, marginTop: "24px" }}>
                    <button
                        type="button"
                        onClick={onClose}
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
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: isSubmitting ? colors.disabled : colors.primary,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                hover.primaryButton(e.target as HTMLElement)
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) {
                                hover.resetPrimaryButton(e.target as HTMLElement)
                            }
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <div style={styles.spinner} />
                                Submitting...
                            </>
                        ) : (
                            <>
                                <FaPlus size={12} />
                                Add New Boat
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Add spinning animation for loading spinner */}
            <style>{animations}</style>
        </div>
    )
}

// Enhanced trigger button component
function BoatFormManager() {
    const [showForm, setShowForm] = React.useState(false)

    const handleSuccess = () => {
        // You could add a callback here to refresh the boat list
        // or show a global success notification
        console.log("Boat insurance created successfully!")
    }

    const overlay = showForm
        ? ReactDOM.createPortal(
              <div style={styles.modalOverlay}>
                  <BoatForm
                      onClose={() => setShowForm(false)}
                      onSuccess={handleSuccess}
                  />
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
                Add New Boat
            </button>
            {overlay}
        </Frame>
    )
}

// Export Override
export function BoatFormApp(): Override {
    return {
        children: <BoatFormManager />,
    }
}
