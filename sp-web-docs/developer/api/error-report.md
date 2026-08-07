# Error Report API (/api/error-report)

Overview
- Purpose: Receive structured client error reports from the ErrorBoundary and store for analysis.
- Method: POST
- Path: /api/error-report
- Auth: Optional (bearer or session). Accept unauthenticated but include client-provided user/tenant when available.
- Idempotency: Not required; treat each report as independent.

Request Schema (JSON)
- timestamp: ISO string (client error time)
- version: string (build/app version)
- message: string
- name: string (error class/name)
- stack: string[] (array; may be empty)
- route: string (path + query)
- userAgent: string
- online: boolean
- tenant?: string
- userId?: string
- reduxSlices: string[]

Redaction & Security
- Never trust client fields. Apply allowlist-only persistence.
- Redact PII: emails, phone numbers, auth tokens if present in message/stack.
- Limit size: reject >64KB payloads with 413.
- Rate limit: IP + userId/tenant-based (e.g., 60/min) to avoid abuse.
- CORS: Restrict to your origins in production.

Validation (Zod example)
- See pseudo-code:
```
import { z } from 'zod';
export const ErrorReportSchema = z.object({
  timestamp: z.string().datetime(),
  version: z.string().min(1),
  message: z.string().min(1),
  name: z.string().min(1),
  stack: z.array(z.string()),
  route: z.string().min(1),
  userAgent: z.string().min(1),
  online: z.boolean(),
  tenant: z.string().optional(),
  userId: z.string().optional(),
  reduxSlices: z.array(z.string())
});
```

Response
- 200 OK: `{ id: string, status: 'ok' }`
- 400 Bad Request: `{ status: 'invalid', issues?: ZodIssue[] }`
- 413 Payload Too Large
- 429 Too Many Requests
- 500 Server Error

Storage Strategy
- Minimal: Append-only file or log sink (e.g., cloud logging) with TTL.
- Better: DB table `error_reports` with columns matching schema plus server-received timestamp, IP, and UA hash for privacy.
- Retention: 14–30 days recommended.

Example Implementations
- Express (TypeScript):
```
import express from 'express';
import { z } from 'zod';
const router = express.Router();
router.post('/api/error-report', express.json({ limit: '64kb' }), async (req, res) => {
  const parse = ErrorReportSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json({ status: 'invalid', issues: parse.error.issues });
  const report = parse.data;
  // TODO: redact, store, and return id
  const id = `rep_${Date.now()}`;
  return res.json({ id, status: 'ok' });
});
export default router;
```

- Fastify:
```
fastify.post('/api/error-report', { schema: { body: ErrorReportSchema.toJSON() } }, async (req, reply) => {
  const id = `rep_${Date.now()}`;
  return reply.send({ id, status: 'ok' });
});
```

- Hono (Edge):
```
app.post('/api/error-report', async c => {
  const body = await c.req.json();
  const parse = ErrorReportSchema.safeParse(body);
  if (!parse.success) return c.json({ status: 'invalid' }, 400);
  const id = `rep_${Date.now()}`;
  return c.json({ id, status: 'ok' });
});
```

Client Integration
- Already wired: `ErrorBoundary.report()` posts JSON to `/api/error-report`.
- In tests, MSW mocks this endpoint to always return `{ status: 'ok' }`.

Deployment Notes
- If using Vite dev server, add a proxy for `/api/*` to your backend.
- Ensure TLS and auth for production.
