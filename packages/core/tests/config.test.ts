import { describe, it, expect, beforeEach } from 'vitest'
import { configure, getConfig, resetConfig } from '../src/config'

describe('Configuration', () => {
  beforeEach(() => {
    resetConfig()
  })

  it('has correct defaults', () => {
    const config = getConfig()

    expect(config.appBaseUrl).toBe('https://app.clowk.in')
    expect(config.secretKey).toBeNull()
    expect(config.publishableKey).toBeNull()
    expect(config.subdomainUrl).toBeNull()
    expect(config.afterSignInPath).toBe('/')
    expect(config.afterSignOutPath).toBe('/')
    expect(config.mountPath).toBe('/clowk')
    expect(config.callbackPath).toBe('/clowk/oauth/callback')
    expect(config.cookieKey).toBe('clowk_token')
    expect(config.sessionKey).toBe('clowk')
    expect(config.tokenParam).toBe('token')
    expect(config.issuer).toBe('clowk')
    expect(config.httpOpenTimeout).toBe(5)
    expect(config.httpReadTimeout).toBe(10)
    expect(config.httpWriteTimeout).toBe(10)
    expect(config.httpRetryAttempts).toBe(2)
    expect(config.httpRetryInterval).toBe(0.05)
    expect(config.httpLogger).toBeNull()
  })

  it('configure() overrides specific fields', () => {
    configure({
      secretKey: 'sk_test_123',
      publishableKey: 'pk_test_456',
      httpOpenTimeout: 15,
    })

    const config = getConfig()
    expect(config.secretKey).toBe('sk_test_123')
    expect(config.publishableKey).toBe('pk_test_456')
    expect(config.httpOpenTimeout).toBe(15)
  })

  it('resetConfig() restores defaults', () => {
    configure({ secretKey: 'sk_test_123' })
    expect(getConfig().secretKey).toBe('sk_test_123')

    resetConfig()
    expect(getConfig().secretKey).toBeNull()
  })
})
