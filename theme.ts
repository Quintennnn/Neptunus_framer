// Enhanced font stack for better typography
export const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

// Color Theme System - Easily switchable color schemes
export type ColorScheme = {
  // Primary colors
  primary: string
  primaryHover: string
  primaryLight: string
  
  // Semantic colors
  success: string
  successHover: string
  successBg: string
  successBorder: string
  
  error: string
  errorBg: string
  errorBorder: string
  
  warning: string
  warningBg: string
  warningBorder: string
  
  // Gray scale
  white: string
  gray50: string
  gray100: string
  gray200: string
  gray300: string
  gray400: string
  gray500: string
  gray600: string
  gray700: string
  gray800: string
  gray900: string
  
  // Interactive states
  disabled: string
  overlay: string
}

// Color Schemes
const greenScheme: ColorScheme = {
  primary: "#10b981",
  primaryHover: "#059669", 
  primaryLight: "#34d399",
  
  success: "#059669",
  successHover: "#047857",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  
  error: "#dc2626",
  errorBg: "#fef2f2", 
  errorBorder: "#fecaca",
  
  warning: "#ca8a04",
  warningBg: "#fefce8",
  warningBorder: "#fde68a",
  
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  
  disabled: "#9ca3af",
  overlay: "rgba(0, 0, 0, 0.5)"
}

const blueScheme: ColorScheme = {
  primary: "#2563eb",
  primaryHover: "#1d4ed8",
  primaryLight: "#3b82f6",
  
  success: "#059669",
  successHover: "#047857",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  
  error: "#dc2626",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  
  warning: "#ca8a04",
  warningBg: "#fefce8",
  warningBorder: "#fde68a",
  
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  
  disabled: "#9ca3af",
  overlay: "rgba(0, 0, 0, 0.5)"
}

const purpleScheme: ColorScheme = {
  primary: "#7c3aed",
  primaryHover: "#6d28d9",
  primaryLight: "#8b5cf6",
  
  success: "#059669",
  successHover: "#047857",
  successBg: "#ecfdf5",
  successBorder: "#a7f3d0",
  
  error: "#dc2626",
  errorBg: "#fef2f2",
  errorBorder: "#fecaca",
  
  warning: "#ca8a04",
  warningBg: "#fefce8",
  warningBorder: "#fde68a",
  
  white: "#ffffff",
  gray50: "#f9fafb",
  gray100: "#f3f4f6",
  gray200: "#e5e7eb",
  gray300: "#d1d5db",
  gray400: "#9ca3af",
  gray500: "#6b7280",
  gray600: "#4b5563",
  gray700: "#374151",
  gray800: "#1f2937",
  gray900: "#111827",
  
  disabled: "#9ca3af",
  overlay: "rgba(0, 0, 0, 0.5)"
}

// Available themes
export const themes = {
  green: greenScheme,
  blue: blueScheme,
  purple: purpleScheme
} as const

// Current theme - Change this line to switch themes instantly!
export const colors = themes.green

// Common Style Objects
export const styles = {
  // Modal and overlay styles
  modalOverlay: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlay,
    backdropFilter: "blur(4px)",
    zIndex: 1000,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  
  modal: {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    background: colors.white,
    borderRadius: "16px",
    boxShadow: "0 25px 70px rgba(0,0,0,0.15)",
    fontFamily: FONT_STACK,
    zIndex: 1001,
    overflow: "auto" as const,
  },
  
  // Button styles
  primaryButton: {
    padding: "12px 24px",
    backgroundColor: colors.primary,
    color: colors.white,
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: FONT_STACK,
    transition: "all 0.2s",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  
  secondaryButton: {
    padding: "12px 24px",
    backgroundColor: colors.gray100,
    color: colors.gray700,
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: FONT_STACK,
    transition: "all 0.2s",
  },
  
  iconButton: {
    padding: "8px",
    backgroundColor: "transparent",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    color: colors.gray500,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s",
  },

  dangerButton: {
    padding: "12px 24px",
    backgroundColor: colors.error,
    color: colors.white,
    border: "none",
    borderRadius: "8px",
    fontSize: "14px",
    fontWeight: "500",
    cursor: "pointer",
    fontFamily: FONT_STACK,
    transition: "all 0.2s",
  },
  
  // Form styles
  input: {
    width: "100%",
    padding: "12px",
    border: `1px solid ${colors.gray300}`,
    borderRadius: "8px",
    fontSize: "14px",
    fontFamily: FONT_STACK,
    transition: "border-color 0.2s",
    backgroundColor: colors.white,
    cursor: "text",
    boxSizing: "border-box" as const,
  },
  
  label: {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "500",
    color: colors.gray700,
  },
  
  // Alert boxes
  successAlert: {
    color: colors.success,
    backgroundColor: colors.successBg,
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "14px",
    border: `1px solid ${colors.successBorder}`,
  },
  
  errorAlert: {
    color: colors.error,
    backgroundColor: colors.errorBg,
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "14px",
    border: `1px solid ${colors.errorBorder}`,
    whiteSpace: "pre-wrap" as const,
  },
  
  warningAlert: {
    color: colors.warning,
    backgroundColor: colors.warningBg,
    padding: "12px 16px",
    borderRadius: "8px",
    marginBottom: "24px",
    fontSize: "14px",
    border: `1px solid ${colors.warningBorder}`,
  },
  
  // Loading spinner
  spinner: {
    width: "16px",
    height: "16px",
    border: `2px solid ${colors.white}`,
    borderTop: "2px solid transparent",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  
  // Text styles
  description: {
    fontSize: "14px",
    color: colors.gray500,
    marginBottom: "24px",
    lineHeight: "1.5",
  },

  // Container styles
  card: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.gray200}`,
    borderRadius: "8px",
    padding: "16px",
  },
  
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "24px",
  },
  
  title: {
    fontSize: "24px",
    fontWeight: "600",
    color: colors.gray800,
  },
  
  // Button action areas
  buttonGroup: {
    display: "flex",
    justifyContent: "flex-end",
    gap: "12px",
    paddingTop: "24px",
    borderTop: `1px solid ${colors.gray200}`,
  },
}

// Hover effect helpers
export const hover = {
  primaryButton: (element: HTMLElement) => {
    element.style.backgroundColor = colors.primaryHover
  },
  
  secondaryButton: (element: HTMLElement) => {
    element.style.backgroundColor = colors.gray200
  },
  
  iconButton: (element: HTMLElement) => {
    element.style.backgroundColor = colors.gray100
  },
  
  dangerButton: (element: HTMLElement) => {
    element.style.backgroundColor = "#dc2626"
  },
  
  input: (element: HTMLElement) => {
    element.style.borderColor = colors.primary
  },
  
  // Reset functions
  resetPrimaryButton: (element: HTMLElement) => {
    element.style.backgroundColor = colors.primary
  },
  
  resetSecondaryButton: (element: HTMLElement) => {
    element.style.backgroundColor = colors.gray100
  },
  
  resetIconButton: (element: HTMLElement) => {
    element.style.backgroundColor = "transparent"
  },
  
  resetDangerButton: (element: HTMLElement) => {
    element.style.backgroundColor = colors.error
  },
  
  resetInput: (element: HTMLElement) => {
    element.style.borderColor = colors.gray300
  },
}

// CSS keyframes animation
export const animations = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`