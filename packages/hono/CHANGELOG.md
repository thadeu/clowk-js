# @clowk/hono

## 1.0.5

### Patch Changes

- Updated dependencies [a12ba6a]
  - @clowk/core@1.2.0

## 1.0.4

### Patch Changes

- 45791c3: No functional changes. This release exists to verify publishing under the
  `@clowk` organization's new ownership, after the npm credentials moved from the
  `clowk-in` account to `thadeu`.

  Every package is included deliberately: the point is to confirm the new token
  has publish rights across the whole scope, which a single-package release would
  not establish.

- Updated dependencies [45791c3]
  - @clowk/core@1.1.1

## 1.0.3

### Patch Changes

- af99e0c: Fix `requireAuth` throwing instead of returning 401 on an unauthenticated request.

  It decided whether the inner middleware had already answered by reading
  `c.res.headers`. Hono's `c.res` getter throws "Context is not finalized" when no
  response exists yet — which is exactly the unauthenticated case the branch was
  there to handle, so the 401 path raised a 500 instead.

  The short-circuit is now detected from the middleware's return value, which also
  fixes a second bug hidden behind the first: a response the inner middleware
  produced on its own — an inactive session under `enforceActiveSession` — was
  replaced by a generic `Unauthorized` instead of reaching the client.

- Updated dependencies [2827e8a]
  - @clowk/core@1.1.0

## 1.0.0

### Major Changes

- v0.1.0

### Patch Changes

- Updated dependencies
  - @clowk/core@1.0.0
