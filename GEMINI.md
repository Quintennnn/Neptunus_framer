# Insurance Boat Management System - Framer Frontend

## IMPORTANT
whenever you make changes, always list the files you have changed!

## Project Overview
This is a Framer-based frontend for an insurance company's boat management system that handles insured objects (boats, motors, trailers) and policy management. The system serves three distinct user types with role-based access control.

## User Types & Workflows

### **Users/Organization Owners**
- **Login Flow**: Login → Immediate redirect to `/insuredobjects` (their fleet)
- **Primary Function**: Add and manage their insured objects (boats, motors, trailers)
- **Workflow**: Create → Submit for review → Wait for approval
- **Access**: Limited to their own organization's objects

### **Editors/Brokers** 
- **Login Flow**: Login → Organizations page → Navigate to pending items
- **Primary Function**: Help users with policies and applications, review pending items
- **Workflow**: Review pending items → Approve/Edit → Assist users
- **Access**: Can work across assigned organizations

### **Admins**
- **Login Flow**: Login → Organizations page → Full system access
- **Primary Functions**: 
  - Monitor pending items in `/pending-overview`
  - Create/edit organizations and policies
  - Full system management
- **Workflow**: System oversight → Policy management → User support
- **Access**: Full system access

## Architecture & Page Structure

### **Framer Integration Pattern**
- Every page uses a `List.tsx` component as the main page component
- Each folder (Organization, Policy, User, etc.) contains a `List.tsx` that generates the entire page
- Overrides are used for specific functionality (e.g., `login_overrides.ts` for login page)
- Navigation happens through URL changes and Framer's page system

### **Page Structure**
```
/login_old          → Uses loginOverrides.ts
/organizations      → Main landing page after login (Organization/List.tsx)
/policies          → Policy management (Policy/List.tsx)
/users             → User management (User/List.tsx) 
/insuredobjects    → Insured objects fleet (insuredObjects/list_insured_objects.tsx)
/pending-overview  → Pending items review (pendingOverview/List.tsx)
/changelog         → System changelog (Changelog/List.tsx)
```

### **Core Components Structure**
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
  └── loginOverrides.ts          # Login functionality
components/
  ├── UserInfoBanner.tsx         # User information display
  ├── RoleBasedButton.tsx        # RBAC-aware buttons
  └── InsuranceButtons.tsx       # Insurance-specific UI elements
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
- Insured objects: Create, Read, Update (no delete)
- Users: Read only
- Organizations: Read only  
- Policies: Create, Read (no update/delete)
- Changelog access

### **User Permissions**
- Insured objects: Create, Read, Update (no delete, own org only)
- Policies: Read only
- Organizations: Read only (own org only)
- Changelog access

## Technical Implementation

### **Frontend Stack**
- **Framework**: React 19.1.0 with TypeScript
- **Framer Integration**: Override system for page functionality
- **State Management**: React hooks, local component state
- **Styling**: Custom theme system (theme.ts)
- **Icons**: React Icons (Font Awesome)

### **Backend Integration**
- **API Endpoint**: `https://dev.api.hienfeld.io`
- **Authentication**: AWS Cognito with JWT tokens
- **API Paths**: Centralized in `utils.ts`
- **Session Storage**: Token management for authentication state

### **Key Files**

#### **Core Configuration**
- `utils.ts` - API configuration, authentication helpers
- `rbac.ts` - Role-based access control definitions  
- `theme.ts` - Styling and color scheme system
- `main_styling.tsx` - Additional CSS styling

#### **Business Logic**
- `hooks/useDynamicSchema.ts` - Dynamic form field management
- `components/UserInfoBanner.tsx` - User context display
- `components/RoleBasedButton.tsx` - Permission-aware UI components

#### **Page Components**
- Each folder's `List.tsx` serves as the main page component
- `Create.tsx` files handle creation workflows
- Override files (like `loginOverrides.ts`) handle specific page functionality

## Development Context

### **Backend Connection**
- The backend is a CDK application located in a sibling directory to this Framer project.
- **Frontend Project Path:** `C:\Users\Quinten\Desktop\development_local\Framer\`
- **Backend Project Path:** `C:\Users\Quinten\Desktop\development_local\APIs\Neptunus\`
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
- Organization field configuration working

### **Backlog/Future Improvements**
- Unified theme system (single source of truth)
- Enhanced UI/UX consistency
- Advanced reporting features

## Key Architecture Decisions

1. **Framer Override Pattern**: Each page uses List.tsx as main component with targeted overrides
2. **RBAC-First Design**: All UI components respect role-based permissions
3. **Dynamic Schema**: Organizations can configure which fields are visible/required
4. **Auto-Approval System**: Rules-based approval to reduce manual review workload
5. **Multi-Object Support**: Extensible system for different types of insured objects

This architecture supports the insurance company's need for flexible, role-based management of insured objects while maintaining strict access controls and approval workflows.