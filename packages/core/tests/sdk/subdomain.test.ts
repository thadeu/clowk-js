import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { ClowkClient } from '../../src/sdk/client'
import { SubdomainResource } from '../../src/sdk/subdomain'
import { resetConfig } from '../../src/config'

const BASE_URL = 'https://api.clowk.dev/client/v1'

describe('SubdomainResource', () => {
  beforeEach(() => {
    resetConfig()
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('has correct resourcePath', () => {
    expect(SubdomainResource.resourcePath).toBe('instances')
  })

  it('findByPk delegates to search with publishable_key', async () => {
    nock(BASE_URL)
      .get('/instances/search')
      .query({ query: 'publishable_key:pk_test_123' })
      .reply(200, {
        instance: { url: 'https://myapp.clowk.dev' },
      })

    const client = new ClowkClient()
    const response = await client.subdomains.findByPk('pk_test_123')

    expect(response.status).toBe(200)
    expect(response.bodyParsed).toEqual({
      instance: { url: 'https://myapp.clowk.dev' },
    })
  })
})
