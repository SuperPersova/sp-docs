# PDS Migration Checklist

## Phase 1: Foundation ✅ COMPLETE

- [x] Create PDS schemas (`pdsSchemas.ts`)
  - ConstraintEvaluationSchema
  - PermissionDecisionSchema
  - EffectivePermissionMapSchema
  - Utility functions (hasPermission, hasAnyPermission, etc.)
- [x] Create mock permissions (`mockPermissions.ts`)
  - Admin permission profile (full access)
  - Editor permission profile (limited access)
  - Viewer permission profile (read-only)
- [x] Create `usePermissions()` hook
  - hasPermission(action)
  - hasAnyPermission(actions[])
  - hasAllPermissions(actions[])
  - getPermissionDecision(action)
  - getConstraintMessage(action)
- [x] Update auth schemas
  - Replace `hasMultipleTenants` with `effectivePermissions` flag
  - Add PDSEffectivePermissionsResponseSchema
- [x] Update auth service
  - Add `getPDSEffectivePermissions` endpoint
  - Export `useLazyGetPDSEffectivePermissionsQuery` hook
- [x] Update authSlice
  - Add `permissionMap?: EffectivePermissionMap` to state
  - Add `setPDSPermissions` action
- [x] Create documentation
  - PDS implementation guide
  - Usage examples
  - Migration checklist

## Phase 2: Menu Integration 🔄 NEXT

### Step 1: Define PDS Actions for Menu Items

Update menu configuration to include PDS action keys:

```typescript
// File: src/shared/config/menu.ts or similar

export const menuItems = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: DashboardIcon,
    to: '/dashboard',
    canSkipPermissionCheck: true, // Public route
  },
  {
    key: 'users',
    label: 'Users',
    icon: UsersIcon,
    to: '/users',
    permissionAction: 'USER:VIEW', // NEW: PDS action
  },
  {
    key: 'roles',
    label: 'Roles',
    icon: ShieldIcon,
    to: '/roles',
    permissionAction: 'ROLE:VIEW',
  },
  {
    key: 'workflows',
    label: 'Workflows',
    icon: WorkflowIcon,
    to: '/workflows',
    permissionAction: 'WORKFLOW:VIEW',
  },
  {
    key: 'tenants',
    label: 'Tenants',
    icon: BuildingIcon,
    to: '/tenants',
    permissionAction: 'TENANT:VIEW',
  },
  {
    key: 'analytics',
    label: 'Analytics',
    icon: ChartIcon,
    to: '/analytics',
    permissionAction: 'ANALYTICS:VIEW',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: SettingsIcon,
    to: '/settings',
    permissionAction: 'SETTINGS:VIEW',
  },
];
```

**Tasks:**

- [ ] Add `permissionAction` field to MenuItem type
- [ ] Add PDS actions to all menu items
- [ ] Identify public routes (canSkipPermissionCheck: true)

### Step 2: Update menu.service.ts

Replace legacy permission checking with PDS:

```typescript
// File: src/shared/services/menu.service.ts

import { hasPermission } from '@/shared/lib/validation/pdsSchemas';
import type { EffectivePermissionMap } from '@/shared/lib/validation/pdsSchemas';

function hasResourceAccess(permissionMap: EffectivePermissionMap, action: string): boolean {
  return hasPermission(permissionMap, action);
}

export function filterMenuByPermissions(
  items: MenuItem[],
  permissionMap: EffectivePermissionMap | null,
): MenuItem[] {
  if (!permissionMap) return items.filter((i) => i.canSkipPermissionCheck);

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

**Tasks:**

- [ ] Import PDS hasPermission function
- [ ] Update hasResourceAccess to use PDS
- [ ] Update filterMenuByPermissions signature
- [ ] Test with mock admin/editor/viewer profiles

### Step 3: Update Sidebar Component

```typescript
// File: src/shared/components/sidebar/Sidebar.tsx

import { usePermissions } from '@/shared/hooks/usePermissions';
import { filterMenuByPermissions } from '@/shared/services/menu.service';

export function Sidebar() {
  const { permissionMap } = usePermissions();
  const menuItems = useMenuItems(); // Your menu source

  const filteredMenu = useMemo(
    () => filterMenuByPermissions(menuItems, permissionMap),
    [menuItems, permissionMap]
  );

  return (
    <aside>
      {filteredMenu.map(item => (
        <SidebarItem key={item.key} item={item} />
      ))}
    </aside>
  );
}
```

**Tasks:**

- [ ] Replace legacy permission checks with usePermissions hook
- [ ] Pass permissionMap to filterMenuByPermissions
- [ ] Remove effectivePermissions prop (now from hook)
- [ ] Test menu visibility with different permission profiles

### Step 4: Integration Testing

**Tasks:**

- [ ] Test as Admin (should see all menu items)
- [ ] Test as Editor (should see limited menu items)
- [ ] Test as Viewer (should see read-only menu items)
- [ ] Test menu updates after tenant switch
- [ ] Test menu during multi-tenant flow (before tenant selection)

## Phase 3: Page Components 🔜 UPCOMING

### Step 1: Add Permission Guards to Pages

**User Management:**

- [ ] `UsersPage.tsx`: Guard with `USER:VIEW`
- [ ] Create button: Check `USER:CREATE`
- [ ] Edit button: Check `USER:EDIT`
- [ ] Delete button: Check `USER:DELETE`
- [ ] Add constraint messages to disabled buttons

**Role Management:**

- [ ] `RolesPage.tsx`: Guard with `ROLE:VIEW`
- [ ] Create button: Check `ROLE:CREATE`
- [ ] Edit button: Check `ROLE:EDIT`
- [ ] Delete button: Check `ROLE:DELETE`

**Tenant Management:**

- [ ] `TenantsPage.tsx`: Guard with `TENANT:VIEW`
- [ ] Create button: Check `TENANT:CREATE`
- [ ] Edit button: Check `TENANT:EDIT`
- [ ] Delete button: Check `TENANT:DELETE`

**Workflow Management:**

- [ ] `WorkflowsPage.tsx`: Guard with `WORKFLOW:VIEW`
- [ ] Create button: Check `WORKFLOW:CREATE`
- [ ] Add constraint message for MAX_INSTANCES
- [ ] Execute button: Check `WORKFLOW:EXECUTE`
- [ ] Edit button: Check `WORKFLOW:EDIT`
- [ ] Delete button: Check `WORKFLOW:DELETE`

**Analytics:**

- [ ] `AnalyticsPage.tsx`: Guard with `ANALYTICS:VIEW`
- [ ] Export button: Check `ANALYTICS:EXPORT`

**Settings:**

- [ ] `SettingsPage.tsx`: Guard with `SETTINGS:VIEW`
- [ ] Save button: Check `SETTINGS:EDIT`

### Step 2: Add Usage Quota Displays

**Workflows:**

- [ ] Show workflow count: X / Y workflows created
- [ ] Progress bar for MAX_INSTANCES constraint
- [ ] Warning when approaching limit
- [ ] Upgrade CTA when limit reached

**Users:**

- [ ] Show user count: X / Y users
- [ ] Warning when approaching limit

**Storage:**

- [ ] Show storage usage: X MB / Y MB
- [ ] Progress bar for MAX_STORAGE_MB constraint

### Step 3: Add Constraint Messages

**Tooltip Pattern:**

- [ ] Implement for all disabled Create buttons
- [ ] Show reason: "Upgrade to Professional plan"
- [ ] Show reason: "Maximum limit of X reached"
- [ ] Show reason: "Rate limit: X per day"

**Inline Message Pattern:**

- [ ] Add below Create buttons for critical limits
- [ ] Include upgrade/contact admin CTA

## Phase 4: Backend Integration 🔮 FUTURE

### Step 1: Replace Mock Data with Real API

**Tasks:**

- [ ] Implement `/api/v1/pds/effective-permissions` backend endpoint
- [ ] Connect to real permission evaluation service
- [ ] Implement usage tracking (workflows created today, etc.)
- [ ] Add caching layer (Redis) with 5-minute expiry

### Step 2: Update Login Flow

**Single-Tenant:**

- [ ] Update login response to include `effectivePermissions` flag
- [ ] Auto-load PDS permissions after login
- [ ] Store in Redux authSlice

**Multi-Tenant:**

- [ ] Return `effectivePermissions: null` for multi-tenant users
- [ ] Load PDS permissions after tenant selection
- [ ] Update on tenant switch

### Step 3: Add Permission Refresh Logic

**Tasks:**

- [ ] Auto-refresh permissions before cache expiry
- [ ] Refresh on tenant switch
- [ ] Refresh after role/permission changes
- [ ] Handle permission refresh failures gracefully

### Step 4: Add Permission Audit Logging

**Tasks:**

- [ ] Log permission denials (backend)
- [ ] Log constraint violations
- [ ] Track permission usage patterns
- [ ] Admin dashboard for permission analytics

## Phase 5: Advanced Features 🚀 FUTURE

### Real-Time Usage Tracking

**Tasks:**

- [ ] WebSocket connection for real-time usage updates
- [ ] Update quota displays in real-time
- [ ] Notify users when approaching limits
- [ ] Auto-refresh permission map when usage changes

### Admin Permission Override UI

**Tasks:**

- [ ] Admin page to view/edit user permissions
- [ ] Override role permissions for specific users
- [ ] Set custom constraints per user
- [ ] Permission inheritance visualization

### Subscription Plan Management

**Tasks:**

- [ ] Plan comparison page with permission differences
- [ ] Upgrade flow with permission preview
- [ ] Downgrade warnings (losing permissions)
- [ ] Trial plan with temporary elevated permissions

## Testing Checklist

### Unit Tests

- [ ] Test PDS schema validation
- [ ] Test hasPermission utility function
- [ ] Test hasAnyPermission with various inputs
- [ ] Test hasAllPermissions with various inputs
- [ ] Test getConstraintMessage with different constraint types

### Integration Tests

- [ ] Test usePermissions hook with mock data
- [ ] Test menu filtering with admin profile
- [ ] Test menu filtering with editor profile
- [ ] Test menu filtering with viewer profile
- [ ] Test permission loading after login
- [ ] Test permission loading after tenant switch

### E2E Tests

- [ ] Login as admin → verify all menu items visible
- [ ] Login as editor → verify limited menu items
- [ ] Login as viewer → verify read-only access
- [ ] Test Create button disabled with constraint tooltip
- [ ] Test quota display with approaching limit
- [ ] Test tenant switch updates permissions

## Documentation Updates

- [x] PDS implementation guide
- [x] Usage examples with patterns
- [x] Migration checklist
- [ ] Update architecture.md with PDS flow
- [ ] Update routing-guide.md with permission requirements
- [ ] Add PDS section to README.md
- [ ] Create video walkthrough (optional)

## Performance Benchmarks

**Target Metrics:**

- [ ] Menu filtering: < 50ms
- [ ] Permission check: < 1ms (in-memory)
- [ ] PDS API call: < 200ms
- [ ] Redux state update: < 10ms
- [ ] Page load with permission guard: < 100ms overhead

**Optimization:**

- [ ] Memoize filtered menu
- [ ] Lazy load permission map only when needed
- [ ] Batch permission checks where possible
- [ ] Debounce permission refreshes

## Rollout Strategy

### Week 1: Foundation ✅

- Complete PDS schemas, mock data, hooks
- Update auth schemas and services
- Create documentation

### Week 2: Menu Integration

- Add PDS actions to menu items
- Update menu service with PDS checks
- Update Sidebar component
- Test with mock data

### Week 3: Page Components (Part 1)

- Add guards to User Management
- Add guards to Role Management
- Add guards to Tenant Management
- Add constraint messages

### Week 4: Page Components (Part 2)

- Add guards to Workflow Management
- Add usage quota displays
- Add constraint tooltips
- Complete page-level integration

### Week 5: Backend Integration

- Implement PDS backend endpoint
- Replace mock data with real API
- Update login flow
- Add permission refresh logic

### Week 6: Testing & Polish

- Complete unit/integration/e2e tests
- Performance optimization
- Bug fixes
- Documentation updates

### Week 7: Production Rollout

- Feature flag: Enable for 10% of users
- Monitor error logs
- Gather user feedback
- Week 8: Full rollout to 100%

## Success Criteria

- [ ] All menu items properly filtered by permissions
- [ ] All Create/Edit/Delete buttons respect permissions
- [ ] Constraint messages shown on disabled buttons
- [ ] Usage quotas displayed correctly
- [ ] No permission bypass bugs found in security audit
- [ ] < 100ms overhead for permission checks
- [ ] Zero downtime during rollout
- [ ] Positive user feedback on UX improvements
