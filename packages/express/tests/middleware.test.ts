import { describe, it, expect, beforeEach } from 'vitest'
import { SignJWT } from 'jose'
import { configure, resetConfig } from '@clowk/core'
import { clowkMiddleware, requireAuth } from '../src/middleware'

const SECRET_KEY = 'test-secret-key-for-express'

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

function createMockReq(overrides: Record<string, unknown> = {}) {
  return {
    query: {},
    headers: {},
    cookies: {},
    auth: undefined as unknown,
    ...overrides,
  } as any
}

function createMockRes() {
  let statusCode = 200
  let jsonBody: unknown = null

  return {
    status(code: number) {
      statusCode = code
      return this
    },
    json(body: unknown) {
      jsonBody = body
      return this
    },
    get statusCode() {
      return statusCode
    },
    get jsonBody() {
      return jsonBody
    },
  } as any
}

describe('@clowk/express middleware', () => {
  beforeEach(() => {
    resetConfig()
    configure({ secretKey: SECRET_KEY })
  })

  describe('clowkMiddleware', () => {
    it('sets req.auth to null when no token', async () => {
      const middleware = clowkMiddleware()
      const req = createMockReq()
      const res = createMockRes()
      let nextCalled = false

      await middleware(req, res, () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
      expect(req.auth).toBeNull()
    })

    it('extracts token from query params and verifies', async () => {
      const token = await createToken(
        { sub: 'user_123' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const middleware = clowkMiddleware()
      const req = createMockReq({ query: { token } })
      const res = createMockRes()
      let nextCalled = false

      await middleware(req, res, () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
      expect(req.auth).toBeDefined()
      expect(req.auth.sub).toBe('user_123')
    })

    it('extracts token from Authorization Bearer header', async () => {
      const token = await createToken(
        { sub: 'user_456' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const middleware = clowkMiddleware()
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` },
      })
      const res = createMockRes()
      let nextCalled = false

      await middleware(req, res, () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
      expect(req.auth.sub).toBe('user_456')
    })

    it('extracts token from cookies', async () => {
      const token = await createToken(
        { sub: 'user_789' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const middleware = clowkMiddleware()
      const req = createMockReq({
        cookies: { clowk_token: token },
      })
      const res = createMockRes()
      let nextCalled = false

      await middleware(req, res, () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
      expect(req.auth.sub).toBe('user_789')
    })

    it('sets req.auth to null on invalid token', async () => {
      const middleware = clowkMiddleware()
      const req = createMockReq({
        query: { token: 'invalid.jwt.token' },
      })
      const res = createMockRes()
      let nextCalled = false

      await middleware(req, res, () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
      expect(req.auth).toBeNull()
    })
  })

  describe('requireAuth', () => {
    it('returns 401 when no token', async () => {
      const middleware = requireAuth()
      const req = createMockReq()
      const res = createMockRes()
      let nextCalled = false

      await middleware(req, res, () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(false)
      expect(res.statusCode).toBe(401)
      expect(res.jsonBody).toEqual({ error: 'Unauthorized' })
    })

    it('calls next when token is valid', async () => {
      const token = await createToken(
        { sub: 'user_123' },
        { issuer: 'clowk', expiresIn: '1h' },
      )

      const middleware = requireAuth()
      const req = createMockReq({ query: { token } })
      const res = createMockRes()
      let nextCalled = false

      await middleware(req, res, () => {
        nextCalled = true
      })

      expect(nextCalled).toBe(true)
      expect(req.auth.sub).toBe('user_123')
    })
  })
})
