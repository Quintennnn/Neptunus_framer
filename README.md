# Insurance Boat Management System - Framer Frontend

A comprehensive insurance boat management system built with React, TypeScript, and Framer for managing insured objects (boats, motors, trailers) with role-based access control and dynamic field configuration.

## Table of Contents

1. [Overview](#overview)
2. [Framer Deployment Pattern](#framer-deployment-pattern)
3. [System Architecture](#system-architecture)
4. [Core Components](#core-components)
5. [Backend Integration](#backend-integration)
6. [Role-Based Access Control](#role-based-access-control)
7. [Data Model & Key Concepts](#data-model--key-concepts)
8. [Troubleshooting](#troubleshooting)
9. [Project Structure](#project-structure)
10. [Known Limitations & Future Improvements](#known-limitations--future-improvements)
11. [Quick Reference](#quick-reference)

---

## Overview

### What This System Does

This is a multi-tenant insurance management platform that enables insurance companies to manage their clients' insured objects (primarily boats, but also motors and trailers). The system features:

- **Role-Based Access Control (RBAC)**: Three distinct user types (Admin, Editor/Broker, User/Organization Owner)
- **Dynamic Field Configuration**: Organization-specific field visibility and requirements
- **Multi-Tenant Architecture**: Organization-scoped data with custom logos and configurations
- **Status Workflow Management**: Pending → Insured/Rejected/Removed workflow for insured objects
- **Premium Calculations**: Status-aware premium calculations with period and yearly views

### Technology Stack

- **Framework**: React 19.1.0 with TypeScript
- **Deployment Platform**: Framer (override system)
- **Styling**: Custom theme system (WIP - some hardcoded colors still exist)
- **Icons**: React Icons (Font Awesome)
- **Authentication**: AWS Cognito Managed Login ONLY (no custom login page)
- **Backend**: AWS CDK with Lambda Functions + DynamoDB
- **API**: REST API at `https://dev.api.hienfeld.io`

### Key Features

✅ Three-tier role-based permissions (Admin, Editor, User)
✅ Organization-specific field configurations
✅ Auto-approval rules for insured objects
✅ Multi-tenant logo management
✅ Status-aware premium calculations
✅ Comprehensive changelog tracking
✅ Dynamic schema system with Field Registry integration

---

## Framer Deployment Pattern

### 🔑 Critical Concept: The Override System

This project uses a **unique deployment pattern** that is essential to understand:

```
┌─────────────────────┐      ┌─────────────────────┐      ┌─────────────────────┐
│  VS Code            │      │  Framer Platform    │      │  Live Deployed      │
│  Development        │ ───> │  (Override)         │ ───> │  Page               │
│                     │      │                     │      │                     │
│  - Edit List.tsx    │      │  - Copy code        │      │  - Working web page │
│  - Edit components  │      │  - Paste as         │      │  - User interaction │
│  - Local testing    │      │    override         │      │  - Full CRUD        │
└─────────────────────┘      └─────────────────────┘      └─────────────────────┘
```

### How It Works

1. **Development**: Code is written locally in VS Code
2. **Deployment**: Code is manually copied from VS Code to Framer as "overrides"
3. **Framer Pages**: Each Framer page has a `List.tsx` component attached as an override
4. **Live Site**: The override generates the entire working web page

### List.tsx Pattern

**Every main page folder contains a `List.tsx` file** that serves as the complete page component:

- **Organization/List.tsx** → Organizations management page
- **insuredObjects/list_insured_objects.tsx** → Insured objects fleet page
- **pendingOverview/List.tsx** → Pending review queue page
- **Changelog/List.tsx** → System activity log page
- **User/List.tsx** → User management page

**Note**: Policy management page has been removed from the system.

### Helper Files vs. Page Components

- **List.tsx files**: Complete page components deployed to Framer
- **Create.tsx files**: Form components imported by List.tsx for CRUD operations
- **Other files**: Utilities, hooks, and shared components used by page components

### Framer-Specific Conventions

#### ⚠️ Import Capitalization Requirement

Framer requires **capitalized imports** for local TypeScript files:

```typescript
// ✅ Correct (Framer compatible)
import { utils } from "./Utils.tsx"
import { checkPermission } from "./Rbac.ts"

// ❌ Incorrect (won't work in Framer)
import { utils } from "./utils.tsx"
import { checkPermission } from "./rbac.ts"
```

### Deployment Steps

1. Make changes in VS Code
2. Test locally (if possible)
3. Copy the `List.tsx` file content
4. Open Framer project
5. Navigate to the corresponding page
6. Paste code into the override section
7. Test in Framer preview
8. Test with all three user roles (admin, editor, user)
9. Publish to production

### Three-Tier Testing Requirement

**Always test changes as all three user types:**

- **Admin**: Full system access
- **Editor/Broker**: Limited to assigned organizations
- **User/Organization Owner**: Limited to own organization only

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend (Framer)                            │
│  - React 19.1.0 + TypeScript                                    │
│  - Role-based UI components                                     │
│  - Dynamic form generation                                      │
└──────────────────────────┬──────────────────────────────────────┘
                          │
                          ↓ HTTPS
                          │
┌──────────────────────────┴──────────────────────────────────────┐
│                   API Gateway                                    │
│  https://dev.api.hienfeld.io                                    │
│  - /neptunus/user                                               │
│  - /neptunus/organization                                       │
│  - /neptunus/insured-object                                     │
│  - /neptunus/schema                                             │
│  - /neptunus/changelog                                          │
└──────────────────────────┬──────────────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
              ↓                       ↓
    ┌─────────────────┐    ┌─────────────────┐
    │  AWS Cognito    │    │ Lambda Functions│
    │  (Managed Login)│    │  + Field Registry│
    └─────────────────┘    └────────┬────────┘
                                    │
                                    ↓
                          ┌─────────────────┐
                          │   DynamoDB      │
                          │  - Organizations│
                          │  - Policies     │
                          │  - Insured Objs │
                          │  - Users        │
                          │  - Changelog    │
                          └─────────────────┘
```

### Authentication & User Role Flow

```
Application Start
         │
         ↓ Redirects to
         │
┌────────┴──────────────────┐
│ AWS Cognito Managed Login │  ← Hosted by AWS
│  (AWS Hosted UI ONLY)     │    NO custom login page
└────────┬──────────────────┘
         │
         ↓ OAuth Code
         │
┌────────┴────────┐
│  Callback Page  │  ← Handles token exchange
│ (OAuth Handler) │
└────────┬────────┘
         │
         ↓ Stores JWT
         │
┌────────┴────────┐
│ Session Storage │
│  (JWT Token)    │
└────────┬────────┘
         │
         ↓ Role-based redirect
         │
    ┌────┴────┐
    │         │
    ↓         ↓
┌───────┐  ┌──────────────────┐
│ Admin │  │ User/Org Owner   │
│Editor │  │                  │
└───┬───┘  └────────┬─────────┘
    │               │
    ↓               ↓
Organizations   Insured Objects
   Page         (Own org only)


⚠️  Note: Cannot create admins in the UI
    Workaround: Create user → Edit DynamoDB role field to "admin"

⚠️  Note: Login page component is DEPRECATED - AWS Cognito Managed Login only
```

### Component Hierarchy

```
Page Components (List.tsx files)
├── Configuration
│   ├── utils.ts (API config, auth, validation)
│   ├── rbac.ts (37 permissions, 3 roles)
│   ├── theme.tsx (3 color schemes)
│   └── main_styling.tsx (CSS classes)
│
├── Business Logic
│   └── premiumCalculations.tsx (Status-aware calculations)
│
├── Hooks
│   └── useDynamicSchema.ts (Field Registry integration)
│
└── Shared Components
    ├── UserInfoBanner.tsx (User context display)
    ├── RoleBasedButton.tsx (Permission-aware buttons)
    ├── InsuranceButtons.tsx (Pre-configured actions)
    ├── LogoManager.tsx (Multi-tenant logos)
    ├── EnhancedTotalsDisplay.tsx (Premium breakdowns)
    └── GlobalRulesManager.tsx (Acceptance rules)
```

### Navigation Structure

The system uses a tab-based navigation pattern:

- **Organizations** (Admin/Editor landing page)
- **Pending Items** (Admin/Editor only, shows notification badge)
- **Users** (Admin/Editor only)
- **Changelog** (Admin/Editor only)
- **Insured Objects** (User landing page, Admin/Editor access via org)

**Note**: Policies tab has been removed from the navigation.

---

## Core Components

### Feature-Based Overview

#### 🔐 Authentication Flow

**Components**: `callback/`

The authentication system uses **AWS Cognito Managed Login ONLY**:

- **callback/callbackOverrides.ts**: Handles OAuth callback and token exchange

**Important**: There is NO custom login page. The system uses AWS Cognito's hosted UI exclusively, which handles all authentication and redirects back to the callback page with an OAuth code.

**Flow**:
1. User navigates to application
2. AWS Cognito Managed Login UI (hosted by AWS)
3. User authenticates with AWS Cognito
4. Cognito redirects to callback page with OAuth code
5. Callback page exchanges code for JWT tokens
6. Tokens stored in session storage
7. User redirected based on role

**Note**: The login page component (`login/loginOverrides.ts`) is **deprecated** and no longer in use.

#### 🏢 Organization Management

**Components**: `Organization/`

Admin and Editor workflows for managing insurance organizations:

- **Organization/List.tsx**: Main organizations page with CRUD operations
- **Organization/Create.tsx**: Organization creation form
- **Organization/Appstate.tsx**: State management for organizations

**Functionality**:
- Create/edit/delete organizations
- Configure organization-specific field visibility
- Manage organization logos
- Set up auto-approval rules

**Note**: The Policy management page and components have been **completely removed** from the system.

#### ⛵ Insured Objects Management

**Components**: `insuredObjects/`

Core functionality for managing boats, motors, and trailers:

- **list_insured_objects.tsx**: Main fleet management page
- **create_insured_object.tsx**: Object creation form

**Features**:
- Multi-object type support (boats, motors, trailers)
- Organization-specific field configurations
- Status workflow (Pending → Insured/Rejected/Removed)
- Auto-approval based on rules
- Premium calculations
- Export to Excel
- Print functionality

#### 👥 User Management

**Components**: `User/`

Admin-only interface for user management:

- **User/List.tsx**: User management page
- **User/Create.tsx**: User creation form

**Important Limitation**: The system **cannot create admin users directly**. To create an admin:

1. Create a regular user through the UI
2. Navigate to DynamoDB
3. Find the user record
4. Manually edit the `role` field to `"admin"`

This is a design limitation, not a bug.

#### 📋 Review & Activity Tracking

**Components**: `pendingOverview/`, `Changelog/`

Tools for reviewing pending items and tracking system activity:

- **pendingOverview/List.tsx**: Approval queue for pending insured objects
- **Changelog/List.tsx**: System-wide activity log

**Functionality**:
- Review pending insured objects
- Approve or reject submissions
- View detailed change history
- Filter by action type and user

---

### Component Reference (By Type)

#### Configuration Files

**utils.ts**
Central utilities hub containing:
- API base URL and endpoint paths
- Authentication helpers (token management, user info extraction)
- Validation functions (email, currency, promillage, year)
- HTTP request helpers (`apiRequest`, `createAuthHeaders`)
- Premium calculation utilities
- Form validation and formatting

**rbac.ts**
Role-based access control system:
- Three roles: admin, editor, user
- 37 granular permissions
- Permission checking functions
- Field-level edit restrictions based on status
- Resource-scoped permissions (organization access)

**theme.tsx**
Styling system with comprehensive style definitions:
- Three color schemes: green, blue (current), purple
- All UI element styles (buttons, tables, modals, forms)
- Hover effects and animations
- Navigation and action button styles
- **⚠️ WIP**: Some hardcoded colors still exist throughout the codebase

**main_styling.tsx**
Additional CSS styling (not currently in active use):
- Design tokens and CSS variables
- CSS classes for tables, buttons, and forms
- Responsive grid layouts
- **Note**: This file exists but is not actively used yet

#### Business Logic

**premiumCalculations.tsx**
Premium calculation engine with:
- Status-aware calculations (Insured, Pending, Rejected, Removed)
- Support for percentage and fixed amount methods
- Period vs. yearly premium calculations
- Insurance period logic
- Enhanced totals with status breakdowns

#### Custom Hooks

**hooks/useDynamicSchema.ts**
Dynamic field schema management:
- Fetches organization-specific field configurations
- Filters fields by object type (boat, motor, trailer)
- Separates user input fields from system fields
- Manages field visibility, editability, and requirements
- Integrates with backend Field Registry

#### Shared Components

**UserInfoBanner.tsx**
User information display banner:
- Shows current user and role with icons
- Displays active organization context
- Broker contact information for users
- Logout functionality
- Role-specific styling

**RoleBasedButton.tsx**
RBAC-aware button component:
- Three behaviors: hide, disable, request (permission-based)
- Multiple variants: primary, secondary, danger, create, edit, delete
- Permission checking before rendering
- Loading states and tooltips

**InsuranceButtons.tsx**
Pre-configured insurance-specific buttons:
- Policy management buttons (New, Edit, Delete, Approve)
- Organization management buttons
- User management buttons
- Dropdown action menus with portal rendering
- Compound action button groups

**LogoManager.tsx**
Multi-tenant logo management:
- Base64 image encoding/storage
- Drag-and-drop file upload
- File validation (type, size limits)
- Organization-specific logo storage
- Logo preview and deletion

**EnhancedTotalsDisplay.tsx**
Status-aware totals display:
- Breakdown by status (Insured, Removed, Pending, Rejected)
- Period premium vs. yearly premium comparison
- Collapsible detailed breakdown
- Compact and full display modes

**GlobalRulesManager.tsx**
Admin-only global acceptance rules:
- Template CRUD operations
- Rule duplication functionality
- Usage tracking for templates
- Pricing configuration (premium and eigen risico)

---

## Backend Integration

### API Endpoint Structure

**Base URL**: `https://dev.api.hienfeld.io`

**Available Endpoints**:

| Endpoint | Purpose |
|----------|---------|
| `/neptunus/user` | User management (CRUD, authentication) |
| `/neptunus/organization` | Organizations (CRUD, configurations) |
| `/neptunus/insured-object` | Insured objects (CRUD, status changes) |
| `/neptunus/schema` | Dynamic field schemas (organization-specific) |
| `/neptunus/changelog` | System activity log (read-only) |

**Note**: Policy endpoints may exist in backend but are no longer used by the frontend.

### Authentication Flow Detail

```
Frontend Request
      ↓
1. Check sessionStorage for JWT token
      ↓
2. If token exists, add to Authorization header
      ↓
3. Make API request with authenticated headers
      ↓
4. AWS Cognito validates JWT token
      ↓
5. Lambda function processes request
      ↓
6. Response returned to frontend
      ↓
7. If 401 Unauthorized → redirect to login
```

**Token Storage**: JWT tokens are stored in browser `sessionStorage`:
- `idToken`: User identity token
- `accessToken`: API access token
- `refreshToken`: Token refresh capability

### Request/Response Patterns

**Standard Request**:
```
GET/POST/PUT/DELETE /neptunus/{resource}
Headers:
  - Authorization: Bearer {idToken}
  - Content-Type: application/json
Body (for POST/PUT):
  - JSON payload with resource data
```

**Standard Response**:
```
Success (200/201):
{
  "message": "Success message",
  "data": { /* resource data */ }
}

Error (400/401/403/500):
{
  "error": "Error message",
  "details": "Additional information"
}
```

### Field Registry System

**Location**: `../APIs/lib/Neptunus/resources/layers/python/utils/field_registry.py`

**Purpose**: Centralized field definition system to eliminate hardcoded values and ensure consistency between backend and frontend.

**Current Scope**: Insured objects only

**How It Works**:
1. Backend defines all field metadata in Field Registry
2. Frontend fetches field schemas via `/neptunus/schema` endpoint
3. `useDynamicSchema` hook processes and provides field configurations
4. Forms dynamically render based on fetched schemas

**Field Configuration Options**:
- Visibility (show/hide fields per organization)
- Requirements (required/optional)
- Editability (editable/read-only based on status)
- Order (display sequence)
- Validation rules

**Future Expansion**: Planned to expand to organizations, policies, and users.

---

## Role-Based Access Control

### Three User Types

#### 1. Admin

**Full System Access**

- **Permissions**: All 37 permissions (full CRUD on all resources)
- **Landing Page**: Organizations page
- **Capabilities**:
  - Manage all organizations, policies, users, and insured objects
  - Configure field visibility and requirements
  - Access pending review queue
  - View system changelog
  - Set up auto-approval rules

**⚠️ Admin Creation Limitation**:
Cannot create admins directly in the UI. Must create a user, then manually edit the DynamoDB `role` field to `"admin"`.

#### 2. Editor / Broker

**Single Organization Management**

- **Permissions**: Can manage insured objects within their own organization only
- **Landing Page**: Organizations page
- **Capabilities**:
  - Create/read/update insured objects (no delete, own org only)
  - View own organization (read-only)
  - Access pending review queue
  - **Cannot**: Delete insured objects, manage users, modify organizations, view changelog, access other organizations

#### 3. User / Organization Owner

**Single Organization Read-Only Access**

- **Permissions**: Can only view their own organization's information
- **Landing Page**: Insured Objects page (automatically filtered to their organization)
- **Capabilities**:
  - Read insured objects (own org only)
  - View own organization details (read-only)
  - View system changelog
  - **Cannot**: Create, update, or delete anything; access other organizations; manage users

### Permission Matrix (Simplified)

| Resource | Admin | Editor | User |
|----------|-------|--------|------|
| Organizations | Full CRUD | Read (own only) | Read (own only) |
| Insured Objects | Full CRUD | Create, Read, Update (own org only) | Read (own org only) |
| Users | Full CRUD | - | - |
| Changelog | Read | - | - |
| Field Config | Full CRUD | - | - |

### RBAC in the UI

**Component-Level Access Control**:

Components like `RoleBasedButton` check permissions before rendering:
- **Hide**: Button not shown if user lacks permission
- **Disable**: Button shown but disabled with tooltip explaining why
- **Request**: Button triggers permission request flow

**Conditional Rendering**:

Many UI elements conditionally render based on permissions:
```
if (checkPermission(userPermissions, 'update', 'insured-object')) {
  // Show edit button
}
```

**Status-Based Edit Restrictions**:

Even users with edit permissions have restrictions based on object status:
- **Pending**: Limited fields editable
- **Insured**: Most fields locked
- **Rejected/Removed**: Read-only

---

## Data Model & Key Concepts

### Insured Objects

**Types**: Boats (primary), Motors, Trailers

**Key Fields**:
- Basic info: name, type, organization
- Registration: registration number, year built
- Insurance: policy, premium, eigen risico (deductible)
- Status: Pending, Insured, Rejected, Removed
- Dates: insurance start/end dates

**Status Workflow**:
```
Created → Pending
            ↓
        ┌───┴───┐
        ↓       ↓
    Insured  Rejected
        ↓
    Removed
```

**Status Meanings**:
- **Pending**: Awaiting admin/editor approval
- **Insured**: Active insurance policy
- **Rejected**: Denied by admin/editor
- **Removed**: Previously insured, now removed from policy

### Organizations

**Types**: Regular organizations, Super organizations

**Key Features**:
- Name, address, contact information
- Custom logo upload (multi-tenant)
- Field visibility configurations (per object type)
- Auto-approval rules
- Policy linking

**Field Configuration**:

Organizations can customize which fields are:
- Visible (shown/hidden)
- Required (mandatory/optional)
- Editable (when in different statuses)

### Policies

**Status**: Policy management has been removed from the frontend.

Policy-related functionality may exist in the backend but is no longer accessible through the UI.

### Relationships

```
Organization (1) ──── (Many) InsuredObjects
```

---

## Troubleshooting

### Framer-Specific Issues

#### Deprecated Login Page

**Symptom**: References to login page or login component
**Cause**: Login page is deprecated, system uses AWS Cognito Managed Login only
**Solution**: Remove any references to custom login page. All authentication happens through AWS Cognito hosted UI → callback page.
**Note**: The `login/loginOverrides.ts` file is deprecated and should not be used.

#### Import Capitalization Errors

**Symptom**: Module not found errors in Framer
**Cause**: Local imports must be capitalized in Framer
**Solution**: Change `import { x } from "./utils.tsx"` to `import { x } from "./Utils.tsx"`

#### Override Not Updating

**Symptom**: Changes not reflected in Framer preview
**Cause**: Code not properly copied to override
**Solution**:
1. Re-copy entire `List.tsx` content
2. Paste into Framer override
3. Hard refresh Framer preview (Cmd/Ctrl + Shift + R)

#### Component Not Rendering

**Symptom**: Blank page or partial render
**Cause**: Syntax error or missing import
**Solution**:
1. Check browser console for errors
2. Verify all imports are capitalized
3. Ensure no TypeScript errors in code

### Authentication Issues

#### Infinite Redirect Loop

**Symptom**: Continuously redirected between login and callback
**Cause**: Token not being stored properly
**Solution**:
1. Clear session storage
2. Log out completely
3. Log back in
4. Check that `sessionStorage` contains `idToken`

#### Token Expiration

**Symptom**: 401 Unauthorized errors
**Cause**: JWT token expired
**Solution**:
1. Check token expiration time
2. Implement token refresh logic
3. Redirect to login if refresh fails

#### Callback Page Errors

**Symptom**: Error after AWS Cognito redirect
**Cause**: OAuth code exchange failure
**Solution**:
1. Verify AWS Cognito configuration
2. Check callback URL matches configuration
3. Ensure code parameter present in URL
4. Check backend Lambda function logs

### RBAC Permission Problems

#### Admin Creation

**Problem**: Cannot create admin users in UI
**This is by design**: Admin creation requires manual DynamoDB edit
**Workaround**:
1. Create user with role `"user"` in UI
2. Navigate to DynamoDB console
3. Find user table
4. Locate user record
5. Edit `role` field to `"admin"`
6. User must log out and log back in

#### Permission Denied Errors

**Symptom**: "You don't have permission" messages
**Cause**: User role doesn't have required permissions
**Solution**:
1. Check user role in `UserInfoBanner`
2. Verify permission requirements in `rbac.ts`
3. Contact admin to update user role if needed

#### Role-Based UI Not Updating

**Symptom**: UI shows options user shouldn't have access to
**Cause**: Permission check not implemented or token stale
**Solution**:
1. Log out and log back in (refreshes token)
2. Verify `RoleBasedButton` used instead of regular buttons
3. Check permission checks in component code

### Dynamic Schema Issues

#### Organization Fields Not Loading

**Symptom**: Default fields shown instead of org-specific config
**Cause**: Schema fetch failure or Field Registry sync issue
**Solution**:
1. Check network tab for `/neptunus/schema` call
2. Verify organization has field configuration
3. Check backend Field Registry for field definitions
4. Ensure `useDynamicSchema` hook properly initialized

#### Fields Showing Incorrectly

**Symptom**: Wrong fields visible or wrong requirements
**Cause**: Field Registry out of sync with frontend expectations
**Solution**:
1. Check Field Registry in backend (`field_registry.py`)
2. Verify frontend references correct field IDs
3. Clear cache and reload
4. Contact backend team for Field Registry updates

### Testing Requirements

**Always test changes with all three user roles**:
1. **Admin account**: Test full CRUD and configuration changes
2. **Editor account**: Test cross-organization access and limited permissions
3. **User account**: Test single-organization access and read restrictions

**Common test scenarios**:
- Create insured object (all roles)
- Edit insured object (all roles, different statuses)
- Delete insured object (admin only)
- Change organization (admin only)
- Approve pending object (admin/editor only)

---

## Project Structure

```
Framer/
├── Organization/
│   ├── List.tsx                    # Main organizations page component
│   ├── Create.tsx                  # Organization creation form
│   └── Appstate.tsx               # State management
│
├── insuredObjects/
│   ├── list_insured_objects.tsx    # Main insured objects page
│   └── create_insured_object.tsx   # Object creation form
│
├── pendingOverview/
│   └── List.tsx                    # Pending items review page
│
├── Changelog/
│   └── List.tsx                    # System changelog page
│
├── User/
│   ├── List.tsx                    # User management page
│   └── Create.tsx                  # User creation form
│
├── login/
│   └── loginOverrides.ts          # DEPRECATED - No longer in use
│
├── callback/
│   └── callbackOverrides.ts       # OAuth callback handler (AWS Cognito only)
│
├── components/
│   ├── UserInfoBanner.tsx         # User context display
│   ├── RoleBasedButton.tsx        # RBAC-aware buttons
│   ├── InsuranceButtons.tsx       # Pre-configured action buttons
│   ├── LogoManager.tsx            # Multi-tenant logo management
│   ├── EnhancedTotalsDisplay.tsx  # Status-aware calculations
│   └── GlobalRulesManager.tsx     # Admin rules management
│
├── hooks/
│   └── useDynamicSchema.ts        # Dynamic field schema management
│
├── utils.ts                        # API config, auth, validation, calculations
├── rbac.ts                         # Role-based access control system
├── theme.tsx                       # Styling system (WIP - some hardcoded colors exist)
├── main_styling.tsx                # Additional CSS styling (not actively used yet)
├── premiumCalculations.tsx         # Premium calculation engine
│
├── CLAUDE.md                       # AI assistant context (project documentation)
└── README.md                       # This file (developer documentation)
```

### Key Files Quick Reference

| File | Purpose | When to Use |
|------|---------|-------------|
| `utils.ts` | API calls, validation, auth helpers | Making API requests, validating input |
| `rbac.ts` | Permission checking | Adding role-based restrictions |
| `theme.tsx` | UI styling (WIP) | Styling components, colors, buttons (some hardcoded colors still exist) |
| `premiumCalculations.tsx` | Premium logic | Calculating premiums, totals |
| `useDynamicSchema.ts` | Field configurations | Dynamic forms, field visibility |
| `RoleBasedButton.tsx` | RBAC buttons | Adding permission-aware buttons |
| `InsuranceButtons.tsx` | Pre-configured actions | Standard CRUD operations |

---

## Known Limitations & Future Improvements

### Current Limitations

#### Field Registry Scope
**Issue**: Field Registry currently only covers insured objects
**Impact**: Organizations, policies, and users still use hardcoded field definitions
**Workaround**: Manual updates required when changing fields for non-insured-object entities

#### Admin User Creation
**Issue**: Cannot create admin users through the UI
**Impact**: Requires manual DynamoDB edit to create admins
**Workaround**: Create user → Edit DynamoDB role field to "admin"
**Note**: This is a design limitation, not a bug

#### Theme System
**Issue**: Theme system not centralized (styles in multiple files with hardcoded colors)
**Impact**: Inconsistent styling, harder to maintain
**Current State**:
- `theme.tsx` exists but not used uniformly across all components
- Some hardcoded colors still exist throughout the codebase
- `main_styling.tsx` exists but is not actively used yet
**Status**: Work in progress

### Active Development

#### Field Registry Migration
**Status**: In progress
**Goal**: Remove all hardcoded field values from frontend
**Current**: Frontend references Field Registry for insured objects only
**Next**: Expand to organizations, policies, users

#### Admin Field Control
**Status**: Complete for insured objects
**Goal**: Admins can configure visibility and requirements for ALL fields
**Current**: Works for insured object fields per organization
**Next**: Extend to all entity types

### Future Improvements / Backlog

#### Complete Field Registry Migration
- Remove all hardcoded field definitions from frontend components
- Make frontend automatically reflect Field Registry changes
- Eliminate manual frontend updates when backend fields change

#### Expand Field Registry Scope
- Add organization field definitions to Field Registry
- Add policy field definitions to Field Registry
- Add user field definitions to Field Registry
- Single source of truth for all entity types

#### Unified Theme System
- **Status**: Work in progress
- Centralize all styling in single theme file
- Eliminate all hardcoded colors throughout components
- Eliminate inline styles throughout components
- Make `main_styling.tsx` actively used or remove it
- Create comprehensive design token system
- Implement theme switching (green, blue, purple)

#### Enhanced UI/UX
- Improve mobile responsiveness
- Add loading skeletons for better perceived performance
- Implement optimistic UI updates
- Add more comprehensive error messages

#### Advanced Reporting
- Export capabilities for all data types
- Custom report builder
- Scheduled report generation
- PDF report templates

#### Performance Optimizations
- Implement data caching strategies
- Add pagination for large datasets
- Optimize bundle size
- Lazy load components

---

## Quick Reference

### Common Tasks

#### Adding a New Page

1. Create new folder with `List.tsx` file
2. Import necessary utilities (`utils`, `rbac`, `theme`)
3. Add authentication check
4. Add permission checks for RBAC
5. Implement CRUD operations using `apiRequest`
6. Add to Framer as new page with override
7. Test with all three user roles

#### Modifying Permissions

1. Open `rbac.ts`
2. Locate permission definition (e.g., `'update', 'insured-object'`)
3. Modify permission in appropriate role arrays
4. Add permission checks in components using `checkPermission()`
5. Update `RoleBasedButton` usages if needed
6. Test permission changes with affected roles

#### Adding a New Field to Insured Objects

**Current Process (Field Registry)**:
1. Add field definition to Field Registry (`field_registry.py`)
2. Update backend Lambda functions to handle new field
3. Frontend automatically picks up new field via `/neptunus/schema`
4. Test field visibility and requirements per organization

**Legacy Process (Hardcoded - being phased out)**:
1. Update field interfaces in relevant components
2. Add field to form inputs
3. Update validation logic
4. Update API request/response handling

#### Changing Theme Colors

1. Open `theme.tsx`
2. Locate color scheme (currently using blue)
3. Modify color values in scheme object
4. Test throughout application
5. Consider impact on accessibility (contrast ratios)

#### Debugging API Issues

1. Open browser DevTools → Network tab
2. Find failing API request
3. Check request headers (Authorization token present?)
4. Check request payload (valid JSON?)
5. Check response (error message?)
6. Verify endpoint in `utils.ts` matches backend
7. Check backend Lambda logs for detailed errors

### Important Links

- **API Documentation**: Check with backend team
- **Framer Documentation**: https://www.framer.com/developers/
- **Backend Repository**: `../APIs/lib/Neptunus/`
- **Field Registry**: `../APIs/lib/Neptunus/resources/layers/python/utils/field_registry.py`
- **AWS Cognito Console**: Contact DevOps for access
- **DynamoDB Console**: Contact DevOps for access

### Key Contacts

- **Frontend Development**: [Your team contact info]
- **Backend Development**: [Backend team contact info]
- **DevOps / AWS Access**: [DevOps team contact info]
- **Product Owner**: [Product owner contact info]

---

## Additional Resources

### Related Documentation

- **CLAUDE.md**: Comprehensive project context for AI assistants (more detailed, includes implementation specifics)
- **Field Registry Documentation**: See backend repository for field definition guidelines

### Development Best Practices

1. **Always test with all three user roles** before deploying
2. **Use `RoleBasedButton` instead of regular buttons** for CRUD operations
3. **Capitalize all local imports** for Framer compatibility
4. **Check `rbac.ts` before adding new functionality** to understand permission requirements
5. **Use `apiRequest` helper** for all API calls (handles auth headers automatically)
6. **Reference Field Registry** instead of hardcoding field definitions
7. **Follow existing patterns** in similar components for consistency

---

## Version History

**Current Version**: v1.0 (Production)

**Major Changes**:
- Initial production release
- Field Registry system for insured objects
- AWS Cognito Managed Login integration
- Role-based access control (3 tiers)
- Multi-tenant architecture
- Status-aware premium calculations

---

**Need Help?** Check the [Troubleshooting](#troubleshooting) section or contact the development team.

**Found an Issue?** Document it in the project issue tracker or notify the team lead.
