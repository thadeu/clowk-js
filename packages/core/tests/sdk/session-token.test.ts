import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { ClowkClient } from '../../src/sdk/client'
import { SessionTokenResource } from '../../src/sdk/session-token'
import { InvalidTokenError } from '../../src/errors'
import { resetConfig } from '../../src/config'

const BASE_URL = 'https://api.clowk.dev/api/v1'

function client() {
  return new ClowkClient({ apiBaseUrl: BASE_URL, publishableKey: 'pk_test_1' })
}

describe('SessionTokenResource', () => {
  beforeEach(() => {
    resetConfig()
    nock.cleanAll()
  })

  afterEach(() => nock.cleanAll())

  it('has the sessions resourcePath', () => {
    expect(SessionTokenResource.resourcePath).toBe('sessions')
  })

  // A browser cannot hold a secret key, so these endpoints must be reachable
  // with the publishable key alone.
  it('authenticates with the publishable key', async () => {
    const scope = nock(BASE_URL, { reqheaders: { 'X-Clowk-Publishable-Key': 'pk_test_1' } })
      .post('/sessions/exchange')
      .reply(200, { access_token: 'at', refresh_token: 'rt' })

    await client().sessionTokens.exchange('sign_in_jwt')

    expect(scope.isDone()).toBe(true)
  })

  it('maps the snake_case payload onto a TokenPair', async () => {
    nock(BASE_URL)
      .post('/sessions/exchange', { token: 'sign_in_jwt' })
      .reply(200, {
        access_token: 'at',
        refresh_token: 'rt',
        token_type: 'Bearer',
        expires_in: 900,
        session_id: 'clk_session_abc',
      })

    await expect(client().sessionTokens.exchange('sign_in_jwt')).resolves.toEqual({
      accessToken: 'at',
      refreshToken: 'rt',
      expiresIn: 900,
      sessionId: 'clk_session_abc',
    })
  })

  it('sends the refresh token under its wire name', async () => {
    const scope = nock(BASE_URL)
      .post('/sessions/refresh', { refresh_token: 'clk_rt_1' })
      .reply(200, { access_token: 'at2', refresh_token: 'clk_rt_2' })

    await client().sessionTokens.refresh('clk_rt_1')

    expect(scope.isDone()).toBe(true)
  })

  it('throws when the server rejects the token', async () => {
    nock(BASE_URL).post('/sessions/refresh').reply(401, { error: 'Invalid refresh token' })

    await expect(client().sessionTokens.refresh('clk_rt_1')).rejects.toBeInstanceOf(InvalidTokenError)
  })

  // A 200 with no access token would otherwise surface as `undefined` deep in
  // the caller, long after the response that caused it.
  it('throws when a success response carries no access token', async () => {
    nock(BASE_URL).post('/sessions/refresh').reply(200, { refresh_token: 'clk_rt_2' })

    await expect(client().sessionTokens.refresh('clk_rt_1')).rejects.toBeInstanceOf(InvalidTokenError)
  })

  it('tolerates a missing refresh token in the response', async () => {
    nock(BASE_URL).post('/sessions/exchange').reply(200, { access_token: 'at' })

    await expect(client().sessionTokens.exchange('sign_in_jwt')).resolves.toMatchObject({
      accessToken: 'at',
      refreshToken: null,
    })
  })

  it('revokes without expecting a body back', async () => {
    const scope = nock(BASE_URL).post('/sessions/revoke', { refresh_token: 'clk_rt_1' }).reply(204)

    await expect(client().sessionTokens.revoke('clk_rt_1')).resolves.toBeUndefined()
    expect(scope.isDone()).toBe(true)
  })
})
