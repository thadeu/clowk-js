# @clowk/sdk

The official Clowk SDK for JavaScript and TypeScript. This is the recommended package to install when using Clowk in any JS/TS project.

Re-exports everything from `@clowk/core` under a clean import path.

## Install

```bash
npm install @clowk/sdk
```

## Quick Start

### Configure

```typescript
import { configure } from '@clowk/sdk'

configure({
  secretKey: process.env.CLOWK_SECRET_KEY,
  publishableKey: process.env.CLOWK_PUBLISHABLE_KEY,
})
```

### Use the SDK Client

```typescript
import { ClowkClient } from '@clowk/sdk'

const client = new ClowkClient()

// List all users
const users = await client.users.list()

// Find a specific user
const user = await client.users.find('user_123')

// Search with filters
const active = await client.users.search({ status: 'active' })

// Verify a token
const result = await client.tokens.verify('eyJhbGci...')

// Resolve subdomain
const instance = await client.subdomains.findByPk('pk_live_xxx')
```

### Verify JWTs

```typescript
import { JwtVerifier } from '@clowk/sdk'

const verifier = new JwtVerifier({ secretKey: 'sk_live_...' })

const payload = await verifier.verify('eyJhbGci...')
console.log(payload.sub)   // "user_123"
console.log(payload.email) // "john@example.com"
```

### Extract tokens from requests

```typescript
import { TokenExtractor } from '@clowk/sdk'

const extractor = new TokenExtractor()
const token = extractor.extract({
  params: req.query,
  headers: req.headers,
  cookies: req.cookies,
})
```

### Using the namespace

```typescript
import Clowk from '@clowk/sdk'

Clowk.configure({ secretKey: '...' })
const client = new Clowk.Client()
```

## When to use `@clowk/sdk` vs `@clowk/core`

They export the same API. Use `@clowk/sdk` in your application code — it's the public-facing package name. Use `@clowk/core` when building framework integrations or other `@clowk/*` packages.

## Full API

See the [@clowk/core README](../core/README.md) for the complete API reference including all configuration options, resources, error types, and HTTP client documentation.
