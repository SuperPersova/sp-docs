# sp-web-ext — Build, Run, Test & Deploy

> WXT + React + Zustand + shadcn/ui + Tailwind. Chrome MV3 (also builds Firefox MV2).

## Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Run `pnpm install` from the workspace root (`sp_web_space/`)

---

## Dev (Hot Reload)

```bash
# From sp_web_space/sp-web-ext/
pnpm dev              # Chrome (opens browser with extension loaded)
pnpm dev:firefox      # Firefox MV2
```

WXT automatically opens a browser with the extension installed and HMR enabled. The side panel reloads on save without a full extension restart.

---

## Build

```bash
pnpm build            # Chrome MV3 (default)
pnpm build:firefox    # Firefox MV2

pnpm build:stage      # Chrome, stage mode (VITE_MODE=stage .env.stage)
pnpm build:prod       # Chrome, production mode (VITE_MODE=production .env.production)
```

Output lands in `.output/`:
- `chrome-mv3/` — Chrome/Edge extension
- `firefox-mv2/` — Firefox extension

### Environment variables

WXT reads `.env`, `.env.stage`, `.env.production`. Prefix vars with `VITE_` to expose them in the extension:

```
VITE_API_URL=https://api.superpersova.com
```

---

## Load in Browser (Manual)

**Chrome / Edge:**
1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select `.output/chrome-mv3/`

**Firefox:**
1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `.output/firefox-mv2/manifest.json`

---

## Type Check

```bash
pnpm type-check    # tsc --noEmit (no output, errors only)
```

---

## Tests

```bash
pnpm test              # Run all tests (vitest run)
pnpm test:watch        # Watch mode (re-runs on file change)
pnpm test:coverage     # Coverage report (v8)
```

Test files live in `src/tests/` and mirror the `src/` structure:

```
src/tests/
├── setup.ts                      # happy-dom + chrome API mocks
├── services/
│   ├── auth.service.test.ts
│   ├── propulse.service.test.ts
│   ├── activity.service.test.ts
│   └── handler-loader.service.test.ts
└── stores/
    ├── authStore.test.ts
    ├── aiStore.test.ts
    └── breaksStore.test.ts
```

Tests run in `happy-dom` (browser-like). Chrome extension APIs are mocked in `setup.ts`.

---

## Zip for Distribution

```bash
pnpm zip    # Builds + zips .output/chrome-mv3/ → .output/sp-web-ext-*.zip
```

---

## Entrypoint Map

| Entrypoint | Location | Notes |
|-----------|----------|-------|
| Service Worker | `entrypoints/background/index.ts` | 6 focused modules, no god-file |
| Side Panel | `entrypoints/sidepanel/main.tsx` | React SPA, React Router |
| Content Script | `entrypoints/content.ts` | Vanilla TS, no React |

**Background modules** (`entrypoints/background/`):

| File | Responsibility |
|------|---------------|
| `index.ts` | Entry, lifecycle (install / startup) |
| `message-router.ts` | `onMessage` dispatcher |
| `ai-orchestrator.ts` | AI queue / poll / retry |
| `context-capturer.ts` | Context extraction + IndexedDB |
| `handler-injector.ts` | Dynamic CDN handler loading |
| `tab-manager.ts` | Tab lifecycle (onUpdated, onRemoved) |
| `auth-bridge-handler.ts` | Auth state sync from sp-web |

---

---

## CI / CD — GitHub Actions

Three workflows live in `.github/workflows/`:

| Workflow | File | Trigger |
|----------|------|---------|
| CI (typecheck + build + test) | `ci.yml` | Every push / PR to `main` or `develop` |
| Deploy sp-web | `deploy-web.yml` | Push to `main` touching `sp-web/**` or manual dispatch |
| Deploy sp-web-ext | `deploy-ext.yml` | Push to `main` touching `sp-web-ext/**` or manual dispatch |

### CI pipeline steps

1. `pnpm install --frozen-lockfile`
2. Typecheck — `@superpersova/shared`, `sp-web`, `sp-web-ext`
3. Build — `sp-web` (Vite) and `sp-web-ext` (WXT Chrome)
4. Test — `sp-web-ext` (Vitest)
5. Upload build artifacts (7-day retention)

---

## Deployment

### sp-web — self-hosted nginx instance

The `deploy-web.yml` workflow builds the Vite SPA and rsyncs `sp-web/dist/` to your server.

**Required GitHub secrets & variables** (Settings → Environments → `production`):

| Name | Type | Example |
|------|------|---------|
| `DEPLOY_SSH_KEY` | Secret | contents of `~/.ssh/id_rsa` (no passphrase) |
| `DEPLOY_HOST` | Variable | `app.example.com` |
| `DEPLOY_USER` | Variable | `deploy` |
| `DEPLOY_PATH` | Variable | `/var/www/sp-web` |
| `VITE_API_BASE_URL` | Variable | `https://api.example.com` |

**One-time server setup:**

```bash
# On the server — create deploy user & web root
sudo useradd -m -s /bin/bash deploy
sudo mkdir -p /var/www/sp-web
sudo chown deploy:deploy /var/www/sp-web

# Allow deploy user to reload nginx without a password
echo "deploy ALL=(ALL) NOPASSWD: /bin/systemctl reload nginx" \
  | sudo tee /etc/sudoers.d/deploy-nginx

# Add the CI public key to the deploy user
sudo -u deploy mkdir -p /home/deploy/.ssh
sudo -u deploy tee /home/deploy/.ssh/authorized_keys <<'EOF'
<paste public key here>
EOF
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

**Minimal nginx site config** (`/etc/nginx/sites-available/sp-web`):

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/sp-web;
    index index.html;

    # SPA fallback — all routes resolve to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache hashed assets forever
    location ~* \.(js|css|woff2?|png|svg|ico)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/sp-web /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

> Add TLS via `certbot --nginx -d app.example.com` after confirming HTTP works.

---

### sp-web-ext — Chrome extension

The `deploy-ext.yml` workflow builds the extension and uploads a zip as a GitHub Actions artifact. You can then submit it manually or automate via the Chrome Web Store API.

**Manual distribution (sideload):**

1. Download the `sp-web-ext-chrome-<sha>` artifact from the Actions run
2. Unzip it
3. Chrome → `chrome://extensions/` → Enable Developer mode → Load unpacked

**Chrome Web Store (automated):**

Uncomment the publish step in `deploy-ext.yml` and add these secrets:

| Secret | Where to get it |
|--------|----------------|
| `CHROME_EXTENSION_ID` | Chrome Web Store developer dashboard |
| `CHROME_CLIENT_ID` | Google Cloud OAuth 2.0 client |
| `CHROME_CLIENT_SECRET` | Google Cloud OAuth 2.0 client |
| `CHROME_REFRESH_TOKEN` | Run OAuth flow once with the client credentials |

---

## Shared Package (`@superpersova/shared`)

Both sp-web and sp-web-ext import from `packages/shared`. In tests, aliases in `vitest.config.ts` resolve the workspace package without building it.

```ts
import { STORAGE_KEYS } from '@superpersova/shared/constants';
import { cn } from '@superpersova/shared/utils';
import type { AuthUser } from '@superpersova/shared/types';
```
