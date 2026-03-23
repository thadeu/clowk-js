# Publishing to npm

## Prerequisites

1. **npm account** with access to the `@clowk` organization on [npmjs.com](https://www.npmjs.com)
2. **Granular Access Token** with publish permissions

## Creating an Access Token

1. Go to **npmjs.com → Access Tokens → Generate New Token**
2. Select **Granular Access Token**
3. Configure:
   - **Packages and scopes**: select `@clowk`
   - **Permissions**: Read and write
   - **2FA**: Bypass 2FA for automation
4. Copy the generated token (`npm_XXXXX`)

## Configuring the Token

### Local (for manual publishing)

```bash
npm config set //registry.npmjs.org/:_authToken=npm_XXXXX
```

### CI/CD (via environment variable)

Add to your `.npmrc` at the project root:

```
//registry.npmjs.org/:_authToken=${NPM_TOKEN}
```

Then set the environment variable:

```bash
export NPM_TOKEN=npm_XXXXX
```

> **Warning**: Never commit tokens to git. The `.npmrc` with `${NPM_TOKEN}` is safe to commit — it only references the variable, not the value.

## Publishing

### Build first

```bash
pnpm build
```

### All packages at once

```bash
pnpm -r publish
```

pnpm resolves the topological order automatically: `core` → `sdk`, `react`, `express`, `hono` → `nextjs`.

### Single package

```bash
cd packages/core && pnpm publish
```

### With Changesets (recommended)

```bash
# 1. Describe what changed
pnpm changeset

# 2. Apply version bumps and generate changelogs
pnpm changeset version

# 3. Publish only changed packages
pnpm changeset publish
```

## Publish Order

Dependencies must be published before dependents:

```
1. @clowk/core        (no deps)
2. @clowk/sdk         (depends on core)
   @clowk/react       (depends on core)
   @clowk/express     (depends on core)
   @clowk/hono        (depends on core)
3. @clowk/nextjs      (depends on core + react)
```

`pnpm -r publish` and `changeset publish` handle this automatically.

## Troubleshooting

### E403 — Two-factor authentication required

```
E403 403 Forbidden - Two-factor authentication or granular access token
with bypass 2fa enabled is required to publish packages.
```

**Fix**: Create a Granular Access Token with "Bypass 2FA for automation" enabled (see above).

### E403 — Not authorized

```
E403 You do not have permission to publish
```

**Fix**: Ensure your npm account is a member of the `@clowk` organization with publish permissions.

### E402 — Payment required

```
E402 You must sign up for private packages
```

**Fix**: All `package.json` files include `"publishConfig": { "access": "public" }`. If you still see this, pass `--access public`:

```bash
pnpm -r publish --access public
```
