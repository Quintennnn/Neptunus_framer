// src/CreatePolicyOverride.tsx
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes } from "react-icons/fa"
import { colors, styles, hover, animations } from "../Theme.tsx"
import { 
    API_BASE_URL, 
    API_PATHS, 
    getIdToken, 
    formatErrorMessage, 
    formatSuccessMessage,
    validateRequired,
    isValidContactInfo,
    apiRequest
} from "../Utils.tsx"

// Define our form state shape for a Policy
type PolicyFormState = {
    klantnaam: string
    inventaristype: string
    openstaandeAanpassingen: string
    polisnummer: string
    makelaarsnaam: string
    makelaarsemail: string
    makelaarstelefoon: string
    organization: string
}

// Validation helper
function validateForm(form: PolicyFormState): string[] {
    const errors: string[] = []

    const clientNameError = validateRequired(form.klantnaam, "Klant naam")
    if (clientNameError) errors.push(clientNameError)
    
    const policyNumberError = validateRequired(form.polisnummer, "Polis nummer")
    if (policyNumberError) errors.push(policyNumberError)
    
    const organizationError = validateRequired(form.organization, "Organization")
    if (organizationError) errors.push(organizationError)
    
    // Validate email if provided
    if (form.makelaarsemail && !isValidEmail(form.makelaarsemail)) {
        errors.push("Makelaar e-mail moet een geldig e-mailadres zijn")
    }
    
    // Validate phone if provided
    if (form.makelaarstelefoon && !isValidPhone(form.makelaarstelefoon)) {
        errors.push("Makelaar telefoon moet een geldig telefoonnummer zijn")
    }

    return errors
}

// Helper functions for validation
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

function isValidPhone(phone: string): boolean {
    const phoneRegex = /^[\d\s\-\+\(\)]+$/
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 8
}


// Add type for organization
type Organization = {
    id: string
    name: string
    is_superorg: boolean
    createdAt: string
    updatedAt: string
    lastUpdatedBy: string
    boat_fields_config: any
}

// Core form component with enhanced styling
function PolicyForm({
    onClose,
    onSuccess,
}: {
    onClose: () => void
    onSuccess?: () => void
}) {
    const [form, setForm] = React.useState<PolicyFormState>({
        klantnaam: "",
        inventaristype: "",
        openstaandeAanpassingen: "",
        polisnummer: "",
        makelaarsnaam: "",
        makelaarsemail: "",
        makelaarstelefoon: "",
        organization: "",
    })
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)
    const [organizations, setOrganizations] = React.useState<Organization[]>([])
    const [isLoadingOrganizations, setIsLoadingOrganizations] = React.useState(true)

    // Fetch organizations on component mount
    React.useEffect(() => {
        async function fetchOrganizations() {
            try {
                const data = await apiRequest(API_PATHS.ORGANIZATION)
                if (data.organizations) {
                    setOrganizations(data.organizations)
                } else {
                    setError("Failed to load organizations")
                }
            } catch (err: any) {
                setError(formatErrorMessage(err))
            } finally {
                setIsLoadingOrganizations(false)
            }
        }

        fetchOrganizations()
    }, [])

    function handleChange(
        e: React.ChangeEvent<
            HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
    ) {
        const { name, value } = e.target
        setError(null)
        setSuccess(null)
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        // Client-side validation
        const validationErrors = validateForm(form)
        if (validationErrors.length > 0) {
            setError(validationErrors.join("\n"))
            return
        }

        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            const data = await apiRequest(API_PATHS.POLICY, {
                method: "POST",
                body: JSON.stringify(form),
            })
            
            setSuccess(formatSuccessMessage(data, "Policy"))
            // Auto-close after success
            setTimeout(() => {
                onSuccess?.()
                onClose()
            }, 2000)
        } catch (err: any) {
            setError(formatErrorMessage(err))
        } finally {
            setIsSubmitting(false)
        }
    }

    // Define the field configuration type
    type FieldConfig = {
        type: "text" | "textarea" | "select" | "email" | "tel"
        placeholder?: string
        required?: boolean
        options?: string[]
        loading?: boolean
    }

    // Form field configurations for better UX
    const fieldConfigs: Record<keyof PolicyFormState, FieldConfig> = {
        klantnaam: {
            type: "text",
            placeholder: "Voer klantnaam in",
            required: true,
        },
        polisnummer: {
            type: "text",
            placeholder: "bijv., POL-2025-001",
            required: true,
        },
        organization: {
            type: "select",
            options: organizations.map(org => org.name),
            required: true,
            loading: isLoadingOrganizations,
        },
        inventaristype: {
            type: "select",
            options: ["Boat", "Car", "Property", "Equipment", "Other"],
            placeholder: "Selecteer inventaristype",
        },
        makelaarsnaam: { type: "text", placeholder: "Voer makelaarsnaam in" },
        makelaarsemail: { type: "email", placeholder: "Voer makelaar e-mailadres in" },
        makelaarstelefoon: { type: "tel", placeholder: "Voer makelaar telefoonnummer in" },
        openstaandeAanpassingen: {
            type: "textarea",
            placeholder: "Beschrijf eventuele lopende aanpassingen",
        },
    }

    return (
        <div
            style={{
                ...styles.modal,
                width: "min(90vw, 700px)",
                maxHeight: "90vh",
                padding: "32px",
            }}
        >
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.title}>
                    Nieuwe Polis Aanmaken
                </div>
                <button
                    onClick={onClose}
                    style={styles.iconButton}
                    onMouseEnter={(e) => hover.iconButton(e.target as HTMLElement)}
                    onMouseLeave={(e) => hover.resetIconButton(e.target as HTMLElement)}
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
            <form
                onSubmit={handleSubmit}
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
                    gap: "20px",
                }}
            >
                {Object.entries(form).map(([key, val]) => {
                    const config = fieldConfigs[
                        key as keyof PolicyFormState
                    ] || { type: "text" as const }
                    
                    // Dutch field labels
                    const fieldLabels: Record<keyof PolicyFormState, string> = {
                        klantnaam: "Klant Naam",
                        inventaristype: "Inventaris Type",
                        openstaandeAanpassingen: "Openstaande Aanpassingen",
                        polisnummer: "Polis Nummer",
                        makelaarsnaam: "Makelaar Naam",
                        makelaarsemail: "Makelaar E-mail",
                        makelaarstelefoon: "Makelaar Telefoon",
                        organization: "Organisatie"
                    }
                    
                    const label = fieldLabels[key as keyof PolicyFormState] || key
                        .replace(/_/g, " ")
                        .replace(/^\w/, (c) => c.toUpperCase())
                    const isTextarea = config.type === "textarea"
                    const isSelect = config.type === "select"

                    return (
                        <div
                            key={key}
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gridColumn: isTextarea ? "1 / -1" : "auto",
                            }}
                        >
                            <label
                                htmlFor={key}
                                style={styles.label}
                            >
                                {label}
                                {config.required && (
                                    <span style={{ color: colors.error }}>*</span>
                                )}
                            </label>

                            {isTextarea ? (
                                <textarea
                                    id={key}
                                    name={key}
                                    value={val as string}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    placeholder={config.placeholder}
                                    rows={3}
                                    style={{
                                        ...styles.input,
                                        resize: "vertical",
                                        backgroundColor: isSubmitting
                                            ? colors.gray50
                                            : colors.white,
                                        cursor: isSubmitting
                                            ? "not-allowed"
                                            : "text",
                                    }}
                                    onFocus={(e) =>
                                        !isSubmitting &&
                                        hover.input(e.target as HTMLElement)
                                    }
                                    onBlur={(e) =>
                                        hover.resetInput(e.target as HTMLElement)
                                    }
                                />
                            ) : isSelect ? (
                                <select
                                    id={key}
                                    name={key}
                                    value={val as string}
                                    onChange={handleChange}
                                    disabled={isSubmitting || (key === 'organization' && isLoadingOrganizations)}
                                    style={{
                                        ...styles.input,
                                        backgroundColor: isSubmitting || (key === 'organization' && isLoadingOrganizations)
                                            ? colors.gray50
                                            : colors.white,
                                        cursor: isSubmitting || (key === 'organization' && isLoadingOrganizations)
                                            ? "not-allowed"
                                            : "pointer",
                                    }}
                                    onFocus={(e) =>
                                        !isSubmitting && !(key === 'organization' && isLoadingOrganizations) &&
                                        hover.input(e.target as HTMLElement)
                                    }
                                    onBlur={(e) =>
                                        hover.resetInput(e.target as HTMLElement)
                                    }
                                >
                                    <option value="">
                                        {key === 'organization' && isLoadingOrganizations 
                                            ? "Organisaties laden..." 
                                            : config.placeholder || `Selecteer ${label.toLowerCase()}`}
                                    </option>
                                    {config.options?.map((option) => (
                                        <option key={option} value={option}>
                                            {option}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <input
                                    id={key}
                                    name={key}
                                    type={config.type}
                                    value={val as string}
                                    onChange={handleChange}
                                    disabled={isSubmitting}
                                    placeholder={config.placeholder}
                                    style={{
                                        ...styles.input,
                                        backgroundColor: isSubmitting
                                            ? colors.gray50
                                            : colors.white,
                                        cursor: isSubmitting
                                            ? "not-allowed"
                                            : "text",
                                    }}
                                    onFocus={(e) =>
                                        !isSubmitting &&
                                        hover.input(e.target as HTMLElement)
                                    }
                                    onBlur={(e) =>
                                        hover.resetInput(e.target as HTMLElement)
                                    }
                                />
                            )}
                        </div>
                    )
                })}

                {/* Submit Buttons */}
                <div
                    style={{
                        gridColumn: "1 / -1",
                        ...styles.buttonGroup,
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            ...styles.secondaryButton,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                        onMouseEnter={(e) =>
                            !isSubmitting &&
                            hover.secondaryButton(e.target as HTMLElement)
                        }
                        onMouseLeave={(e) =>
                            hover.resetSecondaryButton(e.target as HTMLElement)
                        }
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: isSubmitting
                                ? colors.disabled
                                : colors.primary,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                        }}
                        onMouseEnter={(e) =>
                            !isSubmitting &&
                            hover.primaryButton(e.target as HTMLElement)
                        }
                        onMouseLeave={(e) =>
                            !isSubmitting &&
                            hover.resetPrimaryButton(e.target as HTMLElement)
                        }
                    >
                        {isSubmitting ? (
                            <>
                                <div style={styles.spinner} />
                                Aanmaken...
                            </>
                        ) : (
                            <>
                                <FaPlus size={12} />
                                Polis Aanmaken
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Add spinning animation for loading spinner */}
            <style>
                {animations}
            </style>
        </div>
    )
}

// Enhanced trigger button component
function PolicyFormManager() {
    const [showForm, setShowForm] = React.useState(false)

    const handleSuccess = () => {
        // You could add a callback here to refresh the policy list
        // or show a global success notification
        console.log("Policy created successfully!")
    }

    const overlay = showForm
        ? ReactDOM.createPortal(
              <div style={styles.modalOverlay}>
                  <PolicyForm
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
                    ...styles.primaryButton,
                    padding: "12px 20px",
                    boxShadow: `0 4px 12px ${colors.primary}4D`,
                }}
                onMouseEnter={(e) => {
                    hover.primaryButton(e.target as HTMLElement)
                    ;(e.target as HTMLElement).style.transform = "translateY(-1px)"
                    ;(e.target as HTMLElement).style.boxShadow = `0 6px 16px ${colors.primary}66`
                }}
                onMouseLeave={(e) => {
                    hover.resetPrimaryButton(e.target as HTMLElement)
                    ;(e.target as HTMLElement).style.transform = "translateY(0)"
                    ;(e.target as HTMLElement).style.boxShadow = `0 4px 12px ${colors.primary}4D`
                }}
            >
                <FaPlus size={14} />
                Create New Policy
            </button>
            {overlay}
        </Frame>
    )
}

// Export Override
export function PolicyFormApp(): Override {
    return {
        children: <PolicyFormManager />,
    }
}
