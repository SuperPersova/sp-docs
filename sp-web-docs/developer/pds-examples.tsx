/**
 * EXAMPLE: PDS Permission Usage in Components
 *
 * This file demonstrates various patterns for using PDS permissions
 * Copy these patterns into your components as needed
 */

import { usePermissions } from '@/shared/hooks/usePermissions';
import { Button } from '@/shared/ui/button';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip';

// ============================================================================
// Pattern 1: Simple Button with Permission Check
// ============================================================================

export function SimplePermissionButton() {
  const { hasPermission } = usePermissions();

  const canCreate = hasPermission('WORKFLOW:CREATE');

  return <Button disabled={!canCreate}>Create Workflow</Button>;
}

// ============================================================================
// Pattern 2: Button with Constraint Message (Tooltip)
// ============================================================================

export function ButtonWithConstraintTooltip() {
  const { hasPermission, getConstraintMessage } = usePermissions();

  const canCreate = hasPermission('WORKFLOW:CREATE');
  const constraintMsg = getConstraintMessage('WORKFLOW:CREATE');

  // If allowed, show normal button
  if (canCreate) {
    return <Button>Create Workflow</Button>;
  }

  // If denied, show disabled button with tooltip explaining why
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          {' '}
          {/* Wrapper needed for disabled button tooltip */}
          <Button disabled>Create Workflow</Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        {constraintMsg || 'You do not have permission to create workflows'}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================================================
// Pattern 3: Button with Inline Constraint Message
// ============================================================================

export function ButtonWithInlineConstraint() {
  const { hasPermission, getConstraintMessage } = usePermissions();

  const canCreate = hasPermission('WORKFLOW:CREATE');
  const constraintMsg = getConstraintMessage('WORKFLOW:CREATE');

  return (
    <div className="space-y-2">
      <Button disabled={!canCreate}>Create Workflow</Button>
      {!canCreate && constraintMsg && (
        <p className="text-sm text-muted-foreground">{constraintMsg}</p>
      )}
    </div>
  );
}

// ============================================================================
// Pattern 4: Page-Level Permission Guard
// ============================================================================

export function ProtectedPage() {
  const { hasPermission } = usePermissions();

  const canView = hasPermission('USER:VIEW');

  if (!canView) {
    return (
      <Alert variant="destructive">
        <AlertDescription>You do not have permission to view this page.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div>
      {/* Page content */}
      <h1>User Management</h1>
      {/* ... */}
    </div>
  );
}

// ============================================================================
// Pattern 5: Multiple Permission Checks (OR Logic)
// ============================================================================

export function AdminPanel() {
  const { hasAnyPermission } = usePermissions();

  // Show panel if user can manage users OR roles OR tenants
  const canAccessAdminPanel = hasAnyPermission(['USER:MANAGE', 'ROLE:MANAGE', 'TENANT:MANAGE']);

  if (!canAccessAdminPanel) {
    return <Alert>Admin access required</Alert>;
  }

  return (
    <div>
      <h1>Admin Panel</h1>
      {/* ... */}
    </div>
  );
}

// ============================================================================
// Pattern 6: Multiple Permission Checks (AND Logic)
// ============================================================================

export function AdvancedFeature() {
  const { hasAllPermissions } = usePermissions();

  // Require ALL permissions
  const canUseFeature = hasAllPermissions([
    'WORKFLOW:CREATE',
    'WORKFLOW:EXECUTE',
    'ANALYTICS:VIEW',
  ]);

  if (!canUseFeature) {
    return (
      <Alert>
        <AlertDescription>
          This feature requires advanced permissions. Please contact your administrator.
        </AlertDescription>
      </Alert>
    );
  }

  return <div>Advanced Feature Content</div>;
}

// ============================================================================
// Pattern 7: Conditional Rendering with Multiple Actions
// ============================================================================

export function UserManagementPage() {
  const { hasPermission } = usePermissions();

  const canView = hasPermission('USER:VIEW');
  const canCreate = hasPermission('USER:CREATE');
  const canEdit = hasPermission('USER:EDIT');
  const canDelete = hasPermission('USER:DELETE');

  if (!canView) {
    return <Alert>Access denied</Alert>;
  }

  return (
    <div>
      <div className="flex justify-between items-center">
        <h1>Users</h1>
        {canCreate && <Button>Create User</Button>}
      </div>

      <table>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>
                {canEdit && <Button size="sm">Edit</Button>}
                {canDelete && (
                  <Button size="sm" variant="destructive">
                    Delete
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ============================================================================
// Pattern 8: Usage Quota Display
// ============================================================================

export function QuotaDisplay() {
  const { getPermissionDecision } = usePermissions();

  const decision = getPermissionDecision('WORKFLOW:CREATE');

  if (!decision) return null;

  const instanceConstraint = decision.constraints.find((c) => c.type === 'MAX_INSTANCES');

  if (!instanceConstraint) return null;

  const { currentValue = 0, threshold = 0, satisfied } = instanceConstraint;
  const percentage = (currentValue / threshold) * 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Workflows</span>
        <span>
          {currentValue} / {threshold}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full ${satisfied ? 'bg-green-500' : 'bg-red-500'}`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        />
      </div>
      {!satisfied && (
        <p className="text-sm text-red-600">
          You have reached your workflow limit. Upgrade to create more.
        </p>
      )}
    </div>
  );
}

// ============================================================================
// Pattern 9: Permission Badge
// ============================================================================

export function PermissionBadge({ action }: { action: string }) {
  const { hasPermission } = usePermissions();

  const allowed = hasPermission(action);

  return (
    <Badge variant={allowed ? 'default' : 'destructive'}>{allowed ? 'Allowed' : 'Denied'}</Badge>
  );
}

// ============================================================================
// Pattern 10: Action Menu with Permission Checks
// ============================================================================

export function ActionMenu({ userId }: { userId: string }) {
  const { hasPermission, getConstraintMessage } = usePermissions();

  const canEdit = hasPermission('USER:EDIT');
  const canDelete = hasPermission('USER:DELETE');
  const canInvite = hasPermission('USER:INVITE');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          Actions
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {canEdit ? (
          <DropdownMenuItem onClick={() => editUser(userId)}>Edit User</DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>Edit User (No Permission)</DropdownMenuItem>
        )}

        {canDelete ? (
          <DropdownMenuItem onClick={() => deleteUser(userId)}>Delete User</DropdownMenuItem>
        ) : (
          <DropdownMenuItem disabled>Delete User (No Permission)</DropdownMenuItem>
        )}

        {canInvite && <DropdownMenuItem onClick={() => inviteUser()}>Invite User</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================================================
// Pattern 11: Real-World Example - Workflow Page
// ============================================================================

export function WorkflowPage() {
  const { hasPermission, hasAnyPermission, getConstraintMessage } = usePermissions();

  // Check various permissions
  const canView = hasPermission('WORKFLOW:VIEW');
  const canCreate = hasPermission('WORKFLOW:CREATE');
  const canEdit = hasPermission('WORKFLOW:EDIT');
  const canDelete = hasPermission('WORKFLOW:DELETE');
  const canExecute = hasPermission('WORKFLOW:EXECUTE');

  // Check if user has any management permission
  const canManage = hasAnyPermission(['WORKFLOW:CREATE', 'WORKFLOW:EDIT', 'WORKFLOW:DELETE']);

  // Get constraint messages
  const createConstraint = getConstraintMessage('WORKFLOW:CREATE');

  // Guard: No view permission
  if (!canView) {
    return (
      <div className="container py-8">
        <Alert variant="destructive">
          <AlertDescription>You do not have permission to view workflows.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          {canManage && <p className="text-muted-foreground">Create and manage your workflows</p>}
        </div>

        {/* Create Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button disabled={!canCreate}>Create Workflow</Button>
            </span>
          </TooltipTrigger>
          {!canCreate && createConstraint && <TooltipContent>{createConstraint}</TooltipContent>}
        </Tooltip>
      </div>

      {/* Quota Display */}
      {canCreate && <QuotaDisplay />}

      {/* Workflow List */}
      <div className="grid gap-4 mt-6">
        {workflows.map((workflow) => (
          <div key={workflow.id} className="border rounded-lg p-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{workflow.name}</h3>
              <div className="flex gap-2">
                {canExecute && (
                  <Button size="sm" variant="outline">
                    Execute
                  </Button>
                )}
                {canEdit && (
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                )}
                {canDelete && (
                  <Button size="sm" variant="destructive">
                    Delete
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Fake data for examples
// ============================================================================
const users = [
  { id: '1', name: 'John Doe' },
  { id: '2', name: 'Jane Smith' },
];

const workflows = [
  { id: '1', name: 'Onboarding Flow' },
  { id: '2', name: 'Approval Process' },
];

function editUser(userId: string) {
  console.log('Edit user', userId);
}
function deleteUser(userId: string) {
  console.log('Delete user', userId);
}
function inviteUser() {
  console.log('Invite user');
}

// Fake imports (replace with real ones)
const DropdownMenu = ({ children }: any) => <div>{children}</div>;
const DropdownMenuTrigger = ({ children }: any) => <div>{children}</div>;
const DropdownMenuContent = ({ children }: any) => <div>{children}</div>;
const DropdownMenuItem = ({ children, ...props }: any) => <button {...props}>{children}</button>;
