# Workflow Architecture - Enterprise Best Practices

## 🏗️ Architecture Overview

This workflow system follows **enterprise-grade separation of concerns** with three distinct layers:

```
┌─────────────────────────────────────────────┐
│           React Components (UI)             │
│                                             │
│  - TenantForm, DeleteDialog, etc.          │
│  - Only use Hooks for workflow integration │
└────────────┬────────────────────────────────┘
             │
             ↓
┌─────────────────────────────────────────────┐
│         Hooks Layer (State Management)      │
│                                             │
│  - useWorkflowTrigger                       │
│  - Manages React state & side effects       │
│  - Calls Services for API communication     │
│  - Uses Utils for data manipulation         │
└────────┬──────────────────────────┬─────────┘
         │                          │
         ↓                          ↓
┌────────────────────┐    ┌──────────────────┐
│ Services Layer     │    │ Utils Layer      │
│                    │    │                  │
│ - workflowService  │    │ - workflowApi    │
│ - API calls only   │    │ - Pure functions │
│ - HTTP requests    │    │ - No side effects│
│ - Error handling   │    │ - Data transform │
└────────────────────┘    └──────────────────┘
```

---

## 📁 File Structure

```
src/features/workflows/
├── services/
│   └── workflowService.ts          # API calls (fetch, axios)
├── hooks/
│   └── useWorkflowTrigger.ts       # React hooks (state management)
├── utils/
│   └── workflowApi.ts              # Pure functions (helpers)
├── components/                      # UI components
├── pages/                          # Page components
├── examples/
│   └── workflowIntegrationExamples.ts  # Usage examples
└── index.ts                        # Barrel exports
```

---

## 🎯 Layer Responsibilities

### 1. **Services Layer** (`services/`)

**Purpose**: Handle ALL API communication

**Rules**:

- ✅ Make HTTP requests (fetch, axios)
- ✅ Handle API errors
- ✅ Transform API responses
- ❌ NO React hooks or state
- ❌ NO business logic
- ❌ NO UI concerns

**Example**:

```typescript
// services/workflowService.ts
export async function getDefaultWorkflow(
  resourceType: ResourceType,
  action: Action,
): Promise<WorkflowDefinition | null> {
  const response = await fetch(
    `/api/workflows/definitions/default?resourceType=${resourceType}&action=${action}`,
  );
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error('Failed to fetch workflow');
  }
  return await response.json();
}
```

### 2. **Hooks Layer** (`hooks/`)

**Purpose**: React integration, state management, orchestration

**Rules**:

- ✅ Use React hooks (useState, useEffect, useCallback)
- ✅ Call Services for API operations
- ✅ Use Utils for data manipulation
- ✅ Manage loading/error states
- ❌ NO direct fetch calls (use Services)
- ❌ NO business logic (use Utils)

**Example**:

```typescript
// hooks/useWorkflowTrigger.ts
export function useWorkflowTrigger() {
  const [isLoading, setIsLoading] = useState(false);

  const triggerWorkflow = useCallback(async (params) => {
    setIsLoading(true);
    try {
      const workflow = await workflowService.getDefaultWorkflow(...);
      if (isWorkflowActive(workflow)) { // Using util
        const instance = await workflowService.startWorkflowInstance(...);
        return { triggered: true, ...instance };
      }
      return { triggered: false };
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { triggerWorkflow, isLoading };
}
```

### 3. **Utils Layer** (`utils/`)

**Purpose**: Pure helper functions, data transformation

**Rules**:

- ✅ Pure functions only (same input = same output)
- ✅ Data transformation and validation
- ✅ Business logic calculations
- ✅ 100% testable without mocks
- ❌ NO API calls
- ❌ NO side effects
- ❌ NO React hooks

**Example**:

```typescript
// utils/workflowApi.ts
export function isWorkflowActive(workflow: WorkflowDefinition | null): boolean {
  return workflow !== null && workflow.status === 'ACTIVE';
}

export function hasPendingInstances(instances: WorkflowInstance[]): boolean {
  return instances.some((i) => ['PENDING', 'IN_PROGRESS'].includes(i.status));
}
```

---

## 🚀 Usage Guide

### For React Components → Use Hooks

```typescript
import { useWorkflowTrigger } from '@/features/workflows';

function TenantForm() {
  const { triggerWorkflow, isLoading } = useWorkflowTrigger();

  const handleSubmit = async (data) => {
    const tenant = await createTenant(data);

    // Auto-trigger workflow
    const result = await triggerWorkflow({
      resourceType: 'TENANT',
      action: 'CREATE',
      resourceId: tenant.id,
      resourceData: tenant,
    });

    if (result.triggered) {
      toast.success(`Workflow started: ${result.workflowName}`);
    }
  };
}
```

### For Server/API Routes → Use Services

```typescript
import * as workflowService from '@/features/workflows/services/workflowService';
import { isWorkflowActive } from '@/features/workflows/utils/workflowApi';

export async function POST(request: Request) {
  const data = await request.json();

  // Create tenant
  const tenant = await db.tenant.create(data);

  // Check for workflow
  const workflow = await workflowService.getDefaultWorkflow('TENANT', 'CREATE');

  if (isWorkflowActive(workflow)) {
    await workflowService.startWorkflowInstance({
      workflowDefinitionId: workflow.id,
      resourceType: 'TENANT',
      action: 'CREATE',
      resourceId: tenant.id,
    });
  }

  return Response.json(tenant);
}
```

### For Data Transformation → Use Utils

```typescript
import {
  hasPendingInstances,
  sortWorkflowsByPriority,
} from '@/features/workflows/utils/workflowApi';

function processWorkflows(instances: WorkflowInstance[]) {
  // Check for pending
  if (hasPendingInstances(instances)) {
    console.warn('Pending workflows exist');
  }

  // Sort by priority
  return sortWorkflowsByPriority(instances);
}
```

---

## ✅ Benefits of This Architecture

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Testability**: Utils are pure functions (easy to test), Services can be mocked
3. **Reusability**: Services and Utils work in React, Node, or anywhere
4. **Maintainability**: Clear boundaries make code easier to understand
5. **Type Safety**: Full TypeScript support across all layers
6. **Scalability**: Easy to add new features without breaking existing code

---

## 🔄 Data Flow

```
User Action (Click)
      ↓
Component calls Hook
      ↓
Hook manages state (loading, error)
      ↓
Hook calls Service (API request)
      ↓
Service returns data
      ↓
Hook uses Utils (data validation/transform)
      ↓
Hook updates state
      ↓
Component re-renders with new state
```

---

## 📋 Checklist for Adding New Features

**When adding a new workflow feature:**

1. ✅ API call needed? → Add to `services/workflowService.ts`
2. ✅ React integration? → Create/update hook in `hooks/`
3. ✅ Data transformation? → Add util function in `utils/workflowApi.ts`
4. ✅ Export from `index.ts` for clean imports
5. ✅ Add example usage in `examples/`
6. ✅ Write tests for utils (pure functions are easy to test!)

---

## 🧪 Testing Strategy

### Utils (Pure Functions)

```typescript
// Easy to test - no mocks needed!
describe('isWorkflowActive', () => {
  it('returns true for active workflow', () => {
    const workflow = { status: 'ACTIVE' };
    expect(isWorkflowActive(workflow)).toBe(true);
  });
});
```

### Services (Mock fetch)

```typescript
describe('getDefaultWorkflow', () => {
  it('fetches workflow from API', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: '123', name: 'Test' }),
    });

    const result = await getDefaultWorkflow('TENANT', 'CREATE');
    expect(result.id).toBe('123');
  });
});
```

### Hooks (Mock services)

```typescript
jest.mock('../services/workflowService');

describe('useWorkflowTrigger', () => {
  it('triggers workflow', async () => {
    workflowService.getDefaultWorkflow.mockResolvedValue({ status: 'ACTIVE' });
    const { result } = renderHook(() => useWorkflowTrigger());
    await result.current.triggerWorkflow({ ... });
    expect(result.current.isLoading).toBe(false);
  });
});
```

---

## 📚 Related Documentation

- See `examples/workflowIntegrationExamples.ts` for real-world usage
- See `docs/developer/workflow-implementation.md` for detailed guide
- See `shared/lib/validation/workflowSchemas.ts` for type definitions
