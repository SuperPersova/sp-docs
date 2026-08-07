---
title: Folder Structure
version: 1.0.0
status: baseline
owner: Frontend Platform
audience: developer
lastUpdated: 2025-11-23
tags: [architecture, fsd]
changeLog:
  - 2025-11-23: Migrated with front matter.
  - 2025-11-23: Added hook extraction guidance for list items.
  - 2025-11-23: Final baseline — feature-sliced layout validated; mapping references updated; hook-driven list item extraction guidance included to ensure stable hook ordering.
---

# Folder Structure (Finalized)

Enterprise feature-sliced layout enabling modular growth, bounded contexts, and maintainable scaling.

Refer to architecture overview for deeper rationale; below includes mapping guidance and evolution patterns.

```
src/
  app/
    providers/
    router/
    store/
    root.tsx
    main.tsx
  shared/
    ui/
    components/
    lib/
    api/
    config/
    styles/
    i18n/
    assets/
    types/
  entities/
  features/
  widgets/
  pages/
tests/
public/
```

---

End of Folder Structure.

## Rationale & Principles

- Cohesion: keep domain logic and UI close; extract only proven cross-cutting utilities to `shared/`.
- Discoverability: predictable placement reduces onboarding time (new hires learn pattern quickly).
- Performance: feature-level code splitting simplifies identifying prefetch boundaries.
- Security: tenant & permission logic isolated in `features/auth` and related slices — minimizes accidental leakage.

## Growth Patterns

- New entity starts in `entities/<name>` with minimal UI; if interactions expand, promote flows to `features/<name>`.
- Shared design tokens evolve under `shared/styles`; feature-specific themes stay local until reused 3+ times.
- Complex layouts promoted to `widgets/layouts` to prevent layout sprawl.

## Mapping Reference (Extended)

- `components/ui` (old) → `shared/ui` (primitive base components).
- `components/common` (old) → `shared/components` (compound patterns).
- `routes/*` → `app/router/*` central route tree control.
- Global `hooks/` (old) → `shared/lib/hooks`; prefer colocated feature hooks.
- Validation schemas → `shared/lib/validations` if reused; otherwise keep near feature API.

## Example Feature Structure

```
features/
  my-tasks/
    workflow/
      WorkflowTasksPage.tsx
      WorkflowTasksFilter.tsx
      api/workflowtasksApi.mock.ts
      # Note: legacy ApprovalsPage removed; MyTaskCard/MyTaskHeader deprecated
  tenant/                          # Tenant management feature
    api/
      tenantApi.mock.ts           # RTK Query endpoints + mock data
    components/
      TenantSwitcherModal.tsx     # Shared modal component
      AdvancedFiltersModal.tsx    # Filters modal
      PreferencesModal.tsx        # Preferences modal
    pages/
      TenantsPage.tsx             # List view with table/cards
      TenantDetailsPage.tsx       # Detail view with tabs
      TenantWizardPage.tsx        # Multi-step wizard
      TenantMembersContent.tsx    # Tab content component
      TenantFeaturesContent.tsx   # Tab content component
      TenantSubscriptionContent.tsx
      TenantSettingsContent.tsx
      TenantAuditContent.tsx
    model/                         # (Optional) Local state if needed

  auth/                            # Authentication feature
    api/authApi.mock.ts
    components/
      LoginForm.tsx
      TenantSelect.tsx
      RequirePermission.tsx
    model/authSlice.ts             # Auth state management

  menu/                            # Navigation menu feature
    api/menuApi.mock.ts
    components/Sidebar.tsx

  preferences/                     # User preferences feature
    pages/PreferencesPage.tsx
    model/preferencesSlice.ts      # Theme, font, language state
```

## Anti-Patterns

- Massive `shared/utils` accumulation without ownership → schedule quarterly pruning.
- Duplicated state normalization routines across features → extract adapter to `entities/<entity>/model`.
- Leaking feature internals (importing deep paths) → expose stable public surfaces via index files.
- Conditional hook calls inside array maps → extract item component to stabilize hook order.

### Hook-Driven List Item Extraction

Reason: React hooks must not be conditionally invoked; dynamic lists with branching logic easily violate this.

Bad:

```tsx
items.map((it) => (it.prefetch ? useRoutePrefetch(it.routeId) : null));
```

Good:

```tsx
function MenuPrefetchItem({ routeId }: { routeId: string }) {
  useRoutePrefetch(routeId);
  return null;
}
items.map((it) => it.prefetch && <MenuPrefetchItem key={it.id} routeId={it.routeId} />);
```

Outcome: Predictable hook ordering; easier testability via isolated item component.

## Future Enhancements

- Introduce generators (`pnpm exec scaffold:feature <name>`) to standardize creation.
- Optional layering labels (e.g., `layer: features`) in README for quick visualization.
