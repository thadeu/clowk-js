# @clowk/react

React components and hooks for Clowk authentication. Handles the redirect-based auth flow — no embedded UI, no iframes.

## Install

```bash
npm install @clowk/react
```

## Architecture

Clowk is an authentication **broker**. The React package provides:

1. **`<ClowkProvider>`** — wraps your app, captures the `?token=` callback, manages auth state
2. **Redirect buttons** — `<SignInButton>` and `<SignUpButton>` redirect to your Clowk instance
3. **Hooks** — `useAuth()`, `useGetToken()`, `useClowk()`, `useToken()` for accessing auth state
4. **`<SignOutButton>`** — clears auth state and cookie

```
User clicks <SignInButton>
    ↓
Browser redirects to https://{subdomain}.clowk.dev/sign-in
    ↓
User authenticates (Google, GitHub, email, etc.)
    ↓
Clowk redirects back to your app with ?token=eyJ...
    ↓
<ClowkProvider> exchanges it for an access + refresh pair
    ↓
Access token lives in memory; refresh token persists and survives reloads
```

The access token is short-lived and never written down — it is the credential
every request carries. Only the refresh token is stored, and it rotates: each
use mints a successor and spends the old one, so a stolen token works once and
its reuse burns the session server-side.

## Quick Start

```tsx
import { ClowkProvider, SignInButton, SignOutButton, useAuth } from '@clowk/react'

function App() {
  return (
    <ClowkProvider publishableKey="pk_live_...">
      <AuthContent />
    </ClowkProvider>
  )
}

function AuthContent() {
  const { user, signedIn, isLoading } = useAuth()

  if (isLoading) return <p>Loading...</p>

  if (!signedIn) {
    return (
      <div>
        <h1>Welcome</h1>
        <SignInButton>Sign in with Clowk</SignInButton>
      </div>
    )
  }

  return (
    <div>
      <h1>Hello, {user?.email}</h1>
      <p>User ID: {user?.sub}</p>
      <SignOutButton>Log out</SignOutButton>
    </div>
  )
}
```

## Components

### `<ClowkProvider>`

Wraps your app and manages the authentication state. Must be at the top of your component tree.

```tsx
<ClowkProvider
  publishableKey="pk_live_..."    // identifies your Clowk instance
  secretKey="sk_live_..."          // optional, for client-side JWT verification
  tokenParam="token"               // query param to read (default: "token")
  afterSignOutPath="/"             // redirect after sign out (default: "/")
  storage={customStorage}          // where the refresh token lives (default: localStorage)
  refreshSkew={60}                 // renew this many seconds before expiry
>
  {children}
</ClowkProvider>
```

**What it does on mount:**
1. Checks the URL for `?token=...`
2. If found, strips it from the URL and exchanges it for an access + refresh pair
3. If not, tries to restore the session from the stored refresh token
4. Makes the user available via context

Step 3 is what makes a reload survivable. The access token only ever lives in
memory, so without it every refresh of the page would log the user out.

**Storage.** `storage` takes anything with `get`/`set`/`remove`. It defaults to
`localStorage` in the browser and falls back to memory when there is no
`window`. A native shell can back it with the Keychain; passing
`createMemoryStorage()` opts out of persistence entirely.

### `<SignInButton>`

Redirects to your Clowk instance's sign-in page.

```tsx
// Default text
<SignInButton />

// Custom text
<SignInButton>Log in with SSO</SignInButton>

// Custom redirect URI
<SignInButton redirectUri="https://myapp.com/auth/callback" />

// Override publishable key
<SignInButton publishableKey="pk_live_..." />

// HTML button props are forwarded
<SignInButton className="btn btn-primary" id="login-btn" />
```

The button is `disabled` until the Clowk subdomain URL is resolved.

### `<SignUpButton>`

Same API as `<SignInButton>`, redirects to the sign-up page.

```tsx
<SignUpButton>Create an account</SignUpButton>
<SignUpButton className="btn-secondary" redirectUri="/auth/callback" />
```

### `<SignOutButton>`

Clears auth state and cookie. Only renders when the user is signed in.

```tsx
<SignOutButton />
<SignOutButton>Log out</SignOutButton>
<SignOutButton className="text-red-500" />
```

## Hooks

### `useAuth()`

Returns the current authentication state. Must be used inside `<ClowkProvider>`.

```tsx
import { useAuth } from '@clowk/react'

function Profile() {
  const { user, token, signedIn, isLoading, signOut } = useAuth()

  if (isLoading) return <Spinner />
  if (!signedIn) return <p>Not signed in</p>

  return (
    <div>
      <img src={user?.avatar_url} />
      <h2>{user?.name}</h2>
      <p>{user?.email}</p>
      <button onClick={signOut}>Sign out</button>
    </div>
  )
}
```

**Return type:**

| Property | Type | Description |
|---|---|---|
| `user` | `JwtPayload \| null` | Decoded JWT payload |
| `token` | `string \| null` | Raw JWT string |
| `signedIn` | `boolean` | `true` if user is present |
| `isLoading` | `boolean` | `true` during initial token extraction |
| `signOut` | `() => void` | Clears state and cookie |

### `useClowk()`

Returns a `ClowkClient` instance for API calls. Does not require `<ClowkProvider>`.

```tsx
import { useClowk } from '@clowk/react'

function UserList() {
  const client = useClowk()
  const [users, setUsers] = useState([])

  useEffect(() => {
    client.users.list().then(res => setUsers(res.bodyParsed.data))
  }, [client])

  return <ul>{users.map(u => <li key={u.id}>{u.email}</li>)}</ul>
}
```

Pass options to override config:

```tsx
const client = useClowk({ apiBaseUrl: 'https://custom.api.dev/v1' })
```

### `useGetToken()`

Returns a function that resolves to a currently-valid access token, renewing it
when it is expired or close to expiring. **This is what you want when calling an
API.**

```tsx
import { useGetToken } from '@clowk/react'

function ApiCall() {
  const getToken = useGetToken()

  const fetchData = async () => {
    const res = await fetch('/api/data', {
      headers: { Authorization: `Bearer ${await getToken()}` },
    })
    // ...
  }
}
```

Concurrent calls share one renewal. That matters: refresh tokens rotate, so two
parallel refreshes would spend the same token twice and trip the server's reuse
detection — logging the user out for making two requests at once.

### `useToken()`

Returns the current JWT string, or `null`. This is a **snapshot** — it may
already be expired by the time a request goes out. Use it to read claims or
render state, and prefer `useGetToken()` for anything you are about to send.

```tsx
import { useToken } from '@clowk/react'

function TokenDebug() {
  const token = useToken()

  return <pre>{token ?? 'signed out'}</pre>
}
```

## Protecting routes

Combine `useAuth()` with your router to protect pages:

```tsx
import { useAuth } from '@clowk/react'
import { Navigate } from 'react-router-dom'

function ProtectedRoute({ children }) {
  const { signedIn, isLoading } = useAuth()

  if (isLoading) return <Spinner />
  if (!signedIn) return <Navigate to="/login" />

  return children
}

// Usage
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

## Full example with React Router

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ClowkProvider, SignInButton, SignOutButton, useAuth } from '@clowk/react'

function App() {
  return (
    <BrowserRouter>
      <ClowkProvider publishableKey={import.meta.env.VITE_CLOWK_PK}>
        <Nav />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </ClowkProvider>
    </BrowserRouter>
  )
}

function Nav() {
  const { signedIn } = useAuth()
  return (
    <nav>
      <a href="/">Home</a>
      {signedIn ? <SignOutButton /> : <SignInButton />}
    </nav>
  )
}

function Home() {
  return <h1>Welcome to MyApp</h1>
}

function Dashboard() {
  const { user, signedIn, isLoading } = useAuth()
  if (isLoading) return <p>Loading...</p>
  if (!signedIn) return <p>Please sign in</p>
  return <h1>Dashboard for {user?.email}</h1>
}
```
