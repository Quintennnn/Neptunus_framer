// ——— API Configuration ———
export const API_BASE_URL = "https://dev.api.hienfeld.io"

// API Paths
export const API_PATHS = {
  USER: "/neptunus/user",
  SIGNUP: "/neptunus/signup", 
  LOGIN: "/neptunus/login",
  EXCHANGE_CODE: "/neptunus/exchange-code",
  ORGANIZATION: "/neptunus/organization",
  POLICY: "/neptunus/policy",
  BOAT: "/neptunus/boat",
  INSURED_OBJECT: "/neptunus/insured-object",
  CHANGELOG: "/neptunus/changelog",
  SCHEMA: "/neptunus/schema"
} as const

// ——— Authentication Helpers ———
export function getIdToken(): string | null {
  return sessionStorage.getItem("idToken")
}

export function getUserId(): string | null {
  return sessionStorage.getItem("userId")
}

export function getAccessToken(): string | null {
  return sessionStorage.getItem("accessToken")
}

export function isAuthenticated(): boolean {
  const token = getIdToken()
  if (!token) return false
  
  try {
    // Check if token is expired
    const payload = JSON.parse(atob(token.split('.')[1]))
    const currentTime = Math.floor(Date.now() / 1000)
    return payload.exp > currentTime
  } catch (error) {
    console.error('Error checking token expiration:', error)
    return false
  }
}

export function clearAuthTokens(): void {
  sessionStorage.removeItem('idToken')
  sessionStorage.removeItem('accessToken')
  sessionStorage.removeItem('refreshToken')
  sessionStorage.removeItem('userId')
}

export function getUserInfoFromToken(): any | null {
  const token = getIdToken()
  if (!token) return null
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return {
      userId: payload.sub,
      email: payload.email,
      name: payload.name || payload.given_name || payload.email,
      groups: payload['cognito:groups'] || [],
      // Add other claims as needed
    }
  } catch (error) {
    console.error('Error parsing user info from token:', error)
    return null
  }
}

// ——— Error & Success Message Formatting ———
export function formatErrorMessage(error: any): string {
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

export function formatSuccessMessage(data: any, entityType?: string): string {
  if (typeof data === "string") return data
  
  if (data && typeof data === "object") {
    if (data.message) return data.message
    
    if (data.id) {
      const entity = entityType || "Item"
      return `${entity} succesvol aangemaakt!`
    }
    
    const entity = entityType || "Item"
    return `${entity} is succesvol aangemaakt!`
  }
  
  return "Bewerking succesvol voltooid!"
}

// ——— Validation Helpers ———
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s-()]+$/
  return phoneRegex.test(phone.trim())
}

export function isValidContactInfo(contact: string): boolean {
  return isValidEmail(contact) || isValidPhoneNumber(contact)
}

// ——— Form Validation Helpers ———
export function validateRequired(value: string | number, fieldName: string): string | null {
  if (typeof value === "string" && !value.trim()) {
    return `${fieldName} is verplicht`
  }
  if (typeof value === "number" && (isNaN(value) || value === 0)) {
    return `${fieldName} is verplicht`
  }
  return null
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return "E-mailadres is verplicht"
  if (!isValidEmail(email)) return "Voer een geldig e-mailadres in"
  return null
}

export function validateStringLength(
  value: string,
  fieldName: string,
  minLength: number,
  maxLength?: number
): string | null {
  const trimmed = value.trim()
  if (trimmed.length < minLength) {
    return `${fieldName} moet minimaal ${minLength} karakters bevatten`
  }
  if (maxLength && trimmed.length > maxLength) {
    return `${fieldName} moet minder dan ${maxLength} karakters bevatten`
  }
  return null
}

export function validateNumberRange(
  value: number,
  fieldName: string,
  min?: number,
  max?: number
): string | null {
  if (isNaN(value)) {
    return `${fieldName} moet een geldig nummer zijn`
  }
  if (min !== undefined && value < min) {
    return `${fieldName} moet minimaal ${min} zijn`
  }
  if (max !== undefined && value > max) {
    return `${fieldName} mag maximaal ${max} zijn`
  }
  return null
}

export function validateYear(year: number, fieldName: string = "Year"): string | null {
  const currentYear = new Date().getFullYear()
  if (year <= 1900 || year > currentYear) {
    return `${fieldName} moet tussen 1900 en ${currentYear} liggen`
  }
  return null
}

// ——— Utility Functions ———
export function formatLabel(camelCaseString: string): string {
  return camelCaseString
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim()
}

export function getCurrentYear(): number {
  return new Date().getFullYear()
}

export function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  if (!dateString) return ""
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long", 
    day: "numeric"
  })
}

// ——— HTTP Request Helpers ———
export function createAuthHeaders(token?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  }
  
  const authToken = token || getIdToken()
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`
  }
  
  return headers
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getIdToken()
  if (!token) {
    throw new Error("Geen authenticatietoken gevonden. Log opnieuw in.")
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...createAuthHeaders(token),
      ...options.headers,
    },
    mode: "cors",
  })

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("Authenticatie mislukt. Je sessie is mogelijk verlopen. Log opnieuw in.")
    }
    throw new Error(`${response.status} ${response.statusText}`)
  }

  return response.json()
}

// ——— Type Guards ———
export function isString(value: any): value is string {
  return typeof value === "string"
}

export function isNumber(value: any): value is number {
  return typeof value === "number" && !isNaN(value)
}

export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true
  if (typeof value === "string") return value.trim() === ""
  if (typeof value === "number") return isNaN(value)
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.keys(value).length === 0
  return false
}