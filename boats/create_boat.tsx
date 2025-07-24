import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes } from "react-icons/fa"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const BOAT_PATH = "/neptunus/boat"
const ORGANIZATION_PATH = "/neptunus/organization"
const USER_PATH = "/neptunus/user"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

function getUserId(): string | null {
    return sessionStorage.getItem("userId")
}

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

        if (form.numberOfEngines <= 0)
            errors.push("Number of engines must be greater than 0")
        if (
            form.yearOfConstruction <= 1900 ||
            form.yearOfConstruction > new Date().getFullYear()
        )
            errors.push(
                "Year of construction must be between 1900 and current year"
            )
        if (form.value <= 0) errors.push("Value must be greater than 0")
        if (form.premiumPerMille <= 0)
            errors.push("Premium per mille must be greater than 0")
        if (form.deductible < 0) errors.push("Deductible cannot be negative")
        if (form.numberOfInsuredDays <= 0)
            errors.push("Number of insured days must be greater than 0")

        return errors
    }

    // Validate based on organization configuration
    Object.entries(form).forEach(([fieldName, value]) => {
        const fieldConfig = orgConfig?.[fieldName]
        if (fieldConfig?.required) {
            // Check if field is empty based on type
            if (typeof value === "string" && !value.trim()) {
                const label = fieldName
                    .replace(/([A-Z])/g, " $1")
                    .replace(/^./, (str) => str.toUpperCase())
                    .trim()
                errors.push(`${label} is required`)
            } else if (typeof value === "number") {
                // For required number fields, check if empty or invalid
                if (value === "" || isNaN(value)) {
                    const label = fieldName
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())
                        .trim()
                    errors.push(`${label} is required`)
                } else if (value <= 0) {
                    // Only check greater than 0 if field has a value and is required
                    const label = fieldName
                        .replace(/([A-Z])/g, " $1")
                        .replace(/^./, (str) => str.toUpperCase())
                        .trim()
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

// Helper function to parse and format error messages
function formatErrorMessage(error: any): string {
    if (typeof error === "string") return error
    if (error && typeof error === "object") {
        if (error.message) return error.message
        if (error.errors && Array.isArray(error.errors)) {
            return error.errors
                .map((err: any) =>
                    typeof err === "string"
                        ? err
                        : err.message || "Validation error"
                )
                .join("\n")
        }
        if (error.fieldErrors || error.validationErrors) {
            const fieldErrors = error.fieldErrors || error.validationErrors
            return Object.entries(fieldErrors)
                .map(([field, message]) => `${field}: ${message}`)
                .join("\n")
        }
        return JSON.stringify(error, null, 2)
    }
    return "An unexpected error occurred"
}

// Helper function to format success messages
function formatSuccessMessage(data: any): string {
    if (typeof data === "string") return data
    if (data && typeof data === "object") {
        if (data.message) return data.message
        if (data.id)
            return `Boat insurance created successfully! ID: ${data.id}`
        return "Boat insurance has been created successfully!"
    }
    return "Operation completed successfully!"
}

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
                `${API_BASE_URL}${USER_PATH}/${user_id}`,
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
                `${API_BASE_URL}${ORGANIZATION_PATH}/by-name/${organizationName}`,
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
            const res = await fetch(API_BASE_URL + BOAT_PATH, {
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
                setSuccess(formatSuccessMessage(data))
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
        const label = key
            .replace(/([A-Z])/g, " $1")
            .replace(/^./, (str) => str.toUpperCase())
            .trim()

        const Component = isTextArea ? "textarea" : "input"

        return (
            <div
                key={key}
                style={{
                    marginBottom: "16px",
                    width: "100%",
                }}
            >
                <label
                    htmlFor={key}
                    style={{
                        display: "block",
                        marginBottom: "8px",
                        fontSize: "14px",
                        fontWeight: "500",
                        color: "#374151",
                    }}
                >
                    {label}
                    {isRequired && <span style={{ color: "#dc2626" }}> *</span>}
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
                        width: "100%",
                        padding: "12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "14px",
                        fontFamily: FONT_STACK,
                        transition: "border-color 0.2s",
                        backgroundColor: isSubmitting ? "#f9fafb" : "#fff",
                        cursor: isSubmitting ? "not-allowed" : "text",
                        boxSizing: "border-box",
                    }}
                    onFocus={(e) => {
                        if (!isSubmitting) {
                            const target = e.target as HTMLElement
                            target.style.borderColor = "#10b981"
                        }
                    }}
                    onBlur={(e) => {
                        const target = e.target as HTMLElement
                        target.style.borderColor = "#d1d5db"
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
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(90vw, 400px)",
                    padding: "32px",
                    background: "#fff",
                    borderRadius: "16px",
                    boxShadow: "0 25px 70px rgba(0,0,0,0.15)",
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
                    Loading form configuration...
                </div>
                <div
                    style={{
                        display: "inline-block",
                        width: "20px",
                        height: "20px",
                        border: "2px solid #f3f3f3",
                        borderTop: "2px solid #10b981",
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
                    `}
                </style>
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
                width: "min(90vw, 800px)",
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
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "24px",
                }}
            >
                <div
                    style={{
                        fontSize: "24px",
                        fontWeight: "600",
                        color: "#1f2937",
                    }}
                >
                    Add New Boat
                </div>
                <button
                    onClick={onClose}
                    style={{
                        padding: "8px",
                        backgroundColor: "transparent",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        color: "#6b7280",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s",
                    }}
                    onMouseOver={(e) => {
                        const target = e.target as HTMLElement
                        target.style.backgroundColor = "#f3f4f6"
                    }}
                    onMouseOut={(e) => {
                        const target = e.target as HTMLElement
                        target.style.backgroundColor = "transparent"
                    }}
                >
                    <FaTimes size={16} />
                </button>
            </div>

            {/* Error Display */}
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

            {/* Success Display */}
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
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
                        paddingTop: "24px",
                        borderTop: "1px solid #e5e7eb",
                        marginTop: "24px",
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            fontFamily: FONT_STACK,
                            transition: "all 0.2s",
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = "#e5e7eb"
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = "#f3f4f6"
                            }
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: isSubmitting
                                ? "#6b7280"
                                : "#10b981",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            fontFamily: FONT_STACK,
                            transition: "all 0.2s",
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                        }}
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = "#059669"
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isSubmitting) {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = "#10b981"
                            }
                        }}
                    >
                        {isSubmitting ? (
                            <>
                                <div
                                    style={{
                                        width: "16px",
                                        height: "16px",
                                        border: "2px solid #ffffff",
                                        borderTop: "2px solid transparent",
                                        borderRadius: "50%",
                                        animation: "spin 1s linear infinite",
                                    }}
                                />
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
                    position: "absolute",
                    top: 20,
                    left: 20,
                    padding: "12px 20px",
                    backgroundColor: "#10b981",
                    color: "white",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontSize: "14px",
                    fontWeight: "500",
                    fontFamily: FONT_STACK,
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    transition: "all 0.2s",
                    boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                }}
                onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    target.style.backgroundColor = "#059669"
                    target.style.transform = "translateY(-1px)"
                    target.style.boxShadow =
                        "0 6px 16px rgba(16, 185, 129, 0.4)"
                }}
                onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    target.style.backgroundColor = "#10b981"
                    target.style.transform = "translateY(0)"
                    target.style.boxShadow =
                        "0 4px 12px rgba(16, 185, 129, 0.3)"
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
