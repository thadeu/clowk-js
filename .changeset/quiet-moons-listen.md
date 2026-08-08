---
'@clowk/core': minor
---

`subdomainUrl` is now optional when a publishable key is configured.

`ClowkClient` used to build its base URL from `subdomainUrl` alone, and got
`null` without one — so a browser app that shipped only a publishable key could
redirect to sign-in and then had nowhere to send `sessions/exchange` or
`sessions/refresh`. The key already identifies the instance, so it now resolves
the URL through api.clowk.dev when nothing else says where to go, and keeps the
promise so concurrent requests share one lookup instead of racing to make the
same call.

**Behaviour change:** `SubdomainResolver.resolveUrl()` now prefers a configured
`subdomainUrl` over the publishable-key lookup, where before the key always won.
Anyone setting both and expecting the lookup to decide will see the configured
URL used instead — which is the answer they wrote down, and it skips a network
hop on the path that opens the app.
