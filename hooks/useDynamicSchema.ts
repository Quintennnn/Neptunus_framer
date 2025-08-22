import { useState, useEffect } from "react"
import { API_BASE_URL, API_PATHS, getIdToken } from "../utils"

export interface FieldSchema {
    key: string
    label: string
    type: "text" | "number" | "currency" | "date" | "status" | "textarea"
    group: "basic" | "metadata"
    required: boolean
    visible: boolean
    sortable: boolean
    width: string
    objectTypes?: string[]
}

export interface SchemaResponse {
    organization: string
    schema: {
        fields: FieldSchema[]
    }
}

interface UseDynamicSchemaReturn {
    schema: FieldSchema[] | null
    loading: boolean
    error: string | null
    refetch: () => void
}

export function useDynamicSchema(organization?: string): UseDynamicSchemaReturn {
    const [schema, setSchema] = useState<FieldSchema[] | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSchema = async () => {
        if (!organization) {
            setSchema(null)
            setLoading(false)
            return
        }

        setLoading(true)
        setError(null)

        try {
            const token = getIdToken()
            if (!token) {
                throw new Error("No authentication token available")
            }

            const response = await fetch(
                `${API_BASE_URL}${API_PATHS.SCHEMA}/insured-objects/${encodeURIComponent(organization)}`,
                {
                    method: "GET",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    mode: "cors",
                }
            )

            if (!response.ok) {
                throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`)
            }

            const data: SchemaResponse = await response.json()
            setSchema(data.schema.fields)
        } catch (err: any) {
            console.error("Error fetching schema:", err)
            setError(err.message || "Failed to fetch schema")
            // Set fallback to null so components can handle error state
            setSchema(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSchema()
    }, [organization])

    return {
        schema,
        loading,
        error,
        refetch: fetchSchema,
    }
}

// Helper function to get fields for a specific object type from schema
export function getFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[] {
    if (!schema) {
        return DEFAULT_SCHEMA.filter(field => {
            // If no object type specified, return basic fields
            if (!objectType) return field.group === "basic" || !field.objectTypes
            // If object type specified, return fields that don't specify objectTypes or include this objectType
            return !field.objectTypes || field.objectTypes.includes(objectType)
        })
    }

    return schema.filter(field => {
        // If no object type specified, return fields that don't restrict object types
        if (!objectType) return !field.objectTypes || field.objectTypes.length === 0
        // If object type specified, return fields that don't specify objectTypes or include this objectType
        return !field.objectTypes || field.objectTypes.includes(objectType)
    })
}

// Helper function to get field keys for a specific object type (for backwards compatibility)
export function getFieldKeysForObjectType(schema: FieldSchema[] | null, objectType?: string): string[] {
    return getFieldsForObjectType(schema, objectType).map(field => field.key)
}

// Default fallback schema for when API is unavailable
export const DEFAULT_SCHEMA: FieldSchema[] = [
    // Essential fields
    {
        key: "objectType",
        label: "Type",
        type: "text",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "120px"
    },
    {
        key: "status",
        label: "Status",
        type: "status",
        group: "basic",
        required: false,  // Status is automatically set, not user input
        visible: true,    // Now visible as requested
        sortable: true,
        width: "100px"
    },
    {
        key: "organization",
        label: "Organization",
        type: "text",
        group: "basic",
        required: true,
        visible: false,  // Hidden from list view by default
        sortable: true,
        width: "150px"
    },
    {
        key: "waarde",
        label: "Waarde",
        type: "currency",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "120px"
    },
    {
        key: "premiepromillage",
        label: "Premie ‰",
        type: "number",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "100px"
    },
    {
        key: "eigenRisico",
        label: "Eigen Risico",
        type: "currency",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "100px"
    },
    {
        key: "ingangsdatum",
        label: "Ingangsdatum",
        type: "date",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "120px"
    },
    {
        key: "uitgangsdatum",
        label: "Uitgangsdatum",
        type: "date",
        group: "basic",
        required: false,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "120px"
    },
    // Boat-specific fields
    {
        key: "merkBoot",
        label: "Merk Boot",
        type: "text",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - replaced by unified brand column
        sortable: true,
        width: "120px",
        objectTypes: ["boat"]
    },
    {
        key: "typeBoot",
        label: "Type Boot",
        type: "text",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "120px",
        objectTypes: ["boat"]
    },
    {
        key: "ligplaats",
        label: "Ligplaats",
        type: "text",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "150px",
        objectTypes: ["boat"]
    },
    {
        key: "bootnummer",
        label: "Bootnummer",
        type: "text",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "120px",
        objectTypes: ["boat"]
    },
    {
        key: "aantalMotoren",
        label: "Aantal Motoren",
        type: "number",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "80px",
        objectTypes: ["boat"]
    },
    {
        key: "typeMerkMotor",
        label: "Type/Merk Motor",
        type: "text",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "120px",
        objectTypes: ["boat"]
    },
    {
        key: "motornummer",
        label: "Motornummer",
        type: "text",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "130px",
        objectTypes: ["boat"]
    },
    {
        key: "bouwjaar",
        label: "Bouwjaar",
        type: "number",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "100px",
        objectTypes: ["boat"]
    },
    {
        key: "cinNummer",
        label: "CIN Nummer",
        type: "text",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "120px",
        objectTypes: ["boat"]
    },
    {
        key: "aantalVerzekerdeDagen",
        label: "Aantal Verzekerde Dagen",
        type: "number",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "120px",
        objectTypes: ["boat"]
    },
    {
        key: "totalePremieOverHetJaar",
        label: "Totale Premie Over Het Jaar",
        type: "currency",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "150px",
        objectTypes: ["boat"]
    },
    {
        key: "totalePremieOverDeVerzekerdePeriode",
        label: "Totale Premie Over De Verzekerde Periode",
        type: "currency",
        group: "basic",
        required: true,
        visible: false,  // Hidden by default - available in column filter
        sortable: true,
        width: "180px",
        objectTypes: ["boat"]
    },
    // Unified fields for all object types
    {
        key: "brand",
        label: "Brand/Merk",
        type: "text",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "120px"
    },
    {
        key: "type",
        label: "Model/Type",
        type: "text",
        group: "basic",
        required: true,
        visible: true,
        sortable: true,
        width: "120px"
    },
    // Trailer-specific fields
    {
        key: "trailerMerk",
        label: "Trailer Merk",
        type: "text",
        group: "basic",
        required: false,
        visible: false,  // Hidden by default - replaced by unified brand column
        sortable: true,
        width: "120px",
        objectTypes: ["trailer"]
    },
    {
        key: "trailerType",
        label: "Trailer Type",
        type: "text",
        group: "basic",
        required: false,
        visible: false,  // Hidden by default - replaced by unified type column
        sortable: true,
        width: "120px",
        objectTypes: ["trailer"]
    },
    // Motor-specific fields
    {
        key: "motorMerk",
        label: "Motor Merk",
        type: "text",
        group: "basic",
        required: false,
        visible: false,  // Hidden by default - replaced by unified brand column
        sortable: true,
        width: "120px",
        objectTypes: ["motor"]
    },
    {
        key: "motorModel",
        label: "Motor Model",
        type: "text",
        group: "basic",
        required: false,
        visible: false,  // Hidden by default - replaced by unified type column
        sortable: true,
        width: "120px",
        objectTypes: ["motor"]
    },
    // Common metadata fields
    {
        key: "notitie",
        label: "Notitie",
        type: "textarea",
        group: "metadata",
        required: false,
        visible: true,
        sortable: false,
        width: "200px"
    }
]

// Unified field mapping for smart column consolidation
export const UNIFIED_FIELD_MAPPING = {
    brand: {
        boat: 'merkBoot',
        trailer: 'trailerMerk', 
        motor: 'motorMerk'
    },
    type: {
        boat: 'typeBoot',
        trailer: 'trailerType',
        motor: 'motorModel'
    }
} as const

// Helper function to get the actual field value for unified columns
export function getUnifiedFieldValue(object: any, unifiedKey: string): string {
    if (!(unifiedKey in UNIFIED_FIELD_MAPPING)) {
        return object[unifiedKey] || ''
    }
    
    const mapping = UNIFIED_FIELD_MAPPING[unifiedKey as keyof typeof UNIFIED_FIELD_MAPPING]
    const objectType = object.objectType
    
    if (objectType && objectType in mapping) {
        const actualField = mapping[objectType as keyof typeof mapping]
        return object[actualField] || ''
    }
    
    return ''
}