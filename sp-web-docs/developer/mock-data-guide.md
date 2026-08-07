# Mock Data & API Development Guide

## Overview

This guide explains how to work with mock data and RTK Query endpoints during development before backend APIs are ready.

## Architecture Pattern

### RTK Query + Mock Data in Single File

Each feature has an `api/*.mock.ts` file containing both endpoint definitions and mock data:

```typescript
// features/tenant/api/tenantApi.mock.ts
import { api } from '@/app/store/api';

// Mock data at the top
export const mockTenants: Tenant[] = [
  {
    id: 1,
    name: 'Acme Corporation',
    code: 'ACME',
    status: 'Active',
    // ... all fields
  },
  // ... more items
];

// Endpoints below
export const tenantApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query<Tenant[], void>({
      queryFn: async () => {
        await new Promise((resolve) => setTimeout(resolve, 500)); // Simulate network
        return { data: mockTenants };
      },
      providesTags: ['Tenant'],
    }),
    // ... more endpoints
  }),
});
```

## Mock Data Best Practices

### 1. Realistic Sample Data

Create enough variety to test edge cases:

```typescript
export const mockTenants: Tenant[] = [
  // Active tenant with all features
  {
    id: 1,
    name: 'Acme Corporation',
    status: 'Active',
    memberCount: 15,
    plan: 'Enterprise',
  },
  // Suspended tenant
  {
    id: 2,
    name: 'Beta Inc',
    status: 'Suspended',
    memberCount: 0,
    plan: 'Free',
  },
  // Tenant with long names (test truncation)
  {
    id: 3,
    name: 'Very Long Company Name That Should Truncate Properly',
    status: 'Active',
    memberCount: 250,
    plan: 'Professional',
  },
  // Minimum 20-30 items for pagination testing
];
```

### 2. Network Simulation

Always add realistic delays:

```typescript
queryFn: async () => {
  await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay
  return { data: mockTenants };
};

// For mutations, simulate longer operations
mutationFn: async (data) => {
  await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second
  // ... update logic
  return { data: updatedTenant };
};
```

### 3. Error Cases

Include mock error scenarios:

```typescript
export const tenantApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTenant: builder.query<Tenant, number>({
      queryFn: async (id) => {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const tenant = mockTenants.find((t) => t.id === id);
        if (!tenant) {
          return { error: { status: 404, data: 'Tenant not found' } };
        }

        return { data: tenant };
      },
    }),
  }),
});
```

### 4. Pagination Support

Mock pagination for list endpoints:

```typescript
interface GetTenantsParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

getTenants: builder.query<PaginatedResponse<Tenant>, GetTenantsParams>({
  queryFn: async ({ page = 1, pageSize = 10, search = '' }) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Filter
    let filtered = mockTenants;
    if (search) {
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    }

    // Paginate
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    const data = filtered.slice(start, end);

    return {
      data: {
        items: data,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  },
});
```

### 5. Search & Filtering

Implement realistic search logic:

```typescript
queryFn: async ({ search, status }) => {
  await new Promise((resolve) => setTimeout(resolve, 500));

  let result = [...mockTenants];

  // Text search across multiple fields
  if (search) {
    const term = search.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(term) ||
        t.code.toLowerCase().includes(term) ||
        t.contactEmail?.toLowerCase().includes(term),
    );
  }

  // Status filter
  if (status && status !== 'all') {
    result = result.filter((t) => t.status === status);
  }

  return { data: result };
};
```

## CRUD Operations with Mock Data

### Create (POST)

```typescript
createTenant: builder.mutation<Tenant, Partial<Tenant>>({
  queryFn: async (newTenant) => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const tenant: Tenant = {
      id: Math.max(...mockTenants.map((t) => t.id)) + 1,
      createdAt: new Date().toISOString(),
      ...newTenant,
    } as Tenant;

    mockTenants.push(tenant);
    return { data: tenant };
  },
  invalidatesTags: ['Tenant'],
});
```

### Read (GET)

```typescript
getTenant: builder.query<Tenant, number>({
  queryFn: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const tenant = mockTenants.find((t) => t.id === id);
    if (!tenant) {
      return { error: { status: 404, data: 'Tenant not found' } };
    }

    return { data: tenant };
  },
  providesTags: (result, error, id) => [{ type: 'Tenant', id }],
});
```

### Update (PUT/PATCH)

```typescript
updateTenant: builder.mutation<Tenant, { id: number; data: Partial<Tenant> }>({
  queryFn: async ({ id, data }) => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const index = mockTenants.findIndex((t) => t.id === id);
    if (index === -1) {
      return { error: { status: 404, data: 'Tenant not found' } };
    }

    mockTenants[index] = {
      ...mockTenants[index],
      ...data,
      updatedAt: new Date().toISOString(),
    };

    return { data: mockTenants[index] };
  },
  invalidatesTags: (result, error, { id }) => [{ type: 'Tenant', id }, 'Tenant'],
});
```

### Delete (DELETE)

```typescript
deleteTenant: builder.mutation<void, number>({
  queryFn: async (id) => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const index = mockTenants.findIndex((t) => t.id === id);
    if (index === -1) {
      return { error: { status: 404, data: 'Tenant not found' } };
    }

    mockTenants.splice(index, 1);
    return { data: undefined };
  },
  invalidatesTags: ['Tenant'],
});
```

## Migration to Real API

### Step 1: Keep Mock Data (Optional)

When backend is ready, you can keep mock data for tests:

```typescript
// Keep mock data at top
export const mockTenants: Tenant[] = [
  /* ... */
];

// Switch endpoint to real API
export const tenantApi = api.injectEndpoints({
  endpoints: (builder) => ({
    getTenants: builder.query<Tenant[], void>({
      query: () => '/tenants', // Real API endpoint
      providesTags: ['Tenant'],
    }),
  }),
});
```

### Step 2: Environment-Based Switching

Use environment variable to toggle:

```typescript
const USE_MOCK = import.meta.env.VITE_USE_MOCK_API === 'true';

getTenants: builder.query<Tenant[], void>({
  ...(USE_MOCK
    ? {
        queryFn: async () => {
          await new Promise((resolve) => setTimeout(resolve, 500));
          return { data: mockTenants };
        },
      }
    : {
        query: () => '/tenants',
      }),
  providesTags: ['Tenant'],
});
```

### Step 3: Real API with Mock Fallback

Use MSW (Mock Service Worker) for more sophisticated mocking:

```typescript
// Real API endpoint (always)
getTenants: builder.query<Tenant[], void>({
  query: () => '/tenants',
  providesTags: ['Tenant'],
});

// In development, intercept with MSW (separate file)
// src/mocks/handlers.ts
export const handlers = [
  http.get('/tenants', () => {
    return HttpResponse.json(mockTenants);
  }),
];
```

## Cache & Invalidation

### Provide Tags for Caching

```typescript
getTenants: builder.query<Tenant[], void>({
  // ...
  providesTags: ['Tenant'], // Broad tag for list
});

getTenant: builder.query<Tenant, number>({
  // ...
  providesTags: (result, error, id) => [{ type: 'Tenant', id }], // Specific tag
});
```

### Invalidate Tags on Mutations

```typescript
createTenant: builder.mutation<Tenant, Partial<Tenant>>({
  // ...
  invalidatesTags: ['Tenant'], // Refetch all tenant lists
});

updateTenant: builder.mutation<Tenant, { id: number; data: Partial<Tenant> }>({
  // ...
  invalidatesTags: (result, error, { id }) => [
    { type: 'Tenant', id }, // Refetch specific tenant
    'Tenant', // Refetch all lists
  ],
});

deleteTenant: builder.mutation<void, number>({
  // ...
  invalidatesTags: ['Tenant'], // Refetch all tenant lists
});
```

## Loading & Error States

### Using RTK Query Hooks

```typescript
function TenantsPage() {
  const { data: tenants, isLoading, error } = tenantApi.useGetTenantsQuery()

  if (isLoading) {
    return <div>Loading...</div>
  }

  if (error) {
    return <div>Error: {error.message}</div>
  }

  return <TenantTable tenants={tenants} />
}
```

### Optimistic Updates

For instant UI feedback:

```typescript
updateTenant: builder.mutation<Tenant, { id: number; data: Partial<Tenant> }>({
  queryFn: async ({ id, data }) => {
    // ... mutation logic
  },
  async onQueryStarted({ id, data }, { dispatch, queryFulfilled }) {
    // Optimistic update
    const patchResult = dispatch(
      tenantApi.util.updateQueryData('getTenants', undefined, (draft) => {
        const tenant = draft.find((t) => t.id === id);
        if (tenant) {
          Object.assign(tenant, data);
        }
      }),
    );

    try {
      await queryFulfilled;
    } catch {
      patchResult.undo(); // Revert on error
    }
  },
});
```

## Testing with Mock Data

### Unit Tests

```typescript
import { mockTenants } from './tenantApi.mock'

describe('TenantTable', () => {
  it('renders all tenants', () => {
    render(<TenantTable tenants={mockTenants} />)
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
  })
})
```

### Integration Tests with MSW

```typescript
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'
import { mockTenants } from './tenantApi.mock'

const server = setupServer(
  http.get('/tenants', () => {
    return HttpResponse.json(mockTenants)
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

it('fetches and displays tenants', async () => {
  render(<TenantsPage />)
  await waitFor(() => {
    expect(screen.getByText('Acme Corporation')).toBeInTheDocument()
  })
})
```

## Reference Implementation

See `features/tenant/api/tenantApi.mock.ts` for complete example with:

- CRUD operations
- Pagination
- Search & filtering
- Error handling
- Cache invalidation
