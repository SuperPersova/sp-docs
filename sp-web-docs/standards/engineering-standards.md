---
title: Engineering Standards
version: 1.0.0
status: baseline
owner: Platform Engineering
audience: developer
lastUpdated: 2025-11-23
tags: [typescript, react, testing, quality, accessibility]
scope: >
  Consolidated coding, testing, and quality practices for the template repository.
qualityGates:
  coverage:
    branches: 80
    lines: 85
    functions: 85
  lint: true
  typecheck: strict
changeLog:
  - 2025-11-23: Consolidated: strict TS & Zod validation; hook order integrity; version polling sans URL params; structured ErrorBoundary + backend report spec; SSR server removed (static SPA hosting); pnpm pinned (10.23.0); Husky v9 hooks (lint-staged, typecheck+lint+tests, SKIP_PREPUSH); promise handling (`void` vs `await`); error-report doc merged.
---

# Engineering Standards

## TypeScript

- Compiler: `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.
- Definitions: Prefer `type` over `interface` (unions/intersections compose better). Use interfaces only when declaration merging or class implementation is required.
- Runtime validation: Parse external data via Zod schemas — never trust shapes from network/storage blindly.
- Lint rules:
  - `@typescript-eslint/consistent-type-definitions: ["warn", "type"]`
  - `@typescript-eslint/consistent-type-imports: "warn"`
  - `@typescript-eslint/no-floating-promises: "error"`
  - `@typescript-eslint/no-misused-promises: ["error", { checksVoidReturn: { attributes: false } }]`
  - Enforced explicit `void` prefix for intentional fire-and-forget (prefetch, language switch, non-critical telemetry) to document ignoring.

Example (Zod + inferred types):

```ts
// src/shared/lib/validation/authSchemas.ts
import { z } from 'zod';
export const LoginRequestSchema = z.object({
  emailOrPhone: z.string(),
  password: z.string().optional(),
  otp: z.string().optional(),
  rememberMe: z.boolean().optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;
```

Usage in RTK Query mock:

```ts
const req = LoginRequestSchema.parse(body); // throws on invalid input
```

## React

- Components remain pure; side-effects in hooks.
- Co-locate tests next to source (`*.test.ts(x)`).
- Use ShadCN/Radix primitives for accessible interactions (focus, keyboard traps).
- Memoize and provide stable callbacks (`useCallback`) for frequently re-rendered child components.

### Hook Order Integrity

Rule: Hooks must be invoked in identical order every render.
Anti-Pattern:

```tsx
items.map((i) => (i.shouldPrefetch ? useRoutePrefetch(i.routeId) : null)); // varying count
```

Standard:

```tsx
function PrefetchItem({ routeId }: { routeId: string }) {
  useRoutePrefetch(routeId);
  return null;
}
items.map((i) => i.shouldPrefetch && <PrefetchItem key={i.id} routeId={i.routeId} />);
```

Guideline: Extract list item components that own hooks; never branch around a hook call directly.

### Deployment Versioning

Goal: Automatic adoption of new deployments without manual refresh.
Implementation:

- CI sets `VITE_APP_VERSION` (semantic version or short SHA).
- Build emits `public/version.json` with `{ "version": "<same value>" }`.
- `VersionWatcher` polls every ~60s using `fetch('/version.json', { cache: 'no-store' })`.
- On mismatch, triggers `window.location.reload()` (optionally gated by user prompt if unsaved work risk).
  Notes:
- Serve `version.json` with `Cache-Control: no-cache`.
- Keep polling interval >=30s to limit overhead.
- Document rationale in Architecture for future evolution (e.g., service worker).

## Error Handling & Reporting

- Wrap root app with `ErrorBoundary`; avoid excessive nested boundaries except around unstable widgets.
- Produce structured payload (see below) excluding secrets or raw request bodies.
- POST payload to `/api/error-report`; backend adds storage/indexing & additional redaction.
- Provide user options: Retry, Report, Copy, Download, Details (collapsed by default).

### Structured Payload Example

```jsonc
{
  // Reason: timestamp enables correlation with backend logs
  "timestamp": "2025-11-23T12:45:10.321Z",
  // Reason: build version maps to release for reproducing exact bundle
  "version": "v1.2.3",
  "message": "renderIcon is not defined",
  "name": "ReferenceError",
  // Reason: trimmed stack (<=25 frames) keeps payload small
  "stack": ["SidebarItem (SidebarItem.tsx:42:10)", "..."],
  // Reason: route contextualizes user journey
  "route": "/app/dashboard", // version is internal; no URL param
  // Reason: environment diagnostics (connectivity, UA)
  "online": true,
  "userAgent": "Chrome/119.0",
  // Reason: tenant/user id for multi-tenant isolation checks
  "tenant": "acme",
  "userId": "u_123",
  // Reason: slice list helps spot stale state partitions
  "reduxSlices": ["auth", "preferences", "menu"],
  // Reason: server ping for distinguishing client-only vs infra outage
  "serverPing": { "ok": true, "checkedAt": "2025-11-23T12:45:10.410Z" },
}
```

### Backend Reporting Flow

POST `/api/error-report` with structured JSON. Backend responsibilities:

- Redact sensitive keys server-side (denylist reinforcement).
- Persist short-term (e.g., 30 days) in low-cost storage.
- Index by `version`, `route`, `tenant` for correlation.

### Comments

## Tooling & Workflow

### pnpm Version Pinning

Reason: Ensure reproducible installs and eliminate Corepack warning from broad major spec.
Policy: `packageManager: pnpm@10.23.0` (update deliberately with changelog entry).
Verification:

```powershell
corepack prepare pnpm@10.23.0 --activate
pnpm -v
```

### Git Hooks (Husky v9)

Pre-Commit: `pnpm lint-staged` (fast per-file hygiene).
Pre-Push: `pnpm typecheck`, `pnpm lint`, `pnpm test:ci` (confidence gate).
Fast-Path Skip:

```powershell
$env:SKIP_PREPUSH=1; git push   # emergency bypass
```

Rules:

- Use skip only for unblocking; follow with manual CI run/PR status check.
- Do not add a global skip alias; keep intent explicit.

### Promise Handling Standard

Fire-and-forget must use `void`:

```ts
void router.preloadRoute({ to: '/reports' });
void i18next.changeLanguage('fr');
```

Await operational promises:

```ts
await selectTenant({ tenantId, interimToken }).unwrap();
```

Rationale: Makes ignored promises grep-friendly; prevents silent rejections.

### Recent Fixes (2025-11-23)

- Hoisted sidebar icon logic to fix ReferenceError & maintain hook order.
- Removed version query parameter injection (URL cleanliness maintained).
- Added `/api/error-report` spec + MSW mock; removed standalone doc duplication.
- Pinned pnpm version for determinism.
- Added Husky modernization with SKIP_PREPUSH bypass.
- Codified promise handling (`void` for ignored, await for critical).

- Never include tokens, secrets, or full request payloads.
- Redact PII beyond minimal user identifier (email/phone omitted by default).
- Keep error UI accessible (focusable buttons, semantic headings) to ensure inclusive reporting.

## State & Data

- Redux Toolkit slices for global feature state.
- RTK Query for server state (caching, invalidation, retries).
- Avoid duplicating server responses in local component state.
- Normalize large collections; derive computed views via selectors.

## URL State

- Represent shareable state (filters, search, pagination) in the URL via TanStack Router `useSearch`.

## Formatting & Linting

- ESLint (React, TS, a11y, tailwind), Prettier enforced in CI.
- No unused vars, explicit return types for exported functions.
- Tailwind class ordering left to Prettier plugin (optional later).

## Testing Strategy

Test pyramid balances speed and confidence.
| Level | Tools | Purpose |
|-------|-------|---------|
| Unit | Vitest + RTL (hooks, pure funcs) | Fast correctness |
| Component | RTL + MSW | Interaction, rendering |
| Integration | Router + Store + i18n + MSW | Flow validation |
| E2E (future) | Playwright/Cypress | Critical user journeys |

### Conventions

- Co-locate tests; avoid top-level `__tests__` except for global utilities.
- Prefer explicit assertions over large snapshots.
- Use MSW for request isolation; no live API calls.
- Accessibility checks (axe) for interactive components.

### Coverage Gates

Branches ≥ 80%, lines ≥ 85%. Exclude generated code and purely type-only modules. Failing gates block merge.

### Example Scripts (package.json)

```
"scripts": {
  "test": "vitest",
  "test:ci": "vitest run --coverage",
  "lint": "eslint .",
  "typecheck": "tsc --noEmit"
}
```

## Accessibility (a11y)

- Semantic HTML first; ARIA only for missing semantics.
- Maintain logical focus order; visible focus indicators.
- Respect reduced motion (`prefers-reduced-motion`).
- Test keyboard navigation (Tab, Shift+Tab, Arrow keys) in menus and dialogs.

## Date & Number Utilities

```ts
export const fmtDate = (d: Date, locale = 'en') =>
  new Intl.DateTimeFormat(locale, { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
export const fmtCurrency = (n: number, locale = 'en', currency = 'USD') =>
  new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n);
```

## Commits & Branches

- Conventional Commits: feat/fix/chore/docs/refactor/test/ci.
- Short-lived feature branches; rebase onto main before merge.
- Protected `main`: requires lint, test, type checks passing.

## Continuous Improvement

- Quarterly review of coverage thresholds and accessibility audit results.
- Introduce visual regression tooling if UI complexity warrants.
- Consider contract tests for critical API interactions once backend stabilizes.

---

End of Engineering Standards.
