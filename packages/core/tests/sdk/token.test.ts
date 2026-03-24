import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { ClowkClient } from '../../src/sdk/client'
import { TokenResource } from '../../src/sdk/token'
import { resetConfig } from '../../src/config'

const BASE_URL = 'https://api.clowk.dev/api/v1'

describe('TokenResource', () => {
  beforeEach(() => {
    resetConfig()
    nock.cleanAll()
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('has correct resourcePath', () => {
    expect(TokenResource.resourcePath).toBe('tokens')
  })

  it('verify sends POST to tokens/verify', async () => {
    nock(BASE_URL)
      .post('/tokens/verify', { token: 'jwt_token_here' })
      .reply(200, { valid: true, sub: 'user_123' })

    const client = new ClowkClient({ apiBaseUrl: BASE_URL })
    const response = await client.tokens.verify('jwt_token_here')

    expect(response.status).toBe(200)
    expect(response.bodyParsed).toEqual({ valid: true, sub: 'user_123' })
  })
})
