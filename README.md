# Clowk

Monorepo of JavaScript/TypeScript SDKs for [Clowk](https://clowk.in) **authentication broker**.

## Broker, not a provider

Clowk is an **authentication broker**, not an authentication UI provider.

Most auth solutions (Clerk, Auth0) own the sign-in UI — they render forms, inputs, and social buttons inside your app. That means your users interact with someone else's frontend, embedded in yours.

Clowk takes a different approach. It **brokers the authentication** between your app and OAuth providers (Google, GitHub, Twitter) through a redirect flow:

```
Your App → Clowk (handles OAuth) → Your App (receives signed JWT)
```

**Why this matters:**

- **No embedded UI to maintain** — Clowk handles the entire auth flow on its own domain (`*.clowk.dev`). Your app just redirects and receives a JWT back.
- **OAuth requires redirects anyway** — Google, GitHub, and Twitter will redirect the user regardless. Embedding a UI doesn't eliminate the redirect, it just adds an intermediary.
- **Security by isolation** — credentials and OAuth tokens never touch your app's DOM. The auth flow happens entirely on the Clowk domain.
- **Zero frontend lock-in** — no Clerk Elements, no Auth0 Lock, no custom widgets to style or break on upgrades. Your app controls its own buttons and pages.

The SDKs in this repo provide the redirect triggers (`<SignInButton>`, `<SignUpButton>`), token verification, and middleware — everything you need to complete the broker flow.

## Packages

### `@clowk/sdk`

User-facing convenience package. Re-exports everything from `@clowk/core` under a clean import path.

```bash
npm install @clowk/sdk
```

### `@clowk/core`

The foundation package. Runtime-agnostic — works in Node.js, Bun, Deno, Cloudflare Workers, and browsers.

**What it does:**
- Configuration singleton with sensible defaults
- Error hierarchy (`ClowkError`, `ConfigurationError`, `InvalidStateError`, `InvalidTokenError`)
- HTTP client built on native `fetch` with middleware stack (timeout, retry, logger)
- Response body size limit (1 MB)
- SDK Client with resource-oriented API: `users`, `sessions`, `subdomains`, `tokens`
- JWT verification (HS256 via [jose](https://github.com/panva/jose)) with issuer validation and expiration check
- Subdomain resolver with 60s in-memory cache
- Token extraction (params, bearer header, cookie)

### `@clowk/react`

React components and hooks for the broker redirect flow.

**Components:**
- `<ClowkProvider>` — context provider that captures the `?token=` callback and manages auth state
- `<SignInButton>` — redirects to the Clowk instance sign-in page
- `<SignUpButton>` — redirects to the Clowk instance sign-up page
- `<SignOutButton>` — clears auth state and cookie

**Hooks:**
- `useAuth()` — returns `{ user, token, signedIn, isLoading, signOut }`
- `useClowk()` — returns a `ClowkClient` instance
- `useToken()` — returns the raw JWT string

These components trigger redirects — they don't render auth UI. Your Clowk instance handles the sign-in page.

### `@clowk/express`

Express middleware that extracts and verifies the JWT from the request (query param, cookie, or `Authorization` header) and attaches the decoded user to `req.auth`.

### `@clowk/hono`

Hono middleware. Same behavior as Express, adapted for Hono's API (`c.get('auth')`). Works on Cloudflare Workers, Bun, Deno, and Node.js.

### `@clowk/nextjs`

Next.js integration:
- Server-side middleware for route protection
- `auth()` helper for Server Components and Route Handlers
- Re-exports React components for client-side use

## Architecture

```
@clowk/core            ← JWT verification, HTTP client, SDK resources
   ├── @clowk/sdk       ← Re-export for direct consumption
   ├── @clowk/react     ← Redirect buttons, auth provider, hooks
   ├── @clowk/express   ← Express middleware
   ├── @clowk/hono      ← Hono middleware
   └── @clowk/nextjs    ← Next.js middleware + auth() + React re-exports
```

All packages depend on `@clowk/core` for token verification. Framework packages are thin wrappers that adapt core to each framework's conventions.

## Auth Flow

```
1. User clicks <SignInButton> in your app
2. Browser redirects to https://{subdomain}.clowk.dev/sign-in
3. User authenticates (OAuth or email/password)
4. Clowk redirects back to your app with ?token=eyJ...
5. <ClowkProvider> captures the token, verifies it, provides user via context
```

No embedded forms. No iframes. No third-party UI in your DOM.

## Quick Start

```tsx
// App.tsx
import { ClowkProvider, SignInButton, useAuth } from '@clowk/react'

function App() {
  return (
    <ClowkProvider publishableKey="pk_live_...">
      <AuthContent />
    </ClowkProvider>
  )
}

function AuthContent() {
  const { user, signedIn, isLoading } = useAuth()

  if (isLoading) return <div>Loading...</div>
  if (!signedIn) return <SignInButton />

  return <div>Welcome, {user?.email}</div>
}
```

## Configuration

Every package needs at minimum:

| Key | Where | Description |
|-----|-------|-------------|
| `publishableKey` | Frontend (`pk_...`) | Identifies the Clowk instance, safe to expose |
| `secretKey` | Backend only (`sk_...`) | Used to verify JWT signatures, never expose to the client |

## Monorepo Structure

```
clowk-js/
├── packages/
│   ├── core/       ← Foundation (config, HTTP, SDK, JWT, resolver)
│   ├── sdk/        ← User-facing re-export
│   ├── react/      ← Provider, hooks, redirect buttons
│   ├── express/    ← Express middleware
│   ├── hono/       ← Hono middleware
│   └── nextjs/     ← Next.js integration
├── package.json
├── turbo.json
├── tsconfig.base.json
└── CLOWK.md        ← SDK architecture specification
```

## SDK Architecture Specification

See [CLOWK.md](CLOWK.md) for the complete architecture reference.
It defines every layer, interface, naming convention, and testing requirement that all Clowk SDKs must follow.
The Ruby SDK (`clowk-ruby`) is the reference implementation.
