# Permission Decision Service (PDS) Implementation

## Overview

The Permission Decision Service (PDS) is an enterprise-grade permission system that provides:

- **Centralized Permission Evaluation**: All permission decisions made in one place
- **Constraint-Based Authorization**: Support for usage limits, rate limits, storage quotas
- **6-Level Override Hierarchy**: Subscription → Tenant Feature → Tenant Config → Tenant Permission → Role → User
- **UI-Ready Permission Maps**: Pre-computed permission decisions with constraint details
- **Scalable Architecture**: Add new resource types without code changes

## Architecture

### Permission Decision Flow

```
User Action Request
    ↓
Check EffectivePermissionMap in Redux
    ↓
Permission Decision {
    action: "WORKFLOW:CREATE"
    allowed: true/false
    constraints: [...]
    relevantUsage: {...}
    sourceLevel: "SUBSCRIPTION" | "ROLE_PERMISSION" | etc.
}
    ↓
UI renders based on decision + constraint messages
```

### Key Components

#### 1. **PDS Schemas** (`src/shared/lib/validation/pdsSchemas.ts`)

Core TypeScript types for PDS:

```typescript
// Constraint evaluation result
type ConstraintEvaluation = {
  type:
    | 'MAX_INSTANCES'
    | 'RATE_LIMIT'
    | 'MAX_STORAGE_MB'
    | 'MAX_BANDWIDTH_MB'
    | 'PLAN_LEVEL'
    | 'CUSTOM';
  satisfied: boolean;
  currentValue?: number;
  threshold?: number;
  unit?: string;
  metric?: string;
  operator?: 'lt' | 'lte' | 'eq' | 'gte' | 'gt';
};

// Permission decision for a single action
type PermissionDecision = {
  action: string; // e.g., "WORKFLOW:CREATE"
  allowed: boolean;
  constraints: ConstraintEvaluation[];
  relevantUsage?: ResourceUsage;
  evaluatedAt: string; // ISO datetime
  sourceLevel:
    | 'SUBSCRIPTION'
    | 'TENANT_FEATURE'
    | 'TENANT_CONFIG'
    | 'TENANT_PERMISSION'
    | 'ROLE_PERMISSION'
    | 'USER_PERMISSION';
  reason?: string; // Optional denial reason
};

// Complete permission map for a user in a tenant
type EffectivePermissionMap = {
  userId: string;
  tenantId: string;
  subscriptionPlanId?: string;
  permissions: Record<string, PermissionDecision>; // Map of action → decision
  usageSnapshot: UsageSnapshot;
  generatedAt: string; // ISO datetime
  expiresAt: string; // ISO datetime (cache expiry)
  cacheKey: string; // Redis cache key
};
```

**Utility Functions:**

- `hasPermission(map, action)` - Check single permission
- `hasAnyPermission(map, actions[])` - OR check
- `hasAllPermissions(map, actions[])` - AND check
- `getPermissionDecision(map, action)` - Get full decision
- `getConstraintMessage(decision, locale)` - Format violation message

#### 2. **Mock Permissions** (`src/shared/lib/pds/mockPermissions.ts`)

Development mock data with 3 permission profiles:

- **Admin**: Full access to all resources
- **Editor**: View + Edit, no delete/create permissions on sensitive resources
- **Viewer**: Read-only access

Sample actions:

- User Management: `USER:VIEW`, `USER:CREATE`, `USER:EDIT`, `USER:DELETE`, `USER:INVITE`
- Role Management: `ROLE:VIEW`, `ROLE:CREATE`, `ROLE:EDIT`, `ROLE:DELETE`, `ROLE:ASSIGN`
- Tenant Management: `TENANT:VIEW`, `TENANT:CREATE`, `TENANT:EDIT`, `TENANT:DELETE`, `TENANT:MANAGE`
- Workflow Management: `WORKFLOW:VIEW`, `WORKFLOW:CREATE`, `WORKFLOW:EDIT`, `WORKFLOW:DELETE`, `WORKFLOW:EXECUTE`
- Analytics: `ANALYTICS:VIEW`, `ANALYTICS:EXPORT`
- Settings: `SETTINGS:VIEW`, `SETTINGS:EDIT`

#### 3. **React Hook** (`src/shared/hooks/usePermissions.ts`)

Convenient hook for permission checks in components:

```typescript
function usePermissions() {
  return {
    hasPermission: (action: string) => boolean,
    hasAnyPermission: (actions: string[]) => boolean,
    hasAllPermissions: (actions: string[]) => boolean,
    getPermissionDecision: (action: string) => PermissionDecision | null,
    getConstraintMessage: (action: string, locale?: string) => string | null,
    isLoaded: boolean,
    permissionMap: EffectivePermissionMap | null,
  };
}
```

#### 4. **Auth Service** (`src/features/auth/services/auth.service.ts`)

New PDS endpoint:

```typescript
getPDSEffectivePermissions: builder.query<PDSEffectivePermissionsResponse, void>({
  query: () => ({
    url: '/api/v1/pds/effective-permissions',
    method: 'GET',
  }),
  // Automatically dispatches setPDSPermissions to Redux
});
```

#### 5. **Auth Slice** (`src/features/auth/model/authSlice.ts`)

Redux state updated with:

```typescript
type AuthState = {
  // ... existing fields
  permissionMap?: EffectivePermissionMap; // NEW: PDS permission map

  // Legacy fields (for backward compatibility)
  permissions: string[];
  roles?: Role[];
  features?: Feature[];
};

// New action
setPDSPermissions(state, action: PayloadAction<EffectivePermissionMap>)
```

## Usage Examples

### 1. Check Permission in Component

```tsx
import { usePermissions } from '@/shared/hooks/usePermissions';

function WorkflowPage() {
  const { hasPermission, getConstraintMessage } = usePermissions();

  const canCreate = hasPermission('WORKFLOW:CREATE');
  const constraintMsg = getConstraintMessage('WORKFLOW:CREATE');

  return (
    <div>
      <Button disabled={!canCreate} title={constraintMsg || undefined}>
        Create Workflow
      </Button>
      {constraintMsg && <p className="text-sm text-muted-foreground">{constraintMsg}</p>}
    </div>
  );
}
```

### 2. Check Multiple Permissions (OR Logic)

```tsx
function AdminPanel() {
  const { hasAnyPermission } = usePermissions();

  // Show panel if user can manage users OR roles
  const canAccessAdminPanel = hasAnyPermission(['USER:MANAGE', 'ROLE:MANAGE']);

  if (!canAccessAdminPanel) {
    return <AccessDenied />;
  }

  return <AdminContent />;
}
```

### 3. Check All Permissions (AND Logic)

```tsx
function AdvancedFeature() {
  const { hasAllPermissions } = usePermissions();

  // Require both permissions
  const canUseFeature = hasAllPermissions(['WORKFLOW:CREATE', 'ANALYTICS:VIEW']);

  return canUseFeature ? <FeatureContent /> : <UpgradeToPro />;
}
```

### 4. Get Detailed Permission Decision

```tsx
function QuotaDisplay() {
  const { getPermissionDecision } = usePermissions();

  const decision = getPermissionDecision('WORKFLOW:CREATE');

  if (!decision) return null;

  const instanceConstraint = decision.constraints.find((c) => c.type === 'MAX_INSTANCES');

  return (
    <div>
      <p>
        Workflows: {instanceConstraint?.currentValue} / {instanceConstraint?.threshold}
      </p>
      {!decision.allowed && decision.reason && <Alert>{decision.reason}</Alert>}
    </div>
  );
}
```

## Authentication Flow with PDS

### Single-Tenant User

```
1. POST /api/v1/auth/login
   Response: {
     accessToken: "...",
     effectivePermissions: {
       cacheKey: "pds:permissions:userId:tenantId",
       generatedAt: "2024-01-15T10:00:00Z",
       expiresAt: "2024-01-15T10:05:00Z",
       permissionCount: 25
     }
   }

2. GET /api/v1/pds/effective-permissions
   Response: {
     status: 200,
     data: {
       userId: "...",
       tenantId: "...",
       permissions: {
         "USER:VIEW": { action: "USER:VIEW", allowed: true, ... },
         "USER:CREATE": { action: "USER:CREATE", allowed: true, ... },
         ...
       },
       usageSnapshot: {...}
     }
   }

3. Redux: setPDSPermissions(data)
4. UI: usePermissions() → hasPermission("USER:VIEW")
```

### Multi-Tenant User

```
1. POST /api/v1/auth/login
   Response: {
     accessToken: "...",
     effectivePermissions: null  // Multi-tenant indicator
   }

2. GET /api/v1/auth/tenants
   Response: [{ tenantId: "1", name: "Acme Corp" }, ...]

3. POST /api/v1/auth/member-login
   Body: { tenantId: "1" }
   Response: { accessToken: "...", tenantId: "1" }

4. GET /api/v1/pds/effective-permissions
   Response: { permissions: {...} }

5. Redux: setPDSPermissions(data)
```

## Constraint Types

### MAX_INSTANCES

Limit total number of resource instances:

```typescript
{
  type: 'MAX_INSTANCES',
  satisfied: false,
  currentValue: 50,
  threshold: 50,
  unit: 'workflows',
  metric: 'instances',
  operator: 'lte'
}
// Message: "You have reached the maximum limit of 50 workflows"
```

### RATE_LIMIT

Limit creation rate:

```typescript
{
  type: 'RATE_LIMIT',
  satisfied: false,
  currentValue: 10,
  threshold: 5,
  unit: 'workflows',
  metric: 'createdToday',
  operator: 'lte'
}
// Message: "You have created 10 workflows today (limit: 5)"
```

### MAX_STORAGE_MB

Storage quota:

```typescript
{
  type: 'MAX_STORAGE_MB',
  satisfied: true,
  currentValue: 250.5,
  threshold: 1000,
  unit: 'MB',
  metric: 'storageMB'
}
// Message: "Storage usage: 250.5 MB / 1000 MB"
```

### PLAN_LEVEL

Subscription tier requirement:

```typescript
{
  type: 'PLAN_LEVEL',
  satisfied: false,
  reason: 'Upgrade to Professional plan'
}
// Message: "Upgrade to Professional plan"
```

## Menu Integration

Update menu items to use PDS action keys:

```typescript
// Before (legacy)
{
  key: 'users',
  label: 'Users',
  icon: UsersIcon,
  to: '/users',
}

// After (PDS)
{
  key: 'users',
  label: 'Users',
  icon: UsersIcon,
  to: '/users',
  permissionAction: 'USER:VIEW', // NEW: PDS action
}
```

Update `menu.service.ts`:

```typescript
function hasResourceAccess(permissionMap: EffectivePermissionMap, action: string): boolean {
  return hasPermission(permissionMap, action);
}

function filterMenuByPermissions(
  items: MenuItem[],
  permissionMap: EffectivePermissionMap,
): MenuItem[] {
  return items
    .filter((item) => {
      if (item.canSkipPermissionCheck) return true;
      if (!item.permissionAction) return true;
      return hasResourceAccess(permissionMap, item.permissionAction);
    })
    .map((item) => ({
      ...item,
      children: item.children ? filterMenuByPermissions(item.children, permissionMap) : undefined,
    }))
    .filter((item) => !item.children || item.children.length > 0);
}
```

## Migration Strategy

### Phase 1: Foundation (✅ Complete)

- [x] Create PDS schemas (`pdsSchemas.ts`)
- [x] Create mock permissions (`mockPermissions.ts`)
- [x] Create `usePermissions()` hook
- [x] Update auth schemas for `effectivePermissions` flag
- [x] Add PDS endpoint to auth service
- [x] Update authSlice with `permissionMap`

### Phase 2: Menu Integration (Next)

- [ ] Add `permissionAction` field to menu items
- [ ] Update `menu.service.ts` to use PDS checks
- [ ] Update Sidebar to use PDS permission map
- [ ] Test menu filtering with different permission profiles

### Phase 3: UI Components (Next)

- [ ] Add permission checks to page-level components
- [ ] Add permission checks to buttons (Create, Edit, Delete)
- [ ] Add constraint messages to disabled buttons
- [ ] Add usage quota displays

### Phase 4: Backend Integration (Future)

- [ ] Implement real PDS backend service
- [ ] Replace mock data with API calls
- [ ] Add permission caching strategy
- [ ] Add permission refresh logic

### Phase 5: Advanced Features (Future)

- [ ] Add real-time usage tracking
- [ ] Add permission audit logs
- [ ] Add admin permission override UI
- [ ] Add subscription plan management

## Testing

### Unit Tests

```typescript
import { hasPermission, getConstraintMessage } from '@/shared/lib/validation/pdsSchemas';
import { MOCK_ADMIN_PERMISSIONS, MOCK_VIEWER_PERMISSIONS } from '@/shared/lib/pds/mockPermissions';

describe('PDS Permissions', () => {
  it('should allow admin to create workflows', () => {
    expect(hasPermission(MOCK_ADMIN_PERMISSIONS, 'WORKFLOW:CREATE')).toBe(true);
  });

  it('should deny viewer from creating workflows', () => {
    expect(hasPermission(MOCK_VIEWER_PERMISSIONS, 'WORKFLOW:CREATE')).toBe(false);
  });

  it('should return constraint message for denied action', () => {
    const message = getConstraintMessage(MOCK_VIEWER_PERMISSIONS.permissions['WORKFLOW:CREATE']);
    expect(message).toContain('Upgrade to Professional plan');
  });
});
```

### Integration Tests

```typescript
describe('usePermissions Hook', () => {
  it('should load permissions after login', async () => {
    const { result } = renderHook(() => usePermissions(), { wrapper: ReduxProvider });

    // Initially not loaded
    expect(result.current.isLoaded).toBe(false);

    // Dispatch login success with PDS permissions
    store.dispatch(setPDSPermissions(MOCK_ADMIN_PERMISSIONS));

    // Should be loaded
    expect(result.current.isLoaded).toBe(true);
    expect(result.current.hasPermission('USER:VIEW')).toBe(true);
  });
});
```

## Best Practices

### ✅ DO

- Use `hasPermission()` for single permission checks
- Use `hasAnyPermission()` for OR logic (show if user can do A OR B)
- Use `hasAllPermissions()` for AND logic (require A AND B)
- Show constraint messages on disabled buttons
- Cache permission maps in Redux (already done)
- Use action naming convention: `RESOURCE:ACTION` (e.g., `USER:CREATE`)

### ❌ DON'T

- Don't check permissions directly in Redux state (use hook)
- Don't duplicate permission logic across components
- Don't bypass permission checks with hardcoded role checks
- Don't forget to show constraint messages to users
- Don't call permission API on every page navigation (use cache)

## Performance Considerations

- **Permission maps are cached**: 5-minute expiry (configurable)
- **Redux persistence**: Permission map survives page refresh
- **Lazy loading**: Permissions loaded only after login/tenant selection
- **No API calls per check**: All checks done in-memory against cached map
- **Menu filtering**: O(n) complexity, runs once per permission map change

## Security Notes

- All permission checks are **advisory only** on the frontend
- Backend must **always enforce permissions** before executing actions
- Frontend permission checks are for **UX optimization** (hide/disable UI elements)
- Never trust frontend permission decisions for security-critical operations
- PDS backend should be the **single source of truth**

## References

- **Enterprise Patterns**: AWS IAM, Google Cloud IAM, Auth0 RBAC
- **PDS Documentation**: `_docs_backend/permission-decision-service/`
- **Auth Architecture**: `docs/developer/architecture.md`
- **Routing Guide**: `docs/developer/routing-guide.md`
