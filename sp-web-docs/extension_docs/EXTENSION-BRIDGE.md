# Extension Bridge — sp-web ↔ sp-web-ext

Documents the postMessage/runtime-message protocol that connects the SuperPersova web app (`sp-web`) to the browser extension (`sp-web-ext`).

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  Browser tab (superpersova.com)                              │
│                                                              │
│  ┌────────────────────┐    window.postMessage               │
│  │  sp-web            │ ──────────────────────────────────► │
│  │  ExtensionBridgeClient│ ◄────────────────────────────── │
│  └────────────────────┘    window.postMessage               │
│                                    │                         │
└────────────────────────────────────│─────────────────────────┘
                                     │ (content script injected
                                     │  into the same tab)
                               ┌─────▼──────────────────┐
                               │  Content Script        │
                               │  (entrypoints/content) │
                               │  • validates origin    │
                               │  • routes to background│
                               └─────────┬──────────────┘
                                         │ browser.runtime.sendMessage
                                         │
                               ┌─────────▼──────────────┐
                               │  Background SW         │
                               │  (entrypoints/background│
                               │  /message-router)      │
                               │  • auth-bridge-handler │
                               │  • Zustand authStore   │
                               │  • IDB (auth state)    │
                               └────────────────────────┘
```

**Transport layers:**

| Hop | Mechanism | Direction |
|-----|-----------|-----------|
| sp-web → content script | `window.postMessage` | request |
| content script → sp-web | `window.postMessage` | response / push |
| content script → background | `browser.runtime.sendMessage` | forwarded request |
| background → content script | return value of `sendMessage` | forwarded response |

---

## Message Envelope

All messages from `sp-web → content script` use `BridgeRequest`:

```ts
// packages/shared/src/extension-bridge/types.ts
interface BridgeRequest {
  requestId: string;        // e.g. "sp_1714000000000_ab3f2"
  type: string;             // e.g. "auth.syncState"
  source: 'sp-web-app';
  target: 'sp-content-script';
  version: '2.0.0';
  timestamp: number;
  payload?: unknown;
}
```

Responses back from `content script → sp-web`:

```ts
interface BridgeResponse {
  requestId: string;        // echoed from request
  type: 'response.success' | 'response.error';
  source: 'sp-content-script';
  target: 'sp-web-app';
  success: boolean;
  payload?: unknown;
  error?: { code: string; message: string };
}
```

Push events (no `requestId`) sent proactively from content script to sp-web:

```ts
interface BridgePushEvent {
  type: 'event.auth.changed' | 'event.auth.logout';
  source: 'sp-content-script';
  target: 'sp-web-app';
  payload?: { isAuthenticated: boolean };
}
```

---

## Supported Message Types

| `type` | Direction | Payload | Notes |
|--------|-----------|---------|-------|
| `ext.handshake` | sp-web → ext | `{ appVersion }` | Detect extension; returns `{ version, capabilities }` |
| `ext.health` | sp-web → ext | — | Returns `{ status: 'ok', timestamp }` |
| `auth.status` | sp-web → ext | — | Returns `{ isAuthenticated, userId, tenantId }` |
| `auth.getToken` | sp-web → ext | — | Returns `{ accessToken, expiresAt }` |
| `auth.getState` | sp-web → ext | — | Returns full `BridgeAuthState` or `null` |
| `auth.syncState` | sp-web → ext | `BridgeAuthState` | **Primary auth sync** — updates extension Zustand store |
| `auth.logout` | sp-web → ext | — | Clears extension auth store |
| `event.auth.changed` | ext → sp-web | `{ isAuthenticated: true }` | Pushed after `auth.syncState` |
| `event.auth.logout` | ext → sp-web | `{ isAuthenticated: false }` | Pushed after `auth.logout` |

---

## Auth Flows

### Flow A — sp-web authenticates first (primary flow)

```
User logs in on sp-web
  → challenge → login → selectTenant  (3-step API, only in sp-web)
  → sp-web has: accessToken + refreshToken + tenant

useExtensionBridge detects authStatus === 'authenticated'
  → extensionBridge.syncAuthState(bridgeState)
  → window.postMessage({ type: 'auth.syncState', payload: BridgeAuthState })

Content script receives postMessage (validates origin)
  → browser.runtime.sendMessage({ type: 'auth.syncState', payload })

Background message-router → handleAuthSyncState()
  → authStore.setAuth(user, tokens)
  → authStore.setTenant(tenant)
  → IDB write via Zustand persist
  → chrome.storage.local.set({ 'sp-auth': { state: { isAuthenticated: true } } })
     (signal only — enables content script push event)

Content script onChanged fires
  → window.postMessage({ type: 'event.auth.changed', ... })
     (sp-web can ignore — it already knows its own state)

Extension side panel (ProtectedRoute watches authStore.isAuthenticated)
  → redirects from /login to / automatically
```

### Flow B — extension authenticated first (SSO bootstrap)

```
User opens sp-web, extension already has a valid session in IDB

useExtensionBridge detects extension available AND sp-web status === 'idle'
  → extensionBridge.getAuthState()
  → content script forwards to background → handleAuthGetState()
  → returns BridgeAuthState from authStore

sp-web dispatches loginSuccessSingle + updateTokens
  → sp-web is now authenticated without a login screen
```

### Flow C — tenant switch in sp-web

```
User switches workspace in sp-web
  → sp-web calls selectTenant API → new accessToken + refreshToken
  → useExtensionBridge detects auth status === 'authenticated' with new tenant
  → extensionBridge.syncAuthState(newBridgeState)
  → same path as Flow A

Extension receives new tokens transparently
  → authStore updates with new tenant's accessToken
  → all subsequent extension API calls use the new tenant
```

### Extension logout

```
Extension logout (user clicks logout in side panel)
  → authStore.logout()
  → auth-bridge-handler: signalAuthChange(false)
  → content script onChanged fires with isAuthenticated: false
  → window.postMessage({ type: 'event.auth.logout', ... })

sp-web useExtensionBridge onPush handler
  → dispatch(signOut())  ← sp-web logs out too
```

---

## Tenant Selection — Extension vs sp-web

**Tenant selection only happens in sp-web.** The extension never calls `selectTenant` itself.

| Concern | sp-web | Extension |
|---------|--------|-----------|
| challenge + login | Yes | Yes (extension login page) |
| `selectTenant` API | **Yes — exclusively** | Never |
| Tenant switching UI | Yes | No |
| Receives tenanted token | Originator | Via `auth.syncState` bridge |

**Why:** Tenant selection requires a full browser window, preferences UI, and multi-step workflow. The side panel is a companion tool that inherits the tenant context from the active sp-web session.

**Extension login flow:**
1. User enters credentials in the extension side panel
2. Extension calls challenge + login → receives `platformToken` + accessible tenants
3. Extension shows "Open SuperPersova to select your workspace"
4. User selects tenant in sp-web → sp-web syncs full auth state via `auth.syncState`
5. Extension `ProtectedRoute` detects `isAuthenticated === true` → navigates to home

---

## Origin Validation

The content script only accepts `window.postMessage` from:

```ts
// packages/shared/src/constants/comm-protocol.ts
export const ALLOWED_ORIGINS = {
  PROD: 'https://superpersova.com',
  STAGE: 'https://staging.superpersova.com',
  DEV_LOCAL: 'http://localhost:4200',
  DEV_LOCAL_ALT: 'http://127.0.0.1:4200',
};
```

Any message from an unrecognised origin is silently dropped.

---

## Push Event Signal (IDB ↔ chrome.storage)

Auth state lives in **IndexedDB** (`SuperPersovaDB / userSettings`, key `sp-auth`) via the Zustand `persist` middleware. IDB changes are not observable by the content script.

To fire the content script's `browser.storage.onChanged` listener, `auth-bridge-handler` writes a **lightweight signal** to `chrome.storage.local` after every auth state change:

```ts
// Tombstone — not the real auth data, just a change notification
browser.storage.local.set({ 'sp-auth': { state: { isAuthenticated: true|false } } })
```

The content script reads only `newValue.state.isAuthenticated` from this key, then posts the appropriate `event.auth.changed` / `event.auth.logout` message to the web page.

---

## Using the Bridge in sp-web

```ts
// Mount once near the app root
import { useExtensionBridge } from '@/features/extension/useExtensionBridge';

function App() {
  const { isAvailable, isChecking } = useExtensionBridge();
  // isAvailable: extension is installed and content script is active
}
```

`useExtensionBridge` handles both flows (A and B) automatically via Redux subscription and `onPush` listeners.

For one-off imperative calls:

```ts
import { extensionBridge } from '@/features/extension/bridge';

const status = await extensionBridge.getAuthStatus();
const state  = await extensionBridge.getAuthState();
await extensionBridge.syncAuthState(bridgeState);
await extensionBridge.logout();
```

---

## Key Files

| File | Role |
|------|------|
| `packages/shared/src/extension-bridge/client.ts` | `ExtensionBridgeClient` — sp-web side, postMessage sender |
| `packages/shared/src/extension-bridge/types.ts` | Shared message types (`BridgeRequest`, `BridgeAuthState`, etc.) |
| `sp-web-ext/entrypoints/content.ts` | Content script — origin check, postMessage relay to background |
| `sp-web-ext/entrypoints/background/message-router.ts` | Routes runtime messages to handlers |
| `sp-web-ext/entrypoints/background/auth-bridge-handler.ts` | `handleAuthSyncState`, `handleAuthGetState`, etc. |
| `sp-web/src/features/extension/useExtensionBridge.ts` | React hook — Flow A/B logic, push listener |
| `sp-web/src/features/extension/bridge.ts` | Singleton `extensionBridge` instance |
