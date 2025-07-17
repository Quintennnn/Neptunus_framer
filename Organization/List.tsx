// src/OrganizationPageOverride.tsx
import * as React from "react"
import * as ReactDOM from "react-dom"
import { Override } from "framer"
import { useState, useEffect, useCallback } from "react"
import {
    FaEdit,
    FaTrashAlt,
    FaSearch,
    FaFilter,
    FaToggleOn,
    FaToggleOff,
    FaTimes,
} from "react-icons/fa"

const API_BASE_URL = "https://dev.api.hienfeld.io"
const ORG_PATH = "/neptunus/organization"

const FONT_STACK =
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif"

function getIdToken(): string | null {
    return sessionStorage.getItem("idToken")
}

const ORG_COLUMNS = [
    { key: "name", label: "Name", width: "200px" },
    { key: "is_superorg", label: "Super Org", width: "100px" },
    { key: "createdAt", label: "Created", width: "150px" },
    { key: "updatedAt", label: "Updated", width: "150px" },
    { key: "lastUpdatedBy", label: "Updated By", width: "180px" },
]

// Available boat fields that can be configured
const BOAT_FIELDS = [
    { key: "premiumPerMille", label: "Premium Per Mille" },
    { key: "mooringLocation", label: "Mooring Location" },
    { key: "notes", label: "Notes" },
    { key: "numberOfEngines", label: "Number of Engines" },
    { key: "boatNumber", label: "Boat Number" },
    { key: "engineNumber", label: "Engine Number" },
    { key: "numberOfInsuredDays", label: "Number of Insured Days" },
    { key: "engineType", label: "Engine Type" },
    { key: "yearOfConstruction", label: "Year of Construction" },
    { key: "cinNumber", label: "CIN Number" },
    { key: "insuranceEndDate", label: "Insurance End Date" },
    { key: "boatType", label: "Boat Type" },
    { key: "deductible", label: "Deductible" },
    { key: "organization", label: "Organization" },
    {
        key: "totalPremiumForInsuredPeriod",
        label: "Total Premium for Insured Period",
    },
    { key: "insuranceStartDate", label: "Insurance Start Date" },
    { key: "totalAnnualPremium", label: "Total Annual Premium" },
    { key: "boatBrand", label: "Boat Brand" },
    { key: "value", label: "Value" },
    { key: "status", label: "Status" },
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
                background: "#fff",
                border: "1px solid #d1d5db",
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
                position: "fixed",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                background: "#fff",
                padding: "24px",
                borderRadius: "12px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
                zIndex: 1001,
                fontFamily: FONT_STACK,
            }}
        >
            <div
                style={{ fontSize: "18px", fontWeight: 600, marginBottom: 12 }}
            >
                Delete Organization
            </div>
            <p style={{ fontSize: 14, marginBottom: 20 }}>
                Are you sure you want to delete this organization?
            </p>
            <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}
            >
                <button
                    onClick={onCancel}
                    style={{
                        padding: "10px 16px",
                        backgroundColor: "#e5e7eb",
                        borderRadius: 8,
                        border: "none",
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Cancel
                </button>
                <button
                    onClick={onConfirm}
                    style={{
                        padding: "10px 16px",
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: 8,
                        cursor: "pointer",
                        fontFamily: FONT_STACK,
                    }}
                >
                    Delete
                </button>
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
    const [isSuperOrg, setIsSuperOrg] = useState(org.is_superorg || false)
    const [boatFieldsConfig, setBoatFieldsConfig] = useState(
        org.boat_fields_config || {}
    )
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<"basic" | "fields">("basic")

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
            const payload = {
                name,
                is_superorg: isSuperOrg,
                boat_fields_config: boatFieldsConfig,
            }

            const res = await fetch(`${API_BASE_URL}${ORG_PATH}/${org.id}`, {
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
                background: "#fff",
                padding: 32,
                borderRadius: 12,
                boxShadow: "0 25px 70px rgba(0,0,0,0.15)",
                fontFamily: FONT_STACK,
                zIndex: 1001,
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
                                                                    ? "#10b981"
                                                                    : "#d1d5db",
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
                )}

                {error && (
                    <div
                        style={{
                            color: "#dc2626",
                            marginBottom: 12,
                            fontSize: 14,
                        }}
                    >
                        {error}
                    </div>
                )}
                {success && (
                    <div
                        style={{
                            color: "#059669",
                            marginBottom: 12,
                            fontSize: 14,
                        }}
                    >
                        {success}
                    </div>
                )}

                <div
                    style={{
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 10,
                        marginTop: 24,
                        paddingTop: 16,
                        borderTop: "1px solid #e5e7eb",
                    }}
                >
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            padding: "12px 20px",
                            backgroundColor: "#e5e7eb",
                            border: "none",
                            borderRadius: 8,
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        style={{
                            padding: "12px 20px",
                            backgroundColor: "#3b82f6",
                            color: "white",
                            border: "none",
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

    const refresh = useCallback(() => {
        fetch(`${API_BASE_URL}${ORG_PATH}`, {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${getIdToken()}`,
            },
        })
            .then((res) => res.json())
            .then((json) => setOrgs(json.organizations))
            .catch((err) => setError(err.message))
    }, [])

    useEffect(() => {
        refresh()
    }, [refresh])

    const filteredOrgs =
        orgs?.filter((org) =>
            org.name?.toLowerCase().includes(searchTerm.toLowerCase())
        ) ?? []

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
            await fetch(`${API_BASE_URL}${ORG_PATH}/${deletingOrgId}`, {
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

    if (orgs === null)
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
                    <div
                        style={{
                            background: "#fff",
                            borderRadius: 12,
                            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                            overflow: "hidden",
                        }}
                    >
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
                                    alignItems: "center",
                                    marginBottom: 20,
                                }}
                            >
                                <h1
                                    style={{
                                        margin: 0,
                                        fontSize: 24,
                                        fontWeight: 700,
                                        color: "#1f2937",
                                    }}
                                >
                                    Organization Management
                                </h1>
                                <div
                                    style={{
                                        fontSize: "14px",
                                        color: "#6b7280",
                                        backgroundColor: "#f3f4f6",
                                        padding: "6px 12px",
                                        borderRadius: "6px",
                                    }}
                                >
                                    {filteredOrgs.length} organizations
                                </div>
                            </div>
                            <div style={{ display: "flex", gap: 12 }}>
                                <div style={{ position: "relative", flex: 1 }}>
                                    <FaSearch
                                        style={{
                                            position: "absolute",
                                            top: "50%",
                                            left: 12,
                                            transform: "translateY(-50%)",
                                            color: "#9ca3af",
                                        }}
                                    />
                                    <input
                                        placeholder="Search organizations..."
                                        value={searchTerm}
                                        onChange={(e) =>
                                            setSearchTerm(e.target.value)
                                        }
                                        style={{
                                            width: "100%",
                                            padding: "12px 12px 12px 36px",
                                            border: "1px solid #d1d5db",
                                            borderRadius: 8,
                                            fontSize: 14,
                                            fontFamily: FONT_STACK,
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
                                        <FaFilter /> Columns ({visible.length})
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
                                                    color: "#374151",
                                                    width: col.width,
                                                }}
                                            >
                                                {col.label}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredOrgs.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={visible.length + 1}
                                                style={{
                                                    padding: 24,
                                                    textAlign: "center",
                                                    color: "#9ca3af",
                                                }}
                                            >
                                                No organizations to display with
                                                your authorization role
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrgs.map((org, i) => (
                                            <tr
                                                key={org.id}
                                                style={{
                                                    backgroundColor:
                                                        i % 2 === 0
                                                            ? "#ffffff"
                                                            : "#f9fafb",
                                                }}
                                            >
                                                <td style={{ padding: 12 }}>
                                                    <div
                                                        style={{
                                                            display: "flex",
                                                            gap: "8px",
                                                        }}
                                                    >
                                                        <button
                                                            onClick={() =>
                                                                setEditingOrg(
                                                                    org
                                                                )
                                                            }
                                                            style={{
                                                                padding:
                                                                    "8px 12px",
                                                                backgroundColor:
                                                                    "#3b82f6",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: 6,
                                                                cursor: "pointer",
                                                                fontSize: 12,
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: "4px",
                                                            }}
                                                        >
                                                            <FaEdit size={10} />{" "}
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setDeletingOrgId(
                                                                    org.id
                                                                )
                                                            }
                                                            style={{
                                                                padding:
                                                                    "8px 12px",
                                                                backgroundColor:
                                                                    "#ef4444",
                                                                color: "#fff",
                                                                border: "none",
                                                                borderRadius: 6,
                                                                cursor: "pointer",
                                                                fontSize: 12,
                                                                display: "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: "4px",
                                                            }}
                                                        >
                                                            <FaTrashAlt
                                                                size={10}
                                                            />{" "}
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                                {visible.map((col) => (
                                                    <td
                                                        key={col.key}
                                                        style={{
                                                            padding: 12,
                                                            color: "#374151",
                                                        }}
                                                    >
                                                        {col.key ===
                                                        "is_superorg"
                                                            ? org[col.key]
                                                                ? "Yes"
                                                                : "No"
                                                            : col.key ===
                                                                    "createdAt" ||
                                                                col.key ===
                                                                    "updatedAt"
                                                              ? formatDate(
                                                                    org[col.key]
                                                                )
                                                              : (org[col.key] ??
                                                                "-")}
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
                                org={editingOrg}
                                onClose={() => setEditingOrg(null)}
                                refresh={refresh}
                            />
                        </div>,
                        document.body
                    )}
            </>
        ),
    }
}
