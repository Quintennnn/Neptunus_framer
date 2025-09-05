// src/OrganizationPageOverride.tsx
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override } from "framer"
import { useState, useEffect, useCallback } from "react"
import { UserInfoBanner } from "../components/UserInfoBanner.tsx"
import {
    NewOrganizationButton,
    OrganizationActionButtons,
} from "../components/InsuranceButtons.tsx"
import {
    useDynamicSchema,
    getFieldsForObjectType,
    getUserInputFieldsForObjectType,
    useOrganizationSchema,
} from "https://framer.com/m/UseDynamicSchema-3ADY.js@Sy35oQBfgBpXZJLUAYHg"
import {
    FaEdit,
    FaTrashAlt,
    FaSearch,
    FaFilter,
    FaToggleOn,
    FaToggleOff,
    FaTimes,
    FaBuilding,
    FaPlayCircle,
    FaCheckCircle,
    FaExclamationTriangle,
    FaClipboardList,
    FaClock,
    FaFileContract,
    FaUsers,
    FaPlus,
    FaSort,
    FaSortUp,
    FaSortDown,
} from "react-icons/fa"
import { colors, styles, hover, animations, FONT_STACK } from "../Theme.tsx"
import {
    API_BASE_URL,
    API_PATHS,
    getIdToken,
    formatErrorMessage,
    formatSuccessMessage,
    validateRequired,
    validateStringLength,
} from "../Utils.tsx"
import { OrganizationForm } from "./Create.tsx"

// ——— User Role Detection ———
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    organization?: string
    organizations?: string[]
}

// Fetch user info from backend API
async function fetchUserInfo(cognitoSub: string): Promise<UserInfo | null> {
    try {
        const token = getIdToken()
        const headers: Record<string, string> = {
            "Content-Type": "application/json",
        }
        if (token) headers.Authorization = `Bearer ${token}`

        const res = await fetch(
            `${API_BASE_URL}${API_PATHS.USER}/${cognitoSub}`,
            {
                method: "GET",
                headers,
                mode: "cors",
            }
        )

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const responseData = await res.json()

        // Handle nested response structure
        const userData = responseData.user || responseData

        const processedUserInfo = {
            sub: cognitoSub,
            role: userData.role || "user", // Default to user if role not found
            organization: userData.organization,
            organizations: userData.organizations || [],
        }

        return processedUserInfo
    } catch (error) {
        console.error("Failed to fetch user info:", error)
        return null
    }
}

function getCurrentUserInfo(): UserInfo | null {
    try {
        const token = getIdToken()
        if (!token) return null

        // Decode JWT to get cognito sub
        const payload = JSON.parse(atob(token.split(".")[1]))

        // Return basic info with sub - role will be fetched separately
        return {
            sub: payload.sub,
            role: "user", // Temporary default, will be updated by fetchUserInfo
            organization: undefined,
            organizations: [],
        }
    } catch (error) {
        console.error("Failed to decode token:", error)
        return null
    }
}

// Check if user is admin
function isAdmin(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "admin"
}

// Check if user is broker/editor
function isBroker(userInfo: UserInfo | null): boolean {
    return userInfo?.role === "editor"
}

// Check if user has access to an organization
function hasOrganizationAccess(
    userInfo: UserInfo | null,
    organization: string
): boolean {
    if (!userInfo) return false
    if (isAdmin(userInfo)) return true // Admins can see everything
    if (userInfo.organization === organization) return true
    return userInfo.organizations?.includes(organization) || false
}

// Organization columns are now retrieved dynamically from backend schema
// No more hardcoded column definitions

// All field definitions now come from backend Field Registry - no hardcoded fallbacks

function ColumnFilterDropdown({
    columns,
    visibleColumns,
    onToggleColumn,
    onClose,
}: {
    columns: typeof ORG_COLUMNS
    visibleColumns: Set<string>
    onToggleColumn: (key: string) => void
    onClose: () => void
}) {
    return (
        <div
            style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 4,
                background: colors.white,
                border: `1px solid ${colors.gray300}`,
                borderRadius: 8,
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                zIndex: 1000,
                minWidth: 200,
                maxHeight: "400px",
                overflow: "hidden",
                fontFamily: FONT_STACK,
            }}
        >
            <div
                style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #e5e7eb",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                }}
            >
                <span style={{ fontWeight: 600, fontSize: 14 }}>
                    Toon Kolommen
                </span>
                <button
                    onClick={onClose}
                    style={{
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: "#6b7280",
                        padding: 4,
                    }}
                >
                    <FaTimes size={12} />
                </button>
            </div>
            <div
                style={{
                    padding: 8,
                    maxHeight: "320px",
                    overflowY: "auto",
                }}
            >
                {columns.map((col) => (
                    <label
                        key={col.key}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            padding: "8px 12px",
                            cursor: "pointer",
                            borderRadius: 4,
                            fontSize: 14,
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#f3f4f6"
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                                "transparent"
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={visibleColumns.has(col.key)}
                            onChange={() => onToggleColumn(col.key)}
                            style={{ marginRight: 8 }}
                        />
                        {col.label}
                    </label>
                ))}
            </div>
        </div>
    )
}

function ConfirmDeleteDialog({
    onConfirm,
    onCancel,
}: {
    onConfirm: () => void
    onCancel: () => void
}) {
    return (
        <div
            style={{
                ...styles.modal,
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
            }}
        >
            <div
                style={{ ...styles.title, fontSize: "18px", marginBottom: 12 }}
            >
                Verwijder Organisatie
            </div>
            <p
                style={{
                    fontSize: 14,
                    marginBottom: 20,
                    color: colors.gray500,
                }}
            >
                Weet je zeker dat je deze organisatie wilt verwijderen?
            </p>
            <div style={styles.buttonGroup}>
                <button
                    onClick={onCancel}
                    style={{
                        ...styles.secondaryButton,
                        padding: "10px 16px",
                        backgroundColor: colors.gray200,
                    }}
                    onMouseOver={(e) => hover.secondaryButton(e.target)}
                    onMouseOut={(e) => hover.resetSecondaryButton(e.target)}
                >
                    Annuleren
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        ...styles.primaryButton,
                        padding: "10px 16px",
                        backgroundColor: colors.error,
                    }}
                    onMouseOver={(e) =>
                        (e.target.style.backgroundColor = "#dc2626")
                    }
                    onMouseOut={(e) =>
                        (e.target.style.backgroundColor = colors.error)
                    }
                >
                    Verwijderen
                </button>
            </div>
        </div>
    )
}

/**
 * Auto-Goedkeuring Configuratie UI voor Organisaties
 *
 * Dit component biedt een interface voor beheerders om auto-goedkeuring regels in te stellen
 * for boat applications. It includes:
 * - Enable/disable auto-approval
 * - Multiple rules with AND/OR logic
 * - Conditions on various boat fields (value, location, type, etc.)
 * - Different operators for numeric and string fields
 * - Retroactive approval for existing pending boats
 * - Live preview of rule effects
 */

// Available operators for different field types
const OPERATORS = {
    numeric: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "lt", label: "Kleiner dan" },
        { value: "le", label: "Kleiner dan of gelijk aan" },
        { value: "gt", label: "Groter dan" },
        { value: "ge", label: "Groter dan of gelijk aan" },
        { value: "between", label: "Tussen" },
    ],
    string: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "in", label: "In lijst" },
        { value: "not_in", label: "Niet in lijst" },
        { value: "contains", label: "Bevat" },
        { value: "starts_with", label: "Begint met" },
        { value: "ends_with", label: "Eindigt met" },
        { value: "regex", label: "Reguliere expressie" },
    ],
}

// Note: Field types are now obtained from the dynamic schema instead of hardcoded mapping

function AutoApprovalTab({
    config,
    onChange,
    org,
}: {
    config: any
    onChange: (config: any) => void
    org: any
}) {
    const [availableFields, setAvailableFields] = useState<
        Array<{ key: string; label: string; type: string }>
    >([])
    const { schema: dynamicSchema, loading: schemaLoading } = useDynamicSchema(
        org?.name
    )

    // Extract required fields from organization configuration using dynamic schema
    useEffect(() => {
        if (!org || schemaLoading || !dynamicSchema) {
            return
        }

        try {
            // Get all user input fields from the dynamic schema
            const userInputFields = getUserInputFieldsForObjectType(
                dynamicSchema,
                "boat"
            )

            // Map fields and only include required ones based on org config
            const requiredFields = userInputFields
                .filter((field) => {
                    // Check if field is required in the organization config
                    const boatConfig =
                        org.insured_object_fields_config?.boat || {}
                    return boatConfig[field.key]?.required || false
                })
                .map((field) => ({
                    key: field.key,
                    label: field.label,
                    type:
                        field.type === "currency" || field.type === "number"
                            ? "numeric"
                            : "string",
                }))

            setAvailableFields(requiredFields)
        } catch (error) {
            console.error(
                "Error extracting required fields from dynamic schema:",
                error
            )
            setAvailableFields([])
        }
    }, [org, dynamicSchema, schemaLoading])

    const addRule = () => {
        const newRule = {
            name: `Rule ${config.rules.length + 1}`,
            conditions: {},
            logic: "AND",
            pricing: {
                premium_promille: 5.0,
                eigen_risico: 250
            }
        }
        onChange({
            ...config,
            rules: [...config.rules, newRule],
        })
    }

    const updateRule = (index: number, updatedRule: any) => {
        const newRules = [...config.rules]
        newRules[index] = updatedRule
        onChange({
            ...config,
            rules: newRules,
        })
    }

    const deleteRule = (index: number) => {
        onChange({
            ...config,
            rules: config.rules.filter((_: any, i: number) => i !== index),
        })
    }

    const addCondition = (ruleIndex: number, fieldKey: string) => {
        const rule = config.rules[ruleIndex]
        const field = availableFields.find((f) => f.key === fieldKey)
        const fieldType = field?.type || "string"
        const defaultOperator = fieldType === "numeric" ? "lt" : "eq"

        const newCondition = {
            operator: defaultOperator,
            value: fieldType === "numeric" ? 0 : "",
            values: [],
        }

        const updatedRule = {
            ...rule,
            conditions: {
                ...rule.conditions,
                [fieldKey]: newCondition,
            },
        }
        updateRule(ruleIndex, updatedRule)
    }

    const updateCondition = (
        ruleIndex: number,
        fieldKey: string,
        conditionData: any
    ) => {
        const rule = config.rules[ruleIndex]
        const updatedRule = {
            ...rule,
            conditions: {
                ...rule.conditions,
                [fieldKey]: conditionData,
            },
        }
        updateRule(ruleIndex, updatedRule)
    }

    const removeCondition = (ruleIndex: number, fieldKey: string) => {
        const rule = config.rules[ruleIndex]
        const { [fieldKey]: removed, ...remainingConditions } = rule.conditions
        const updatedRule = {
            ...rule,
            conditions: remainingConditions,
        }
        updateRule(ruleIndex, updatedRule)
    }

    if (schemaLoading) {
        return (
            <div style={{ padding: 20, textAlign: "center" }}>
                <p style={{ color: colors.gray500 }}>
                    Beschikbare velden laden...
                </p>
            </div>
        )
    }

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ ...styles.title, fontSize: 16, marginBottom: 8 }}>
                    Auto-Goedkeuring Configuratie
                </h3>
                <p
                    style={{
                        fontSize: 14,
                        color: colors.gray500,
                        marginBottom: 16,
                    }}
                >
                    Configureer regels om automatisch boten goed te keuren die
                    aan specifieke criteria voldoen.
                    <br />
                    <br />
                    <strong>Hoe meerdere regels werken:</strong> Als je meerdere
                    regels hebt, wordt een boot automatisch goedgekeurd zodra
                    het voldoet aan <em>één van de regels</em> (OF-logica).
                    Binnen elke regel kun je kiezen of alle voorwaarden moeten
                    kloppen (EN) of slechts één voorwaarde (OF).
                </p>

                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        marginBottom: 16,
                        cursor: "pointer",
                    }}
                >
                    <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) =>
                            onChange({ ...config, enabled: e.target.checked })
                        }
                        style={{ marginRight: 8 }}
                    />
                    <span style={{ fontWeight: 500 }}>
                        Auto-Goedkeuring Inschakelen
                    </span>
                </label>
            </div>

            {config.enabled && (
                <div>
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: 16,
                        }}
                    >
                        <h4
                            style={{ fontSize: 14, fontWeight: 600, margin: 0 }}
                        >
                            Goedkeurings regels
                        </h4>
                        <button
                            type="button"
                            onClick={addRule}
                            style={{
                                ...styles.primaryButton,
                                padding: "8px 12px",
                                fontSize: 12,
                                borderRadius: 6,
                            }}
                            onMouseOver={(e) =>
                                hover.primaryButton(e.target as HTMLElement)
                            }
                            onMouseOut={(e) =>
                                hover.resetPrimaryButton(
                                    e.target as HTMLElement
                                )
                            }
                        >
                            + Regel Toevoegen
                        </button>
                    </div>

                    {config.rules.length === 0 ? (
                        <div
                            style={{
                                padding: 20,
                                border: `2px dashed ${colors.gray300}`,
                                borderRadius: 8,
                                textAlign: "center",
                                color: colors.gray500,
                            }}
                        >
                            Geen regels geconfigureerd. Klik op "Regel
                            Toevoegen" om je eerste auto-goedkeuring regel aan
                            te maken.
                        </div>
                    ) : (
                        config.rules.map((rule: any, ruleIndex: number) => (
                            <RuleEditor
                                key={ruleIndex}
                                rule={rule}
                                ruleIndex={ruleIndex}
                                availableFields={availableFields}
                                onUpdate={(updatedRule) =>
                                    updateRule(ruleIndex, updatedRule)
                                }
                                onDelete={() => deleteRule(ruleIndex)}
                                onAddCondition={(fieldKey) =>
                                    addCondition(ruleIndex, fieldKey)
                                }
                                onUpdateCondition={(fieldKey, conditionData) =>
                                    updateCondition(
                                        ruleIndex,
                                        fieldKey,
                                        conditionData
                                    )
                                }
                                onRemoveCondition={(fieldKey) =>
                                    removeCondition(ruleIndex, fieldKey)
                                }
                            />
                        ))
                    )}
                </div>
            )}
        </div>
    )
}

function RuleEditor({
    rule,
    ruleIndex,
    availableFields,
    onUpdate,
    onDelete,
    onAddCondition,
    onUpdateCondition,
    onRemoveCondition,
}: {
    rule: any
    ruleIndex: number
    availableFields: Array<{ key: string; label: string; type: string }>
    onUpdate: (rule: any) => void
    onDelete: () => void
    onAddCondition: (fieldKey: string) => void
    onUpdateCondition: (fieldKey: string, conditionData: any) => void
    onRemoveCondition: (fieldKey: string) => void
}) {
    const unusedFields = availableFields.filter(
        (field) => !rule.conditions.hasOwnProperty(field.key)
    )

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                padding: 16,
                marginBottom: 16,
                backgroundColor: "#fefefe",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                }}
            >
                <input
                    type="text"
                    value={rule.name}
                    onChange={(e) =>
                        onUpdate({ ...rule, name: e.target.value })
                    }
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        border: "1px solid #d1d5db",
                        borderRadius: 4,
                        padding: "6px 8px",
                        fontFamily: FONT_STACK,
                    }}
                    placeholder="Rule name"
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                        value={rule.logic}
                        onChange={(e) =>
                            onUpdate({ ...rule, logic: e.target.value })
                        }
                        style={{
                            padding: "6px 8px",
                            border: "1px solid #d1d5db",
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: FONT_STACK,
                        }}
                    >
                        <option value="AND">
                            EN (Alle voorwaarden moeten kloppen)
                        </option>
                        <option value="OR">
                            OF (Elke voorwaarde kan kloppen)
                        </option>
                    </select>
                    <button
                        type="button"
                        onClick={onDelete}
                        style={{
                            padding: "6px 8px",
                            backgroundColor: "#ef4444",
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: FONT_STACK,
                        }}
                    >
                        Regel Verwijderen
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <h5 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                    Conditions:
                </h5>
                {Object.keys(rule.conditions).length === 0 ? (
                    <div
                        style={{
                            padding: 12,
                            border: "1px dashed #d1d5db",
                            borderRadius: 4,
                            textAlign: "center",
                            color: "#9ca3af",
                            fontSize: 12,
                        }}
                    >
                        No conditions added. Add a condition below.
                    </div>
                ) : (
                    Object.entries(rule.conditions).map(
                        ([fieldKey, condition]: [string, any]) => (
                            <ConditionEditor
                                key={fieldKey}
                                fieldKey={fieldKey}
                                field={availableFields.find(
                                    (f) => f.key === fieldKey
                                )}
                                condition={condition}
                                onUpdate={(conditionData) =>
                                    onUpdateCondition(fieldKey, conditionData)
                                }
                                onRemove={() => onRemoveCondition(fieldKey)}
                            />
                        )
                    )
                )}
            </div>

            {unusedFields.length > 0 && (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <select
                        onChange={(e) => {
                            if (e.target.value) {
                                onAddCondition(e.target.value)
                                e.target.value = ""
                            }
                        }}
                        style={{
                            padding: "6px 8px",
                            border: "1px solid #d1d5db",
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: FONT_STACK,
                        }}
                    >
                        <option value="">Voorwaarde toevoegen...</option>
                        {unusedFields.map((field) => (
                            <option key={field.key} value={field.key}>
                                {field.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Pricing Configuration Section */}
            <div style={{ marginTop: 16, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                <h4 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: "#374151" }}>
                    Premie & Eigen Risico (Verplicht)
                </h4>
                <div style={{ display: "flex", gap: 12 }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4, color: "#6b7280" }}>
                            Premie Promillage (‰)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            min="0.1"
                            max="50"
                            value={rule.pricing?.premium_promille || ''}
                            onChange={(e) => onUpdate({ 
                                ...rule, 
                                pricing: { 
                                    ...rule.pricing, 
                                    premium_promille: parseFloat(e.target.value) || 0.1 
                                } 
                            })}
                            placeholder="5.0"
                            required
                            style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid #d1d5db",
                                borderRadius: 4,
                                fontSize: 12,
                                fontFamily: FONT_STACK,
                            }}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 500, marginBottom: 4, color: "#6b7280" }}>
                            Eigen Risico (€)
                        </label>
                        <input
                            type="number"
                            step="1"
                            min="0"
                            max="10000"
                            value={rule.pricing?.eigen_risico || ''}
                            onChange={(e) => onUpdate({ 
                                ...rule, 
                                pricing: { 
                                    ...rule.pricing, 
                                    eigen_risico: parseFloat(e.target.value) || 0 
                                } 
                            })}
                            placeholder="250"
                            required
                            style={{
                                width: "100%",
                                padding: "6px 8px",
                                border: "1px solid #d1d5db",
                                borderRadius: 4,
                                fontSize: 12,
                                fontFamily: FONT_STACK,
                            }}
                        />
                    </div>
                </div>
                <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
                    Deze prijzen worden automatisch toegepast op verzekeringsobjecten die voldoen aan deze regel.
                </p>
            </div>
        </div>
    )
}

function ConditionEditor({
    fieldKey,
    field,
    condition,
    onUpdate,
    onRemove,
}: {
    fieldKey: string
    field?: { key: string; label: string; type: string }
    condition: any
    onUpdate: (condition: any) => void
    onRemove: () => void
}) {
    const fieldType = field?.type || "string"
    const operators =
        OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.string

    const handleValueChange = (value: string) => {
        if (fieldType === "numeric") {
            onUpdate({ ...condition, value: parseFloat(value) || 0 })
        } else {
            onUpdate({ ...condition, value })
        }
    }

    const handleValuesChange = (values: string) => {
        const valueArray = values
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v)
        onUpdate({ ...condition, values: valueArray })
    }

    const needsValues = ["between", "in", "not_in"].includes(condition.operator)
    const needsSingleValue = !needsValues

    return (
        <div
            style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                padding: 8,
                border: "1px solid #e5e7eb",
                borderRadius: 4,
                marginBottom: 8,
                fontSize: 12,
            }}
        >
            <span style={{ minWidth: 100, fontWeight: 500 }}>
                {field?.label}:
            </span>

            <select
                value={condition.operator}
                onChange={(e) =>
                    onUpdate({ ...condition, operator: e.target.value })
                }
                style={{
                    padding: "4px 6px",
                    border: "1px solid #d1d5db",
                    borderRadius: 3,
                    fontSize: 11,
                    fontFamily: FONT_STACK,
                }}
            >
                {operators.map((op) => (
                    <option key={op.value} value={op.value}>
                        {op.label}
                    </option>
                ))}
            </select>

            {needsSingleValue && (
                <input
                    type={fieldType === "numeric" ? "number" : "text"}
                    value={condition.value || ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder={
                        fieldType === "numeric" ? "Enter number" : "Enter value"
                    }
                    style={{
                        padding: "4px 6px",
                        border: "1px solid #d1d5db",
                        borderRadius: 3,
                        fontSize: 11,
                        minWidth: 120,
                        fontFamily: FONT_STACK,
                    }}
                />
            )}

            {needsValues && (
                <input
                    type="text"
                    value={condition.values?.join(", ") || ""}
                    onChange={(e) => handleValuesChange(e.target.value)}
                    placeholder={
                        condition.operator === "between"
                            ? "min, max"
                            : "value1, value2, value3..."
                    }
                    style={{
                        padding: "4px 6px",
                        border: "1px solid #d1d5db",
                        borderRadius: 3,
                        fontSize: 11,
                        minWidth: 150,
                        fontFamily: FONT_STACK,
                    }}
                />
            )}

            <button
                type="button"
                onClick={onRemove}
                style={{
                    padding: "2px 6px",
                    backgroundColor: "#f87171",
                    color: "white",
                    border: "none",
                    borderRadius: 3,
                    cursor: "pointer",
                    fontSize: 10,
                    fontFamily: FONT_STACK,
                }}
            >
                ×
            </button>
        </div>
    )
}

function EditOrgForm({
    org,
    onClose,
    refresh,
}: {
    org: any
    onClose: () => void
    refresh: () => void
}) {
    const [name, setName] = useState(org.name || "")
    const [typeOrganisatie, setTypeOrganisatie] = useState(
        org.type_organisatie || ""
    )
    const [street, setStreet] = useState(org.street || "")
    const [city, setCity] = useState(org.city || "")
    const [state, setState] = useState(org.state || "")
    const [postalCode, setPostalCode] = useState(org.postal_code || "")
    const [country, setCountry] = useState(org.country || "")
    const [linkedPolicyId, setLinkedPolicyId] = useState(
        org.linked_policy_id || ""
    )
    const [insuredObjectFieldsConfig, setInsuredObjectFieldsConfig] = useState(
        () => {
            // Use the new insured_object_fields_config structure
            const newConfig = org.insured_object_fields_config || {}

            // All fields are now configurable by admin - no forced required fields
            const enhancedBoatConfig = { ...newConfig.boat }

            return {
                boat: enhancedBoatConfig,
                motor: newConfig.motor || {},
                trailer: newConfig.trailer || {},
                other: newConfig.other || {},
            }
        }
    )
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"basic" | "fields" | "approval">(
        "basic"
    )
    const [autoApprovalConfig, setAutoApprovalConfig] = useState(
        org.auto_approval_config || { enabled: false, rules: [] }
    )

    // Use dynamic schema for field configuration
    const { schema: dynamicSchema, loading: schemaLoading } = useDynamicSchema(
        org.name
    )

    const updateFieldConfig = (
        fieldKey: string,
        property: "required" | "visible",
        value: boolean
    ) => {
        setInsuredObjectFieldsConfig((prev) => {
            const updatedConfig = {
                ...prev,
                boat: {
                    ...prev.boat,
                    [fieldKey]: {
                        ...prev.boat[fieldKey],
                        [property]: value,
                    },
                },
            }

            // If visibility is turned off, also turn off required
            if (property === "visible" && !value) {
                updatedConfig.boat[fieldKey].required = false
            }

            return updatedConfig
        })
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        
        // Validate that all enabled rules have required pricing
        if (autoApprovalConfig.enabled && autoApprovalConfig.rules.length > 0) {
            const missingPricing = autoApprovalConfig.rules.filter((rule: any, index: number) => {
                const pricing = rule.pricing
                return !pricing || 
                       typeof pricing.premium_promille !== 'number' || 
                       typeof pricing.eigen_risico !== 'number' ||
                       pricing.premium_promille <= 0 ||
                       pricing.eigen_risico < 0
            })
            
            if (missingPricing.length > 0) {
                setError(`Alle regels moeten verplichte prijzen hebben. Controleer de regels: ${missingPricing.map((rule: any, index: number) => rule.name || `Regel ${index + 1}`).join(', ')}`)
                return
            }
        }
        
        try {
            // All fields are now configurable by admin - no forced requirements
            const updatedInsuredObjectFieldsConfig = {
                ...insuredObjectFieldsConfig,
                boat: {
                    ...insuredObjectFieldsConfig.boat,
                },
            }

            const payload = {
                name,
                type_organisatie: typeOrganisatie,
                street: street || undefined,
                city: city || undefined,
                state: state || undefined,
                postal_code: postalCode || undefined,
                country: country || undefined,
                linked_policy_id: linkedPolicyId || undefined,
                insured_object_fields_config: updatedInsuredObjectFieldsConfig,
                auto_approval_config: autoApprovalConfig,
            }

            // Update the organization (all configuration goes to organization, not policy)
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.ORGANIZATION}/${org.id}`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                    body: JSON.stringify(payload),
                }
            )
            if (!res.ok) {
                const data = await res.json()
                throw new Error(data.message || "Failed to update")
            }
            setSuccess("Organization updated successfully.")
            setTimeout(() => {
                refresh()
                onClose()
            }, 1000)
        } catch (err: any) {
            setError(err.message)
        }
    }

    return (
        <div
            style={{
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                ...styles.modal,
                padding: 32,
                borderRadius: 12,
                boxShadow: "0 25px 70px rgba(0,0,0,0.15)",
                minWidth: 600,
                maxWidth: "90vw",
                maxHeight: "90vh",
                overflow: "auto",
            }}
        >
            <h2 style={{ marginBottom: 16 }}>Organisatie Bewerken</h2>

            {/* Tab Navigation */}
            <div
                style={{
                    display: "flex",
                    marginBottom: 20,
                    borderBottom: "1px solid #e5e7eb",
                }}
            >
                <button
                    onClick={() => setActiveTab("basic")}
                    style={{
                        padding: "12px 20px",
                        border: "none",
                        background: "none",
                        borderBottom:
                            activeTab === "basic"
                                ? "2px solid #3b82f6"
                                : "none",
                        color: activeTab === "basic" ? "#3b82f6" : "#6b7280",
                        fontWeight: activeTab === "basic" ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Basic Info
                </button>
                <button
                    onClick={() => setActiveTab("fields")}
                    style={{
                        padding: "12px 20px",
                        border: "none",
                        background: "none",
                        borderBottom:
                            activeTab === "fields"
                                ? "2px solid #3b82f6"
                                : "none",
                        color: activeTab === "fields" ? "#3b82f6" : "#6b7280",
                        fontWeight: activeTab === "fields" ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Boot Velden Configuratie
                </button>
                <button
                    onClick={() => setActiveTab("approval")}
                    style={{
                        padding: "12px 20px",
                        border: "none",
                        background: "none",
                        borderBottom:
                            activeTab === "approval"
                                ? "2px solid #3b82f6"
                                : "none",
                        color: activeTab === "approval" ? "#3b82f6" : "#6b7280",
                        fontWeight: activeTab === "approval" ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Auto-Goedkeuring Instellingen
                </button>
            </div>

            <form onSubmit={handleSubmit}>
                {activeTab === "basic" && (
                    <div>
                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 500,
                            }}
                        >
                            Organization Name
                        </label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            style={{
                                width: "100%",
                                padding: 12,
                                fontSize: 14,
                                border: "1px solid #d1d5db",
                                borderRadius: 8,
                                marginBottom: 16,
                                fontFamily: FONT_STACK,
                            }}
                        />

                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 500,
                            }}
                        >
                            Type Organisatie
                            <span style={{ color: "#ef4444", marginLeft: 4 }}>
                                *
                            </span>
                        </label>
                        <select
                            value={typeOrganisatie}
                            onChange={(e) => setTypeOrganisatie(e.target.value)}
                            style={{
                                width: "100%",
                                padding: 12,
                                fontSize: 14,
                                border: "1px solid #d1d5db",
                                borderRadius: 8,
                                marginBottom: 16,
                                fontFamily: FONT_STACK,
                                backgroundColor: "#fff",
                                cursor: "pointer",
                            }}
                        >
                            <option value="" disabled>
                                Selecteer type organisatie
                            </option>
                            <option value="Huur">Huur</option>
                            <option value="Handelsvoorraad">
                                Handelsvoorraad
                            </option>
                        </select>

                        {/* Address Section */}
                        <div style={{ marginTop: 24 }}>
                            <h3
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    marginBottom: 16,
                                    paddingBottom: 8,
                                    borderBottom: "1px solid #e5e7eb",
                                }}
                            >
                                Adresgegevens (Optioneel)
                            </h3>

                            <div style={{ marginBottom: 16 }}>
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: 8,
                                        fontWeight: 500,
                                    }}
                                >
                                    Straat
                                </label>
                                <input
                                    value={street}
                                    onChange={(e) => setStreet(e.target.value)}
                                    placeholder="Voer straatnaam en huisnummer in"
                                    style={{
                                        width: "100%",
                                        padding: 12,
                                        fontSize: 14,
                                        border: "1px solid #d1d5db",
                                        borderRadius: 8,
                                        marginBottom: 16,
                                        fontFamily: FONT_STACK,
                                    }}
                                />
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 12,
                                    marginBottom: 16,
                                }}
                            >
                                <div style={{ flex: 2 }}>
                                    <label
                                        style={{
                                            display: "block",
                                            marginBottom: 8,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Stad
                                    </label>
                                    <input
                                        value={city}
                                        onChange={(e) =>
                                            setCity(e.target.value)
                                        }
                                        placeholder="Voer stad in"
                                        style={{
                                            width: "100%",
                                            padding: 12,
                                            fontSize: 14,
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontFamily: FONT_STACK,
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label
                                        style={{
                                            display: "block",
                                            marginBottom: 8,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Postcode
                                    </label>
                                    <input
                                        value={postalCode}
                                        onChange={(e) =>
                                            setPostalCode(e.target.value)
                                        }
                                        placeholder="1234AB"
                                        style={{
                                            width: "100%",
                                            padding: 12,
                                            fontSize: 14,
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontFamily: FONT_STACK,
                                        }}
                                    />
                                </div>
                            </div>

                            <div
                                style={{
                                    display: "flex",
                                    gap: 12,
                                    marginBottom: 16,
                                }}
                            >
                                <div style={{ flex: 1 }}>
                                    <label
                                        style={{
                                            display: "block",
                                            marginBottom: 8,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Provincie/Staat
                                    </label>
                                    <input
                                        value={state}
                                        onChange={(e) =>
                                            setState(e.target.value)
                                        }
                                        placeholder="Voer provincie/staat in"
                                        style={{
                                            width: "100%",
                                            padding: 12,
                                            fontSize: 14,
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontFamily: FONT_STACK,
                                        }}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label
                                        style={{
                                            display: "block",
                                            marginBottom: 8,
                                            fontWeight: 500,
                                        }}
                                    >
                                        Land
                                    </label>
                                    <input
                                        value={country}
                                        onChange={(e) =>
                                            setCountry(e.target.value)
                                        }
                                        placeholder="Nederland"
                                        style={{
                                            width: "100%",
                                            padding: 12,
                                            fontSize: 14,
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontFamily: FONT_STACK,
                                        }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: 16 }}>
                                <label
                                    style={{
                                        display: "block",
                                        marginBottom: 8,
                                        fontWeight: 500,
                                    }}
                                >
                                    Gekoppelde Polis ID (Optioneel)
                                </label>
                                <input
                                    value={linkedPolicyId}
                                    onChange={(e) =>
                                        setLinkedPolicyId(e.target.value)
                                    }
                                    placeholder="Voer polis ID in"
                                    style={{
                                        width: "100%",
                                        padding: 12,
                                        fontSize: 14,
                                        border: "1px solid #d1d5db",
                                        borderRadius: 8,
                                        fontFamily: FONT_STACK,
                                    }}
                                />
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === "fields" && (
                    <div>
                        <div style={{ marginBottom: 16 }}>
                            <h3
                                style={{
                                    fontSize: 16,
                                    fontWeight: 600,
                                    marginBottom: 8,
                                }}
                            >
                                Boot Velden Configureren
                            </h3>
                            <p
                                style={{
                                    fontSize: 14,
                                    color: "#6b7280",
                                    marginBottom: 16,
                                }}
                            >
                                Configureer vereiste en zichtbare velden voor
                                deze organisatie. "Zichtbaar": Is het veld
                                zichtbaar voor de gebruiker in de tabel?
                                "Vereist": Moet de gebruiker dit veld invullen
                                om een verzekerd object toe te voegen?
                            </p>
                        </div>

                        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                            {schemaLoading ? (
                                <div
                                    style={{ padding: 20, textAlign: "center" }}
                                >
                                    <p style={{ color: colors.gray500 }}>
                                        Velden laden...
                                    </p>
                                </div>
                            ) : dynamicSchema ? (
                                <div>
                                    <h4
                                        style={{
                                            fontSize: 14,
                                            fontWeight: 600,
                                            marginBottom: 12,
                                            color: colors.gray700,
                                        }}
                                    >
                                        Boot Velden (Alle velden zijn
                                        configureerbaar)
                                    </h4>
                                    <table
                                        style={{ width: "100%", fontSize: 14 }}
                                    >
                                        <thead
                                            style={{
                                                position: "sticky",
                                                top: 0,
                                                backgroundColor: "#f9fafb",
                                            }}
                                        >
                                            <tr>
                                                <th
                                                    style={{
                                                        textAlign: "left",
                                                        padding: 12,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Veld
                                                </th>
                                                <th
                                                    style={{
                                                        textAlign: "center",
                                                        padding: 12,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Zichtbaar
                                                </th>
                                                <th
                                                    style={{
                                                        textAlign: "center",
                                                        padding: 12,
                                                        fontWeight: 600,
                                                    }}
                                                >
                                                    Verplicht
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {getUserInputFieldsForObjectType(
                                                dynamicSchema,
                                                "boat"
                                            ).map((field) => {
                                                const config =
                                                    insuredObjectFieldsConfig
                                                        .boat[field.key] || {
                                                        visible: false,
                                                        required: false,
                                                    }
                                                return (
                                                    <tr
                                                        key={field.key}
                                                        style={{
                                                            borderBottom:
                                                                "1px solid #f3f4f6",
                                                        }}
                                                    >
                                                        <td
                                                            style={{
                                                                padding: 12,
                                                            }}
                                                        >
                                                            {field.label}
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    "center",
                                                                padding: 12,
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateFieldConfig(
                                                                        field.key,
                                                                        "visible",
                                                                        !config.visible
                                                                    )
                                                                }
                                                                style={{
                                                                    border: "none",
                                                                    background:
                                                                        "none",
                                                                    cursor: "pointer",
                                                                    color: config.visible
                                                                        ? "#10b981"
                                                                        : "#d1d5db",
                                                                    fontSize: 18,
                                                                }}
                                                            >
                                                                {config.visible ? (
                                                                    <FaToggleOn />
                                                                ) : (
                                                                    <FaToggleOff />
                                                                )}
                                                            </button>
                                                        </td>
                                                        <td
                                                            style={{
                                                                textAlign:
                                                                    "center",
                                                                padding: 12,
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    updateFieldConfig(
                                                                        field.key,
                                                                        "required",
                                                                        !config.required
                                                                    )
                                                                }
                                                                disabled={
                                                                    !config.visible
                                                                }
                                                                style={{
                                                                    border: "none",
                                                                    background:
                                                                        "none",
                                                                    cursor: config.visible
                                                                        ? "pointer"
                                                                        : "not-allowed",
                                                                    color:
                                                                        config.visible &&
                                                                        config.required
                                                                            ? colors.primary
                                                                            : colors.gray300,
                                                                    fontSize: 18,
                                                                }}
                                                            >
                                                                {config.required ? (
                                                                    <FaToggleOn />
                                                                ) : (
                                                                    <FaToggleOff />
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div
                                    style={{ padding: 20, textAlign: "center" }}
                                >
                                    <p style={{ color: colors.gray500 }}>
                                        Geen velden beschikbaar
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === "approval" && (
                    <AutoApprovalTab
                        config={autoApprovalConfig}
                        onChange={setAutoApprovalConfig}
                        org={org}
                    />
                )}

                {error && (
                    <div
                        style={{
                            ...styles.errorAlert,
                            marginBottom: 12,
                            padding: 0,
                            border: "none",
                            backgroundColor: "transparent",
                        }}
                    >
                        {error}
                    </div>
                )}
                {success && (
                    <div
                        style={{
                            ...styles.successAlert,
                            marginBottom: 12,
                            padding: 0,
                            border: "none",
                            backgroundColor: "transparent",
                        }}
                    >
                        {success}
                    </div>
                )}

                <div style={{ ...styles.buttonGroup, marginTop: 24 }}>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            ...styles.secondaryButton,
                            padding: "12px 20px",
                            backgroundColor: colors.gray200,
                        }}
                        onMouseOver={(e) => hover.secondaryButton(e.target)}
                        onMouseOut={(e) => hover.resetSecondaryButton(e.target)}
                    >
                        Annuleren
                    </button>
                    <button
                        type="submit"
                        style={{
                            ...styles.primaryButton,
                            padding: "12px 20px",
                            backgroundColor: "#3b82f6",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        Wijzigingen Opslaan
                    </button>
                </div>
            </form>
        </div>
    )
}

export function OrganizationPageOverride(): Override {
    const [orgs, setOrgs] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [editingOrg, setEditingOrg] = useState<any | null>(null) // Legacy - keeping for backward compatibility
    const [showEditForm, setShowEditForm] = useState(false)
    const [editingOrgId, setEditingOrgId] = useState<string | null>(null)
    const [editingOrgName, setEditingOrgName] = useState<string | null>(null)
    const [deletingOrgId, setDeletingOrgId] = useState<string | number | null>(
        null
    )
    const [searchTerm, setSearchTerm] = useState("")
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
    const [pendingCount, setPendingCount] = useState<number>(0)
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [policies, setPolicies] = useState<any[]>([])

    // Use dynamic schema for organization columns
    const {
        schema: organizationSchema,
        loading: schemaLoading,
        error: schemaError,
    } = useOrganizationSchema()
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())

    async function fetchPendingCount(): Promise<number> {
        try {
            const token = getIdToken()
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            if (token) headers.Authorization = `Bearer ${token}`

            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.INSURED_OBJECT}?status=Pending`,
                {
                    method: "GET",
                    headers,
                    mode: "cors",
                }
            )

            if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
            const data = await res.json()
            const result =
                data.items || data.objects || data.insuredObjects || data || []
            return Array.isArray(result) ? result.length : 0
        } catch (error) {
            console.error("Error fetching pending count:", error)
            return 0
        }
    }

    const refresh = useCallback(async () => {
        try {
            const res = await fetch(
                `${API_BASE_URL}${API_PATHS.ORGANIZATION}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                }
            )

            const json = await res.json()
            let organizations = json.organizations || []

            // Filter organizations based on user role and access
            if (userInfo && !isAdmin(userInfo)) {
                // Non-admin users can only see their own organizations
                organizations = organizations.filter((org: any) =>
                    hasOrganizationAccess(userInfo, org.name)
                )
            }

            // No longer fetching policy data - keep it simple, organization-only
            setOrgs(organizations)
        } catch (err: any) {
            setError(err.message)
        }
    }, [userInfo])

    // Load user info on mount
    useEffect(() => {
        async function loadUserInfo() {
            const basicUserInfo = getCurrentUserInfo()
            if (basicUserInfo) {
                setUserInfo(basicUserInfo)

                // Fetch detailed user info from backend
                const detailedUserInfo = await fetchUserInfo(basicUserInfo.sub)
                if (detailedUserInfo) {
                    setUserInfo(detailedUserInfo)
                }
            }
            setIsLoadingUserInfo(false)
        }

        loadUserInfo()
    }, [])

    useEffect(() => {
        if (!isLoadingUserInfo) {
            refresh()
        }

        // Listen for refresh events from edit form
        const handleRefresh = () => refresh()
        window.addEventListener("refreshOrganizations", handleRefresh)

        // Listen for edit organization events
        const handleEditOrganization = (event: CustomEvent) => {
            setEditingOrgId(event.detail.organizationId)
            setEditingOrgName(event.detail.organizationName)
            setShowEditForm(true)
        }
        window.addEventListener(
            "editOrganization",
            handleEditOrganization as EventListener
        )

        return () => {
            window.removeEventListener("refreshOrganizations", handleRefresh)
            window.removeEventListener(
                "editOrganization",
                handleEditOrganization as EventListener
            )
        }
    }, [refresh, isLoadingUserInfo])

    // Fetch pending count
    useEffect(() => {
        const loadPendingCount = async () => {
            const count = await fetchPendingCount()
            setPendingCount(count)
        }
        loadPendingCount()
    }, [])

    // Get organization columns from schema
    const organizationColumns = React.useMemo(() => {
        if (!organizationSchema) return []
        return organizationSchema
            .filter((field) => field.visible)
            .map((field) => ({
                key: field.key,
                label: field.label,
                width: field.width || "150px",
            }))
    }, [organizationSchema])

    // Initialize visible columns when schema loads
    useEffect(() => {
        if (organizationColumns.length > 0) {
            setVisibleColumns(
                new Set(organizationColumns.map((col) => col.key))
            )
        }
    }, [organizationColumns])

    // Filter and sort organizations
    const filteredAndSortedOrgs = React.useMemo(() => {
        let filtered =
            orgs?.filter((org) =>
                org.name?.toLowerCase().includes(searchTerm.toLowerCase())
            ) ?? []

        // Apply sorting
        if (sortField) {
            filtered = [...filtered].sort((a, b) => {
                const aValue = a[sortField]
                const bValue = b[sortField]

                // Handle null/undefined values
                if (aValue == null && bValue == null) return 0
                if (aValue == null) return 1
                if (bValue == null) return -1

                let comparison = 0
                if (typeof aValue === "string" && typeof bValue === "string") {
                    comparison = aValue.localeCompare(bValue)
                } else if (
                    typeof aValue === "boolean" &&
                    typeof bValue === "boolean"
                ) {
                    comparison = aValue === bValue ? 0 : aValue ? 1 : -1
                } else {
                    // For dates and other types
                    comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0
                }

                return sortDirection === "desc" ? -comparison : comparison
            })
        }

        return filtered
    }, [orgs, searchTerm, sortField, sortDirection])

    const handleSort = (field: string) => {
        if (sortField === field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            // New field, start with ascending
            setSortField(field)
            setSortDirection("asc")
        }
    }

    const toggleColumn = (key: string) => {
        setVisibleColumns((prev) => {
            const next = new Set(prev)
            next.has(key) ? next.delete(key) : next.add(key)
            return next
        })
    }

    async function handleDelete() {
        if (deletingOrgId == null) return
        try {
            // Find the organization in our current list to get its details
            const orgToDelete = orgs?.find((org) => org.id === deletingOrgId)
            const linkedPolicyId = orgToDelete?.linked_policy_id

            // Delete the organization
            await fetch(
                `${API_BASE_URL}${API_PATHS.ORGANIZATION}/${deletingOrgId}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${getIdToken()}`,
                    },
                }
            )

            // No longer deleting linked policies - keep it simple, organization-only

            refresh()
        } catch (err) {
            alert("Delete failed: " + (err as Error).message)
        } finally {
            setDeletingOrgId(null)
        }
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString()
    }

    // Close column filter when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (showColumnFilter) {
                const target = event.target as Element
                if (!target.closest("[data-column-filter]")) {
                    setShowColumnFilter(false)
                }
            }
        }

        document.addEventListener("mousedown", handleClickOutside)
        return () =>
            document.removeEventListener("mousedown", handleClickOutside)
    }, [showColumnFilter])

    if (orgs === null || isLoadingUserInfo || schemaLoading)
        return {
            children: (
                <div
                    style={{
                        fontFamily: FONT_STACK,
                        padding: 24,
                        color: "#6b7280",
                        fontSize: 16,
                    }}
                >
                    {schemaLoading
                        ? "Schema laden..."
                        : "Organisaties laden..."}
                </div>
            ),
        }

    if (error || schemaError)
        return {
            children: (
                <div
                    style={{
                        fontFamily: FONT_STACK,
                        backgroundColor: "#fef2f2",
                        color: "#b91c1c",
                        padding: 24,
                        borderRadius: 8,
                        fontSize: 14,
                    }}
                >
                    Fout: {error || schemaError}
                </div>
            ),
        }

    const visible = organizationColumns.filter((col) =>
        visibleColumns.has(col.key)
    )

    return {
        children: (
            <>
                <div
                    style={{
                        padding: 24,
                        fontFamily: FONT_STACK,
                        backgroundColor: "#f8fafc",
                        minHeight: "100vh",
                    }}
                >
                    {/* User Info Banner */}
                    <div style={{ marginBottom: "20px" }}>
                        <UserInfoBanner />
                    </div>

                    <div
                        style={{
                            ...styles.card,
                            borderRadius: 12,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            overflow: "hidden",
                        }}
                    >
                        {/* Enhanced Navigation Tabs Section */}
                        <div
                            style={{
                                padding: "20px 24px",
                                backgroundColor: "#f8fafc",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                gap: "8px",
                                overflowX: "auto",
                                alignItems: "center",
                            }}
                        >
                            <button
                                style={{
                                    padding: "16px 24px",
                                    backgroundColor: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "12px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    cursor: "default",
                                    fontFamily: FONT_STACK,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    minHeight: "48px",
                                    boxShadow:
                                        "0 2px 8px rgba(59, 130, 246, 0.15)",
                                    transform: "translateY(-1px)",
                                }}
                            >
                                <FaBuilding size={14} />
                                Organisaties
                            </button>
                            <button
                                onClick={() => {
                                    window.location.href = "/policies"
                                }}
                                style={{
                                    padding: "16px 24px",
                                    backgroundColor: "#ffffff",
                                    color: "#6b7280",
                                    border: "2px solid #e5e7eb",
                                    borderRadius: "12px",
                                    fontSize: "15px",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    fontFamily: FONT_STACK,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    transition: "all 0.2s",
                                    minHeight: "48px",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = "#f8fafc"
                                    e.target.style.borderColor = "#3b82f6"
                                    e.target.style.color = "#3b82f6"
                                    e.target.style.transform =
                                        "translateY(-1px)"
                                    e.target.style.boxShadow =
                                        "0 4px 12px rgba(59, 130, 246, 0.15)"
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = "#ffffff"
                                    e.target.style.borderColor = "#e5e7eb"
                                    e.target.style.color = "#6b7280"
                                    e.target.style.transform = "none"
                                    e.target.style.boxShadow =
                                        "0 2px 4px rgba(0,0,0,0.05)"
                                }}
                            >
                                <FaFileContract size={14} />
                                Polissen
                            </button>
                            {/* Only show Pending tab for admin and editor roles */}
                            {userInfo?.role !== "user" && (
                                <button
                                    onClick={() => {
                                        window.location.href =
                                            "/pending_overview"
                                    }}
                                    style={{
                                        padding: "16px 24px",
                                        backgroundColor: "#ffffff",
                                        color: "#6b7280",
                                        border: "2px solid #e5e7eb",
                                        borderRadius: "12px",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        fontFamily: FONT_STACK,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        transition: "all 0.2s",
                                        minHeight: "48px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                        position: "relative",
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor =
                                            "#f8fafc"
                                        e.target.style.borderColor = "#3b82f6"
                                        e.target.style.color = "#3b82f6"
                                        e.target.style.transform =
                                            "translateY(-1px)"
                                        e.target.style.boxShadow =
                                            "0 4px 12px rgba(59, 130, 246, 0.15)"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor =
                                            "#ffffff"
                                        e.target.style.borderColor = "#e5e7eb"
                                        e.target.style.color = "#6b7280"
                                        e.target.style.transform = "none"
                                        e.target.style.boxShadow =
                                            "0 2px 4px rgba(0,0,0,0.05)"
                                    }}
                                >
                                    <FaClock size={14} />
                                    Pending Items
                                    {/* Pending count badge */}
                                    {pendingCount > 0 && (
                                        <span
                                            style={{
                                                backgroundColor: "#dc2626",
                                                color: "white",
                                                borderRadius: "10px",
                                                padding: "2px 6px",
                                                fontSize: "12px",
                                                fontWeight: "700",
                                                minWidth: "18px",
                                                textAlign: "center",
                                                marginLeft: "4px",
                                            }}
                                        >
                                            {pendingCount}
                                        </span>
                                    )}
                                </button>
                            )}
                            {/* Only show Users tab for admin and editor roles */}
                            {userInfo?.role !== "user" && (
                                <button
                                    onClick={() => {
                                        window.location.href = "/users"
                                    }}
                                    style={{
                                        padding: "16px 24px",
                                        backgroundColor: "#ffffff",
                                        color: "#6b7280",
                                        border: "2px solid #e5e7eb",
                                        borderRadius: "12px",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        fontFamily: FONT_STACK,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        transition: "all 0.2s",
                                        minHeight: "48px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor =
                                            "#f8fafc"
                                        e.target.style.borderColor = "#3b82f6"
                                        e.target.style.color = "#3b82f6"
                                        e.target.style.transform =
                                            "translateY(-1px)"
                                        e.target.style.boxShadow =
                                            "0 4px 12px rgba(59, 130, 246, 0.15)"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor =
                                            "#ffffff"
                                        e.target.style.borderColor = "#e5e7eb"
                                        e.target.style.color = "#6b7280"
                                        e.target.style.transform = "none"
                                        e.target.style.boxShadow =
                                            "0 2px 4px rgba(0,0,0,0.05)"
                                    }}
                                >
                                    <FaUsers size={14} />
                                    Gebruikers
                                </button>
                            )}
                            {/* Only show Changelog tab for admin and editor roles */}
                            {userInfo?.role !== "user" && (
                                <button
                                    onClick={() => {
                                        window.location.href = "/changelog"
                                    }}
                                    style={{
                                        padding: "16px 24px",
                                        backgroundColor: "#ffffff",
                                        color: "#6b7280",
                                        border: "2px solid #e5e7eb",
                                        borderRadius: "12px",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        cursor: "pointer",
                                        fontFamily: FONT_STACK,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        transition: "all 0.2s",
                                        minHeight: "48px",
                                        boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                                    }}
                                    onMouseOver={(e) => {
                                        e.target.style.backgroundColor =
                                            "#f8fafc"
                                        e.target.style.borderColor = "#3b82f6"
                                        e.target.style.color = "#3b82f6"
                                        e.target.style.transform =
                                            "translateY(-1px)"
                                        e.target.style.boxShadow =
                                            "0 4px 12px rgba(59, 130, 246, 0.15)"
                                    }}
                                    onMouseOut={(e) => {
                                        e.target.style.backgroundColor =
                                            "#ffffff"
                                        e.target.style.borderColor = "#e5e7eb"
                                        e.target.style.color = "#6b7280"
                                        e.target.style.transform = "none"
                                        e.target.style.boxShadow =
                                            "0 2px 4px rgba(0,0,0,0.05)"
                                    }}
                                >
                                    <FaClipboardList size={14} />
                                    Changelog
                                </button>
                            )}
                        </div>

                        {/* Main Header Section */}
                        <div
                            style={{
                                padding: 24,
                                borderBottom: "1px solid #e5e7eb",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "flex-start",
                                    marginBottom: 20,
                                }}
                            >
                                <div>
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "12px",
                                            marginBottom: 8,
                                        }}
                                    >
                                        <h1
                                            style={{
                                                margin: 0,
                                                fontSize: "28px",
                                                fontWeight: 600,
                                                color: "#1f2937",
                                                letterSpacing: "-0.025em",
                                            }}
                                        >
                                            {isAdmin(userInfo)
                                                ? "Organisatie Beheer"
                                                : "Mijn Organisaties"}
                                        </h1>
                                        <div
                                            style={{
                                                fontSize: "14px",
                                                color: colors.gray500,
                                                backgroundColor: colors.gray100,
                                                padding: "4px 12px",
                                                borderRadius: "12px",
                                                fontWeight: "500",
                                            }}
                                        >
                                            {filteredAndSortedOrgs.length}{" "}
                                            organisaties
                                        </div>
                                    </div>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: "16px",
                                            color: colors.gray600,
                                        }}
                                    >
                                        Beheer organisaties en configureer
                                        instellingen
                                    </p>
                                </div>

                                {/* Create Organization Button - RBAC-aware */}
                                <NewOrganizationButton
                                    userInfo={userInfo}
                                    onClick={() => {
                                        setShowCreateModal(true)
                                    }}
                                >
                                    Nieuwe Organisatie
                                </NewOrganizationButton>
                            </div>

                            {/* Search and Filter Controls */}
                            <div style={{ display: "flex", gap: 12 }}>
                                <div style={{ position: "relative", flex: 1 }}>
                                    <FaSearch
                                        style={{
                                            position: "absolute",
                                            top: "50%",
                                            left: 12,
                                            transform: "translateY(-50%)",
                                            color: colors.gray400,
                                        }}
                                    />
                                    <input
                                        placeholder="Zoek organisaties..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        style={{
                                            ...styles.input,
                                            padding: "12px 12px 12px 36px",
                                        }}
                                    />
                                </div>
                                <div
                                    style={{ position: "relative" }}
                                    data-column-filter
                                >
                                    <button
                                        onClick={() =>
                                            setShowColumnFilter(
                                                !showColumnFilter
                                            )
                                        }
                                        style={{
                                            padding: "12px 16px",
                                            backgroundColor: showColumnFilter
                                                ? "#3b82f6"
                                                : "#f3f4f6",
                                            color: showColumnFilter
                                                ? "#fff"
                                                : "#374151",
                                            border: "none",
                                            borderRadius: "8px",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            cursor: "pointer",
                                            fontFamily: FONT_STACK,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                        }}
                                    >
                                        <FaFilter /> Kolommen (
                                        {organizationColumns.length > 0
                                            ? visible.length
                                            : 0}
                                        )
                                    </button>
                                    {showColumnFilter &&
                                        organizationColumns.length > 0 && (
                                            <ColumnFilterDropdown
                                                columns={organizationColumns}
                                                visibleColumns={visibleColumns}
                                                onToggleColumn={toggleColumn}
                                                onClose={() =>
                                                    setShowColumnFilter(false)
                                                }
                                            />
                                        )}
                                </div>
                            </div>
                        </div>

                        <div style={{ overflowX: "auto" }}>
                            {organizationColumns.length === 0 &&
                            !schemaLoading ? (
                                <div
                                    style={{
                                        padding: 48,
                                        textAlign: "center",
                                        color: colors.gray500,
                                    }}
                                >
                                    <p>
                                        Geen kolom schema beschikbaar.
                                        Controleer de backend Field Registry
                                        configuratie.
                                    </p>
                                </div>
                            ) : (
                                <table
                                    style={{
                                        width: "100%",
                                        borderCollapse: "collapse",
                                        fontSize: 14,
                                    }}
                                >
                                    <thead>
                                        <tr
                                            style={{
                                                backgroundColor: "#f9fafb",
                                            }}
                                        >
                                            <th
                                                style={{
                                                    textAlign: "left",
                                                    padding: 12,
                                                    fontWeight: 600,
                                                    color: "#374151",
                                                }}
                                            >
                                                Acties
                                            </th>
                                            {visible.map((col) => (
                                                <th
                                                    key={col.key}
                                                    style={{
                                                        textAlign: "left",
                                                        padding: 12,
                                                        fontWeight: 600,
                                                        color: colors.gray700,
                                                        width: col.width,
                                                        cursor: "pointer",
                                                        userSelect: "none",
                                                        position: "relative",
                                                    }}
                                                    onClick={() =>
                                                        handleSort(col.key)
                                                    }
                                                    onMouseOver={(e) => {
                                                        e.target.style.backgroundColor =
                                                            "#f3f4f6"
                                                    }}
                                                    onMouseOut={(e) => {
                                                        e.target.style.backgroundColor =
                                                            "transparent"
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: "8px",
                                                        }}
                                                    >
                                                        {col.label}
                                                        <div
                                                            style={{
                                                                display: "flex",
                                                                flexDirection:
                                                                    "column",
                                                                alignItems:
                                                                    "center",
                                                                opacity:
                                                                    sortField ===
                                                                    col.key
                                                                        ? 1
                                                                        : 0.3,
                                                            }}
                                                        >
                                                            {sortField ===
                                                            col.key ? (
                                                                sortDirection ===
                                                                "asc" ? (
                                                                    <FaSortUp
                                                                        size={
                                                                            12
                                                                        }
                                                                        style={{
                                                                            color: "#3b82f6",
                                                                        }}
                                                                    />
                                                                ) : (
                                                                    <FaSortDown
                                                                        size={
                                                                            12
                                                                        }
                                                                        style={{
                                                                            color: "#3b82f6",
                                                                        }}
                                                                    />
                                                                )
                                                            ) : (
                                                                <FaSort
                                                                    size={12}
                                                                />
                                                            )}
                                                        </div>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAndSortedOrgs.length === 0 ? (
                                            <tr>
                                                <td
                                                    colSpan={Math.max(
                                                        visible.length + 1,
                                                        2
                                                    )}
                                                    style={{
                                                        padding: 48,
                                                        textAlign: "center",
                                                        color: colors.gray500,
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection:
                                                                "column",
                                                            alignItems:
                                                                "center",
                                                            gap: "16px",
                                                        }}
                                                    >
                                                        <FaBuilding
                                                            size={48}
                                                            style={{
                                                                color: colors.gray300,
                                                            }}
                                                        />
                                                        <div>
                                                            <h3
                                                                style={{
                                                                    margin: "0 0 8px 0",
                                                                    fontSize:
                                                                        "18px",
                                                                    fontWeight:
                                                                        "600",
                                                                    color: colors.gray700,
                                                                }}
                                                            >
                                                                Geen
                                                                organisaties
                                                                gevonden
                                                            </h3>
                                                            <p
                                                                style={{
                                                                    margin: 0,
                                                                    fontSize:
                                                                        "14px",
                                                                    color: colors.gray500,
                                                                }}
                                                            >
                                                                {searchTerm
                                                                    ? `Geen organisaties gevonden voor "${searchTerm}"`
                                                                    : "Je hebt geen toegang tot organisaties of er zijn nog geen organisaties aangemaakt."}
                                                            </p>
                                                            {!searchTerm && (
                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            "16px",
                                                                    }}
                                                                >
                                                                    <NewOrganizationButton
                                                                        userInfo={
                                                                            userInfo
                                                                        }
                                                                        onClick={() => {
                                                                            setShowCreateModal(
                                                                                true
                                                                            )
                                                                        }}
                                                                        style={{
                                                                            fontSize:
                                                                                "14px",
                                                                            fontWeight:
                                                                                "500",
                                                                            padding:
                                                                                "10px 16px",
                                                                        }}
                                                                    >
                                                                        Maak je
                                                                        eerste
                                                                        organisatie
                                                                        aan
                                                                    </NewOrganizationButton>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        ) : (
                                            filteredAndSortedOrgs.map(
                                                (org, i) => (
                                                    <tr
                                                        key={org.id}
                                                        style={{
                                                            backgroundColor:
                                                                i % 2 === 0
                                                                    ? colors.white
                                                                    : colors.gray50,
                                                        }}
                                                    >
                                                        <td
                                                            style={{
                                                                padding: 12,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    display:
                                                                        "flex",
                                                                    gap: "6px",
                                                                }}
                                                            >
                                                                {/* Primary Action - Bekijk Vloot */}
                                                                <button
                                                                    onClick={() => {
                                                                        const orgParam =
                                                                            encodeURIComponent(
                                                                                org.name
                                                                            )
                                                                        window.location.href = `/insuredobjects?org=${orgParam}`
                                                                    }}
                                                                    style={{
                                                                        ...styles.primaryButton,
                                                                        padding:
                                                                            "8px 12px",
                                                                        backgroundColor:
                                                                            "#10b981",
                                                                        fontSize: 12,
                                                                        borderRadius: 6,
                                                                        gap: "4px",
                                                                        fontWeight:
                                                                            "500",
                                                                    }}
                                                                    onMouseOver={(
                                                                        e
                                                                    ) => {
                                                                        e.target.style.backgroundColor =
                                                                            "#059669"
                                                                    }}
                                                                    onMouseOut={(
                                                                        e
                                                                    ) => {
                                                                        e.target.style.backgroundColor =
                                                                            "#10b981"
                                                                    }}
                                                                >
                                                                    📋 Bekijk
                                                                    Vloot
                                                                </button>

                                                                <OrganizationActionButtons
                                                                    userInfo={
                                                                        userInfo
                                                                    }
                                                                    onEdit={() => {
                                                                        setEditingOrgId(
                                                                            org.id
                                                                        )
                                                                        setEditingOrgName(
                                                                            org.name
                                                                        )
                                                                        setShowEditForm(
                                                                            true
                                                                        )
                                                                    }}
                                                                    onDelete={() =>
                                                                        setDeletingOrgId(
                                                                            org.id
                                                                        )
                                                                    }
                                                                    resourceOrganization={
                                                                        org.name
                                                                    }
                                                                />
                                                            </div>
                                                        </td>
                                                        {visible.map((col) => (
                                                            <td
                                                                key={col.key}
                                                                style={{
                                                                    padding: 12,
                                                                    color: colors.gray700,
                                                                }}
                                                            >
                                                                {/* Make organization name clickable */}
                                                                {col.key ===
                                                                "name" ? (
                                                                    <button
                                                                        onClick={() => {
                                                                            const orgParam =
                                                                                encodeURIComponent(
                                                                                    org.name
                                                                                )
                                                                            window.location.href = `/insuredobjects?org=${orgParam}`
                                                                        }}
                                                                        style={{
                                                                            background:
                                                                                "none",
                                                                            border: "none",
                                                                            color: "#3b82f6",
                                                                            fontSize:
                                                                                "14px",
                                                                            fontWeight:
                                                                                "500",
                                                                            cursor: "pointer",
                                                                            textDecoration:
                                                                                "underline",
                                                                            fontFamily:
                                                                                FONT_STACK,
                                                                            padding: 0,
                                                                            textAlign:
                                                                                "left",
                                                                        }}
                                                                        onMouseOver={(
                                                                            e
                                                                        ) => {
                                                                            e.target.style.color =
                                                                                "#1d4ed8"
                                                                        }}
                                                                        onMouseOut={(
                                                                            e
                                                                        ) => {
                                                                            e.target.style.color =
                                                                                "#3b82f6"
                                                                        }}
                                                                        title={`Ga naar vloot van ${org.name}`}
                                                                    >
                                                                        {org[
                                                                            col
                                                                                .key
                                                                        ] ??
                                                                            "-"}
                                                                    </button>
                                                                ) : col.key ===
                                                                  "type_organisatie" ? (
                                                                    <span
                                                                        style={{
                                                                            padding:
                                                                                "4px 8px",
                                                                            borderRadius:
                                                                                "12px",
                                                                            fontSize:
                                                                                "12px",
                                                                            fontWeight:
                                                                                "500",
                                                                            backgroundColor:
                                                                                org[
                                                                                    col
                                                                                        .key
                                                                                ] ===
                                                                                "Huur"
                                                                                    ? "#dbeafe"
                                                                                    : "#f3e8ff",
                                                                            color:
                                                                                org[
                                                                                    col
                                                                                        .key
                                                                                ] ===
                                                                                "Huur"
                                                                                    ? "#1e40af"
                                                                                    : "#7c3aed",
                                                                        }}
                                                                    >
                                                                        {org[
                                                                            col
                                                                                .key
                                                                        ] ||
                                                                            "-"}
                                                                    </span>
                                                                ) : col.key ===
                                                                      "createdAt" ||
                                                                  col.key ===
                                                                      "updatedAt" ? (
                                                                    formatDate(
                                                                        org[
                                                                            col
                                                                                .key
                                                                        ]
                                                                    )
                                                                ) : col.key ===
                                                                  "linked_policy_id" ? (
                                                                    <span
                                                                        style={{
                                                                            padding:
                                                                                "4px 8px",
                                                                            borderRadius:
                                                                                "12px",
                                                                            fontSize:
                                                                                "12px",
                                                                            fontWeight:
                                                                                "500",
                                                                            backgroundColor:
                                                                                org[
                                                                                    col
                                                                                        .key
                                                                                ]
                                                                                    ? "#dbeafe"
                                                                                    : "#f3f4f6",
                                                                            color: org[
                                                                                col
                                                                                    .key
                                                                            ]
                                                                                ? "#1e40af"
                                                                                : "#6b7280",
                                                                        }}
                                                                    >
                                                                        {org[
                                                                            col
                                                                                .key
                                                                        ] ||
                                                                            "Geen polis"}
                                                                    </span>
                                                                ) : (
                                                                    (org[
                                                                        col.key
                                                                    ] ?? "-")
                                                                )}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                )
                                            )
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Delete Modal */}
                {deletingOrgId &&
                    ReactDOM.createPortal(
                        <div style={styles.modalOverlay}>
                            <ConfirmDeleteDialog
                                onConfirm={handleDelete}
                                onCancel={() => setDeletingOrgId(null)}
                            />
                        </div>,
                        document.body
                    )}

                {/* Edit Modal */}
                {showEditForm &&
                    editingOrgName &&
                    ReactDOM.createPortal(
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
                            <EditOrgForm
                                org={orgs?.find(
                                    (o) => o.name === editingOrgName
                                )}
                                onClose={() => {
                                    setShowEditForm(false)
                                    setEditingOrgId(null)
                                    setEditingOrgName(null)
                                }}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}

                {/* Create Organization Modal */}
                {showCreateModal &&
                    ReactDOM.createPortal(
                        <div style={styles.modalOverlay}>
                            <OrganizationForm
                                onClose={() => setShowCreateModal(false)}
                                onSuccess={() => {
                                    refresh() // Refresh the organization list
                                }}
                            />
                        </div>,
                        document.body
                    )}
            </>
        ),
    }
}
