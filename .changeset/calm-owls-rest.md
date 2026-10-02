---
'@clowk/core': patch
---

`SessionStatus` now includes `'maintenance'`. Clowk reports it from `tokens/verify` while an instance is in maintenance mode, and the session is not active until the mode is turned off.
