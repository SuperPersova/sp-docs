---
title: Deployment & Environment Configuration
version: 1.0.0
status: baseline
owner: DevOps
audience: developer
lastUpdated: 2025-11-23
tags: [docker, env, deployment]
changeLog:
  - 2025-11-23: Consolidated: env var conventions; version.json + backend version polling; removed URL version params; optional observability; SSR server dropped (static hosting focus); pnpm pin (10.23.0); Husky hooks + SKIP_PREPUSH; promise handling for pollers; error-report spec consolidated.
---

# Deployment & Environment Configuration

## Environment Variables (Vite)

- Prefix client-exposed vars with `VITE_`.
- Files: `.env`, `.env.local`, `.env.development`, `.env.staging`, `.env.production`.

```ts
const apiBase = import.meta.env.VITE_API_BASE_URL;
```

### Build Version Injection

Reason: Enable runtime detection of stale client versus latest deployment.
Pattern:

```powershell
$env:VITE_APP_VERSION = (git rev-parse --short HEAD) # or CI provided SEMVER
pnpm build
```

Fallback: If `VITE_APP_VERSION` absent, code defaults to a static string (e.g., 'v1').

Note: Version is tracked internally (for reload decisions) and is not appended to URLs.

### version.json Emission

During build, output `public/version.json`:

```json
{ "version": "1.2.3" }
```

Serve with headers:

```
Cache-Control: no-cache
Content-Type: application/json
```

Nginx snippet:

```nginx
location = /version.json { add_header Cache-Control "no-cache"; }
```

Consumption: Client polls and compares to bundled `BUILD_VERSION`; triggers reload on mismatch.

URL Cleanliness:

- Do not add `?v=` or similar query params to navigation. Cache busting relies on asset hashes and runtime polling rather than URL versioning.

pnpm Version Pinning:

```jsonc
"packageManager": "pnpm@10.23.0" // deterministic installs, avoids ambiguous major warnings
```

Activation (CI / local):

```powershell
corepack prepare pnpm@10.23.0 --activate
pnpm -v
```

Git Hooks (Husky v9):

- Pre-Commit: `pnpm lint-staged` (fast hygiene)
- Pre-Push: `pnpm typecheck`, `pnpm lint`, `pnpm test:ci`
- Fast-path skip: `SKIP_PREPUSH=1` env var for emergency bypass

Example PowerShell bypass:

```powershell
$env:SKIP_PREPUSH=1; git push
```

Promise Handling in Pollers:
Use `void` prefix when intentionally ignoring returned promise (e.g., `void poll()` inside setTimeout callback) to document decision and satisfy lint.

### Reload Considerations

- Critical forms: consider grace toast "New version available" with manual confirm.
- High-frequency deployments: lengthen polling interval to reduce chatter (e.g., 120s).

### Optional Observability Provider

External SaaS integration currently disabled. To enable later:

1. Provide DSN / API keys as env vars.
2. Initialize in a guarded module imported before app render.
3. Upload source maps post-build using provider CLI.
4. Keep sampling configuration environment-driven (higher in staging, lower in prod).

### PowerShell Example

```powershell
$env:VITE_API_BASE_URL = "https://api.dev.example.com"
pnpm dev
```

## Secrets Handling

- Do not put secrets behind `VITE_`.
- Use platform secret manager or Actions secrets.

## Docker Strategy

- Multi-stage build: Node (pnpm install + build) → Nginx serve static assets.
- Small Alpine base; healthcheck on `/_health`.

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:1.27-alpine AS serve
COPY infra/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK CMD wget -qO- http://localhost/_health || exit 1
```

## Nginx Notes

- Cache immutable assets; apply security headers.
- SPA fallback to `index.html` except SSR endpoints.

## CI Integration

- Build on main; tag image with `sha` + branch + semver.
- Optional Trivy scan fail on high/critical.

## Future Enhancements

- SBOM generation.
- Multi-region deployment matrix.
- Layer caching optimization for pnpm store.

---

End of Deployment & Environment Configuration.
