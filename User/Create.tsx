// src/CreateUserOverride.tsx
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
    validateEmail,
    validateRequired
} from "../utils"

// Define our form state shape for a User
type UserFormState = {
    email: string
}

// Validation helper
function validateForm(form: UserFormState): string[] {
    const errors: string[] = []

    const emailError = validateEmail(form.email)
    if (emailError) errors.push(emailError)

    return errors
}


// Core form component with enhanced styling
function UserForm({
    onClose,
    onSuccess,
}: {
    onClose: () => void
    onSuccess?: () => void
}) {
    const [form, setForm] = React.useState<UserFormState>({
        email: "",
    })
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target
        setError(null)
        setSuccess(null)
        // Always convert email to lowercase to avoid case-sensitive issues with Cognito
        const processedValue = name === 'email' ? value.toLowerCase() : value
        setForm((prev) => ({ ...prev, [name]: processedValue }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        // Client-side validation
        const validationErrors = validateForm(form)
        if (validationErrors.length > 0) {
            setError(validationErrors.join("\n"))
            return
        }

        // Check if user is authenticated
        const token = getIdToken()
        if (!token) {
            setError(
                "Je moet ingelogd zijn om een gebruiker aan te maken. Log eerst in."
            )
            return
        }

        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            // Ensure email is lowercase before sending to API
            const payload = {
                ...form,
                email: form.email.toLowerCase()
            }
            console.log("Creating user with payload:", payload)
            const res = await fetch(API_BASE_URL + API_PATHS.SIGNUP, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            })
            const data = await res.json()

            console.log("User creation response:", data)

            if (!res.ok) {
                setError(formatErrorMessage(data))
            } else {
                setSuccess(formatSuccessMessage(data, "User"))
                // Auto-close after success
                setTimeout(() => {
                    onSuccess?.()
                    onClose()
                }, 2000)
            }
        } catch (err: any) {
            console.error("User creation error:", err)
            setError(err.message || "Failed to submit form. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div
            style={{
                ...styles.modal,
                width: "min(90vw, 500px)",
                maxHeight: "90vh",
                padding: "32px",
            }}
        >
            {/* Header */}
            <div style={styles.header}>
                <div style={styles.title}>
                    Nieuwe Gebruiker Aanmaken
                </div>
                <button
                    onClick={onClose}
                    style={styles.iconButton}
                    onMouseOver={(e) => hover.iconButton(e.currentTarget)}
                    onMouseOut={(e) => hover.resetIconButton(e.currentTarget)}
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
                <div style={{ marginBottom: "24px" }}>
                    <label htmlFor="email" style={styles.label}>
                        E-mailadres
                        <span style={{ color: colors.error }}>*</span>
                    </label>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={handleChange}
                        disabled={isSubmitting}
                        placeholder="Voer e-mailadres gebruiker in"
                        style={{
                            ...styles.input,
                            backgroundColor: isSubmitting ? colors.gray50 : colors.white,
                            cursor: isSubmitting ? "not-allowed" : "text",
                        }}
                        onFocus={(e) => !isSubmitting && hover.input(e.target)}
                        onBlur={(e) => hover.resetInput(e.target)}
                    />
                </div>

                {/* Submit Buttons */}
                <div style={styles.buttonGroup}>
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isSubmitting}
                        style={{
                            ...styles.secondaryButton,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                            opacity: isSubmitting ? 0.6 : 1,
                        }}
                        onMouseOver={(e) => !isSubmitting && hover.secondaryButton(e.currentTarget)}
                        onMouseOut={(e) => hover.resetSecondaryButton(e.currentTarget)}
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        style={{
                            ...styles.primaryButton,
                            backgroundColor: isSubmitting ? colors.disabled : colors.primary,
                            cursor: isSubmitting ? "not-allowed" : "pointer",
                        }}
                        onMouseOver={(e) => !isSubmitting && hover.primaryButton(e.currentTarget)}
                        onMouseOut={(e) => hover.resetPrimaryButton(e.currentTarget)}
                    >
                        {isSubmitting ? (
                            <>
                                <div style={styles.spinner} />
                                Aanmaken...
                            </>
                        ) : (
                            <>
                                <FaPlus size={12} />
                                Gebruiker Aanmaken
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
function UserFormManager() {
    const [showForm, setShowForm] = React.useState(false)

    const handleSuccess = () => {
        // You could add a callback here to refresh the user list
        // or show a global success notification
        console.log("User created successfully!")
    }

    const overlay = showForm
        ? ReactDOM.createPortal(
              <div style={styles.modalOverlay}>
                  <UserForm
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
                    hover.primaryButton(e.currentTarget)
                    e.currentTarget.style.transform = "translateY(-1px)"
                    e.currentTarget.style.boxShadow = `0 6px 16px ${colors.primary}40`
                }}
                onMouseOut={(e) => {
                    hover.resetPrimaryButton(e.currentTarget)
                    e.currentTarget.style.transform = "translateY(0)"
                    e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}30`
                }}
            >
                <FaPlus size={14} />
                Create New User
            </button>
            {overlay}
        </Frame>
    )
}

// Export Override
export function UserFormApp(): Override {
    return {
        children: <UserFormManager />,
    }
}
