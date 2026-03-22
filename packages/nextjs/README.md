# @clowk/nextjs

Next.js integration for Clowk authentication. Combines `@clowk/core` and `@clowk/react` with Next.js-specific middleware and server helpers.

## Install

```bash
npm install @clowk/nextjs
```

## Architecture

```
@clowk/nextjs
├── middleware.ts  ← Next.js edge middleware for route protection
├── server.ts      ← auth() helper for Server Components / Route Handlers
└── index.ts       ← Re-exports React components + core utilities
```

## Quick Start

### 1. Set environment variables

```env
# .env.local
NEXT_PUBLIC_CLOWK_PUBLISHABLE_KEY=pk_live_...
CLOWK_SECRET_KEY=sk_live_...
```

### 2. Configure (once)

```typescript
// lib/clowk.ts
import { configure } from '@clowk/nextjs'

configure({
  secretKey: process.env.CLOWK_SECRET_KEY,
  publishableKey: process.env.NEXT_PUBLIC_CLOWK_PUBLISHABLE_KEY,
})
```

### 3. Add middleware (route protection)

```typescript
// middleware.ts
import { clowkMiddleware } from '@clowk/nextjs/middleware'
import { configure } from '@clowk/nextjs'

configure({ secretKey: process.env.CLOWK_SECRET_KEY })

export default clowkMiddleware({
  publicRoutes: ['/', '/sign-in', '/sign-up', '/api/health'],
  signInUrl: '/sign-in',
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

### 4. Add the provider (client-side)

```tsx
// app/layout.tsx
import { ClowkProvider } from '@clowk/nextjs'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ClowkProvider publishableKey={process.env.NEXT_PUBLIC_CLOWK_PUBLISHABLE_KEY}>
          {children}
        </ClowkProvider>
      </body>
    </html>
  )
}
```

### 5. Use in pages

```tsx
// app/page.tsx (Client Component)
'use client'

import { useAuth, SignInButton, SignOutButton } from '@clowk/nextjs'

export default function Home() {
  const { user, signedIn, isLoading } = useAuth()

  if (isLoading) return <p>Loading...</p>

  if (!signedIn) {
    return (
      <div>
        <h1>Welcome</h1>
        <SignInButton>Sign in</SignInButton>
      </div>
    )
  }

  return (
    <div>
      <h1>Hello, {user?.email}</h1>
      <SignOutButton />
    </div>
  )
}
```

## Server-side: `auth()`

Use in Server Components, Route Handlers, and Server Actions.

```typescript
import { auth } from '@clowk/nextjs/server'
```

### Server Component

```tsx
// app/dashboard/page.tsx
import { auth } from '@clowk/nextjs/server'
import { redirect } from 'next/navigation'

export default async function Dashboard() {
  const { user, signedIn } = await auth()

  if (!signedIn) redirect('/sign-in')

  return (
    <div>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.email}</p>
      <p>User ID: {user?.sub}</p>
    </div>
  )
}
```

### Route Handler

```typescript
// app/api/me/route.ts
import { auth } from '@clowk/nextjs/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const { user, signedIn } = await auth()

  if (!signedIn) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json({
    id: user!.sub,
    email: user!.email,
  })
}
```

### Server Action

```typescript
// app/actions.ts
'use server'

import { auth } from '@clowk/nextjs/server'

export async function updateProfile(formData: FormData) {
  const { user, signedIn } = await auth()
  if (!signedIn) throw new Error('Unauthorized')

  const name = formData.get('name') as string
  // update user...
}
```

### `auth()` return type

```typescript
interface AuthResult {
  user: JwtPayload | null   // decoded JWT payload
  token: string | null       // raw JWT string
  signedIn: boolean          // true if user is present
}
```

Token extraction order: Cookie (`clowk_token`) → Authorization header (`Bearer ...`).

## Middleware

The middleware protects routes by verifying the JWT. Unauthenticated requests are redirected to the sign-in page.

```typescript
import { clowkMiddleware } from '@clowk/nextjs/middleware'

export default clowkMiddleware({
  secretKey: 'sk_live_...',                // optional, defaults to config
  publicRoutes: ['/', '/sign-in', '/api/health'],  // routes that don't need auth
  signInUrl: '/sign-in',                   // where to redirect (default: "/sign-in")
})
```

### Public routes

Public routes support exact matches and wildcard prefixes:

```typescript
clowkMiddleware({
  publicRoutes: [
    '/',                    // exact match
    '/sign-in',             // exact match
    '/sign-up',             // exact match
    '/api/health',          // exact match
    '/blog/*',              // wildcard: /blog/anything
    '/docs/*',              // wildcard: /docs/anything
  ],
})
```

Default public routes: `/`, `/sign-in`, `/sign-up`, `/clowk/oauth/callback`, `/clowk/*`.

## OAuth callback page

```tsx
// app/clowk/oauth/callback/page.tsx
'use client'

import { useEffect } from 'react'
import { useAuth } from '@clowk/nextjs'
import { useRouter } from 'next/navigation'

export default function Callback() {
  const { signedIn, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && signedIn) {
      router.push('/dashboard')
    }
  }, [signedIn, isLoading, router])

  return <p>Authenticating...</p>
}
```

## Full example: App Router

```
app/
├── layout.tsx              ← ClowkProvider
├── page.tsx                ← Public home page
├── sign-in/page.tsx        ← Sign-in page with <SignInButton>
├── dashboard/
│   ├── page.tsx            ← Protected (Server Component with auth())
│   └── settings/page.tsx   ← Protected
├── api/
│   └── me/route.ts         ← API route with auth()
├── clowk/
│   └── oauth/callback/
│       └── page.tsx        ← OAuth callback handler
└── middleware.ts            ← Route protection
```

## Exports

The main entry (`@clowk/nextjs`) re-exports from `@clowk/react` and `@clowk/core`:

- `ClowkProvider`, `useAuth`, `useClowk`, `useToken`
- `SignInButton`, `SignUpButton`, `SignOutButton`
- `configure`, `getConfig`, `resetConfig`
- `ClowkClient`, `JwtVerifier`, `SubdomainResolver`, `TokenExtractor`
- All error classes and types
