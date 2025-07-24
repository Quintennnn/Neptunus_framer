// src/CreatePolicyOverride.tsx
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes } from "react-icons/fa"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const POLICY_PATH = "/neptunus/policy"
const ORGANIZATIONS_PATH = "/neptunus/organization"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

// Define our form state shape for a Policy
type PolicyFormState = {
    client_name: string
    inventory_type: string
    pending_adjustments: string
    policy_number: string
    broker_name: string
    broker_contact: string
    organization: string
}

// Validation helper
function validateForm(form: PolicyFormState): string[] {
    const errors: string[] = []

    if (!form.client_name.trim()) errors.push("Client name is required")
    if (!form.policy_number.trim()) errors.push("Policy number is required")
    if (!form.organization.trim()) errors.push("Organization is required")
    if (
        form.broker_contact &&
        !form.broker_contact.includes("@") &&
        !form.broker_contact.match(/^\+?[\d\s-()]+$/)
    ) {
        errors.push("Broker contact should be a valid email or phone number")
    }

    return errors
}

// Enhanced error formatting
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

// Enhanced success formatting
function formatSuccessMessage(data: any): string {
    if (typeof data === "string") return data
    if (data && typeof data === "object") {
        if (data.message) return data.message
        if (data.id) return `Policy created successfully!`
        return "Policy has been created successfully!"
    }
    return "Operation completed successfully!"
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
        client_name: "",
        inventory_type: "",
        pending_adjustments: "",
        policy_number: "",
        broker_name: "",
        broker_contact: "",
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
                const res = await fetch(API_BASE_URL + ORGANIZATIONS_PATH, {
                    headers: {
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                })
                const data = await res.json()

                if (res.ok && data.organizations) {
                    setOrganizations(data.organizations)
                } else {
                    setError("Failed to load organizations")
                }
            } catch (err: any) {
                setError("Failed to load organizations: " + err.message)
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
            const res = await fetch(API_BASE_URL + POLICY_PATH, {
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
            setError(err.message || "Failed to submit form. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Form field configurations for better UX
    const fieldConfigs = {
        client_name: {
            type: "text",
            placeholder: "Enter client name",
            required: true,
        },
        policy_number: {
            type: "text",
            placeholder: "e.g., POL-2025-001",
            required: true,
        },
        organization: {
            type: "select",
            options: organizations.map(org => org.name),
            required: true,
            loading: isLoadingOrganizations,
        },
        inventory_type: {
            type: "select",
            options: ["Boat", "Car", "Property", "Equipment", "Other"],
            placeholder: "Select inventory type",
        },
        broker_name: { type: "text", placeholder: "Enter broker name" },
        broker_contact: { type: "text", placeholder: "Email or phone number" },
        pending_adjustments: {
            type: "textarea",
            placeholder: "Describe any pending adjustments",
        },
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
                    Create New Policy
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
                    onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#f3f4f6")
                    }
                    onMouseOut={(e) =>
                        (e.target.style.backgroundColor = "transparent")
                    }
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
                        key as keyof typeof fieldConfigs
                    ] || { type: "text" }
                    const label = key
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
                                style={{
                                    marginBottom: "8px",
                                    fontSize: "14px",
                                    fontWeight: "500",
                                    color: "#374151",
                                }}
                            >
                                {label}
                                {config.required && (
                                    <span style={{ color: "#ef4444" }}>*</span>
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
                                        padding: "12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: FONT_STACK,
                                        resize: "vertical",
                                        transition: "border-color 0.2s",
                                        backgroundColor: isSubmitting
                                            ? "#f9fafb"
                                            : "#fff",
                                        cursor: isSubmitting
                                            ? "not-allowed"
                                            : "text",
                                    }}
                                    onFocus={(e) =>
                                        !isSubmitting &&
                                        (e.target.style.borderColor = "#3b82f6")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor = "#d1d5db")
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
                                        padding: "12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: FONT_STACK,
                                        transition: "border-color 0.2s",
                                        backgroundColor: isSubmitting || (key === 'organization' && isLoadingOrganizations)
                                            ? "#f9fafb"
                                            : "#fff",
                                        cursor: isSubmitting || (key === 'organization' && isLoadingOrganizations)
                                            ? "not-allowed"
                                            : "pointer",
                                    }}
                                    onFocus={(e) =>
                                        !isSubmitting && !(key === 'organization' && isLoadingOrganizations) &&
                                        (e.target.style.borderColor = "#3b82f6")
                                    }
                                    onBlur={(e) =>
                                        (e.target.style.borderColor = "#d1d5db")
                                    }
                                >
                                    <option value="">
                                        {key === 'organization' && isLoadingOrganizations 
                                            ? "Loading organizations..." 
                                            : config.placeholder || `Select ${label.toLowerCase()}`}
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
                                        padding: "12px",
                                        border: "1px solid #d1d5db",
                                        borderRadius: "8px",
                                        fontSize: "14px",
                                        fontFamily: FONT_STACK,
                                        transition: "border-color 0.2s",
                                        backgroundColor: isSubmitting
                                            ? "#f9fafb"
                                            : "#fff",
                                        cursor: isSubmitting
                                            ? "not-allowed"
                                            : "text",
                                    }}
                                    onFocus={(e) =>
                                        !isSubmitting &&
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

                {/* Submit Buttons */}
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
                        onMouseOver={(e) =>
                            !isSubmitting &&
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
                        disabled={isSubmitting}
                        style={{
                            padding: "12px 24px",
                            backgroundColor: isSubmitting
                                ? "#9ca3af"
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
                        onMouseOver={(e) =>
                            !isSubmitting &&
                            (e.target.style.backgroundColor = "#059669")
                        }
                        onMouseOut={(e) =>
                            !isSubmitting &&
                            (e.target.style.backgroundColor = "#10b981")
                        }
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
                                Creating...
                            </>
                        ) : (
                            <>
                                <FaPlus size={12} />
                                Create Policy
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
function PolicyFormManager() {
    const [showForm, setShowForm] = React.useState(false)

    const handleSuccess = () => {
        // You could add a callback here to refresh the policy list
        // or show a global success notification
        console.log("Policy created successfully!")
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
                    e.target.style.backgroundColor = "#059669"
                    e.target.style.transform = "translateY(-1px)"
                    e.target.style.boxShadow =
                        "0 6px 16px rgba(16, 185, 129, 0.4)"
                }}
                onMouseOut={(e) => {
                    e.target.style.backgroundColor = "#10b981"
                    e.target.style.transform = "translateY(0)"
                    e.target.style.boxShadow =
                        "0 4px 12px rgba(16, 185, 129, 0.3)"
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
