---
'@clowk/hono': patch
---

Fix `requireAuth` throwing instead of returning 401 on an unauthenticated request.

It decided whether the inner middleware had already answered by reading
`c.res.headers`. Hono's `c.res` getter throws "Context is not finalized" when no
response exists yet — which is exactly the unauthenticated case the branch was
there to handle, so the 401 path raised a 500 instead.

The short-circuit is now detected from the middleware's return value, which also
fixes a second bug hidden behind the first: a response the inner middleware
produced on its own — an inactive session under `enforceActiveSession` — was
replaced by a generic `Unauthorized` instead of reaching the client.
