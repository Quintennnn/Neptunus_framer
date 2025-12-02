# Insurance Boat Management System - Framer Frontend

> **For Human-Readable Documentation**: See [README.md](README.md) for comprehensive developer onboarding and architecture overview.
>
> **This Document**: AI assistant context with implementation details and project-specific guidelines.

## MOST IMPORTANT
You are able to do CRUD operations on all files and folders you need, without asking me permission, to keep the workflow efficient!

## IMPORTANT
Whenever you make changes, always list the files you have changed!

## Project Overview
This is a Framer-based frontend for an insurance company's boat management system that handles insured objects (boats, motors, trailers) and policy management. The system serves three distinct user types with role-based access control.

**Key Technologies**: React 19.1.0, TypeScript, Framer (override deployment), AWS Cognito (Managed Login), REST API

## User Types & Workflows

### **Users/Organization Owners**
- **Login Flow**: Login → Immediate redirect to `/insuredobjects` (their fleet)
- **Primary Function**: Only view their insured objects (boats, motors, trailers)
- **Workflow**: Only view and possibly print their overview
- **Access**: Limited to their own organization's objects

### **Editors/Brokers** 
- **Login Flow**: Login → Organizations page 
- **Primary Function**: Add manage and edit insured objects
- **Workflow**: 
- **Access**: Can work across assigned organizations

### **Admins**
- **Login Flow**: AWS Cognito Managed Login (ONLY) → Callback → Organizations page → Full system access
- **Primary Functions**:
  - Monitor pending items in `/pending-overview`
  - Create/edit organizations
  - Full system management
- **Workflow**: System oversight → User support
- **Access**: Full system access
- **⚠️ Important**:
  - Cannot create admin users in UI - must create user, then manually edit DynamoDB `role` field to `"admin"`
  - NO custom login page - AWS Cognito Managed Login ONLY
  - Policy management removed from frontend

## Architecture & Page Structure

### **Framer Integration Pattern**
- Every page uses a `List.tsx` component as the main page component
- Each folder (Organization, Policy, User, etc.) contains a `List.tsx` that generates the entire page
- Overrides are used for specific functionality (e.g., `login_overrides.ts` for login page)
- Navigation happens through URL changes and Framer's page system

### **Page Structure**
```
/login             → AWS Cognito Managed Login initiation (login/loginOverrides.ts)
/callback          → OAuth callback handler (callback/callbackOverrides.ts)
/organizations     → Main landing page after login (Organization/List.tsx)
/policies          → Policy management (Policy/List.tsx)
/users             → User management (User/List.tsx)
/insuredobjects    → Insured objects fleet (insuredObjects/list_insured_objects.tsx)
/pending-overview  → Pending items review (pendingOverview/List.tsx)
/changelog         → System changelog (Changelog/List.tsx)
```

### **Core Components Structure**
**IMPORTANT** 
What happens in my actual front-end is that I use all the list components as an override. The create modules are purely there to be imported by the list and their functionaility therefore can be out of date. List files contain the UI create buttons.
```
Changelog/
  └── List.tsx                    # Changelog page component
Organization/
  ├── List.tsx                    # Main organizations page
  ├── Create.tsx                  # Organization creation form
  └── Appstate.tsx               # State management
Policy/
  ├── List.tsx                    # Policy management page  
  └── Create.tsx                  # Policy creation form
User/
  ├── List.tsx                    # User management page
  └── Create.tsx                  # User creation form
insuredObjects/
  ├── list_insured_objects.tsx    # Main insured objects page
  └── create_insured_object.tsx   # Object creation form
pendingOverview/
  └── List.tsx                    # Pending items review page
login/
  └── loginOverrides.ts          # AWS Cognito login initiation
callback/
  └── callbackOverrides.ts       # OAuth callback handler
components/
  ├── UserInfoBanner.tsx         # User information display
  ├── RoleBasedButton.tsx        # RBAC-aware buttons
  ├── InsuranceButtons.tsx       # Insurance-specific UI elements
  ├── LogoManager.tsx            # Multi-tenant logo management
  ├── EnhancedTotalsDisplay.tsx  # Status-aware premium calculations
  └── GlobalRulesManager.tsx     # Admin-only global acceptance rules
```

## Data Model & Core Concepts

### **Insured Objects**
- **Primary Type**: Boats (main focus of the system)
- **Additional Types**: Motors, Trailers
- **Workflow**: User creates → Pending status → Admin/Editor approves → Active
- **Configuration**: Organization-specific field configurations
- **Auto-approval**: Rule-based automatic approval system

### **Organizations**  
- **Structure**: Can be regular organizations or super organizations
- **Configuration**: Custom field configurations per organization
- **Address Support**: Optional address information
- **Policy Linking**: Can be linked to specific policies
- **Auto-approval Rules**: Organization-specific approval rules

### **Policies**
- **Integration**: Linked to organizations
- **Management**: Created and managed by admins/editors
- **Auto-approval**: Inherits organization's approval configuration

## Role-Based Access Control (RBAC)

Defined in `rbac.ts` with three permission levels:

### **Admin Permissions**
- Full CRUD on all resources
- System configuration access
- User role assignment
- Complete organization management

### **Editor/Broker Permissions**
- Insured objects: Create, Read, Update (no delete, own org only)
- Organizations: Read only (own org only)
- **Cannot**: Delete insured objects, access changelog, manage users, access other organizations

### **User Permissions**
- Insured objects: Read only (own org only)
- Organizations: Read only (own org only)
- Changelog: Read access
- **Cannot**: Create, update, or delete anything; access other organizations

## Technical Implementation

### **Frontend Stack**
- **Framework**: React 19.1.0 with TypeScript
- **Framer Integration**: Override system for page functionality
- **State Management**: React hooks, local component state
- **Styling**: Custom theme system (theme.ts)
- **Icons**: React Icons (Font Awesome)

### **Backend Integration**
- **API Endpoint**: `https://dev.api.hienfeld.io`
- **Authentication**: AWS Cognito Managed Login with JWT tokens
  - **Important**: Uses AWS hosted UI (not custom login form)
  - Flow: Login page → AWS Cognito UI → Callback page → Token exchange
- **API Paths**: Centralized in `utils.ts`
  - `/neptunus/user` - User management
  - `/neptunus/organization` - Organizations
  - `/neptunus/policy` - Policies
  - `/neptunus/insured-object` - Insured objects
  - `/neptunus/schema` - Dynamic field schemas
  - `/neptunus/changelog` - System changelog
- **Session Storage**: Token management for authentication state
- **Field Registry**: Single source of truth for all field definitions in `../APIs/lib/Neptunus/resources/layers/python/utils/field_registry.py`

### **Key Files**

#### **Core Configuration**
- `utils.ts` - API configuration, authentication helpers
- `rbac.ts` - Role-based access control definitions  
- `theme.ts` - Styling and color scheme system
- `main_styling.tsx` - Additional CSS styling

#### **Business Logic**
- `premiumCalculations.tsx` - Premium calculation engine with status-aware calculations
- `hooks/useDynamicSchema.ts` - Dynamic form field management, integrates with Field Registry
- `components/UserInfoBanner.tsx` - User context display with role-based styling
- `components/RoleBasedButton.tsx` - Permission-aware UI components with hide/disable/request behaviors
- `components/InsuranceButtons.tsx` - Pre-configured action buttons for insurance operations
- `components/LogoManager.tsx` - Multi-tenant logo upload and management
- `components/EnhancedTotalsDisplay.tsx` - Status-aware premium calculations display
- `components/GlobalRulesManager.tsx` - Admin-only global acceptance rules management

#### **Page Components**
- Each folder's `List.tsx` serves as the main page component
- `Create.tsx` files handle creation workflows
- Override files (like `loginOverrides.ts`) handle specific page functionality

## Development Context

### **Backend Connection**
- Backend is a CDK application located in `../APIs/lib/Neptunus/`
- Uses Lambda functions and DynamoDB
- Neptune API stack for main architecture
- Frontend connects via REST API calls

### **Import Convention**
**IMPORTANT**: Framer requires capitalized imports for local TypeScript files
```typescript
// Correct for Framer
import { utils } from "./Utils.tsx" 

// Standard (won't work in Framer)
import { utils } from "./utils.tsx"
```

### **Theme System** 
- Current: Individual file styling with shared theme.ts
- **Vision**: Single source of truth for all theming (backlog item)
- Three available color schemes: green (default), blue, purple
- Supports hover states and interactive elements

### **Development Workflow**
- Edit locally due to lack of AI in Framer IDE
- Deploy to Framer for production
- Three-tier user testing (admin, editor, user)

## Navigation & User Experience

### **Tab-Based Navigation**
The main pages feature a tab-based navigation system:
- **Organizations** (current/active)
- **Policies** 
- **Pending Items** (with notification badge)
- **Users** (admin/editor only)
- **Changelog** (admin/editor only)

### **Role-Based UI**
- UI elements show/hide based on user permissions
- Action buttons adapt text based on user role
- Tooltips provide role-appropriate guidance
- RBAC-aware components prevent unauthorized actions

## Status & Next Steps

### **Current State**
- Core CRUD functionality implemented
- RBAC system fully functional
- Multi-object type support (boats, motors, trailers)
- Auto-approval system in place
- Field Registry system (`..APIs/lib/Neptunus/resources/layers/python/utils/field_registry.py`) implemented as single source of truth
- Active migration from hardcoded field values to Field Registry system
- **Full Admin Field Control**: Admins can now configure visibility and requirements for ALL fields

### **Known Issues & Limitations**
- **Field Registry Scope**: Field Registry currently only covers insured objects, needs expansion to organizations, policies, and users
- **Admin Creation**: Cannot create admin users in UI - requires manual DynamoDB `role` field edit from `"user"` to `"admin"`
- **Theme System**: Not centralized - styles exist in multiple files with hardcoded colors (theme.tsx not uniformly used, main_styling.tsx not actively used)
- **Deprecated Components**: login/loginOverrides.ts is deprecated (AWS Cognito Managed Login only), Policy pages completely removed

### **Backlog/Future Improvements**
- **Complete Field Registry Migration**: Remove all hardcoded field definitions from frontend
- **Expand Field Registry Scope**: Add organization, policy, and user field definitions to single source of truth
- **Unified Theme System**: Centralize all styling in single theme file (single source of truth)
- **Enhanced UI/UX**: Improve mobile responsiveness, loading states, error messages
- **Advanced Reporting**: Export capabilities, custom report builder, scheduled reports
- **Performance Optimizations**: Data caching, pagination, bundle size optimization, lazy loading

## Key Architecture Decisions

1. **Framer Override Pattern**: Each page uses List.tsx as main component with targeted overrides
2. **RBAC-First Design**: All UI components respect role-based permissions
3. **Dynamic Schema**: Organizations can configure which fields are visible/required
4. **Auto-Approval System**: Rules-based approval to reduce manual review workload
5. **Multi-Object Support**: Extensible system for different types of insured objects


## Field Registry System Architecture

### **Purpose**
Centralized field definition system to eliminate hardcoded values and ensure consistency across backend and frontend.

### **Current Implementation**
- **Location**: `../APIs/lib/Neptunus/resources/layers/python/utils/field_registry.py`
- **Scope**: Currently insured objects only
- **Frontend Integration**: Reference system (no direct imports due to Framer constraints)
- **Status**: Active migration from legacy hardcoded values

### **Target State**
- **Complete Coverage**: All entity types (insured objects, organizations, policies, users)
- **Zero Hardcoding**: No field definitions in frontend components
- **Single Source**: All field metadata centralized in Field Registry
- **Dynamic Configuration**: Frontend automatically reflects Field Registry changes

This architecture supports the insurance company's need for flexible, role-based management of insured objects while maintaining strict access controls and approval workflows.