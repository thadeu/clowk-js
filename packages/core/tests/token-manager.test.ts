import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import nock from 'nock'
import { TokenManager } from '../src/token-manager'
import { createMemoryStorage, REFRESH_TOKEN_KEY } from '../src/token-storage'
import { configure, resetConfig } from '../src/config'
import type { TokenStorage } from '../src/types'

const BASE_URL = 'https://acme.clowk.dev/api/v1'

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: object) =>
    Buffer.from(JSON.stringify(value)).toString('base64url')

  return `${encode({ alg: 'RS256', kid: 'k1' })}.${encode(claims)}.sig`
}

function accessToken(expiresInSeconds = 900): string {
  return jwt({
    sub: 'user_123',
    email: 'user@example.com',
    session_id: 'clk_session_abc',
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  })
}

function build(storage: TokenStorage = createMemoryStorage()) {
  return { manager: new TokenManager({ storage }), storage }
}

describe('TokenManager', () => {
  beforeEach(() => {
    resetConfig()
    configure({ subdomainUrl: 'https://acme.clowk.dev', publishableKey: 'pk_test_1' })
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
    vi.useRealTimers()
  })

  describe('exchange', () => {
    it('trades the sign-in token for a pair and keeps the refresh token', async () => {
      const token = accessToken()
      nock(BASE_URL)
        .post('/sessions/exchange', { token: 'sign_in_jwt' })
        .reply(200, { access_token: token, refresh_token: 'clk_rt_1', expires_in: 900, session_id: 'clk_session_abc' })

      const { manager, storage } = build()

      await expect(manager.exchange('sign_in_jwt')).resolves.toBe(token)
      expect(manager.currentToken).toBe(token)
      expect(storage.get(REFRESH_TOKEN_KEY)).toBe('clk_rt_1')
    })

    it('decodes the claims into a user', async () => {
      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(), refresh_token: 'clk_rt_1' })

      const { manager } = build()
      await manager.exchange('sign_in_jwt')

      expect(manager.currentUser?.email).toBe('user@example.com')
      expect(manager.currentSessionId).toBe('clk_session_abc')
    })

    // The access token is the credential on every request; only the refresh
    // token — which rotation makes single-use — is written down.
    it('never persists the access token', async () => {
      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(), refresh_token: 'clk_rt_1' })

      const { manager, storage } = build()
      await manager.exchange('sign_in_jwt')

      expect(storage.get(REFRESH_TOKEN_KEY)).not.toContain(manager.currentToken)
    })
  })

  describe('restore', () => {
    // Without this a reload is a logout: the in-memory access token is gone and
    // the stored refresh token is the only proof the user is still signed in.
    it('rebuilds the session from the stored refresh token', async () => {
      const token = accessToken()
      const storage = createMemoryStorage()
      storage.set(REFRESH_TOKEN_KEY, 'clk_rt_1')

      nock(BASE_URL)
        .post('/sessions/refresh', { refresh_token: 'clk_rt_1' })
        .reply(200, { access_token: token, refresh_token: 'clk_rt_2' })

      const manager = new TokenManager({ storage })

      await expect(manager.restore()).resolves.toBe(token)
      expect(storage.get(REFRESH_TOKEN_KEY)).toBe('clk_rt_2')
    })

    it('returns null when nothing was stored', async () => {
      const { manager } = build()

      await expect(manager.restore()).resolves.toBeNull()
    })

    it('clears local state when the stored token is rejected', async () => {
      const storage = createMemoryStorage()
      storage.set(REFRESH_TOKEN_KEY, 'clk_rt_stale')

      nock(BASE_URL).post('/sessions/refresh').reply(401, { error: 'Invalid refresh token' })

      const manager = new TokenManager({ storage })

      await expect(manager.restore()).resolves.toBeNull()
      expect(storage.get(REFRESH_TOKEN_KEY)).toBeNull()
      expect(manager.currentToken).toBeNull()
    })
  })

  describe('getToken', () => {
    it('returns the current token while it is still fresh', async () => {
      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(900), refresh_token: 'clk_rt_1' })

      const { manager } = build()
      const token = await manager.exchange('sign_in_jwt')

      await expect(manager.getToken()).resolves.toBe(token)
    })

    // Renewing only after expiry would let a request leave with a token that
    // dies in flight.
    it('renews a token that is inside the skew window', async () => {
      const fresh = accessToken(900)

      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(30), refresh_token: 'clk_rt_1' })
      nock(BASE_URL)
        .post('/sessions/refresh', { refresh_token: 'clk_rt_1' })
        .reply(200, { access_token: fresh, refresh_token: 'clk_rt_2' })

      const manager = new TokenManager({ storage: createMemoryStorage(), refreshSkew: 60 })
      await manager.exchange('sign_in_jwt')

      await expect(manager.getToken()).resolves.toBe(fresh)
    })

    it('renews an already expired token', async () => {
      const fresh = accessToken(900)

      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(-10), refresh_token: 'clk_rt_1' })
      nock(BASE_URL).post('/sessions/refresh').reply(200, { access_token: fresh, refresh_token: 'clk_rt_2' })

      const { manager } = build()
      await manager.exchange('sign_in_jwt')

      await expect(manager.getToken()).resolves.toBe(fresh)
    })

    // With rotation, two parallel refreshes would spend the same token twice
    // and trip the server's reuse detection — logging the user out for making
    // two requests at once.
    it('coalesces concurrent renewals into one request', async () => {
      const fresh = accessToken(900)

      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(-10), refresh_token: 'clk_rt_1' })

      const refresh = nock(BASE_URL)
        .post('/sessions/refresh')
        .once()
        .reply(200, { access_token: fresh, refresh_token: 'clk_rt_2' })

      const { manager } = build()
      await manager.exchange('sign_in_jwt')

      const results = await Promise.all([manager.getToken(), manager.getToken(), manager.getToken()])

      expect(results).toEqual([fresh, fresh, fresh])
      expect(refresh.isDone()).toBe(true)
      expect(nock.pendingMocks()).toHaveLength(0)
    })

    it('allows a fresh renewal after the in-flight one settles', async () => {
      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(-10), refresh_token: 'clk_rt_1' })
      nock(BASE_URL)
        .post('/sessions/refresh')
        .reply(200, { access_token: accessToken(-10), refresh_token: 'clk_rt_2' })
      nock(BASE_URL)
        .post('/sessions/refresh')
        .reply(200, { access_token: accessToken(900), refresh_token: 'clk_rt_3' })

      const { manager, storage } = build()
      await manager.exchange('sign_in_jwt')

      await manager.getToken()
      await manager.getToken()

      expect(storage.get(REFRESH_TOKEN_KEY)).toBe('clk_rt_3')
    })

    it('returns null when there is nothing to renew with', async () => {
      const { manager } = build()

      await expect(manager.getToken()).resolves.toBeNull()
    })
  })

  describe('signOut', () => {
    it('revokes server-side and clears storage', async () => {
      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(), refresh_token: 'clk_rt_1' })

      const revoke = nock(BASE_URL).post('/sessions/revoke', { refresh_token: 'clk_rt_1' }).reply(204)

      const { manager, storage } = build()
      await manager.exchange('sign_in_jwt')
      await manager.signOut()

      expect(revoke.isDone()).toBe(true)
      expect(storage.get(REFRESH_TOKEN_KEY)).toBeNull()
      expect(manager.currentToken).toBeNull()
    })

    // A failed revoke must not leave the user staring at a signed-in UI.
    it('clears local state even when revoking fails', async () => {
      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(), refresh_token: 'clk_rt_1' })
      nock(BASE_URL).post('/sessions/revoke').reply(500)

      const { manager, storage } = build()
      await manager.exchange('sign_in_jwt')
      await manager.signOut()

      expect(storage.get(REFRESH_TOKEN_KEY)).toBeNull()
      expect(manager.currentToken).toBeNull()
    })
  })

  describe('onChange', () => {
    it('reports the new state after a successful exchange', async () => {
      nock(BASE_URL)
        .post('/sessions/exchange')
        .reply(200, { access_token: accessToken(), refresh_token: 'clk_rt_1' })

      const onChange = vi.fn()
      const manager = new TokenManager({ storage: createMemoryStorage(), onChange })

      await manager.exchange('sign_in_jwt')

      expect(onChange).toHaveBeenCalledWith(
        expect.objectContaining({ sessionId: 'clk_session_abc' }),
      )
    })

    it('reports the cleared state on sign out', async () => {
      const onChange = vi.fn()
      const manager = new TokenManager({ storage: createMemoryStorage(), onChange })

      manager.clear()

      expect(onChange).toHaveBeenCalledWith({ token: null, user: null, sessionId: null })
    })
  })
})
