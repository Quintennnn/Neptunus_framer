import React, { useState, createContext, useContext } from "react"
import { Override } from "framer"
import { determineRedirectPath } from "../utils"

// --- AWS Cognito constants ---
const COGNITO_CLIENT_ID = "di3vf3gteg48eqk0fdpu1b75a"
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
    }): Promise<void>
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
    setTokens: async () => {},
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

    const setTokens = async (tokens: {
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

            // Extract userId from JWT and store it
            const decoded = decodeJWT(tokens.idToken)
            if (decoded?.sub) {
                sessionStorage.setItem('userId', decoded.sub)
                console.log('→ [sessionStorage] userId:', decoded.sub)
            }

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

            // If this setTokens is called in a login context, implement smart redirect
            // This acts as a fallback for any legacy login flows
            try {
                const redirectPath = await determineRedirectPath()
                console.log(`Smart redirect determined: ${redirectPath}`)
                // Only redirect if we're currently on a login page to avoid unwanted redirects
                if (window.location.pathname === '/login_old' || window.location.pathname === '/login') {
                    console.log('Redirecting from login page...')
                    window.location.href = `https://neptunus.framer.website${redirectPath}`
                }
            } catch (error) {
                console.error('Error determining redirect path:', error)
                // Fallback to default behavior if there's an error
            }
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

    return {
        value: email,
        onChange: (event: any) => {
            const val = event.target.value
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

    return {
        value: password,
        onChange: (event: any) => {
            const val = event.target.value
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

// --- LOGIN BUTTON (Updated for Hosted UI) ---
export function loginButton(): Override {
    const handleLogin = () => {
        // Construct the hosted UI URL
        const hostedUIUrl = `https://dev-neptunus-auth.auth.eu-central-1.amazoncognito.com/login?client_id=${COGNITO_CLIENT_ID}&response_type=code&scope=email+openid+profile&redirect_uri=https://neptunus.framer.website/callback`;
        
        console.log('Redirecting to Cognito Hosted UI:', hostedUIUrl);
        
        // Redirect to Cognito Hosted UI
        window.location.href = hostedUIUrl;
    }

    return {
        text: "Inloggen via Neptunus",
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
            cursor: "pointer",
        },
    }
}
