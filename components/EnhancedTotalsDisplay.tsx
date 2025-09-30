// Enhanced Totals Display Component with Status-Aware Calculations
import * as React from "react"
import { FaInfoCircle, FaEye, FaEyeSlash } from "react-icons/fa"
import { colors, FONT_STACK } from "../Theme.tsx"
import {
    calculateEnhancedTotals,
    formatCalculationResults,
    generateStatusTooltip,
    TotalsCalculation,
    InsuredObject
} from "../premiumCalculations.tsx"

interface EnhancedTotalsDisplayProps {
    objects: InsuredObject[]
    label?: string
    showBreakdown?: boolean
    compact?: boolean
}

export function EnhancedTotalsDisplay({
    objects,
    label = "Totaaloverzicht",
    showBreakdown = true,
    compact = false
}: EnhancedTotalsDisplayProps) {
    const [showDetailedBreakdown, setShowDetailedBreakdown] = React.useState(false)

    // Calculate totals with status awareness
    const totals = React.useMemo(() => {
        console.log('🧮 Enhanced totals calculation for', objects.length, 'objects')
        return calculateEnhancedTotals(objects)
    }, [objects])

    const formatted = React.useMemo(() => {
        return formatCalculationResults(totals)
    }, [totals])

    if (!objects || objects.length === 0) {
        return null
    }

    if (compact) {
        return (
            <div style={{
                display: "flex",
                gap: "16px",
                alignItems: "center",
                padding: "8px 12px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                fontSize: "14px",
                fontFamily: FONT_STACK,
            }}>
                <span style={{ fontWeight: "500", color: "#374151" }}>
                    Totale waarde: <span style={{ color: colors.primary }}>{formatted.totalValue}</span>
                </span>
                <span
                 style={{ fontWeight: "500", color: "#374151" }}>
                    Premie (periode): <span style={{ color: colors.primary }}>{formatted.totalPeriodPremium}</span>
                </span>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                    {totals.insuredCount + totals.outsidePolicyCount} actief / {objects.length} totaal
                </span>
            </div>
        )
    }

    return (
        <div style={{
            margin: "16px 0",
            padding: "20px",
            backgroundColor: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            fontFamily: FONT_STACK,
        }}>
            {/* Header */}
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "16px"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: "18px",
                        fontWeight: "600",
                        color: "#1f2937"
                    }}>
                        {label}
                    </h3>
                    <div
                        style={{
                            position: "relative",
                            display: "inline-block"
                        }}
                        title={generateStatusTooltip(totals)}
                    >
                        <FaInfoCircle size={14} color="#6b7280" style={{ cursor: "help" }} />
                    </div>
                </div>

                {showBreakdown && (
                    <button
                        onClick={() => setShowDetailedBreakdown(!showDetailedBreakdown)}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "6px 10px",
                            backgroundColor: "white",
                            border: "1px solid #d1d5db",
                            borderRadius: "6px",
                            fontSize: "12px",
                            color: "#374151",
                            cursor: "pointer",
                            fontFamily: FONT_STACK,
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.backgroundColor = "#f9fafb"
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.backgroundColor = "white"
                        }}
                    >
                        {showDetailedBreakdown ? <FaEyeSlash size={10} /> : <FaEye size={10} />}
                        {showDetailedBreakdown ? "Verberg details" : "Toon details"}
                    </button>
                )}
            </div>

            {/* Main Totals Grid */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "16px",
                marginBottom: showDetailedBreakdown ? "20px" : "0"
            }}>
                {/* Total Value */}
                <div style={{
                    padding: "16px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "6px",
                        fontWeight: "500"
                    }}>
                        Totale waarde (excl. afgewezen)
                    </div>
                    <div style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: "#1f2937"
                    }}>
                        {formatted.totalValue}
                    </div>
                    <div style={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        marginTop: "4px"
                    }}>
                        {totals.insuredCount + totals.outsidePolicyCount + totals.pendingCount} objecten
                    </div>
                </div>

                {/* Period Premium */}
                <div style={{
                    padding: "16px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "6px",
                        fontWeight: "500"
                    }}>
                        Premie verzekerde periode
                    </div>
                    <div style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: colors.primary
                    }}>
                        {formatted.totalPeriodPremium}
                    </div>
                    <div style={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        marginTop: "4px"
                    }}>
                        Alleen verzekerd + buiten polis
                    </div>
                </div>

                {/* Yearly Premium */}
                <div style={{
                    padding: "16px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "6px",
                        fontWeight: "500"
                    }}>
                        Jaarpremie
                    </div>
                    <div style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: colors.primary
                    }}>
                        {formatted.totalYearlyPremium}
                    </div>
                    <div style={{
                        fontSize: "11px",
                        color: "#9ca3af",
                        marginTop: "4px"
                    }}>
                        Geëxtrapoleerd naar volledig jaar
                    </div>
                </div>

                {/* Difference */}
                <div style={{
                    padding: "16px",
                    backgroundColor: totals.totalYearlyPremium > totals.totalPeriodPremium ? "#fef3f2" : "#f0fdf4",
                    border: `1px solid ${totals.totalYearlyPremium > totals.totalPeriodPremium ? "#fecaca" : "#bbf7d0"}`,
                    borderRadius: "8px"
                }}>
                    <div style={{
                        fontSize: "13px",
                        color: "#6b7280",
                        marginBottom: "6px",
                        fontWeight: "500"
                    }}>
                        Verschil (jaar - periode)
                    </div>
                    <div style={{
                        fontSize: "20px",
                        fontWeight: "700",
                        color: totals.totalYearlyPremium > totals.totalPeriodPremium ? "#dc2626" : "#16a34a"
                    }}>
                        {formatted.difference}
                    </div>
                    <div style={{
                        fontSize: "11px",
                        color: totals.totalYearlyPremium > totals.totalPeriodPremium ? "#dc2626" : "#16a34a",
                        marginTop: "4px"
                    }}>
                        {formatted.percentageDifference}
                    </div>
                </div>
            </div>

            {/* Detailed Breakdown */}
            {showDetailedBreakdown && (
                <div style={{
                    padding: "16px",
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px"
                }}>
                    <h4 style={{
                        margin: "0 0 12px 0",
                        fontSize: "14px",
                        fontWeight: "600",
                        color: "#374151"
                    }}>
                        Status Breakdown
                    </h4>

                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                        gap: "12px"
                    }}>
                        {/* Insured */}
                        {totals.insuredCount > 0 && (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                borderRadius: "6px"
                            }}>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#16a34a", marginBottom: "4px" }}>
                                    Verzekerd ({totals.insuredCount})
                                </div>
                                <div style={{ fontSize: "11px", color: "#374151" }}>
                                    Waarde: {formatted.breakdown.insured.totalValue}
                                </div>
                                <div style={{ fontSize: "11px", color: "#374151" }}>
                                    Periode premie: {formatted.breakdown.insured.totalPeriodPremium}
                                </div>
                            </div>
                        )}

                        {/* Outside Policy */}
                        {totals.outsidePolicyCount > 0 && (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "#fefce8",
                                border: "1px solid #fde047",
                                borderRadius: "6px"
                            }}>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#a16207", marginBottom: "4px" }}>
                                    Buiten polis ({totals.outsidePolicyCount})
                                </div>
                                <div style={{ fontSize: "11px", color: "#374151" }}>
                                    Waarde: {formatted.breakdown.outsidePolicy.totalValue}
                                </div>
                                <div style={{ fontSize: "11px", color: "#374151" }}>
                                    Periode premie: {formatted.breakdown.outsidePolicy.totalPeriodPremium}
                                </div>
                            </div>
                        )}

                        {/* Pending */}
                        {totals.pendingCount > 0 && (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "#fef3c7",
                                border: "1px solid #fed7aa",
                                borderRadius: "6px"
                            }}>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#92400e", marginBottom: "4px" }}>
                                    In behandeling ({totals.pendingCount})
                                </div>
                                <div style={{ fontSize: "11px", color: "#374151" }}>
                                    Waarde: {formatted.breakdown.pending.totalValue}
                                </div>
                                <div style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic" }}>
                                    Geen premie berekening
                                </div>
                            </div>
                        )}

                        {/* Rejected */}
                        {totals.rejectedCount > 0 && (
                            <div style={{
                                padding: "12px",
                                backgroundColor: "#fee2e2",
                                border: "1px solid #fecaca",
                                borderRadius: "6px"
                            }}>
                                <div style={{ fontSize: "12px", fontWeight: "600", color: "#dc2626", marginBottom: "4px" }}>
                                    Afgewezen ({totals.rejectedCount})
                                </div>
                                <div style={{ fontSize: "11px", color: "#374151" }}>
                                    Waarde: {formatted.breakdown.rejected.totalValue}
                                </div>
                                <div style={{ fontSize: "11px", color: "#6b7280", fontStyle: "italic" }}>
                                    Uitgesloten van totalen
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}