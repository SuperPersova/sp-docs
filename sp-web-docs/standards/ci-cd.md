---
title: CI/CD Pipeline
version: 1.0.0
status: baseline
owner: DevOps & Platform
audience: developer
lastUpdated: 2025-11-23
tags: [ci, cd, github-actions, quality-gates]
objectives:
  - Fast feedback (lint, type, test) within minutes
  - Deterministic builds (locked dependencies, cache reuse)
  - Artifact promotion (build -> image -> deploy)
  - Security & quality gates before production
changeLog:
  - 2025-11-23: Final baseline (quality gates, artifact promotion, optional external release mapping commented out).
---

# CI/CD Plan (GitHub Actions)

## Overview
Multi-stage pipeline ensures code quality, produces artifacts, builds container images, and deploys behind manual or environment approvals.

## Jobs
1. `lint-type-test`: ESLint, Prettier check, TypeScript `--noEmit`, Vitest (+ coverage) → publishes coverage & test report artifacts.
2. `build-web`: Vite production build → uploads `dist` artifact.
3. `docker-image`: Multi-arch image build & push (tags: sha, branch, optional semver).
4. `deploy`: Environment matrix (dev/stage/prod) with approvals & rollout commands.
 5. (Removed) `sentry-release`: Optional future job for external source map symbolication.

## Caching
- pnpm store path keyed by lockfile.
- Optional: cache Vite build cache & Vitest on large repos.

## Secrets & Vars
- `REGISTRY_HOST`, `REGISTRY_REPO`, `REGISTRY_USERNAME`, `REGISTRY_PASSWORD`.
- Non-secret runtime config baked via `VITE_` variables at build time.
- Sensitive values never exposed with `VITE_` prefix.

## Example Workflow (Outline)
```yaml
name: ci
on: [push, pull_request]
jobs:
  lint-type-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck
      - run: pnpm test:ci

  build-web:
    needs: [lint-type-test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: { name: dist, path: dist }

  docker-image:
    needs: [build-web]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ vars.REGISTRY_HOST }}
          username: ${{ secrets.REGISTRY_USERNAME }}
          password: ${{ secrets.REGISTRY_PASSWORD }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ${{ vars.REGISTRY_REPO }}
          tags: |
            type=sha
            type=ref,event=branch
      - uses: docker/build-push-action@v6
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy:
    if: github.ref == 'refs/heads/main'
    needs: [docker-image]
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy
        run: echo "Trigger platform deployment here"

## Optional External Release Mapping (Future)
If an external error aggregation service is adopted:
- Align `VITE_APP_VERSION` with release identifier.
- Upload source maps after build for stack trace symbolication.
- Avoid bundling maps in final image when not needed by runtime.
```

## Quality Gates
- Lint errors → fail.
- Type errors → fail.
- Coverage below thresholds → fail.
- (Optional) Trivy image scan fail on high/critical severity.

## Artifacts
- `coverage/` reports uploaded for PR review.
- `test-results.xml` (JUnit) for annotations.
- `dist/` build promoted to image build.

## Promotion Strategy
Build once (immutable dist) → reuse artifact for image build; ensures deterministic output.

## Future Enhancements
- Parallel test splitting by timing data.
- Incremental type checking caching layer.
- Canary deployments + automated rollback hook.
- SBOM generation & attestation.

---
End of CI/CD Pipeline.