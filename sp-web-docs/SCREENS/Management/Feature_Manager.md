# Feature Manager

The Feature Manager acts as the global catalog for platform features, enabling the definition of features and the strict mapping of service permissions required to run them.

## Key Concepts
- **Feature Identity**: Each feature has a unique `Feature Key`, `Display Name`, `Description`, and `Type` (Basic, Advanced, Premium).
- **Add-ons**: Features can be marked as `Is Add-on`, allowing them to be sold separately.
- **Service Permissions**: A feature is essentially a collection of permissions distributed across one or multiple underlying microservices (e.g., `identity`, `master`, `hrms`).

## Workflows

### 1. Defining a New Feature
1. Click **New Feature** to open the definition form.
2. Provide the basic metadata (Key, Name, Description, Type, Add-on status).

### 2. Multi-Service Permission Builder
1. **Adding Services**: Select a service from the "+ Add Service Permissions" dropdown. The service is added as a dedicated block, and the dropdown intelligently removes it from available options to prevent duplicates.
2. **Building Permissions**:
   - Within a service block, select a **Resource** (e.g., `User`).
   - Select an **Action** (e.g., `CREATE`). The action dropdown dynamically filters out actions that have already been assigned to that specific resource within this service, ensuring no duplicate `Resource:Action` combinations.
   - Click **Add Permission** to finalize.
3. **Assigning Initial Constraints**:
   - Before hitting "Add Permission", you can click **+ Assign Constraint**.
   - This opens a constraint builder where you can define strict limits, quotas, or gamified overage rules (e.g., "Monthly Document Limit", "Allow Overage: True").
   - These constraints are temporarily attached to the builder state and are permanently attached to the permission once added.

### 3. Managing Built Permissions
- **Permission Pills**: Once added, permissions render as stylish pill tags (e.g., `User : CREATE`).
- **Constraint Badges**: Any constraints attached to the permission render directly inside the pill.
- **Editing Constraints**: Next to the constraint badges in the pill, there is an **Edit** icon. Clicking this opens a full-screen **Edit Constraints Dialog**.
  - In the dialog, you can view the existing constraints.
  - Remove unwanted constraints.
  - Add new constraints directly to that specific permission block using the integrated `AssignConstraint` dropdown.
