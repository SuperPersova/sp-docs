# Routing Guide - TanStack Router

## Overview

This application uses **TanStack Router** for type-safe routing with file-based route generation.

## Architecture

### Route File Structure

```
src/app/router/
  index.tsx              # Root router configuration with layout
  routes/
    __root.tsx           # Root route (layout wrapper)
    index.tsx            # Home page (/)
    login.tsx            # Login page (/login)
    select-tenant.tsx    # Tenant selection (/select-tenant)
    _authenticated/      # Protected route group
      $tenantId/         # Dynamic tenant routes
        index.tsx        # Tenant home (/:tenantId)
        tenants.tsx      # Tenants list (/:tenantId/tenants)
        preferences.tsx  # Preferences (/:tenantId/preferences)
```

### Route Generation

Routes are auto-generated from file structure using `@tanstack/router-vite-plugin`:

```typescript
// vite.config.ts
import { TanStackRouterVite } from '@tanstack/router-vite-plugin';

export default defineConfig({
  plugins: [
    react(),
    TanStackRouterVite(), // Generates routeTree.gen.ts
  ],
});
```

## Route Patterns

### 1. Basic Route

```typescript
// routes/login.tsx
import { createFileRoute } from '@tanstack/router'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
  return <div>Login</div>
}
```

### 2. Route with Params

```typescript
// routes/_authenticated/$tenantId/tenants.tsx
import { createFileRoute } from '@tanstack/router'

export const Route = createFileRoute('/_authenticated/$tenantId/tenants')({
  component: TenantsPage,
})

function TenantsPage() {
  const { tenantId } = Route.useParams() // Type-safe!
  return <div>Tenants for {tenantId}</div>
}
```

### 3. Protected Route Group

```typescript
// routes/_authenticated.tsx
import { createFileRoute, Outlet } from '@tanstack/router'
import { RequireAuth } from '@/features/auth'

export const Route = createFileRoute('/_authenticated')({
  component: AuthenticatedLayout,
})

function AuthenticatedLayout() {
  return (
    <RequireAuth>
      <Outlet /> {/* Nested routes render here */}
    </RequireAuth>
  )
}
```

### 4. Index Route (Default)

```typescript
// routes/_authenticated/$tenantId/index.tsx
export const Route = createFileRoute('/_authenticated/$tenantId/')({
  component: TenantHomePage,
});

// Accessible at: /:tenantId (e.g., /123)
```

### 5. Search Params

```typescript
// routes/_authenticated/$tenantId/tenants.tsx
import { z } from 'zod'

const searchSchema = z.object({
  page: z.number().optional().default(1),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
})

export const Route = createFileRoute('/_authenticated/$tenantId/tenants')({
  validateSearch: searchSchema,
  component: TenantsPage,
})

function TenantsPage() {
  const { page, search, status } = Route.useSearch() // Type-safe!
  return <div>Page {page}, Search: {search}, Status: {status}</div>
}
```

## Navigation

### Workflow Tasks Route Update

- Path: `/tasks/workflow` replaces legacy `/tasks/approvals`.
- Route ID: continues to use `app.pendingApprovals` to avoid ripple effects in existing menu JSON and tests. Link via `ROUTES.app.pendingApprovals` which now maps to `/tasks/workflow`.
- Menu: `_testData/menu.json` entry id changed to `menu-my-tasks-workflow`, key `menu.myTasks.workflow`, label `Workflow`.

Reasoning:

- Consolidates “Approvals” under broader “Workflow Tasks”.
- Keeps stable route ID for backward compatibility (tests, analytics) while updating the path for clarity.

### Using Link Component

```typescript
import { Link } from '@tanstack/router'

function Sidebar() {
  const { tenantId } = Route.useParams()

  return (
    <nav>
      <Link to="/$tenantId/tenants" params={{ tenantId }}>
        Tenants
      </Link>

      <Link to="/$tenantId/preferences" params={{ tenantId }}>
        Preferences
      </Link>

      {/* With search params */}
      <Link
        to="/$tenantId/tenants"
        params={{ tenantId }}
        search={{ page: 1, status: 'active' }}
      >
        Active Tenants
      </Link>
    </nav>
  )
}
```

### Programmatic Navigation

```typescript
import { useNavigate } from '@tanstack/router'

function TenantCard({ tenant }: { tenant: Tenant }) {
  const navigate = useNavigate()
  const { tenantId } = Route.useParams()

  const handleClick = () => {
    navigate({
      to: '/$tenantId/tenants/$id',
      params: { tenantId, id: tenant.id },
    })
  }

  return <button onClick={handleClick}>View Details</button>
}
```

### Redirect

```typescript
export const Route = createFileRoute('/old-path')({
  beforeLoad: ({ context }) => {
    throw redirect({
      to: '/new-path',
      replace: true,
    });
  },
});
```

## Active Link Styling

### Using activeProps

```typescript
<Link
  to="/$tenantId/tenants"
  params={{ tenantId }}
  activeProps={{
    className: 'bg-primary text-primary-foreground',
  }}
  inactiveProps={{
    className: 'hover:bg-muted',
  }}
>
  Tenants
</Link>
```

### Custom Active Detection

```typescript
import { useRouterState } from '@tanstack/router'

function NavItem({ to, label }: { to: string; label: string }) {
  const router = useRouterState()
  const isActive = router.location.pathname.includes(to)

  return (
    <Link
      to={to}
      className={cn(
        'px-4 py-2 rounded',
        isActive && 'bg-primary text-primary-foreground'
      )}
    >
      {label}
    </Link>
  )
}
```

## Layout Pattern

### Root Layout with Resizable Sidebar

```typescript
// router/index.tsx (Current Implementation)
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from '@/shared/ui/resizable'

const router = createRouter({
  routeTree,
  context: { store },
  defaultPreload: 'intent',
})

export function Router() {
  const isMobile = useMediaQuery('(max-width: 768px)')

  return (
    <RouterProvider router={router}>
      {isMobile ? (
        <MobileLayout /> {/* Overlay sidebar */}
      ) : (
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <Sidebar />
          </ResizablePanel>
          <ResizableHandle />
          <ResizablePanel defaultSize={80}>
            <Outlet /> {/* Pages render here */}
          </ResizablePanel>
        </ResizablePanelGroup>
      )}
    </RouterProvider>
  )
}
```

## Data Loading

### Loader Pattern

```typescript
export const Route = createFileRoute('/_authenticated/$tenantId/tenants')({
  loader: async ({ params }) => {
    // Fetch data before rendering
    const tenants = await fetchTenants(params.tenantId)
    return { tenants }
  },
  component: TenantsPage,
})

function TenantsPage() {
  const { tenants } = Route.useLoaderData() // Type-safe!
  return <TenantTable tenants={tenants} />
}
```

### Using RTK Query with Preload

```typescript
export const Route = createFileRoute('/_authenticated/$tenantId/tenants')({
  beforeLoad: ({ context }) => {
    // Preload RTK Query data
    context.store.dispatch(
      tenantApi.endpoints.getTenants.initiate()
    )
  },
  component: TenantsPage,
})

function TenantsPage() {
  const { data: tenants } = tenantApi.useGetTenantsQuery()
  // Data is likely already cached from preload
  return <TenantTable tenants={tenants} />
}
```

## Error Handling

### Error Component

```typescript
export const Route = createFileRoute('/_authenticated/$tenantId/tenants')({
  component: TenantsPage,
  errorComponent: TenantErrorPage,
})

function TenantErrorPage({ error }: { error: Error }) {
  return (
    <div className="p-4">
      <h1>Error Loading Tenants</h1>
      <p>{error.message}</p>
      <button onClick={() => window.location.reload()}>
        Retry
      </button>
    </div>
  )
}
```

### Not Found Component

```typescript
export const Route = createFileRoute('/_authenticated/$tenantId/tenants/$id')({
  component: TenantDetailsPage,
  notFoundComponent: TenantNotFound,
})

function TenantNotFound() {
  const { tenantId } = Route.useParams()
  return (
    <div>
      <h1>Tenant Not Found</h1>
      <Link to="/$tenantId/tenants" params={{ tenantId }}>
        Back to Tenants
      </Link>
    </div>
  )
}
```

## Authentication Guards

### Protected Route Pattern

```typescript
// routes/_authenticated.tsx
export const Route = createFileRoute('/_authenticated')({
  beforeLoad: ({ context, location }) => {
    const isAuthenticated = context.store.getState().auth.isAuthenticated;

    if (!isAuthenticated) {
      throw redirect({
        to: '/login',
        search: {
          redirect: location.href, // Preserve intended destination
        },
      });
    }
  },
  component: AuthenticatedLayout,
});
```

### Permission-Based Guards

```typescript
// features/auth/components/RequirePermission.tsx
import { useNavigate } from '@tanstack/router'

export function RequirePermission({ permission, children }: Props) {
  const hasPermission = useAppSelector(state =>
    state.auth.permissions.includes(permission)
  )
  const navigate = useNavigate()

  if (!hasPermission) {
    return <PermissionDeniedCard onBack={() => navigate({ to: '/' })} />
  }

  return <>{children}</>
}
```

## Route Context

### Providing Context

```typescript
// router/index.tsx
const router = createRouter({
  routeTree,
  context: {
    store, // Redux store
    queryClient, // React Query client (if using)
  },
});
```

### Using Context in Routes

```typescript
export const Route = createFileRoute('/_authenticated/$tenantId/tenants')({
  beforeLoad: ({ context }) => {
    // Access Redux store
    const theme = context.store.getState().preferences.theme;
    // ... use theme
  },
});
```

## Testing Routes

### Unit Test with Mock Router

```typescript
import { createMemoryHistory, createRootRoute } from '@tanstack/router'

describe('TenantsPage', () => {
  it('renders tenant list', () => {
    const history = createMemoryHistory({
      initialEntries: ['/123/tenants'],
    })

    render(
      <RouterProvider router={router} history={history}>
        <TenantsPage />
      </RouterProvider>
    )

    expect(screen.getByText('Tenants')).toBeInTheDocument()
  })
})
```

## Migration Notes

### From React Router

- `useParams()` → `Route.useParams()` (type-safe!)
- `useSearchParams()` → `Route.useSearch()` (validated!)
- `useNavigate()` → `useNavigate()` (similar API)
- `<Route path>` → File-based routes
- `<Switch>` → Not needed (file structure handles it)

## Best Practices

1. **File Naming**: Use kebab-case for routes (`tenant-details.tsx`)
2. **Dynamic Params**: Prefix with `$` (`$tenantId`, `$id`)
3. **Protected Groups**: Use `_` prefix for layout routes (`_authenticated`)
4. **Search Params**: Always validate with Zod for type safety
5. **Preloading**: Use `defaultPreload: 'intent'` for hover preloads
6. **Error Boundaries**: Always provide `errorComponent` for critical routes
7. **Type Safety**: Use `Route.useParams()` and `Route.useSearch()` for full type inference

## Reference Files

- `src/app/router/index.tsx` - Router configuration with layout
- `src/app/router/routes/__root.tsx` - Root layout wrapper
- `src/app/router/routes/_authenticated/$tenantId/tenants.tsx` - Example route with params

## Resources

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [Type Safety](https://tanstack.com/router/latest/docs/framework/react/guide/type-safety)
