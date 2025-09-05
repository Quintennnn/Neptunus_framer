# Current State Analysis & Field Registry Enhancement Plan

## Current Field Visibility Flow Analysis

### 1. **List Component (Table Columns)**
**Source**: `useDynamicSchema(currentOrganization)` → Field Registry via API
**Flow**: 
- Fetches schema from `/schema/insured-objects/{organization}` endpoint
- Uses `field.visible` property from organization-specific configuration
- Sets initial visible columns from schema: `COLUMNS.filter(col => col.visible)`
- User can toggle columns via column filter UI, overriding schema defaults
- **Current Implementation**: ✅ Uses Field Registry with organization overrides

### 2. **Create Form (Field Requirements)**
**Source**: `useCompleteSchema()` → Field Registry via API (default schema)
**Flow**:
- Fetches complete schema from `__COMPLETE_SCHEMA_DEFAULT__` endpoint  
- Uses `field.required` and `field.inputType === 'user'` from Field Registry
- Forces all fields to `visible: true` for create forms
- **Current Implementation**: ✅ Uses Field Registry (ignores org visibility for forms)

### 3. **Edit Form (Editable Fields)**
**Source**: Mixed - some Field Registry, some hardcoded logic
**Flow**:
- Uses `useDynamicSchema(organization)` for field schema info
- **Hardcoded exclusions**: `objectType`, `organization`, `id`, `status`, etc. (lines 2322-2330)
- Uses `getUserInputFieldsForObjectType()` but still has legacy fallback logic
- **Current Implementation**: ⚠️ Partially uses Field Registry, has hardcoded exclusions

### 4. **Column Filter (Available Columns)**
**Source**: Dynamic schema + hardcoded filtering
**Flow**:
- Uses same schema as list component (`COLUMNS = schema || []`)
- Shows all columns that exist in schema
- **No Field Registry control**: Cannot configure which fields appear in column filter
- **Current Implementation**: ❌ No Field Registry integration for filter availability

### 5. **Print/Export Fields (PDF Generation)**
**Source**: Dynamic schema + hardcoded filtering
**Flow**:
- Uses `printableFields` derived from `COLUMNS` (same schema as list component)
- **Hardcoded filtering**: Excludes organization fields via `!field.objectTypes.includes('organization')`
- Allows selection of any field that passes the filter for PDF export
- **Current Implementation**: ⚠️ Uses Field Registry but with hardcoded organization field exclusions

## Problems with Current State

1. **Inconsistent Sources**: Edit form has hardcoded exclusions instead of using Field Registry `inputType`
2. **No Column Filter Control**: Cannot configure which fields appear in column filter from Field Registry
3. **No Print Field Control**: Print functionality has hardcoded organization field exclusions
4. **Mixed Logic**: Edit form has both schema-based and legacy fallback logic
5. **Scattered Configuration**: Some logic in frontend, some in Field Registry

## Enhancement Plan

### Phase 1: Complete Field Registry Migration
**Goal**: Make Field Registry the single source of truth for all 5 field control aspects

#### 1.1 Add Missing Field Registry Properties
```python
# In field_registry.py, add new properties to FieldDefinition:
filterable: bool = True      # Can appear in column filter
editable: bool = True        # Can be edited after creation
printable: bool = True       # Can be included in print/export
```

#### 1.2 Update Field Registry Definitions
- Set `editable: False` for system fields (id, status, createdAt, etc.)
- Set `filterable: False` for sensitive/internal fields if needed
- Set `printable: False` for fields that shouldn't appear in exports (e.g., internal IDs)
- Remove hardcoded exclusions from frontend

#### 1.3 Frontend Integration
- Remove hardcoded field exclusions in edit form
- Remove hardcoded organization field exclusions in print functionality
- Use Field Registry `editable` property to determine edit form fields
- Use Field Registry `filterable` property for column filter options
- Use Field Registry `printable` property for print/export field options
- Simplify all field filtering logic to only use Field Registry data

### Phase 2: API Enhancements
**Goal**: Extend API to support the 5 field control aspects

#### 2.1 Schema API Updates
- Add `editable`, `filterable`, and `printable` to schema response format
- Ensure organization overrides work for all 5 aspects
- Add validation for field control combinations

#### 2.2 Organization Configuration
- Update organization `insured_object_fields_config` to support:
  - `visible`: Controls table column visibility (existing)
  - `required`: Controls form field requirements (existing)  
  - `filterable`: Controls column filter availability (new)
  - `editable`: Controls edit form field availability (new)
  - `printable`: Controls print/export field availability (new)

### Phase 3: Frontend Refactoring
**Goal**: Clean up frontend code to use unified Field Registry approach

#### 3.1 Remove Legacy Code
- Remove hardcoded field exclusions in edit form
- Remove legacy fallback logic in `renderInput()` function
- Simplify field filtering logic throughout components

#### 3.2 Add Field Registry Helper Functions
```typescript
// In useDynamicSchema.ts
export function getEditableFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[]
export function getFilterableFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[]
export function getPrintableFieldsForObjectType(schema: FieldSchema[] | null, objectType?: string): FieldSchema[]
```

#### 3.3 Update Components
- **Edit Form**: Use `getEditableFieldsForObjectType()` instead of hardcoded exclusions
- **Column Filter**: Use `getFilterableFieldsForObjectType()` to show available options
- **Print/Export**: Use `getPrintableFieldsForObjectType()` instead of hardcoded organization field exclusions
- **Create Form**: Continue using existing `getUserInputFieldsForObjectType()`
- **List Component**: Continue using existing visible field filtering

### Benefits of This Plan
1. **Single Source of Truth**: All field control comes from Field Registry
2. **Consistent Behavior**: Same logic across all components
3. **Easy Configuration**: Admins can control all 5 aspects from one place
4. **Maintainable**: No scattered hardcoded logic
5. **Extensible**: Easy to add new field control aspects in future

### Implementation Order
1. Update Field Registry with new properties (`filterable`, `editable`, `printable`)
2. Update API to return new properties in schema responses
3. Add frontend helper functions for all 5 aspects
4. Update components to use helpers (edit form, column filter, print functionality)
5. Remove hardcoded logic and organization field exclusions
6. Test all 5 field control aspects work consistently across all components

### Summary: From 4 to 5 Field Control Aspects
**Current**: `visible` (✅), `required` (✅), `filterable` (❌), `editable` (⚠️)
**New**: `visible` (✅), `required` (✅), `filterable` (✅), `editable` (✅), `printable` (✅)

The newly discovered print functionality adds a 5th aspect to manage, making the need for centralized Field Registry control even more critical.