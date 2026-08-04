import { describe, it, expect, beforeEach, vi } from 'vitest'
import { SignJWT } from 'jose'
import { Hono } from 'hono'
import { configure, resetConfig } from '@clowk/core'
import { clowkMiddleware, requireAuth } from '../src/middleware'

const SECRET_KEY = 'test-secret-key-for-hono'

async function createToken(
  payload: Record<string, unknown>,
  options?: { issuer?: string; expiresIn?: string },
): Promise<string> {
  const key = new TextEncoder().encode(SECRET_KEY)
  let builder = new SignJWT(payload).setProtectedHeader({ alg: 'HS256' })
  if (options?.issuer) builder = builder.setIssuer(options.issuer)
  if (options?.expiresIn) builder = builder.setExpirationTime(options.expiresIn)
  return builder.sign(key)
}

describe('@clowk/hono middleware', () => {
  beforeEach(() => {
    resetConfig()
    configure({ secretKey: SECRET_KEY })
  })

  describe('clowkMiddleware', () => {
    it('sets auth to null when no token', async () => {
      const app = new Hono()
      app.use('*', clowkMiddleware())
      app.get('/test', (c) => {
        return c.json({ auth: c.get('auth') })
      })

      const res = await app.request('/test')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.auth).toBeNull()
    })

    it('extracts and verifies token from query params', async () => {
      const token = await createToken(
        { sub: 'user_123' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const app = new Hono()
      app.use('*', clowkMiddleware())
      app.get('/test', (c) => {
        return c.json({ auth: c.get('auth') })
      })

      const res = await app.request(`/test?token=${token}`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.auth.sub).toBe('user_123')
    })

    it('extracts token from Authorization Bearer header', async () => {
      const token = await createToken(
        { sub: 'user_456' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const app = new Hono()
      app.use('*', clowkMiddleware())
      app.get('/test', (c) => {
        return c.json({ auth: c.get('auth') })
      })

      const res = await app.request('/test', {
        headers: { Authorization: `Bearer ${token}` },
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.auth.sub).toBe('user_456')
    })

    it('extracts token from cookies', async () => {
      const token = await createToken(
        { sub: 'user_789' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const app = new Hono()
      app.use('*', clowkMiddleware())
      app.get('/test', (c) => {
        return c.json({ auth: c.get('auth') })
      })

      const res = await app.request('/test', {
        headers: { Cookie: `clowk_token=${token}` },
      })
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.auth.sub).toBe('user_789')
    })

    it('sets auth to null on invalid token', async () => {
      const app = new Hono()
      app.use('*', clowkMiddleware())
      app.get('/test', (c) => {
        return c.json({ auth: c.get('auth') })
      })

      const res = await app.request('/test?token=invalid.jwt.token')
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.auth).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('returns 401 when no token', async () => {
      const app = new Hono()
      app.use('*', requireAuth())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test')
      const body = await res.json()

      expect(res.status).toBe(401)
      expect(body.error).toBe('Unauthorized')
    })

    it('passes through when token is valid', async () => {
      const token = await createToken(
        { sub: 'user_123' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const app = new Hono()
      app.use('*', requireAuth())
      app.get('/test', (c) => {
        return c.json({ auth: c.get('auth') })
      })

      const res = await app.request(`/test?token=${token}`)
      const body = await res.json()

      expect(res.status).toBe(200)
      expect(body.auth.sub).toBe('user_123')
    })

    it('returns 401 when the token is invalid', async () => {
      const app = new Hono()
      app.use('*', requireAuth())
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request('/test?token=not.a.jwt')

      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe('Unauthorized')
    })

    it('does not run the handler when unauthenticated', async () => {
      let handlerRan = false

      const app = new Hono()
      app.use('*', requireAuth())
      app.get('/test', (c) => {
        handlerRan = true

        return c.json({ ok: true })
      })

      await app.request('/test')

      expect(handlerRan).toBe(false)
    })

    // The inner middleware can answer on its own — an inactive session is the
    // case that exists today. That response has to reach the client instead of
    // being replaced by a generic 401.
    it('propagates a short-circuit response from the inner middleware', async () => {
      const token = await createToken(
        { sub: 'user_123', session_id: 'clk_session_abc' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      vi.stubGlobal(
        'fetch',
        vi.fn(async () =>
          new Response(JSON.stringify({ session: { status: 'revoked' } }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          }),
        ),
      )

      configure({ subdomainUrl: 'https://acme.clowk.dev' })

      const app = new Hono()
      app.use('*', requireAuth({ secretKey: SECRET_KEY, enforceActiveSession: true }))
      app.get('/test', (c) => c.json({ ok: true }))

      const res = await app.request(`/test?token=${token}`)

      expect(res.status).toBe(401)
      expect((await res.json()).error).toBe('Session expired or inactive')

      vi.unstubAllGlobals()
    })
  })
})
