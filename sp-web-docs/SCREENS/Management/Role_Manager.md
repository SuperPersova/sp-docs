# Roles Manager

The **Roles Manager** screen (`RolesManager.tsx`) allows administrators to create and manage custom roles within their Tenant's workspace. 

## Dynamic Permissions Matrix

Unlike traditional systems where all possible application permissions are listed, the Roles Manager leverages a **Dynamic Permissions Matrix**. This matrix is tightly coupled to the Tenant's **Subscription Plan**.

### How it Works

1. **Plan Identification**: When the user accesses the Roles Manager, the system reads their active subscription plan ID from the globally synced `authStore` (`allowedResourcesData.subscription.planId`).
2. **Real-Time Feature Fetching**: The component makes an API call to `GET /api/v1/platform/plans/:id/features` using the `subscriptionService`. This request goes directly to the database (bypassing caches) to ensure that any recent upgrades or downgrades to the subscription are instantly reflected in the UI.
3. **Dynamic Grouping**: The API returns an array of `ISubscriptionPlanFeature` objects. The UI iterates through this array and renders an accordion group for each included feature (`featureName`).
4. **Scoped Permissions**: Inside each feature accordion, the component maps over the `permissionConstraints` array. Only the specific permissions (`permissionKey`) that the Tenant is actively paying for are displayed as toggle switches.

### Benefits

- **Upsell Protection**: Tenants can only create roles and assign permissions for features they actually have access to.
- **Clutter-Free UI**: The permissions matrix is not bloated with hundreds of irrelevant checkboxes. A basic-tier tenant will only see basic-tier permissions.
- **Real-Time Accuracy**: Because it hits the API dynamically, changes made by an admin on the billing portal immediately update the available matrix options without requiring a hard refresh or relogin.

## API Integration

- **Endpoint**: `GET /api/v1/platform/plans/:id/features`
- **Frontend Service**: `subscriptionService.getPlanFeatures(planId)`
- **Data Model**: `ISubscriptionPlanFeature` (located in `@superpersova/shared/src/models/auth/auth.response.ts`)

```typescript
export interface ISubscriptionPlanFeature {
  id: string;
  subscriptionPlanId: string;
  featureId: string;
  featureName: string;
  included: boolean;
  permissionConstraints?: {
    permissionId?: string;
    permissionKey: string;
    permissionAccessType: string;
    assignedConstraintIds: string[];
  }[];
  // ...
}
```

## Creating a Role
When an admin creates a new role:
1. They enter the **Role Name**.
2. They toggle the specific `permissionKey` items inside the matrix.
3. Upon saving, the selected keys are bundled and attached to the new custom role object.
