import React, { useState, createContext, useContext } from "react"
import { Override } from "framer"

// --- AWS Cognito constants ---
const COGNITO_CLIENT_ID = "68adagbjt8cfm45h5n2bge17p0"
const REGION = "eu-central-1"
const COGNITO_ENDPOINT = `https://cognito-idp.${REGION}.amazonaws.com/`

// Helper function to decode JWT and extract sub (user ID)
function decodeJWT(token: string): any {
    try {
        const base64Url = token.split(".")[1]
        const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split("")
                .map(
                    (c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2)
                )
                .join("")
        )
        return JSON.parse(jsonPayload)
    } catch (error) {
        console.error("Error decoding JWT:", error)
        return null
    }
}

// Create a global state as backup to test
declare global {
    interface Window {
        debugLogin?: {
            email: string
            password: string
        }
    }
}

// Initialize global state only on client
if (typeof window !== "undefined" && !window.debugLogin) {
    window.debugLogin = { email: "", password: "" }
}

// --- CONTEXT SETUP ---
interface LoginContextType {
    email: string
    setEmail(val: string): void
    password: string
    setPassword(val: string): void
    error: string
    setError(val: string): void
    idToken: string
    accessToken: string
    refreshToken: string
    setTokens(tokens: {
        idToken: string
        accessToken: string
        refreshToken: string
    }): void
}

const defaultContext: LoginContextType = {
    email: "",
    setEmail: () => {},
    password: "",
    setPassword: () => {},
    error: "",
    setError: () => {},
    idToken: "",
    accessToken: "",
    refreshToken: "",
    setTokens: () => {},
}

const LoginContext = createContext<LoginContextType>(defaultContext)

function useLoginContext(): LoginContextType {
    return useContext(LoginContext)
}

// --- PROVIDER OVERRIDE ---
export function loginProvider(): Override {
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [idToken, setIdToken] = useState("")
    const [accessToken, setAccessToken] = useState("")
    const [refreshToken, setRefreshToken] = useState("")

    const setTokens = (tokens: {
        idToken: string
        accessToken: string
        refreshToken: string
    }) => {
        setIdToken(tokens.idToken)
        setAccessToken(tokens.accessToken)
        setRefreshToken(tokens.refreshToken)

        if (typeof window !== "undefined") {
            sessionStorage.setItem("idToken", tokens.idToken)
            sessionStorage.setItem("accessToken", tokens.accessToken)
            sessionStorage.setItem("refreshToken", tokens.refreshToken)

            console.log(
                "→ [sessionStorage] idToken:",
                sessionStorage.getItem("idToken")
            )
            console.log(
                "→ [sessionStorage] accessToken:",
                sessionStorage.getItem("accessToken")
            )
            console.log(
                "→ [sessionStorage] refreshToken:",
                sessionStorage.getItem("refreshToken")
            )
        }
    }

    return {
        children: (children) => (
            <LoginContext.Provider
                value={{
                    email,
                    setEmail,
                    password,
                    setPassword,
                    error,
                    setError,
                    idToken,
                    accessToken,
                    refreshToken,
                    setTokens,
                }}
            >
                {children}
            </LoginContext.Provider>
        ),
    }
}

// --- EMAIL INPUT ---
export function emailInput(): Override {
    const { email, setEmail } = useLoginContext()
    console.log("🟢 EMAIL INPUT rendering, context email:", email)

    return {
        value: email,
        onChange: (event: any) => {
            const val = event.target.value
            console.log("🟢 EMAIL onChange:", val)
            setEmail(val)

            if (typeof window !== "undefined" && window.debugLogin) {
                window.debugLogin.email = val
            }
        },
    }
}

// --- PASSWORD INPUT ---
export function passwordInput(): Override {
    const { password, setPassword } = useLoginContext()
    console.log("🟡 PASSWORD INPUT rendering, context password:", password)

    return {
        value: password,
        onChange: (event: any) => {
            const val = event.target.value
            console.log("🟡 PASSWORD onChange:", val)
            setPassword(val)

            if (typeof window !== "undefined" && window.debugLogin) {
                window.debugLogin.password = val
            }
        },
    }
}

// --- ERROR LABEL ---
export function loginErrorLabel(): Override {
    const { error } = useLoginContext()
    return {
        visible: !!error,
        text: error,
    }
}

// --- LOGIN BUTTON ---
export function loginButton(): Override {
    const { email, password, setError } = useLoginContext()
    const [loading, setLoading] = useState(false)

    console.log("🔴 LOGIN BUTTON rendering")
    if (typeof window !== "undefined") {
        console.log("Global email:", window.debugLogin?.email)
        console.log("Global password:", window.debugLogin?.password)
    }

    const handleLogin = async () => {
        console.log("🔴 LOGIN CLICKED!")
        let finalEmail = email
        let finalPassword = password

        if (typeof window !== "undefined") {
            finalEmail = email || window.debugLogin?.email || ""
            finalPassword = password || window.debugLogin?.password || ""
        }

        if (!finalEmail || !finalPassword) {
            setError("Please enter both email and password.")
            return
        }

        setError("")
        setLoading(true)

        try {
            const res = await fetch(COGNITO_ENDPOINT, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-amz-json-1.1",
                    "X-Amz-Target":
                        "AWSCognitoIdentityProviderService.InitiateAuth",
                },
                body: JSON.stringify({
                    AuthParameters: {
                        USERNAME: finalEmail,
                        PASSWORD: finalPassword,
                    },
                    AuthFlow: "USER_PASSWORD_AUTH",
                    ClientId: COGNITO_CLIENT_ID,
                }),
            })

            const data = await res.json()
            console.log("AWS Cognito Response:", data)

            if (data.AuthenticationResult) {
                const { IdToken, AccessToken, RefreshToken } =
                    data.AuthenticationResult

                if (typeof window !== "undefined") {
                    sessionStorage.setItem("idToken", IdToken)
                    sessionStorage.setItem("accessToken", AccessToken)
                    sessionStorage.setItem("refreshToken", RefreshToken)

                    const decoded = decodeJWT(IdToken)
                    if (decoded && decoded.sub) {
                        sessionStorage.setItem("userId", decoded.sub)
                        console.log("→ [sessionStorage] userId:", decoded.sub)
                    }

                    // Navigate after login
                    window.location.href =
                        "https://neptunus.framer.website/organizations"
                }
            } else {
                setError(data.message || "Login failed")
            }
        } catch (err: any) {
            console.log("Network error:", err.message)
            setError("Network error: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    return {
        text: loading ? "Logging in..." : "Login",
        onTap: handleLogin,
        whileHover: {
            backgroundColor: "#0A0466",
        },
        style: {
            backgroundColor: "#1d4ed8",
            color: "white",
            padding: "12px 24px",
            borderRadius: "8px",
            textAlign: "center",
            fontWeight: "bold",
            transition: "all 0.2s ease",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.6 : 1,
        },
    }
}
