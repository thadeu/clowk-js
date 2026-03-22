# @clowk/core

Foundation package for all Clowk JS SDKs. Runtime-agnostic — works in Node.js, Bun, Deno, Cloudflare Workers, and browsers.

This package provides configuration, HTTP client, SDK resources, JWT verification, subdomain resolution, and token extraction. All other `@clowk/*` packages depend on this.

## Install

```bash
npm install @clowk/core
```

## Architecture

```
@clowk/core
├── Configuration       ← Singleton config with sensible defaults
├── Errors              ← ClowkError hierarchy
├── HTTP Client         ← Native fetch + middleware stack (timeout, retry, logger)
├── SDK Client          ← Resource-oriented API (users, sessions, subdomains, tokens)
├── JWT Verifier        ← HS256 verification via jose
├── Subdomain Resolver  ← Instance URL resolution + 60s cache
└── Token Extractor     ← Extract JWT from params, bearer header, or cookie
```

## Configuration

```typescript
import { configure, getConfig, resetConfig } from '@clowk/core'

configure({
  secretKey: process.env.CLOWK_SECRET_KEY,
  publishableKey: process.env.CLOWK_PUBLISHABLE_KEY,
})

const config = getConfig()
console.log(config.apiBaseUrl) // https://api.clowk.dev/client/v1
```

### All settings

| Setting | Default | Description |
|---|---|---|
| `apiBaseUrl` | `https://api.clowk.dev/client/v1` | API endpoint |
| `appBaseUrl` | `https://app.clowk.in` | Dashboard URL |
| `secretKey` | `null` | Instance secret key (JWT verification) |
| `publishableKey` | `null` | Instance publishable key (subdomain resolution) |
| `subdomainUrl` | `null` | Fallback auth domain URL |
| `afterSignInPath` | `/` | Redirect after sign in |
| `afterSignOutPath` | `/` | Redirect after sign out |
| `mountPath` | `/clowk` | Local mount prefix |
| `callbackPath` | `/clowk/oauth/callback` | OAuth callback route |
| `cookieKey` | `clowk_token` | Cookie name for token |
| `sessionKey` | `clowk` | Session key |
| `tokenParam` | `token` | Query param name for token |
| `issuer` | `clowk` | Expected JWT issuer |
| `httpOpenTimeout` | `5` (seconds) | Connection timeout |
| `httpReadTimeout` | `10` (seconds) | Read timeout |
| `httpWriteTimeout` | `10` (seconds) | Write timeout |
| `httpRetryAttempts` | `2` | Retries on network errors |
| `httpRetryInterval` | `0.05` (seconds) | Delay between retries |
| `httpLogger` | `null` | Optional logger instance |

## SDK Client

The main entry point for interacting with the Clowk API.

```typescript
import { ClowkClient } from '@clowk/core'

const client = new ClowkClient({
  secretKey: 'sk_live_...',
  publishableKey: 'pk_live_...',
})

// List users
const users = await client.users.list()
console.log(users.bodyParsed)

// Find a user
const user = await client.users.find('user_123')

// Search with Zendesk-style operators
const results = await client.users.search({ email: 'john@example.com', status: 'active' })
// GET /users/search?query=email:john@example.com+status:active

// Search with raw string (supports >, <, >= operators)
const recent = await client.users.search('created_at>2024-01-01 status:active')

// Delete a user
await client.users.destroy('user_123')
```

### Resources

| Resource | Path | Extra methods |
|---|---|---|
| `client.users` | `/users` | — |
| `client.sessions` | `/sessions` | — |
| `client.subdomains` | `/instances` | `findByPk(key)` |
| `client.tokens` | `/tokens` | `verify(token)` |

All resources inherit: `list()`, `find(id)`, `show(id)`, `search(query)`, `destroy(id)`.

```typescript
// Resolve subdomain by publishable key
const instance = await client.subdomains.findByPk('pk_live_xxx')
// GET /instances/search?query=publishable_key:pk_live_xxx

// Verify a token server-side via API
const result = await client.tokens.verify('eyJhbGci...')
// POST /tokens/verify { token: "eyJhbGci..." }
```

### Direct HTTP access

The client also exposes raw HTTP methods for custom endpoints:

```typescript
const response = await client.get('custom/endpoint')
const created = await client.post('custom/endpoint', { name: 'John' })
await client.put('custom/endpoint/1', { name: 'Jane' })
await client.patch('custom/endpoint/1', { active: true })
await client.delete('custom/endpoint/1')
```

## JWT Verifier

Verifies HS256 JWTs using [jose](https://github.com/panva/jose). Works in all runtimes.

```typescript
import { JwtVerifier } from '@clowk/core'

const verifier = new JwtVerifier({
  secretKey: 'sk_live_...',  // defaults to config.secretKey
  issuer: 'clowk',           // defaults to config.issuer, null to skip
})

try {
  const payload = await verifier.verify('eyJhbGci...')
  console.log(payload.sub)   // "user_123"
  console.log(payload.email) // "john@example.com"
} catch (error) {
  // ConfigurationError — missing secretKey
  // InvalidTokenError — expired, wrong signature, bad issuer, malformed
}
```

## Subdomain Resolver

Resolves the auth URL for a Clowk instance. Caches results for 60 seconds.

```typescript
import { SubdomainResolver } from '@clowk/core'

// Resolve via API (uses publishableKey)
const resolver = new SubdomainResolver({ publishableKey: 'pk_live_xxx' })
const url = await resolver.resolveUrl()
// "https://myapp.clowk.dev"

// Or use a direct URL (no API call)
const direct = new SubdomainResolver({ subdomainUrl: 'https://myapp.clowk.dev' })
const url2 = await direct.resolveUrl()

// Clear cache (useful in tests)
SubdomainResolver.clearCache()
```

## Token Extractor

Extracts JWT tokens from incoming requests. Framework-agnostic.

```typescript
import { TokenExtractor } from '@clowk/core'

const extractor = new TokenExtractor()

// Priority: params → bearer header → cookie
const token = extractor.extract({
  params: { token: 'eyJ...' },                    // 1st priority
  headers: { authorization: 'Bearer eyJ...' },     // 2nd priority
  cookies: { clowk_token: 'eyJ...' },              // 3rd priority
})
```

## HTTP Client

Low-level HTTP client with middleware stack. Built on native `fetch`.

```typescript
import { HttpClient } from '@clowk/core'

const http = new HttpClient({
  baseUrl: 'https://api.example.com',
  headers: { 'X-Custom': 'value' },
  logger: console,         // logs [Clowk::Http] GET ... and [Clowk::Http] -> 200
  openTimeout: 5,
  readTimeout: 10,
  retryAttempts: 2,
})

const response = await http.get('/users')
console.log(response.status)     // 200
console.log(response.bodyParsed) // { data: [...] }
console.log(response.success)    // true
```

### Middleware stack

```
Request → Timeout → Retry → Logger → fetch()
```

- **Timeout** — aborts after `(openTimeout + readTimeout)` seconds
- **Retry** — retries on transient network errors only (ECONNRESET, ETIMEDOUT, etc). Does NOT retry HTTP 4xx/5xx
- **Logger** — logs request method + URL and response status code
- **Safety** — max response body size is 1 MB

## Errors

```typescript
import {
  ClowkError,          // base error
  ConfigurationError,  // missing keys, invalid config
  InvalidStateError,   // CSRF state mismatch
  InvalidTokenError,   // JWT decode/verify/expired/issuer errors
} from '@clowk/core'

try {
  await verifier.verify(token)
} catch (error) {
  if (error instanceof InvalidTokenError) {
    console.log('Token problem:', error.message)
  }
  if (error instanceof ConfigurationError) {
    console.log('Config problem:', error.message)
  }
}
```

## Convenience namespace

```typescript
import Clowk from '@clowk/core'

Clowk.configure({ secretKey: '...' })
const client = new Clowk.Client()
const config = Clowk.config
Clowk.reset()
```
