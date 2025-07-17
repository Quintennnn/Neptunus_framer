// boats/shared/boat_table_components.tsx - Shared components for boat table functionality
import * as React from "react"
import * as ReactDOM from "react-dom"
import { useState, useEffect } from "react"
import {
    FaEdit,
    FaTrashAlt,
    FaSearch,
    FaFilter,
    FaCheck,
    FaTimes,
    FaBuilding,
} from "react-icons/fa"

// Enhanced font stack for better typography
const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

// Status color mapping
const STATUS_COLORS = {
    Insured: { bg: "#dcfce7", text: "#166534" },
    Pending: { bg: "#fef3c7", text: "#92400e" },
    "Not Insured": { bg: "#fee2e2", text: "#991b1b" },
    "Out of stock": { bg: "#f3f4f6", text: "#374151" },
}

// Column definitions and types
type ColumnKey =
    | "boatNumber"
    | "insuranceStartDate"
    | "insuranceEndDate"
    | "boatBrand"
    | "engineType"
    | "boatType"
    | "yearOfConstruction"
    | "numberOfEngines"
    | "engineNumber"
    | "cinNumber"
    | "mooringLocation"
    | "organization"
    | "premiumPerMille"
    | "deductible"
    | "numberOfInsuredDays"
    | "totalAnnualPremium"
    | "totalPremiumForInsuredPeriod"
    | "value"
    | "status"
    | "notes"
    | "createdAt"
    | "updatedAt"

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
    // Essential columns - Status is first and always visible by default
    {
        key: "status",
        label: "Status",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "boatNumber",
        label: "Boat #",
        priority: 1,
        group: "essential",
        width: "80px",
    },
    {
        key: "boatBrand",
        label: "Brand",
        priority: 1,
        group: "essential",
        width: "120px",
    },
    {
        key: "boatType",
        label: "Type",
        priority: 1,
        group: "essential",
        width: "100px",
    },
    {
        key: "value",
        label: "Value",
        priority: 1,
        group: "essential",
        width: "100px",
    },

    // All other columns moved to "Additional" group
    {
        key: "insuranceStartDate",
        label: "Start",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "insuranceEndDate",
        label: "End",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "deductible",
        label: "Deductible",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "numberOfInsuredDays",
        label: "Days",
        priority: 2,
        group: "additional",
        width: "70px",
    },
    {
        key: "organization",
        label: "Organization",
        priority: 2,
        group: "additional",
        width: "120px",
    },
    {
        key: "engineType",
        label: "Engine",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "yearOfConstruction",
        label: "Year",
        priority: 2,
        group: "additional",
        width: "60px",
    },
    {
        key: "numberOfEngines",
        label: "#Eng",
        priority: 2,
        group: "additional",
        width: "50px",
    },
    {
        key: "engineNumber",
        label: "Engine #",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "cinNumber",
        label: "CIN #",
        priority: 2,
        group: "additional",
        width: "100px",
    },
    {
        key: "mooringLocation",
        label: "Mooring Location",
        priority: 2,
        group: "additional",
        width: "150px",
    },
    {
        key: "premiumPerMille",
        label: "Premium ‰",
        priority: 2,
        group: "additional",
        width: "90px",
    },
    {
        key: "totalAnnualPremium",
        label: "Annual",
        priority: 2,
        group: "additional",
        width: "90px",
    },
    {
        key: "totalPremiumForInsuredPeriod",
        label: "Period",
        priority: 2,
        group: "additional",
        width: "90px",
    },
    {
        key: "notes",
        label: "Notes",
        priority: 2,
        group: "additional",
        width: "150px",
    },
    {
        key: "createdAt",
        label: "Created",
        priority: 2,
        group: "additional",
        width: "110px",
    },
    {
        key: "updatedAt",
        label: "Updated",
        priority: 2,
        group: "additional",
        width: "110px",
    },
]

// Boat form state type
type BoatFormState = {
    boatNumber: string
    insuranceStartDate: string
    insuranceEndDate: string
    boatBrand: string
    engineType: string
    boatType: string
    yearOfConstruction: number
    numberOfEngines: number
    engineNumber: string
    cinNumber: string
    mooringLocation: string
    organization: string
    premiumPerMille: number
    deductible: number
    numberOfInsuredDays: number
    totalAnnualPremium: number
    totalPremiumForInsuredPeriod: number
    value: number
    status: string
    notes: string
}

// Enhanced Search and Filter Bar
function SearchAndFilterBar({
    searchTerm,
    onSearchChange,
    visibleColumns,
    onToggleColumn,
    fieldConfig,
    organizations,
    selectedOrganizations,
    onOrganizationChange,
    showOrgFilter = true, // Allow disabling organization filter for user view
}: {
    searchTerm: string
    onSearchChange: (term: string) => void
    visibleColumns: Set<string>
    onToggleColumn: (column: string) => void
    fieldConfig: Record<string, { visible: boolean; required: boolean }> | null
    organizations: string[]
    selectedOrganizations: Set<string>
    onOrganizationChange: (org: string) => void
    showOrgFilter?: boolean
}) {
    const [showColumnFilter, setShowColumnFilter] = useState(false)
    const [showOrgFilterDropdown, setShowOrgFilterDropdown] = useState(false)
    const [columnButtonRef, setColumnButtonRef] =
        useState<HTMLButtonElement | null>(null)
    const [orgButtonRef, setOrgButtonRef] = useState<HTMLButtonElement | null>(
        null
    )
    const [columnDropdownPosition, setColumnDropdownPosition] = useState({
        top: 0,
        right: 0,
    })
    const [orgDropdownPosition, setOrgDropdownPosition] = useState({
        top: 0,
        right: 0,
    })

    // Calculate dropdown positions
    useEffect(() => {
        if (columnButtonRef && showColumnFilter) {
            const rect = columnButtonRef.getBoundingClientRect()
            setColumnDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [columnButtonRef, showColumnFilter])

    useEffect(() => {
        if (orgButtonRef && showOrgFilterDropdown) {
            const rect = orgButtonRef.getBoundingClientRect()
            setOrgDropdownPosition({
                top: rect.bottom + 8,
                right: window.innerWidth - rect.right,
            })
        }
    }, [orgButtonRef, showOrgFilterDropdown])

    const toggleGroup = (groupKey: keyof typeof COLUMN_GROUPS) => {
        const groupColumns = COLUMNS.filter((col) => col.group === groupKey)
        const allVisible = groupColumns.every((col) =>
            visibleColumns.has(col.key)
        )

        groupColumns.forEach((col) => {
            if (allVisible) {
                onToggleColumn(col.key) // Hide all
            } else if (!visibleColumns.has(col.key)) {
                onToggleColumn(col.key) // Show missing ones
            }
        })
    }

    // Filter columns based on field configuration
    const getVisibleColumnsForConfig = () => {
        if (!fieldConfig) return COLUMNS

        return COLUMNS.filter((col) => {
            const config = fieldConfig[col.key]
            return config ? config.visible : true // Show by default if not configured
        })
    }

    const availableColumns = getVisibleColumnsForConfig()

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
                        placeholder="Search boats..."
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

                {showOrgFilter && (
                    <div style={{ position: "relative" }}>
                        <button
                            ref={setOrgButtonRef}
                            onClick={() => setShowOrgFilterDropdown(!showOrgFilterDropdown)}
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
                                (e.target.style.backgroundColor = "#e5e7eb")
                            }
                            onMouseOut={(e) =>
                                (e.target.style.backgroundColor = "#f3f4f6")
                            }
                        >
                            <FaBuilding /> Organizations (
                            {selectedOrganizations.size})
                        </button>
                    </div>
                )}

                <div style={{ position: "relative" }}>
                    <button
                        ref={setColumnButtonRef}
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
                            (e.target.style.backgroundColor = "#e5e7eb")
                        }
                        onMouseOut={(e) =>
                            (e.target.style.backgroundColor = "#f3f4f6")
                        }
                    >
                        <FaFilter /> Columns ({visibleColumns.size})
                    </button>
                </div>
            </div>

            {/* Organization Filter Dropdown */}
            {showOrgFilter && showOrgFilterDropdown &&
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
                            onClick={() => setShowOrgFilterDropdown(false)}
                        />
                        <div
                            style={{
                                position: "fixed",
                                top: `${orgDropdownPosition.top}px`,
                                right: `${orgDropdownPosition.right}px`,
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
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            organizations.forEach((org) => {
                                                if (
                                                    !selectedOrganizations.has(
                                                        org
                                                    )
                                                ) {
                                                    onOrganizationChange(org)
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
                                        Select All
                                    </button>
                                    <button
                                        onClick={() => {
                                            organizations.forEach((org) => {
                                                if (
                                                    selectedOrganizations.has(
                                                        org
                                                    )
                                                ) {
                                                    onOrganizationChange(org)
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
                                        Clear All
                                    </button>
                                </div>
                            </div>
                            {organizations.map((org) => (
                                <label
                                    key={org}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: "8px",
                                        padding: "8px 12px",
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
                                        checked={selectedOrganizations.has(org)}
                                        onChange={() =>
                                            onOrganizationChange(org)
                                        }
                                        style={{ cursor: "pointer" }}
                                    />
                                    <span>{org}</span>
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
                                top: `${columnDropdownPosition.top}px`,
                                right: `${columnDropdownPosition.right}px`,
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
                                <div
                                    style={{
                                        display: "flex",
                                        gap: "8px",
                                        marginBottom: "8px",
                                    }}
                                >
                                    <button
                                        onClick={() => {
                                            availableColumns
                                                .filter(
                                                    (col) =>
                                                        col.group !==
                                                        "essential"
                                                )
                                                .forEach((col) => {
                                                    if (
                                                        visibleColumns.has(
                                                            col.key
                                                        )
                                                    ) {
                                                        onToggleColumn(col.key)
                                                    }
                                                })
                                            availableColumns
                                                .filter(
                                                    (col) =>
                                                        col.group ===
                                                        "essential"
                                                )
                                                .forEach((col) => {
                                                    if (
                                                        !visibleColumns.has(
                                                            col.key
                                                        )
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
                                            availableColumns.forEach(
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
                                    const groupColumns =
                                        availableColumns.filter(
                                            (col) => col.group === groupKey
                                        )

                                    if (groupColumns.length === 0) return null

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
                                                    cursor: "pointer",
                                                }}
                                                onClick={() =>
                                                    toggleGroup(
                                                        groupKey as keyof typeof COLUMN_GROUPS
                                                    )
                                                }
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
                                            {groupColumns.map((col) => {
                                                const config =
                                                    fieldConfig?.[col.key]
                                                const isRequired =
                                                    config?.required || false

                                                return (
                                                    <label
                                                        key={col.key}
                                                        style={{
                                                            display: "flex",
                                                            alignItems:
                                                                "center",
                                                            gap: "8px",
                                                            padding: "6px 20px",
                                                            cursor: "pointer",
                                                            fontSize: "13px",
                                                            fontFamily:
                                                                FONT_STACK,
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
                                                        <span
                                                            style={{ flex: 1 }}
                                                        >
                                                            {col.label}
                                                            {isRequired && (
                                                                <span
                                                                    style={{
                                                                        color: "#ef4444",
                                                                        marginLeft:
                                                                            "4px",
                                                                        fontSize:
                                                                            "12px",
                                                                    }}
                                                                >
                                                                    *
                                                                </span>
                                                            )}
                                                        </span>
                                                    </label>
                                                )
                                            })}
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

// Cell value renderer for boat table
function renderBoatCellValue(col: any, cellValue: any): React.ReactNode {
    if (cellValue == null) {
        return (
            <span
                style={{
                    color: "#9ca3af",
                }}
            >
                -
            </span>
        )
    }

    if (col.key === "status") {
        const statusConfig =
            STATUS_COLORS[
                cellValue as keyof typeof STATUS_COLORS
            ]
        return (
            <span
                style={{
                    padding: "4px 12px",
                    borderRadius: "12px",
                    fontSize: "12px",
                    fontWeight: "500",
                    backgroundColor: statusConfig?.bg || "#6b7280",
                    color: statusConfig?.text || "#ffffff",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                }}
            >
                {cellValue}
            </span>
        )
    }

    if (
        col.key === "value" ||
        col.key.includes("Premium") ||
        col.key === "deductible"
    ) {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(cellValue)
    }

    if (col.key.includes("Date")) {
        return new Date(cellValue).toLocaleDateString()
    }

    return String(cellValue)
}

// Action buttons for boat table rows
function GeneralActionButtons({
    boat,
    onEdit,
    onDelete,
}: {
    boat: any
    onEdit: (id: string | number) => void
    onDelete: (id: string | number) => void
}) {
    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
            }}
        >
            <button
                onClick={() => onEdit(boat.id)}
                style={{
                    padding: "6px 10px",
                    backgroundColor: "#3b82f6",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                    (e.target.style.backgroundColor = "#2563eb")
                }
                onMouseOut={(e) =>
                    (e.target.style.backgroundColor = "#3b82f6")
                }
            >
                <FaEdit size={9} /> Edit
            </button>
            <button
                onClick={() => onDelete(boat.id)}
                style={{
                    padding: "6px 10px",
                    backgroundColor: "#ef4444",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                    (e.target.style.backgroundColor = "#dc2626")
                }
                onMouseOut={(e) =>
                    (e.target.style.backgroundColor = "#ef4444")
                }
            >
                <FaTrashAlt size={9} /> Delete
            </button>
        </div>
    )
}

// Status action buttons for admin view
function StatusActionButtons({
    boat,
    onApprove,
    onDecline,
}: {
    boat: any
    onApprove: (id: string | number) => void
    onDecline: (id: string | number) => void
}) {
    return (
        <div
            style={{
                display: "flex",
                gap: "6px",
                flexWrap: "wrap",
            }}
        >
            <button
                onClick={
                    boat.status === "Pending"
                        ? () => onApprove(boat.id)
                        : undefined
                }
                disabled={boat.status !== "Pending"}
                title={
                    boat.status !== "Pending"
                        ? "Only available for pending boats"
                        : "Approve this boat"
                }
                style={{
                    padding: "6px 10px",
                    backgroundColor:
                        boat.status === "Pending" ? "#059669" : "#f3f4f6",
                    color: boat.status === "Pending" ? "#fff" : "#9ca3af",
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                        boat.status === "Pending" ? "pointer" : "not-allowed",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#047857"
                    }
                }}
                onMouseOut={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#059669"
                    }
                }}
            >
                <FaCheck size={9} /> Approve
            </button>
            <button
                onClick={
                    boat.status === "Pending"
                        ? () => onDecline(boat.id)
                        : undefined
                }
                disabled={boat.status !== "Pending"}
                title={
                    boat.status !== "Pending"
                        ? "Only available for pending boats"
                        : "Decline this boat"
                }
                style={{
                    padding: "6px 10px",
                    backgroundColor:
                        boat.status === "Pending" ? "#dc2626" : "#f3f4f6",
                    color: boat.status === "Pending" ? "#fff" : "#9ca3af",
                    border: "none",
                    borderRadius: "4px",
                    cursor:
                        boat.status === "Pending" ? "pointer" : "not-allowed",
                    fontSize: "11px",
                    fontWeight: "500",
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontFamily: FONT_STACK,
                    transition: "all 0.2s",
                }}
                onMouseOver={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#b91c1c"
                    }
                }}
                onMouseOut={(e) => {
                    if (boat.status === "Pending") {
                        e.target.style.backgroundColor = "#dc2626"
                    }
                }}
            >
                <FaTimes size={9} /> Decline
            </button>
        </div>
    )
}

// Export all the components and constants
export {
    SearchAndFilterBar,
    GeneralActionButtons,
    StatusActionButtons,
    renderBoatCellValue,
    COLUMNS,
    COLUMN_GROUPS,
    STATUS_COLORS,
    FONT_STACK,
    type ColumnKey,
    type BoatFormState,
}