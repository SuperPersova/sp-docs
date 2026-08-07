---
title: Multi-Tenant Auth Overview
version: 1.0.0
status: business
owner: Product & Identity
audience: business, product, developer
lastUpdated: 2025-11-23
tags: [multi-tenant, onboarding, identity]
changeLog:
  - 2025-11-23: Added business-facing overview referencing technical doc.
purpose: >
  Provide a non-technical summary of how users with one or many tenants authenticate,
  how we streamline repeat logins, and what business value multi-tenant architecture enables.
---

# Multi-Tenant Auth Overview

## Why It Matters (Business Value)
- Enables a single user identity to operate across multiple organizations (tenants) without separate accounts.
- Reduces onboarding friction: single-tenant users reach the dashboard immediately; multi-tenant users choose context only when needed.
- Supports upsell & expansion: a user can be invited to additional tenants and gains contextual access without re-registration.
- Enhances security & compliance: tenant-scoped tokens and explicit permissions minimize cross-tenant data exposure.

## User Experience Summary
| Scenario | User Action | System Response | Outcome |
|----------|-------------|-----------------|---------|
| Single Tenant | Login with credentials/social | Receives tenant-scoped token | Direct to dashboard |
| Multiple Tenants (first time) | Login | Receives interim token + tenant list | Chooses tenant (or auto-select if last matches) |
| Multiple Tenants (repeat) | Login | Interim token + tenants; auto-select if last still valid | Skip manual choice |
| Switch Tenant | Open menu & select other tenant | Scoped token replaced; permissions/menu refreshed | Seamless context switch |

## Key Concepts
- Interim Token: Short-lived token allowing tenant selection; expires quickly to limit risk.
- Scoped Token: Access limited to one tenant; includes permission claims for UI gating & API authorization.
- Last Tenant Memory: Local preference remembering the previous tenant to accelerate subsequent logins.
- Permissions: Fine-grained capabilities (e.g., `reports:view`) determining visible features and allowed actions.

## Business Rules
1. A removed tenant invalidates auto-select; user must choose a new tenant explicitly.
2. Permission changes reflect after next token issuance (login, switch, or refresh).
3. Tenant switching never leaks data; all cached tenant-specific data is refreshed/invalidated.
4. Social logins follow the same interim vs scoped pattern—maintains consistent experience.

## Security & Compliance Highlights
- Scoped tokens prevent horizontal data access across tenants.
- Short lifetime interim tokens reduce exposure during selection step.
- Central permission claims simplify auditing which features a user can access.
- Future audit logging of tenant switches will support compliance reviews.

## Performance Considerations (High-Level)
- Menu and feature data fetched only after tenant context established—reduces wasted network calls.
- Caching keyed by tenant enables fast switching while avoiding stale cross-tenant data.

## KPIs & Metrics (Proposed)
- Tenant Switch Success Latency (p95).
- Auto-Select Success Rate (% of multi-tenant logins without manual choice).
- Auth Error Rate (invalid interim token, permission mismatch).
- Expansion: Average number of tenants per active user over time.

## Expansion Opportunities
- RBAC Editor: Productized role management to delegate permissions.
- Audit Trails: Track tenant switches and permission changes for governance.
- Cross-Tenant Insights: Aggregate analytics while respecting scoped data boundaries.

## Reference (Technical Details)
For full technical flows, endpoints, state machine, security notes, and implementation order see:
`docs/developer/auth-tenant-flow.md`

---
End of Multi-Tenant Auth Overview.