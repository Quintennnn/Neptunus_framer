// src/CreateOrganizationOverride.tsx
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Frame, Override } from "framer"
import { FaPlus, FaTimes } from "react-icons/fa"
import { colors, styles, hover, animations, FONT_STACK } from "../theme"
import { 
    API_BASE_URL, 
    API_PATHS, 
    getIdToken, 
    formatErrorMessage, 
    formatSuccessMessage,
    validateRequired,
    validateStringLength
} from "../utils"

// Define our form state shape for an Organization
type OrganizationFormState = {
    name: string
    type_organisatie: string
    street?: string
    city?: string
    state?: string
    postal_code?: string
    country?: string
}

// Validation helper
function validateForm(form: OrganizationFormState): string[] {
    const errors: string[] = []

    const nameError = validateRequired(form.name, "Organization name") || 
                      validateStringLength(form.name, "Organization name", 2, 100)
    if (nameError) errors.push(nameError)

    const typeError = validateRequired(form.type_organisatie, "Organization type")
    if (typeError) errors.push(typeError)

    return errors
}


// Core form component with enhanced styling
function OrganizationForm({
    onClose,
    onSuccess,
}: {
    onClose: () => void
    onSuccess?: () => void
}) {
    const [form, setForm] = React.useState<OrganizationFormState>({
        name: "",
        type_organisatie: "",
        street: "",
        city: "",
        state: "",
        postal_code: "",
        country: "",
    })
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
        const { name, value, type } = e.target
        setError(null)
        setSuccess(null)
        
        setForm((prev) => ({ ...prev, [name]: value || undefined }))
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
            // Create organization
            const payload = {
                name: form.name,
                type_organisatie: form.type_organisatie,
                street: form.street || undefined,
                city: form.city || undefined,
                state: form.state || undefined,
                postal_code: form.postal_code || undefined,
                country: form.country || undefined,
            }
            
            const res = await fetch(API_BASE_URL + API_PATHS.ORGANIZATION, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getIdToken()}`,
                },
                body: JSON.stringify(payload),
            })

            if (!res.ok) {
                const data = await res.json()
                throw new Error(formatErrorMessage(data))
            }

            setSuccess("Organization created successfully!")
            setTimeout(() => {
                onSuccess?.()
                onClose()
            }, 2000)
        } catch (err: any) {
            setError(err.message || "Failed to submit form. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "min(90vw, 600px)",
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
                    Nieuwe Organisatie Aanmaken
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
            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: "24px" }}>
                    <label
                        htmlFor="name"
                        style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                        }}
                    >
                        Organisatienaam
                        <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={form.name}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        placeholder="Voer organisatienaam in"
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
                        onFocus={(e) =>
                            !isSubmitting &&
                            (e.target.style.borderColor = "#10b981")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    />
                </div>

                {/* Organization Type Dropdown */}
                <div style={{ marginBottom: "24px" }}>
                    <label
                        htmlFor="type_organisatie"
                        style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151",
                        }}
                    >
                        Type Organisatie
                        <span style={{ color: "#ef4444" }}>*</span>
                    </label>
                    <select
                        id="type_organisatie"
                        name="type_organisatie"
                        value={form.type_organisatie}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        style={{
                            width: "100%",
                            padding: "12px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontFamily: FONT_STACK,
                            transition: "border-color 0.2s",
                            backgroundColor: isSubmitting ? "#f9fafb" : "#fff",
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            boxSizing: "border-box",
                        }}
                        onFocus={(e) =>
                            !isSubmitting &&
                            (e.target.style.borderColor = "#10b981")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                    >
                        <option value="" disabled>
                            Selecteer type organisatie
                        </option>
                        <option value="Huur">Huur</option>
                        <option value="Handelsvoorraad">Handelsvoorraad</option>
                    </select>
                </div>

                {/* Address Fields */}
                <div style={{ marginBottom: "24px" }}>
                    <h3 style={{
                        fontSize: "16px",
                        fontWeight: "600",
                        color: "#374151",
                        marginBottom: "16px",
                        borderBottom: "1px solid #e5e7eb",
                        paddingBottom: "8px"
                    }}>
                        Adresgegevens (Optioneel)
                    </h3>
                    
                    <div style={{ marginBottom: "16px" }}>
                        <label htmlFor="street" style={{
                            display: "block",
                            marginBottom: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            color: "#374151"
                        }}>
                            Straat
                        </label>
                        <input
                            id="street"
                            name="street"
                            type="text"
                            value={form.street || ""}
                            onChange={handleChange}
                            disabled={isSubmitting}
                            placeholder="Voer straatnaam en huisnummer in"
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
                            onFocus={(e) => !isSubmitting && (e.target.style.borderColor = "#10b981")}
                            onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                        />
                    </div>

                    <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
                        <div style={{ flex: "2" }}>
                            <label htmlFor="city" style={{
                                display: "block",
                                marginBottom: "8px",
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#374151"
                            }}>
                                Stad
                            </label>
                            <input
                                id="city"
                                name="city"
                                type="text"
                                value={form.city || ""}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                placeholder="Voer stad in"
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
                                onFocus={(e) => !isSubmitting && (e.target.style.borderColor = "#10b981")}
                                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                            />
                        </div>
                        <div style={{ flex: "1" }}>
                            <label htmlFor="postal_code" style={{
                                display: "block",
                                marginBottom: "8px",
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#374151"
                            }}>
                                Postcode
                            </label>
                            <input
                                id="postal_code"
                                name="postal_code"
                                type="text"
                                value={form.postal_code || ""}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                placeholder="1234AB"
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
                                onFocus={(e) => !isSubmitting && (e.target.style.borderColor = "#10b981")}
                                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                            />
                        </div>
                    </div>

                    <div style={{ display: "flex", gap: "12px" }}>
                        <div style={{ flex: "1" }}>
                            <label htmlFor="state" style={{
                                display: "block",
                                marginBottom: "8px",
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#374151"
                            }}>
                                Provincie/Staat
                            </label>
                            <input
                                id="state"
                                name="state"
                                type="text"
                                value={form.state || ""}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                placeholder="Voer provincie/staat in"
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
                                onFocus={(e) => !isSubmitting && (e.target.style.borderColor = "#10b981")}
                                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                            />
                        </div>
                        <div style={{ flex: "1" }}>
                            <label htmlFor="country" style={{
                                display: "block",
                                marginBottom: "8px",
                                fontSize: "14px",
                                fontWeight: "500",
                                color: "#374151"
                            }}>
                                Land
                            </label>
                            <input
                                id="country"
                                name="country"
                                type="text"
                                value={form.country || ""}
                                onChange={handleChange}
                                disabled={isSubmitting}
                                placeholder="Nederland"
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
                                onFocus={(e) => !isSubmitting && (e.target.style.borderColor = "#10b981")}
                                onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
                            />
                        </div>
                    </div>
                </div>

                {/* Submit Buttons */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: "12px",
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
                        Annuleren
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
                                Aanmaken...
                            </>
                        ) : (
                            <>
                                <FaPlus size={12} />
                                Organisatie Aanmaken
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

// Export the OrganizationForm component for use in other files
export { OrganizationForm }

// Enhanced trigger button component
function OrganizationFormManager() {
    const [showForm, setShowForm] = React.useState(false)

    const handleSuccess = () => {
        // You could add a callback here to refresh the organization list
        // or show a global success notification
        console.log("Organization created successfully!")
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
                  <OrganizationForm
                      onClose={() => setShowForm(false)}
                      onSuccess={handleSuccess}
                  />
              </div>,
              document.body
          )
        : null

    return (
        <Frame width="100%" height="100%" background="transparent">
            {/* Hidden trigger button that can be activated by the main page */}
            <button
                data-organization-create-btn
                onClick={() => setShowForm(true)}
                style={{
                    display: "none",
                }}
            >
                Hidden Create Button
            </button>
            {overlay}
        </Frame>
    )
}

// Export Override
export function OrganizationFormApp(): Override {
    return {
        children: <OrganizationFormManager />,
    }
}
