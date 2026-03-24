import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { ClowkClient } from '../../src/sdk/client'
import { resetConfig } from '../../src/config'

const BASE_URL = 'https://api.clowk.dev/api/v1'

describe('Resource (via UserResource)', () => {
  let client: ClowkClient

  beforeEach(() => {
    resetConfig()
    nock.cleanAll()
    client = new ClowkClient({ apiBaseUrl: BASE_URL })
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('list() calls GET /{resource_path}', async () => {
    nock(BASE_URL).get('/users').reply(200, { data: [] })

    const response = await client.users.list()

    expect(response.status).toBe(200)
    expect(response.bodyParsed).toEqual({ data: [] })
  })

  it('find(id) calls GET /{resource_path}/{id}', async () => {
    nock(BASE_URL).get('/users/user_123').reply(200, { id: 'user_123' })

    const response = await client.users.find('user_123')

    expect(response.status).toBe(200)
    expect(response.bodyParsed).toEqual({ id: 'user_123' })
  })

  it('show(id) calls GET /{resource_path}/{id}', async () => {
    nock(BASE_URL).get('/users/user_123').reply(200, { id: 'user_123' })

    const response = await client.users.show('user_123')

    expect(response.status).toBe(200)
  })

  it('search with keywords builds field:value query', async () => {
    nock(BASE_URL)
      .get('/users/search')
      .query({ query: 'email:user@example.com status:active' })
      .reply(200, { data: [] })

    const response = await client.users.search({
      email: 'user@example.com',
      status: 'active',
    })

    expect(response.status).toBe(200)
  })

  it('search with raw string passes through', async () => {
    nock(BASE_URL)
      .get('/users/search')
      .query({ query: 'email:user@example.com created_at>2026-01-01' })
      .reply(200, { data: [] })

    const response = await client.users.search(
      'email:user@example.com created_at>2026-01-01',
    )

    expect(response.status).toBe(200)
  })

  it('destroy(id) calls DELETE /{resource_path}/{id}', async () => {
    nock(BASE_URL).delete('/users/user_123').reply(204, '')

    const response = await client.users.destroy('user_123')

    expect(response.status).toBe(204)
  })
})
