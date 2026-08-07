# User Manager

The User Manager screen provides centralized administration for all users within the tenant and handles dynamic employment assignments across multiple companies.

## Core Capabilities

### 1. Global User Administration (Tenant Context)
- Adds users to the global tenant by capturing Basic Information (First Name, Last Name, Personal Email, Phone Number).
- Allows administrators to optionally assign a user directly to a specific company and branch during the initial creation flow.
- Features dynamic field visibility: 
  - Selecting a company reveals the **Official Email** (`userCompanyEmail`) input.
  - Selecting **Employee** as the User Type reveals specific HR inputs like **Employee Code** and **Salary Package**.

### 2. Company-Specific Administration (Company Context)
- The same underlying form component gracefully adapts when accessed from within a specific company.
- Hides the Company and Branch selection dropdowns as the context is already known.
- Only captures Basic Info and User Type, maintaining streamlined UI workflows while still enforcing appropriate data collection.

### 3. Data Schema Dependencies
- Relies on the `CompanyUser` database schema (`_database/companyUser.db.ts`) which tracks employment start/end dates, user status, official emails (`userCompanyEmail`), and other metadata.
- Shares the `CompanyUserResponse` model from `@superpersova/shared` for standardized type-safety across frontend and backend boundaries.

## Key Components

- **`UsersManager.tsx`**: The main page container that lists all users and orchestrates the add/import features. Passes the `TENANT` context flag.
- **`UserAddForm.tsx`**: A context-aware, glassmorphic UI component handling dynamic state and validations.
- **`DataImportForm.tsx`**: Provides batch-upload functionality (e.g., CSV imports) scoped specifically to the `USER` resource type.
