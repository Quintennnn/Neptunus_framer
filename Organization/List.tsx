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
    FaGlobe,
    FaSave,
    FaDownload,
    FaCopy,
} from "react-icons/fa"
import { colors, styles, hover, animations, FONT_STACK } from "../theme.tsx"
import {
    API_BASE_URL,
    API_PATHS,
    getIdToken,
    formatErrorMessage,
    formatSuccessMessage,
    validateRequired,
    validateStringLength,
    validatePromillage,
    normalizePromillageValue,
    validateCurrencyValue,
    OwnRiskCalculationMethod,
    OwnRiskConfig,
    calculateOwnRisk,
    validateOwnRiskConfig,
    formatOwnRiskDisplay,
    PremiumCalculationMethod,
    PremiumConfig,
    calculatePremium,
    validatePremiumConfig,
    formatPremiumDisplay,
} from "../Utils.tsx"
import {
    hasPermission,
    isAdmin,
} from "../Rbac.tsx"
import {
    canEditOrganizationAddress,
    canEditOrganizationFieldConfig,
    canEditOrganizationAcceptanceRules,
    isAdmin,
    isEditor,
    isUser,
} from "../Rbac.tsx"
import { OrganizationForm } from "./Create.tsx"
import {
    GlobalRulesManager,
    GlobalRuleTemplate,
} from "../components/GlobalRulesManager.tsx"
import { LogoManager } from "../components/LogoManager.tsx"

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
    onResetColumnOrder,
}: {
    columns: typeof ORG_COLUMNS
    visibleColumns: Set<string>
    onToggleColumn: (key: string) => void
    onClose: () => void
    onResetColumnOrder: () => void
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
            {/* Reset Column Order Button */}
            <div
                style={{
                    padding: "12px 16px",
                    borderTop: "1px solid #e5e7eb",
                }}
            >
                <button
                    onClick={onResetColumnOrder}
                    style={{
                        width: "100%",
                        padding: "8px 12px",
                        backgroundColor: "#6b7280",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "13px",
                        fontWeight: "500",
                        fontFamily: FONT_STACK,
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "#4b5563"
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#6b7280"
                    }}
                >
                    Reset Volgorde
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
    // Numeric fields (number, currency)
    number: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "lt", label: "Kleiner dan" },
        { value: "le", label: "Kleiner dan of gelijk aan" },
        { value: "gt", label: "Groter dan" },
        { value: "ge", label: "Groter dan of gelijk aan" },
        { value: "between", label: "Tussen" },
    ],
    currency: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "lt", label: "Kleiner dan" },
        { value: "le", label: "Kleiner dan of gelijk aan" },
        { value: "gt", label: "Groter dan" },
        { value: "ge", label: "Groter dan of gelijk aan" },
        { value: "between", label: "Tussen" },
    ],
    // Text fields
    text: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "in", label: "In lijst" },
        { value: "not_in", label: "Niet in lijst" },
        { value: "contains", label: "Bevat" },
        { value: "starts_with", label: "Begint met" },
        { value: "ends_with", label: "Eindigt met" },
        { value: "regex", label: "Reguliere expressie" },
    ],
    textarea: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "contains", label: "Bevat" },
        { value: "starts_with", label: "Begint met" },
        { value: "ends_with", label: "Eindigt met" },
        { value: "regex", label: "Reguliere expressie" },
    ],
    // Dropdown fields
    dropdown: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "in", label: "In lijst" },
        { value: "not_in", label: "Niet in lijst" },
    ],
    // Date fields
    date: [
        { value: "eq", label: "Gelijk aan" },
        { value: "ne", label: "Niet gelijk aan" },
        { value: "lt", label: "Voor" },
        { value: "le", label: "Voor of op" },
        { value: "gt", label: "Na" },
        { value: "ge", label: "Na of op" },
        { value: "between", label: "Tussen" },
    ],
    // Backward compatibility - fallback to these if type not found
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

// Conflict detection removed - rules now use priority ordering instead
// The following functions are kept for potential future use but are currently unused:

function validateAllRules(rules: any[]): any[] {
    const conflicts: any[] = []

    for (let i = 0; i < rules.length; i++) {
        for (let j = i + 1; j < rules.length; j++) {
            const rule1Conflicts = findConflictingRules(
                rules[i],
                rules[j],
                i,
                j
            )
            conflicts.push(...rule1Conflicts)
        }
    }

    return conflicts
}

function findConflictingRules(
    rule1: any,
    rule2: any,
    index1: number,
    index2: number
): ConflictInfo[] {
    const conflicts: ConflictInfo[] = []

    // Check for conflicts between conditions on the same fields
    for (const fieldKey in rule1.conditions) {
        if (rule2.conditions[fieldKey]) {
            const conflict = detectConditionConflict(
                fieldKey,
                rule1.conditions[fieldKey],
                rule2.conditions[fieldKey],
                index1,
                index2
            )
            if (conflict) {
                conflicts.push(conflict)
            }
        }
    }

    return conflicts
}

function detectConditionConflict(
    fieldKey: string,
    condition1: any,
    condition2: any,
    ruleIndex1: number,
    ruleIndex2: number
): ConflictInfo | null {
    const op1 = condition1.operator
    const op2 = condition2.operator

    // Same field, same operator conflicts
    if (op1 === op2) {
        if (op1 === "eq" && condition1.value !== condition2.value) {
            return null // Different exact values is not a conflict
        }
        if (op1 === "eq" && condition1.value === condition2.value) {
            return {
                ruleIndex1,
                ruleIndex2,
                fieldKey,
                conflictType: "duplicate_exact",
                message: `Beide regels vereisen exact dezelfde waarde voor ${fieldKey}: "${condition1.value}"`,
            }
        }
    }

    // Contradictory exact value conflicts
    if ((op1 === "eq" && op2 === "ne") || (op1 === "ne" && op2 === "eq")) {
        if (condition1.value === condition2.value) {
            return {
                ruleIndex1,
                ruleIndex2,
                fieldKey,
                conflictType: "contradictory_exact",
                message: `Regel ${ruleIndex1 + 1} vereist ${fieldKey} = "${condition1.value}", maar Regel ${ruleIndex2 + 1} vereist ${fieldKey} ≠ "${condition2.value}"`,
            }
        }
    }

    // Numeric range conflicts
    if (isNumericOperator(op1) && isNumericOperator(op2)) {
        return detectNumericConflict(
            fieldKey,
            condition1,
            condition2,
            ruleIndex1,
            ruleIndex2
        )
    }

    // List conflicts (in/not_in)
    if (isListOperator(op1) && isListOperator(op2)) {
        return detectListConflict(
            fieldKey,
            condition1,
            condition2,
            ruleIndex1,
            ruleIndex2
        )
    }

    return null
}

function isNumericOperator(operator: string): boolean {
    return ["lt", "le", "gt", "ge", "between"].includes(operator)
}

function isListOperator(operator: string): boolean {
    return ["in", "not_in"].includes(operator)
}

function detectNumericConflict(
    fieldKey: string,
    condition1: any,
    condition2: any,
    ruleIndex1: number,
    ruleIndex2: number
): ConflictInfo | null {
    const op1 = condition1.operator
    const op2 = condition2.operator

    // Handle between operator ranges
    if (op1 === "between" && op2 === "between") {
        const range1 = condition1.range || {}
        const range2 = condition2.range || {}

        if (
            range1.min != null &&
            range1.max != null &&
            range2.min != null &&
            range2.max != null
        ) {
            // Check for overlapping ranges
            if (!(range1.max < range2.min || range2.max < range1.min)) {
                return {
                    ruleIndex1,
                    ruleIndex2,
                    fieldKey,
                    conflictType: "overlapping_ranges",
                    message: `Overlappende bereiken voor ${fieldKey}: Regel ${ruleIndex1 + 1} (${range1.min}-${range1.max}) overlapt met Regel ${ruleIndex2 + 1} (${range2.min}-${range2.max})`,
                }
            }
        }
    }

    // Handle impossible range in between
    if (op1 === "between") {
        const range = condition1.range || {}
        if (range.min != null && range.max != null && range.min > range.max) {
            return {
                ruleIndex1,
                ruleIndex2: ruleIndex1,
                fieldKey,
                conflictType: "impossible_range",
                message: `Onmogelijk bereik voor ${fieldKey} in Regel ${ruleIndex1 + 1}: minimum (${range.min}) is groter dan maximum (${range.max})`,
            }
        }
    }

    // Handle contradictory numeric conditions
    if ((op1 === "gt" || op1 === "ge") && (op2 === "lt" || op2 === "le")) {
        const val1 = condition1.value
        const val2 = condition2.value
        if (val1 != null && val2 != null) {
            if (
                (op1 === "gt" && op2 === "lt" && val1 >= val2) ||
                (op1 === "gt" && op2 === "le" && val1 >= val2) ||
                (op1 === "ge" && op2 === "lt" && val1 >= val2) ||
                (op1 === "ge" && op2 === "le" && val1 > val2)
            ) {
                return {
                    ruleIndex1,
                    ruleIndex2,
                    fieldKey,
                    conflictType: "contradictory_numeric",
                    message: `Tegenstrijdige numerieke voorwaarden voor ${fieldKey}: Regel ${ruleIndex1 + 1} (${op1} ${val1}) vs Regel ${ruleIndex2 + 1} (${op2} ${val2})`,
                }
            }
        }
    }

    // Handle redundant numeric conditions
    if (op1 === op2 && ["gt", "ge", "lt", "le"].includes(op1)) {
        const val1 = condition1.value
        const val2 = condition2.value
        if (val1 != null && val2 != null) {
            if ((op1 === "gt" || op1 === "ge") && val1 < val2) {
                return {
                    ruleIndex1,
                    ruleIndex2,
                    fieldKey,
                    conflictType: "redundant_numeric",
                    message: `Redundante voorwaarden voor ${fieldKey}: Regel ${ruleIndex2 + 1} (${op2} ${val2}) maakt Regel ${ruleIndex1 + 1} (${op1} ${val1}) overbodig`,
                }
            }
            if ((op1 === "lt" || op1 === "le") && val1 > val2) {
                return {
                    ruleIndex1,
                    ruleIndex2,
                    fieldKey,
                    conflictType: "redundant_numeric",
                    message: `Redundante voorwaarden voor ${fieldKey}: Regel ${ruleIndex2 + 1} (${op2} ${val2}) maakt Regel ${ruleIndex1 + 1} (${op1} ${val1}) overbodig`,
                }
            }
        }
    }

    return null
}

function detectListConflict(
    fieldKey: string,
    condition1: any,
    condition2: any,
    ruleIndex1: number,
    ruleIndex2: number
): ConflictInfo | null {
    const op1 = condition1.operator
    const op2 = condition2.operator
    const values1 = condition1.values || []
    const values2 = condition2.values || []

    // Check for in/not_in conflicts
    if (op1 === "in" && op2 === "not_in") {
        const overlap = values1.filter((v) => values2.includes(v))
        if (overlap.length > 0) {
            return {
                ruleIndex1,
                ruleIndex2,
                fieldKey,
                conflictType: "list_contradiction",
                message: `Tegenstrijdige lijst voorwaarden voor ${fieldKey}: Regel ${ruleIndex1 + 1} vereist waarde in [${values1.join(", ")}], maar Regel ${ruleIndex2 + 1} verbiedt [${overlap.join(", ")}]`,
            }
        }
    }

    if (op1 === "not_in" && op2 === "in") {
        const overlap = values2.filter((v) => values1.includes(v))
        if (overlap.length > 0) {
            return {
                ruleIndex1,
                ruleIndex2,
                fieldKey,
                conflictType: "list_contradiction",
                message: `Tegenstrijdige lijst voorwaarden voor ${fieldKey}: Regel ${ruleIndex2 + 1} vereist waarde in [${values2.join(", ")}], maar Regel ${ruleIndex1 + 1} verbiedt [${overlap.join(", ")}]`,
            }
        }
    }

    return null
}

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
        Array<{ key: string; label: string; type: string; options?: string[] }>
    >([])
    const { schema: dynamicSchema, loading: schemaLoading } = useDynamicSchema(
        org?.name
    )

    // Global rules management state
    const [showGlobalRulesManager, setShowGlobalRulesManager] = useState(false)
    const [showSaveAsGlobal, setShowSaveAsGlobal] = useState(false)
    const [showLoadFromGlobal, setShowLoadFromGlobal] = useState(false)

    // Get current user info for role-based access control
    const currentUser = getCurrentUserInfo()

    // Global rules handlers
    const handleLoadFromGlobal = (template: GlobalRuleTemplate) => {
        if (template.ruleConfig) {
            onChange(template.ruleConfig)
        }
        setShowLoadFromGlobal(false)
    }

    const handleSaveAsGlobal = (template: GlobalRuleTemplate) => {
        // Template saved successfully, you could show a success message here
        setShowSaveAsGlobal(false)
    }

    const handleDuplicateRule = (ruleIndex: number) => {
        const ruleToDuplicate = config.rules[ruleIndex]
        const duplicatedRule = {
            ...ruleToDuplicate,
            name: `${ruleToDuplicate.name} (Kopie)`,
            priority: config.rules.length + 1,
        }

        onChange({
            ...config,
            rules: [...config.rules, duplicatedRule],
        })
    }

    // Get available fields for a specific object type
    const getFieldsForObjectType = (objectType: string) => {
        if (!org || schemaLoading || !dynamicSchema) {
            return []
        }

        try {
            // Get all user input fields from the dynamic schema
            const userInputFields = getUserInputFieldsForObjectType(
                dynamicSchema,
                objectType
            )

            // Get config for this object type
            const objectConfig =
                org.insured_object_fields_config?.[objectType] || {}

            // Map fields and only include required ones based on org config
            const requiredFields = userInputFields
                .filter((field) => {
                    return objectConfig[field.key]?.required || false
                })
                .map((field) => ({
                    key: field.key,
                    label: field.label,
                    type: field.type,
                    options: field.options || [],
                }))

            // objectType is already selected at the rule level, no need to include as condition field
            return requiredFields
        } catch (error) {
            console.error(
                "Error extracting required fields from dynamic schema:",
                error
            )
            return []
        }
    }

    // Update available fields when org or schema changes
    // Default to boat fields for backward compatibility
    useEffect(() => {
        const fields = getFieldsForObjectType("boot")
        setAvailableFields(fields)
    }, [org, dynamicSchema, schemaLoading])

    // Ensure rules have priority field (backward compatibility)
    useEffect(() => {
        if (config.rules && config.rules.length > 0) {
            let needsUpdate = false
            const rulesWithPriority = config.rules.map(
                (rule: any, index: number) => {
                    if (typeof rule.priority !== "number") {
                        needsUpdate = true
                        return { ...rule, priority: index + 1 }
                    }
                    return rule
                }
            )

            if (needsUpdate) {
                onChange({ ...config, rules: rulesWithPriority })
            }
        }
    }, [config.rules?.length]) // Only trigger when number of rules changes

    const addRule = () => {
        const newRule = {
            name: `Rule ${config.rules.length + 1}`,
            priority: config.rules.length + 1, // Add explicit priority
            objectType: "boot", // Default to boot for backward compatibility
            conditions: {},
            logic: "AND",
            pricing: {
                premium_percentage: 5.0,
                eigen_risico_method: "fixed",
                eigen_risico: 250,
                eigen_risico_percentage: 0,
            },
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
        const newRules = config.rules.filter((_: any, i: number) => i !== index)
        // Reorder priorities after deletion
        const reorderedRules = newRules.map((rule: any, i: number) => ({
            ...rule,
            priority: i + 1,
        }))
        onChange({
            ...config,
            rules: reorderedRules,
        })
    }

    const reorderRules = (dragIndex: number, hoverIndex: number) => {
        const draggedRule = config.rules[dragIndex]
        const newRules = [...config.rules]

        // Remove dragged item
        newRules.splice(dragIndex, 1)
        // Insert at new position
        newRules.splice(hoverIndex, 0, draggedRule)

        // Update priorities based on new order
        const reorderedRules = newRules.map((rule: any, i: number) => ({
            ...rule,
            priority: i + 1,
        }))

        onChange({
            ...config,
            rules: reorderedRules,
        })
    }

    const addCondition = (ruleIndex: number, fieldKey: string) => {
        const rule = config.rules[ruleIndex]
        // Get fields for this rule's object type
        const ruleObjectType = rule.objectType || "boot"
        const fieldsForType = getFieldsForObjectType(ruleObjectType)
        const field = fieldsForType.find((f) => f.key === fieldKey)
        const fieldType = field?.type || "text"

        // Get default operator based on field type
        const getDefaultOperator = (type: string) => {
            switch (type) {
                case "number":
                case "currency":
                    return "lt"
                case "dropdown":
                    return "eq"
                case "date":
                    return "gt"
                case "text":
                case "textarea":
                default:
                    return "eq"
            }
        }

        const defaultOperator = getDefaultOperator(fieldType)

        // Initialize condition with proper default values
        const newCondition = {
            operator: defaultOperator,
            value: fieldType === "number" || fieldType === "currency" ? 0 : "",
            values: [],
            range: { min: null, max: null }, // For between operations
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
                    <br />
                    <strong>Voorwaarden:</strong> In het tabje Boot velden
                    configuratie kun je verplichte velden velden instellen.{" "}
                    <strong>Alleen</strong> deze velden zijn beschikbaar als
                    voorwaarde.
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
                        <div
                            style={{
                                display: "flex",
                                gap: "8px",
                                flexWrap: "wrap",
                            }}
                        >
                            {/* Global Rules Management (Admin Only) */}
                            {isAdmin(currentUser) && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowGlobalRulesManager(true)
                                    }
                                    style={{
                                        ...styles.secondaryButton,
                                        padding: "6px 10px",
                                        fontSize: 11,
                                        borderRadius: 4,
                                        backgroundColor: colors.info,
                                        color: "white",
                                        border: "none",
                                    }}
                                    title="Beheer globale templates (alleen admin)"
                                >
                                    <FaGlobe
                                        size={10}
                                        style={{ marginRight: "4px" }}
                                    />
                                    Globale Templates
                                </button>
                            )}

                            {/* Save As Template (All Users) */}
                            <button
                                type="button"
                                onClick={() =>
                                    setShowSaveAsGlobal(true)
                                }
                                disabled={
                                    !config.rules ||
                                    config.rules.length === 0
                                }
                                style={{
                                    ...styles.secondaryButton,
                                    padding: "6px 10px",
                                    fontSize: 11,
                                    borderRadius: 4,
                                    backgroundColor:
                                        config.rules?.length > 0
                                            ? colors.success
                                            : colors.gray400,
                                    color: "white",
                                    border: "none",
                                }}
                                title="Sla huidige regels op als globale template"
                            >
                                <FaSave
                                    size={10}
                                    style={{ marginRight: "4px" }}
                                />
                                Opslaan als Template
                            </button>

                            {/* Load from Global Template (All Users) */}
                            <button
                                type="button"
                                onClick={() => setShowLoadFromGlobal(true)}
                                style={{
                                    ...styles.secondaryButton,
                                    padding: "6px 10px",
                                    fontSize: 11,
                                    borderRadius: 4,
                                    backgroundColor: colors.primary,
                                    color: "white",
                                    border: "none",
                                }}
                                title="Laad regels vanaf globale template"
                            >
                                <FaDownload
                                    size={10}
                                    style={{ marginRight: "4px" }}
                                />
                                Laden van Template
                            </button>

                            {/* Add Rule Button */}
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
                        <div>
                            {config.rules.map(
                                (rule: any, ruleIndex: number) => (
                                    <React.Fragment key={ruleIndex}>
                                        <RuleEditor
                                            rule={rule}
                                            ruleIndex={ruleIndex}
                                            availableFields={availableFields}
                                            onUpdate={(updatedRule) =>
                                                updateRule(ruleIndex, updatedRule)
                                            }
                                            onDelete={() => deleteRule(ruleIndex)}
                                            onDuplicate={() =>
                                                handleDuplicateRule(ruleIndex)
                                            }
                                            onAddCondition={(fieldKey) =>
                                                addCondition(ruleIndex, fieldKey)
                                            }
                                            onUpdateCondition={(
                                                fieldKey,
                                                conditionData
                                            ) =>
                                                updateCondition(
                                                    ruleIndex,
                                                    fieldKey,
                                                    conditionData
                                                )
                                            }
                                            onRemoveCondition={(fieldKey) =>
                                                removeCondition(ruleIndex, fieldKey)
                                            }
                                            getFieldsForType={getFieldsForObjectType}
                                            onMoveUp={
                                                ruleIndex > 0
                                                    ? () =>
                                                          reorderRules(
                                                              ruleIndex,
                                                              ruleIndex - 1
                                                          )
                                                    : undefined
                                            }
                                            onMoveDown={
                                                ruleIndex < config.rules.length - 1
                                                    ? () =>
                                                          reorderRules(
                                                              ruleIndex,
                                                              ruleIndex + 1
                                                          )
                                                    : undefined
                                            }
                                        />
                                    </React.Fragment>
                                )
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Global Rules Management Modals */}
            {showGlobalRulesManager && (
                <GlobalRulesManager
                    userInfo={currentUser}
                    onClose={() => setShowGlobalRulesManager(false)}
                />
            )}

            {showSaveAsGlobal && (
                <SaveAsGlobalTemplate
                    userInfo={currentUser}
                    currentRuleConfig={config}
                    onClose={() => setShowSaveAsGlobal(false)}
                    onSaved={handleSaveAsGlobal}
                />
            )}

            {showLoadFromGlobal && (
                <LoadFromGlobalTemplate
                    userInfo={currentUser}
                    onClose={() => setShowLoadFromGlobal(false)}
                    onLoadTemplate={handleLoadFromGlobal}
                />
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
    onDuplicate,
    onAddCondition,
    onUpdateCondition,
    onRemoveCondition,
    getFieldsForType,
}: {
    rule: any
    ruleIndex: number
    availableFields: Array<{
        key: string
        label: string
        type: string
        options?: string[]
    }>
    onUpdate: (rule: any) => void
    onDelete: () => void
    onDuplicate: () => void
    onAddCondition: (fieldKey: string) => void
    onUpdateCondition: (fieldKey: string, conditionData: any) => void
    onRemoveCondition: (fieldKey: string) => void
    getFieldsForType: (objectType: string) => Array<{
        key: string
        label: string
        type: string
        options?: string[]
    }>
}) {
    // Get fields specific to this rule's object type
    const ruleObjectType = rule.objectType || "boot"
    const fieldsForRuleType = getFieldsForType(ruleObjectType)

    const unusedFields = fieldsForRuleType.filter(
        (field) => !rule.conditions.hasOwnProperty(field.key)
    )

    return (
        <div
            style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#ffffff",
                marginBottom: "8px",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                    gap: "12px",
                }}
            >
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
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

                    {/* Object Type Selector */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: 12, color: colors.gray600, fontWeight: 500 }}>
                            Type object:
                        </span>
                        <select
                            value={ruleObjectType}
                            onChange={(e) => {
                                // Clear conditions when changing object type
                                onUpdate({
                                    ...rule,
                                    objectType: e.target.value,
                                    conditions: {} // Reset conditions since fields may be different
                                })
                            }}
                            style={{
                                padding: "4px 8px",
                                border: `2px solid ${colors.primary}`,
                                borderRadius: 4,
                                fontSize: 12,
                                fontWeight: 600,
                                fontFamily: FONT_STACK,
                                backgroundColor: colors.white,
                                color: colors.primary,
                                cursor: "pointer",
                            }}
                        >
                            <option value="boot">Boot</option>
                            <option value="trailer">Trailer</option>
                            <option value="motor">Motor</option>
                        </select>
                    </div>
                </div>

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
                        onClick={onDuplicate}
                        style={{
                            padding: "6px 8px",
                            backgroundColor: colors.info,
                            color: "white",
                            border: "none",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 11,
                            fontFamily: FONT_STACK,
                            marginRight: 8,
                        }}
                        title="Dupliceer deze regel"
                    >
                        <FaCopy size={10} style={{ marginRight: 4 }} />
                        Dupliceren
                    </button>
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
                    Voorwaarden:
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
                        Geen voorwaarden toegevoegd. Voeg een voorwaarde toe onder.
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
            <div
                style={{
                    marginTop: 16,
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: 16,
                }}
            >
                <h4
                    style={{
                        fontSize: 14,
                        fontWeight: 600,
                        marginBottom: 12,
                        color: "#374151",
                    }}
                >
                    Premie & Eigen Risico (Verplicht)
                </h4>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ flex: 1 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 500,
                                marginBottom: 4,
                                color: "#6b7280",
                                height: "16px", // Fixed height for label alignment
                            }}
                        >
                            Premie Berekening
                        </label>
                        <EnhancedPremiumInput
                            config={{
                                method:
                                    rule.pricing?.premium_method ||
                                    "percentage",
                                fixedAmount: rule.pricing?.premium_fixed_amount || 0,
                                percentage:
                                    rule.pricing?.premium_percentage || 0,
                            }}
                            onChange={(config) =>
                                onUpdate({
                                    ...rule,
                                    pricing: {
                                        ...rule.pricing,
                                        premium_method: config.method,
                                        premium_fixed_amount:
                                            config.method === "fixed"
                                                ? config.fixedAmount
                                                : 0,
                                        premium_percentage:
                                            config.method === "percentage"
                                                ? config.percentage
                                                : 0,
                                    },
                                })
                            }
                            ruleIndex={ruleIndex}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label
                            style={{
                                display: "block",
                                fontSize: 12,
                                fontWeight: 500,
                                marginBottom: 4,
                                color: "#6b7280",
                                height: "16px", // Fixed height for label alignment
                            }}
                        >
                            Eigen Risico Berekening
                        </label>
                        <EnhancedOwnRiskInput
                            config={{
                                method:
                                    rule.pricing?.eigen_risico_method ||
                                    "fixed",
                                fixedAmount: rule.pricing?.eigen_risico || 0,
                                percentage:
                                    rule.pricing?.eigen_risico_percentage || 0,
                            }}
                            onChange={(config) =>
                                onUpdate({
                                    ...rule,
                                    pricing: {
                                        ...rule.pricing,
                                        eigen_risico_method: config.method,
                                        eigen_risico:
                                            config.method === "fixed"
                                                ? config.fixedAmount
                                                : 0,
                                        eigen_risico_percentage:
                                            config.method === "percentage"
                                                ? config.percentage
                                                : 0,
                                    },
                                })
                            }
                            ruleIndex={ruleIndex}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}

// DraggableRuleEditor wraps RuleEditor with drag-and-drop functionality
function DraggableRuleEditor({
    rule,
    ruleIndex,
    availableFields,
    onUpdate,
    onDelete,
    onAddCondition,
    onUpdateCondition,
    onRemoveCondition,
    onReorder,
    totalRules,
    getFieldsForType,
}: {
    rule: any
    ruleIndex: number
    availableFields: Array<{
        key: string
        label: string
        type: string
        options?: string[]
    }>
    onUpdate: (rule: any) => void
    onDelete: () => void
    onAddCondition: (fieldKey: string) => void
    onUpdateCondition: (fieldKey: string, conditionData: any) => void
    onRemoveCondition: (fieldKey: string) => void
    onReorder: (dragIndex: number, hoverIndex: number) => void
    totalRules: number
    getFieldsForType: (objectType: string) => Array<{
        key: string
        label: string
        type: string
        options?: string[]
    }>
}) {
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const [isDragging, setIsDragging] = useState(false)

    const handleDragStart = (e: React.DragEvent) => {
        e.stopPropagation() // Prevent event bubbling
        e.dataTransfer.setData("text/plain", ruleIndex.toString())
        e.dataTransfer.effectAllowed = "move"
        setIsDragging(true)
    }

    const handleDragEnd = () => {
        setIsDragging(false)
        setDragOverIndex(null)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation() // Prevent event bubbling
        e.dataTransfer.dropEffect = "move"

        // Calculate drop position based on mouse position
        const rect = e.currentTarget.getBoundingClientRect()
        const y = e.clientY - rect.top
        const height = rect.height
        const isUpperHalf = y < height / 2

        setDragOverIndex(isUpperHalf ? ruleIndex : ruleIndex + 1)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        // Only clear if leaving the component entirely
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setDragOverIndex(null)
        }
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation() // Prevent event bubbling
        const draggedIndex = parseInt(e.dataTransfer.getData("text/plain"))

        if (draggedIndex !== ruleIndex) {
            const dropIndex =
                dragOverIndex !== null
                    ? Math.min(dragOverIndex, totalRules)
                    : ruleIndex

            onReorder(
                draggedIndex,
                dropIndex > draggedIndex ? dropIndex - 1 : dropIndex
            )
        }

        setDragOverIndex(null)
    }

    const canMoveUp = ruleIndex > 0
    const canMoveDown = ruleIndex < totalRules - 1

    const moveUp = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (canMoveUp) {
            onReorder(ruleIndex, ruleIndex - 1)
        }
    }

    const moveDown = (e?: React.MouseEvent) => {
        if (e) {
            e.preventDefault()
            e.stopPropagation()
        }
        if (canMoveDown) {
            onReorder(ruleIndex, ruleIndex + 1)
        }
    }

    return (
        <div
            style={{
                position: "relative",
                opacity: isDragging ? 0.5 : 1,
                transition: "opacity 0.2s ease",
            }}
        >
            {/* Drop indicator */}
            {dragOverIndex === ruleIndex && (
                <div
                    style={{
                        position: "absolute",
                        top: -2,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: colors.blue500,
                        borderRadius: 2,
                        zIndex: 10,
                        boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
                    }}
                />
            )}

            <div
                draggable
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={(e) => e.stopPropagation()}
                style={{
                    border: "2px solid #d1d5db",
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 24,
                    backgroundColor: "#fefefe",
                    cursor: "move",
                    position: "relative",
                    transition: "all 0.2s ease",
                    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                }}
            >
                {/* Priority Badge & Drag Handle */}
                <div
                    style={{
                        position: "absolute",
                        top: -8,
                        left: 16,
                        backgroundColor: colors.blue500,
                        color: "white",
                        padding: "4px 8px",
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                        zIndex: 5,
                    }}
                >
                    <span>Prioriteit {rule.priority || ruleIndex + 1}</span>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 1,
                        }}
                    >
                        <div
                            style={{
                                width: 3,
                                height: 1,
                                backgroundColor: "rgba(255,255,255,0.7)",
                            }}
                        />
                        <div
                            style={{
                                width: 3,
                                height: 1,
                                backgroundColor: "rgba(255,255,255,0.7)",
                            }}
                        />
                        <div
                            style={{
                                width: 3,
                                height: 1,
                                backgroundColor: "rgba(255,255,255,0.7)",
                            }}
                        />
                    </div>
                </div>

                {/* Move Buttons */}
                <div
                    style={{
                        position: "absolute",
                        top: 16,
                        right: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 4,
                        zIndex: 5,
                    }}
                >
                    <button
                        onClick={(e) => moveUp(e)}
                        disabled={!canMoveUp}
                        style={{
                            border: "none",
                            background: canMoveUp
                                ? colors.gray100
                                : colors.gray50,
                            padding: "4px 6px",
                            borderRadius: 4,
                            cursor: canMoveUp ? "pointer" : "not-allowed",
                            color: canMoveUp ? colors.gray700 : colors.gray400,
                            fontSize: 10,
                            fontWeight: 600,
                            opacity: canMoveUp ? 1 : 0.5,
                            transition: "all 0.2s ease",
                        }}
                        title="Naar boven"
                    >
                        ↑
                    </button>
                    <button
                        onClick={(e) => moveDown(e)}
                        disabled={!canMoveDown}
                        style={{
                            border: "none",
                            background: canMoveDown
                                ? colors.gray100
                                : colors.gray50,
                            padding: "4px 6px",
                            borderRadius: 4,
                            cursor: canMoveDown ? "pointer" : "not-allowed",
                            color: canMoveDown
                                ? colors.gray700
                                : colors.gray400,
                            fontSize: 10,
                            fontWeight: 600,
                            opacity: canMoveDown ? 1 : 0.5,
                            transition: "all 0.2s ease",
                        }}
                        title="Naar beneden"
                    >
                        ↓
                    </button>
                </div>

                {/* Rule Editor Content */}
                <div style={{ marginTop: 20 }}>
                    <RuleEditor
                        rule={rule}
                        ruleIndex={ruleIndex}
                        availableFields={availableFields}
                        onUpdate={onUpdate}
                        onDelete={onDelete}
                        onDuplicate={() => {}} // Placeholder for DraggableRuleEditor context
                        onAddCondition={onAddCondition}
                        onUpdateCondition={onUpdateCondition}
                        onRemoveCondition={onRemoveCondition}
                        getFieldsForType={getFieldsForType}
                    />
                </div>
            </div>

            {/* Drop indicator for after this rule */}
            {dragOverIndex === ruleIndex + 1 && (
                <div
                    style={{
                        position: "absolute",
                        bottom: -2,
                        left: 0,
                        right: 0,
                        height: 4,
                        backgroundColor: colors.blue500,
                        borderRadius: 2,
                        zIndex: 10,
                        boxShadow: "0 0 8px rgba(59, 130, 246, 0.5)",
                    }}
                />
            )}
        </div>
    )
}

// BetweenInput component for range inputs (min/max)
function BetweenInput({
    fieldType,
    range,
    onChange,
}: {
    fieldType: string
    range: { min: any; max: any }
    onChange: (range: { min: any; max: any }) => void
}) {
    const handleMinChange = (value: string) => {
        let processedValue = value
        if (fieldType === "number" || fieldType === "currency") {
            processedValue = value ? parseFloat(value) : null
        }
        onChange({ ...range, min: processedValue })
    }

    const handleMaxChange = (value: string) => {
        let processedValue = value
        if (fieldType === "number" || fieldType === "currency") {
            processedValue = value ? parseFloat(value) : null
        }
        onChange({ ...range, max: processedValue })
    }

    const getInputType = () => {
        switch (fieldType) {
            case "number":
            case "currency":
                return "number"
            case "date":
                return "date"
            default:
                return "text"
        }
    }

    const getPlaceholder = (type: "min" | "max") => {
        switch (fieldType) {
            case "number":
            case "currency":
                return type === "min" ? "Min waarde" : "Max waarde"
            case "date":
                return type === "min" ? "Van datum" : "Tot datum"
            default:
                return type === "min" ? "Min waarde" : "Max waarde"
        }
    }

    const inputStyle = {
        padding: "4px 6px",
        border: "1px solid #d1d5db",
        borderRadius: 3,
        fontSize: 11,
        minWidth: 80,
        fontFamily: "Inter, sans-serif",
    }

    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
                type={getInputType()}
                value={range.min || ""}
                onChange={(e) => handleMinChange(e.target.value)}
                placeholder={getPlaceholder("min")}
                style={inputStyle}
            />
            <span style={{ fontSize: 11, color: "#6b7280" }}>tot</span>
            <input
                type={getInputType()}
                value={range.max || ""}
                onChange={(e) => handleMaxChange(e.target.value)}
                placeholder={getPlaceholder("max")}
                style={inputStyle}
            />
        </div>
    )
}

// MultiValueInput component for dynamic list inputs (in/not_in operations)
function MultiValueInput({
    fieldType,
    options,
    values,
    onChange,
}: {
    fieldType: string
    options?: string[]
    values: string[]
    onChange: (values: string[]) => void
}) {
    const addValue = () => {
        onChange([...values, ""])
    }

    const updateValue = (index: number, newValue: string) => {
        const newValues = [...values]
        newValues[index] = newValue
        onChange(newValues)
    }

    const removeValue = (index: number) => {
        onChange(values.filter((_, i) => i !== index))
    }

    const inputStyle = {
        padding: "4px 6px",
        border: "1px solid #d1d5db",
        borderRadius: 3,
        fontSize: 11,
        minWidth: 120,
        fontFamily: "Inter, sans-serif",
    }

    const removeButtonStyle = {
        background: "#ef4444",
        color: "white",
        border: "none",
        borderRadius: "50%",
        width: 18,
        height: 18,
        fontSize: 11,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 4,
    }

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
                minWidth: 200,
            }}
        >
            {values.map((value, index) => (
                <div
                    key={index}
                    style={{ display: "flex", alignItems: "center", gap: 4 }}
                >
                    {fieldType === "dropdown" && options?.length ? (
                        <select
                            value={value}
                            onChange={(e) => updateValue(index, e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">Selecteer...</option>
                            {options.map((option) => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    ) : (
                        <input
                            type="text"
                            value={value}
                            onChange={(e) => updateValue(index, e.target.value)}
                            placeholder={`Waarde ${index + 1}`}
                            style={inputStyle}
                        />
                    )}
                    <button
                        onClick={() => removeValue(index)}
                        style={removeButtonStyle}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#dc2626"
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "#ef4444"
                        }}
                    >
                        ×
                    </button>
                </div>
            ))}
            <button
                onClick={addValue}
                style={{
                    padding: "4px 8px",
                    border: "1px dashed #d1d5db",
                    borderRadius: 3,
                    backgroundColor: "transparent",
                    fontSize: 11,
                    cursor: "pointer",
                    color: "#6b7280",
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#f9fafb"
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "transparent"
                }}
            >
                + Voeg waarde toe
            </button>
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
    field?: { key: string; label: string; type: string; options?: string[] }
    condition: any
    onUpdate: (condition: any) => void
    onRemove: () => void
}) {
    const fieldType = field?.type || "text"
    const operators =
        OPERATORS[fieldType as keyof typeof OPERATORS] || OPERATORS.text

    // Handle single value changes (for eq, ne, lt, gt, etc.)
    const handleValueChange = (value: string) => {
        let processedValue = value
        if (fieldType === "number" || fieldType === "currency") {
            processedValue = value ? parseFloat(value) : 0
        }
        onUpdate({ ...condition, value: processedValue })
    }

    // Handle range changes (for between operator)
    const handleRangeChange = (range: { min: any; max: any }) => {
        onUpdate({ ...condition, range })
    }

    // Handle multiple values changes (for in, not_in operators)
    const handleValuesChange = (values: string[]) => {
        onUpdate({ ...condition, values })
    }

    // Determine which input component to show
    const needsBetween = condition.operator === "between"
    const needsMultiValues = ["in", "not_in"].includes(condition.operator)
    const needsSingleValue = !needsBetween && !needsMultiValues

    // Get input type for single value inputs
    const getSingleInputType = () => {
        switch (fieldType) {
            case "number":
            case "currency":
                return "number"
            case "date":
                return "date"
            default:
                return "text"
        }
    }

    const getSingleInputPlaceholder = () => {
        switch (fieldType) {
            case "number":
            case "currency":
                return "Voer getal in"
            case "date":
                return "Selecteer datum"
            case "dropdown":
                return "Selecteer optie"
            default:
                return "Voer waarde in"
        }
    }

    // Initialize values if they don't exist
    const ensureValues = () => {
        if (
            needsMultiValues &&
            (!condition.values || condition.values.length === 0)
        ) {
            onUpdate({ ...condition, values: [""] })
        }
        if (needsBetween && !condition.range) {
            onUpdate({ ...condition, range: { min: null, max: null } })
        }
    }

    // Call ensureValues when operator changes to initialize data
    React.useEffect(() => {
        ensureValues()
    }, [condition.operator])

    return (
        <div
            style={{
                display: "flex",
                gap: 8,
                alignItems: "flex-start",
                padding: 12,
                border: "1px solid #e5e7eb",
                borderRadius: 6,
                marginBottom: 12,
                fontSize: 12,
                backgroundColor: "#fafafa",
            }}
        >
            {/* Field Label with Type Indicator */}
            <div style={{ minWidth: 120, paddingTop: 4 }}>
                <span style={{ fontWeight: 600, color: "#374151" }}>
                    {field?.label}
                </span>
                <span
                    style={{
                        fontSize: 10,
                        color: "#6b7280",
                        marginLeft: 4,
                        fontStyle: "italic",
                    }}
                >
                    ({fieldType})
                </span>
            </div>

            {/* Operator Selection */}
            <select
                value={condition.operator}
                onChange={(e) =>
                    onUpdate({ ...condition, operator: e.target.value })
                }
                style={{
                    padding: "6px 8px",
                    border: "1px solid #d1d5db",
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: "Inter, sans-serif",
                    backgroundColor: "white",
                }}
            >
                {operators.map((op) => (
                    <option key={op.value} value={op.value}>
                        {op.label}
                    </option>
                ))}
            </select>

            {/* Input Components Based on Operator */}
            <div style={{ flex: 1 }}>
                {needsSingleValue && (
                    <>
                        {fieldType === "dropdown" && field?.options?.length ? (
                            <select
                                value={condition.value || ""}
                                onChange={(e) =>
                                    handleValueChange(e.target.value)
                                }
                                style={{
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    minWidth: 140,
                                    fontFamily: "Inter, sans-serif",
                                    backgroundColor: "white",
                                }}
                            >
                                <option value="">Selecteer...</option>
                                {field.options.map((option) => (
                                    <option key={option} value={option}>
                                        {option}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <input
                                type={getSingleInputType()}
                                value={condition.value || ""}
                                onChange={(e) =>
                                    handleValueChange(e.target.value)
                                }
                                placeholder={getSingleInputPlaceholder()}
                                style={{
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 11,
                                    minWidth: 140,
                                    fontFamily: "Inter, sans-serif",
                                }}
                            />
                        )}
                    </>
                )}

                {needsBetween && (
                    <BetweenInput
                        fieldType={fieldType}
                        range={condition.range || { min: null, max: null }}
                        onChange={handleRangeChange}
                    />
                )}

                {needsMultiValues && (
                    <MultiValueInput
                        fieldType={fieldType}
                        options={field?.options}
                        values={condition.values || [""]}
                        onChange={handleValuesChange}
                    />
                )}
            </div>

            {/* Remove Button */}
            <button
                type="button"
                onClick={onRemove}
                style={{
                    padding: "4px 8px",
                    backgroundColor: "#ef4444",
                    color: "white",
                    border: "none",
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 10,
                    fontFamily: "Inter, sans-serif",
                    marginTop: 2,
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = "#dc2626"
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = "#ef4444"
                }}
            >
                Verwijder
            </button>
        </div>
    )
}

// Enhanced Own Risk Input Component
function EnhancedPremiumInput({
    config,
    onChange,
    ruleIndex,
}: {
    config: PremiumConfig
    onChange: (config: PremiumConfig) => void
    ruleIndex?: number
}) {
    const handleMethodChange = (method: PremiumCalculationMethod) => {
        // Preserve existing values when switching methods
        const newConfig: PremiumConfig = {
            ...config,
            method,
            fixedAmount: config.fixedAmount || 0,
            percentage: config.percentage || 0,
        }
        onChange(newConfig)
    }

    const handleValueChange = (value: string | number) => {
        // Store raw value to allow partial decimals
        if (config.method === "fixed") {
            onChange({ ...config, fixedAmount: value })
        } else {
            onChange({ ...config, percentage: value })
        }
    }

    const handleBlur = (value: string) => {
        if (value === "" || value === ".") {
            // Reset to 0 if empty or just a dot
            if (config.method === "fixed") {
                onChange({ ...config, fixedAmount: 0 })
            } else {
                onChange({ ...config, percentage: 0 })
            }
            return
        }

        const numValue = parseFloat(value)
        if (!isNaN(numValue)) {
            if (config.method === "fixed") {
                // Round to 2 decimals for fixed amount on blur
                const roundedValue = Math.round(numValue * 100) / 100
                onChange({ ...config, fixedAmount: roundedValue })
            } else {
                // Round to 2 decimals for percentage on blur
                const roundedValue = Math.round(numValue * 100) / 100
                onChange({ ...config, percentage: roundedValue })
            }
        }
    }

    // Split value into integer and decimal parts
    const getCurrentValue = () => {
        const value = config.method === "fixed" ? config.fixedAmount : config.percentage
        if (value === "" || value == null) return { integer: "", decimal: "" }
        const numValue = typeof value === "string" ? parseFloat(value) : value
        if (isNaN(numValue)) return { integer: "", decimal: "" }
        const [intPart, decPart] = numValue.toString().split(".")
        return { integer: intPart || "", decimal: decPart || "" }
    }

    const currentValue = getCurrentValue()

    const handleIntegerChange = (newInteger: string) => {
        // Only allow digits
        if (newInteger !== "" && !/^\d+$/.test(newInteger)) return
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${newInteger || "0"}.${decimal}` : newInteger || "0"
        handleValueChange(combinedValue)
    }

    const handleDecimalChange = (newDecimal: string) => {
        // Only allow digits, max 3 digits
        if (newDecimal !== "" && (!/^\d+$/.test(newDecimal) || newDecimal.length > 3)) return
        const integer = currentValue.integer || "0"
        const combinedValue = newDecimal ? `${integer}.${newDecimal}` : integer
        handleValueChange(combinedValue)
    }

    const handleIntegerBlur = () => {
        // Ensure at least "0" if empty
        if (!currentValue.integer) {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `0.${decimal}` : "0"
            handleBlur(combinedValue)
        } else {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `${currentValue.integer}.${decimal}` : currentValue.integer
            handleBlur(combinedValue)
        }
    }

    const handleDecimalBlur = () => {
        const integer = currentValue.integer || "0"
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${integer}.${decimal}` : integer
        handleBlur(combinedValue)
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Value Input - Conditional based on method */}
            <div>
                {config.method === "percentage" ? (
                    // Split Integer and Decimal for percentage
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="text"
                                value={currentValue.integer}
                                onChange={(e) => handleIntegerChange(e.target.value)}
                                onBlur={handleIntegerBlur}
                                placeholder="0"
                                style={{
                                    width: "60px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: FONT_STACK,
                                    textAlign: "right",
                                }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>.</span>
                            <input
                                type="text"
                                value={currentValue.decimal}
                                onChange={(e) => handleDecimalChange(e.target.value)}
                                onBlur={handleDecimalBlur}
                                placeholder="000"
                                maxLength={3}
                                style={{
                                    width: "50px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>%</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Percentage (max 3 decimalen)
                        </span>
                    </>
                ) : (
                    // Regular input for fixed amount
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="number"
                                step="0.01"
                                value={config.fixedAmount || ""}
                                onChange={(e) => handleValueChange(e.target.value)}
                                onBlur={(e) => handleBlur(e.target.value)}
                                placeholder="0.00"
                                style={{
                                    width: "120px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>€</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Euro (max 2 decimalen)
                        </span>
                    </>
                )}
            </div>

            {/* Method Selection */}
            <div style={{ display: "flex", gap: "16px" }}>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                    }}
                >
                    <input
                        type="radio"
                        name={`premiumMethod_${ruleIndex ?? "default"}`}
                        value="fixed"
                        checked={config.method === "fixed"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as PremiumCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Vast bedrag
                </label>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                    }}
                >
                    <input
                        type="radio"
                        name={`premiumMethod_${ruleIndex ?? "default"}`}
                        value="percentage"
                        checked={config.method === "percentage"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as PremiumCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Percentage van bootwaarde
                </label>
            </div>
        </div>
    )
}

function EnhancedOwnRiskInput({
    config,
    onChange,
    ruleIndex,
}: {
    config: OwnRiskConfig
    onChange: (config: OwnRiskConfig) => void
    ruleIndex?: number
}) {
    const handleMethodChange = (method: OwnRiskCalculationMethod) => {
        // Preserve existing values when switching methods
        const newConfig: OwnRiskConfig = {
            ...config,
            method,
            fixedAmount: config.fixedAmount || 0,
            percentage: config.percentage || 0,
        }
        onChange(newConfig)
    }

    const handleValueChange = (value: string | number) => {
        // Store raw value to allow partial decimals
        if (config.method === "fixed") {
            onChange({ ...config, fixedAmount: value })
        } else {
            onChange({ ...config, percentage: value })
        }
    }

    const handleBlur = (value: string) => {
        if (value === "" || value === ".") {
            // Reset to 0 if empty or just a dot
            if (config.method === "fixed") {
                onChange({ ...config, fixedAmount: 0 })
            } else {
                onChange({ ...config, percentage: 0 })
            }
            return
        }

        const numValue = parseFloat(value)
        if (!isNaN(numValue)) {
            if (config.method === "fixed") {
                // Round to nearest 50 for fixed amount on blur
                const roundedValue = Math.round(numValue / 50) * 50
                onChange({ ...config, fixedAmount: roundedValue })
            } else {
                // Round to 3 decimals for percentage on blur
                const roundedValue = Math.round(numValue * 1000) / 1000
                onChange({ ...config, percentage: roundedValue })
            }
        }
    }

    // Split value into integer and decimal parts
    const getCurrentValue = () => {
        const value = config.method === "fixed" ? config.fixedAmount : config.percentage
        if (value === "" || value == null) return { integer: "", decimal: "" }
        const numValue = typeof value === "string" ? parseFloat(value) : value
        if (isNaN(numValue)) return { integer: "", decimal: "" }
        const [intPart, decPart] = numValue.toString().split(".")
        return { integer: intPart || "", decimal: decPart || "" }
    }

    const currentValue = getCurrentValue()

    const handleIntegerChange = (newInteger: string) => {
        // Only allow digits
        if (newInteger !== "" && !/^\d+$/.test(newInteger)) return
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${newInteger || "0"}.${decimal}` : newInteger || "0"
        handleValueChange(combinedValue)
    }

    const handleDecimalChange = (newDecimal: string) => {
        // Only allow digits, max 3 digits
        if (newDecimal !== "" && (!/^\d+$/.test(newDecimal) || newDecimal.length > 3)) return
        const integer = currentValue.integer || "0"
        const combinedValue = newDecimal ? `${integer}.${newDecimal}` : integer
        handleValueChange(combinedValue)
    }

    const handleIntegerBlur = () => {
        // Ensure at least "0" if empty
        if (!currentValue.integer) {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `0.${decimal}` : "0"
            handleBlur(combinedValue)
        } else {
            const decimal = currentValue.decimal
            const combinedValue = decimal ? `${currentValue.integer}.${decimal}` : currentValue.integer
            handleBlur(combinedValue)
        }
    }

    const handleDecimalBlur = () => {
        const integer = currentValue.integer || "0"
        const decimal = currentValue.decimal
        const combinedValue = decimal ? `${integer}.${decimal}` : integer
        handleBlur(combinedValue)
    }

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {/* Value Input - Conditional based on method */}
            <div>
                {config.method === "percentage" ? (
                    // Split Integer and Decimal for percentage
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="text"
                                value={currentValue.integer}
                                onChange={(e) => handleIntegerChange(e.target.value)}
                                onBlur={handleIntegerBlur}
                                placeholder="0"
                                style={{
                                    width: "60px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: FONT_STACK,
                                    textAlign: "right",
                                }}
                            />
                            <span style={{ fontSize: 14, fontWeight: 600, color: "#374151" }}>.</span>
                            <input
                                type="text"
                                value={currentValue.decimal}
                                onChange={(e) => handleDecimalChange(e.target.value)}
                                onBlur={handleDecimalBlur}
                                placeholder="000"
                                maxLength={3}
                                style={{
                                    width: "50px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>%</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Percentage (max 3 decimalen)
                        </span>
                    </>
                ) : (
                    // Regular input for fixed amount
                    <>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                            <input
                                type="number"
                                step="50"
                                value={config.fixedAmount || ""}
                                onChange={(e) => handleValueChange(e.target.value)}
                                onBlur={(e) => handleBlur(e.target.value)}
                                placeholder="0"
                                style={{
                                    width: "120px",
                                    padding: "6px 8px",
                                    border: "1px solid #d1d5db",
                                    borderRadius: 4,
                                    fontSize: 12,
                                    fontFamily: FONT_STACK,
                                }}
                            />
                            <span style={{ fontSize: 12, color: "#6b7280", marginLeft: "4px" }}>€</span>
                        </div>
                        <span
                            style={{
                                fontSize: 10,
                                color: "#9ca3af",
                                marginTop: "2px",
                                display: "block",
                            }}
                        >
                            Euro (afgerond op €50)
                        </span>
                    </>
                )}
            </div>

            {/* Method Selection */}
            <div style={{ display: "flex", gap: "16px" }}>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                    }}
                >
                    <input
                        type="radio"
                        name={`ownRiskMethod_${ruleIndex ?? "default"}`}
                        value="fixed"
                        checked={config.method === "fixed"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as OwnRiskCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Vast bedrag
                </label>
                <label
                    style={{
                        display: "flex",
                        alignItems: "center",
                        fontSize: 11,
                        cursor: "pointer",
                    }}
                >
                    <input
                        type="radio"
                        name={`ownRiskMethod_${ruleIndex ?? "default"}`}
                        value="percentage"
                        checked={config.method === "percentage"}
                        onChange={(e) =>
                            handleMethodChange(
                                e.target.value as OwnRiskCalculationMethod
                            )
                        }
                        style={{ marginRight: "4px" }}
                    />
                    Percentage van bootwaarde
                </label>
            </div>
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
    const [polisnummer, setPolisnummer] = useState(org.polisnummer || "")
    const [street, setStreet] = useState(org.street || "")
    const [huisnummer, setHuisnummer] = useState(org.huisnummer || "")
    const [city, setCity] = useState(org.city || "")
    const [state, setState] = useState(org.state || "")
    const [postalCode, setPostalCode] = useState(org.postal_code || "")
    const [country, setCountry] = useState(org.country || "")
    const [extraInfo, setExtraInfo] = useState(org.extra_info || "")
    const [insuredObjectFieldsConfig, setInsuredObjectFieldsConfig] = useState(
        () => {
            // Use the new insured_object_fields_config structure
            const newConfig = org.insured_object_fields_config || {}

            // All fields are now configurable by admin - no forced required fields
            const enhancedBoatConfig = { ...newConfig.boot }

            return {
                boot: enhancedBoatConfig,
                motor: newConfig.motor || {},
                trailer: newConfig.trailer || {},
                other: newConfig.other || {},
            }
        }
    )
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<
        "basic" | "fields" | "approval" | "logo"
    >("basic")
    const [autoApprovalConfig, setAutoApprovalConfig] = useState(
        org.auto_approval_config || { enabled: false, rules: [] }
    )

    // Auto-clear success message after 2 seconds
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => {
                setSuccess(null)
            }, 2000)
            return () => clearTimeout(timer)
        }
    }, [success])

    // Get current user info for role-based access control
    const currentUser = getCurrentUserInfo()

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

        // Validate that all enabled rules have required pricing with enhanced validation
        if (autoApprovalConfig.enabled && autoApprovalConfig.rules.length > 0) {
            const missingPricing = autoApprovalConfig.rules.filter(
                (rule: any, index: number) => {
                    const pricing = rule.pricing
                    if (!pricing) {
                        return true
                    }

                    // Convert string values to numbers for validation
                    const premiumFixedAmount =
                        typeof pricing.premium_fixed_amount === "string"
                            ? parseFloat(pricing.premium_fixed_amount)
                            : pricing.premium_fixed_amount

                    const premiumPercentage =
                        typeof pricing.premium_percentage === "string"
                            ? parseFloat(pricing.premium_percentage)
                            : pricing.premium_percentage

                    const eigenRisico =
                        typeof pricing.eigen_risico === "string"
                            ? parseFloat(pricing.eigen_risico)
                            : pricing.eigen_risico

                    const eigenRisicoPercentage =
                        typeof pricing.eigen_risico_percentage === "string"
                            ? parseFloat(pricing.eigen_risico_percentage)
                            : pricing.eigen_risico_percentage

                    // Enhanced premium configuration validation (supports both fixed and percentage)
                    const premiumConfig: PremiumConfig = {
                        method: pricing.premium_method || "percentage",
                        fixedAmount: premiumFixedAmount || 0,
                        percentage: premiumPercentage || 0,
                    }
                    const premiumError = validatePremiumConfig(premiumConfig)
                    if (premiumError !== null) {
                        return true
                    }

                    // Enhanced own risk configuration validation (supports both fixed and percentage)
                    const ownRiskConfig: OwnRiskConfig = {
                        method: pricing.eigen_risico_method || "fixed",
                        fixedAmount: eigenRisico || 0,
                        percentage: eigenRisicoPercentage || 0,
                    }
                    const ownRiskError = validateOwnRiskConfig(ownRiskConfig)
                    return ownRiskError !== null
                }
            )

            if (missingPricing.length > 0) {
                setError(
                    `Alle regels moeten verplichte prijzen hebben. Controleer de regels: ${missingPricing.map((rule: any, index: number) => rule.name || `Regel ${index + 1}`).join(", ")}`
                )
                return
            }
        }

        try {
            // All fields are now configurable by admin - no forced requirements
            const updatedInsuredObjectFieldsConfig = {
                ...insuredObjectFieldsConfig,
                boot: {
                    ...insuredObjectFieldsConfig.boot,
                },
            }

            // Sanitize auto approval config to ensure numeric fields are numbers, not strings
            const sanitizedAutoApprovalConfig = {
                ...autoApprovalConfig,
                rules: autoApprovalConfig.rules.map((rule: any) => ({
                    ...rule,
                    pricing: rule.pricing
                        ? {
                              ...rule.pricing,
                              premium_percentage:
                                  typeof rule.pricing.premium_percentage ===
                                  "string"
                                      ? parseFloat(
                                            rule.pricing.premium_percentage
                                        ) || 0.1
                                      : rule.pricing.premium_percentage,
                              eigen_risico:
                                  typeof rule.pricing.eigen_risico === "string"
                                      ? parseFloat(rule.pricing.eigen_risico) ||
                                        0
                                      : rule.pricing.eigen_risico,
                              eigen_risico_method:
                                  rule.pricing.eigen_risico_method || "fixed", // Ensure method is always present
                              eigen_risico_percentage:
                                  typeof rule.pricing.eigen_risico_percentage ===
                                  "string"
                                      ? parseFloat(
                                            rule.pricing.eigen_risico_percentage
                                        ) || 0
                                      : rule.pricing.eigen_risico_percentage,
                          }
                        : rule.pricing,
                })),
            }

            const payload = {
                name,
                type_organisatie: typeOrganisatie,
                polisnummer: polisnummer || undefined,
                street: street || undefined,
                huisnummer: huisnummer || undefined,
                city: city || undefined,
                state: state || undefined,
                postal_code: postalCode || undefined,
                country: country || undefined,
                extra_info: extraInfo || undefined,
                insured_object_fields_config: updatedInsuredObjectFieldsConfig,
                auto_approval_config: sanitizedAutoApprovalConfig,
            }

            // Debug logging for auto approval config
            console.log("=== AUTO APPROVAL CONFIG BEING SENT ===")
            console.log(JSON.stringify(sanitizedAutoApprovalConfig, null, 2))

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
            refresh()
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
                minWidth: 700,
                maxWidth: "95vw",
                maxHeight: "95vh",
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
                <button
                    onClick={() => setActiveTab("logo")}
                    style={{
                        padding: "12px 20px",
                        border: "none",
                        background: "none",
                        borderBottom:
                            activeTab === "logo" ? "2px solid #3b82f6" : "none",
                        color: activeTab === "logo" ? "#3b82f6" : "#6b7280",
                        fontWeight: activeTab === "logo" ? 600 : 400,
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Logo Beheer
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

                        <label
                            style={{
                                display: "block",
                                marginBottom: 8,
                                fontWeight: 500,
                            }}
                        >
                            Polisnummer
                        </label>
                        <input
                            value={polisnummer}
                            onChange={(e) => setPolisnummer(e.target.value)}
                            placeholder="Voer polisnummer in"
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

                            <div
                                style={{
                                    display: "flex",
                                    gap: 12,
                                    marginBottom: 16,
                                }}
                            >
                                <div style={{ flex: 3 }}>
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
                                        onChange={(e) =>
                                            setStreet(e.target.value)
                                        }
                                        placeholder="Voer straatnaam in"
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
                                        Huisnummer
                                    </label>
                                    <input
                                        value={huisnummer}
                                        onChange={(e) =>
                                            setHuisnummer(e.target.value)
                                        }
                                        placeholder="123"
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
                                    Extra Info
                                </label>
                                <textarea
                                    value={extraInfo}
                                    onChange={(e) =>
                                        setExtraInfo(e.target.value)
                                    }
                                    placeholder="Voer extra informatie in"
                                    rows={4}
                                    style={{
                                        width: "100%",
                                        padding: 12,
                                        fontSize: 14,
                                        border: "1px solid #d1d5db",
                                        borderRadius: 8,
                                        fontFamily: FONT_STACK,
                                        resize: "vertical",
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
                                                "boot"
                                            ).map((field) => {
                                                const config =
                                                    insuredObjectFieldsConfig
                                                        .boot[field.key] || {
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
                {activeTab === "logo" && (
                    <div style={{ padding: "20px 0" }}>
                        <LogoManager
                            organizationId={org.id}
                            organizationName={org.name}
                            userInfo={currentUser}
                            onLogoUpdated={(logoData) => {
                                // Optional: Handle logo update events
                                console.log(
                                    "Logo updated for organization:",
                                    org.name,
                                    logoData
                                )
                            }}
                        />
                    </div>
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
                            animation: "fadeOut 2s ease-in-out",
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
    const [searchTerm, setSearchTerm] = useState("")
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [isLoadingUserInfo, setIsLoadingUserInfo] = useState(true)
    const [pendingCount, setPendingCount] = useState<number>(0)
    const [sortField, setSortField] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
    const [showCreateModal, setShowCreateModal] = useState(false)

    // Use dynamic schema for organization columns
    const {
        schema: organizationSchema,
        loading: schemaLoading,
        error: schemaError,
    } = useOrganizationSchema()
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(new Set())

    // Column order state management with localStorage persistence
    const [columnOrder, setColumnOrder] = useState<string[]>([])
    const [draggedColumn, setDraggedColumn] = useState<string | null>(null)
    const [dragOverColumn, setDragOverColumn] = useState<string | null>(null)

    // Default column order (can be customized based on most common view)
    const defaultColumnOrder = ["name", "address", "created"]

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

    // Load column order from localStorage or use default
    useEffect(() => {
        const savedOrder = localStorage.getItem('organizations_columnOrder')
        if (savedOrder) {
            try {
                const parsedOrder = JSON.parse(savedOrder)
                if (Array.isArray(parsedOrder)) {
                    setColumnOrder(parsedOrder)
                } else {
                    setColumnOrder(defaultColumnOrder)
                }
            } catch (error) {
                console.warn('Failed to parse saved column order, using default:', error)
                setColumnOrder(defaultColumnOrder)
            }
        } else {
            setColumnOrder(defaultColumnOrder)
        }
    }, [])

    // Save column order to localStorage whenever it changes
    useEffect(() => {
        if (columnOrder.length > 0) {
            localStorage.setItem('organizations_columnOrder', JSON.stringify(columnOrder))
        }
    }, [columnOrder])

    // Update column order when new columns are available (but preserve user customizations)
    useEffect(() => {
        if (organizationColumns.length > 0 && columnOrder.length > 0) {
            const availableColumnKeys = organizationColumns.map(col => col.key)
            const newColumns = availableColumnKeys.filter(key => !columnOrder.includes(key))

            if (newColumns.length > 0) {
                // Add new columns at the end of the user's custom order
                setColumnOrder(prev => [...prev, ...newColumns])
            }
        }
    }, [organizationColumns, columnOrder.length])

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

    // Column reordering functions
    const moveColumn = (dragIndex: number, hoverIndex: number) => {
        const newOrder = [...columnOrder]
        const draggedColumn = newOrder[dragIndex]

        // Remove the dragged column from its current position
        newOrder.splice(dragIndex, 1)
        // Insert it at the new position
        newOrder.splice(hoverIndex, 0, draggedColumn)

        setColumnOrder(newOrder)
    }

    const resetColumnOrder = () => {
        setColumnOrder([...defaultColumnOrder])
        localStorage.removeItem('organizations_columnOrder')
    }

    // Drag and drop event handlers
    const handleDragStart = (e: React.DragEvent, columnKey: string) => {
        setDraggedColumn(columnKey)
        e.dataTransfer.effectAllowed = 'move'
        e.dataTransfer.setData('text/plain', columnKey)

        // Add some visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '0.5'
        }
    }

    const handleDragEnd = (e: React.DragEvent) => {
        setDraggedColumn(null)
        setDragOverColumn(null)

        // Reset visual feedback
        if (e.currentTarget instanceof HTMLElement) {
            e.currentTarget.style.opacity = '1'
        }
    }

    const handleDragOver = (e: React.DragEvent, columnKey: string) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
        setDragOverColumn(columnKey)
    }

    const handleDragLeave = () => {
        setDragOverColumn(null)
    }

    const handleDrop = (e: React.DragEvent, targetColumnKey: string) => {
        e.preventDefault()

        const draggedColumnKey = e.dataTransfer.getData('text/plain')
        if (draggedColumnKey && draggedColumnKey !== targetColumnKey) {
            const dragIndex = columnOrder.indexOf(draggedColumnKey)
            const hoverIndex = columnOrder.indexOf(targetColumnKey)

            if (dragIndex !== -1 && hoverIndex !== -1) {
                moveColumn(dragIndex, hoverIndex)
            }
        }

        setDraggedColumn(null)
        setDragOverColumn(null)
    }

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString("nl-NL")
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

    // Filter and sort columns based on columnOrder
    const visible = organizationColumns
        .filter((col) => visibleColumns.has(col.key))
        .sort((a, b) => {
            const aIndex = columnOrder.indexOf(a.key)
            const bIndex = columnOrder.indexOf(b.key)
            // If both columns are in the order, sort by their position
            if (aIndex !== -1 && bIndex !== -1) {
                return aIndex - bIndex
            }
            // If only one is in the order, put it first
            if (aIndex !== -1) return -1
            if (bIndex !== -1) return 1
            // If neither is in the order, maintain original order
            return 0
        })

    return {
        children: (
            <>
                <style dangerouslySetInnerHTML={{ __html: animations }} />
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
                            {/* Only show Pending tab for admin role */}
                            {isAdmin(userInfo) && (
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
                            {/* Only show Users tab for admin role */}
                            {isAdmin(userInfo) && (
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
                            {/* Only show Changelog tab for admin role */}
                            {isAdmin(userInfo) && (
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
                                                onResetColumnOrder={resetColumnOrder}
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
                                                    draggable
                                                    onDragStart={(e) => handleDragStart(e, col.key)}
                                                    onDragEnd={handleDragEnd}
                                                    onDragOver={(e) => handleDragOver(e, col.key)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => handleDrop(e, col.key)}
                                                    style={{
                                                        textAlign: "left",
                                                        padding: 12,
                                                        fontWeight: 600,
                                                        color: colors.gray700,
                                                        width: col.width,
                                                        cursor: "move",
                                                        userSelect: "none",
                                                        position: "relative",
                                                        backgroundColor:
                                                            dragOverColumn === col.key
                                                                ? "#e2e8f0"
                                                                : draggedColumn === col.key
                                                                ? "#f1f5f9"
                                                                : "transparent",
                                                        transition: "background-color 0.2s ease",
                                                    }}
                                                    onClick={() =>
                                                        handleSort(col.key)
                                                    }
                                                    onMouseOver={(e) => {
                                                        if (draggedColumn !== col.key) {
                                                            e.currentTarget.style.backgroundColor =
                                                                dragOverColumn === col.key
                                                                    ? "#e2e8f0"
                                                                    : "#f3f4f6"
                                                        }
                                                    }}
                                                    onMouseOut={(e) => {
                                                        if (draggedColumn !== col.key && dragOverColumn !== col.key) {
                                                            e.currentTarget.style.backgroundColor =
                                                                "transparent"
                                                        }
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
                                                    {dragOverColumn === col.key && (
                                                        <div style={{
                                                            position: "absolute",
                                                            left: "0",
                                                            top: "0",
                                                            bottom: "0",
                                                            width: "3px",
                                                            backgroundColor: "#3b82f6",
                                                            borderRadius: "1px"
                                                        }} />
                                                    )}
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
                                                        onClick={() => {
                                                            const orgParam =
                                                                encodeURIComponent(
                                                                    org.name
                                                                )
                                                            window.location.href = `/insuredobjects?org=${orgParam}`
                                                        }}
                                                        style={{
                                                            backgroundColor:
                                                                i % 2 === 0
                                                                    ? colors.white
                                                                    : colors.gray50,
                                                            cursor: "pointer",
                                                            transition:
                                                                "background-color 0.15s ease",
                                                        }}
                                                        onMouseEnter={(e) => {
                                                            e.currentTarget.style.backgroundColor =
                                                                "#f0fdf4"
                                                        }}
                                                        onMouseLeave={(e) => {
                                                            e.currentTarget.style.backgroundColor =
                                                                i % 2 === 0
                                                                    ? colors.white
                                                                    : colors.gray50
                                                        }}
                                                    >
                                                        <td
                                                            onClick={(e) =>
                                                                e.stopPropagation()
                                                            }
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
                                                                {/* Organization name - highlighted to show clickable row */}
                                                                {col.key ===
                                                                "name" ? (
                                                                    <span
                                                                        style={{
                                                                            color: "#3b82f6",
                                                                            fontSize:
                                                                                "14px",
                                                                            fontWeight:
                                                                                "500",
                                                                            fontFamily:
                                                                                FONT_STACK,
                                                                        }}
                                                                    >
                                                                        {org[
                                                                            col
                                                                                .key
                                                                        ] ??
                                                                            "-"}
                                                                    </span>
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
                                                                  "extra_info" ? (
                                                                    <div
                                                                        style={{
                                                                            maxWidth: "200px",
                                                                            overflow: "hidden",
                                                                            textOverflow: "ellipsis",
                                                                            whiteSpace: "nowrap",
                                                                        }}
                                                                        title={org[col.key] || "-"}
                                                                    >
                                                                        {org[col.key] || "-"}
                                                                    </div>
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

// ——— Global Rules Integration Components ———

// Save As Global Template Component
interface SaveAsGlobalTemplateProps {
    userInfo: any
    currentRuleConfig: any
    onClose: () => void
    onSaved?: (template: GlobalRuleTemplate) => void
}

function SaveAsGlobalTemplate({
    userInfo,
    currentRuleConfig,
    onClose,
    onSaved,
}: SaveAsGlobalTemplateProps) {
    const [formData, setFormData] = useState({
        name: "",
        description: "",
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // All users can save templates now

    const handleSave = async () => {
        if (!formData.name.trim()) {
            setError("Template naam is verplicht")
            return
        }

        if (
            !currentRuleConfig ||
            !currentRuleConfig.rules ||
            currentRuleConfig.rules.length === 0
        ) {
            setError("Er zijn geen regels om op te slaan als template")
            return
        }

        try {
            setSaving(true)
            setError(null)

            const template = {
                name: formData.name.trim(),
                description: formData.description.trim() || undefined,
                ruleConfig: currentRuleConfig,
                createdBy: userInfo.sub,
            }

            const token = getIdToken()
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            if (token) headers.Authorization = `Bearer ${token}`

            const response = await fetch(
                `${API_BASE_URL}/neptunus/global-rule-templates`,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify(template),
                    mode: "cors",
                }
            )

            if (!response.ok) {
                throw new Error(
                    `Failed to save template: ${response.statusText}`
                )
            }

            const savedTemplate = await response.json()
            onSaved?.(savedTemplate)
            onClose()
        } catch (err) {
            setError(formatErrorMessage(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={styles.modalOverlay}>
            <div
                style={{
                    ...styles.modal,
                    maxWidth: "500px",
                    padding: "24px",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "20px",
                    }}
                >
                    <FaSave size={20} color={colors.primary} />
                    <h3
                        style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: "600",
                        }}
                    >
                        Opslaan als Globale Template
                    </h3>
                </div>

                {/* Form */}
                <div style={{ marginBottom: "20px" }}>
                    <label
                        style={{
                            display: "block",
                            fontSize: "14px",
                            fontWeight: "500",
                            marginBottom: "6px",
                            color: colors.gray700,
                        }}
                    >
                        Template Naam *
                    </label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                name: e.target.value,
                            }))
                        }
                        placeholder="Bijv. Standaard Boot Acceptatie Regels"
                        style={{
                            width: "100%",
                            padding: "10px",
                            border: `1px solid ${colors.gray300}`,
                            borderRadius: "6px",
                            fontSize: "14px",
                            marginBottom: "12px",
                        }}
                    />

                    <label
                        style={{
                            display: "block",
                            fontSize: "14px",
                            fontWeight: "500",
                            marginBottom: "6px",
                            color: colors.gray700,
                        }}
                    >
                        Beschrijving (optioneel)
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) =>
                            setFormData((prev) => ({
                                ...prev,
                                description: e.target.value,
                            }))
                        }
                        placeholder="Beschrijf wanneer deze template gebruikt moet worden..."
                        rows={3}
                        style={{
                            width: "100%",
                            padding: "10px",
                            border: `1px solid ${colors.gray300}`,
                            borderRadius: "6px",
                            fontSize: "14px",
                            resize: "vertical",
                            marginBottom: "12px",
                        }}
                    />

                </div>

                {/* Info Box */}
                <div
                    style={{
                        padding: "12px",
                        backgroundColor: colors.infoBg,
                        border: `1px solid ${colors.info}`,
                        borderRadius: "6px",
                        marginBottom: "20px",
                        fontSize: "13px",
                        color: colors.info,
                    }}
                >
                    <strong>Opmerking:</strong> Deze template bevat{" "}
                    {currentRuleConfig?.rules?.length || 0} acceptatie regels en
                    kan door alle organisaties gebruikt worden.
                </div>

                {error && (
                    <div
                        style={{
                            padding: "12px",
                            backgroundColor: colors.errorBg,
                            color: colors.error,
                            borderRadius: "6px",
                            marginBottom: "20px",
                            fontSize: "14px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Actions */}
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end",
                    }}
                >
                    <button
                        onClick={onClose}
                        disabled={saving}
                        style={{
                            ...styles.secondaryButton,
                            padding: "10px 16px",
                        }}
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving || !formData.name.trim()}
                        style={{
                            ...styles.primaryButton,
                            padding: "10px 16px",
                            backgroundColor: saving
                                ? colors.gray400
                                : colors.success,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <FaSave size={12} />
                        {saving ? "Opslaan..." : "Template Opslaan"}
                    </button>
                </div>
            </div>
        </div>
    )
}

// Load From Global Template Component
interface LoadFromGlobalTemplateProps {
    userInfo: any
    onClose: () => void
    onLoadTemplate: (template: GlobalRuleTemplate) => void
}

function LoadFromGlobalTemplate({
    userInfo,
    onClose,
    onLoadTemplate,
}: LoadFromGlobalTemplateProps) {
    const [templates, setTemplates] = useState<GlobalRuleTemplate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedTemplate, setSelectedTemplate] =
        useState<GlobalRuleTemplate | null>(null)
    const [deletingTemplateId, setDeletingTemplateId] = useState<string | null>(null)

    // Load templates on mount
    React.useEffect(() => {
        loadTemplates()
    }, [])

    const loadTemplates = async () => {
        try {
            setLoading(true)
            const token = getIdToken()
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            if (token) headers.Authorization = `Bearer ${token}`

            const response = await fetch(
                `${API_BASE_URL}/neptunus/global-rule-templates?active=true`,
                {
                    method: "GET",
                    headers,
                    mode: "cors",
                }
            )

            if (!response.ok) {
                throw new Error(
                    `Failed to load templates: ${response.statusText}`
                )
            }

            const data = await response.json()
            setTemplates(data)
        } catch (err) {
            setError(formatErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    const handleLoadTemplate = () => {
        if (selectedTemplate) {
            onLoadTemplate(selectedTemplate)
            onClose()
        }
    }

    const handleDeleteTemplate = async (templateId: string) => {
        try {
            const token = getIdToken()
            const headers: Record<string, string> = {
                "Content-Type": "application/json",
            }
            if (token) headers.Authorization = `Bearer ${token}`

            const response = await fetch(
                `${API_BASE_URL}/neptunus/global-rule-templates/${templateId}`,
                {
                    method: "DELETE",
                    headers,
                    mode: "cors",
                }
            )

            if (!response.ok) {
                throw new Error(
                    `Failed to delete template: ${response.statusText}`
                )
            }

            // Remove the deleted template from the local state
            setTemplates(templates.filter(t => t.id !== templateId))

            // Clear selection if the deleted template was selected
            if (selectedTemplate?.id === templateId) {
                setSelectedTemplate(null)
            }

            setDeletingTemplateId(null)
        } catch (err) {
            setError(formatErrorMessage(err))
        }
    }

    return (
        <div style={styles.modalOverlay}>
            <div
                style={{
                    ...styles.modal,
                    maxWidth: "700px",
                    maxHeight: "80vh",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "20px",
                    }}
                >
                    <FaDownload size={20} color={colors.primary} />
                    <h3
                        style={{
                            margin: 0,
                            fontSize: "18px",
                            fontWeight: "600",
                        }}
                    >
                        Laden vanaf Globale Template
                    </h3>
                </div>

                {error && (
                    <div
                        style={{
                            padding: "12px",
                            backgroundColor: colors.errorBg,
                            color: colors.error,
                            borderRadius: "6px",
                            marginBottom: "20px",
                            fontSize: "14px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Content */}
                <div
                    style={{ flex: 1, overflowY: "auto", marginBottom: "20px" }}
                >
                    {loading ? (
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "40px",
                            }}
                        >
                            Laden...
                        </div>
                    ) : templates.length === 0 ? (
                        <div
                            style={{
                                textAlign: "center",
                                padding: "40px",
                                color: colors.gray500,
                            }}
                        >
                            <FaGlobe
                                size={32}
                                color={colors.gray300}
                                style={{ marginBottom: "16px" }}
                            />
                            <h4>Geen Actieve Templates</h4>
                            <p>
                                Er zijn geen actieve globale templates
                                beschikbaar.
                            </p>
                        </div>
                    ) : (
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "12px",
                            }}
                        >
                            {templates.map((template) => (
                                <div
                                    key={template.id}
                                    onClick={() =>
                                        setSelectedTemplate(template)
                                    }
                                    style={{
                                        padding: "16px",
                                        border: `2px solid ${selectedTemplate?.id === template.id ? colors.primary : colors.gray200}`,
                                        borderRadius: "8px",
                                        cursor: "pointer",
                                        backgroundColor:
                                            selectedTemplate?.id === template.id
                                                ? colors.primaryBg
                                                : colors.white,
                                        transition: "all 0.2s ease",
                                        position: "relative",
                                    }}
                                    onMouseEnter={(e) => {
                                        if (
                                            selectedTemplate?.id !== template.id
                                        ) {
                                            e.currentTarget.style.backgroundColor =
                                                colors.gray50
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (
                                            selectedTemplate?.id !== template.id
                                        ) {
                                            e.currentTarget.style.backgroundColor =
                                                colors.white
                                        }
                                    }}
                                >
                                    {/* Delete button */}
                                    <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                if (window.confirm(`Weet je zeker dat je de template "${template.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`)) {
                                                    setDeletingTemplateId(template.id)
                                                    handleDeleteTemplate(template.id)
                                                }
                                            }}
                                            style={{
                                                position: "absolute",
                                                top: "8px",
                                                right: "8px",
                                                background: "none",
                                                border: "none",
                                                cursor: "pointer",
                                                color: colors.error,
                                                padding: "4px",
                                                borderRadius: "4px",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = colors.errorBg
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = "transparent"
                                            }}
                                            title="Template verwijderen"
                                            disabled={deletingTemplateId === template.id}
                                        >
                                            <FaTimes
                                                size={14}
                                                style={{
                                                    opacity: deletingTemplateId === template.id ? 0.5 : 1
                                                }}
                                            />
                                        </button>

                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems: "flex-start",
                                            justifyContent: "space-between",
                                            marginBottom: "8px",
                                            paddingRight: "24px", // Make room for delete button
                                        }}
                                    >
                                        <h4
                                            style={{
                                                margin: 0,
                                                fontSize: "16px",
                                                fontWeight: "600",
                                                color:
                                                    selectedTemplate?.id ===
                                                    template.id
                                                        ? colors.primary
                                                        : colors.gray900,
                                            }}
                                        >
                                            {template.name}
                                        </h4>
                                        {selectedTemplate?.id ===
                                            template.id && (
                                            <FaCheckCircle
                                                size={16}
                                                color={colors.primary}
                                            />
                                        )}
                                    </div>

                                    {template.description && (
                                        <p
                                            style={{
                                                margin: "0 0 12px 0",
                                                fontSize: "14px",
                                                color: colors.gray600,
                                                lineHeight: "1.4",
                                            }}
                                        >
                                            {template.description}
                                        </p>
                                    )}

                                    <div
                                        style={{
                                            display: "flex",
                                            gap: "16px",
                                            fontSize: "12px",
                                            color: colors.gray500,
                                        }}
                                    >
                                        <span>
                                            {template.ruleConfig.rules.length}{" "}
                                            regels
                                        </span>
                                        <span>
                                            {template.usageCount} x gebruikt
                                        </span>
                                        <span>
                                            Aangemaakt:{" "}
                                            {new Date(
                                                template.createdAt
                                            ).toLocaleDateString("nl-NL")}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Warning */}
                {selectedTemplate && (
                    <div
                        style={{
                            padding: "12px",
                            backgroundColor: colors.warningBg,
                            border: `1px solid ${colors.warning}`,
                            borderRadius: "6px",
                            marginBottom: "20px",
                            fontSize: "13px",
                            color: colors.warning,
                        }}
                    >
                        <strong>Let op:</strong> Het laden van een template
                        overschrijft alle huidige acceptatie regels.
                    </div>
                )}

                {/* Actions */}
                <div
                    style={{
                        display: "flex",
                        gap: "12px",
                        justifyContent: "flex-end",
                    }}
                >
                    <button
                        onClick={onClose}
                        style={{
                            ...styles.secondaryButton,
                            padding: "10px 16px",
                        }}
                    >
                        Annuleren
                    </button>
                    <button
                        onClick={handleLoadTemplate}
                        disabled={!selectedTemplate}
                        style={{
                            ...styles.primaryButton,
                            padding: "10px 16px",
                            backgroundColor: !selectedTemplate
                                ? colors.gray400
                                : colors.primary,
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                        }}
                    >
                        <FaDownload size={12} />
                        Template Laden
                    </button>
                </div>
            </div>
        </div>
    )
}
