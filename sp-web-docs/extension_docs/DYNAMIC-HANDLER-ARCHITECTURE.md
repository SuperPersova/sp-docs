# Dynamic Handler Loading Architecture

## Overview

The SuperPersova extension uses a **lightweight, plugin-based architecture** where handlers are dynamically loaded from remote storage (S3) rather than bundled with the extension.

## Why This Architecture?

### Problems with Static Handlers
- ❌ Large extension bundle size
- ❌ Must republish extension for handler updates
- ❌ All tenants get all handlers (unnecessary)
- ❌ Handlers have their own state (hard to maintain)

### Benefits of Dynamic Loading
- ✅ **Lightweight Extension**: Core functionality only (~100KB vs 5MB+)
- ✅ **Tenant-Specific Handlers**: Each tenant gets only their integrations
- ✅ **Hot Updates**: Update handlers without republishing extension
- ✅ **Stateless Handlers**: All state managed via StorageService
- ✅ **Shared Libraries**: Common utilities loaded once, cached
- ✅ **Version Control**: Track and rollback handler versions
- ✅ **A/B Testing**: Test handler variations per tenant

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Extension Core (Bundled)                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  manifest.worker.ts                                   │  │
│  │  - Initializes HandlerLoaderService                   │  │
│  │  - Preloads handlers on activation                    │  │
│  │  - Clears expired caches periodically                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  injector.ts (Dynamic Loader)                         │  │
│  │  - detectSiteIntegration(url, tenantId)              │  │
│  │  - loadSiteHandler(siteType, tenantId)               │  │
│  │  - preloadHandlers()                                  │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  HandlerLoaderService                                  │  │
│  │  - fetchHandlerRegistry(tenantId)                     │  │
│  │  - downloadHandler(metadata)                          │  │
│  │  - loadHandler(handlerId) → SiteHandler              │  │
│  │  - getCachedHandler(handlerId)                        │  │
│  │  - clearExpiredCaches()                               │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────────────┐
                    │   API Layer     │
                    ├─────────────────┤
                    │ GET /v1/handlers│
                    │ /registry       │
                    │ ?tenantId=xxx   │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Handler Registry│
                    │  (Backend DB)   │
                    ├─────────────────┤
                    │ {               │
                    │   handlers: [   │
                    │     {           │
                    │       id: "...", │
                    │       domains,  │
                    │       scriptUrl,│
                    │       version   │
                    │     }           │
                    │   ]             │
                    │ }               │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  S3 / CDN       │
                    │  Storage        │
                    ├─────────────────┤
                    │ handlers/       │
                    │   youtube/      │
                    │     v1.2.0.js   │
                    │   linkedin/     │
                    │     v2.0.1.js   │
                    │   notion/       │
                    │     v1.5.3.js   │
                    │ libraries/      │
                    │   common/       │
                    │     utils.js    │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Local Cache    │
                    │  (chrome.storage│
                    │   + IndexedDB)  │
                    ├─────────────────┤
                    │ handler_cache_  │
                    │   youtube:      │
                    │     code,       │
                    │     expiresAt   │
                    │ library_cache_  │
                    │   utils:        │
                    │     code,       │
                    │     expiresAt   │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Dynamic Import │
                    │  (Blob URL)     │
                    ├─────────────────┤
                    │ const blob =    │
                    │   new Blob([    │
                    │     cachedCode  │
                    │   ])            │
                    │ const url =     │
                    │   URL.create    │
                    │   ObjectURL     │
                    │ import(url)     │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │  Handler        │
                    │  Execution      │
                    ├─────────────────┤
                    │ handler.enhance │
                    │   Context()     │
                    │ handler.extract │
                    │   Metadata()    │
                    │ - Uses Storage  │
                    │   Service       │
                    │ - Stateless     │
                    └─────────────────┘
```

## Data Flow

### 1. **Extension Initialization**
```typescript
// manifest.worker.ts
initializeHandlerLoader(handlerRegistryUrl);
preloadHandlers(); // Warm up cache
```

### 2. **Fetch Handler Registry** (API Call)
```
GET /v1/handlers/registry?tenantId=tenant_123

Response:
{
  "tenantId": "tenant_123",
  "handlers": [
    {
      "id": "youtube-v1.2.0",
      "name": "YouTube Handler",
      "version": "1.2.0",
      "domains": ["youtube.com", "youtu.be"],
      "scriptUrl": "https://cdn.superpersova.com/handlers/youtube/v1.2.0.js",
      "uiScriptUrl": "https://cdn.superpersova.com/handlers/youtube/v1.2.0-ui.js",
      "cssUrl": "https://cdn.superpersova.com/handlers/youtube/v1.2.0.css",
      "capabilities": {
        "enhanceContext": true,
        "extractMetadata": true,
        "injectUI": true
      },
      "dependencies": ["video-utils", "common-ui"],
      "cacheTTL": 86400000,
      "lastUpdated": 1708012800000,
      "checksum": "sha256:abc123..."
    },
    {
      "id": "linkedin-v2.0.1",
      "name": "LinkedIn Handler",
      "version": "2.0.1",
      "domains": ["linkedin.com"],
      "scriptUrl": "https://cdn.superpersova.com/handlers/linkedin/v2.0.1.js",
      ...
    }
  ],
  "libraries": [
    {
      "id": "video-utils",
      "scriptUrl": "https://cdn.superpersova.com/libraries/video-utils/v1.0.0.js",
      "cacheTTL": 604800000
    }
  ]
}
```

### 3. **Download & Cache Handler**
```typescript
// HandlerLoaderService
async downloadHandler(metadata: HandlerMetadata) {
  // Fetch from S3
  const scriptCode = await fetch(metadata.scriptUrl).then(r => r.text());
  const uiScriptCode = await fetch(metadata.uiScriptUrl).then(r => r.text());
  const cssCode = await fetch(metadata.cssUrl).then(r => r.text());
  
  // Cache locally
  const cached: CachedHandler = {
    metadata,
    scriptCode,
    uiScriptCode,
    cssCode,
    cachedAt: Date.now(),
    expiresAt: Date.now() + metadata.cacheTTL
  };
  
  await chrome.storage.local.set({
    [`handler_cache_${metadata.id}`]: cached
  });
}
```

### 4. **Load Handler Dynamically**
```typescript
// Load from cache and execute
async loadHandler(handlerId: string) {
  const cached = await getCachedHandler(handlerId);
  
  // Create blob URL for dynamic import
  const blob = new Blob([cached.scriptCode], { type: 'text/javascript' });
  const blobUrl = URL.createObjectURL(blob);
  
  // Dynamic import
  const module = await import(blobUrl);
  const handler: SiteHandler = module.default || module;
  
  return handler;
}
```

### 5. **Execute Handler** (Stateless)
```typescript
// Handler code (from S3)
import { STORAGE_KEYS } from '@superpersova/shared-constants';
import { StorageService } from '@superpersova/storage-service';

export default {
  async enhanceContext(context, tab, executionContext) {
    // Use StorageService (NO internal state)
    const storage = executionContext.storage;
    const user = await storage.get(STORAGE_KEYS.AUTH_USER);
    
    return {
      ...context,
      metadata: {
        userId: user?.id,
        handlerVersion: '1.2.0'
      }
    };
  }
};
```

## Handler Structure (S3)

### Directory Layout
```
s3://superpersova-handlers/
├── handlers/
│   ├── youtube/
│   │   ├── v1.2.0.js          # Main handler
│   │   ├── v1.2.0-ui.js       # UI injection
│   │   ├── v1.2.0.css         # Styles
│   │   └── metadata.json      # Version metadata
│   ├── linkedin/
│   │   ├── v2.0.1.js
│   │   ├── v2.0.1-ui.js
│   │   └── v2.0.1.css
│   └── notion/
│       └── v1.5.3.js
├── libraries/
│   ├── common-ui/
│   │   └── v1.0.0.js
│   ├── video-utils/
│   │   └── v1.1.0.js
│   └── api-helpers/
│       └── v2.0.0.js
└── MANIFEST.json             # Global manifest
```

### Handler File Template
```typescript
// youtube-v1.2.0.js (hosted on S3)
/**
 * YouTube Handler
 * Version: 1.2.0
 * Dependencies: video-utils@1.1.0, common-ui@1.0.0
 */

// Import shared constants (injected by extension)
import { STORAGE_KEYS, CONTEXT_TYPES } from '@superpersova/constants';

export default {
  // Handler metadata
  id: 'youtube-v1.2.0',
  version: '1.2.0',
  name: 'YouTube Handler',
  
  // Enhance context with YouTube-specific data
  async enhanceContext(context, tab, executionContext) {
    const { storage, api } = executionContext;
    
    // Get video ID from URL
    const videoId = extractVideoId(tab.url);
    
    // Use storage service (stateless)
    const watchHistory = await storage.get('youtube_watch_history') || [];
    
    return {
      ...context,
      youtube: {
        videoId,
        isWatched: watchHistory.includes(videoId),
        timestamp: Date.now()
      }
    };
  },
  
  // Extract YouTube-specific metadata
  async extractMetadata(tab, executionContext) {
    // Implementation
  }
};

function extractVideoId(url) {
  const match = url.match(/[?&]v=([^&]+)/);
  return match ? match[1] : null;
}
```

## Caching Strategy

### Cache Levels
1. **Memory Cache**: Loaded handlers in RAM (session only)
2. **Local Cache**: `chrome.storage.local` (persistent)
3. **IndexedDB**: Large handlers/libraries (persistent)

### Cache TTL
- **Handlers**: 24 hours (configurable per handler)
- **Shared Libraries**: 7 days (more stable)
- **Registry**: 24 hours

### Cache Invalidation
```typescript
// Periodic cleanup (runs daily)
chrome.alarms.create('clearExpiredCaches', {
  periodInMinutes: 1440 // 24 hours
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'clearExpiredCaches') {
    clearExpiredCaches();
  }
});
```

### Force Refresh
```typescript
// Manual refresh (for testing/updates)
await handlerLoader.refreshHandler(handlerId, metadata);
```

## Security Considerations

### 1. **Code Integrity**
```typescript
// Verify checksum before execution
const checksum = await calculateChecksum(cached.scriptCode);
if (checksum !== metadata.checksum) {
  throw new Error('Handler checksum mismatch');
}
```

### 2. **Content Security Policy**
```json
// manifest.json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self' blob:; object-src 'self'"
  }
}
```

### 3. **HTTPS Only**
- All handler URLs must use HTTPS
- S3 bucket configured with HTTPS only
- CORS properly configured

### 4. **Tenant Isolation**
- Handlers scoped to tenant
- No cross-tenant data access
- Separate S3 prefixes per tenant (optional)

## API Contract

### Handler Registry API

#### GET `/v1/handlers/registry`
**Query Parameters:**
- `tenantId` (required): Tenant identifier

**Response:**
```typescript
interface HandlerRegistryResponse {
  tenantId: string;
  handlers: HandlerMetadata[];
  libraries?: LibraryMetadata[];
  version: string;
  timestamp: number;
}
```

#### GET `/v1/handlers/:id`
**Response:**
```typescript
interface HandlerMetadata {
  id: string;
  name: string;
  version: string;
  domains: string[];
  scriptUrl: string;
  uiScriptUrl?: string;
  cssUrl?: string;
  capabilities: {
    enhanceContext?: boolean;
    extractMetadata?: boolean;
    injectUI?: boolean;
  };
  dependencies?: string[];
  cacheTTL?: number;
  lastUpdated: number;
  checksum?: string;
}
```

## Handler Interface

All handlers must implement:

```typescript
interface SiteHandler {
  // Required
  id: string;
  version: string;
  name: string;
  
  // Optional methods
  enhanceContext?(
    context: PageContextData,
    tab: chrome.tabs.Tab,
    executionContext: HandlerExecutionContext
  ): Promise<PageContextData>;
  
  extractMetadata?(
    tab: chrome.tabs.Tab,
    executionContext: HandlerExecutionContext
  ): Promise<Record<string, any>>;
}

interface HandlerExecutionContext {
  handlerId: string;
  tenantId: string;
  url: string;
  storage: StorageService;  // Use this for ALL state
  api: {
    sendMessage: (message: any) => Promise<any>;
    openSidePanel: () => Promise<void>;
    captureContext: (data: any) => Promise<void>;
  };
}
```

## Shared Libraries

### Purpose
- Common utilities used by multiple handlers
- Reduce duplication and bundle size
- Centralized updates

### Loading Pattern
```typescript
// Handler declares dependencies
{
  "dependencies": ["video-utils@1.1.0", "common-ui@1.0.0"]
}

// Extension loads dependencies first
for (const dep of metadata.dependencies) {
  await handlerLoader.loadLibrary(dep);
}

// Then load handler (dependencies available)
const handler = await handlerLoader.loadHandler(handlerId);
```

## Migration Path

### Phase 1: Hybrid Mode (Current)
- Static `superpersova` handler bundled
- Dynamic loading infrastructure ready
- Fallback to static if dynamic fails

### Phase 2: Gradual Migration
- Move `superpersova` handler to S3
- Add 2-3 new dynamic handlers (YouTube, LinkedIn)
- Test in production with small tenant group

### Phase 3: Full Dynamic
- Remove all static handlers
- Pure dynamic loading
- Lightweight core (~100KB)

## Performance Optimizations

###1. **Preloading**
```typescript
// Preload handlers on extension activation
await preloadHandlers(); // Downloads all, doesn't execute

// Execution is instant (already cached)
const handler = await loadHandler('youtube'); // <10ms
```

### 2. **Parallel Downloads**
```typescript
// Download multiple handlers concurrently
await Promise.all(
  registry.handlers.map(h => downloadHandler(h))
);
```

### 3. **Compression**
- Handlers minified on S3
- Gzip compression enabled
- Average handler: 10-50KB

### 4. **CDN Distribution**
- CloudFront for global distribution
- Edge caching (1 hour)
- Regional replicas

## Monitoring & Analytics

### Track Handler Performance
```typescript
// Log handler load times
console.log('[HandlerLoader] Load time:', {
  handlerId,
  downloadTime: downloadEnd - downloadStart,
  executeTime: executeEnd - executeStart,
  totalTime: executeEnd - downloadStart
});
```

### Track Usage
- Which handlers are used most
- Cache hit/miss rates
- Error rates per handler
- Load times by region

## Testing Dynamic Handlers

### Local Testing
```typescript
// Override registry URL for testing
initializeHandlerLoader('http://localhost:3001/dev/handlers');

// Use local S3 mock
const localHandler = {
  scriptUrl: 'http://localhost:8080/handlers/test.js'
};
```

### E2E Testing
1. Upload test handler to S3
2. Update test tenant registry
3. Load extension with test tenant
4. Verify handler execution

## Benefits Summary

| Aspect | Static (Old) | Dynamic (New) |
|--------|--------------|---------------|
| **Bundle Size** | 5MB+ | ~100KB |
| **Update Speed** | Days (republish) | Minutes (S3 upload) |
| **Tenant Custom** | All get same | Per-tenant config |
| **Scalability** | Limited | Unlimited |
| **Testing** | Complex | Easy A/B testing |
| **State Mgmt** | Internal state | StorageService |
| **Versioning** | Extension version | Handler version |

---

## Current Implementation Details

### DEFAULT_HANDLERS (ai-bridge.ts)

The extension ships with one default handler injected on every page:

```typescript
export const DEFAULT_HANDLERS: DefaultHandler[] = [
  {
    id: 'ai-handler',
    name: 'AI Handler',
    localPath: 'background/handlers/ai/ai-handler.js',
    cdnUrl: 'https://cdn.superpersova.com/handlers/ai-handler/latest.js',
    icon: '✨'
  }
];
```

Default handlers are injected by `injectDefaultHandlers(tabId)` on every `tabs.onUpdated` with `status === 'complete'`, and during `reinjectContentScripts()` on service worker activation.

### Handler Loading Flow (getHandlerCode)

The `HandlerLoaderService.getHandlerCode()` method resolves handler code through a 4-level fallback chain:

```
1. Memory cache  →  handlerCodeCache Map (instant, session-only)
       ↓ miss
2. Storage cache →  chrome.storage.local with sp_handler_ prefix (24h TTL)
       ↓ miss
3. CDN fetch     →  remoteCdnUrl parameter, caches on success
       ↓ fail
4. Local fallback → chrome.runtime.getURL(localPath), caches on success
       ↓ fail
5. Throws error
```

### Handler Injection Strategy

```typescript
// injectHandler(tabId, handlerId, cdnUrl?, localPath?)
// Strategy 1: CSP-safe file injection (preferred)
await chrome.scripting.executeScript({
  target: { tabId },
  files: [localPath],    // e.g. 'background/handlers/ai/ai-handler.js'
  world: 'ISOLATED'
});

// Strategy 2: Code-string injection (fallback, fails on strict CSP)
await chrome.scripting.executeScript({
  target: { tabId },
  func: new Function(code),
  world: 'ISOLATED'
});
```

**Why files-first**: Many websites set strict Content Security Policy headers that block `new Function()` / `eval()`. The `files:` approach uses the extension's own CSP, which allows `blob:` and `'self'`.

### Cache Management Functions

| Function | Scope | When Called |
|----------|-------|-------------|
| `clearAllCaches()` | All handler/library/registry caches in `chrome.storage.local` | On `install` event (extension update) |
| `clearExpiredCaches()` | Only caches past TTL | On `activate`, `suspend`, periodic alarm |
| `clearLoadedHandlers()` | In-memory Maps only (handlers, libraries, states, domains, tabs, code) | On `suspend` |
| `invalidateHandler(id)` | Single handler from memory + storage | Manual invalidation |
| `cleanup()` | `clearLoadedHandlers()` + `clearExpiredCaches()` | General cleanup |

### Service Worker Lifecycle Integration

```
┌──────────────────────────────────────────────────────────┐
│ install → skipWaiting() + clearAllCaches()               │
│   Forces fresh handler code after extension update       │
├──────────────────────────────────────────────────────────┤
│ activate → clients.claim() + reinjectContentScripts()    │
│          + preloadHandlers() + clearExpiredCaches()       │
├──────────────────────────────────────────────────────────┤
│ suspend → clearLoadedHandlers() + clearExpiredCaches()   │
│   MV3 service workers can be suspended anytime           │
├──────────────────────────────────────────────────────────┤
│ tabs.onUpdated (loading) → clear injection tracking      │
│ tabs.onUpdated (complete) → injectDefaultHandlers(tabId) │
│                           + loadSiteBackgroundHandler()  │
└──────────────────────────────────────────────────────────┘
```

### Development Workflow: Local Handler Compilation

During development, handlers follow this path:

```
src/background/handlers/ai/ai-handler.ts
        ↓  tsc --watch
dist/background/handlers/ai/ai-handler.js
        ↓  build-extension.js copies to output
build/dev/background/handlers/ai/ai-handler.js
        ↓  Extension loads via chrome.runtime.getURL()
Injected into page's ISOLATED world
```

For **local override testing** (C:\Handlers staging):
```
1. Author handler in src/background/handlers/
2. Compile with tsc
3. Copy to C:\Handlers/ for manual testing
4. Extension falls back to local path if CDN unavailable
5. Once validated, upload to CDN
```

### Local vs CDN Handler Loading

| Aspect | Local (Development) | CDN (Production) |
|--------|-------------------|------------------|
| **Source** | `chrome.runtime.getURL(localPath)` | `fetch(cdnUrl)` |
| **CSP** | Always works (extension origin) | Subject to page CSP for code-string |
| **Injection** | `executeScript({ files: [...] })` | `executeScript({ func: ... })` or files |
| **Update** | Requires extension reload | Update S3, cache expires in 24h |
| **Offline** | Always available | Requires network (or cached) |
| **Cache** | `sp_handler_` keys, 24h TTL | Same caching, same TTL |
| **Fallback** | N/A (is the fallback) | Falls back to local |

---

**Status**: Architecture designed and implemented. Local handler injection + CSP-safe fallback working in production. CDN pipeline designed, pending backend API deployment.
**Next**: Build backend API and deploy first dynamic handlers to S3/CDN
