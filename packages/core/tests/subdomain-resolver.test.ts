import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { SubdomainResolver } from '../src/subdomain-resolver'
import { ConfigurationError } from '../src/errors'
import { configure, resetConfig } from '../src/config'

const BASE_URL = 'https://api.clowk.dev/client/v1'

describe('SubdomainResolver', () => {
  beforeEach(() => {
    resetConfig()
    SubdomainResolver.clearCache()
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('resolves from publishableKey via API', async () => {
    nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        instance: { url: 'https://myapp.clowk.dev' },
      })

    const resolver = new SubdomainResolver({ publishableKey: 'pk_test_123' })
    const url = await resolver.resolveUrl()

    expect(url).toBe('https://myapp.clowk.dev')
  })

  it('falls back to subdomainUrl', async () => {
    const resolver = new SubdomainResolver({
      subdomainUrl: 'https://direct.clowk.dev/',
    })
    const url = await resolver.resolveUrl()

    expect(url).toBe('https://direct.clowk.dev')
  })

  it('throws ConfigurationError when both are missing', async () => {
    const resolver = new SubdomainResolver()

    await expect(resolver.resolveUrl()).rejects.toThrow(ConfigurationError)
    await expect(resolver.resolveUrl()).rejects.toThrow(
      'set publishableKey or subdomainUrl',
    )
  })

  it('caches resolved URL', async () => {
    const scope = nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        instance: { url: 'https://myapp.clowk.dev' },
      })

    const resolver = new SubdomainResolver({ publishableKey: 'pk_test_123' })

    const url1 = await resolver.resolveUrl()
    const url2 = await resolver.resolveUrl()

    expect(url1).toBe('https://myapp.clowk.dev')
    expect(url2).toBe('https://myapp.clowk.dev')
    // nock only set up 1 reply, so second call used cache
    expect(scope.isDone()).toBe(true)
  })

  it('extracts URL from instance.subdomain_url', async () => {
    nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        instance: { subdomain_url: 'https://sub.clowk.dev' },
      })

    const resolver = new SubdomainResolver({ publishableKey: 'pk_test_123' })
    const url = await resolver.resolveUrl()

    expect(url).toBe('https://sub.clowk.dev')
  })

  it('extracts URL from instance.host (prepends https://)', async () => {
    nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        instance: { host: 'myapp.clowk.dev' },
      })

    const resolver = new SubdomainResolver({ publishableKey: 'pk_test_123' })
    const url = await resolver.resolveUrl()

    expect(url).toBe('https://myapp.clowk.dev')
  })

  it('extracts URL from instance.subdomain (builds .clowk.dev)', async () => {
    nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        instance: { subdomain: 'myapp' },
      })

    const resolver = new SubdomainResolver({ publishableKey: 'pk_test_123' })
    const url = await resolver.resolveUrl()

    expect(url).toBe('https://myapp.clowk.dev')
  })

  it('extracts URL from root-level fields (without instance wrapper)', async () => {
    nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        url: 'https://root-level.clowk.dev',
      })

    const resolver = new SubdomainResolver({ publishableKey: 'pk_test_123' })
    const url = await resolver.resolveUrl()

    expect(url).toBe('https://root-level.clowk.dev')
  })

  it('strips trailing slashes', async () => {
    nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        instance: { url: 'https://myapp.clowk.dev///' },
      })

    const resolver = new SubdomainResolver({ publishableKey: 'pk_test_123' })
    const url = await resolver.resolveUrl()

    expect(url).toBe('https://myapp.clowk.dev')
  })
})
