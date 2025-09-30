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
      role: payload['custom:role'] || 'user', // Extract role from token
      organization: payload['custom:organization'], // Single org for users
      organizations: payload['custom:organizations'] ? payload['custom:organizations'].split(',') : [], // Multiple orgs for editors
      // Add other claims as needed
    }
  } catch (error) {
    console.error('Error parsing user info from token:', error)
    return null
  }
}

// Determine optimal redirect path based on user role and organization access
export async function determineRedirectPath(): Promise<string> {
  const userInfo = getUserInfoFromToken()
  if (!userInfo) {
    return "/organizations" // Default fallback
  }

  const role = userInfo.role || 'user'

  // Admin: Always go to organizations page to choose their workflow
  if (role === 'admin') {
    return "/organizations"
  }

  // Editor: Always go to organizations page to choose which org to work with
  if (role === 'editor') {
    return "/organizations"
  }

  // User: Check if they have only one organization
  if (role === 'user') {
    // If user has a single organization, redirect directly to insured objects
    if (userInfo.organization) {
      return "/insuredobjects"
    }

    // Fallback: if organization info is unclear, go to organizations page
    return "/organizations"
  }

  // Default fallback
  return "/organizations"
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

// Enhanced validation for high-value currency fields (boat values, own risk, etc.)
export function validateCurrencyValue(value: string | number, fieldName: string = "Waarde"): string | null {
  let numValue: number

  if (typeof value === "string") {
    // Remove any currency symbols and format characters
    const cleanValue = value.replace(/[€$,\s]/g, '').replace(',', '.')
    numValue = parseFloat(cleanValue)
  } else {
    numValue = value
  }

  if (isNaN(numValue)) {
    return `${fieldName} moet een geldig bedrag zijn`
  }

  if (numValue < 0) {
    return `${fieldName} kan niet negatief zijn`
  }

  // Reasonable upper limit check for very high values (10 million euros)
  if (numValue > 10000000) {
    return `${fieldName} lijkt ongewoon hoog (€${numValue.toLocaleString('nl-NL')}). Controleer of dit correct is.`
  }

  return null
}

// Enhanced promillage validation with automatic decimal handling
export function validatePromillage(value: string | number, fieldName: string = "Premiepromillage"): string | null {
  // Convert string to number and handle automatic decimal conversion
  let numValue: number

  if (typeof value === "string") {
    // Remove any non-numeric characters except decimal point
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.')
    numValue = parseFloat(cleanValue)
  } else {
    numValue = value
  }

  if (isNaN(numValue)) {
    return `${fieldName} moet een geldig nummer zijn`
  }

  // Automatically handle decimal values (e.g., 5 becomes 5.0, 50 becomes 5.0 if >10)
  if (numValue > 100) {
    return `${fieldName} lijkt te hoog (${numValue}). Controleer of dit een promillage waarde is (bijvoorbeeld: 5.0 voor 5‰)`
  }

  if (numValue <= 0) {
    return `${fieldName} moet groter dan 0 zijn`
  }

  // Reasonable range check for promillage values
  if (numValue > 50) {
    return `${fieldName} lijkt ongewoon hoog (${numValue}‰). Typische waarden liggen tussen 1-20‰`
  }

  return null
}

// Convert promillage input to standardized format
export function normalizePromillageValue(value: string | number): number {
  let numValue: number

  if (typeof value === "string") {
    const cleanValue = value.replace(/[^0-9.,]/g, '').replace(',', '.')
    numValue = parseFloat(cleanValue)
  } else {
    numValue = value
  }

  if (isNaN(numValue)) return 0

  // Round to 1 decimal place for promillage precision
  return Math.round(numValue * 10) / 10
}

// Own Risk Calculation Types and Functions
export type OwnRiskCalculationMethod = "fixed" | "percentage"

export interface OwnRiskConfig {
  method: OwnRiskCalculationMethod
  fixedAmount?: number
  percentage?: number
}

// Calculate own risk based on method and boat value
export function calculateOwnRisk(config: OwnRiskConfig, boatValue: number): number {
  if (config.method === "percentage" && config.percentage) {
    const calculatedAmount = (boatValue * config.percentage) / 100
    // Round to nearest 100 euros as per business requirement
    return Math.round(calculatedAmount / 100) * 100
  } else if (config.method === "fixed" && config.fixedAmount) {
    return config.fixedAmount
  }
  return 0
}

// Validate own risk configuration
export function validateOwnRiskConfig(config: OwnRiskConfig): string | null {
  if (!config.method) {
    return "Selecteer een berekeningswijze voor eigen risico"
  }

  if (config.method === "fixed") {
    if (!config.fixedAmount || config.fixedAmount <= 0) {
      return "Voer een geldig vast bedrag in voor eigen risico"
    }
    const currencyError = validateCurrencyValue(config.fixedAmount, "Vast bedrag eigen risico")
    if (currencyError) return currencyError
  } else if (config.method === "percentage") {
    if (!config.percentage || config.percentage <= 0 || config.percentage > 100) {
      return "Voer een geldig percentage in (0-100%) voor eigen risico"
    }
  }

  return null
}

// Format own risk display text
export function formatOwnRiskDisplay(config: OwnRiskConfig, boatValue?: number): string {
  if (config.method === "fixed" && config.fixedAmount) {
    return formatCurrency(config.fixedAmount)
  } else if (config.method === "percentage" && config.percentage) {
    const baseText = `${config.percentage}% van bootwaarde`
    if (boatValue) {
      const calculatedAmount = calculateOwnRisk(config, boatValue)
      return `${baseText} (${formatCurrency(calculatedAmount)})`
    }
    return baseText
  }
  return "Niet geconfigureerd"
}

// Confirmation Dialog Utilities
export function formatObjectSummary(objectData: any, schema?: any[]): Record<string, string> {
  const summary: Record<string, string> = {}

  if (!objectData) return summary

  // Format each field with proper labels and values
  Object.keys(objectData).forEach(key => {
    const value = objectData[key]
    if (value === null || value === undefined || value === '') return

    // Find field schema for proper label
    const fieldSchema = schema?.find(field => field.key === key)
    const label = fieldSchema?.label || formatLabel(key)

    // Format value based on field type
    let formattedValue = value
    if (fieldSchema?.type === 'currency' && typeof value === 'number') {
      formattedValue = formatCurrency(value)
    } else if (fieldSchema?.type === 'date' && value) {
      formattedValue = formatDate(value)
    } else if (typeof value === 'boolean') {
      formattedValue = value ? 'Ja' : 'Nee'
    } else if (Array.isArray(value)) {
      formattedValue = value.join(', ')
    }

    summary[label] = String(formattedValue)
  })

  return summary
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
  // Round to whole euros as per business requirement
  const roundedAmount = Math.round(amount)
  return new Intl.NumberFormat("nl-NL", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(roundedAmount)
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