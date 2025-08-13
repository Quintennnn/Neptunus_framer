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
} from "react-icons/fa"

// ——— Constants & Helpers ———
const API_BASE_URL = "https://dev.api.hienfeld.io"
const CHANGELOG_PATH = "/neptunus/changelog"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

async function fetchChangelog(): Promise<any[]> {
    const token = getIdToken()
    const headers: Record<string, string> = {
        "Content-Type": "application/json",
    }
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${API_BASE_URL}${CHANGELOG_PATH}`, {
        method: "GET",
        headers,
        mode: "cors",
    })
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
    const json = await res.json()
    return json.items || json.data || json
}

// ——— Time Helpers ———
function getRelativeTime(timestamp: string): string {
    const now = new Date()
    const changeTime = new Date(timestamp)
    
    // Handle potential timezone issues by ensuring we're comparing UTC times
    const nowUTC = new Date(now.getTime() + (now.getTimezoneOffset() * 60000))
    const changeTimeUTC = new Date(changeTime.getTime() + (changeTime.getTimezoneOffset() * 60000))
    
    const diffMs = nowUTC.getTime() - changeTimeUTC.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffSeconds < 60) return "Just now"
    if (diffMinutes < 60) return `${diffMinutes}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`

    return changeTime.toLocaleDateString()
}

// ——— Action Styling Helper ———
function getActionStyle(action: string) {
    switch (action?.toUpperCase()) {
        case "CREATE":
            return {
                backgroundColor: "#ecfdf5",
                color: "#059669",
                border: "1px solid #a7f3d0",
            }
        case "UPDATE":
            return {
                backgroundColor: "#fefce8",
                color: "#ca8a04",
                border: "1px solid #fde68a",
            }
        case "DELETE":
            return {
                backgroundColor: "#fef2f2",
                color: "#dc2626",
                border: "1px solid #fecaca",
            }
        default:
            return {
                backgroundColor: "#f9fafb",
                color: "#6b7280",
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
            return new Date(value).toLocaleString()
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
        if (keys.length > 5 && keys.every(key => 
            typeof value[key] === "object" && 
            value[key] && 
            ("required" in value[key] || "visible" in value[key])
        )) {
            const requiredFields = keys.filter(key => value[key]?.required === true)
            const visibleFields = keys.filter(key => value[key]?.visible === true)
            
            let summary = `Configuration for ${keys.length} fields`
            if (requiredFields.length > 0) {
                summary += ` • Required: ${requiredFields.join(", ")}`
            }
            if (visibleFields.length > 0 && visibleFields.length !== requiredFields.length) {
                summary += ` • Visible: ${visibleFields.join(", ")}`
            }
            return summary
        }
        
        if (keys.length <= 3) {
            return keys.map(key => `${key}: ${formatChangeValue(value[key])}`).join(", ")
        }
        return `${keys.slice(0, 3).map(key => `${key}: ${formatChangeValue(value[key])}`).join(", ")} ... (+${keys.length - 3} more fields)`
    }

    return String(value)
}

// ——— Column Definitions ———
type ColumnKey =
    | "timestamp"
    | "action"
    | "sourceTableName"
    | "lastUpdatedBy"
    | "entityId"
    | "changes"

const COLUMN_GROUPS = {
    essential: { label: "Essential", priority: 1 },
    additional: { label: "Additional", priority: 2 },
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
        label: "When",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "action",
        label: "Action",
        priority: 1,
        group: "essential",
        width: "100px",
    },
    {
        key: "sourceTableName",
        label: "Table",
        priority: 1,
        group: "essential",
        width: "180px",
    },
    {
        key: "lastUpdatedBy",
        label: "Modified By",
        priority: 1,
        group: "essential",
        width: "160px",
    },
    {
        key: "entityId",
        label: "Entity ID",
        priority: 2,
        group: "additional",
        width: "120px",
    },
    {
        key: "changes",
        label: "Changes",
        priority: 2,
        group: "additional",
        width: "100px",
    },
]

// ——— Expandable Changes Component ———
function ExpandableChanges({
    changes,
    isExpanded,
    onToggle,
}: {
    changes: any
    isExpanded: boolean
    onToggle: () => void
}) {
    const changesCount = Object.keys(changes || {}).length

    return (
        <div>
            <button
                onClick={onToggle}
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "4px 8px",
                    backgroundColor: "#f3f4f6",
                    border: "none",
                    borderRadius: "6px",
                    fontSize: "12px",
                    fontWeight: "500",
                    cursor: "pointer",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                    color: "#374151",
                }}
                onMouseOver={(e) =>
                    ((e.target as HTMLElement).style.backgroundColor = "#e5e7eb")
                }
                onMouseOut={(e) => ((e.target as HTMLElement).style.backgroundColor = "#f3f4f6")}
            >
                {isExpanded ? (
                    <FaChevronDown size={10} />
                ) : (
                    <FaChevronRight size={10} />
                )}
                {changesCount} field{changesCount !== 1 ? "s" : ""}
            </button>

            {isExpanded && (
                <div
                    style={{
                        marginTop: "8px",
                        padding: "12px",
                        backgroundColor: "#f8fafc",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        fontSize: "12px",
                        fontFamily:
                            "monaco, 'Cascadia Code', 'Roboto Mono', monospace",
                    }}
                >
                    {Object.entries(changes || {}).map(
                        ([key, value]: [string, any]) => {
                            const formattedValue = formatDynamoDBValue(value)
                            const displayValue = formatChangeValue(formattedValue)
                            
                            return (
                                <div
                                    key={key}
                                    style={{
                                        marginBottom: "8px",
                                        wordBreak: "break-word",
                                        padding: "8px",
                                        backgroundColor: "#ffffff",
                                        borderRadius: "4px",
                                        border: "1px solid #e5e7eb",
                                    }}
                                >
                                    <div
                                        style={{
                                            fontWeight: "600",
                                            color: "#374151",
                                            marginBottom: "4px",
                                            fontSize: "13px",
                                            fontFamily: FONT_STACK,
                                        }}
                                    >
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </div>
                                    <div 
                                        style={{ 
                                            color: "#6b7280",
                                            fontFamily: FONT_STACK,
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
                            color: "#6b7280",
                            fontSize: "14px",
                        }}
                    />
                    <input
                        type="text"
                        placeholder="Search changelog..."
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
                            (e.target.style.borderColor = "#3b82f6")
                        }
                        onBlur={(e) => (e.target.style.borderColor = "#d1d5db")}
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
                                    ? "#3b82f6"
                                    : "#f3f4f6",
                            color:
                                selectedTableTags.size > 0
                                    ? "white"
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
                            transition: "all 0.2s",
                        }}
                    >
                        <FaDatabase /> Tables ({selectedTableTags.size})
                    </button>
                </div>

                <div style={{ position: "relative" }}>
                    <button
                        ref={setButtonRef}
                        onClick={() => setShowColumnFilter(!showColumnFilter)}
                        style={{
                            padding: "12px 16px",
                            backgroundColor: "#f3f4f6",
                            color: "#374151",
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
                            ((e.target as HTMLElement).style.backgroundColor = "#e5e7eb")
                        }
                        onMouseOut={(e) =>
                            ((e.target as HTMLElement).style.backgroundColor = "#f3f4f6")
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
                                borderRadius: "8px",
                                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                                zIndex: 1000,
                                minWidth: "200px",
                                maxHeight: "300px",
                                overflowY: "auto",
                            }}
                        >
                            <div
                                style={{
                                    padding: "12px",
                                    borderBottom: "1px solid #e5e7eb",
                                }}
                            >
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
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            backgroundColor: "#f3f4f6",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => {
                                            selectedTableTags.forEach((tag) =>
                                                onTableTagChange(tag)
                                            )
                                        }}
                                        style={{
                                            padding: "4px 8px",
                                            fontSize: "12px",
                                            backgroundColor: "#f3f4f6",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {availableTableTags.map((tag) => (
                                <label
                                    key={tag}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 16px",
                                        cursor: "pointer",
                                        fontSize: "13px",
                                        fontFamily: FONT_STACK,
                                        transition: "background-color 0.2s",
                                    }}
                                    onMouseOver={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            "#f9fafb")
                                    }
                                    onMouseOut={(e) =>
                                        (e.currentTarget.style.backgroundColor =
                                            "transparent")
                                    }
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedTableTags.has(tag)}
                                        onChange={() => onTableTagChange(tag)}
                                        style={{
                                            cursor: "pointer",
                                            accentColor: "#3b82f6",
                                        }}
                                    />
                                    {tag}
                                </label>
                            ))}
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
                                    borderBottom: "1px solid #e5e7eb",
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
                                            backgroundColor: "#f3f4f6",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Essential Only
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
                                            backgroundColor: "#f3f4f6",
                                            border: "none",
                                            borderRadius: "4px",
                                            cursor: "pointer",
                                        }}
                                    >
                                        Show All
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
                                                    backgroundColor: "#f8fafc",
                                                    fontSize: "12px",
                                                    fontWeight: "600",
                                                    color: "#374151",
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
                                                        color: "#6b7280",
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
                                                            "#f9fafb")
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
export function ChangelogPageOverride(): Override {
    const [changelog, setChangelog] = useState<any[] | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
        new Set(COLUMNS.map((col) => col.key))
    )
    const [selectedTableTags, setSelectedTableTags] = useState<Set<string>>(
        new Set()
    )
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    const refresh = useCallback(() => {
        fetchChangelog()
            .then(setChangelog)
            .catch((err) => {
                console.error(err)
                setError(err.message)
            })
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    // Get available table tags
    const availableTableTags = Array.from(
        new Set(
            changelog?.map((item) => item.sourceTableTag).filter(Boolean) || []
        )
    ).sort()

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
                        color: "#6b7280",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Loading changelog...
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
                        color: "#dc2626",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Error: {error}
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
                    backgroundColor: "#f8fafc",
                    minHeight: "100vh",
                    fontFamily: FONT_STACK,
                }}
            >
                <div
                    style={{
                        backgroundColor: "#fff",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                        overflow: "hidden",
                    }}
                >
                    {/* Navigation Tabs at Top */}
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
                        {[
                            { key: "organizations", label: "Organisaties", icon: FaBuilding, href: "/organizations" },
                            { key: "policies", label: "Polissen", icon: FaFileContract, href: "/policies" },
                            { key: "users", label: "Gebruikers", icon: FaUsers, href: "/users" },
                            { key: "changelog", label: "Wijzigingslogboek", icon: FaClipboardList, href: "/changelog" }
                        ].map((tab) => {
                            const isActive = tab.key === "changelog"
                            const Icon = tab.icon
                            
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => {
                                        window.location.href = tab.href
                                    }}
                                    style={{
                                        padding: "8px 16px",
                                        backgroundColor: isActive ? "#3b82f6" : "transparent",
                                        color: isActive ? "white" : "#6b7280",
                                        border: isActive ? "none" : "1px solid #d1d5db",
                                        borderRadius: "6px",
                                        fontSize: "13px",
                                        fontWeight: isActive ? "600" : "500",
                                        cursor: isActive ? "default" : "pointer",
                                        fontFamily: FONT_STACK,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "6px",
                                        transition: "all 0.2s",
                                    }}
                                    onMouseOver={(e) => {
                                        if (!isActive) {
                                            e.target.style.backgroundColor = "#f3f4f6"
                                            e.target.style.color = "#374151"
                                        }
                                    }}
                                    onMouseOut={(e) => {
                                        if (!isActive) {
                                            e.target.style.backgroundColor = "transparent"
                                            e.target.style.color = "#6b7280"
                                        }
                                    }}
                                >
                                    <Icon size={12} />
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                    <div
                        style={{
                            padding: "24px",
                            borderBottom: "1px solid #e5e7eb",
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
                                    color: "#6b7280",
                                    backgroundColor: "#f3f4f6",
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
                            maxHeight: "70vh",
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
                                    backgroundColor: "#f8fafc",
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
                                                color: "#374151",
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

                                    return (
                                        <React.Fragment key={item.id}>
                                            <tr
                                                style={{
                                                    backgroundColor:
                                                        index % 2 === 0
                                                            ? "#ffffff"
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
                                                            ? "#ffffff"
                                                            : "#f8fafc")
                                                }
                                            >
                                                {visibleColumnsList.map(
                                                    (col) => {
                                                        const cellValue =
                                                            item[col.key]
                                                        let displayValue: React.ReactNode

                                                        if (cellValue == null) {
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
                                                                            color: "#6b7280",
                                                                            fontSize:
                                                                                "12px",
                                                                        }}
                                                                    />
                                                                    <span
                                                                        title={new Date(
                                                                            cellValue
                                                                        ).toLocaleString()}
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
                                                                            color: "#6b7280",
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
                                                                <div>
                                                                    <div
                                                                        style={{
                                                                            fontWeight:
                                                                                "500",
                                                                        }}
                                                                    >
                                                                        {
                                                                            cellValue
                                                                        }
                                                                    </div>
                                                                    <div
                                                                        style={{
                                                                            fontSize:
                                                                                "11px",
                                                                            color: "#6b7280",
                                                                        }}
                                                                    >
                                                                        {
                                                                            item.sourceTableTag
                                                                        }
                                                                    </div>
                                                                </div>
                                                            )
                                                        } else if (
                                                            col.key ===
                                                            "entityId"
                                                        ) {
                                                            displayValue = (
                                                                <code
                                                                    style={{
                                                                        fontSize:
                                                                            "11px",
                                                                        fontFamily:
                                                                            "monaco, 'Cascadia Code', 'Roboto Mono', monospace",
                                                                        backgroundColor:
                                                                            "#f3f4f6",
                                                                        padding:
                                                                            "2px 4px",
                                                                        borderRadius:
                                                                            "3px",
                                                                        color: "#374151",
                                                                    }}
                                                                >
                                                                    {String(
                                                                        cellValue
                                                                    ).substring(
                                                                        0,
                                                                        8
                                                                    )}
                                                                    ...
                                                                </code>
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
                                                                    isExpanded={
                                                                        isExpanded
                                                                    }
                                                                    onToggle={() =>
                                                                        toggleRowExpansion(
                                                                            item.id
                                                                        )
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
                                                                    color: "#374151",
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
