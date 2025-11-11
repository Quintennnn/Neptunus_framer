// Global Acceptance Rules Management Component (Admin-Only)
import * as React from "react"
import * as ReactDOM from "react-dom"
import { useState, useEffect } from "react"
import {
    FaGlobe,
    FaPlus,
    FaEdit,
    FaTrashAlt,
    FaCopy,
    FaSave,
    FaTimes,
    FaCheckCircle,
    FaExclamationTriangle,
} from "react-icons/fa"
import { colors, styles, hover, FONT_STACK } from "../Theme.tsx"
import {
    API_BASE_URL,
    getIdToken,
    formatErrorMessage,
    formatSuccessMessage,
} from "../Utils.tsx"
import { isAdmin } from "../Rbac.tsx"

// ——— Global Rule Template Interface ———
export interface GlobalRuleTemplate {
    id: string
    name: string
    description?: string
    ruleConfig: {
        enabled: boolean
        rules: Array<{
            name: string
            priority: number
            conditions: Record<string, any>
            logic: "AND" | "OR"
            pricing: {
                // Premium configuration
                premium_method: "fixed" | "percentage"
                premium_fixed_amount?: number
                premium_percentage?: number
                // Eigen risico configuration
                eigen_risico_method: "fixed" | "percentage"
                eigen_risico?: number  // For fixed amount
                eigen_risico_percentage?: number  // For percentage
            }
        }>
    }
    createdBy: string
    createdAt: string
    updatedAt: string
    usageCount: number
}

// ——— Props Interface ———
interface GlobalRulesManagerProps {
    userInfo: any
    onClose: () => void
    onSelectTemplate?: (template: GlobalRuleTemplate) => void
}

// ——— API Functions ———
async function fetchGlobalRuleTemplates(): Promise<GlobalRuleTemplate[]> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}/neptunus/global-rule-templates`, {
        method: "GET",
        headers,
        mode: "cors",
    })

    if (!response.ok) {
        throw new Error(`Failed to fetch global rule templates: ${response.statusText}`)
    }

    return response.json()
}

async function saveGlobalRuleTemplate(template: Omit<GlobalRuleTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>): Promise<GlobalRuleTemplate> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}/neptunus/global-rule-templates`, {
        method: "POST",
        headers,
        body: JSON.stringify(template),
        mode: "cors",
    })

    if (!response.ok) {
        throw new Error(`Failed to save global rule template: ${response.statusText}`)
    }

    return response.json()
}

async function updateGlobalRuleTemplate(id: string, template: Partial<GlobalRuleTemplate>): Promise<GlobalRuleTemplate> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}/neptunus/global-rule-templates/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(template),
        mode: "cors",
    })

    if (!response.ok) {
        throw new Error(`Failed to update global rule template: ${response.statusText}`)
    }

    return response.json()
}

async function deleteGlobalRuleTemplate(id: string): Promise<void> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`

    const response = await fetch(`${API_BASE_URL}/neptunus/global-rule-templates/${id}`, {
        method: "DELETE",
        headers,
        mode: "cors",
    })

    if (!response.ok) {
        throw new Error(`Failed to delete global rule template: ${response.statusText}`)
    }
}

// ——— Template Card Component ———
function GlobalRuleTemplateCard({
    template,
    isEditing,
    onEdit,
    onSave,
    onCancel,
    onDelete,
    onDuplicate,
    onSelect,
    editForm,
    onEditFormChange,
}: {
    template: GlobalRuleTemplate
    isEditing: boolean
    onEdit: () => void
    onSave: () => void
    onCancel: () => void
    onDelete: () => void
    onDuplicate: () => void
    onSelect?: () => void
    editForm: { name: string; description: string }
    onEditFormChange: (field: string, value: string) => void
}) {
    return (
        <div
            style={{
                border: `1px solid ${colors.gray200}`,
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: colors.white,
            }}
        >
            {isEditing ? (
                // Edit Mode
                <div style={{ marginBottom: "12px" }}>
                    <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => onEditFormChange("name", e.target.value)}
                        placeholder="Template naam"
                        style={{
                            width: "100%",
                            padding: "8px",
                            border: `1px solid ${colors.gray300}`,
                            borderRadius: "4px",
                            marginBottom: "8px",
                            fontSize: "14px",
                        }}
                    />
                    <textarea
                        value={editForm.description}
                        onChange={(e) => onEditFormChange("description", e.target.value)}
                        placeholder="Beschrijving (optioneel)"
                        rows={2}
                        style={{
                            width: "100%",
                            padding: "8px",
                            border: `1px solid ${colors.gray300}`,
                            borderRadius: "4px",
                            fontSize: "14px",
                            resize: "vertical",
                        }}
                    />
                </div>
            ) : (
                // View Mode
                <div style={{ marginBottom: "12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                        <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "600" }}>
                            {template.name}
                        </h3>
                    </div>
                    {template.description && (
                        <p style={{ margin: 0, fontSize: "13px", color: colors.gray600, lineHeight: "1.4" }}>
                            {template.description}
                        </p>
                    )}
                </div>
            )}

            {/* Template Stats */}
            <div style={{
                display: "flex",
                gap: "16px",
                marginBottom: "12px",
                fontSize: "12px",
                color: colors.gray500
            }}>
                <span>{template.ruleConfig.rules.length} regels</span>
                <span>{template.usageCount} x gebruikt</span>
                <span>Aangemaakt: {new Date(template.createdAt).toLocaleDateString("nl-NL")}</span>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {isEditing ? (
                    <>
                        <button
                            onClick={onSave}
                            style={{
                                ...styles.primaryButton,
                                padding: "6px 12px",
                                fontSize: "12px",
                                backgroundColor: colors.success,
                            }}
                        >
                            <FaSave size={10} style={{ marginRight: "4px" }} />
                            Opslaan
                        </button>
                        <button
                            onClick={onCancel}
                            style={{
                                ...styles.secondaryButton,
                                padding: "6px 12px",
                                fontSize: "12px",
                            }}
                        >
                            <FaTimes size={10} style={{ marginRight: "4px" }} />
                            Annuleren
                        </button>
                    </>
                ) : (
                    <>
                        {onSelect && (
                            <button
                                onClick={onSelect}
                                style={{
                                    ...styles.primaryButton,
                                    padding: "6px 12px",
                                    fontSize: "12px",
                                }}
                            >
                                <FaCheckCircle size={10} style={{ marginRight: "4px" }} />
                                Selecteren
                            </button>
                        )}
                        <button
                            onClick={onEdit}
                            style={{
                                ...styles.secondaryButton,
                                padding: "6px 12px",
                                fontSize: "12px",
                            }}
                        >
                            <FaEdit size={10} style={{ marginRight: "4px" }} />
                            Bewerken
                        </button>
                        <button
                            onClick={onDuplicate}
                            style={{
                                ...styles.secondaryButton,
                                padding: "6px 12px",
                                fontSize: "12px",
                            }}
                        >
                            <FaCopy size={10} style={{ marginRight: "4px" }} />
                            Dupliceren
                        </button>
                        <button
                            onClick={onDelete}
                            style={{
                                ...styles.secondaryButton,
                                padding: "6px 12px",
                                fontSize: "12px",
                                backgroundColor: colors.error,
                                color: "white",
                            }}
                        >
                            <FaTrashAlt size={10} style={{ marginRight: "4px" }} />
                            Verwijderen
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ——— Main Component ———
export function GlobalRulesManager({ userInfo, onClose, onSelectTemplate }: GlobalRulesManagerProps) {
    const [templates, setTemplates] = useState<GlobalRuleTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState({ name: "", description: "" })

    // Check admin access
    if (!isAdmin(userInfo)) {
        return (
            <div style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: "rgba(0,0,0,0.5)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10000,
            }}>
                <div style={{
                    backgroundColor: colors.white,
                    padding: "24px",
                    borderRadius: "8px",
                    maxWidth: "400px",
                    textAlign: "center",
                }}>
                    <FaExclamationTriangle size={24} color={colors.warning} style={{ marginBottom: "16px" }} />
                    <h3>Toegang Geweigerd</h3>
                    <p>Deze functie is alleen beschikbaar voor administrators.</p>
                    <button onClick={onClose} style={styles.primaryButton}>
                        Sluiten
                    </button>
                </div>
            </div>
        )
    }

    // Load templates on mount
    useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        try {
            setLoading(true)
            const data = await fetchGlobalRuleTemplates()
            setTemplates(data)
        } catch (err) {
            setError(formatErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleSaveTemplate = async (template: Omit<GlobalRuleTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>) => {
        try {
            const savedTemplate = await saveGlobalRuleTemplate(template)
            setTemplates(prev => [...prev, savedTemplate])
            return savedTemplate
        } catch (err) {
            setError(formatErrorMessage(err))
            throw err
        }
    }

    const handleUpdateTemplate = async (id: string, updates: Partial<GlobalRuleTemplate>) => {
        try {
            const updatedTemplate = await updateGlobalRuleTemplate(id, updates)
            setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))
            setEditingId(null)
        } catch (err) {
            setError(formatErrorMessage(err))
        }
    }

    const handleDeleteTemplate = async (id: string) => {
        if (!confirm("Weet je zeker dat je deze template wilt verwijderen?")) return

        try {
            await deleteGlobalRuleTemplate(id)
            setTemplates(prev => prev.filter(t => t.id !== id))
        } catch (err) {
            setError(formatErrorMessage(err))
        }
    }

    const handleDuplicateTemplate = (template: GlobalRuleTemplate) => {
        const duplicatedTemplate = {
            ...template,
            name: `${template.name} (Kopie)`,
            description: `Kopie van: ${template.description || template.name}`,
            createdBy: userInfo.sub,
        }
        delete (duplicatedTemplate as any).id
        delete (duplicatedTemplate as any).createdAt
        delete (duplicatedTemplate as any).updatedAt
        delete (duplicatedTemplate as any).usageCount

        handleSaveTemplate(duplicatedTemplate)
    }

    const startEdit = (template: GlobalRuleTemplate) => {
        setEditingId(template.id)
        setEditForm({
            name: template.name,
            description: template.description || "",
        })
    }

    const cancelEdit = () => {
        setEditingId(null)
        setEditForm({ name: "", description: "" })
    }

    const saveEdit = () => {
        if (editingId && editForm.name.trim()) {
            handleUpdateTemplate(editingId, {
                name: editForm.name.trim(),
                description: editForm.description.trim() || undefined,
            })
        }
    }

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: "20px",
        }}>
            <div style={{
                backgroundColor: colors.white,
                borderRadius: "12px",
                width: "90%",
                maxWidth: "1000px",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
                fontFamily: FONT_STACK,
            }}>
                {/* Header */}
                <div style={{
                    padding: "20px 24px",
                    borderBottom: `1px solid ${colors.gray200}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <FaGlobe size={20} color={colors.primary} />
                        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: "600" }}>
                            Globale Acceptatie Regels
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            border: "none",
                            background: "none",
                            cursor: "pointer",
                            padding: "8px",
                            color: colors.gray400,
                        }}
                    >
                        <FaTimes size={16} />
                    </button>
                </div>

                {/* Content */}
                <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    {error && (
                        <div style={{
                            margin: "16px 24px 0",
                            padding: "12px",
                            backgroundColor: colors.errorBg,
                            color: colors.error,
                            borderRadius: "6px",
                            fontSize: "14px",
                        }}>
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div style={{
                            flex: 1,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}>
                            <div>Laden...</div>
                        </div>
                    ) : (
                        <div style={{
                            flex: 1,
                            overflowY: "auto",
                            padding: "24px",
                        }}>
                            {templates.length === 0 ? (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px",
                                    color: colors.gray500,
                                }}>
                                    <FaGlobe size={32} color={colors.gray300} style={{ marginBottom: "16px" }} />
                                    <h3>Geen Globale Templates</h3>
                                    <p>Er zijn nog geen globale acceptatie regel templates aangemaakt.</p>
                                </div>
                            ) : (
                                <div style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(auto-fill, minmax(400px, 1fr))",
                                    gap: "16px",
                                }}>
                                    {templates.map((template) => (
                                        <GlobalRuleTemplateCard
                                            key={template.id}
                                            template={template}
                                            isEditing={editingId === template.id}
                                            onEdit={() => startEdit(template)}
                                            onSave={saveEdit}
                                            onCancel={cancelEdit}
                                            onDelete={() => handleDeleteTemplate(template.id)}
                                            onDuplicate={() => handleDuplicateTemplate(template)}
                                            onSelect={onSelectTemplate ? () => onSelectTemplate(template) : undefined}
                                            editForm={editForm}
                                            onEditFormChange={(field, value) => setEditForm(prev => ({ ...prev, [field]: value }))}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

// ——— Export for external use ———
export { GlobalRulesManager as default }