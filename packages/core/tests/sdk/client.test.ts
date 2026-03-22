import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { ClowkClient } from '../../src/sdk/client'
import { UserResource } from '../../src/sdk/user'
import { SessionResource } from '../../src/sdk/session'
import { SubdomainResource } from '../../src/sdk/subdomain'
import { TokenResource } from '../../src/sdk/token'
import { configure, resetConfig } from '../../src/config'

const BASE_URL = 'https://api.clowk.dev/client/v1'

describe('ClowkClient', () => {
  beforeEach(() => {
    resetConfig()
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('resource getters return correct types', () => {
    const client = new ClowkClient()

    expect(client.users).toBeInstanceOf(UserResource)
    expect(client.sessions).toBeInstanceOf(SessionResource)
    expect(client.subdomains).toBeInstanceOf(SubdomainResource)
    expect(client.tokens).toBeInstanceOf(TokenResource)
  })

  it('memoizes resource instances', () => {
    const client = new ClowkClient()

    const users1 = client.users
    const users2 = client.users
    expect(users1).toBe(users2)

    const sessions1 = client.sessions
    const sessions2 = client.sessions
    expect(sessions1).toBe(sessions2)
  })

  it('uses config defaults', () => {
    configure({ secretKey: 'sk_test_123', publishableKey: 'pk_test_456' })

    const scope = nock(BASE_URL, {
      reqheaders: {
        'X-Clowk-Secret-Key': 'sk_test_123',
        'X-Clowk-Publishable-Key': 'pk_test_456',
      },
    })
      .get('/users')
      .reply(200, {})

    const client = new ClowkClient()
    client.get('users')

    // Allow time for request
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(scope.isDone()).toBe(true)
        resolve()
      }, 100)
    })
  })

  it('options override config', () => {
    configure({ secretKey: 'sk_from_config' })

    const scope = nock(BASE_URL, {
      reqheaders: {
        'X-Clowk-Secret-Key': 'sk_override',
      },
    })
      .get('/users')
      .reply(200, {})

    const client = new ClowkClient({ secretKey: 'sk_override' })
    client.get('users')

    return new Promise<void>((resolve) => {
      setTimeout(() => {
        expect(scope.isDone()).toBe(true)
        resolve()
      }, 100)
    })
  })

  it('delegates HTTP get', async () => {
    nock(BASE_URL).get('/custom/endpoint').reply(200, { ok: true })

    const client = new ClowkClient()
    const response = await client.get('custom/endpoint')

    expect(response.status).toBe(200)
  })

  it('delegates HTTP post', async () => {
    nock(BASE_URL)
      .post('/custom/endpoint', { key: 'value' })
      .reply(201, { created: true })

    const client = new ClowkClient()
    const response = await client.post('custom/endpoint', { key: 'value' })

    expect(response.status).toBe(201)
  })

  it('delegates HTTP put', async () => {
    nock(BASE_URL)
      .put('/custom/endpoint', { key: 'value' })
      .reply(200, {})

    const client = new ClowkClient()
    const response = await client.put('custom/endpoint', { key: 'value' })

    expect(response.status).toBe(200)
  })

  it('delegates HTTP patch', async () => {
    nock(BASE_URL)
      .patch('/custom/endpoint', { key: 'value' })
      .reply(200, {})

    const client = new ClowkClient()
    const response = await client.patch('custom/endpoint', { key: 'value' })

    expect(response.status).toBe(200)
  })

  it('delegates HTTP delete', async () => {
    nock(BASE_URL).delete('/custom/endpoint').reply(204, '')

    const client = new ClowkClient()
    const response = await client.delete('custom/endpoint')

    expect(response.status).toBe(204)
  })

  it('delegates HTTP head', async () => {
    nock(BASE_URL).head('/custom/endpoint').reply(200, '')

    const client = new ClowkClient()
    const response = await client.head('custom/endpoint')

    expect(response.status).toBe(200)
  })

  it('delegates HTTP options', async () => {
    nock(BASE_URL).options('/custom/endpoint').reply(200, '')

    const client = new ClowkClient()
    const response = await client.options('custom/endpoint')

    expect(response.status).toBe(200)
  })
})
