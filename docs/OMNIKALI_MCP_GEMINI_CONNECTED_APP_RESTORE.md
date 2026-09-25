# OmniKali MCP — Gemini Connected-App Restore State

**Status:** Known-good Gemini Connected App connection restored  
**Verified outcome:** Gemini reported **“Custom app loaded”** after the compatibility fixes.  
**Scope:** MCP OAuth + Streamable HTTP compatibility between Gemini Connected Apps and the OmniKali MCP gateway.

> This document records the working state and the diagnostic path that produced it. It intentionally excludes credentials, tokens, authorization codes, PKCE verifiers, cookies, and client secrets.

## 1. Working connection path

```
Gemini Connected Apps
        |
        | OAuth / PKCE
        v
CloudFront: d22bad48irrbqe.cloudfront.net
        |
        v
Nginx
        |
        v
omni-mcp.service :8094
        |
        +--> OAuth compatibility layer
        |      - dynamic client registration
        |      - authorization code flow
        |      - PKCE S256
        |      - Cognito bridge
        |      - token + refresh-token endpoints
        |
        +--> MCP server
               - Streamable HTTP
               - MCP tools/resources
```

The important finding is that the connection had **multiple sequential failure points**. Fixing only OAuth was not sufficient: Gemini could obtain an access token and still fail during MCP initialization.

---

## 2. Symptoms observed

The integration progressed through several distinct states:

1. Gemini initially completed the consent flow but reported:
   `{"error":"invalid_request","error_description":"unknown client or redirect_uri"}`
2. After OAuth compatibility recovery, authorization-code exchange succeeded, but the MCP server still failed to connect.
3. Server logs exposed:
   `TypeError: handler is not a function`
4. After correcting the MCP HTTP adapter, Gemini reached the MCP server but reported:
   **“We had trouble connecting to this server.”**
5. Inspection of the installed MCP SDK identified an HTTP `406 Not Acceptable` path caused by the SDK requiring both:
   - `application/json`
   - `text/event-stream`
   in the HTTP `Accept` header.
6. Gemini's Connected Apps proxy could omit `text/event-stream`, even though it expected the standard JSON MCP response.
7. The gateway normalized that compatibility request before handing it to the SDK.
8. Gemini then reported:
   **“Custom app loaded”**.

---

## 3. Fix #1 — OAuth client/redirect compatibility

### Problem

The OAuth bridge originally rejected a client when the requested `client_id` and redirect URI were not already present as an exact registered pair.

Gemini uses a Google OAuth callback in the form:

```
https://oauth-redirect.googleusercontent.com/r/...
```

The strict check produced:

```
unknown client or redirect_uri
```

### Recovery

The authorization endpoint was given a narrowly scoped compatibility path:

- only `mcp_*` client IDs are eligible;
- only the Google OAuth redirect family is eligible;
- the recovered client is stored persistently;
- the exact redirect URI is still bound to that client;
- PKCE S256 remains required;
- arbitrary redirect URIs are not trusted.

This allowed Gemini's client registration/authorization sequence to complete without turning the OAuth endpoint into an open redirect trust mechanism.

---

## 4. Fix #2 — Missing Node crypto imports

The OAuth implementation used:

- `randomBytes`
- `createHash`
- `timingSafeEqual`

but the module initially imported only filesystem functions.

The missing import was corrected to:

```js
import { randomBytes, createHash, timingSafeEqual } from "node:crypto";
```

The module was syntax-checked and the MCP service restarted successfully.

---

## 5. Fix #3 — MCP SDK handler API mismatch

### Problem

The installed package was:

```
@modelcontextprotocol/server 2.1.0
```

The code assumed:

```js
const handler = createMcpHandler(...);
return handler(req, res);
```

But the installed SDK returns an object containing a Fetch-style handler:

```js
{
  fetch,
  notify,
  bus,
  close
}
```

Therefore the Node HTTP server attempted to call an object as a function and produced:

```
TypeError: handler is not a function
```

### Fix

The gateway now adapts Node's `IncomingMessage`/`ServerResponse` to the SDK's Fetch interface:

```
Node HTTP request
      |
      v
Headers + Request
      |
      v
handler.fetch(request)
      |
      v
Fetch Response
      |
      v
Node HTTP response
```

The adapter:

- copies incoming headers into a Fetch `Headers`;
- converts the request stream with `Readable.toWeb()`;
- creates a Fetch `Request`;
- invokes `handler.fetch()`;
- copies response headers/status back to Node;
- streams the Fetch response body with `Readable.fromWeb()`.

This preserves the installed SDK API instead of downgrading or replacing the package.

---

## 6. Fix #4 — Gemini Accept-header compatibility

### Problem

After OAuth and the handler adapter were working, the installed MCP SDK rejected a Gemini POST request with HTTP 406 when the `Accept` header did not contain both:

```
application/json
text/event-stream
```

The SDK's request validation explicitly requires both media types.

Gemini's Connected Apps transport can omit `text/event-stream` while still expecting a valid MCP JSON response.

### Fix

The compatibility layer normalizes only MCP POST requests:

```js
if (method === "POST" && url.startsWith("/mcp")) {
  if (!accept.includes("application/json"))
    accept = "application/json";
  if (!accept.includes("text/event-stream"))
    accept += ", text/event-stream";
}
```

The normalization happens at the OmniKali edge before the SDK sees the request.

This is intentionally narrower than globally weakening HTTP content negotiation.

---

## 7. OAuth/session behavior preserved

The working OAuth bridge retains:

- authorization code flow;
- PKCE S256;
- exact redirect binding;
- persistent OAuth state;
- refresh tokens;
- Cognito authentication;
- `mcp` scope;
- resource binding to the public MCP endpoint.

The bridge windows used during the recovery work were:

- pending OAuth bridge state: 30 minutes;
- authorization code: 10 minutes;
- issued access token: 1 hour;
- gateway session: 1 hour.

These values should not be changed casually now that the connection is known-good.

---

## 8. Verification evidence

The following checks were successful during recovery:

- `node --check` passed for the modified MCP/OAuth modules.
- `omni-mcp.service` restarted and reported `active`.
- OAuth authorization-code telemetry recorded a successful `200` exchange.
- Refresh-token issuance was successful.
- Public OAuth metadata endpoint returned HTTP `200`.
- Public token endpoint was reachable through CloudFront and returned structured JSON.
- Gemini ultimately displayed:
  **“Custom app loaded”**.

The final Gemini result is the highest-level integration verification performed in this restore state.

### Next verification

Before making additional compatibility changes, test an actual read-only MCP tool call from Gemini, such as:

- `system_metrics`
- `task_list`

A successful tool invocation should be treated as the next milestone: **OAuth + MCP handshake + tool execution**.

---

## 9. Restore-point history

Formal restore points created during the recovery work include:

- `20260925T002655Z-mcp-oauth-session-fix`
- `20260924T235318Z`
- `20260925T021000Z-mcp-oauth-token-fix`
- `20260925T021500Z-mcp-handler-adapter`

The handler-adapter restore point was created immediately before changing the MCP HTTP adapter.

The next known-good Gemini state should be preserved as a formal restore point before any further structural changes.

Recommended marker:

```
LATEST_GEMINI_MCP_CONNECTED_RESTORE
```

---

## 10. Security notes

Never commit or document:

- MCP bearer tokens;
- Cognito client secrets;
- OAuth authorization codes;
- PKCE code verifiers;
- access tokens;
- refresh tokens;
- session cookies;
- contents of the live OAuth token store.

Diagnostic telemetry should contain only metadata such as:

- timestamp;
- grant type;
- HTTP status;
- client-ID prefix;
- redirect-URI prefix;
- whether a code/verifier was present.

No secret material should be logged.

---

## 11. Lessons for future OmniKali integrations

### A. Verify the installed SDK, not the assumed API

Before changing application code, inspect the exact installed MCP SDK version and its handler contract.

### B. Separate OAuth failures from MCP transport failures

A successful token exchange does **not** prove the MCP connection is healthy. Test the sequence independently:

1. metadata discovery;
2. client registration;
3. authorization;
4. token exchange;
5. MCP initialization;
6. tool invocation.

### C. Put compatibility at the edge

When a third-party client has a transport quirk, prefer a narrowly scoped edge adapter over weakening the core MCP implementation.

### D. Preserve rollback points

Create a restore point before every substantial compatibility change. Keep the last known-good state independently identifiable.

### E. Human GUI input remains authoritative

This MCP connection is part of OmniKali's larger control plane. MCP/agent automation must not turn GUI locking into an input-blocking mechanism. The invariant remains:

```
HumanInput > GUI arbitration > AgentInput
```

---

## 12. Current restore-state definition

A future restore state should be considered **Gemini Connected-App compatible** only when all of the following are true:

- [x] OAuth metadata is publicly reachable.
- [x] Gemini can register/authorize a client.
- [x] Cognito authentication completes.
- [x] PKCE token exchange returns success.
- [x] MCP HTTP requests reach `omni-mcp.service`.
- [x] Node HTTP is correctly adapted to the installed SDK Fetch handler.
- [x] Gemini-compatible `Accept` negotiation is normalized.
- [x] Gemini reports **“Custom app loaded”**.
- [ ] A read-only MCP tool call from Gemini succeeds.

The final unchecked item is the next validation target, not a reason to modify the known-good connection prematurely.
