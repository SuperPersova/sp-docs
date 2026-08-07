# SuperPersova Login & Context Switching Flow

This document outlines the authentication, tenant selection, and company switching flows within the SuperPersova Chrome Extension.

## 1. Initial Login & Authentication Flow

The login process is seamlessly managed within the extension UI to provide a native experience without forcing the user to switch back to the web app.

### Steps:
1. **Credentials**: The user submits their `emailOrPhone` and `password`.
2. **Challenge & Hash**: The extension automatically requests a cryptographic `nonce` via the backend challenge endpoint, double-hashes the password securely, and submits the login request.
3. **Tenant Evaluation**: The backend returns the `platformToken`, `authUser` details, and an array of `accessibleTenants` the user belongs to.

### Tenant Auto-Routing:
- **Single Tenant**: If the user has access to exactly **1** tenant, the extension automatically calls the `/api/v1/auth/select-tenant` endpoint behind the scenes, fetches the final `accessToken` and `refreshToken`, securely stores the tenant context, and navigates straight to the Home screen, completely bypassing any selection UI.
- **Multiple Tenants (First Time)**: If the user has access to **2 or more** tenants, the extension updates the UI to present a native "Select Workspace" screen listing the available tenants. The user clicks their desired tenant to proceed into the application.
- **Multiple Tenants (Returning Session)**: If the user re-authenticates (e.g. session expired but store wasn't cleared) and they previously selected a tenant that is still valid in their `accessibleTenants` list, the extension automatically re-selects it and bypasses the selection screen.

## 2. In-App Context Switching (Tenants & Companies)

Once logged in, the user can context-switch via the top-right Profile Dropdown Menu on the PageShell header.

### Tenant (Workspace) Switching
- The **"Workspace"** switch option is conditionally rendered in the dropdown menu. It ONLY appears if `accessibleTenants.length > 1`.
- Clicking it opens a left-side drawer listing the available tenants.
- Upon selecting a new tenant:
  1. The extension requests fresh tokens for the newly selected `tenantId` via `/api/v1/auth/select-tenant`.
  2. The updated `accessToken` and `refreshToken` are synced globally across IndexedDB and Zustand (`authStore`).
  3. The `selectedTenant` context is updated.
  4. The user is instantly redirected to the Home screen (`/`).
  5. The global application state immediately triggers a re-fetch of the Companies associated with the new Tenant.

### Company Switching
- When a Tenant is selected, the application automatically fetches the list of Companies under that Tenant (`identityService.getCompanies()`).
- By default, the application auto-selects the **first** company in the list as the active `selectedCompany`.
- The **"Company"** switch option in the profile dropdown is conditionally rendered. It ONLY appears if `companies.length > 1`.
- Clicking it opens the left-side drawer listing the available companies.
- Upon selecting a new company:
  1. The `selectedCompany` state is updated globally.
  2. The user is instantly redirected to the Home screen (`/`).
  3. UI components automatically begin using the new `selectedCompany.id`.

## 3. Headers and API Payload Rules

The backend strictly controls data access depending on the current context. The extension handles this dynamically:

- **Tenant Context (`x-tenant-id`)**: This is bound securely to the HTTP Headers via the global Axios Interceptor. All requests automatically inherit the `x-tenant-id` matching the `selectedTenant.id` stored in IndexedDB.
- **Company Context (`companyId`)**: This is NOT sent as a global header. Instead, components and services dynamically extract `useAuthStore.getState().selectedCompany?.id` and explicitly inject it into the `filters` body payload of any API request that targets company-specific data (e.g., `getCompanyUsers`, Propulse Stats, Work Items).

## 4. Enterprise Permission System (Tier 1 & Tier 2)

Permissions are strictly scoped to the selected Tenant and evaluated against the specific **User** context. The evaluation hierarchy flows as follows:
1. **User context**: The user belongs to the selected Tenant.
2. **Subscription boundaries**: The Tenant has an active subscription (`TenantSubscription`), which grants access to base modules (`SubscriptionPlanFeature`).
3. **Tenant Customization**: The modules actually provisioned and active for the tenant are stored in `TenantFeature` (which holds tenant-specific overrides, addons, and `featureConfig`).
4. **Role Assignment**: The user is assigned roles (`TenantUserRole` -> `TenantRole`), which define the exact permissions allowed within those provisioned tenant features.

Therefore, feature permissions are dynamically computed for the *user* and can ONLY be fetched **after** Tenant Selection.

### Dictionary vs. Authority
The frontend relies on `@superpersova/shared/src/constants/permissions.ts` (`APP_PERMISSIONS`). This file acts as a **Dictionary** defining what locks exist in the system (e.g., `"USER:CREATE"`). 
However, the `/authorize/features` and `/authorize/permissions?feature=X` APIs act as the **Authority** (Bouncer) which evaluates the full hierarchy (Subscription -> Tenant -> Role -> User Assignment) to return a scorecard of what the user is actually allowed to do.

### Tier 1: Feature Entitlements (Macro-Level)
- **When it happens**: Immediately after `authService.selectTenant()` resolves.
- **What it does**: Calls `permissionService.getAllowedFeatures()` to map the user's granular allowed permissions back to active Macro Features (e.g., `feedback_management`). It returns an `O(1)` dictionary containing tenant-specific metadata (`featureConfig`, `customizationLevel`) for every feature the user has access to.
- **How to use**: Used to show/hide major UI blocks like navigation cards and sidebars, or read tenant-specific module configs.
  ```tsx
  const { features } = useAllowedFeatures();
  if (!!features['advanced_reporting']) {
    // Show Reporting Navigation Card
    const config = features['advanced_reporting'].featureConfig;
  }
  ```

### Tier 2: Feature-Scoped Permissions (Micro-Level)
- **When it happens**: Lazily, only when the user clicks into a specific Feature module or page.
- **What it does**: Uses the `useFeaturePermissions(featureKey)` hook to fetch granular actions (e.g., `{ "identity": { "User:CREATE": { allowed: true } } }`).
- **How to use**: Used to conditionally render buttons, forms, and restricted elements. 
  ```tsx
  const { hasPermission } = useFeaturePermissions('core_collaboration');
  
  if (hasPermission('identity.User:CREATE')) {
     <button onClick={addUser}>Add User</button>
  }
  ```
