---
title: Security Standard
version: 1.0.0
status: baseline
owner: Security & Platform
audience: developer
lastUpdated: 2025-11-23
tags: [security, headers, dependency, auth]
objective: >
  Define minimum security controls (headers, storage, dependency hygiene, multi-tenant isolation)
  for the SuperPersova template so new features launch with hardened defaults.
threatModel:
  assets:
    - Access tokens (in-memory)
    - Refresh tokens (httpOnly cookie planned)
    - Tenant-scoped data APIs
    - User PII (email/phone)
  actors:
    - External attacker
    - Compromised dependency
    - Malicious tenant user (horizontal privilege escalation)
  vectors:
    - XSS leading to token theft
    - CSRF (if cookies adopted incorrectly)
    - Over-permissioned token -> unauthorized feature access
    - Supply-chain vulnerable package
controls:
  - Content Security Policy with strict-dynamic script rules
  - Memory token storage to reduce persistence exposure
  - Least privilege permissions per tenant-scoped token
  - Automated dependency audit (Dependabot + pnpm audit)
  - Planned refresh rotation with single-flight 401 handler
validationChecklist:
  - [ ] CSP applied in Nginx/Edge config
  - [ ] No secrets committed (scan pre-merge)
  - [ ] `VITE_` variables contain only non-sensitive values
  - [ ] Token refresh flow tested (401 -> refresh -> retry)
  - [ ] Permissions enforced server-side & client guard
  - [ ] Workflow approver RBAC enforced server-side (no client-only checks)
  - [ ] IDOR protections on workflow definition/instance IDs
  - [ ] Audit events emitted for assignment, approval, rejection, reassignment
  - [ ] No `dangerouslySetInnerHTML` in selection/search components
changeLog:
  - 2025-11-23: Final baseline (threat model, controls, safe error reporting & redaction guidelines).
---

# Security

## Overview

Security is codified as baseline controls built into the template: strict headers, ephemeral access tokens, tenant isolation, permission gating, and continuous dependency hygiene. This document enumerates required configurations and rationale.

## Dependencies

- Dependabot for npm updates
- `pnpm audit` in CI (allowlist only vetted false positives)
- Optional: Snyk or Trivy for deeper supply chain scans

## Mandatory Response Headers (edge / Nginx)

Add via reverse proxy or CDN configuration:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'strict-dynamic' https:; object-src 'none'; base-uri 'self'; frame-ancestors 'none';
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer-when-downgrade
Permissions-Policy: camera=(), microphone=(), geolocation=()
```

Recommended additions (when applicable):

```
X-Frame-Options: DENY (or use CSP frame-ancestors)
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp (if SharedArrayBuffer needed)
```

## Token & Storage Strategy

- Access token: in-memory (Redux slice) + optional sessionStorage fallback for reload resilience (avoid localStorage persistence).
- Refresh token: httpOnly, Secure, SameSite=Strict cookie (backend integration pending).
- Prevent tenant spoofing: server issues tenant-scoped tokens; client never crafts tenantId outside selection/switch endpoints.

## Authentication & Authorization

- Multi-tenant flows differentiate interim vs scoped tokens.
- Permissions embedded in scoped token; client filters UI + server enforces authorization.
- On 401: attempt single-flight refresh; if fails, sign out and clear sensitive state.

## Workflows & Approvals Security

Reason: Workflow assignment and approval actions change authorization state and must be protected against IDOR, elevation, and tampering.

Controls:

- Enforce RBAC server-side for all workflow endpoints (definitions, assignments, instances, approvals). UI gating is advisory only.
- Validate all IDs (workflowId, instanceId, stageId) belong to the caller's tenant and are visible to the principal. Never rely on client-provided tenantId.
- Require approver membership per stage before accepting approve/reject actions; verify quorum math server-side (e.g., `requiredApprovals <= reviewers.length`).
- Use idempotency keys for approval/rejection to prevent double-submit or replay on flaky networks.
- Emit immutable audit log events for: template create/update, assignment changes, approval decisions, overrides/escalations; include actor, tenant, before/after snapshot hashes, and correlation IDs.
- Paginate workflow searches; treat search as untrusted input (debounced client-side), and rate-limit server-side to prevent enumeration.

Client Guardrails (complementary, not authoritative):

- Route protection: hide management routes when user lacks permissions; still assume server enforces.
- Prevent Insecure Direct Object Reference: never construct links from raw input; always use IDs returned by authorized list/detail endpoints.
- Disable approve/reject buttons when user not in stage reviewers; server must re-check regardless.

Example (client-side assertion – still must be enforced server-side):

```ts
const canAct = instance.currentStage.reviewers.includes(currentUser.id);
```

Server MUST verify `canAct` and that the instance belongs to the tenant before mutating state.

## CSRF Considerations

Pure bearer token flows are not inherently CSRF-prone; if refresh cookie added, backend must enforce SameSite and short lifetime. Avoid mixing cookie + implicit auth flows without CSRF mitigation.

RTK Query Guardrails:

- Prefer `Authorization: Bearer <accessToken>` header; if cookies are used for refresh, send anti-CSRF header (e.g., `X-CSRF-Token`) and check origin/referrer server-side.
- Set `credentials: 'include'` only for first-party API origins; do not enable broadly.
- Treat 401 as a refresh trigger with single-flight; on refresh failure, hard sign-out and clear memory.

## Secure Coding Practices

- Avoid interpolating untrusted strings directly into the DOM; rely on React’s escaping.
- Sanitize any rich HTML content (e.g., user-provided markdown) with a vetted library before `dangerouslySetInnerHTML` (not used by default here).
- Validate JSON responses with Zod to prevent downstream type assumptions from enabling logic flaws.

### Shared Components Security Notes

SearchableSelectField (shared multi/single select):

- React-escaped rendering only; component does not use `dangerouslySetInnerHTML`.
- Enforce minimum search length (default ≥3) to reduce brute-force enumeration and accidental heavy queries. Debounce input (300ms) to mitigate UI-driven floods; server must still rate-limit.
- Exclude already-selected items from results to prevent duplicate state and potential logic abuse.
- Stop event propagation on tag remove and checkbox interactions to avoid unintended toggles.
- Do not pass raw HTML in option labels/descriptions. If absolutely required, sanitize on the server and pass plain text to the client.

Example safe option mapping:

```ts
const options = users.map((u) => ({
  id: u.id,
  label: String(u.name), // ensure string; no HTML
  description: u.email ?? '',
}));
```

Keyboard/accessibility:

- Ensure focus states are visible and operable; prevents users from relying on unsafe mouse-only workarounds.

### i18n & Theming Security

- Keep translation values as plain text; default i18next escaping should remain enabled. Avoid translations containing raw HTML.
- For interpolations (e.g., names, counts), rely on i18next escaping. Do not concatenate HTML strings.
- Theming uses CSS variables; do not inject untrusted CSS values at runtime.

## Dependency Hygiene

- Pin versions via `pnpm-lock.yaml`.
- Review transitive vulnerabilities weekly; prioritize high/critical fixes.
- Remove unused packages promptly.

## RTK Query Integration Guardrails

- Centralize `baseQuery` with an allowlist of API origins; reject cross-origin calls by default.
- Attach `Authorization` header from in-memory token only; never persist tokens to localStorage.
- Implement single-flight refresh logic; lock refresh to prevent token stampede.
- Normalize error shapes; redact sensitive fields before logging.

## Multi-tenant Isolation

- All workflow and assignment requests must be authorized against tenant claims in the access token. Do not accept tenant identifiers from the client except via explicit, audited tenant-switch APIs.
- Server should enforce row-level security or equivalent policy per tenant and resource type.
- Do not leak cross-tenant IDs in error messages or timing side-channels; return 404 for unauthorized resources.

## Logging & Observability (Future)

- Correlate auth events (login, tenant switch, refresh failures) with structured logs.
- Add anomaly detection hooks (e.g., excessive failed login attempts) for alerting.

### Safe Error Reporting

Reason: Structured client error payloads accelerate triage but risk leaking sensitive data if not redacted.

Guidelines:

- Include only: timestamp, build version, route, trimmed stack, tenant slug, user id, slice names, connectivity flag.
- Exclude: tokens, refresh cookies, raw API response bodies, PII beyond minimal user identifier.
- Truncate stack frames (≤25) to avoid oversized payloads revealing internal paths.
- Validate payload before sending: ensure no keys match denylist (`token`, `password`, `secret`).
- In Sentry scope, use tags for version/route; avoid attaching full state snapshots.

Example Redaction Snippet (Conceptual):

```ts
function redact(details: Record<string, any>) {
  const deny = ['accessToken', 'refreshToken', 'password', 'secret'];
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(details)) {
    if (deny.includes(k)) continue;
    out[k] = v;
  }
  return out;
}
```

Comments:

- Review redaction list quarterly as new sensitive fields introduced.
- Maintain separation: diagnostic payload stored transiently; never persist long-term client-side.

## Incident Response (Template)

1. Identify scope (affected tenants/users).
2. Rotate compromised tokens (invalidate backend sessions).
3. Patch vulnerable dependency and redeploy.
4. Communicate impact & mitigation steps.
5. Post-mortem and ADR if architectural change required.

## Security Testing

Purpose: Provide actionable tests to validate RBAC, IDOR, CSRF, headers, rate limiting, and workflow approval invariants. These complement unit tests and must run in CI.

### Test Matrix

- RBAC: Unauthorized users cannot access management pages or mutate workflows (403/404 server responses).
- IDOR: Cross-tenant access to workflow definitions/instances returns 404; no data leakage in error bodies.
- Rate Limiting: Workflow search endpoints throttle excessive requests (e.g., 429 after threshold).
- Headers: HTML responses include CSP, HSTS, and safety headers.
- CSRF (if cookies used): State-changing endpoints require anti-CSRF token and proper Origin/Referrer.
- Audit: Approval/rejection emits one audit event; duplicate submissions are idempotent.

### API Tests (Jest-style, pseudocode)

```ts
import request from 'supertest';

describe('Workflows API security', () => {
  test('IDOR: cannot fetch workflow from another tenant', async () => {
    const res = await request(api)
      .get('/api/workflows/wf-other-tenant')
      .set('Authorization', `Bearer ${tokenOfTenantA}`);
    expect([403, 404]).toContain(res.status);
  });

  test('RBAC: non-admin cannot assign workflow', async () => {
    const res = await request(api)
      .post('/api/workflows/wf-001/assign')
      .send({ resourceType: 'ROLE' })
      .set('Authorization', `Bearer ${nonAdminToken}`);
    expect(res.status).toBe(403);
  });

  test('Idempotency: duplicate approve yields one mutation', async () => {
    const first = await request(api)
      .post('/api/workflow-instances/wi-123/stages/st-1/approve')
      .set('Idempotency-Key', 'key-123')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ reason: 'LGTM' });
    const second = await request(api)
      .post('/api/workflow-instances/wi-123/stages/st-1/approve')
      .set('Idempotency-Key', 'key-123')
      .set('Authorization', `Bearer ${approverToken}`)
      .send({ reason: 'LGTM' });
    expect([200, 201]).toContain(first.status);
    expect([200, 304, 409]).toContain(second.status);
  });

  test('Headers: CSP and HSTS present', async () => {
    const res = await request(web).get('/');
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toMatch(/max-age/);
  });
});
```

### E2E Tests (Playwright-style, pseudocode)

```ts
import { test, expect } from '@playwright/test';

test('RBAC: management page hidden for non-admin', async ({ page }) => {
  await loginAs(page, 'user');
  await page.goto('/workflows');
  await expect(page.getByText('Create Workflow')).toHaveCount(0);
});

test('IDOR: direct navigation to other-tenant workflow shows not found', async ({ page }) => {
  await loginAs(page, 'tenantA-user');
  await page.goto('/workflows/wf-tenantB');
  await expect(page.getByText(/not found/i)).toBeVisible();
});

test('Headers on HTML', async ({ request }) => {
  const res = await request.get('/');
  expect(res.headers()['content-security-policy']).toBeTruthy();
});
```

### Rate Limiting Test (concept)

```ts
test('rate limit on search', async () => {
  const calls = Array.from({ length: 50 }, (_, i) =>
    request(api).get('/api/workflows?search=abc').set('Authorization', `Bearer ${token}`),
  );
  const results = await Promise.all(calls);
  expect(results.some((r) => r.status === 429)).toBe(true);
});
```

### CI Integration (example commands)

Run locally (PowerShell):

```powershell
pnpm install
pnpm test
pnpm e2e
```

In CI: require security test job to pass before deploy.

## Checklist – Before Release

- [ ] Headers verified in staging environment.
- [ ] No secrets in client bundle (`VITE_` scan).
- [ ] Permissions matrix documented for critical features.
- [ ] Refresh flow exercised (manual + automated test).
- [ ] Dependency audit clean or accepted.
- [ ] Security tests (RBAC, IDOR, headers, rate-limit) passing in CI.

## Checklist – Workflows & Approvals

- [ ] Server-side RBAC enforced for template create/edit, assignment, and approvals.
- [ ] IDOR tests for definition, instance, and stage endpoints.
- [ ] Approval actions idempotent and audited (actor, reason, correlationId).
- [ ] Search endpoints rate-limited; results paginated; tenant-scoped.
- [ ] Client uses debounced search and minimum length; no HTML injection in options.

## Future Enhancements

- Content Security Policy reporting endpoint.
- Subresource Integrity for critical CDN scripts (if any added).
- Automated permission reviews and drift detection.
- Tenant-level RBAC editor with audit log.

---

End of Security Standard.
