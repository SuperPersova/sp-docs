---
title: Roadmap & Architectural Decisions
version: 1.0.0
status: baseline
owner: Product & Platform
audience: business, developer
lastUpdated: 2025-11-23
tags: [adr, roadmap, handoff]
changeLog:
  - 2025-11-23: Combined dev-handoff + stack-decisions.
roadmapHorizon:
  shortTerm: [multi-tenant auth prod, token refresh, SSR marketing]
  midTerm: [advanced prefetch heuristics, accessibility audit, container queries]
  longTerm: [RBAC editor, analytics module, optional micro-frontend split]
---

# Roadmap & ADRs

## Purpose
Central reference for high-level technical decisions (ADRs) and near-term roadmap priorities guiding feature development and onboarding.

## Stack Decisions (ADRs)
### React 19 + Selective SSR
Client-first dashboards for interactivity; streaming SSR only for SEO-critical pages to balance complexity and performance.

### Vite + pnpm
Rapid HMR and lean build pipeline; pnpm ensures disk efficiency and future monorepo potential.

### State & Data Layer
Redux Toolkit + RTK Query unify global and server state. React Query reserved for edge cases not fitting RTK Query tag invalidation model.

### UI Layer
Tailwind utilities + ShadCN (Radix) primitives for accessible, composable components with minimal bespoke CSS.

### Animations
Framer Motion adopted for production-ready transitions with reduced-motion compliance.

### HTTP Abstraction
RTK Query `fetchBaseQuery` preferred; Axios retained only for specialized needs (progress events, custom transports).

### Testing Stack
Vitest + React Testing Library + MSW ensures hermetic component/integration tests and reliable coverage enforcement.

### CI/CD & Containerization
GitHub Actions multi-stage pipeline; Docker multi-stage to Nginx. Future SSR layer optionally introduced behind Node server.

## Developer Handoff Essentials
Key modules and patterns new contributors must internalize:
- Router: `app/router/index.tsx` (route tree, layout shell, prefetch hooks).
- Store: `app/store` (configure slices, middleware, hydration strategy).
- Auth Slice: multi-tenant status machine (idle, authenticating, needsTenant, authenticated).
- Menu System: data-driven items with permission gating and keyboard navigation.
- Preferences: theming, font size, language, persisted user-centric settings.

### Standards Snapshot
Refer to `standards/engineering-standards.md` and `standards/security.md` for coding & security baselines.

## Roadmap (Priority Buckets)
1. Multi-tenant auth productionization (refresh token flow, 403 route, OTP/social integration).
2. Performance uplift (adaptive prefetch, bundle budgets, vitals telemetry backend).
3. Accessibility audit (screen reader flows, color contrast validation, keyboard resizing improvements).
4. Internationalization depth (pluralization edge cases, language-specific SEO sitemaps).
5. Developer Experience (generator scripts for feature scaffolding, improved ADR templates).

## Decision Evaluation Criteria
- User Impact (improves onboarding, performance, or accessibility)
- Complexity vs Maintainability tradeoff
- Alignment with performance/security budgets
- Interoperability with future multi-repo or micro-frontend expansion

## Pending ADR Candidates
- Adopting RSC for specific data-heavy read-only routes.
- Introducing Signals for performance hotspots.
- API layer refactor for streaming (fetch + ReadableStream parsing).

## Handoff Checklist
- [ ] Reviewed architecture & folder structure docs.
- [ ] Understood auth multi-tenant state machine.
- [ ] Ran local tests & ensured coverage pass.
- [ ] Added i18n keys for new feature.
- [ ] Confirmed permissions mapping for any new menu route.

## Contribution Workflow
1. Create feature branch.
2. Implement feature within `features/<name>`.
3. Add tests (unit + integration if route-level).
4. Update docs if introducing novel patterns.
5. Conventional commit; open PR; ensure CI green & review approvals.

## Future Strategic Goals
- RBAC UI editor with audit logging.
- Real-time collaboration primitives (presence, live cursors) — may trigger structured state refactor.
- Pluggable analytics module (shared event bus + domain-specific tracking).

---
End of Roadmap & ADRs.