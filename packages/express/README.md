# @clowk/express

Express middleware for Clowk authentication. Extracts and verifies JWTs from incoming requests and attaches the decoded user to `req.auth`.

## Install

```bash
npm install @clowk/express @clowk/core
```

## Quick Start

```typescript
import express from 'express'
import { configure } from '@clowk/core'
import { clowkMiddleware, requireAuth } from '@clowk/express'

configure({
  secretKey: process.env.CLOWK_SECRET_KEY,
})

const app = express()

// Apply to all routes — sets req.auth (or null)
app.use(clowkMiddleware())

// Public route — req.auth may be null
app.get('/', (req, res) => {
  if (req.auth) {
    res.json({ message: `Hello, ${req.auth.email}` })
  } else {
    res.json({ message: 'Hello, visitor' })
  }
})

// Protected route — returns 401 if no valid token
app.get('/dashboard', requireAuth(), (req, res) => {
  res.json({ user: req.auth })
})

app.listen(3000)
```

## API

### `clowkMiddleware(options?)`

Creates middleware that extracts the JWT, verifies it, and sets `req.auth`.

```typescript
app.use(clowkMiddleware({
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
- Valid token → `req.auth` contains the decoded JWT payload
- No token → `req.auth = null`, request continues
- Invalid token → `req.auth = null`, request continues (no error thrown)

### `requireAuth(options?)`

Same as `clowkMiddleware`, but returns `401 Unauthorized` if no valid token is present.

```typescript
app.get('/api/me', requireAuth(), (req, res) => {
  // req.auth is guaranteed to be non-null here
  res.json({ id: req.auth!.sub, email: req.auth!.email })
})
```

Response when unauthorized:
```json
{ "error": "Unauthorized" }
```

## Examples

### API with mixed public/protected routes

```typescript
import express from 'express'
import { configure } from '@clowk/core'
import { clowkMiddleware, requireAuth } from '@clowk/express'

configure({ secretKey: process.env.CLOWK_SECRET_KEY })

const app = express()
app.use(express.json())
app.use(clowkMiddleware())

// Public
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Public with optional auth
app.get('/api/posts', (req, res) => {
  const posts = getPosts()
  res.json({
    posts,
    viewer: req.auth?.sub ?? null,
  })
})

// Protected
app.get('/api/me', requireAuth(), (req, res) => {
  res.json({
    id: req.auth!.sub,
    email: req.auth!.email,
    provider: req.auth!.provider,
  })
})

// Protected with role check
app.delete('/api/users/:id', requireAuth(), (req, res) => {
  if (req.auth!.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' })
  }
  deleteUser(req.params.id)
  res.status(204).end()
})
```

### With cookie-parser

```typescript
import express from 'express'
import cookieParser from 'cookie-parser'
import { clowkMiddleware } from '@clowk/express'

const app = express()
app.use(cookieParser())          // parses cookies into req.cookies
app.use(clowkMiddleware())       // reads from req.cookies.clowk_token
```

### OAuth callback handler

```typescript
app.get('/clowk/oauth/callback', (req, res) => {
  const token = req.query.token as string
  if (token) {
    // Set httpOnly cookie
    res.cookie('clowk_token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: req.secure,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    })
    res.redirect(req.query.return_to as string || '/')
  } else {
    res.redirect('/sign-in?error=no_token')
  }
})
```

## TypeScript

The middleware extends the Express `Request` type:

```typescript
declare global {
  namespace Express {
    interface Request {
      auth?: JwtPayload | null
    }
  }
}
```

Access `req.auth` with full type safety:

```typescript
app.get('/api/me', requireAuth(), (req, res) => {
  const userId: string = req.auth!.sub!
  const email: string = req.auth!.email as string
  res.json({ userId, email })
})
```
