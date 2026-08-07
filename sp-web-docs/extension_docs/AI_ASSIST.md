# AI Assist — Architecture & Integration Guide

## Overview

AI Assist is an event-driven AI relay system built into the SuperPersova browser extension. It allows **any website** to request AI assistance through a standardized protocol (SP Protocol), while the **extension** handles provider routing, prompt relay, and response delivery — all without the website needing API keys, backend endpoints, or AI provider credentials.

### Design Principles

- **Website owns its data** — auth, APIs, cookies, page context remain on the site's domain
- **Extension owns AI routing** — provider selection, tab management, prompt relay, response polling
- **Multi-browser** — always use `browserAPI` abstraction (never `chrome.*` directly)
- **Storage via IndexedDB** — all app data uses `storageService` (IndexedDB wrapper), not `chrome.storage.local`
- **CSP-safe** — handler injection uses `executeScript({ files: [...] })` first, avoids `new Function()`

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Website (xyz.com)                             │
│                                                                 │
│  1. POST /api/getprompt → gets prompt from xyz backend          │
│  2. Dispatch sp:ai-prompt CustomEvent with prompt + context     │
│  3. Wait for sp:ai-response / sp:ai-error events                │
│  4. POST /api/aiResponse → sends AI response back to xyz API   │
│                                                                 │
│  xyz uses its own cookies, auth, internal APIs throughout       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ CustomEvent / postMessage bridge
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              AI Handler (content script, ISOLATED world)        │
│                                                                 │
│  - Detects .sp-ai-assist elements, marks with data-sp-detected │
│  - Listens for sp:ai-prompt (document + postMessage bridge)     │
│  - Shows overlay: prompt preview + comment + extract toggle     │
│  - Reads stored AI provider via GET_AI_PROVIDER message to SW   │
│  - Sends SP_AI_REQUEST to service worker                        │
│  - Receives SP_AI_RESPONSE → dispatches sp:ai-response back    │
└───────────────────────────┬─────────────────────────────────────┘
                            │ chrome.runtime.sendMessage
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│              Service Worker (manifest.worker.ts)                │
│                                                                 │
│  - Receives SP_AI_REQUEST with { requestId, prompt, provider }  │
│  - Opens/finds AI provider tab (ChatGPT, Perplexity, etc.)     │
│  - Injects provider bridge script into AI tab                   │
│  - Sends SP_AI_SEND_PROMPT to bridge                            │
│  - Polls for response via SP_AI_STATUS                          │
│  - Routes SP_AI_RESPONSE back to source (tab or extension page) │
│  - Queue system: one request per provider at a time             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ chrome.tabs.sendMessage
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│         Provider Bridge (e.g., chatgpt-handler.ts)              │
│                                                                 │
│  - Injected into chatgpt.com / perplexity.ai tab                │
│  - Receives SP_AI_SEND_PROMPT                                   │
│  - Pastes prompt into AI's textarea, clicks Send                │
│  - Polls for AI response (DOM observation)                      │
│  - Sends SP_AI_RESPONSE back to service worker                  │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

| File | Purpose |
|------|---------|
| `src/background/handlers/ai/ai-handler.ts` | Self-contained IIFE injected on all pages. SP Protocol overlay, event bridge, response dispatch |
| `src/background/manifest.worker.ts` | Service worker — `handleAIRelay()` routes prompts to provider tabs, queue management, `GET_AI_PROVIDER` handler |
| `src/services/ai-assist.service.ts` | Centralized AI flow for extension pages (send, extract, type animation) |
| `src/services/storage.service.ts` | IndexedDB wrapper — `getAIProvider()` / `setAIProvider()` |
| `src/types/ai-bridge.ts` | Type definitions — `AIProvider`, `AI_PROVIDERS`, `DEFAULT_HANDLERS`, `SP_PROTOCOL` constants, message types |
| `src/background/handlers/chatgpt/chatgpt-handler.ts` | ChatGPT provider bridge — injects prompts and extracts responses |
| `src/background/handlers/perplexity/perplexity-handler.ts` | Perplexity provider bridge |
| `src/pages/user/ai-setup/` | AI provider preference page (HTML/CSS/TS) |
| `src/lib/browser-api.ts` | Cross-browser API wrapper (`browserAPI`, `isExtensionContextValid`) |
| `src/lib/communication-bridge.ts` | Generic extension ↔ page message bridge |
| `src/background/injector.ts` | Handler injection, domain detection, cache management |
| `testExt.html` | SP Protocol test page with full event flow |

---

## SP Protocol — Website Integration Guide

SP Protocol uses DOM `CustomEvent` for communication. The website dispatches events, the extension listens and responds. **No direct API calls to the extension.**

### Constants (`SP_PROTOCOL`)

```typescript
SP_PROTOCOL = {
  TRIGGER_CLASS: 'sp-ai-assist',    // CSS class for auto-detection
  PROMPT_EVENT:  'sp:ai-prompt',    // Website → Extension
  RESPONSE_EVENT:'sp:ai-response',  // Extension → Website
  ERROR_EVENT:   'sp:ai-error',     // Extension → Website
  READY_EVENT:   'sp-ai-ready',     // Extension loaded signal
}
```

### Quick Start

```html
<!-- 1. Add trigger elements (extension auto-detects and outlines them) -->
<div class="sp-ai-assist">
  <button id="askAI">✨ Ask AI</button>
</div>

<!-- 2. Detect extension -->
<script>
  let extensionReady = false;

  document.addEventListener('sp-ai-ready', () => {
    extensionReady = true;
    console.log('SuperPersova extension detected!');
  });
</script>
```

### Sending a Prompt

```javascript
// Website dispatches sp:ai-prompt — extension shows overlay and relays to AI
document.dispatchEvent(new CustomEvent('sp:ai-prompt', {
  detail: {
    prompt: 'Summarize the key points of this page',
    context: 'Optional additional context string',  // optional
    provider: 'chatgpt',                             // optional (uses user's stored preference if omitted)
    requestId: 'my-request-123',                     // optional (auto-generated if omitted)
  },
  bubbles: true,
}));
```

### Prompt Detail Schema

```typescript
interface SPProtocolPrompt {
  prompt: string;        // Required — the prompt text
  context?: string;      // Optional additional context
  provider?: string;     // Preferred provider ID (overrides user's stored preference)
  requestId?: string;    // Caller-assigned ID (auto-generated if omitted)
}
```

### Receiving the Response

```javascript
// Listen for AI response
document.addEventListener('sp:ai-response', (event) => {
  const { requestId, response, content, provider, durationMs } = event.detail;

  console.log(`AI responded in ${durationMs}ms via ${provider}`);
  console.log('Text:', response);

  // Rich content (images, code, files, links)
  if (content) {
    content.forEach(item => {
      // item.type: 'text' | 'image' | 'code' | 'file' | 'link'
      // item.data: payload string
      // item.mimeType, item.filename, item.language, item.alt (optional)
    });
  }

  // Website can now POST this response back to its own API
  fetch('/api/aiResponse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, response, provider }),
    credentials: 'include',  // xyz's own cookies/auth
  });
});

// Listen for errors
document.addEventListener('sp:ai-error', (event) => {
  const { requestId, code, message } = event.detail;
  // codes: TIMEOUT, PROVIDER_UNAVAILABLE, EXTRACTION_FAILED, CANCELLED, UNKNOWN
  console.error(`AI error (${code}): ${message}`);
});
```

### Response Schema

```typescript
interface SPProtocolResponse {
  requestId: string;     // Correlation ID
  response: string;      // AI-generated text
  provider: string;      // Which provider generated it
  durationMs: number;    // Time taken in milliseconds
  content?: AIResponseContent[];  // Rich content blocks
}

interface SPProtocolError {
  requestId: string;
  code: 'TIMEOUT' | 'PROVIDER_UNAVAILABLE' | 'EXTRACTION_FAILED' | 'CANCELLED' | 'UNKNOWN';
  message: string;
}
```

### Full Website Integration Pattern

The website has full control over its internal logic. SP Protocol only defines the event interface.

```html
<div class="sp-ai-assist" data-action="generate-feedback">
  <button id="aiGenerateBtn">✨ AI Generate</button>
  <textarea id="resultArea"></textarea>
</div>

<script>
  // xyz.com internal logic — full control over auth, APIs, UX
  document.getElementById('aiGenerateBtn').addEventListener('click', async () => {
    // 1. Get prompt from xyz's backend (xyz's auth/cookies)
    const res = await fetch('/api/getprompt', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'generate-feedback', pageData: getPageContext() }),
    });
    const { prompt } = await res.json();

    // 2. Send to extension via SP Protocol
    const requestId = `feedback-${Date.now()}`;
    document.dispatchEvent(new CustomEvent('sp:ai-prompt', {
      detail: { prompt, requestId },
      bubbles: true,
    }));

    // 3. Wait for response
    document.addEventListener('sp:ai-response', function handler(e) {
      if (e.detail.requestId !== requestId) return;
      document.removeEventListener('sp:ai-response', handler);

      // 4. Fill UI
      document.getElementById('resultArea').value = e.detail.response;

      // 5. Post response back to xyz API (xyz's auth preserved)
      fetch('/api/aiResponse', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          response: e.detail.response,
          provider: e.detail.provider,
        }),
      });
    });
  });
</script>
```

### SP Protocol Rules

| Rule | Description |
|------|-------------|
| **SP defines the interface** | Event names, detail schema, content types, error codes |
| **Website defines the action** | What triggers the prompt, how response is used, internal API calls |
| **Extension defines routing** | Which AI provider, overlay UX, page data extraction |
| **User picks the provider** | Via AI Setup page in extension settings (stored in IndexedDB) |

---

## Content Types

AI responses can include rich content blocks alongside the main text response:

| Type | `data` field | Optional fields |
|------|-------------|----------------|
| `text` | Plain text content | — |
| `image` | URL or base64 data-URI | `mimeType`, `alt` |
| `code` | Code string | `language` |
| `file` | Download URL | `filename`, `mimeType` |
| `link` | URL | — |

```typescript
interface AIResponseContent {
  type: 'text' | 'image' | 'code' | 'file' | 'link';
  data: string;
  mimeType?: string;
  filename?: string;
  language?: string;
  alt?: string;
}
```

---

## Auto-Detection

Elements with the CSS class `sp-ai-assist` are automatically detected by the extension via MutationObserver. Detected elements receive a `data-sp-detected` attribute and a subtle dashed outline indicator.

```html
<button class="sp-ai-assist" onclick="dispatchPrompt()">Ask AI</button>
```

### Extension Detection

`sp-ai-ready` is dispatched on `document` (not `window`) when the AI handler loads. This fires from ISOLATED world — using `document` ensures MAIN world (website code) can see it since `document` is shared across worlds.

```javascript
document.addEventListener('sp-ai-ready', () => {
  // Extension is loaded, safe to dispatch sp:ai-prompt
});
```

---

## AI Providers

| ID | Name | Status | Domains |
|----|------|--------|---------|
| `chatgpt` | ChatGPT | ✅ Enabled | `chatgpt.com`, `chat.openai.com` |
| `perplexity` | Perplexity | ✅ Enabled | `perplexity.ai` |
| `notellm` | NoteLLM | ⏳ Coming soon | `notellm.ai` |

Each provider has a bridge handler (`background/handlers/{id}/`) injected on the provider's pages. The bridge:
1. Receives `SP_AI_SEND_PROMPT` messages from the service worker
2. Injects the prompt into the AI chat UI
3. Monitors for the AI response (DOM observation/polling)
4. Sends `SP_AI_RESPONSE` (or `SP_AI_ERROR`) back to the service worker

---

## AI Provider Preference (AI Setup)

Users configure their preferred AI provider in the **AI Setup** page (`pages/user/ai-setup/`), accessible from the profile dropdown menu in the side panel.

### Storage

- **Key**: `sp_ai_provider` in IndexedDB via `storageService`
- **Default**: `chatgpt`
- **Domain methods**: `storageService.getAIProvider()` / `storageService.setAIProvider(id)`

### How Provider is Resolved

| Context | How |
|---------|-----|
| Extension pages (add-rating, side panel) | `ai-assist.service.ts` calls `storageService.getAIProvider()` |
| External pages (ai-handler IIFE) | Sends `GET_AI_PROVIDER` message to service worker |
| SP Protocol `sp:ai-prompt` | `detail.provider` overrides stored preference if provided |
| Service worker fallback | `providerId = provider \|\| 'chatgpt'` |

**Why ai-handler can't use storageService directly**: Content scripts access IndexedDB under the **web page's origin**, not the extension's. The `SuperPersovaDB` database on `xyz.com` is empty/different. So the handler asks the service worker (which runs in the extension's origin) via `browserAPI.runtime.sendMessage({ action: 'GET_AI_PROVIDER' })`.

---

## Overlay UI

When `sp:ai-prompt` fires, the ai-handler shows a modal overlay with:

1. **Prompt preview** — `<pre>` with escaped text, truncated to 500 chars, read-only
2. **User comment** — optional textarea for additional instructions
3. **"Extract page data" toggle** — checkbox to include page content with the prompt
4. **Cancel / Send to AI** buttons

**No provider dropdown in the overlay** — the provider is resolved silently from the user's stored preference (via `GET_AI_PROVIDER`) or from the `provider` field in the event detail.

After clicking Send, the overlay collapses into a **floating toast** showing `"Sending to ${provider}..."`. Toasts are stackable and auto-dismiss on response/error.

The final prompt sent to AI combines: website prompt + user comment + auto-extracted page data (if toggle enabled).

---

## Internal Messaging

### Message Actions

| Action | From → To | Purpose |
|--------|-----------|---------|
| `SP_AI_REQUEST` | ai-handler / extension page → SW | Request AI processing |
| `SP_AI_SEND_PROMPT` | SW → provider bridge | Paste prompt into AI |
| `SP_AI_RESPONSE` | provider bridge → SW → source | AI response text + content |
| `SP_AI_ERROR` | SW → source | Error notification |
| `SP_AI_STATUS` | SW → source | Queue/processing status updates |
| `SP_AI_CANCEL` | source → SW | Cancel in-flight request |
| `GET_AI_PROVIDER` | ai-handler → SW | Read stored provider preference |

### Source Routing (`sendToSource`)

The service worker uses a helper to route responses back to the correct origin:

```typescript
function sendToSource(sourceTabId: number | null, message: any): void {
  if (sourceTabId !== null) {
    browserAPI.tabs.sendMessage(sourceTabId, message);  // content tab
  } else {
    browserAPI.runtime.sendMessage(message);             // extension page (side panel)
  }
}
```

- **Content tabs** (`sourceTabId: number`): Response via `tabs.sendMessage`
- **Extension pages** (`sourceTabId: null`): Response via `runtime.sendMessage` — because extension pages (side panel, popups) don't have a `sender.tab`

---

## Multiple Concurrent Requests

The service worker manages a **queue per AI provider**:

- Only **one request per provider** is active at a time
- Additional requests are queued with `SP_AI_STATUS { status: 'queued' }`
- When the active request completes, the next queued request is dispatched
- Each request is tracked by `requestId` in a `Map<string, PendingAIRequestInfo>`

```
Request A (chatgpt) → active → polling → response
Request B (chatgpt) → queued → status: "queued" → active when A completes
Request C (perplexity) → active immediately (different provider)
```

---

## Service Worker Tab Management

The service worker (`handleAIRelay` in `manifest.worker.ts`):

1. Looks for an existing tab matching the provider's URL patterns
2. If not found, opens a new background tab and waits for load + 3s SPA hydration
3. Injects provider bridge script into the AI tab
4. Sends `SP_AI_SEND_PROMPT` to the provider bridge content script
5. Polls for response via MV3-safe `browserAPI.alarms` (1-min intervals, 5-min timeout)
6. On provider tab close mid-request, fails with `PROVIDER_UNAVAILABLE`
7. On source tab close, cleans up and processes next queued request
8. Maps `requestId → sourceTabId` to route responses back to the correct origin

---

## Timeout, Retry & Error Handling

### Timeout
- Provider bridges have internal polling timeouts (configurable per provider)
- MV3-safe polling via `browserAPI.alarms` (1-min intervals, 5-min max)
- If no response within timeout, `SP_AI_ERROR { code: 'TIMEOUT' }` is sent

### Retry Scenarios
- **Provider tab closed**: Service worker detects `onRemoved`, fails with `PROVIDER_UNAVAILABLE`. User can retry.
- **Extension context invalidated**: Content scripts check `browserAPI.runtime?.id` before sending. Gracefully fails if invalid (e.g., extension updated).
- **Network errors**: `sendMessage` failures trigger the `onError` callback immediately.

### Error Codes

| Code | When | User Action |
|------|------|-------------|
| `TIMEOUT` | AI provider didn't respond in time | Retry, check provider tab |
| `PROVIDER_UNAVAILABLE` | Provider tab not found or closed | Open provider, retry |
| `EXTRACTION_FAILED` | Page data extraction failed | Retry without extraction |
| `CANCELLED` | Request cancelled by user | — |
| `UNKNOWN` | Unexpected error | Check console, retry |

---

## Extension-Internal AI Assist (`ai-assist.service.ts`)

For extension pages (side panel, popups like add-rating), a centralized service handles the full flow:

```typescript
import { aiAssist, typeInto } from '../services/ai-assist.service.js';
import type { AIAssistPhase } from '../services/ai-assist.service.js';

const handle = aiAssist.send({
  prompt: 'Generate a feedback comment based on the page content',
  // provider: 'chatgpt',       // optional — reads stored preference if omitted
  extractPageData: true,         // extract active tab's page content
  maxPageContentLength: 8000,    // optional, default 8000
  context: 'Additional context', // optional

  onStatus: (message, phase) => {
    // phase: 'extracting' | 'sending' | 'queued' | 'busy' | 'typing' | 'delivered' | 'error'
    showStatus(message);
  },
  onResponse: (text, raw) => {
    // raw: { requestId, text, provider, durationMs, content? }
    typeInto(textarea, text, {
      speed: 10,          // ms per char
      onProgress: (len) => updateCharCount(len),
      onComplete: () => showSuccess(),
    });
  },
  onError: (code, message) => {
    showError(message);
  },
});

// Cancel if needed:
handle.cancel();
```

### Page Data Extraction

`extractActiveTabPageData()` uses `chrome.scripting.executeScript` to run in the active tab's context:

1. Clones `document.body`
2. Strips: `script, style, noscript, svg, iframe, [hidden], [aria-hidden]`
3. Tries semantic selectors: `main, article, [role="main"], .content, #content`
4. Falls back to full body text
5. Caps at `maxPageContentLength` characters (default 8000)

The extracted data includes: `{ url, title, content }`.

---

## Cross-World Communication

Chrome Extension content scripts can run in two worlds:
- **ISOLATED** (default): Own `window`, shares `document` with page
- **MAIN**: Same `window` as page, but subject to page CSP

### The Problem
- `CustomEvent.detail` is **null** when crossing ISOLATED ↔ MAIN world boundary
- `window` objects are **separate** — `window.postMessage` from MAIN doesn't reach ISOLATED's `window`
- But `document` is **shared** — events on `document` are visible to both worlds

### The Solution: `__sp_bridge__` postMessage Relay

The service worker injects a tiny bridge script into **MAIN world** after the ai-handler (ISOLATED world):

```javascript
// MAIN world bridge script (injected by service worker)
// Catches document events from MAIN, forwards via window.postMessage to ISOLATED
document.addEventListener('sp:ai-prompt', (e) => {
  window.postMessage({
    ch: '__sp_bridge__',
    dir: 'to-ext',          // MAIN → ISOLATED direction
    type: 'sp:ai-prompt',
    detail: e.detail,       // detail survives postMessage (structured clone)
  }, '*');
});

// Catches postMessage from ISOLATED, re-dispatches on document for MAIN
window.addEventListener('message', (e) => {
  if (e.data?.ch === '__sp_bridge__' && e.data.dir === 'to-page') {
    document.dispatchEvent(new CustomEvent(e.data.type, {
      detail: e.data.detail,
      bubbles: true,
    }));
  }
});
```

The ai-handler (ISOLATED world) listens on **both**:
- `document.addEventListener('sp:ai-prompt', ...)` — same-world events
- `window.addEventListener('message', ...)` — bridge messages from MAIN world

And dispatches responses on **both**:
- `document.dispatchEvent(new CustomEvent('sp:ai-response', ...))` — same-world
- `window.postMessage({ ch: '__sp_bridge__', dir: 'to-page', ... })` — cross-world

### `dir` Field Prevents Loops

| Direction | Meaning | Bridge Action |
|-----------|---------|---------------|
| `to-ext` | MAIN → ISOLATED | ai-handler processes it |
| `to-page` | ISOLATED → MAIN | Bridge re-dispatches as CustomEvent |

---

## Handler Injection & CSP

### The Problem
Chrome enforces the **page's CSP** even for content scripts running in ISOLATED world. If a page has `script-src 'self'`, then `new Function(code)` throws `EvalError` in the content script.

### The Solution
Use `chrome.scripting.executeScript({ files: [localPath] })` first — Chrome trusts extension-bundled files regardless of page CSP. Fall back to `new Function()` only for CDN-only handlers.

```typescript
async function injectHandler(tabId: number, handler: DefaultHandler) {
  try {
    // CSP-safe: Chrome trusts extension files
    await browserAPI.scripting.executeScript({
      target: { tabId, allFrames: false },
      files: [handler.localPath],
      world: 'ISOLATED',
    });
  } catch {
    // Fallback for CDN-only handlers
    const code = await fetchHandlerCode(handler);
    await browserAPI.scripting.executeScript({
      target: { tabId },
      func: new Function(code) as () => void,
      world: 'ISOLATED',
    });
  }
}
```

### Handler Compilation for Local Development

```
src/background/handlers/ai/ai-handler.ts
    ↓ tsc compile
dist/background/handlers/ai/ai-handler.js
    ↓ copy to Handlers staging
C:\Handlers/ai-handler.js  (dev/stage local loading)
    ↓ upload for production
cdn.superpersova.com/handlers/ai-handler/latest.js
```

---

## Browser API Abstraction

All extension code must use the `browserAPI` abstraction for multi-browser support:

```typescript
// src/lib/browser-api.ts
export const browserAPI: typeof chrome =
  ((globalThis as any).browser ?? (globalThis as any).chrome) as typeof chrome;
```

In self-contained IIFEs (like ai-handler.ts), inline the shim:

```typescript
const browserAPI: typeof chrome = ((globalThis as any).browser ?? chrome) as typeof chrome;
```

**Rule**: Never use `chrome.*` directly in source code. Always import and use `browserAPI`.

---

## testExt.html — SP Protocol Test Page

Located at the project root, `testExt.html` is a standalone test page for SP Protocol integration. Serve it via a local HTTP server (or open via `file://` with extension permissions).

### Features
- Extension status detection (`sp-ai-ready` event)
- Send `sp:ai-prompt` with custom prompt/context/provider/requestId
- Preset prompt buttons (Summarize, Translate, Explain)
- Simulate `sp:ai-response` and `sp:ai-error` for testing without AI
- Rich content rendering (images, code blocks, files, links)
- Event log with timestamped entries
- `.sp-ai-assist` trigger element auto-detection

### Usage

```bash
# Serve locally (SP Protocol needs HTTP origin for full functionality)
npx serve .
# Open http://localhost:3000/testExt.html in browser with extension loaded
```

---

## Edge Cases

| Issue | Cause | Fix |
|-------|-------|-----|
| `CustomEvent.detail` is null cross-world | Chrome isolates object refs between ISOLATED/MAIN | `__sp_bridge__` postMessage relay |
| CSP blocks `new Function()` | Page CSP applies to content scripts | `executeScript({ files: [...] })` first |
| Handler not re-injected after navigation | `injectedHandlerTabs` stale (same tab ID) | Clear on `status === 'loading'` |
| `__sp_ai_handler__` guard persists in SPA | Window object survives SPA navigation | Dynamic guard cleanup via `executeScript` |
| Extension context invalidated | Extension updated while content script alive | Guard with `isExtensionContextValid()` |
| `file://` URLs no hostname | `new URL(url).hostname` returns empty | Explicit `file://` protocol handling |
| Side panel no `sender.tab` | Extension pages aren't tabs | `sendToSource()` with nullable `sourceTabId` |
| IndexedDB wrong origin in content scripts | Content scripts use page's IndexedDB | Delegate to service worker via `GET_AI_PROVIDER` |
| `__sp_bridge__` triggers CommBridge warnings | Bridge messages hit origin validation | Early return for `ch === '__sp_bridge__'` |

---

## Website Integration Checklist

1. Listen for `sp-ai-ready` on `document` to detect extension availability
2. Dispatch `sp:ai-prompt` CustomEvent on `document` with `detail: { prompt, context?, provider?, requestId? }`
3. Listen for `sp:ai-response` on `document` to receive the AI response
4. Listen for `sp:ai-error` on `document` to handle errors
5. Optionally add `class="sp-ai-assist"` to trigger elements for visual detection