// Enhanced Premium Calculation System
// Implements status-aware calculations and improved logic per Phase 3.3

import { formatCurrency } from "./Utils.tsx"

// ——— Types ———
export interface InsuredObject {
    id: string
    status: "Insured" | "Pending" | "Rejected" | "OutOfPolicy" | "Not Insured"
    waarde: number
    premiepromillage: number
    ingangsdatum?: string
    uitgangsdatum?: string
    objectType: string
    organization: string
    // Calculated fields
    totalePremieOverHetJaar?: number
    totalePremieOverDeVerzekerdePeriode?: number
    aantalVerzekerdeDagen?: number
}

export interface PremiumCalculationResult {
    yearlyPremium: number
    periodPremium: number
    periodDays: number
}

export interface TotalsCalculation {
    totalValue: number
    totalYearlyPremium: number
    totalPeriodPremium: number
    insuredCount: number
    outsidePolicyCount: number
    pendingCount: number
    rejectedCount: number
    breakdown: {
        insured: {
            totalValue: number
            totalYearlyPremium: number
            totalPeriodPremium: number
            count: number
        }
        outsidePolicy: {
            totalValue: number
            totalYearlyPremium: number
            totalPeriodPremium: number
            count: number
        }
        pending: {
            totalValue: number
            count: number
        }
        rejected: {
            totalValue: number
            count: number
        }
    }
}

// ——— Status-Aware Calculation Logic ———

/**
 * Determines if an object should be included in premium calculations
 * Enhanced logic: Only "Insured" and "OutOfPolicy" objects contribute to premiums
 */
export function shouldIncludeInPremiumCalculation(object: InsuredObject): boolean {
    return object.status === "Insured" || object.status === "OutOfPolicy"
}

/**
 * Determines if an object should be included in total value calculations
 * Enhanced logic: Exclude rejected and out-of-policy objects from value totals
 */
export function shouldIncludeInValueCalculation(object: InsuredObject): boolean {
    return object.status !== "Rejected" && object.status !== "OutOfPolicy"
}

/**
 * Calculate insurance period in days with enhanced date handling
 */
export function calculateInsurancePeriod(object: InsuredObject): number {
    const startDate = object.ingangsdatum ? new Date(object.ingangsdatum) : new Date()
    let endDate: Date

    if (object.uitgangsdatum && object.uitgangsdatum.trim() !== "") {
        endDate = new Date(object.uitgangsdatum)
    } else {
        // If no end date, calculate until end of current year
        const currentYear = new Date().getFullYear()
        endDate = new Date(currentYear, 11, 31) // December 31st
    }

    // Ensure positive days calculation
    const timeDifference = endDate.getTime() - startDate.getTime()
    const daysDifference = Math.max(1, Math.ceil(timeDifference / (1000 * 3600 * 24)))

    return daysDifference
}

/**
 * Calculate premiums for a single object with enhanced logic
 */
export function calculateObjectPremiums(object: InsuredObject): PremiumCalculationResult {
    const waarde = Number(object.waarde) || 0
    const promillage = Number(object.premiepromillage) || 0

    // Only calculate premiums for objects that should contribute
    if (!shouldIncludeInPremiumCalculation(object)) {
        return {
            yearlyPremium: 0,
            periodPremium: 0,
            periodDays: calculateInsurancePeriod(object)
        }
    }

    const yearlyPremium = waarde * promillage / 1000

    // Calculate actual period premium based on days
    const periodDays = calculateInsurancePeriod(object)
    const periodPremium = yearlyPremium * (periodDays / 365)

    return {
        yearlyPremium,
        periodPremium,
        periodDays
    }
}

/**
 * Enhanced totals calculation with status breakdown
 */
export function calculateEnhancedTotals(objects: InsuredObject[]): TotalsCalculation {
    const breakdown = {
        insured: { totalValue: 0, totalYearlyPremium: 0, totalPeriodPremium: 0, count: 0 },
        outsidePolicy: { totalValue: 0, totalYearlyPremium: 0, totalPeriodPremium: 0, count: 0 },
        pending: { totalValue: 0, count: 0 },
        rejected: { totalValue: 0, count: 0 }
    }

    // Process each object by status
    objects.forEach(object => {
        const waarde = Number(object.waarde) || 0
        const { yearlyPremium, periodPremium } = calculateObjectPremiums(object)

        switch (object.status) {
            case "Insured":
                breakdown.insured.totalValue += waarde
                breakdown.insured.totalYearlyPremium += yearlyPremium
                breakdown.insured.totalPeriodPremium += periodPremium
                breakdown.insured.count++
                break
            case "OutOfPolicy":
                breakdown.outsidePolicy.totalValue += waarde
                breakdown.outsidePolicy.totalYearlyPremium += yearlyPremium
                breakdown.outsidePolicy.totalPeriodPremium += periodPremium
                breakdown.outsidePolicy.count++
                break
            case "Pending":
                breakdown.pending.totalValue += waarde
                breakdown.pending.count++
                break
            case "Rejected":
                breakdown.rejected.totalValue += waarde
                breakdown.rejected.count++
                break
        }
    })

    // Calculate overall totals
    const totalValue = breakdown.insured.totalValue 
    const totalYearlyPremium = breakdown.insured.totalYearlyPremium + breakdown.outsidePolicy.totalYearlyPremium
    const totalPeriodPremium = breakdown.insured.totalPeriodPremium + breakdown.outsidePolicy.totalPeriodPremium

    return {
        totalValue,
        totalYearlyPremium,
        totalPeriodPremium,
        insuredCount: breakdown.insured.count,
        outsidePolicyCount: breakdown.outsidePolicy.count,
        pendingCount: breakdown.pending.count,
        rejectedCount: breakdown.rejected.count,
        breakdown
    }
}

/**
 * Update object with calculated premium values
 */
export function updateObjectWithCalculatedPremiums(object: InsuredObject): InsuredObject {
    const { yearlyPremium, periodPremium, periodDays } = calculateObjectPremiums(object)

    return {
        ...object,
        totalePremieOverHetJaar: yearlyPremium,
        totalePremieOverDeVerzekerdePeriode: periodPremium,
        aantalVerzekerdeDagen: periodDays
    }
}

// ——— Display Utilities ———

/**
 * Format calculation results for display
 */
export function formatCalculationResults(totals: TotalsCalculation) {
    return {
        totalValue: formatCurrency(totals.totalValue),
        totalYearlyPremium: formatCurrency(totals.totalYearlyPremium),
        totalPeriodPremium: formatCurrency(totals.totalPeriodPremium),
        difference: formatCurrency(Math.abs(totals.totalYearlyPremium - totals.totalPeriodPremium)),
        percentageDifference: totals.totalYearlyPremium > 0
            ? ((Math.abs(totals.totalYearlyPremium - totals.totalPeriodPremium) / totals.totalYearlyPremium) * 100).toFixed(1) + '%'
            : '0%',
        breakdown: {
            insured: {
                totalValue: formatCurrency(totals.breakdown.insured.totalValue),
                totalYearlyPremium: formatCurrency(totals.breakdown.insured.totalYearlyPremium),
                totalPeriodPremium: formatCurrency(totals.breakdown.insured.totalPeriodPremium),
                count: totals.breakdown.insured.count
            },
            outsidePolicy: {
                totalValue: formatCurrency(totals.breakdown.outsidePolicy.totalValue),
                totalYearlyPremium: formatCurrency(totals.breakdown.outsidePolicy.totalYearlyPremium),
                totalPeriodPremium: formatCurrency(totals.breakdown.outsidePolicy.totalPeriodPremium),
                count: totals.breakdown.outsidePolicy.count
            },
            pending: {
                totalValue: formatCurrency(totals.breakdown.pending.totalValue),
                count: totals.breakdown.pending.count
            },
            rejected: {
                totalValue: formatCurrency(totals.breakdown.rejected.totalValue),
                count: totals.breakdown.rejected.count
            }
        }
    }
}

/**
 * Generate status-aware tooltip text
 */
export function generateStatusTooltip(totals: TotalsCalculation): string {
    const lines = []

    if (totals.insuredCount > 0) {
        lines.push(`Verzekerd: ${totals.insuredCount} objecten (${formatCurrency(totals.breakdown.insured.totalValue)})`)
    }

    if (totals.outsidePolicyCount > 0) {
        lines.push(`Buiten polis: ${totals.outsidePolicyCount} objecten (${formatCurrency(totals.breakdown.outsidePolicy.totalValue)})`)
    }

    if (totals.pendingCount > 0) {
        lines.push(`In behandeling: ${totals.pendingCount} objecten (${formatCurrency(totals.breakdown.pending.totalValue)})`)
    }

    if (totals.rejectedCount > 0) {
        lines.push(`Afgewezen: ${totals.rejectedCount} objecten (uitgesloten van totalen)`)
    }

    return lines.join('\n')
}