# @clowk/react

## 1.1.1

### Patch Changes

- 45791c3: No functional changes. This release exists to verify publishing under the
  `@clowk` organization's new ownership, after the npm credentials moved from the
  `clowk-in` account to `thadeu`.

  Every package is included deliberately: the point is to confirm the new token
  has publish rights across the whole scope, which a single-package release would
  not establish.

- Updated dependencies [45791c3]
  - @clowk/core@1.1.1

## 1.1.0

### Minor Changes

- 2827e8a: Sessions now survive a page reload, and access tokens renew themselves.

  The provider kept the token in `useState` and nothing else, so every reload
  dropped it and silently signed the user out — fatal in an installed PWA, where
  the system discards the webview routinely. There was no refresh logic anywhere,
  and `useSession`/`onSessionExpired` needed a `secretKey` to work at all, which
  in a browser means publishing your secret in the bundle.

  `TokenManager` (core) holds the access token in memory and the refresh token in
  pluggable storage. On mount the provider either exchanges the `?token=` from the
  sign-in redirect via `POST /sessions/exchange`, or rebuilds the session from the
  stored refresh token. The sign-in token is traded rather than kept, so the
  durable credential never travels in a query string where it would land in
  history and proxy logs.

  `useGetToken()` returns a currently-valid token, renewing before expiry rather
  than after — a request should never leave with a token that dies in flight.
  Concurrent calls share one renewal: refresh tokens rotate, so two parallel
  refreshes would spend the same token twice and trip the server's reuse
  detection, logging the user out for making two requests at once.

  Added:

  - `TokenManager`, `decodeClaims` (`@clowk/core`)
  - `SessionTokenResource` and `client.sessionTokens` — `exchange`, `refresh`, `revoke`, all authenticated with the publishable key since a browser cannot hold a secret key
  - `createLocalStorage`, `createMemoryStorage`, `defaultStorage`, `REFRESH_TOKEN_KEY` (`@clowk/core`)
  - `TokenPair`, `TokenStorage` types
  - `useGetToken()` and `ClowkAuthState.getToken` (`@clowk/react`)
  - `storage` and `refreshSkew` props on `ClowkProvider`

  `signOut()` now revokes server-side before clearing local state; clearing alone
  left a live refresh token behind. `useToken()` still returns a snapshot — prefer
  `useGetToken()` for anything about to be sent.

  Requires a Clowk server exposing `/api/v1/sessions/{exchange,refresh,revoke}`.

### Patch Changes

- Updated dependencies [2827e8a]
  - @clowk/core@1.1.0

## 1.0.0

### Major Changes

- v0.1.0

### Patch Changes

- Updated dependencies
  - @clowk/core@1.0.0
