import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes } from "react-icons/fa"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const BOAT_PATH = "/neptunus/boat"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

// Define our form state shape matching backend NeptunusBoatData
type BoatFormState = {
    status: string
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

// Validation helper
function validateForm(form: BoatFormState): string[] {
    const errors: string[] = []

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
        status: "Pending",
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

    function handleChange(
        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) {
        const { name, value, type } = e.target
        setError(null)
        setSuccess(null)
        setForm((prev) => ({
            ...prev,
            [name]: type === "number" ? parseFloat(value) : value,
        }))
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
        const isNumber = typeof val === "number"
        const isTextArea = key === "notes"
        const inputType = isNumber
            ? "number"
            : /Date$/.test(key)
              ? "date"
              : "text"

        const isOptional = [
            "boatNumber",
            "engineNumber",
            "cinNumber",
            "insuranceEndDate",
            "notes",
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
                    {!isOptional && <span style={{ color: "#ef4444" }}>*</span>}
                </label>
                <Component
                    id={key}
                    name={key}
                    value={val === null ? "" : val}
                    onChange={handleChange}
                    disabled={isSubmitting}
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
                    Create New Boat Insurance
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
                            const target = e.target as HTMLElement
                            target.style.backgroundColor = "#f3f4f6"
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
                        onMouseOver={(e) => {
                            if (!isSubmitting) {
                                const target = e.target as HTMLElement
                                target.style.backgroundColor = "#2563eb"
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
                                Create Boat Insurance
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
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                }}
                onMouseOver={(e) => {
                    const target = e.target as HTMLElement
                    target.style.backgroundColor = "#2563eb"
                    target.style.transform = "translateY(-1px)"
                    target.style.boxShadow =
                        "0 6px 16px rgba(59, 130, 246, 0.4)"
                }}
                onMouseOut={(e) => {
                    const target = e.target as HTMLElement
                    target.style.backgroundColor = "#10b981"
                    target.style.transform = "translateY(0)"
                    target.style.boxShadow =
                        "0 4px 12px rgba(59, 130, 246, 0.3)"
                }}
            >
                <FaPlus size={14} />
                Create New Boat Insurance
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
