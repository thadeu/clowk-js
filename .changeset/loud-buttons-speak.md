---
'@clowk/react': patch
---

`SignInButton` and `SignUpButton` now log an error when the sign-in or sign-up URL cannot be resolved, instead of failing silently and leaving a disabled button with no explanation.
