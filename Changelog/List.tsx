import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override, Frame } from "framer"
import { useState, useEffect, useCallback } from "react"

import {
    FaSearch,
    FaFilter,
    FaChevronDown,
    FaChevronRight,
    FaDatabase,
    FaClock,
    FaUser,
    FaArrowLeft,
    FaBuilding,
    FaFileContract,
    FaUsers,
    FaClipboardList,
    FaShip,
    FaUserTie,
    FaCog,
    FaShieldAlt,
    FaTruck,
    FaCogs,
} from "react-icons/fa"

import { colors, styles, hover, FONT_STACK, animations } from "../theme"
import { API_BASE_URL, API_PATHS, getIdToken, getUserId } from "../utils"

// Add CSS animation for loading spinner
if (typeof document !== "undefined") {
    const style = document.createElement("style")
    style.textContent = `
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    `
    if (!document.head.querySelector("style[data-changelog-spinner]")) {
        style.setAttribute("data-changelog-spinner", "true")
        document.head.appendChild(style)
    }
}

async function fetchChangelog(page: number = 0, pageSize: number = 50): Promise<{items: any[], pagination: any}> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    
    const url = new URL(`${API_BASE_URL}${API_PATHS.CHANGELOG}`)
    url.searchParams.append('page', page.toString())
    url.searchParams.append('pageSize', pageSize.toString())
    
    const res = await fetch(url.toString(), {
        method: "GET",
        headers,
        mode: "cors",
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const json = await res.json()
    
    return {
        items: json.items || json.data || json,
        pagination: json.pagination || { page: 0, pageSize: 50, totalItems: 0, hasMore: false, totalPages: 0 }
    }
}

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

// Helper function to get UX-friendly table name
function getTableDisplayName(sourceTableTag: string): string {
    switch (sourceTableTag.toLowerCase()) {
        case "user":
            return "Gebruikers"
        case "insuredobject":
            return "Verzekerde Objecten"
        case "policy":
            return "Polissen"
        case "organization":
            return "Organisaties"
        default:
            return sourceTableTag
    }
}

// Helper function to get icon and display name based on insured object type
function getInsuredObjectIconAndName(
    formattedChanges: any,
    entityId: string
): { icon: React.ReactNode; displayName: string } {
    // Check for boat/ship
    if (
        formattedChanges?.merkBoot ||
        formattedChanges?.typeBoot ||
        formattedChanges?.bootnummer
    ) {
        const boatNumber = formattedChanges.bootnummer || ""
        const displayName = boatNumber ? `Boat: ${boatNumber}` : "Boat: Unknown"
        return {
            icon: <FaShip style={{ color: colors.primary }} />,
            displayName,
        }
    }

    // Check for trailer
    if (formattedChanges?.trailerRegistratienummer) {
        const trailerNumber = formattedChanges.trailerRegistratienummer
        return {
            icon: <FaTruck style={{ color: colors.warning }} />,
            displayName: `Trailer: ${trailerNumber}`,
        }
    }

    // Check for motor
    if (formattedChanges?.motorMerk || formattedChanges?.motorSerienummer) {
        const motorNumber = formattedChanges.motorSerienummer || "Unknown"
        return {
            icon: <FaCogs style={{ color: colors.error }} />,
            displayName: `Motor: ${motorNumber}`,
        }
    }

    // Check for objectType to determine type
    if (formattedChanges?.objectType) {
        const objectType = formattedChanges.objectType.toLowerCase()
        if (objectType.includes("boat") || objectType.includes("boot")) {
            return {
                icon: <FaShip style={{ color: colors.primary }} />,
                displayName: "Boat: Unknown",
            }
        } else if (objectType.includes("trailer")) {
            return {
                icon: <FaTruck style={{ color: colors.warning }} />,
                displayName: "Trailer: Unknown",
            }
        } else if (objectType.includes("motor")) {
            return {
                icon: <FaCogs style={{ color: colors.error }} />,
                displayName: "Motor: Unknown",
            }
        }
    }

    // Default to boat if no specific type found
    return {
        icon: <FaShip style={{ color: colors.primary }} />,
        displayName: `Object: ${entityId.slice(-8)}`,
    }
}

// ——— Entity Information Fetching ———
async function fetchEntityInfo(
    entityId: string,
    sourceTableTag: string,
    changes: any
): Promise<{
    displayName: string
    organization?: string
    icon: React.ReactNode
} | null> {
    if (!entityId || !sourceTableTag) return null

    // First try to extract info from changes data (which is always available)
    const formattedChanges = formatDynamoDBValue(changes)
    let displayName = "Unknown"
    let organization = ""
    let icon: React.ReactNode = <FaClipboardList />

    // Set icon and display name based on source table and content
    switch (sourceTableTag.toLowerCase()) {
        case "insuredobject":
            const insuredObjectInfo = getInsuredObjectIconAndName(
                formattedChanges,
                entityId
            )
            icon = insuredObjectInfo.icon
            displayName = insuredObjectInfo.displayName
            break
        case "policy":
            icon = <FaFileContract style={{ color: colors.success }} />
            const polisnummer =
                formattedChanges?.polisnummer || entityId.slice(-8)
            displayName = `Polis: ${polisnummer}`
            break
        case "organization":
            icon = <FaBuilding style={{ color: colors.warning }} />
            const orgName = formattedChanges?.name || entityId.slice(-8)
            displayName = `Organisatie: ${orgName}`
            break
        case "user":
            icon = <FaUser style={{ color: colors.primary }} />
            const email =
                formattedChanges?.email ||
                formattedChanges?.username ||
                entityId.slice(-8)
            displayName = `User: ${email}`
            break
    }

    // Extract organization information
    organization = formattedChanges?.organization || ""
    if (sourceTableTag.toLowerCase() === "user") {
        organization = Array.isArray(formattedChanges?.organizations)
            ? formattedChanges.organizations[0]
            : formattedChanges?.organizations || ""
    } else if (sourceTableTag.toLowerCase() === "organization") {
        organization = displayName.replace("Organisatie: ", "")
    }

    // If we got good info from changes, return it
    if (
        displayName !== "Unknown" &&
        displayName !== `${sourceTableTag} ${entityId.slice(-8)}`
    ) {
        return {
            displayName,
            organization,
            icon,
        }
    }

    // Only try API call as enhancement, not as primary source
    const token = getIdToken()
    if (!token) {
        // Return the info we have from changes
        return {
            displayName:
                displayName || `${sourceTableTag} ${entityId.slice(-8)}`,
            organization,
            icon,
        }
    }

    const headers: Record<string, string> = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
    }

    try {
        let endpoint = ""

        switch (sourceTableTag.toLowerCase()) {
            case "insuredobject":
                endpoint = `${API_PATHS.INSURED_OBJECT}/${entityId}`
                break
            case "policy":
                endpoint = `${API_PATHS.POLICY}/${entityId}`
                break
            case "organization":
                endpoint = `${API_PATHS.ORGANIZATION}/${entityId}`
                break
            case "user":
                endpoint = `${API_PATHS.USER}/${entityId}`
                break
            default:
                // Return changes-based info for unknown types
                return {
                    displayName:
                        displayName ||
                        `${sourceTableTag} ${entityId.slice(-8)}`,
                    organization,
                    icon,
                }
        }

        const res = await fetch(`${API_BASE_URL}${endpoint}`, {
            method: "GET",
            headers,
            mode: "cors",
        })

        if (res.ok) {
            const data = await res.json()

            // Enhance the display info with API data if available
            if (sourceTableTag.toLowerCase() === "insuredobject") {
                const obj = data.insuredObject || data
                if (obj.merkBoot || obj.typeBoot) {
                    const boatName = obj.merkBoot || obj.typeBoot || ""
                    const boatNumber = obj.bootnummer || ""
                    displayName = boatName
                        ? boatNumber
                            ? `${boatName} (${boatNumber})`
                            : boatName
                        : boatNumber
                          ? `Boot ${boatNumber}`
                          : displayName
                }
                organization = obj.organization || organization
            } else if (sourceTableTag.toLowerCase() === "policy") {
                const policy = data.policy || data
                if (policy.polisnummer) {
                    displayName = policy.polisnummer
                }
                organization = policy.organization || organization
            } else if (sourceTableTag.toLowerCase() === "organization") {
                const org = data.organization || data
                if (org.name) {
                    displayName = org.name
                    organization = org.name
                }
            }
        }
        // If API call fails, we still have the changes-based info to fall back on
    } catch (error) {
        console.warn(
            `Could not fetch ${sourceTableTag} details for ${entityId}:`,
            error
        )
        // Continue with changes-based info
    }

    return {
        displayName: displayName || `${sourceTableTag} ${entityId.slice(-8)}`,
        organization,
        icon,
    }
}

// ——— Time Helpers ———
function getRelativeTime(timestamp: string): string {
    const now = new Date()
    const changeTime = new Date(timestamp)

    // Subtract 2 hours to correct for timezone difference
    changeTime.setHours(changeTime.getHours() + 2)

    const diffMs = now.getTime() - changeTime.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return "Zojuist"
    if (diffMinutes < 60) return `${diffMinutes}m geleden`
    if (diffHours < 24) return `${diffHours}u geleden`
    if (diffDays < 7) return `${diffDays}d geleden`

    return changeTime.toLocaleDateString()
}

// ——— Action Styling Helper ———
function getActionStyle(action: string) {
    switch (action?.toUpperCase()) {
        case "CREATE":
            return {
                backgroundColor: colors.successBg,
                color: colors.success,
                border: `1px solid ${colors.successBorder}`,
            }
        case "UPDATE":
            return {
                backgroundColor: colors.warningBg,
                color: colors.warning,
                border: `1px solid ${colors.warningBorder}`,
            }
        case "DELETE":
            return {
                backgroundColor: colors.errorBg,
                color: colors.error,
                border: `1px solid ${colors.errorBorder}`,
            }
        default:
            return {
                backgroundColor: colors.gray50,
                color: colors.gray500,
                border: "1px solid #e5e7eb",
            }
    }
}

// ——— Data Formatting Helper ———
function formatDynamoDBValue(value: any): any {
    if (value === null || value === undefined) {
        return null
    }

    // Handle DynamoDB format objects
    if (typeof value === "object" && value !== null) {
        // Check for DynamoDB type annotations
        if (value.S !== undefined) return value.S // String
        if (value.N !== undefined) return Number(value.N) // Number
        if (value.BOOL !== undefined) return value.BOOL // Boolean
        if (value.NULL !== undefined) return null // Null
        if (value.L !== undefined) return value.L.map(formatDynamoDBValue) // List
        if (value.M !== undefined) {
            // Map/Object
            const formatted: any = {}
            for (const [key, val] of Object.entries(value.M)) {
                formatted[key] = formatDynamoDBValue(val)
            }
            return formatted
        }
        if (value.SS !== undefined) return value.SS // String Set
        if (value.NS !== undefined) return value.NS.map(Number) // Number Set
        if (value.BS !== undefined) return value.BS // Binary Set

        // If no DynamoDB type annotation, recursively format object properties
        const formatted: any = {}
        for (const [key, val] of Object.entries(value)) {
            formatted[key] = formatDynamoDBValue(val)
        }
        return formatted
    }

    return value
}

function formatChangeValue(value: any): string {
    if (value === null || value === undefined) {
        return "null"
    }

    if (typeof value === "boolean") {
        return value ? "✓ Yes" : "✗ No"
    }

    if (typeof value === "string") {
        // Check if it's a date string
        if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            const dateValue = new Date(value)
            dateValue.setHours(dateValue.getHours() + 2)
            return dateValue.toLocaleString("nl-NL")
        }
        return value
    }

    if (typeof value === "number") {
        return value.toLocaleString()
    }

    if (Array.isArray(value)) {
        if (value.length === 0) return "Empty list"
        if (value.length <= 3) {
            return value.map(formatChangeValue).join(", ")
        }
        return `${value.slice(0, 3).map(formatChangeValue).join(", ")} ... (+${value.length - 3} more)`
    }

    if (typeof value === "object") {
        const keys = Object.keys(value)
        if (keys.length === 0) return "Empty object"

        // Special handling for configuration objects with required/visible pattern
        if (
            keys.length > 5 &&
            keys.every(
                (key) =>
                    typeof value[key] === "object" &&
                    value[key] &&
                    ("required" in value[key] || "visible" in value[key])
            )
        ) {
            const requiredFields = keys.filter(
                (key) => value[key]?.required === true
            )
            const visibleFields = keys.filter(
                (key) => value[key]?.visible === true
            )

            let summary = `Configuration for ${keys.length} fields`
            if (requiredFields.length > 0) {
                summary += ` • Required: ${requiredFields.join(", ")}`
            }
            if (
                visibleFields.length > 0 &&
                visibleFields.length !== requiredFields.length
            ) {
                summary += ` • Visible: ${visibleFields.join(", ")}`
            }
            return summary
        }

        if (keys.length <= 3) {
            return keys
                .map((key) => `${key}: ${formatChangeValue(value[key])}`)
                .join(", ")
        }
        return `${keys
            .slice(0, 3)
            .map((key) => `${key}: ${formatChangeValue(value[key])}`)
            .join(", ")} ... (+${keys.length - 3} more fields)`
    }

    return String(value)
}

// ——— Column Definitions ———
type ColumnKey =
    | "timestamp"
    | "action"
    | "sourceTableName"
    | "lastUpdatedBy"
    | "entityInfo"
    | "changes"

const COLUMN_GROUPS = {
    essential: { label: "Essentiële", priority: 1 },
    additional: { label: "Aanvullend", priority: 2 },
}

const COLUMNS: {
    key: ColumnKey
    label: string
    priority: number
    group: keyof typeof COLUMN_GROUPS
    width?: string
}[] = [
    {
        key: "timestamp",
        label: "Wanneer",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "action",
        label: "Actie",
        priority: 1,
        group: "essential",
        width: "100px",
    },
    {
        key: "sourceTableName",
        label: "Tabel",
        priority: 1,
        group: "essential",
        width: "180px",
    },
    {
        key: "entityInfo",
        label: "Item",
        priority: 1,
        group: "essential",
        width: "220px",
    },
    {
        key: "lastUpdatedBy",
        label: "Gewijzigd Door",
        priority: 1,
        group: "essential",
        width: "160px",
    },
    {
        key: "changes",
        label: "Wijzigingen",
        priority: 2,
        group: "additional",
        width: "100px",
    },
]

// ——— Entity History Builder ———
function buildEntityHistory(changelog: any[]): Map<string, any[]> {
    const entityHistories = new Map<string, any[]>()

    // Sort changelog by timestamp (oldest first) to build proper history
    const sortedChangelog = [...changelog].sort(
        (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )

    for (const entry of sortedChangelog) {
        if (!entry.entityId) continue

        if (!entityHistories.has(entry.entityId)) {
            entityHistories.set(entry.entityId, [])
        }

        entityHistories.get(entry.entityId)!.push(entry)
    }

    return entityHistories
}

// ——— Get Previous State for Entity ———
function getPreviousEntityState(
    entityHistory: any[],
    currentEntryIndex: number,
    currentChanges: any
): any {
    if (currentEntryIndex <= 0 || !currentChanges) return null

    // Get the fields that are changing in the current entry
    const currentFields = Object.keys(currentChanges)

    // Look through previous entries to find the last known value for each field
    const previousState: any = {}

    for (const field of currentFields) {
        // Find the most recent previous entry that had this field
        for (let i = currentEntryIndex - 1; i >= 0; i--) {
            const entry = entityHistory[i]
            if (!entry.changes || entry.action === "DELETE") continue

            if (field in entry.changes) {
                // Found the previous value for this field
                if (entry.action === "CREATE" || entry.action === "UPDATE") {
                    previousState[field] = formatDynamoDBValue(
                        entry.changes[field]
                    )
                    break // Found the most recent value, stop looking
                }
            }
        }
    }

    return Object.keys(previousState).length > 0 ? previousState : null
}

// ——— Enhanced Change Value Formatter for Old/New Values ———
function formatOldNewValue(oldValue: any, newValue: any): React.ReactNode {
    const formatSingleValue = (value: any): string => {
        if (value === null || value === undefined) return "(geen waarde)"
        if (typeof value === "boolean") return value ? "✓ Ja" : "✗ Nee"
        if (typeof value === "string") {
            if (value === "") return "(lege tekst)"
            if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                const dateValue = new Date(value)
                dateValue.setHours(dateValue.getHours() + 2)
                return dateValue.toLocaleString("nl-NL")
            }
            return value
        }
        if (typeof value === "number") return value.toLocaleString("nl-NL")
        if (Array.isArray(value)) {
            if (value.length === 0) return "Lege lijst"
            return value.length <= 3
                ? value.join(", ")
                : `${value.slice(0, 3).join(", ")} ... (+${value.length - 3} meer)`
        }
        if (typeof value === "object") {
            const keys = Object.keys(value)
            if (keys.length === 0) return "Leeg object"
            return keys.length <= 2
                ? keys.map((k) => `${k}: ${value[k]}`).join(", ")
                : `${keys.length} velden`
        }
        return String(value)
    }

    const oldFormatted = formatSingleValue(oldValue)
    const newFormatted = formatSingleValue(newValue)

    // Handle cases where values are the same (shouldn't happen in updates, but just in case)
    if (oldFormatted === newFormatted) {
        return (
            <div
                style={{
                    padding: "4px 8px",
                    backgroundColor: colors.gray100,
                    borderRadius: "4px",
                    color: colors.gray500,
                }}
            >
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: colors.gray500,
                        textTransform: "uppercase",
                        marginRight: "6px",
                    }}
                >
                    Ongewijzigd:
                </span>
                {newFormatted}
            </div>
        )
    }

    // Handle case where old value was null (new addition)
    if (oldValue === null || oldValue === undefined) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    backgroundColor: "#ecfdf5",
                    borderRadius: "6px",
                    border: "1px solid #a7f3d0",
                }}
            >
                <span
                    style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: colors.success,
                        textTransform: "uppercase",
                    }}
                >
                    Toegevoegd:
                </span>
                <span style={{ color: colors.success, fontWeight: "500" }}>
                    {newFormatted}
                </span>
            </div>
        )
    }

    // Handle case where new value is null (deletion)
    if (newValue === null || newValue === undefined) {
        return (
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 10px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "6px",
                    border: "1px solid #fecaca",
                }}
            >
                <span
                    style={{
                        fontSize: "11px",
                        fontWeight: "600",
                        color: colors.error,
                        textTransform: "uppercase",
                    }}
                >
                    Verwijderd:
                </span>
                <span
                    style={{ color: colors.error, textDecoration: "line-through" }}
                >
                    {oldFormatted}
                </span>
            </div>
        )
    }

    // Normal update case - show old and new values side by side
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "1fr auto 1fr",
                gap: "8px",
                alignItems: "center",
                padding: "8px",
                backgroundColor: "#fef9e7",
                borderRadius: "8px",
                border: "1px solid #fed7aa",
            }}
        >
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    padding: "6px 8px",
                    backgroundColor: "#fef2f2",
                    borderRadius: "6px",
                    border: "1px solid #fecaca",
                }}
            >
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: colors.error,
                        textTransform: "uppercase",
                    }}
                >
                    Oud:
                </span>
                <span
                    style={{
                        color: colors.error,
                        fontSize: "12px",
                        textDecoration: "line-through",
                    }}
                >
                    {oldFormatted}
                </span>
            </div>

            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#ca8a04",
                    fontSize: "14px",
                    fontWeight: "bold",
                }}
            >
                →
            </div>

            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "2px",
                    padding: "6px 8px",
                    backgroundColor: "#ecfdf5",
                    borderRadius: "6px",
                    border: "1px solid #a7f3d0",
                }}
            >
                <span
                    style={{
                        fontSize: "10px",
                        fontWeight: "600",
                        color: colors.success,
                        textTransform: "uppercase",
                    }}
                >
                    Nieuw:
                </span>
                <span
                    style={{
                        color: colors.success,
                        fontWeight: "500",
                        fontSize: "12px",
                    }}
                >
                    {newFormatted}
                </span>
            </div>
        </div>
    )
}

// ——— Expandable Changes Component ———
function ExpandableChanges({
    changes,
    action,
    isExpanded,
    onToggle,
    previousState,
}: {
    changes: any
    action: string
    isExpanded: boolean
    onToggle: () => void
    previousState?: any
}) {
    const changesCount = Object.keys(changes || {}).length
    const isUpdate = action?.toUpperCase() === "UPDATE"
    const isDelete = action?.toUpperCase() === "DELETE"
    const isCreate = action?.toUpperCase() === "CREATE"

    return (
        <div>
            <button
                onClick={onToggle}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    backgroundColor: colors.gray100,
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                    color: colors.gray700,
                }}
                onMouseOver={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                        colors.gray200)
                }
                onMouseOut={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor =
                        colors.gray100)
                }
            >
                {isExpanded ? (
                    <FaChevronDown size={10} />
                ) : (
                    <FaChevronRight size={10} />
                )}
                {changesCount} veld{changesCount !== 1 ? "en" : ""}
                {isUpdate && " (met vergelijking)"}
                {isCreate && " (nieuwe waarden)"}
                {isDelete && " (verwijderde waarden)"}
            </button>

            {isExpanded && (
                <div
                    style={{
                        marginTop: "8px",
                        padding: "12px",
                        backgroundColor: colors.gray50,
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                        fontFamily: FONT_STACK,
                    }}
                >
                    {Object.entries(changes || {}).map(
                        ([key, value]: [string, any]) => {
                            const formattedValue = formatDynamoDBValue(value)
                            let displayValue: React.ReactNode

                            if (
                                isUpdate &&
                                previousState &&
                                key in previousState
                            ) {
                                // We have historical data - show before/after comparison
                                const oldValue = previousState[key]
                                displayValue = formatOldNewValue(
                                    oldValue,
                                    formattedValue
                                )
                            } else if (isCreate) {
                                // New field being added
                                displayValue = formatOldNewValue(
                                    null,
                                    formattedValue
                                )
                            } else if (isDelete) {
                                // Field being deleted
                                displayValue = formatOldNewValue(
                                    formattedValue,
                                    null
                                )
                            } else if (isUpdate) {
                                // Update without historical context - show as changed value
                                displayValue = (
                                    <div
                                        style={{
                                            padding: "6px 10px",
                                            backgroundColor: "#fefce8",
                                            borderRadius: "6px",
                                            border: "1px solid #fde68a",
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: "11px",
                                                fontWeight: "600",
                                                color: "#ca8a04",
                                                textTransform: "uppercase",
                                                display: "block",
                                                marginBottom: "4px",
                                            }}
                                        >
                                            Gewijzigd naar:
                                        </span>
                                        <span
                                            style={{
                                                color: "#92400e",
                                                fontSize: "12px",
                                            }}
                                        >
                                            {formatChangeValue(formattedValue)}
                                        </span>
                                    </div>
                                )
                            } else {
                                // Fallback display
                                displayValue = (
                                    <div style={{ color: colors.gray500 }}>
                                        {formatChangeValue(formattedValue)}
                                    </div>
                                )
                            }

                            return (
                                <div
                                    key={key}
                                    style={{
                                        marginBottom: "12px",
                                        wordBreak: "break-word",
                                        padding: "10px",
                                        backgroundColor: colors.white,
                                        borderRadius: "6px",
                                        border: "1px solid #e5e7eb",
                                        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: "600",
                                            color: colors.gray700,
                                            marginBottom: "6px",
                                            fontSize: "13px",
                                            fontFamily: FONT_STACK,
                                        }}
                                    >
                                        {key
                                            .replace(/([A-Z])/g, " $1")
                                            .replace(/^./, (str) =>
                                                str.toUpperCase()
                                            )}
                                    </div>
                                    <div
                                        style={{
                                            fontSize: "12px",
                                            lineHeight: "1.4",
                                        }}
                                    >
                                        {displayValue}
                                    </div>
                                </div>
                            )
                        }
                    )}
                </div>
            )}
        </div>
    )
}

// ——— Enhanced Search and Filter Bar ———
function ChangelogSearchAndFilterBar({
    searchTerm,
    onSearchChange,
    visibleColumns,
    onToggleColumn,
    selectedTableTags,
    onTableTagChange,
    availableTableTags,
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    visibleColumns: Set<string>
    onToggleColumn: (column: string) => void
    selectedTableTags: Set<string>
    onTableTagChange: (tag: string) => void
    availableTableTags: string[]
}) {
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [showTableFilter, setShowTableFilter] = useState(false)
    const [buttonRef, setButtonRef] = useState<HTMLButtonElement | null>(null)
    const [tableButtonRef, setTableButtonRef] =
        useState<HTMLButtonElement | null>(null)
    const [dropdownPosition, setDropdownPosition] = useState({
        top: 0,
        right: 0,
    })
    const [tableDropdownPosition, setTableDropdownPosition] = useState({
        top: 0,
        right: 0,
    })

    useEffect(() => {
        if (buttonRef && showColumnFilter) {
            const rect = buttonRef.getBoundingClientRect()
            setDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [buttonRef, showColumnFilter])

    useEffect(() => {
        if (tableButtonRef && showTableFilter) {
            const rect = tableButtonRef.getBoundingClientRect()
            setTableDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [tableButtonRef, showTableFilter])

    return (
        <>
            <div
                style={{
                    display: "flex",
                    gap: "16px",
                    alignItems: "center",
                    marginBottom: "24px",
                    flexWrap: "wrap",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        flex: "1",
                        minWidth: "200px",
                    }}
                >
                    <FaSearch
                        style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: colors.gray500,
                            fontSize: "14px",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Zoek in wijzigingslogboek..."
                        value={searchTerm}
                        onChange={(e) => onSearchChange(e.target.value)}
                        style={{
                            width: "100%",
                            padding: "12px 12px 12px 40px",
                            border: "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontFamily: FONT_STACK,
                            transition: "border-color 0.2s",
                        }}
                        onFocus={(e) =>
                            (e.target.style.borderColor = colors.primary)
                        }
                        onBlur={(e) => (e.target.style.borderColor = colors.gray300)}
                    />
                </div>

                <div style={{ position: "relative" }}>
                    <button
                        ref={setTableButtonRef}
                        onClick={() => setShowTableFilter(!showTableFilter)}
                        style={{
                            padding: "12px 16px",
                            backgroundColor:
                                selectedTableTags.size > 0
                                    ? colors.primary
                                    : colors.white,
                            color:
                                selectedTableTags.size > 0
                                    ? "white"
                                    : colors.gray700,
                            border:
                                selectedTableTags.size > 0
                                    ? "none"
                                    : "1px solid #d1d5db",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s",
                            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
                        }}
                        onMouseOver={(e) => {
                            if (selectedTableTags.size === 0) {
                                ;(
                                    e.target as HTMLElement
                                ).style.backgroundColor = colors.gray50
                            }
                        }}
                        onMouseOut={(e) => {
                            if (selectedTableTags.size === 0) {
                                ;(
                                    e.target as HTMLElement
                                ).style.backgroundColor = colors.white
                            }
                        }}
                    >
                        <FaDatabase />
                        {selectedTableTags.size === 0
                            ? "Selecteer tabellen"
                            : `${selectedTableTags.size} geselecteerd`}
                    </button>
                </div>

                <div style={{ position: "relative" }}>
                    <button
                        ref={setButtonRef}
                        onClick={() => setShowColumnFilter(!showColumnFilter)}
                        style={{
                            padding: "12px 16px",
                            backgroundColor: colors.gray100,
                            color: colors.gray700,
                            border: "none",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "500",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            transition: "all 0.2s",
                        }}
                        onMouseOver={(e) =>
                            ((e.target as HTMLElement).style.backgroundColor =
                                colors.gray200)
                        }
                        onMouseOut={(e) =>
                            ((e.target as HTMLElement).style.backgroundColor =
                                colors.gray100)
                        }
                    >
                        <FaFilter /> Columns ({visibleColumns.size})
                    </button>
                </div>
            </div>

            {/* Table Filter Dropdown */}
            {showTableFilter &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 999,
                            }}
                            onClick={() => setShowTableFilter(false)}
                        />
                        <div
                            style={{
                                position: "fixed",
                                top: `${tableDropdownPosition.top}px`,
                                right: `${tableDropdownPosition.right}px`,
                                backgroundColor: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: "12px",
                                boxShadow:
                                    "0 20px 50px rgba(0,0,0,0.12), 0 4px 6px rgba(0,0,0,0.06)",
                                zIndex: 1000,
                                minWidth: "280px",
                                maxHeight: "400px",
                                overflowY: "auto",
                            }}
                        >
                            <div
                                style={{
                                    padding: "16px 20px",
                                    borderBottom: `1px solid ${colors.gray200}`,
                                    backgroundColor: colors.gray50,
                                    borderRadius: "12px 12px 0 0",
                                }}
                            >
                                <h3
                                    style={{
                                        margin: "0 0 12px 0",
                                        fontSize: "15px",
                                        fontWeight: "600",
                                        color: colors.gray700,
                                        fontFamily: FONT_STACK,
                                    }}
                                >
                                    Filter op tabellen
                                </h3>
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        onClick={() => {
                                            availableTableTags.forEach(
                                                (tag) => {
                                                    if (
                                                        !selectedTableTags.has(
                                                            tag
                                                        )
                                                    ) {
                                                        onTableTagChange(tag)
                                                    }
                                                }
                                            )
                                        }}
                                        style={{
                                            padding: "6px 12px",
                                            fontSize: "12px",
                                            backgroundColor: colors.primary,
                                            color: "white",
                                            border: "none",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontWeight: "500",
                                            transition: "background-color 0.2s",
                                        }}
                                        onMouseOver={(e) =>
                                            ((
                                                e.target as HTMLElement
                                            ).style.backgroundColor = colors.primaryHover)
                                        }
                                        onMouseOut={(e) =>
                                            ((
                                                e.target as HTMLElement
                                            ).style.backgroundColor = colors.primary)
                                        }
                                    >
                                        Alles selecteren
                                    </button>
                                    <button
                                        onClick={() => {
                                            selectedTableTags.forEach((tag) =>
                                                onTableTagChange(tag)
                                            )
                                        }}
                                        style={{
                                            padding: "6px 12px",
                                            fontSize: "12px",
                                            backgroundColor: colors.gray100,
                                            color: colors.gray700,
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            cursor: "pointer",
                                            fontWeight: "500",
                                            transition: "background-color 0.2s",
                                        }}
                                        onMouseOver={(e) =>
                                            ((
                                                e.target as HTMLElement
                                            ).style.backgroundColor = colors.gray200)
                                        }
                                        onMouseOut={(e) =>
                                            ((
                                                e.target as HTMLElement
                                            ).style.backgroundColor = colors.gray100)
                                        }
                                    >
                                        Alles wissen
                                    </button>
                                </div>
                            </div>
                            <div style={{ padding: "8px 0" }}>
                                {availableTableTags.map((tag) => {
                                    const isSelected =
                                        selectedTableTags.has(tag)

                                    return (
                                        <label
                                            key={tag}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "12px",
                                                padding: "12px 20px",
                                                cursor: "pointer",
                                                fontSize: "14px",
                                                fontFamily: FONT_STACK,
                                                transition:
                                                    "background-color 0.2s",
                                                backgroundColor: isSelected
                                                    ? "#f0f9ff"
                                                    : "transparent",
                                                borderLeft: isSelected
                                                    ? `3px solid ${colors.primary}`
                                                    : "3px solid transparent",
                                            }}
                                            onMouseOver={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    isSelected
                                                        ? "#f0f9ff"
                                                        : colors.gray50)
                                            }
                                            onMouseOut={(e) =>
                                                (e.currentTarget.style.backgroundColor =
                                                    isSelected
                                                        ? "#f0f9ff"
                                                        : "transparent")
                                            }
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() =>
                                                    onTableTagChange(tag)
                                                }
                                                style={{
                                                    cursor: "pointer",
                                                    accentColor: colors.primary,
                                                    width: "16px",
                                                    height: "16px",
                                                }}
                                            />
                                            <FaDatabase
                                                style={{
                                                    color: isSelected
                                                        ? colors.primary
                                                        : colors.gray500,
                                                    fontSize: "16px",
                                                    transition: "color 0.2s",
                                                }}
                                            />
                                            <div style={{ flex: 1 }}>
                                                <div
                                                    style={{
                                                        fontWeight: isSelected
                                                            ? "600"
                                                            : "500",
                                                        color: isSelected
                                                            ? "#1e40af"
                                                            : colors.gray700,
                                                        marginBottom: "2px",
                                                    }}
                                                >
                                                    {tag}
                                                </div>
                                            </div>
                                        </label>
                                    )
                                })}
                            </div>
                        </div>
                    </>,
                    document.body
                )}

            {/* Column Filter Dropdown */}
            {showColumnFilter &&
                ReactDOM.createPortal(
                    <>
                        <div
                            style={{
                                position: "fixed",
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                zIndex: 999,
                            }}
                            onClick={() => setShowColumnFilter(false)}
                        />
                        <div
                            style={{
                                position: "fixed",
                                top: `${dropdownPosition.top}px`,
                                right: `${dropdownPosition.right}px`,
                                backgroundColor: "#fff",
                                border: "1px solid #d1d5db",
                                borderRadius: "8px",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                zIndex: 1000,
                                minWidth: "250px",
                                maxHeight: "300px",
                                overflowY: "auto",
                            }}
                        >
                            <div
                                style={{
                                    padding: "12px",
                                    borderBottom: `1px solid ${colors.gray200}`,
                                }}
                            >
                                <div style={{ display: "flex", gap: "8px" }}>
                                    <button
                                        onClick={() => {
                                            COLUMNS.filter(
                                                (col) =>
                                                    col.group !== "essential"
                                            ).forEach((col) => {
                                                if (
                                                    visibleColumns.has(col.key)
                                                ) {
                                                    onToggleColumn(col.key)
                                                }
                                            })
                                            COLUMNS.filter(
                                                (col) =>
                                                    col.group === "essential"
                                            ).forEach((col) => {
                                                if (
                                                    !visibleColumns.has(col.key)
                                                ) {
                                                    onToggleColumn(col.key)
                                                }
                                            })
                                        }}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            backgroundColor: colors.gray100,
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Alleen Essentiële
                                    </button>
                                    <button
                                        onClick={() =>
                                            COLUMNS.forEach(
                                                (col) =>
                                                    !visibleColumns.has(
                                                        col.key
                                                    ) && onToggleColumn(col.key)
                                            )
                                        }
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            backgroundColor: colors.gray100,
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Toon Alles
                                    </button>
                                </div>
                            </div>

                            {Object.entries(COLUMN_GROUPS).map(
                                ([groupKey, group]) => {
                                    const groupColumns = COLUMNS.filter(
                                        (col) => col.group === groupKey
                                    )
                                    const visibleInGroup = groupColumns.filter(
                                        (col) => visibleColumns.has(col.key)
                                    ).length

                                    return (
                                        <div key={groupKey}>
                                            <div
                                                style={{
                                                    padding: "8px 12px",
                                                    backgroundColor: colors.gray50,
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: colors.gray700,
                                                    display: "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems: "center",
                                                }}
                                            >
                                                <span>{group.label}</span>
                                                <span
                                                    style={{
                                                        fontSize: "11px",
                                                        color: colors.gray500,
                                                    }}
                                                >
                                                    {visibleInGroup}/
                                                    {groupColumns.length}
                                                </span>
                                            </div>
                                            {groupColumns.map((col) => (
                                                <label
                                                    key={col.key}
                                                    style={{
                                                        display: "flex",
                                                        alignItems: "center",
                                                        gap: "8px",
                                                        padding: "6px 20px",
                                                        cursor: "pointer",
                                                        fontSize: "13px",
                                                        fontFamily: FONT_STACK,
                                                        transition:
                                                            "background-color 0.2s",
                                                    }}
                                                    onMouseOver={(e) =>
                                                        (e.currentTarget.style.backgroundColor =
                                                            colors.gray50)
                                                    }
                                                    onMouseOut={(e) =>
                                                        (e.currentTarget.style.backgroundColor =
                                                            "transparent")
                                                    }
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={visibleColumns.has(
                                                            col.key
                                                        )}
                                                        onChange={() =>
                                                            onToggleColumn(
                                                                col.key
                                                            )
                                                        }
                                                        style={{
                                                            cursor: "pointer",
                                                        }}
                                                    />
                                                    {col.label}
                                                </label>
                                            ))}
                                        </div>
                                    )
                                }
                            )}
                        </div>
                    </>,
                    document.body
                )}
        </>
    )
}

// ——— The Main Changelog Override ———
// ——— User Role Detection Functions ———
interface UserInfo {
    sub: string
    role: "admin" | "user" | "editor"
    organization?: string
    organizations?: string[]
}

function getCurrentUserInfo(): UserInfo | null {
    try {
        const token = getIdToken()
        if (!token) return null

        // Decode JWT to get cognito sub
        const payload = JSON.parse(atob(token.split(".")[1]))

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

        const userData = responseData.user || responseData
        return {
            sub: cognitoSub,
            role: userData.role || "user",
            organization: userData.organization,
            organizations: userData.organizations || [],
        }
    } catch (error) {
        console.error("Failed to fetch user info:", error)
        return null
    }
}

export function ChangelogPageOverride(): Override {
    const [changelog, setChangelog] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(COLUMNS.map((col) => col.key))
    )
    const [selectedTableTags, setSelectedTableTags] = useState<Set<string>>(
        new Set()
    )
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [entityInfoCache, setEntityInfoCache] = useState<Map<string, any>>(
        new Map()
    )
    const [loadingEntityInfo, setLoadingEntityInfo] = useState<Set<string>>(
        new Set()
    )
    const [pendingCount, setPendingCount] = useState<number>(0)
    
    // Pagination states
    const [currentPage, setCurrentPage] = useState<number>(0)
    const [pagination, setPagination] = useState<any | null>(null)
    const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)

    const refresh = useCallback(() => {
        fetchChangelog(0, 50)
            .then((response) => {
                setChangelog(response.items)
                setPagination(response.pagination)
                setCurrentPage(0)
            })
            .catch((err) => {
                console.error(err)
                setError(err.message)
            })
    }, [])

    const loadMore = useCallback(async () => {
        if (!pagination?.hasMore || isLoadingMore) return
        
        setIsLoadingMore(true)
        try {
            const nextPage = currentPage + 1
            const response = await fetchChangelog(nextPage, 50)
            
            // Append new items to existing changelog
            setChangelog(prev => [...(prev || []), ...response.items])
            setPagination(response.pagination)
            setCurrentPage(nextPage)
        } catch (err) {
            console.error(err)
            setError(err.message)
        } finally {
            setIsLoadingMore(false)
        }
    }, [currentPage, pagination?.hasMore, isLoadingMore])

    // Initialize user info
    useEffect(() => {
        async function initializeUser() {
            const currentUserInfo = getCurrentUserInfo()
            if (currentUserInfo) {
                const detailedUserInfo = await fetchUserInfo(
                    currentUserInfo.sub
                )
                setUserInfo(detailedUserInfo)
            }
        }
        initializeUser()
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    // Fetch pending count
    useEffect(() => {
        const loadPendingCount = async () => {
            const count = await fetchPendingCount()
            setPendingCount(count)
        }
        loadPendingCount()
    }, [])

    // Build entity history for before/after comparisons
    const entityHistories = React.useMemo(() => {
        if (!changelog) return new Map()
        return buildEntityHistory(changelog)
    }, [changelog])

    // Filter changelog
    const filteredChangelog =
        changelog?.filter((item) => {
            // Text search
            if (searchTerm) {
                const searchLower = searchTerm.toLowerCase()
                const matchesSearch = [
                    item.lastUpdatedBy,
                    item.action,
                    item.sourceTableName,
                    item.sourceTableTag,
                    item.entityId,
                ].some((value) =>
                    String(value).toLowerCase().includes(searchLower)
                )

                if (!matchesSearch) return false
            }

            // Table tag filter
            if (
                selectedTableTags.size > 0 &&
                !selectedTableTags.has(item.sourceTableTag)
            ) {
                return false
            }

            return true
        }) || []

    // Fetch entity info for visible changelog entries
    useEffect(() => {
        if (!changelog || !filteredChangelog) return

        const fetchEntityInfoForEntries = async () => {
            const entriesToFetch = filteredChangelog
                .slice(0, 50) // Only fetch for first 50 visible entries to avoid overwhelming the API
                .filter(
                    (item) =>
                        item.entityId &&
                        item.sourceTableTag &&
                        !entityInfoCache.has(item.entityId) &&
                        !loadingEntityInfo.has(item.entityId)
                )

            if (entriesToFetch.length === 0) return

            // Mark as loading
            setLoadingEntityInfo((prev) => {
                const newSet = new Set(prev)
                entriesToFetch.forEach((item) => newSet.add(item.entityId))
                return newSet
            })

            // Fetch entity info for each entry
            const promises = entriesToFetch.map(async (item) => {
                try {
                    const entityInfo = await fetchEntityInfo(
                        item.entityId,
                        item.sourceTableTag,
                        item.changes
                    )
                    return { entityId: item.entityId, entityInfo }
                } catch (error) {
                    console.warn(
                        `Failed to fetch entity info for ${item.entityId}:`,
                        error
                    )
                    return {
                        entityId: item.entityId,
                        entityInfo: {
                            displayName: `${item.sourceTableTag} ${item.entityId.slice(-8)}`,
                            organization: "",
                            icon: <FaClipboardList />,
                        },
                    }
                }
            })

            const results = await Promise.all(promises)

            // Update cache
            setEntityInfoCache((prev) => {
                const newMap = new Map(prev)
                results.forEach(({ entityId, entityInfo }) => {
                    if (entityInfo) {
                        newMap.set(entityId, entityInfo)
                    }
                })
                return newMap
            })

            // Remove from loading set
            setLoadingEntityInfo((prev) => {
                const newSet = new Set(prev)
                entriesToFetch.forEach((item) => newSet.delete(item.entityId))
                return newSet
            })
        }

        fetchEntityInfoForEntries()
    }, [
        changelog,
        filteredChangelog,
        selectedTableTags,
        searchTerm,
        entityInfoCache.size,
    ]) // Re-run when filters change or cache size changes

    // Get available table tags
    const availableTableTags = Array.from(
        new Set(
            changelog?.map((item) => item.sourceTableTag).filter(Boolean) || []
        )
    ).sort()

    const toggleColumn = (columnKey: string) => {
        setVisibleColumns((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(columnKey)) {
                newSet.delete(columnKey)
            } else {
                newSet.add(columnKey)
            }
            return newSet
        })
    }

    const toggleTableTag = (tag: string) => {
        setSelectedTableTags((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(tag)) {
                newSet.delete(tag)
            } else {
                newSet.add(tag)
            }
            return newSet
        })
    }

    const toggleRowExpansion = (rowId: string) => {
        setExpandedRows((prev) => {
            const newSet = new Set(prev)
            if (newSet.has(rowId)) {
                newSet.delete(rowId)
            } else {
                newSet.add(rowId)
            }
            return newSet
        })
    }

    if (changelog === null) {
        return {
            children: (
                <div
                    style={{
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        height: "200px",
                        fontSize: "16px",
                        color: colors.gray500,
                        fontFamily: FONT_STACK,
                    }}
                >
                    Wijzigingslogboek laden...
                </div>
            ),
        }
    }

    if (error) {
        return {
            children: (
                <div
                    style={{
                        padding: "24px",
                        backgroundColor: "#fef2f2",
                        border: "1px solid #fecaca",
                        borderRadius: "8px",
                        color: colors.error,
                        fontFamily: FONT_STACK,
                    }}
                >
                    Fout: {error}
                </div>
            ),
        }
    }

    const visibleColumnsList = COLUMNS.filter((col) =>
        visibleColumns.has(col.key)
    )

    return {
        children: (
            <div
                style={{
                    padding: "24px",
                    backgroundColor: colors.gray50,
                    height: "100vh",
                    fontFamily: FONT_STACK,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <div
                    style={{
                        backgroundColor: colors.white,
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        overflow: "hidden",
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                    }}
                >
                    {/* Enhanced Navigation Tabs at Top */}
                    <div
                        style={{
                            padding: "20px 24px",
                            backgroundColor: colors.gray50,
                            borderBottom: `1px solid ${colors.gray200}`,
                            display: "flex",
                            gap: "8px",
                            overflowX: "auto",
                            alignItems: "center",
                        }}
                    >
                        {[
                            {
                                key: "organizations",
                                label: "Organisaties",
                                icon: FaBuilding,
                                href: "/organizations",
                            },
                            {
                                key: "policies",
                                label: "Polissen",
                                icon: FaFileContract,
                                href: "/policies",
                            },
                            {
                                key: "pending",
                                label: "Pending Items",
                                icon: FaClock,
                                href: "/pending_overview",
                            },
                            {
                                key: "users",
                                label: "Gebruikers",
                                icon: FaUsers,
                                href: "/users",
                            },
                            {
                                key: "changelog",
                                label: "Wijzigingslogboek",
                                icon: FaClipboardList,
                                href: "/changelog",
                            },
                        ]
                            .filter((tab) => {
                                // Hide pending, users, and changelog tabs for regular users
                                if (
                                    userInfo?.role === "user" &&
                                    (tab.key === "pending" ||
                                        tab.key === "users" ||
                                        tab.key === "changelog")
                                ) {
                                    return false
                                }
                                return true
                            })
                            .map((tab) => {
                                const isActive = tab.key === "changelog"
                                const Icon = tab.icon

                                return (
                                    <button
                                        key={tab.key}
                                        onClick={() => {
                                            if (!isActive) {
                                                window.location.href = tab.href
                                            }
                                        }}
                                        style={{
                                            padding: "16px 24px",
                                            backgroundColor: isActive
                                                ? colors.primary
                                                : colors.white,
                                            color: isActive
                                                ? "white"
                                                : colors.gray500,
                                            border: isActive
                                                ? "none"
                                                : "2px solid #e5e7eb",
                                            borderRadius: "12px",
                                            fontSize: "15px",
                                            fontWeight: "600",
                                            cursor: isActive
                                                ? "default"
                                                : "pointer",
                                            fontFamily: FONT_STACK,
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "8px",
                                            transition: "all 0.2s",
                                            minHeight: "48px",
                                            boxShadow: isActive
                                                ? "0 2px 8px rgba(59, 130, 246, 0.15)"
                                                : "0 2px 4px rgba(0,0,0,0.05)",
                                            transform: isActive
                                                ? "translateY(-1px)"
                                                : "none",
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isActive) {
                                                const target =
                                                    e.target as HTMLElement
                                                target.style.backgroundColor =
                                                    "#f8fafc"
                                                target.style.borderColor =
                                                    colors.primary
                                                target.style.color = colors.primary
                                                target.style.transform =
                                                    "translateY(-1px)"
                                                target.style.boxShadow =
                                                    "0 4px 12px rgba(59, 130, 246, 0.15)"
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isActive) {
                                                const target =
                                                    e.target as HTMLElement
                                                target.style.backgroundColor =
                                                    colors.white
                                                target.style.borderColor =
                                                    colors.gray200
                                                target.style.color = colors.gray500
                                                target.style.transform = "none"
                                                target.style.boxShadow =
                                                    "0 2px 4px rgba(0,0,0,0.05)"
                                            }
                                        }}
                                    >
                                        <Icon size={14} />
                                        {tab.label}
                                        {/* Pending count badge */}
                                        {tab.key === "pending" &&
                                            pendingCount > 0 && (
                                                <span
                                                    style={{
                                                        backgroundColor:
                                                            isActive
                                                                ? "rgba(255,255,255,0.3)"
                                                                : colors.error,
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
                                )
                            })}
                    </div>
                    <div
                        style={{
                            padding: "24px",
                            borderBottom: `1px solid ${colors.gray200}`,
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: "20px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "16px",
                                }}
                            >
                                <h1
                                    style={{
                                        fontSize: "28px",
                                        fontWeight: "700",
                                        color: "#1f2937",
                                        margin: 0,
                                    }}
                                >
                                    Changelog
                                </h1>
                            </div>
                            <div
                                style={{
                                    fontSize: "14px",
                                    color: colors.gray500,
                                    backgroundColor: colors.gray100,
                                    padding: "6px 12px",
                                    borderRadius: "6px",
                                }}
                            >
                                {filteredChangelog.length} wijzigingen
                            </div>
                        </div>

                        <ChangelogSearchAndFilterBar
                            searchTerm={searchTerm}
                            onSearchChange={setSearchTerm}
                            visibleColumns={visibleColumns}
                            onToggleColumn={toggleColumn}
                            selectedTableTags={selectedTableTags}
                            onTableTagChange={toggleTableTag}
                            availableTableTags={availableTableTags}
                        />
                    </div>

                    <div
                        style={{
                            overflowX: "auto",
                            overflowY: "auto",
                            flex: 1,
                            position: "relative",
                        }}
                    >
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: "14px",
                                minWidth: "800px",
                            }}
                        >
                            <thead
                                style={{
                                    position: "sticky",
                                    top: 0,
                                    backgroundColor: colors.gray50,
                                    zIndex: 10,
                                }}
                            >
                                <tr>
                                    {visibleColumnsList.map((col) => (
                                        <th
                                            key={col.key}
                                            style={{
                                                textAlign: "left",
                                                padding: "12px 8px",
                                                borderBottom:
                                                    "2px solid #e5e7eb",
                                                fontWeight: "600",
                                                color: colors.gray700,
                                                width: col.width || "auto",
                                                minWidth: "80px",
                                                fontSize: "13px",
                                                lineHeight: "1.2",
                                            }}
                                        >
                                            {col.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredChangelog.map((item, index) => {
                                    const isExpanded = expandedRows.has(item.id)

                                    // Calculate previous state for this entry
                                    const entityHistory =
                                        entityHistories.get(item.entityId) || []
                                    const entryIndex = entityHistory.findIndex(
                                        (entry) => entry.id === item.id
                                    )
                                    const previousState =
                                        getPreviousEntityState(
                                            entityHistory,
                                            entryIndex,
                                            item.changes
                                        )

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr
                                                style={{
                                                    backgroundColor:
                                                        index % 2 === 0
                                                            ? colors.white
                                                            : "#f8fafc",
                                                    transition:
                                                        "background-color 0.2s",
                                                }}
                                                onMouseOver={(e) =>
                                                    (e.currentTarget.style.backgroundColor =
                                                        "#f1f5f9")
                                                }
                                                onMouseOut={(e) =>
                                                    (e.currentTarget.style.backgroundColor =
                                                        index % 2 === 0
                                                            ? colors.white
                                                            : "#f8fafc")
                                                }
                                            >
                                                {visibleColumnsList.map(
                                                    (col) => {
                                                        const cellValue =
                                                            item[col.key]
                                                        let displayValue: React.ReactNode

                                                        // Debug: Log which condition is being checked for entityInfo column
                                                        if (
                                                            col.key ===
                                                                "entityInfo" &&
                                                            index === 0
                                                        ) {
                                                            console.log(
                                                                "Processing entityInfo column, cellValue:",
                                                                cellValue
                                                            )
                                                            console.log(
                                                                "cellValue == null?",
                                                                cellValue ==
                                                                    null
                                                            )
                                                        }

                                                        // Handle entityInfo column first (before null check)
                                                        if (
                                                            col.key ===
                                                            "entityInfo"
                                                        ) {
                                                            const entityInfo =
                                                                entityInfoCache.get(
                                                                    item.entityId
                                                                )
                                                            const isLoading =
                                                                loadingEntityInfo.has(
                                                                    item.entityId
                                                                )

                                                            if (isLoading) {
                                                                displayValue = (
                                                                    <div
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: "8px",
                                                                            color: colors.gray500,
                                                                        }}
                                                                    >
                                                                        <div
                                                                            style={{
                                                                                width: "16px",
                                                                                height: "16px",
                                                                                border: "2px solid #e5e7eb",
                                                                                borderTop:
                                                                                    `2px solid ${colors.primary}`,
                                                                                borderRadius:
                                                                                    "50%",
                                                                                animation:
                                                                                    "spin 1s linear infinite",
                                                                            }}
                                                                        />
                                                                        <span
                                                                            style={{
                                                                                fontSize:
                                                                                    "12px",
                                                                            }}
                                                                        >
                                                                            Laden...
                                                                        </span>
                                                                    </div>
                                                                )
                                                            } else if (
                                                                entityInfo
                                                            ) {
                                                                displayValue = (
                                                                    <div
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: "8px",
                                                                        }}
                                                                    >
                                                                        {
                                                                            entityInfo.icon
                                                                        }
                                                                        <div>
                                                                            <div
                                                                                style={{
                                                                                    fontWeight:
                                                                                        "500",
                                                                                    color: colors.gray700,
                                                                                    fontSize:
                                                                                        "13px",
                                                                                }}
                                                                            >
                                                                                {
                                                                                    entityInfo.displayName
                                                                                }
                                                                            </div>
                                                                            {entityInfo.organization && (
                                                                                <div
                                                                                    style={{
                                                                                        fontSize:
                                                                                            "11px",
                                                                                        color: colors.gray500,
                                                                                        marginTop:
                                                                                            "2px",
                                                                                    }}
                                                                                >
                                                                                    <FaBuilding
                                                                                        style={{
                                                                                            fontSize:
                                                                                                "10px",
                                                                                            marginRight:
                                                                                                "4px",
                                                                                        }}
                                                                                    />
                                                                                    {
                                                                                        entityInfo.organization
                                                                                    }
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                )
                                                            } else {
                                                                // Fallback display
                                                                displayValue = (
                                                                    <div
                                                                        style={{
                                                                            display:
                                                                                "flex",
                                                                            alignItems:
                                                                                "center",
                                                                            gap: "8px",
                                                                            color: colors.gray500,
                                                                        }}
                                                                    >
                                                                        <FaClipboardList
                                                                            style={{
                                                                                fontSize:
                                                                                    "14px",
                                                                            }}
                                                                        />
                                                                        <span
                                                                            style={{
                                                                                fontSize:
                                                                                    "12px",
                                                                            }}
                                                                        >
                                                                            {
                                                                                item.sourceTableTag
                                                                            }{" "}
                                                                            {item.entityId.slice(
                                                                                -8
                                                                            )}
                                                                        </span>
                                                                    </div>
                                                                )
                                                            }
                                                        } else if (
                                                            cellValue == null
                                                        ) {
                                                            displayValue = (
                                                                <span
                                                                    style={{
                                                                        color: "#9ca3af",
                                                                    }}
                                                                >
                                                                    -
                                                                </span>
                                                            )
                                                        } else if (
                                                            col.key === "action"
                                                        ) {
                                                            const actionStyle =
                                                                getActionStyle(
                                                                    cellValue
                                                                )
                                                            displayValue = (
                                                                <span
                                                                    style={{
                                                                        ...actionStyle,
                                                                        padding:
                                                                            "4px 8px",
                                                                        borderRadius:
                                                                            "12px",
                                                                        fontSize:
                                                                            "12px",
                                                                        fontWeight:
                                                                            "500",
                                                                        textTransform:
                                                                            "uppercase",
                                                                    }}
                                                                >
                                                                    {cellValue}
                                                                </span>
                                                            )
                                                        } else if (
                                                            col.key ===
                                                            "timestamp"
                                                        ) {
                                                            displayValue = (
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: "6px",
                                                                    }}
                                                                >
                                                                    <FaClock
                                                                        style={{
                                                                            color: colors.gray500,
                                                                            fontSize:
                                                                                "12px",
                                                                        }}
                                                                    />
                                                                    <span
                                                                        title={(() => {
                                                                            const dateValue =
                                                                                new Date(
                                                                                    cellValue
                                                                                )
                                                                            dateValue.setHours(
                                                                                dateValue.getHours() +
                                                                                    2
                                                                            )
                                                                            return dateValue.toLocaleString(
                                                                                "nl-NL"
                                                                            )
                                                                        })()}
                                                                    >
                                                                        {getRelativeTime(
                                                                            cellValue
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )
                                                        } else if (
                                                            col.key ===
                                                            "lastUpdatedBy"
                                                        ) {
                                                            displayValue = (
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: "6px",
                                                                    }}
                                                                >
                                                                    <FaUser
                                                                        style={{
                                                                            color: colors.gray500,
                                                                            fontSize:
                                                                                "12px",
                                                                        }}
                                                                    />
                                                                    {cellValue}
                                                                </div>
                                                            )
                                                        } else if (
                                                            col.key ===
                                                            "sourceTableName"
                                                        ) {
                                                            displayValue = (
                                                                <div
                                                                    style={{
                                                                        display:
                                                                            "flex",
                                                                        alignItems:
                                                                            "center",
                                                                        gap: "8px",
                                                                    }}
                                                                >
                                                                    <FaDatabase
                                                                        style={{
                                                                            color: colors.gray500,
                                                                            fontSize:
                                                                                "14px",
                                                                        }}
                                                                    />
                                                                    <div>
                                                                        <div
                                                                            style={{
                                                                                fontWeight:
                                                                                    "500",
                                                                                color: colors.gray700,
                                                                            }}
                                                                        >
                                                                            {getTableDisplayName(
                                                                                item.sourceTableTag
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )
                                                        } else if (
                                                            col.key ===
                                                            "changes"
                                                        ) {
                                                            displayValue = (
                                                                <ExpandableChanges
                                                                    changes={
                                                                        item.changes
                                                                    }
                                                                    action={
                                                                        item.action
                                                                    }
                                                                    isExpanded={
                                                                        isExpanded
                                                                    }
                                                                    onToggle={() =>
                                                                        toggleRowExpansion(
                                                                            item.id
                                                                        )
                                                                    }
                                                                    previousState={
                                                                        previousState
                                                                    }
                                                                />
                                                            )
                                                        } else {
                                                            displayValue =
                                                                String(
                                                                    cellValue
                                                                )
                                                        }

                                                        return (
                                                            <td
                                                                key={col.key}
                                                                style={{
                                                                    padding:
                                                                        "12px 8px",
                                                                    borderBottom:
                                                                        "1px solid #f1f5f9",
                                                                    color: colors.gray700,
                                                                    fontSize:
                                                                        "13px",
                                                                    lineHeight:
                                                                        "1.3",
                                                                    wordBreak:
                                                                        "break-word",
                                                                    whiteSpace:
                                                                        "normal",
                                                                    verticalAlign:
                                                                        "top",
                                                                }}
                                                            >
                                                                {displayValue}
                                                            </td>
                                                        )
                                                    }
                                                )}
                                            </tr>
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {pagination && (
                        <div
                            style={{
                                padding: "20px 24px",
                                backgroundColor: colors.gray50,
                                borderTop: `1px solid ${colors.gray200}`,
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                flexWrap: "wrap",
                                gap: "12px",
                            }}
                        >
                            <div
                                style={{
                                    color: colors.gray500,
                                    fontSize: "14px",
                                    fontFamily: FONT_STACK,
                                }}
                            >
                                Toont {Math.min(pagination.pageSize * (pagination.page + 1), pagination.totalItems)} van {pagination.totalItems} wijzigingen
                                {pagination.page > 0 && ` (Pagina ${pagination.page + 1} van ${pagination.totalPages})`}
                            </div>
                            
                            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                {pagination.hasMore && (
                                    <button
                                        onClick={loadMore}
                                        disabled={isLoadingMore}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: isLoadingMore ? colors.gray100 : colors.primary,
                                            color: isLoadingMore ? "#9ca3af" : colors.white,
                                            border: "none",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            fontFamily: FONT_STACK,
                                            cursor: isLoadingMore ? "not-allowed" : "pointer",
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "6px",
                                            transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            if (!isLoadingMore) {
                                                e.currentTarget.style.backgroundColor = colors.primaryHover
                                            }
                                        }}
                                        onMouseLeave={(e) => {
                                            if (!isLoadingMore) {
                                                e.currentTarget.style.backgroundColor = colors.primary
                                            }
                                        }}
                                    >
                                        {isLoadingMore ? (
                                            <>
                                                <div
                                                    style={{
                                                        width: "16px",
                                                        height: "16px",
                                                        border: "2px solid #d1d5db",
                                                        borderTop: "2px solid #9ca3af",
                                                        borderRadius: "50%",
                                                        animation: "spin 1s linear infinite",
                                                    }}
                                                />
                                                Laden...
                                            </>
                                        ) : (
                                            <>
                                                Meer laden ({Math.min(50, pagination.totalItems - (pagination.page + 1) * pagination.pageSize)} meer)
                                            </>
                                        )}
                                    </button>
                                )}
                                
                                {currentPage > 0 && (
                                    <button
                                        onClick={refresh}
                                        style={{
                                            padding: "8px 16px",
                                            backgroundColor: colors.white,
                                            color: colors.gray700,
                                            border: "1px solid #d1d5db",
                                            borderRadius: "6px",
                                            fontSize: "14px",
                                            fontWeight: "500",
                                            fontFamily: FONT_STACK,
                                            cursor: "pointer",
                                            transition: "all 0.2s ease",
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor = colors.gray50
                                            e.currentTarget.style.borderColor = "#9ca3af"
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor = colors.white
                                            e.currentTarget.style.borderColor = colors.gray300
                                        }}
                                    >
                                        Terug naar start
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        ),
    }
}

// Additional exports for Framer compatibility
export function ChangelogApp(): Override {
    return ChangelogPageOverride()
}

export default ChangelogPageOverride
