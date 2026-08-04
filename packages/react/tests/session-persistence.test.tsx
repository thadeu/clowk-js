import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { type ReactNode } from 'react'
import { configure, resetConfig, createMemoryStorage, REFRESH_TOKEN_KEY } from '@clowk/core'
import type { TokenStorage } from '@clowk/core'
import { ClowkProvider } from '../src/provider'
import { useAuth } from '../src/hooks/use-auth'
import { useGetToken } from '../src/hooks/use-get-token'

function jwt(claims: Record<string, unknown>): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')

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

interface Call {
  path: string
  body: Record<string, unknown>
}

/**
 * Stubs `fetch` rather than using nock: nock patches node's http module, which
 * the client never touches in a jsdom environment, so every request would fail
 * and tests asserting failure would pass for the wrong reason.
 */
function stubFetch(responses: Array<{ status: number; body: unknown }>) {
  const calls: Call[] = []
  let index = 0

  const fetchMock = vi.fn(async (url: string | URL, init?: RequestInit) => {
    const path = new URL(url.toString()).pathname
    calls.push({ path, body: init?.body ? JSON.parse(init.body as string) : {} })

    const next = responses[index++] ?? { status: 500, body: { error: 'no stub left' } }

    return new Response(JSON.stringify(next.body), {
      status: next.status,
      headers: { 'Content-Type': 'application/json' },
    })
  })

  vi.stubGlobal('fetch', fetchMock)

  return { calls, fetchMock }
}

function wrapperWith(storage: TokenStorage) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <ClowkProvider storage={storage}>{children}</ClowkProvider>
  }
}

describe('session persistence', () => {
  beforeEach(() => {
    resetConfig()
    configure({ subdomainUrl: 'https://acme.clowk.dev', publishableKey: 'pk_test_1' })
    window.history.replaceState({}, '', '/')
  })

  afterEach(() => vi.unstubAllGlobals())

  it('exchanges the token from the sign-in redirect', async () => {
    window.history.replaceState({}, '', '/?token=sign_in_jwt')

    const { calls } = stubFetch([
      { status: 200, body: { access_token: accessToken(), refresh_token: 'clk_rt_1', session_id: 'clk_session_abc' } },
    ])

    const storage = createMemoryStorage()
    const { result } = renderHook(() => useAuth(), { wrapper: wrapperWith(storage) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(calls[0]).toMatchObject({ path: '/api/v1/sessions/exchange', body: { token: 'sign_in_jwt' } })
    expect(result.current.signedIn).toBe(true)
    expect(result.current.user?.email).toBe('user@example.com')
    expect(storage.get(REFRESH_TOKEN_KEY)).toBe('clk_rt_1')
  })

  // The token must not survive in the URL: it would stay in history and in any
  // proxy log that saw the request.
  it('strips the token from the URL', async () => {
    window.history.replaceState({}, '', '/dashboard?token=sign_in_jwt&keep=1')

    stubFetch([{ status: 200, body: { access_token: accessToken(), refresh_token: 'clk_rt_1' } }])

    const { result } = renderHook(() => useAuth(), { wrapper: wrapperWith(createMemoryStorage()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(window.location.search).toBe('?keep=1')
  })

  // The whole point of the change: before this, a reload dropped the in-memory
  // token and silently logged the user out.
  it('restores the session on reload from the stored refresh token', async () => {
    const storage = createMemoryStorage()
    storage.set(REFRESH_TOKEN_KEY, 'clk_rt_1')

    const { calls } = stubFetch([
      { status: 200, body: { access_token: accessToken(), refresh_token: 'clk_rt_2' } },
    ])

    const { result } = renderHook(() => useAuth(), { wrapper: wrapperWith(storage) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(calls[0]).toMatchObject({ path: '/api/v1/sessions/refresh', body: { refresh_token: 'clk_rt_1' } })
    expect(result.current.signedIn).toBe(true)
    expect(storage.get(REFRESH_TOKEN_KEY)).toBe('clk_rt_2')
  })

  it('finishes loading as signed out when there is nothing stored', async () => {
    const { fetchMock } = stubFetch([])

    const { result } = renderHook(() => useAuth(), { wrapper: wrapperWith(createMemoryStorage()) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.signedIn).toBe(false)
    expect(result.current.token).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('gives up cleanly when the stored refresh token is rejected', async () => {
    const storage = createMemoryStorage()
    storage.set(REFRESH_TOKEN_KEY, 'clk_rt_stale')

    stubFetch([{ status: 401, body: { error: 'Invalid refresh token' } }])

    const { result } = renderHook(() => useAuth(), { wrapper: wrapperWith(storage) })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.signedIn).toBe(false)
    expect(storage.get(REFRESH_TOKEN_KEY)).toBeNull()
  })

  describe('useGetToken', () => {
    it('hands back a valid token without a second network call', async () => {
      const storage = createMemoryStorage()
      storage.set(REFRESH_TOKEN_KEY, 'clk_rt_1')

      const token = accessToken(900)
      const { fetchMock } = stubFetch([
        { status: 200, body: { access_token: token, refresh_token: 'clk_rt_2' } },
      ])

      const { result } = renderHook(
        () => ({ auth: useAuth(), getToken: useGetToken() }),
        { wrapper: wrapperWith(storage) },
      )

      await waitFor(() => expect(result.current.auth.isLoading).toBe(false))
      expect(fetchMock).toHaveBeenCalledTimes(1)

      await expect(result.current.getToken()).resolves.toBe(token)
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('renews an expired token before handing it back', async () => {
      const storage = createMemoryStorage()
      storage.set(REFRESH_TOKEN_KEY, 'clk_rt_1')

      const fresh = accessToken(900)
      stubFetch([
        { status: 200, body: { access_token: accessToken(-10), refresh_token: 'clk_rt_2' } },
        { status: 200, body: { access_token: fresh, refresh_token: 'clk_rt_3' } },
      ])

      const { result } = renderHook(
        () => ({ auth: useAuth(), getToken: useGetToken() }),
        { wrapper: wrapperWith(storage) },
      )

      await waitFor(() => expect(result.current.auth.isLoading).toBe(false))

      await expect(result.current.getToken()).resolves.toBe(fresh)
      expect(storage.get(REFRESH_TOKEN_KEY)).toBe('clk_rt_3')
    })

    it('throws outside a provider', () => {
      expect(() => renderHook(() => useGetToken())).toThrow(
        'useGetToken must be used within a <ClowkProvider>',
      )
    })
  })
})
