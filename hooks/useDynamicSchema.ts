import { useState, useEffect } from "react"
import { API_BASE_URL, API_PATHS, getIdToken } from "../utils"

export interface FieldSchema {
    key: string
    label: string
    type: "text" | "number" | "currency" | "date" | "status" | "textarea" | "dropdown"
    group: "basic" | "metadata"
    required: boolean
    visible: boolean
    displayOrder?: number  // Display order in forms (lower = earlier) - defaults to 999 if not specified
    filterable: boolean
    editable: boolean
    printable: boolean
    sortable: boolean
    width: string
    objectTypes?: string[]
    inputType?: "user" | "system" | "auto" | "edit_only"  // From field registry to determine form visibility
    options?: string[]  // Dropdown options for dropdown type
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
        return []
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


// Helper function to get only user input fields for forms (excludes system and auto fields)
// NOTE: Respects organization-specific 'visible' configuration for create forms
export function getUserInputFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[] {
    const fieldsForType = getFieldsForObjectType(schema, objectType)
    return fieldsForType.filter(field => {
        // Only show fields that require user input (from field registry input_type)
        // Only accept fields explicitly marked as 'user' input type
        // Exclude 'edit_only' fields from create forms
        const isUserField = field.inputType === 'user'

        // Also filter out organization-specific fields from insured object forms
        const isNotOrganizationField = !field.objectTypes || !field.objectTypes.includes('organization')

        // IMPORTANT: Respect organization's visible configuration - if visible is false, hide the field in create forms
        const isVisible = field.visible !== false

        return isUserField && isNotOrganizationField && isVisible
    })
}

// Helper function to get editable fields for edit forms
export function getEditableFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[] {
    const fieldsForType = getFieldsForObjectType(schema, objectType)
    return fieldsForType.filter(field => {
        // Show fields that can be edited (from field registry)
        // Include both 'user' fields and 'edit_only' fields for edit forms
        const isEditableField = field.editable && (field.inputType === 'user' || field.inputType === 'edit_only')
        
        // Filter out organization-specific fields from insured object forms
        const isNotOrganizationField = !field.objectTypes || !field.objectTypes.includes('organization')
        
        return isEditableField && isNotOrganizationField
    })
}

// Helper function to get filterable fields for column filters
export function getFilterableFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[] {
    const fieldsForType = getFieldsForObjectType(schema, objectType)
    return fieldsForType.filter(field => {
        // Only show fields that can be filtered (from field registry)
        return field.filterable
    })
}

// Helper function to get ALL filterable fields for insured objects (excludes organization-specific fields)
// Use this for column filters where you want to show all possible filterable fields for insured objects
export function getAllFilterableFields(schema: FieldSchema[] | null): FieldSchema[] {
    if (!schema) {
        return []
    }
    return schema.filter(field => {
        // Only show filterable fields
        if (!field.filterable) return false
        
        // Exclude organization-specific fields from insured object column filters
        if (field.objectTypes && field.objectTypes.includes('organization')) {
            return false
        }
        
        // Include universal fields (no object type restrictions) and insured object fields
        return true
    })
}

// Helper function to get printable fields for print/export
export function getPrintableFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[] {
    const fieldsForType = getFieldsForObjectType(schema, objectType)
    return fieldsForType.filter(field => {
        // Only show fields that can be printed (from field registry)
        const isPrintable = field.printable
        
        // Filter out organization-specific fields from insured object prints (they're handled separately)
        const isNotOrganizationField = !field.objectTypes || !field.objectTypes.includes('organization')
        
        return isPrintable && isNotOrganizationField
    })
}

// Hook for getting complete field schema (without organization overrides) for forms
// For now, we'll create a schema where all user input fields are visible=true for forms
export function useCompleteSchema(): UseDynamicSchemaReturn {
    const [schema, setSchema] = useState<FieldSchema[] | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSchema = async () => {
        setLoading(true)
        setError(null)

        try {
            const token = getIdToken()
            if (!token) {
                throw new Error("No authentication token available")
            }

            // For now, we'll use a dummy organization that doesn't exist to get default field registry schema
            // This is a temporary solution until we have a proper complete schema endpoint
            const response = await fetch(
                `${API_BASE_URL}${API_PATHS.SCHEMA}/insured-objects/__COMPLETE_SCHEMA_DEFAULT__`,
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
                throw new Error(`Failed to fetch complete schema: ${response.status} ${response.statusText}`)
            }

            const data: SchemaResponse = await response.json()
            
            // Force ALL user input fields to be visible for create forms (ignores organization visible setting)
            const completeSchema = data.schema.fields.map(field => ({
                ...field,
                visible: true // Always show all fields in create forms, regardless of organization config
            }))
            
            setSchema(completeSchema)
        } catch (err: any) {
            console.error("Error fetching complete schema:", err)
            setError(err.message || "Failed to fetch complete schema")
            setSchema(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSchema()
    }, [])

    return {
        schema,
        loading,
        error,
        refetch: fetchSchema,
    }
}

// No more hardcoded schema - all fields come from backend field registry

// Hook for organization field schema
export function useOrganizationSchema(): UseDynamicSchemaReturn {
    const [schema, setSchema] = useState<FieldSchema[] | null>(null)
    const [loading, setLoading] = useState<boolean>(false)
    const [error, setError] = useState<string | null>(null)

    const fetchSchema = async () => {
        setLoading(true)
        setError(null)

        try {
            const token = getIdToken()
            if (!token) {
                throw new Error("No authentication token available")
            }

            const response = await fetch(
                `${API_BASE_URL}${API_PATHS.SCHEMA}/organizations`,
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
                throw new Error(`Failed to fetch organization schema: ${response.status} ${response.statusText}`)
            }

            const data: SchemaResponse = await response.json()
            setSchema(data.schema.fields)
        } catch (err: any) {
            console.error("Error fetching organization schema:", err)
            setError(err.message || "Failed to fetch organization schema")
            setSchema(null)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSchema()
    }, [])

    return {
        schema,
        loading,
        error,
        refetch: fetchSchema,
    }
}