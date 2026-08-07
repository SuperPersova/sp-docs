---
title: Routing Guide
version: 1.0.0
status: baseline
owner: Frontend Platform
audience: developer
lastUpdated: 2025-11-23
tags: [routing, tanstack, ssr, metadata]
---

# Routing (TanStack Router)

We use TanStack Router for type-safe routes, SSR streaming, and route-based metadata.

## Why TanStack Router

- SSR streaming synergy with Vite & React 19.
- Route metadata (`@tanstack/react-head`).
- Strong typing of params/search objects.
- Built-in data loaders + preloading/prefetch hooks.

## Basic Setup

```tsx
// src/app/router/index.tsx (excerpt)
import { createRootRoute, createRoute, createRouter } from '@tanstack/react-router';
import { Head, Title, Meta } from '@tanstack/react-head';

const rootRoute = createRootRoute({
  component: () => (
    <>
      <Head>
        <Title>SuperPersova</Title>
        <Meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>
      <Outlet />
    </>
  ),
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: () => (
    <>
      <Head>
        <Title>Dashboard · SuperPersova</Title>
        <Meta name="description" content="Your analytics overview" />
      </Head>
      <DashboardPage />
    </>
  ),
});

const routeTree = rootRoute.addChildren([dashboardRoute]);
export const router = createRouter({ routeTree });
```

## Typed Params & Search

```tsx
import { z } from 'zod';
const searchSchema = z.object({ q: z.string().default('') });
const searchRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/search',
  validateSearch: (search) => searchSchema.parse(search),
  component: ({ useSearch }) => {
    const search = useSearch(); // typed { q: string }
    return <SearchPage initialQuery={search.q} />;
  },
});
```

## SSR Streaming Outline

Render on server using Vite SSR; hydrate client with same route tree.

## Code Splitting

Lazy imports for route components; integrated prefetch triggers (hover/focus/idle) via `PrefetchLink` and `useRoutePrefetch`.

```tsx
const ReportsPage = lazy(() => import('../../features/reports/pages/ReportsPage'));
const reportsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/reports',
  component: ReportsPage,
});
```

### Prefetch Strategy

- Hover/Focus: Immediate preload of route module.
- Visible (IntersectionObserver): Planned for prominent viewport links.
- Idle: Batch prefetch low-priority routes after initial hydration.

Benefits: Reduced Time-to-Interactive for subsequently visited routes; mitigates bundle waterfalls.

Promise Handling:

```ts
// Fire-and-forget prefetch clearly marked
void router.preloadRoute({ to: ROUTES.app.reports });
```

Rationale: `void` documents intentional ignore, satisfying lint and aiding audits.

## Protected Route Guards

Reason: Centralize authentication and authorization decisions; preserve user intent via return URL; avoid scattering conditional UI blocks.

Auth Status Flow:

- Not authenticated (`Idle`): redirect to login with `?return=<path>`.
- Partial (`NeedsTenant`): redirect to tenant selection with same `return` value.
- Fully authenticated: continue; enforce permission if required.

Example Guard (conceptual):

```ts
beforeLoad: ({ context, location }) => {
  const { auth } = context.store.getState();
  if (auth.status === AUTH_STATUS.Authenticated) return;
  if (auth.status === AUTH_STATUS.NeedsTenant) {
    throw redirect({ to: ROUTES.auth.selectTenant, search: { return: location.path } });
  }
  throw redirect({ to: ROUTES.auth.login, search: { return: location.path } });
};
```

Permission Enforcement:

```ts
if (requiredPermission && !auth.permissions.includes(requiredPermission)) {
  throw redirect({ to: ROUTES.auth.accessDenied, search: { return: location.path } });
}
```

Return URL Guidelines:

- Always encode original path when redirecting for auth/tenant/permission.
- Clear `return` parameter only upon successful navigation to the intended destination.

Benefits:

- Predictable, testable access control.
- Reduces duplication across pages.
- Enhances UX continuity for deep links and shared URLs.

## Stable Navigation Callbacks (`useStableEvent`)

Reason: Avoid re-binding navigation handlers (e.g., cancel/back) on every render while retaining fresh state.

Example:

```tsx
const handleCancel = useStableEvent(() => {
  if (window.history.length > 1) router.history.back?.();
  else navigate({ to: ROUTES.app.dashboard });
});
```

Benefits:

- Reduces unnecessary re-renders of child components consuming handlers.
- Ensures latest routing context without dependency-list churn.

### Enterprise Considerations

- Stable route IDs used in menu & navigation helpers decouple path refactors.
- Route-level error boundaries isolate failures (enhance resilience).
- SSR applied selectively — only marketing/docs routes to control infrastructure cost.
- Metadata centralization via head components enables consistent SEO across locales.

### Security & Maintainability Notes

- Avoid dynamic route creation from unsanitized user input.
- Keep loader logic side-effect free; perform auth/permission checks at guard layer.
- Use TypeScript generics for loader return types to prevent unsafe casts.

## Cache Busting & Version Polling

Reason: Ensure users automatically receive fresh assets after a deployment without manual hard refresh, reducing risk of mismatched API/client expectations.

Approach:

- CI injects build-time version (semantic tag or commit SHA) into `import.meta.env.VITE_APP_VERSION`.
- Backend exposes `/api/version` with `{ "version": "<build>" }` allowing server-driven overrides (e.g., force flag later).
- Frontend falls back to static `version.json` (served `Cache-Control: no-cache`) if backend unreachable.
- `VersionWatcher` polls backend first, then static file, at a low frequency (≈60s) with `cache: 'no-store'`.
- On mismatch → `window.location.reload()` (optionally gated by toast prompt for unsaved state).

Code (excerpt):

```tsx
const VersionWatcher = () => {
  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      let remoteVersion: string | undefined;
      try {
        const apiRes = await fetch(`/api/version?ts=${Date.now()}`, { cache: 'no-store' });
        if (apiRes.ok) {
          const data = await apiRes.json().catch(() => null);
          remoteVersion = data?.version;
        }
      } catch {
        /* ignore */
      }
      if (!remoteVersion) {
        try {
          const res = await fetch(`/version.json?ts=${Date.now()}`, { cache: 'no-store' });
          const json = await res.json().catch(() => null);
          remoteVersion = json?.version;
        } catch {
          /* ignore */
        }
      }
      if (mounted && remoteVersion && remoteVersion !== BUILD_VERSION) {
        window.location.reload();
      }
      if (mounted) setTimeout(poll, 60000);
    };
    poll();
    return () => {
      mounted = false;
    };
  }, []);
  return null;
};
```

Integration:

```tsx
// src/app/router/index.tsx (layout excerpt)
<>
  <VersionWatcher />
  <Outlet />
</>
```

Considerations:

- Poll interval balances immediacy vs network overhead; >30s typical.
- Ensure backend endpoint and `version.json` both served with `Cache-Control: no-cache`.
- For critical workflows add toast confirmation before hard reload.

Comment: This strategy avoids full-service worker complexity while covering 95% of stale asset scenarios.

Recent Fixes (2025-11-23):

- Removed legacy `withVersion` navigation flag (internal version polling only).
- Added void prefix to all router preload promises (lint compliance, clarity).
- Consolidated promise handling standard (see Engineering Standards).
- Husky pre-push gate ensures router changes pass typecheck + tests before sharing.

## URL Cleanliness & Navigation

Reason: Keep URLs human-readable and SEO-clean while still ensuring users adopt the latest build.

Decisions:

- Do not append build version as a URL query param. Version is tracked internally via `BUILD_VERSION` and `VersionWatcher`.
- `navigateById` no longer respects `withVersion`; the flag is deprecated and safely ignored.

Usage:

```tsx
// Before (deprecated):
navigateById(navigate, ROUTE_IDS.AppDashboard, { withVersion: true });

// Now:
navigateById(navigate, ROUTE_IDS.AppDashboard);
```

Prefetching note:

```tsx
// Ensure promises from preloading are handled or explicitly discarded
void router.preloadRoute({ to: ROUTES.app.reports });
```

---

End of Routing Guide.
