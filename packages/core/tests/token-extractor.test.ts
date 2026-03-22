import { describe, it, expect, beforeEach } from 'vitest'
import { TokenExtractor } from '../src/token-extractor'
import { resetConfig } from '../src/config'

describe('TokenExtractor', () => {
  beforeEach(() => {
    resetConfig()
  })

  it('extracts from query params', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      params: { token: 'jwt_from_params' },
    })

    expect(token).toBe('jwt_from_params')
  })

  it('extracts from Authorization Bearer header', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      headers: { authorization: 'Bearer jwt_from_bearer' },
    })

    expect(token).toBe('jwt_from_bearer')
  })

  it('extracts from cookies', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      cookies: { clowk_token: 'jwt_from_cookie' },
    })

    expect(token).toBe('jwt_from_cookie')
  })

  it('params takes priority over bearer', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      params: { token: 'from_params' },
      headers: { authorization: 'Bearer from_bearer' },
      cookies: { clowk_token: 'from_cookie' },
    })

    expect(token).toBe('from_params')
  })

  it('bearer takes priority over cookies', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      headers: { authorization: 'Bearer from_bearer' },
      cookies: { clowk_token: 'from_cookie' },
    })

    expect(token).toBe('from_bearer')
  })

  it('returns null when no token found', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      params: {},
      headers: {},
      cookies: {},
    })

    expect(token).toBeNull()
  })

  it('ignores non-Bearer authorization schemes', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      headers: { authorization: 'Basic dXNlcjpwYXNz' },
    })

    expect(token).toBeNull()
  })

  it('handles case-insensitive Bearer scheme', () => {
    const extractor = new TokenExtractor()
    const token = extractor.extract({
      headers: { authorization: 'bearer jwt_token' },
    })

    expect(token).toBe('jwt_token')
  })

  it('works with Headers-like object (get method)', () => {
    const extractor = new TokenExtractor()
    const headers = {
      get(name: string): string | null {
        if (name.toLowerCase() === 'authorization') return 'Bearer jwt_from_get'
        return null
      },
    }

    const token = extractor.extract({ headers })

    expect(token).toBe('jwt_from_get')
  })

  it('uses custom tokenParam and cookieKey', () => {
    const extractor = new TokenExtractor({
      tokenParam: 'auth_token',
      cookieKey: 'my_cookie',
    })

    const token = extractor.extract({
      params: { auth_token: 'custom_param_token' },
    })

    expect(token).toBe('custom_param_token')

    const token2 = extractor.extract({
      cookies: { my_cookie: 'custom_cookie_token' },
    })

    expect(token2).toBe('custom_cookie_token')
  })
})
