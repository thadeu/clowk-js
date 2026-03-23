import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { ClowkClient } from '../../src/sdk/client'
import { SessionResource } from '../../src/sdk/session'
import { Resource } from '../../src/sdk/resource'
import { resetConfig } from '../../src/config'

const BASE_URL = 'https://api.clowk.dev/api/v1'

describe('SessionResource', () => {
  it('has correct resourcePath', () => {
    expect(SessionResource.resourcePath).toBe('sessions')
  })

  it('extends Resource', () => {
    expect(SessionResource.prototype).toBeInstanceOf(Resource)
  })
})

describe('SessionResource (via ClowkClient)', () => {
  let client: ClowkClient

  beforeEach(() => {
    resetConfig()
    nock.cleanAll()
    client = new ClowkClient({ apiBaseUrl: BASE_URL })
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('list() calls GET /sessions', async () => {
    nock(BASE_URL).get('/sessions').reply(200, [])

    const response = await client.sessions.list()

    expect(response.status).toBe(200)
  })

  it('find(id) calls GET /sessions/:id', async () => {
    nock(BASE_URL).get('/sessions/clk_session_abc').reply(200, { id: 'clk_session_abc' })

    const response = await client.sessions.find('clk_session_abc')

    expect(response.status).toBe(200)
  })

  it('search(email) calls GET /sessions/search?email=...', async () => {
    nock(BASE_URL)
      .get('/sessions/search')
      .query({ email: 'jane@example.com' })
      .reply(200, [])

    const response = await client.sessions.search('jane@example.com')

    expect(response.status).toBe(200)
  })

  it('search(email) URL-encodes the email', async () => {
    nock(BASE_URL)
      .get('/sessions/search')
      .query({ email: 'user+tag@example.com' })
      .reply(200, [])

    const response = await client.sessions.search('user+tag@example.com')

    expect(response.status).toBe(200)
  })

  it('revoke(sessionId) calls DELETE /sessions/:id', async () => {
    nock(BASE_URL).delete('/sessions/clk_session_abc').reply(200, { revoked: true })

    const response = await client.sessions.revoke('clk_session_abc')

    expect(response.status).toBe(200)
  })

  it('destroy(sessionId) also calls DELETE /sessions/:id', async () => {
    nock(BASE_URL).delete('/sessions/clk_session_abc').reply(200, { revoked: true })

    const response = await client.sessions.destroy('clk_session_abc')

    expect(response.status).toBe(200)
  })
})
