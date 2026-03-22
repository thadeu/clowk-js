# @clowk/hono

Hono middleware for Clowk authentication. Extracts and verifies JWTs from incoming requests and sets the decoded user on `c.get('auth')`.

Works on Cloudflare Workers, Bun, Deno, and Node.js.

## Install

```bash
npm install @clowk/hono @clowk/core
```

## Quick Start

```typescript
import { Hono } from 'hono'
import { configure } from '@clowk/core'
import { clowkMiddleware, requireAuth } from '@clowk/hono'

configure({
  secretKey: process.env.CLOWK_SECRET_KEY,
})

const app = new Hono()

// Apply to all routes — sets c.get('auth') (or null)
app.use('*', clowkMiddleware())

// Public route — auth may be null
app.get('/', (c) => {
  const auth = c.get('auth')
  if (auth) {
    return c.json({ message: `Hello, ${auth.email}` })
  }
  return c.json({ message: 'Hello, visitor' })
})

// Protected route — returns 401 if no valid token
app.use('/api/*', requireAuth())

app.get('/api/me', (c) => {
  const auth = c.get('auth')
  return c.json({ user: auth })
})

export default app
```

## API

### `clowkMiddleware(options?)`

Creates middleware that extracts the JWT, verifies it, and sets the context variable `auth`.

```typescript
app.use('*', clowkMiddleware({
  secretKey: 'sk_live_...',   // optional, defaults to config.secretKey
  tokenParam: 'token',        // query param name (default: "token")
  cookieKey: 'clowk_token',   // cookie name (default: "clowk_token")
}))
```

**Token extraction order:**
1. Query parameter: `?token=eyJ...`
2. Authorization header: `Bearer eyJ...`
3. Cookie: `clowk_token=eyJ...`

**Behavior:**
- Valid token → `c.get('auth')` contains the decoded JWT payload
- No token → `c.get('auth')` returns `null`, request continues
- Invalid token → `c.get('auth')` returns `null`, request continues

### `requireAuth(options?)`

Same as `clowkMiddleware`, but returns `401 Unauthorized` if no valid token is present.

```typescript
app.use('/api/*', requireAuth())
```

Response when unauthorized:
```json
{ "error": "Unauthorized" }
```

## Examples

### Cloudflare Workers

```typescript
import { Hono } from 'hono'
import { configure } from '@clowk/core'
import { clowkMiddleware, requireAuth } from '@clowk/hono'

type Bindings = {
  CLOWK_SECRET_KEY: string
}

const app = new Hono<{ Bindings: Bindings }>()

// Configure per-request (Workers have no global state)
app.use('*', async (c, next) => {
  configure({ secretKey: c.env.CLOWK_SECRET_KEY })
  await next()
})

app.use('*', clowkMiddleware())

app.get('/api/me', (c) => {
  const auth = c.get('auth')
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ id: auth.sub, email: auth.email })
})

export default app
```

### API with route groups

```typescript
import { Hono } from 'hono'
import { configure } from '@clowk/core'
import { clowkMiddleware, requireAuth } from '@clowk/hono'

configure({ secretKey: process.env.CLOWK_SECRET_KEY })

const app = new Hono()

// Public routes
app.get('/health', (c) => c.json({ status: 'ok' }))

// Routes with optional auth
const publicApi = new Hono()
publicApi.use('*', clowkMiddleware())
publicApi.get('/posts', (c) => {
  const auth = c.get('auth')
  return c.json({ posts: getPosts(), viewer: auth?.sub ?? null })
})

// Protected routes
const protectedApi = new Hono()
protectedApi.use('*', requireAuth())
protectedApi.get('/me', (c) => {
  const auth = c.get('auth')!
  return c.json({ id: auth.sub, email: auth.email })
})
protectedApi.get('/settings', (c) => {
  const auth = c.get('auth')!
  return c.json({ settings: getSettings(auth.sub!) })
})

app.route('/api', publicApi)
app.route('/api', protectedApi)

export default app
```

### OAuth callback handler

```typescript
import { setCookie } from 'hono/cookie'

app.get('/clowk/oauth/callback', (c) => {
  const token = c.req.query('token')
  if (!token) return c.redirect('/sign-in?error=no_token')

  setCookie(c, 'clowk_token', token, {
    httpOnly: true,
    sameSite: 'Lax',
    secure: true,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  })

  const returnTo = c.req.query('return_to') ?? '/'
  return c.redirect(returnTo)
})
```

## TypeScript

The middleware extends Hono's context variable map:

```typescript
declare module 'hono' {
  interface ContextVariableMap {
    auth: JwtPayload | null
  }
}
```

Access `c.get('auth')` with full type safety:

```typescript
app.get('/api/me', (c) => {
  const auth = c.get('auth') // typed as JwtPayload | null
  if (!auth) return c.json({ error: 'Unauthorized' }, 401)
  return c.json({ id: auth.sub, email: auth.email })
})
```
