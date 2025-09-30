// Multi-Tenant Logo Management System
import * as React from "react"
import { useState } from "react"
import {
    FaUpload,
    FaTrashAlt,
    FaImage,
    FaCheckCircle,
    FaTimes,
    FaExclamationTriangle,
    FaEye,
    FaDownload,
} from "react-icons/fa"
import { colors, styles, hover, FONT_STACK } from "../Theme.tsx"
import {
    API_BASE_URL,
    getIdToken,
    formatErrorMessage,
    formatSuccessMessage,
} from "../Utils.tsx"

// ——— Types ———
interface LogoData {
    organizationId: string
    logoData?: string // base64 encoded PNG data
    fileName?: string
    uploadedAt?: string
    fileSize?: number
}

interface LogoManagerProps {
    organizationId: string
    organizationName: string
    userInfo: any
    onLogoUpdated?: (logoData: LogoData | null) => void
}

// ——— Utility Functions ———
const MAX_FILE_SIZE = 500 * 1024 // 500KB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']

function validateImageFile(file: File): string | null {
    if (!ALLOWED_TYPES.includes(file.type)) {
        return "Alleen PNG, JPEG en GIF bestanden zijn toegestaan"
    }

    if (file.size > MAX_FILE_SIZE) {
        return `Bestand te groot. Maximaal ${(MAX_FILE_SIZE / 1024).toFixed(0)}KB toegestaan`
    }

    return null
}

function convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
            const result = reader.result as string
            // Remove the data URL prefix to get just the base64 data
            const base64Data = result.split(',')[1]
            resolve(base64Data)
        }
        reader.onerror = () => reject(new Error("Fout bij het lezen van het bestand"))
        reader.readAsDataURL(file)
    })
}

function formatFileSize(bytes: number): string {
    return `${(bytes / 1024).toFixed(1)}KB`
}

// ——— API Functions ———
async function uploadOrganizationLogo(organizationId: string, logoData: string, fileName: string): Promise<LogoData> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const requestBody = {
        logoData,
        fileName,
        uploadedAt: new Date().toISOString()
    }

    const response = await fetch(`${API_BASE_URL}/neptunus/organization/${organizationId}/logo`, {
        method: "PUT",
        headers,
        body: JSON.stringify(requestBody),
        mode: "cors",
    })

    if (!response.ok) {
        let errorMessage = `Failed to upload logo: ${response.statusText}`
        try {
            const errorData = await response.json()
            if (errorData.message) {
                errorMessage = errorData.message
            }
        } catch (e) {
            // Use default message if JSON parsing fails
        }
        throw new Error(errorMessage)
    }

    return response.json()
}

async function deleteOrganizationLogo(organizationId: string): Promise<void> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}/neptunus/organization/${organizationId}/logo`, {
        method: "DELETE",
        headers,
        mode: "cors",
    })

    if (!response.ok) {
        throw new Error(`Failed to delete logo: ${response.statusText}`)
    }
}

async function getOrganizationLogo(organizationId: string): Promise<LogoData | null> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}/neptunus/organization/${organizationId}/logo`, {
        method: "GET",
        headers,
        mode: "cors",
    })

    if (response.status === 404) {
        return null // No logo found
    }

    if (!response.ok) {
        throw new Error(`Failed to get logo: ${response.statusText}`)
    }

    return response.json()
}

// ——— Logo Preview Component ———
function LogoPreview({
    logoData,
    organizationName,
    onRemove,
    onView,
    canRemove = true
}: {
    logoData: LogoData
    organizationName: string
    onRemove?: () => void
    onView?: () => void
    canRemove?: boolean
}) {
    const logoSrc = `data:image/png;base64,${logoData.logoData}`

    return (
        <div style={{
            border: `1px solid ${colors.gray200}`,
            borderRadius: "8px",
            padding: "16px",
            backgroundColor: colors.white,
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                marginBottom: "12px"
            }}>
                <div style={{
                    width: "60px",
                    height: "60px",
                    border: `1px solid ${colors.gray200}`,
                    borderRadius: "4px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    overflow: "hidden",
                    backgroundColor: "#f9fafb"
                }}>
                    <img
                        src={logoSrc}
                        alt={`${organizationName} logo`}
                        style={{
                            maxWidth: "100%",
                            maxHeight: "100%",
                            objectFit: "contain"
                        }}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{
                        fontSize: "14px",
                        fontWeight: "500",
                        color: colors.gray900,
                        marginBottom: "4px"
                    }}>
                        {logoData.fileName || "Logo"}
                    </div>
                    <div style={{
                        fontSize: "12px",
                        color: colors.gray500
                    }}>
                        {logoData.fileSize && formatFileSize(logoData.fileSize)}
                        {logoData.uploadedAt && ` • ${new Date(logoData.uploadedAt).toLocaleDateString("nl-NL")}`}
                    </div>
                </div>
            </div>

            <div style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap"
            }}>
                {onView && (
                    <button
                        onClick={onView}
                        style={{
                            ...styles.secondaryButton,
                            padding: "8px 12px",
                            fontSize: "13px",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            backgroundColor: colors.primary,
                            color: "white",
                            border: "none"
                        }}
                    >
                        <FaEye size={12} />
                        Bekijken
                    </button>
                )}
                {canRemove && onRemove && (
                    <button
                        onClick={onRemove}
                        style={{
                            ...styles.secondaryButton,
                            padding: "8px 12px",
                            fontSize: "13px",
                            backgroundColor: colors.error,
                            color: "white",
                            border: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: "6px"
                        }}
                    >
                        <FaTrashAlt size={12} />
                        Verwijderen
                    </button>
                )}
            </div>
        </div>
    )
}

// ——— Logo Upload Component ———
function LogoUpload({
    onUpload,
    uploading = false
}: {
    onUpload: (file: File) => void
    uploading?: boolean
}) {
    const [dragOver, setDragOver] = useState(false)
    const [dragCounter, setDragCounter] = useState(0)

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return

        const file = files[0]
        const validation = validateImageFile(file)
        if (validation) {
            alert(validation)
            return
        }

        onUpload(file)
    }

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault()
        setDragCounter(dragCounter + 1)
        if (e.dataTransfer.types.includes('Files')) {
            setDragOver(true)
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        if (e.dataTransfer.types.includes('Files')) {
            setDragOver(true)
        }
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        const newCounter = dragCounter - 1
        setDragCounter(newCounter)
        if (newCounter === 0) {
            setDragOver(false)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        setDragCounter(0)
        handleFileSelect(e.dataTransfer.files)
    }

    return (
        <div
            style={{
                border: `2px dashed ${dragOver ? colors.primary : colors.gray300}`,
                borderRadius: "8px",
                padding: "32px",
                textAlign: "center",
                backgroundColor: dragOver ? colors.primaryBg : colors.gray50,
                cursor: uploading ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                opacity: uploading ? 0.6 : 1,
                transform: dragOver ? "scale(1.02)" : "scale(1)"
            }}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => {
                if (!uploading) {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = ALLOWED_TYPES.join(',')
                    input.onchange = (e) => {
                        const target = e.target as HTMLInputElement
                        handleFileSelect(target.files)
                    }
                    input.click()
                }
            }}
        >
            <FaUpload size={24} color={dragOver ? colors.primary : colors.gray400} style={{ marginBottom: "16px" }} />
            <div style={{
                fontSize: "16px",
                fontWeight: "500",
                color: uploading ? colors.primary : (dragOver ? colors.primary : colors.gray700),
                marginBottom: "8px"
            }}>
                {uploading ? "Uploaden..." : dragOver ? "Laat logo hier los!" : "Sleep logo hierheen of klik om te selecteren"}
            </div>
            <div style={{
                fontSize: "13px",
                color: colors.gray500,
                lineHeight: "1.4"
            }}>
                PNG, JPEG of GIF • Max {(MAX_FILE_SIZE / 1024).toFixed(0)}KB
            </div>
        </div>
    )
}

// ——— Main Logo Manager Component ———
export function LogoManager({ organizationId, organizationName, userInfo, onLogoUpdated }: LogoManagerProps) {
    const [currentLogo, setCurrentLogo] = useState<LogoData | null>(null)
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    // Simplified: Anyone who can access this component can manage logos

    // Load current logo on mount
    React.useEffect(() => {
        loadCurrentLogo()
    }, [organizationId])

    const loadCurrentLogo = async () => {
        try {
            setLoading(true)
            setError(null)
            const logo = await getOrganizationLogo(organizationId)
            setCurrentLogo(logo)
        } catch (err) {
            setError(formatErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleUpload = async (file: File) => {
        try {
            setUploading(true)
            setError(null)
            setSuccess(null)

            // Convert file to base64
            const logoData = await convertFileToBase64(file)

            // Upload to backend
            const result = await uploadOrganizationLogo(organizationId, logoData, file.name)

            // Update state
            const newLogoData: LogoData = {
                organizationId,
                logoData,
                fileName: file.name,
                fileSize: file.size,
                uploadedAt: new Date().toISOString()
            }

            setCurrentLogo(newLogoData)
            setSuccess("Logo succesvol geüpload!")
            onLogoUpdated?.(newLogoData)

        } catch (err) {
            setError(formatErrorMessage(err))
        } finally {
            setUploading(false)
        }
    }

    const handleRemove = async () => {
        if (!confirm("Weet je zeker dat je het logo wilt verwijderen?")) return

        try {
            setError(null)
            setSuccess(null)

            await deleteOrganizationLogo(organizationId)

            setCurrentLogo(null)
            setSuccess("Logo succesvol verwijderd!")
            onLogoUpdated?.(null)

        } catch (err) {
            setError(formatErrorMessage(err))
        }
    }

    const handleView = () => {
        if (!currentLogo?.logoData) return

        const logoSrc = `data:image/png;base64,${currentLogo.logoData}`
        const newWindow = window.open('', '_blank', 'width=600,height=400')
        if (newWindow) {
            newWindow.document.write(`
                <html>
                    <head><title>${organizationName} Logo</title></head>
                    <body style="margin: 0; padding: 20px; display: flex; align-items: center; justify-content: center; background: #f5f5f5;">
                        <img src="${logoSrc}" alt="${organizationName} logo" style="max-width: 100%; max-height: 100%; object-fit: contain;" />
                    </body>
                </html>
            `)
            newWindow.document.close()
        }
    }

    // No role restrictions needed - if user can access this, they can manage logos

    return (
        <div style={{
            padding: "20px",
            border: `1px solid ${colors.gray200}`,
            borderRadius: "8px",
            backgroundColor: colors.white,
            fontFamily: FONT_STACK,
        }}>
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
            }}>
                <h4 style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: "600",
                    color: colors.gray900
                }}>
                    Organisatie Logo
                </h4>
            </div>

            {error && (
                <div style={{
                    padding: "12px",
                    backgroundColor: colors.errorBg,
                    color: colors.error,
                    borderRadius: "6px",
                    marginBottom: "16px",
                    fontSize: "14px"
                }}>
                    {error}
                </div>
            )}

            {success && (
                <div style={{
                    padding: "12px",
                    backgroundColor: colors.successBg,
                    color: colors.success,
                    borderRadius: "6px",
                    marginBottom: "16px",
                    fontSize: "14px"
                }}>
                    {success}
                </div>
            )}

            {loading ? (
                <div style={{
                    padding: "40px",
                    textAlign: "center",
                    color: colors.gray500
                }}>
                    Logo laden...
                </div>
            ) : currentLogo ? (
                <div>
                    <LogoPreview
                        logoData={currentLogo}
                        organizationName={organizationName}
                        onRemove={handleRemove}
                        onView={handleView}
                        canRemove={true}
                    />
                </div>
            ) : (
                <LogoUpload
                    onUpload={handleUpload}
                    uploading={uploading}
                />
            )}

        </div>
    )
}