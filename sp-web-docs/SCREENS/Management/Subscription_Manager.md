# Subscription Manager

The Subscription Manager allows tenants to view available subscription plans, and for administrators to manage plan features, pricing, and access overrides.

## Key Concepts
### Context Separation: Platform vs. Tenant
It is critical to distinguish between the two contexts in which subscriptions operate. They use different database models and must call different APIs to save their respective information:

1. **Platform Context (Global Definition)**
   - Models: `SubscriptionPlan.db.ts` and `SubscriptionPlanFeature.db.ts`
   - Purpose: Used by Platform Administrators to build and offer subscription packages.
   - Data: Defines the base tiers (FREE, PRO), pricing structures, and maps global features to the plans with base overrides.

2. **Tenant Context (Active Subscriptions)**
   - Models: `TenantSubscription.db.ts` and `TenantFeature.db.ts`
   - Purpose: Used when a Tenant actually subscribes to a plan.
   - Data: Holds tenant-specific lifecycles (start date, auto-renew status, billing cycle). Tenants can upgrade or modify their active subscription later, which updates the `TenantSubscription` models, *not* the global platform models.

### Terminology
- **Subscription Plans**: Global tiers of service offered by the Platform (e.g., Free Forever, Pro Tier).
- **Plan Features**: The global features attached to a specific Platform plan.
- **Overrides**: The ability to disable specific permissions within an attached feature, or apply custom constraint values specifically for that plan.

## Workflows

### 1. Plan Catalog & Current Active Plan
- The main view highlights the **Current Active Plan** in a premium hero card, displaying the billing cycle, renewal status, and start date. It includes a **"Manage Tenant Features"** button allowing the Tenant Admin to configure their own features.
- Below it, a **Plan Catalog** grid lists all globally defined plans with their pricing and tier (`FREE`, `PRO`, `ENTERPRISE`). Platform Admins can drill into these.
- You can create new plans using the **New Plan** form.

### 2. Manage Tenant Features (Tenant Context)
- Accessed by clicking **"Manage Tenant Features &rarr;"** on the Current Active Plan banner.
- **Purpose**: Allows a Tenant Administrator to manage their organization's features directly (`TenantFeature.db.ts`).
- **Functionality**:
  - Toggling specific feature permissions on or off (e.g., disabling 'CREATE' action for 'Document' for their own users).
  - Adding or overriding constraints specific to their tenant (e.g., purchasing additional 'Monthly Document Limit' quota).
- This view operates independently of the global plans, ensuring that any modifications apply strictly to this tenant's active subscription.

### 2. Manage Features Configurator
Clicking **Manage Features ->** on any plan drills down into its specific configuration view.

#### Attaching Global Features
- Use the "+ Add Global Feature" dropdown to attach a pre-defined feature (created in the Feature Manager) to this plan.
- **Strict Adherence**: You cannot add *new* permissions or services here. You are strictly bound to the base permissions defined by the global feature. The configurator acts as a subset filter of the global feature.

#### Permission Toggling
- Every permission under the feature is listed.
- By default, all permissions are enabled for the plan.
- You can **toggle off** specific permissions (e.g., disabling `User:DELETE` on the Free tier).
- Disabled permissions render with a sleek strikethrough effect and are functionally disabled for subscribers of this plan.

#### Plan-Specific Constraint Overrides
- For any *enabled* permission, you can click **+ Override Constraint**.
- This spawns the `AssignConstraint` block, allowing you to attach new constraints or override existing ones specifically for this plan.
- Examples: 
  - Overriding the "Monthly Document Limit" constraint to allow 500 documents on the Pro plan, vs 100 on the Free plan.
  - Modifying overage rates for specific tiers to introduce gamified pricing mechanisms.
