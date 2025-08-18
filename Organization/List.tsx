// src/OrganizationPageOverride.tsx
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override } from "framer"
import { useState, useEffect, useCallback } from "react"
import { UserInfoBanner } from "../components/UserInfoBanner"
import { NewOrganizationButton, OrganizationActionButtons } from "../components/InsuranceButtons"
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
    FaFileContract,
    FaUsers,
    FaPlus,
    FaSort,
    FaSortUp,
    FaSortDown,
} from "react-icons/fa"
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

        const res = await fetch(`${API_BASE_URL}${API_PATHS.USER}/${cognitoSub}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
        const responseData = await res.json()

        console.log("fetchUserInfo - raw user data from API:", responseData)

        // Handle nested response structure
        const userData = responseData.user || responseData

        const processedUserInfo = {
            sub: cognitoSub,
            role: userData.role || "user", // Default to user if role not found
            organization: userData.organization,
            organizations: userData.organizations || [],
        }

        console.log("fetchUserInfo - processed user info:", processedUserInfo)

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
function hasOrganizationAccess(userInfo: UserInfo | null, organization: string): boolean {
    if (!userInfo) return false
    if (isAdmin(userInfo)) return true // Admins can see everything
    if (userInfo.organization === organization) return true
    return userInfo.organizations?.includes(organization) || false
}

const ORG_COLUMNS = [
    { key: "name", label: "Name", width: "200px" },
    { key: "is_superorg", label: "Super Org", width: "100px" },
    { key: "createdAt", label: "Created", width: "150px" },
    { key: "updatedAt", label: "Updated", width: "150px" },
    { key: "lastUpdatedBy", label: "Updated By", width: "180px" },
]

// Available boat fields that can be configured (Dutch field names)
const BOAT_FIELDS = [
    { key: "premiepromillage", label: "Premie Promillage" }, // premiumPerMille
    { key: "notitie", label: "Notitie" }, // notes
    { key: "aantalMotoren", label: "Aantal Motoren" }, // numberOfEngines
    { key: "bootnummer", label: "Bootnummer" }, // boatNumber
    { key: "motornummer", label: "Motornummer" }, // engineNumber
    { key: "aantalVerzekerdeDagen", label: "Aantal Verzekerde Dagen" }, // numberOfInsuredDays
    { key: "typeMerkMotor", label: "Type/Merk Motor" }, // engineType
    { key: "bouwjaar", label: "Bouwjaar" }, // yearOfConstruction
    { key: "cinNummer", label: "CIN Nummer" }, // cinNumber
    { key: "uitgangsdatum", label: "Uitgangsdatum" }, // insuranceEndDate
    { key: "typeBoot", label: "Type Boot" }, // boatType
    { key: "eigenRisico", label: "Eigen Risico" }, // deductible
    { key: "organization", label: "Organization" },
    {
        key: "totalePremieOverDeVerzekerdePeriode",
        label: "Totale Premie Over De Verzekerde Periode", // totalPremiumForInsuredPeriod
    },
    { key: "totalePremieOverHetJaar", label: "Totale Premie Over Het Jaar" }, // totalAnnualPremium
    { key: "merkBoot", label: "Merk Boot" }, // boatBrand
    { key: "status", label: "Status" },
]

// Non-adjustable fields that are always required and visible for every organization
const REQUIRED_BOAT_FIELDS = [
    { key: "waarde", label: "Waarde" }, // value - always required and visible
    { key: "ligplaats", label: "Ligplaats" }, // mooringLocation - always required and visible
    { key: "ingangsdatum", label: "Ingangsdatum" }, // insuranceStartDate - always required and visible
]

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
                    Show Columns
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
            <div style={{ padding: 8 }}>
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
                Delete Organization
            </div>
            <p style={{ fontSize: 14, marginBottom: 20, color: colors.gray500 }}>
                Are you sure you want to delete this organization?
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
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        ...styles.primaryButton,
                        padding: "10px 16px",
                        backgroundColor: colors.error,
                    }}
                    onMouseOver={(e) => (e.target.style.backgroundColor = "#dc2626")}
                    onMouseOut={(e) => (e.target.style.backgroundColor = colors.error)}
                >
                    Delete
                </button>
            </div>
        </div>
    )
}

/**
 * Auto-Approval Configuration UI for Organizations
 * 
 * This component provides an interface for administrators to set up auto-approval rules
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
        { value: "eq", label: "Equal to" },
        { value: "ne", label: "Not equal to" },
        { value: "lt", label: "Less than" },
        { value: "le", label: "Less than or equal" },
        { value: "gt", label: "Greater than" },
        { value: "ge", label: "Greater than or equal" },
        { value: "between", label: "Between" }
    ],
    string: [
        { value: "eq", label: "Equal to" },
        { value: "ne", label: "Not equal to" },
        { value: "in", label: "In list" },
        { value: "not_in", label: "Not in list" },
        { value: "contains", label: "Contains" },
        { value: "starts_with", label: "Starts with" },
        { value: "ends_with", label: "Ends with" },
        { value: "regex", label: "Regular expression" }
    ]
}

// Field types mapping - determines which operators are available for each field (Dutch field names)
// Example usage:
// - waarde: numeric field, supports <, >, between, etc.
// - ligplaats: string field, supports contains, in list (with fuzzy matching), etc.
// - typeBoot: string field with fuzzy matching against predefined types
const FIELD_TYPES = {
    waarde: "numeric", // value
    bouwjaar: "numeric", // yearOfConstruction
    aantalMotoren: "numeric", // numberOfEngines
    aantalVerzekerdeDagen: "numeric", // numberOfInsuredDays
    premiepromillage: "numeric", // premiumPerMille
    eigenRisico: "numeric", // deductible
    totalePremieOverHetJaar: "numeric", // totalAnnualPremium
    totalePremieOverDeVerzekerdePeriode: "numeric", // totalPremiumForInsuredPeriod
    ligplaats: "string", // mooringLocation
    typeBoot: "string", // boatType
    typeMerkMotor: "string", // engineType
    merkBoot: "string", // boatBrand
    bootnummer: "string", // boatNumber
    motornummer: "string", // engineNumber
    cinNummer: "string", // cinNumber
    notitie: "string" // notes
}

function AutoApprovalTab({ config, onChange, orgName }: { config: any, onChange: (config: any) => void, orgName: string }) {
    const [retroactiveStatus, setRetroactiveStatus] = useState<'idle' | 'testing' | 'applying' | 'success' | 'error'>('idle')
    const [retroactiveResult, setRetroactiveResult] = useState<any>(null)

    const handleRetroactiveApproval = async (dryRun: boolean = false) => {
        setRetroactiveStatus(dryRun ? 'testing' : 'applying')
        setRetroactiveResult(null)
        
        try {
            const response = await fetch(`${API_BASE_URL}/neptunus/organization/apply-retroactive-approval`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${getIdToken()}`,
                },
                body: JSON.stringify({
                    organization_name: orgName,
                    dry_run: dryRun
                })
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || 'Failed to apply retroactive approval')
            }

            const result = await response.json()
            setRetroactiveResult(result.results)
            setRetroactiveStatus('success')
            
        } catch (error: any) {
            console.error('Retroactive approval failed:', error)
            setRetroactiveResult({ error: error.message })
            setRetroactiveStatus('error')
        }
    }

    const addRule = () => {
        const newRule = {
            name: `Rule ${config.rules.length + 1}`,
            conditions: {},
            logic: "AND"
        }
        onChange({
            ...config,
            rules: [...config.rules, newRule]
        })
    }

    const updateRule = (index: number, updatedRule: any) => {
        const newRules = [...config.rules]
        newRules[index] = updatedRule
        onChange({
            ...config,
            rules: newRules
        })
    }

    const deleteRule = (index: number) => {
        onChange({
            ...config,
            rules: config.rules.filter((_: any, i: number) => i !== index)
        })
    }

    const addCondition = (ruleIndex: number, fieldKey: string) => {
        const rule = config.rules[ruleIndex]
        const fieldType = FIELD_TYPES[fieldKey as keyof typeof FIELD_TYPES] || "string"
        const defaultOperator = fieldType === "numeric" ? "lt" : "eq"
        
        const newCondition = {
            operator: defaultOperator,
            value: fieldType === "numeric" ? 0 : "",
            values: []
        }
        
        const updatedRule = {
            ...rule,
            conditions: {
                ...rule.conditions,
                [fieldKey]: newCondition
            }
        }
        updateRule(ruleIndex, updatedRule)
    }

    const updateCondition = (ruleIndex: number, fieldKey: string, conditionData: any) => {
        const rule = config.rules[ruleIndex]
        const updatedRule = {
            ...rule,
            conditions: {
                ...rule.conditions,
                [fieldKey]: conditionData
            }
        }
        updateRule(ruleIndex, updatedRule)
    }

    const removeCondition = (ruleIndex: number, fieldKey: string) => {
        const rule = config.rules[ruleIndex]
        const { [fieldKey]: removed, ...remainingConditions } = rule.conditions
        const updatedRule = {
            ...rule,
            conditions: remainingConditions
        }
        updateRule(ruleIndex, updatedRule)
    }

    return (
        <div>
            <div style={{ marginBottom: 20 }}>
                <h3 style={{ ...styles.title, fontSize: 16, marginBottom: 8 }}>
                    Auto-Approval Configuration
                </h3>
                <p style={{ fontSize: 14, color: colors.gray500, marginBottom: 16 }}>
                    Configure rules to automatically approve boats that meet specific criteria.
                </p>
                
                <label style={{ display: "flex", alignItems: "center", marginBottom: 16, cursor: "pointer" }}>
                    <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => onChange({ ...config, enabled: e.target.checked })}
                        style={{ marginRight: 8 }}
                    />
                    <span style={{ fontWeight: 500 }}>Enable Auto-Approval</span>
                </label>
            </div>

            {config.enabled && (
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                        <h4 style={{ fontSize: 14, fontWeight: 600, margin: 0 }}>Approval Rules</h4>
                        <button
                            type="button"
                            onClick={addRule}
                            style={{
                                ...styles.primaryButton,
                                padding: "8px 12px",
                                fontSize: 12,
                                borderRadius: 6,
                            }}
                            onMouseOver={(e) => hover.primaryButton(e.target)}
                            onMouseOut={(e) => hover.resetPrimaryButton(e.target)}
                        >
                            + Add Rule
                        </button>
                    </div>

                    {config.rules.length === 0 ? (
                        <div style={{ 
                            padding: 20, 
                            border: `2px dashed ${colors.gray300}`, 
                            borderRadius: 8, 
                            textAlign: "center", 
                            color: colors.gray500 
                        }}>
                            No rules configured. Click "Add Rule" to create your first auto-approval rule.
                        </div>
                    ) : (
                        config.rules.map((rule: any, ruleIndex: number) => (
                            <RuleEditor
                                key={ruleIndex}
                                rule={rule}
                                ruleIndex={ruleIndex}
                                onUpdate={(updatedRule) => updateRule(ruleIndex, updatedRule)}
                                onDelete={() => deleteRule(ruleIndex)}
                                onAddCondition={(fieldKey) => addCondition(ruleIndex, fieldKey)}
                                onUpdateCondition={(fieldKey, conditionData) => updateCondition(ruleIndex, fieldKey, conditionData)}
                                onRemoveCondition={(fieldKey) => removeCondition(ruleIndex, fieldKey)}
                            />
                        ))
                    )}

                    <div style={{ ...styles.card, marginTop: 20, backgroundColor: colors.gray50 }}>
                        <h4 style={{ ...styles.title, fontSize: 14, marginBottom: 8 }}>Default Action</h4>
                        <p style={{ fontSize: 12, color: colors.gray500, marginBottom: 12 }}>
                            What should happen when no rules match?
                        </p>
                        <select
                            value={config.default_action}
                            onChange={(e) => onChange({ ...config, default_action: e.target.value })}
                            style={{
                                ...styles.input,
                                padding: "8px 12px",
                                borderRadius: 6,
                                fontSize: 14,
                            }}
                        >
                            <option value="pending">Keep as Pending (Manual Review)</option>
                            <option value="auto_approve">Auto-Approve</option>
                        </select>
                    </div>

                    {config.rules.length > 0 && (
                        <div style={{ ...styles.card, marginTop: 20, backgroundColor: "#eff6ff", border: "1px solid #dbeafe" }}>
                            <h4 style={{ ...styles.title, fontSize: 14, marginBottom: 8 }}>Apply to Existing Boats</h4>
                            <p style={{ fontSize: 12, color: colors.gray500, marginBottom: 12 }}>
                                Apply these auto-approval rules to boats that are currently pending.
                            </p>
                            
                            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                                <button
                                    type="button"
                                    onClick={() => handleRetroactiveApproval(true)}
                                    disabled={retroactiveStatus === 'testing' || retroactiveStatus === 'applying'}
                                    style={{
                                        ...styles.primaryButton,
                                        padding: "8px 12px",
                                        backgroundColor: "#3b82f6",
                                        borderRadius: 6,
                                        fontSize: 12,
                                        gap: 4,
                                        cursor: retroactiveStatus === 'testing' || retroactiveStatus === 'applying' ? "not-allowed" : "pointer",
                                        opacity: retroactiveStatus === 'testing' || retroactiveStatus === 'applying' ? 0.6 : 1,
                                    }}
                                >
                                    <FaPlayCircle size={12} />
                                    {retroactiveStatus === 'testing' ? 'Testing...' : 'Test Rules (Dry Run)'}
                                </button>
                                
                                <button
                                    type="button"
                                    onClick={() => handleRetroactiveApproval(false)}
                                    disabled={retroactiveStatus === 'testing' || retroactiveStatus === 'applying'}
                                    style={{
                                        ...styles.primaryButton,
                                        padding: "8px 12px",
                                        borderRadius: 6,
                                        fontSize: 12,
                                        gap: 4,
                                        cursor: retroactiveStatus === 'testing' || retroactiveStatus === 'applying' ? "not-allowed" : "pointer",
                                        opacity: retroactiveStatus === 'testing' || retroactiveStatus === 'applying' ? 0.6 : 1,
                                    }}
                                    onMouseOver={(e) => !e.target.disabled && hover.primaryButton(e.target)}
                                    onMouseOut={(e) => !e.target.disabled && hover.resetPrimaryButton(e.target)}
                                >
                                    <FaCheckCircle size={12} />
                                    {retroactiveStatus === 'applying' ? 'Applying...' : 'Apply Rules Now'}
                                </button>
                            </div>

                            {retroactiveResult && (
                                <div style={{ 
                                    padding: 12, 
                                    backgroundColor: retroactiveStatus === 'error' ? colors.errorBg : colors.successBg, 
                                    border: `1px solid ${retroactiveStatus === 'error' ? colors.errorBorder : colors.successBorder}`,
                                    borderRadius: 6,
                                    fontSize: 12
                                }}>
                                    {retroactiveStatus === 'error' ? (
                                        <div style={{ color: "#dc2626", display: "flex", alignItems: "center", gap: 4 }}>
                                            <FaExclamationTriangle size={12} />
                                            Error: {retroactiveResult.error}
                                        </div>
                                    ) : (
                                        <div style={{ color: "#166534" }}>
                                            <div style={{ fontWeight: 600, marginBottom: 4 }}>
                                                Results {retroactiveResult.would_approve !== undefined ? '(Preview)' : '(Applied)'}:
                                            </div>
                                            <div>• Total pending boats: {retroactiveResult.total_pending || 0}</div>
                                            <div>• Would be approved: {retroactiveResult.would_approve || retroactiveResult.auto_approved || 0}</div>
                                            <div>• Would remain pending: {retroactiveResult.would_remain_pending || retroactiveResult.still_pending || 0}</div>
                                            {retroactiveResult.errors > 0 && (
                                                <div style={{ color: "#dc2626" }}>• Errors: {retroactiveResult.errors}</div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function RuleEditor({ 
    rule, 
    ruleIndex, 
    onUpdate, 
    onDelete, 
    onAddCondition, 
    onUpdateCondition, 
    onRemoveCondition 
}: {
    rule: any,
    ruleIndex: number,
    onUpdate: (rule: any) => void,
    onDelete: () => void,
    onAddCondition: (fieldKey: string) => void,
    onUpdateCondition: (fieldKey: string, conditionData: any) => void,
    onRemoveCondition: (fieldKey: string) => void
}) {
    const availableFields = BOAT_FIELDS.filter(field => 
        FIELD_TYPES.hasOwnProperty(field.key as keyof typeof FIELD_TYPES)
    )

    const unusedFields = availableFields.filter(field => 
        !rule.conditions.hasOwnProperty(field.key)
    )

    return (
        <div style={{ 
            border: "1px solid #e5e7eb", 
            borderRadius: 8, 
            padding: 16, 
            marginBottom: 16, 
            backgroundColor: "#fefefe" 
        }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <input
                    type="text"
                    value={rule.name}
                    onChange={(e) => onUpdate({ ...rule, name: e.target.value })}
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
                        onChange={(e) => onUpdate({ ...rule, logic: e.target.value })}
                        style={{
                            padding: "6px 8px",
                            border: "1px solid #d1d5db",
                            borderRadius: 4,
                            fontSize: 12,
                            fontFamily: FONT_STACK,
                        }}
                    >
                        <option value="AND">AND (All conditions must match)</option>
                        <option value="OR">OR (Any condition can match)</option>
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
                        Delete Rule
                    </button>
                </div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <h5 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Conditions:</h5>
                {Object.keys(rule.conditions).length === 0 ? (
                    <div style={{ 
                        padding: 12, 
                        border: "1px dashed #d1d5db", 
                        borderRadius: 4, 
                        textAlign: "center", 
                        color: "#9ca3af", 
                        fontSize: 12 
                    }}>
                        No conditions added. Add a condition below.
                    </div>
                ) : (
                    Object.entries(rule.conditions).map(([fieldKey, condition]: [string, any]) => (
                        <ConditionEditor
                            key={fieldKey}
                            fieldKey={fieldKey}
                            condition={condition}
                            onUpdate={(conditionData) => onUpdateCondition(fieldKey, conditionData)}
                            onRemove={() => onRemoveCondition(fieldKey)}
                        />
                    ))
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
                        <option value="">Add condition...</option>
                        {unusedFields.map(field => (
                            <option key={field.key} value={field.key}>
                                {field.label}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    )
}

function ConditionEditor({ 
    fieldKey, 
    condition, 
    onUpdate, 
    onRemove 
}: {
    fieldKey: string,
    condition: any,
    onUpdate: (condition: any) => void,
    onRemove: () => void
}) {
    const field = BOAT_FIELDS.find(f => f.key === fieldKey)
    const fieldType = FIELD_TYPES[fieldKey as keyof typeof FIELD_TYPES] || "string"
    const operators = OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.string

    const handleValueChange = (value: string) => {
        if (fieldType === "numeric") {
            onUpdate({ ...condition, value: parseFloat(value) || 0 })
        } else {
            onUpdate({ ...condition, value })
        }
    }

    const handleValuesChange = (values: string) => {
        const valueArray = values.split(',').map(v => v.trim()).filter(v => v)
        onUpdate({ ...condition, values: valueArray })
    }

    const needsValues = ["between", "in", "not_in"].includes(condition.operator)
    const needsSingleValue = !needsValues

    return (
        <div style={{ 
            display: "flex", 
            gap: 8, 
            alignItems: "center", 
            padding: 8, 
            border: "1px solid #e5e7eb", 
            borderRadius: 4, 
            marginBottom: 8, 
            fontSize: 12 
        }}>
            <span style={{ minWidth: 100, fontWeight: 500 }}>{field?.label}:</span>
            
            <select
                value={condition.operator}
                onChange={(e) => onUpdate({ ...condition, operator: e.target.value })}
                style={{
                    padding: "4px 6px",
                    border: "1px solid #d1d5db",
                    borderRadius: 3,
                    fontSize: 11,
                    fontFamily: FONT_STACK,
                }}
            >
                {operators.map(op => (
                    <option key={op.value} value={op.value}>{op.label}</option>
                ))}
            </select>

            {needsSingleValue && (
                <input
                    type={fieldType === "numeric" ? "number" : "text"}
                    value={condition.value || ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder={fieldType === "numeric" ? "Enter number" : "Enter value"}
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
                    value={condition.values?.join(', ') || ""}
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
    const [isSuperOrg, setIsSuperOrg] = useState(org.is_superorg || false)
    const [boatFieldsConfig, setBoatFieldsConfig] = useState(() => {
        const initialConfig = org.boat_fields_config || {}
        // Ensure required fields are always set to visible and required
        return {
            ...initialConfig,
            waarde: { visible: true, required: true },
            ligplaats: { visible: true, required: true },
            ingangsdatum: { visible: true, required: true },
        }
    })
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"basic" | "fields" | "approval">("basic")
    const [autoApprovalConfig, setAutoApprovalConfig] = useState(
        org.auto_approval_config || { enabled: false, rules: [], default_action: "pending" }
    )

    const updateFieldConfig = (
        fieldKey: string,
        property: "required" | "visible",
        value: boolean
    ) => {
        setBoatFieldsConfig((prev) => ({
            ...prev,
            [fieldKey]: {
                ...prev[fieldKey],
                [property]: value,
            },
        }))
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError(null)
        try {
            // Ensure required fields are always set to visible and required
            const updatedBoatFieldsConfig = {
                ...boatFieldsConfig,
                // Force required fields to always be visible and required
                waarde: { visible: true, required: true },
                ligplaats: { visible: true, required: true },
                ingangsdatum: { visible: true, required: true },
            }

            const payload = {
                name,
                is_superorg: isSuperOrg,
                boat_fields_config: updatedBoatFieldsConfig,
                auto_approval_config: autoApprovalConfig,
            }

            const res = await fetch(`${API_BASE_URL}${API_PATHS.ORGANIZATION}/${org.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getIdToken()}`,
                },
                body: JSON.stringify(payload),
            })
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
            <h2 style={{ marginBottom: 16 }}>Edit Organization</h2>

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
                    Boat Fields Configuration
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
                    Auto-Approval Settings
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
                                display: "flex",
                                alignItems: "center",
                                marginBottom: 16,
                                cursor: "pointer",
                            }}
                        >
                            <input
                                type="checkbox"
                                checked={isSuperOrg}
                                onChange={(e) =>
                                    setIsSuperOrg(e.target.checked)
                                }
                                style={{ marginRight: 8 }}
                            />
                            <span style={{ fontWeight: 500 }}>
                                Super Organization
                            </span>
                        </label>
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
                                Configure Boat Fields
                            </h3>
                            <p
                                style={{
                                    fontSize: 14,
                                    color: "#6b7280",
                                    marginBottom: 16,
                                }}
                            >
                                Set which fields are required and visible for
                                boats in this organization.
                            </p>
                        </div>

                        <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                            {/* Required Fields Section */}
                            <div style={{ marginBottom: 24 }}>
                                <h4 style={{ 
                                    fontSize: 14, 
                                    fontWeight: 600, 
                                    marginBottom: 8,
                                    color: colors.primary 
                                }}>
                                    Required Fields (Always Visible & Required)
                                </h4>
                                <div style={{ 
                                    padding: 12, 
                                    backgroundColor: "#f0f9ff", 
                                    border: "1px solid #bae6fd", 
                                    borderRadius: 6, 
                                    fontSize: 12 
                                }}>
                                    {REQUIRED_BOAT_FIELDS.map((field, index) => (
                                        <span key={field.key}>
                                            {field.label}
                                            {index < REQUIRED_BOAT_FIELDS.length - 1 ? ", " : ""}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            {/* Configurable Fields Section */}
                            <div>
                                <h4 style={{ 
                                    fontSize: 14, 
                                    fontWeight: 600, 
                                    marginBottom: 12,
                                    color: colors.gray700 
                                }}>
                                    Optional Fields (Configurable)
                                </h4>
                                <table style={{ width: "100%", fontSize: 14 }}>
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
                                                Field
                                            </th>
                                            <th
                                                style={{
                                                    textAlign: "center",
                                                    padding: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Visible
                                            </th>
                                            <th
                                                style={{
                                                    textAlign: "center",
                                                    padding: 12,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Required
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {BOAT_FIELDS.map((field) => {
                                            const config = boatFieldsConfig[
                                                field.key
                                            ] || { visible: false, required: false }
                                            return (
                                                <tr
                                                    key={field.key}
                                                    style={{
                                                        borderBottom:
                                                            "1px solid #f3f4f6",
                                                    }}
                                                >
                                                    <td style={{ padding: 12 }}>
                                                        {field.label}
                                                    </td>
                                                    <td
                                                        style={{
                                                            textAlign: "center",
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
                                                                background: "none",
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
                                                            textAlign: "center",
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
                                                                background: "none",
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
                        </div>
                    </div>
                )}

                {activeTab === "approval" && (
                    <AutoApprovalTab 
                        config={autoApprovalConfig}
                        onChange={setAutoApprovalConfig}
                        orgName={org.name}
                    />
                )}

                {error && (
                    <div style={{ ...styles.errorAlert, marginBottom: 12, padding: 0, border: "none", backgroundColor: "transparent" }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{ ...styles.successAlert, marginBottom: 12, padding: 0, border: "none", backgroundColor: "transparent" }}>
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
                        Cancel
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
                        Save Changes
                    </button>
                </div>
            </form>
        </div>
    )
}

// Organization Form Types and Components
type OrganizationFormState = {
    name: string
}

// Validation helper for organization form
function validateOrganizationForm(form: OrganizationFormState): string[] {
    const errors: string[] = []

    const nameError = validateRequired(form.name, "Organization name") || 
                      validateStringLength(form.name, "Organization name", 2, 100)
    if (nameError) errors.push(nameError)

    return errors
}

// Organization Creation Modal Component
function OrganizationCreationModal({
    onClose,
    onSuccess,
}: {
    onClose: () => void
    onSuccess?: () => void
}) {
    const [form, setForm] = React.useState<OrganizationFormState>({
        name: "",
    })
    const [error, setError] = React.useState<string | null>(null)
    const [success, setSuccess] = React.useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = React.useState(false)

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target
        setError(null)
        setSuccess(null)
        setForm((prev) => ({ ...prev, [name]: value }))
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault()

        // Client-side validation
        const validationErrors = validateOrganizationForm(form)
        if (validationErrors.length > 0) {
            setError(validationErrors.join("\n"))
            return
        }

        setError(null)
        setSuccess(null)
        setIsSubmitting(true)

        try {
            const res = await fetch(API_BASE_URL + API_PATHS.ORGANIZATION, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${getIdToken()}`,
                },
                body: JSON.stringify(form),
            })
            const data = await res.json()

            if (!res.ok) {
                setError(formatErrorMessage(data))
            } else {
                setSuccess(formatSuccessMessage(data, "Organization"))
                // Auto-close after success
                setTimeout(() => {
                    onSuccess?.()
                    onClose()
                }, 2000)
            }
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
            <div
                style={{
                    position: "fixed",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "min(90vw, 500px)",
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
                        onMouseOver={(e) => {
                            const target = e.target as HTMLElement;
                            target.style.backgroundColor = "#f3f4f6";
                        }}
                        onMouseOut={(e) => {
                            const target = e.target as HTMLElement;
                            target.style.backgroundColor = "transparent";
                        }}
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
                            onFocus={(e) => {
                                if (!isSubmitting) {
                                    const target = e.target as HTMLElement;
                                    target.style.borderColor = "#10b981";
                                }
                            }}
                            onBlur={(e) => {
                                const target = e.target as HTMLElement;
                                target.style.borderColor = "#d1d5db";
                            }}
                        />
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
                            onMouseOver={(e) => {
                                if (!isSubmitting) {
                                    const target = e.target as HTMLElement;
                                    target.style.backgroundColor = "#e5e7eb";
                                }
                            }}
                            onMouseOut={(e) => {
                                const target = e.target as HTMLElement;
                                target.style.backgroundColor = "#f3f4f6";
                            }}
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
                            onMouseOver={(e) => {
                                if (!isSubmitting) {
                                    const target = e.target as HTMLElement;
                                    target.style.backgroundColor = "#059669";
                                }
                            }}
                            onMouseOut={(e) => {
                                if (!isSubmitting) {
                                    const target = e.target as HTMLElement;
                                    target.style.backgroundColor = "#10b981";
                                }
                            }}
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
        </div>
    )
}

export function OrganizationPageOverride(): Override {
    const [orgs, setOrgs] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [editingOrg, setEditingOrg] = useState<any | null>(null)
    const [deletingOrgId, setDeletingOrgId] = useState<string | number | null>(
        null
    )
    const [searchTerm, setSearchTerm] = useState("")
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(ORG_COLUMNS.map((col) => col.key))
    )
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
    const [showCreateModal, setShowCreateModal] = useState(false)

    const refresh = useCallback(() => {
        fetch(`${API_BASE_URL}${API_PATHS.ORGANIZATION}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getIdToken()}`,
            },
        })
            .then((res) => res.json())
            .then((json) => {
                let organizations = json.organizations || []
                
                // Filter organizations based on user role and access
                if (userInfo && !isAdmin(userInfo)) {
                    // Non-admin users can only see their own organizations
                    organizations = organizations.filter((org: any) => 
                        hasOrganizationAccess(userInfo, org.name)
                    )
                }
                
                setOrgs(organizations)
            })
            .catch((err) => setError(err.message))
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
    }, [refresh, isLoadingUserInfo])

    // Filter and sort organizations
    const filteredAndSortedOrgs = React.useMemo(() => {
        let filtered = orgs?.filter((org) =>
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
                if (typeof aValue === 'string' && typeof bValue === 'string') {
                    comparison = aValue.localeCompare(bValue)
                } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
                    comparison = aValue === bValue ? 0 : aValue ? 1 : -1
                } else {
                    // For dates and other types
                    comparison = aValue > bValue ? 1 : aValue < bValue ? -1 : 0
                }
                
                return sortDirection === 'desc' ? -comparison : comparison
            })
        }
        
        return filtered
    }, [orgs, searchTerm, sortField, sortDirection])

    const handleSort = (field: string) => {
        if (sortField === field) {
            // Toggle direction if same field
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
        } else {
            // New field, start with ascending
            setSortField(field)
            setSortDirection('asc')
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
            await fetch(`${API_BASE_URL}${API_PATHS.ORGANIZATION}/${deletingOrgId}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${getIdToken()}`,
                },
            })
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

    if (orgs === null || isLoadingUserInfo)
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
                    Loading organizations...
                </div>
            ),
        }

    if (error)
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
                    Error: {error}
                </div>
            ),
        }

    const visible = ORG_COLUMNS.filter((col) => visibleColumns.has(col.key))

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
                        {/* Navigation Tabs Section */}
                        <div
                            style={{
                                padding: "12px 24px",
                                backgroundColor: "#f8fafc",
                                borderBottom: "1px solid #e5e7eb",
                                display: "flex",
                                gap: "4px",
                                overflowX: "auto",
                            }}
                        >
                            <button
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "#3b82f6",
                                    color: "white",
                                    border: "none",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                    cursor: "default",
                                    fontFamily: FONT_STACK,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                }}
                            >
                                <FaBuilding size={12} />
                                Organisaties
                            </button>
                            <button
                                onClick={() => {
                                    window.location.href = '/policies'
                                }}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "transparent",
                                    color: "#6b7280",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    fontFamily: FONT_STACK,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = "#f3f4f6"
                                    e.target.style.color = "#374151"
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = "transparent"
                                    e.target.style.color = "#6b7280"
                                }}
                            >
                                <FaFileContract size={12} />
                                Polissen
                            </button>
                            <button
                                onClick={() => {
                                    window.location.href = '/users'
                                }}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "transparent",
                                    color: "#6b7280",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    fontFamily: FONT_STACK,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = "#f3f4f6"
                                    e.target.style.color = "#374151"
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = "transparent"
                                    e.target.style.color = "#6b7280"
                                }}
                            >
                                <FaUsers size={12} />
                                Gebruikers
                            </button>
                            <button
                                onClick={() => {
                                    window.location.href = '/changelog'
                                }}
                                style={{
                                    padding: "8px 16px",
                                    backgroundColor: "transparent",
                                    color: "#6b7280",
                                    border: "1px solid #d1d5db",
                                    borderRadius: "6px",
                                    fontSize: "13px",
                                    fontWeight: "500",
                                    cursor: "pointer",
                                    fontFamily: FONT_STACK,
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "6px",
                                    transition: "all 0.2s",
                                }}
                                onMouseOver={(e) => {
                                    e.target.style.backgroundColor = "#f3f4f6"
                                    e.target.style.color = "#374151"
                                }}
                                onMouseOut={(e) => {
                                    e.target.style.backgroundColor = "transparent"
                                    e.target.style.color = "#6b7280"
                                }}
                            >
                                <FaClipboardList size={12} />
                                Changelog
                            </button>
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
                                            {isAdmin(userInfo) ? "Organisatie Beheer" : "Mijn Organisaties"}
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
                                            {filteredAndSortedOrgs.length} organisaties
                                        </div>
                                    </div>
                                    <p
                                        style={{
                                            margin: 0,
                                            fontSize: "16px",
                                            color: colors.gray600,
                                        }}
                                    >
                                        Beheer organisaties en configureer instellingen
                                    </p>
                                </div>
                                
                                {/* Create Organization Button - RBAC-aware */}
                                <NewOrganizationButton 
                                    userInfo={userInfo} 
                                    onClick={() => {
                                        console.log('Create organization clicked')
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
                                        <FaFilter /> Kolommen ({visible.length})
                                    </button>
                                    {showColumnFilter && (
                                        <ColumnFilterDropdown
                                            columns={ORG_COLUMNS}
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
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: 14,
                                }}
                            >
                                <thead>
                                    <tr style={{ backgroundColor: "#f9fafb" }}>
                                        <th
                                            style={{
                                                textAlign: "left",
                                                padding: 12,
                                                fontWeight: 600,
                                                color: "#374151",
                                            }}
                                        >
                                            Actions
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
                                                onClick={() => handleSort(col.key)}
                                                onMouseOver={(e) => {
                                                    e.target.style.backgroundColor = "#f3f4f6"
                                                }}
                                                onMouseOut={(e) => {
                                                    e.target.style.backgroundColor = "transparent"
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        justifyContent: "space-between",
                                                        gap: "8px",
                                                    }}
                                                >
                                                    {col.label}
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            flexDirection: "column",
                                                            alignItems: "center",
                                                            opacity: sortField === col.key ? 1 : 0.3,
                                                        }}
                                                    >
                                                        {sortField === col.key ? (
                                                            sortDirection === 'asc' ? (
                                                                <FaSortUp size={12} style={{ color: "#3b82f6" }} />
                                                            ) : (
                                                                <FaSortDown size={12} style={{ color: "#3b82f6" }} />
                                                            )
                                                        ) : (
                                                            <FaSort size={12} />
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
                                                colSpan={visible.length + 1}
                                                style={{
                                                    padding: 48,
                                                    textAlign: "center",
                                                    color: colors.gray500,
                                                }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexDirection: "column",
                                                        alignItems: "center",
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
                                                                fontSize: "18px",
                                                                fontWeight: "600",
                                                                color: colors.gray700,
                                                            }}
                                                        >
                                                            Geen organisaties gevonden
                                                        </h3>
                                                        <p
                                                            style={{
                                                                margin: 0,
                                                                fontSize: "14px",
                                                                color: colors.gray500,
                                                            }}
                                                        >
                                                            {searchTerm
                                                                ? `Geen organisaties gevonden voor "${searchTerm}"`
                                                                : "Je hebt geen toegang tot organisaties of er zijn nog geen organisaties aangemaakt."}
                                                        </p>
                                                        {!searchTerm && (
                                                            <div style={{ marginTop: "16px" }}>
                                                                <NewOrganizationButton 
                                                                    userInfo={userInfo} 
                                                                    onClick={() => {
                                                                        console.log('Create first organization clicked')
                                                                        setShowCreateModal(true)
                                                                    }} 
                                                                    style={{
                                                                        fontSize: "14px",
                                                                        fontWeight: "500",
                                                                        padding: "10px 16px"
                                                                    }}
                                                                >
                                                                    Maak je eerste organisatie aan
                                                                </NewOrganizationButton>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredAndSortedOrgs.map((org, i) => (
                                            <tr
                                                key={org.id}
                                                style={{
                                                    backgroundColor:
                                                        i % 2 === 0
                                                            ? colors.white
                                                            : colors.gray50,
                                                }}
                                            >
                                                <td style={{ padding: 12 }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: "6px",
                                                        }}
                                                    >
                                                        {/* Primary Action - Bekijk Vloot */}
                                                        <button
                                                            onClick={() => {
                                                                const orgParam = encodeURIComponent(org.name)
                                                                window.location.href = `/insuredobjects?org=${orgParam}`
                                                            }}
                                                            style={{
                                                                ...styles.primaryButton,
                                                                padding: "8px 12px",
                                                                backgroundColor: "#10b981",
                                                                fontSize: 12,
                                                                borderRadius: 6,
                                                                gap: "4px",
                                                                fontWeight: "500",
                                                            }}
                                                            onMouseOver={(e) => {
                                                                e.target.style.backgroundColor = "#059669"
                                                            }}
                                                            onMouseOut={(e) => {
                                                                e.target.style.backgroundColor = "#10b981"
                                                            }}
                                                        >
                                                            📋 Bekijk Vloot
                                                        </button>
                                                        
                                                        {/* Secondary Actions in Dropdown Menu */}
                                                        <div style={{ position: "relative", display: "inline-block" }}>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.preventDefault()
                                                                    // Toggle dropdown
                                                                    const dropdown = e.currentTarget.nextElementSibling as HTMLElement
                                                                    dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block'
                                                                }}
                                                                style={{
                                                                    padding: "8px 10px",
                                                                    backgroundColor: "#f3f4f6",
                                                                    color: "#374151",
                                                                    border: "1px solid #d1d5db",
                                                                    borderRadius: 6,
                                                                    fontSize: 12,
                                                                    cursor: "pointer",
                                                                    fontFamily: FONT_STACK,
                                                                    display: "flex",
                                                                    alignItems: "center",
                                                                    gap: "4px",
                                                                    transition: "all 0.2s",
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    e.target.style.backgroundColor = "#e5e7eb"
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    e.target.style.backgroundColor = "#f3f4f6"
                                                                }}
                                                            >
                                                                ⋮
                                                            </button>
                                                            <div
                                                                style={{
                                                                    display: "none",
                                                                    position: "absolute",
                                                                    left: 0,
                                                                    top: "100%",
                                                                    marginTop: 4,
                                                                    backgroundColor: "white",
                                                                    border: "1px solid #d1d5db",
                                                                    borderRadius: 6,
                                                                    boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                                                                    zIndex: 1000,
                                                                    minWidth: 160,
                                                                    overflow: "hidden",
                                                                }}
                                                                onMouseLeave={(e) => {
                                                                    e.currentTarget.style.display = 'none'
                                                                }}
                                                            >
                                                                <OrganizationActionButtons 
                                                                    userInfo={userInfo}
                                                                    onEdit={() => setEditingOrg(org)}
                                                                    onDelete={() => setDeletingOrgId(org.id)}
                                                                    resourceOrganization={org.name}
                                                                />
                                                            </div>
                                                        </div>
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
                                                        {col.key === "name" ? (
                                                            <button
                                                                onClick={() => {
                                                                    const orgParam = encodeURIComponent(org.name)
                                                                    window.location.href = `/insuredobjects?org=${orgParam}`
                                                                }}
                                                                style={{
                                                                    background: "none",
                                                                    border: "none",
                                                                    color: "#3b82f6",
                                                                    fontSize: "14px",
                                                                    fontWeight: "500",
                                                                    cursor: "pointer",
                                                                    textDecoration: "underline",
                                                                    fontFamily: FONT_STACK,
                                                                    padding: 0,
                                                                    textAlign: "left",
                                                                }}
                                                                onMouseOver={(e) => {
                                                                    e.target.style.color = "#1d4ed8"
                                                                }}
                                                                onMouseOut={(e) => {
                                                                    e.target.style.color = "#3b82f6"
                                                                }}
                                                                title={`Ga naar vloot van ${org.name}`}
                                                            >
                                                                {org[col.key] ?? "-"}
                                                            </button>
                                                        ) : col.key === "is_superorg" ? (
                                                            <span
                                                                style={{
                                                                    padding: "4px 8px",
                                                                    borderRadius: "12px",
                                                                    fontSize: "12px",
                                                                    fontWeight: "500",
                                                                    backgroundColor: org[col.key] ? "#dcfce7" : "#f3f4f6",
                                                                    color: org[col.key] ? "#166534" : "#6b7280",
                                                                }}
                                                            >
                                                                {org[col.key] ? "Ja" : "Nee"}
                                                            </span>
                                                        ) : col.key === "createdAt" || col.key === "updatedAt" ? (
                                                            formatDate(org[col.key])
                                                        ) : (
                                                            org[col.key] ?? "-"
                                                        )}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
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
                {editingOrg &&
                    ReactDOM.createPortal(
                        <div style={styles.modalOverlay}>
                            <EditOrgForm
                                org={editingOrg}
                                onClose={() => setEditingOrg(null)}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}

                {/* Create Organization Modal */}
                {showCreateModal &&
                    ReactDOM.createPortal(
                        <OrganizationCreationModal
                            onClose={() => setShowCreateModal(false)}
                            onSuccess={() => {
                                refresh() // Refresh the organization list
                                console.log("Organization created successfully!")
                            }}
                        />,
                        document.body
                    )}
            </>
        ),
    }
}
