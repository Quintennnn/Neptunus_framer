import { useState, useEffect } from "react"
import { API_BASE_URL, API_PATHS, getIdToken } from "../utils"

export interface FieldSchema {
    key: string
    label: string
    type: "text" | "number" | "currency" | "date" | "status" | "textarea" | "dropdown"
    group: "basic" | "metadata"
    required: boolean
    visible: boolean
    sortable: boolean
    width: string
    objectTypes?: string[]
    inputType?: "user" | "system" | "auto"  // From field registry to determine form visibility
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
// NOTE: For create forms, we need the COMPLETE schema without organization overrides
// The organization-specific 'visible' setting should only affect table columns, not form fields
export function getUserInputFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[] {
    const fieldsForType = getFieldsForObjectType(schema, objectType)
    return fieldsForType.filter(field => {
        // Only show fields that require user input (from field registry input_type)
        // Only accept fields explicitly marked as 'user' input type
        const isUserField = field.inputType === 'user'
        
        // Also filter out organization-specific fields from insured object forms
        const isNotOrganizationField = !field.objectTypes || !field.objectTypes.includes('organization')
        
        // IMPORTANT: We do NOT check field.visible here - visible is only for table columns!
        // Create forms should show ALL user input fields regardless of organization visible setting
        
        return isUserField && isNotOrganizationField
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