# Communication Protocol Documentation

## Overview

The SuperPersova Extension implements a **standardized communication protocol** for bidirectional data exchange between the browser extension and the web application (https://superpersova.com). This enables seamless authentication state sharing, storage synchronization, and context management.

## Architecture

```
┌─────────────────┐                    ┌──────────────────────┐
│   Web App       │◄───postMessage────►│  Content Script      │
│ (superpersova)  │                    │  (Communication      │
│                 │                    │   Bridge)            │
└─────────────────┘                    └──────────┬───────────┘
                                                  │
                                          chrome.runtime.sendMessage
                                                  │
                                                  ▼
                                       ┌──────────────────────┐
                                       │  Background Script   │
                                       │  (Service Worker)    │
                                       │  • IndexedDB         │
                                       │  • Chrome Storage    │
                                       └──────────────────────┘
```

## Message Structure

All messages follow a standardized format:

```typescript
interface CommMessage<T = any> {
  version: string;           // Protocol version (e.g., "1.0.0")
  requestId: string;         // Unique ID for request/response correlation
  type: CommMessageType;     // Message type identifier
  source: CommTarget;        // Message source
  target: CommTarget;        // Message destination
  timestamp: number;         // Creation timestamp
  payload: T;               // Message-specific payload
  metadata?: {              // Optional metadata
    userId?: string;
    sessionId?: string;
    tabId?: number;
    [key: string]: any;
  };
}
```

### Response Structure

```typescript
interface CommResponse<T = any> extends CommMessage<T> {
  success: boolean;          // Operation success status
  error?: CommError;        // Error details if failed
}
```

### Error Structure

```typescript
interface CommError {
  code: CommErrorCode;      // Error code (INVALID_MESSAGE, UNAUTHORIZED, etc.)
  message: string;          // Human-readable message
  details?: any;            // Additional error details
  stack?: string;           // Stack trace (dev only)
}
```

## Message Types

### Storage Operations

#### 1. **storage.read** - Read from extension storage
**Payload:**
```typescript
{
  scope: 'auth' | 'user' | 'context' | 'settings' | 'cache' | 'all',
  keys?: string[]  // Optional: specific keys to read
}
```

**Response:**
```typescript
{
  data: Record<string, any>  // Key-value pairs
}
```

#### 2. **storage.write** - Write to extension storage
**Payload:**
```typescript
{
  scope: StorageScope,
  data: Record<string, any>,
  merge?: boolean  // If true, merges with existing data
}
```

**Response:**
```typescript
{
  writtenKeys: string[]
}
```

#### 3. **storage.delete** - Delete from extension storage
**Payload:**
```typescript
{
  scope: StorageScope,
  keys: string[]
}
```

**Response:**
```typescript
{
  deletedKeys: string[]
}
```

#### 4. **storage.sync** - Synchronize storage between extension and web app
**Payload:**
```typescript
{
  scopes: StorageScope[],
  direction: 'toExtension' | 'toWebApp' | 'bidirectional'
}
```

**Response:**
```typescript
{
  syncedScopes: StorageScope[],
  summary: {
    itemsSynced: number,
    conflicts?: number
  }
}
```

### Authentication Operations

#### 5. **auth.getToken** - Get authentication token
**Payload:**
```typescript
{
  tokenType?: 'access' | 'refresh' | 'platform'
}
```

**Response:**
```typescript
{
  token: string | null,
  expiresAt?: number,
  metadata?: {
    userId?: string,
    scope?: string,
    provider?: string
  }
}
```

#### 6. **auth.setToken** - Store authentication token
**Payload:**
```typescript
{
  token: string,
  tokenType: 'access' | 'refresh' | 'platform',
  expiresIn?: number,  // Seconds
  metadata?: Record<string, any>
}
```

**Response:**
```typescript
{
  saved: boolean
}
```

#### 7. **auth.status** - Get authentication status
**Payload:**
```typescript
{
  autoRefresh?: boolean
}
```

**Response:**
```typescript
{
  isAuthenticated: boolean,
  user?: {
    id: string,
    email?: string,
    name?: string
  },
  tokenStatus?: {
    isExpired: boolean,
    expiresAt?: number
  }
}
```

#### 8. **auth.logout** - Logout user
**Payload:** Empty

**Response:**
```typescript
{
  success: boolean
}
```

### Extension Control

#### 9. **ext.handshake** - Establish connection
**Payload:**
```typescript
{
  appVersion: string,
  capabilities?: string[]
}
```

**Response:**
```typescript
{
  extensionVersion: string,
  capabilities: string[],
  connected: boolean
}
```

#### 10. **ext.health** - Check extension health
**Payload:** Empty

**Response:**
```typescript
{
  status: 'healthy' | 'degraded' | 'unhealthy',
  checks: {
    storage: boolean,
    auth: boolean,
    background: boolean
  }
}
```

#### 11. **ext.capabilities** - Get extension capabilities
**Payload:** Empty

**Response:**
```typescript
{
  capabilities: {
    storage: { read: boolean, write: boolean, sync: boolean },
    auth: { getToken: boolean, setToken: boolean, refresh: boolean },
    context: { capture: boolean, retrieve: boolean }
  }
}
```

## Usage Examples

### From Web App (Angular)

```typescript
// 1. Create communication helper
class ExtensionBridge {
  private pendingRequests = new Map<string, any>();

  async sendMessage<T>(type: string, payload: any): Promise<T> {
    const requestId = this.generateRequestId();
    
    const message = {
      version: '1.0.0',
      requestId,
      type,
      source: 'sp-web-app',
      target: 'sp-content-script',
      timestamp: Date.now(),
      payload
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(requestId);
        reject(new Error('Timeout'));
      }, 30000);

      this.pendingRequests.set(requestId, { resolve, reject, timeout });
      
      window.postMessage(message, '*');
    });
  }

  initialize() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) return;
      
      const message = event.data;
      if (!message.requestId) return;
      
      const pending = this.pendingRequests.get(message.requestId);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.requestId);
        
        if (message.success) {
          pending.resolve(message.payload);
        } else {
          pending.reject(new Error(message.error?.message));
        }
      }
    });
  }

  private generateRequestId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// 2. Initialize bridge
const extBridge = new ExtensionBridge();
extBridge.initialize();

// 3. Example: Handshake
const handshake = await extBridge.sendMessage('ext.handshake', {
  appVersion: '1.0.0',
  capabilities: ['auth', 'storage']
});
console.log('Extension version:', handshake.extensionVersion);

// 4. Example: Get auth token
const tokenResponse = await extBridge.sendMessage('auth.getToken', {
  tokenType: 'access'
});

if (tokenResponse.token) {
  console.log('User is authenticated');
  // Use token for API calls
}

// 5. Example: Set auth token (when user logs in on web app)
await extBridge.sendMessage('auth.setToken', {
  token: 'eyJhbGciOiJIUzI1NiIs...',
  tokenType: 'access',
  expiresIn: 3600,
  metadata: {
    userId: 'user123',
    email: 'user@example.com'
  }
});

// 6. Example: Sync storage
await extBridge.sendMessage('storage.sync', {
  scopes: ['auth', 'user'],
  direction: 'toExtension'
});

// 7. Example: Read storage
const storageData = await extBridge.sendMessage('storage.read', {
  scope: 'user',
  keys: ['userProfile', 'preferences']
});
console.log('User data:', storageData.data);

// 8. Example: Check auth status
const authStatus = await extBridge.sendMessage('auth.status', {});
if (authStatus.isAuthenticated) {
  console.log('Logged in as:', authStatus.user?.email);
} else {
  console.log('Not authenticated');
}
```

### From Extension (Content Script)

```typescript
import { getCommunicationBridge } from './lib/communication-bridge';

const bridge = getCommunicationBridge();

// Listen for messages from web app - handled automatically
// Responses are sent back through the bridge

// To initiate communication FROM extension TO web app:
const response = await bridge.sendMessage('storage.read', {
  scope: 'auth'
});
```

## Security

### Origin Validation
Only messages from allowed origins are processed:
- `https://superpersova.com`
- `https://staging.superpersova.com`
- `http://localhost:4200` (dev only)

### Message Validation
All messages must have:
- Valid structure (version, requestId, type, source, target, timestamp)
- Recognized message type
- Valid payload structure for the message type

### Error Codes
- `INVALID_MESSAGE` - Message structure is invalid
- `UNAUTHORIZED` - Sender is not authorized
- `PERMISSION_DENIED` - Operation not permitted
- `NOT_FOUND` - Requested resource not found
- `STORAGE_ERROR` - Storage operation failed
- `TIMEOUT` - Request exceeded timeout
- `EXTENSION_NOT_AVAILABLE` - Extension not loaded
- `INVALID_SCOPE` - Invalid storage scope
- `VALIDATION_ERROR` - Payload validation failed
- `UNKNOWN_ERROR` - Unexpected error

## Use Cases

### Use Case 1: Single Sign-On

**Scenario:** User logs in via extension, web app should use same session

```typescript
// Extension captures login
chrome.storage.local.set({
  accessToken: 'token',
  expiresIn: 3600,
  tokenTimestamp: Date.now(),
  authUser: { id: '123', email: 'user@example.com' }
});

// Web app checks auth status
const status = await extBridge.sendMessage('auth.status', {});
if (status.isAuthenticated) {
  // Get token and use it
  const { token } = await extBridge.sendMessage('auth.getToken', {
    tokenType: 'access'
  });
  // Make API calls with token
}
```

### Use Case 2: Reverse SSO

**Scenario:** User logs in on web app, extension should sync

```typescript
// Web app captures login
await extBridge.sendMessage('auth.setToken', {
  token: response.access_token,
  tokenType: 'access',
  expiresIn: response.expires_in
});

// Extension automatically has the token now
```

### Use Case 3: Context Sharing

**Scenario:** Share captured context between extension and web app

```typescript
// Extension captures context from a page
// Stored in IndexedDB via context-extractor

// Web app retrieves context
const contexts = await extBridge.sendMessage('context.list', {
  contextType: 'image',
  limit: 10
});
```

## Best Practices

1. **Always handle errors:**
   ```typescript
   try {
     const result = await extBridge.sendMessage(...);
   } catch (error) {
     console.error('Communication failed:', error);
   }
   ```

2. **Implement timeout handling:**
   - Default timeout: 30 seconds
   - Cancel pending requests on navigation

3. **Validate responses:**
   ```typescript
   const response = await extBridge.sendMessage(...);
   if (response.success) {
     // Use response.payload
   } else {
     // Handle response.error
   }
   ```

4. **Use appropriate storage scopes:**
   - `auth`: Authentication tokens and session data
   - `user`: User profile and preferences
   - `context`: Captured contexts
   - `settings`: Application settings
   - `cache`: Temporary cached data

5. **Implement handshake on app initialization:**
   ```typescript
   const handshake = await extBridge.sendMessage('ext.handshake', {
     appVersion: '1.0.0'
   });
   
   if (!handshake.connected) {
     // Extension not available, show warning
   }
   ```

## Constants Reference

All constants are available in `shared-ext-app-constants.ts`:
- `COMM_MESSAGE_TYPES`: Message type identifiers
- `COMM_TARGETS`: Source/target identifiers
- `STORAGE_SCOPE`: Storage scope names
- `COMM_ERROR_CODES`: Error codes
- `ALLOWED_ORIGINS`: Permitted origins

## TypeScript Support

Full TypeScript definitions are available in `types/communication.ts`:
- `CommMessage<T>`: Base message type
- `CommResponse<T>`: Response message type
- `CommError`: Error structure
- `CommPayloadMap`: Maps message types to payloads
- `CommResponseMap`: Maps message types to responses
