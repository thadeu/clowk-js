import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import nock from 'nock'
import { HttpClient } from '../../src/http/client'
import { ClowkError } from '../../src/errors'

const BASE_URL = 'https://api.clowk.dev/client/v1'

describe('HttpClient', () => {
  let client: HttpClient

  beforeEach(() => {
    nock.cleanAll()
    client = new HttpClient({
      baseUrl: BASE_URL,
      retryAttempts: 0,
      retryInterval: 0,
    })
  })

  afterEach(() => {
    nock.cleanAll()
  })

  it('GET request', async () => {
    nock(BASE_URL).get('/users').reply(200, { data: [{ id: '1' }] })

    const response = await client.get('users')

    expect(response.status).toBe(200)
    expect(response.success).toBe(true)
    expect(response.bodyParsed).toEqual({ data: [{ id: '1' }] })
  })

  it('POST request with body', async () => {
    nock(BASE_URL)
      .post('/users', { name: 'John' })
      .reply(201, { id: '1', name: 'John' })

    const response = await client.post('users', { name: 'John' })

    expect(response.status).toBe(201)
    expect(response.bodyParsed).toEqual({ id: '1', name: 'John' })
  })

  it('PUT request', async () => {
    nock(BASE_URL)
      .put('/users/1', { name: 'Jane' })
      .reply(200, { id: '1', name: 'Jane' })

    const response = await client.put('users/1', { name: 'Jane' })

    expect(response.status).toBe(200)
  })

  it('PATCH request', async () => {
    nock(BASE_URL)
      .patch('/users/1', { name: 'Jane' })
      .reply(200, { id: '1', name: 'Jane' })

    const response = await client.patch('users/1', { name: 'Jane' })

    expect(response.status).toBe(200)
  })

  it('DELETE request', async () => {
    nock(BASE_URL).delete('/users/1').reply(204, '')

    const response = await client.delete('users/1')

    expect(response.status).toBe(204)
  })

  it('HEAD request', async () => {
    nock(BASE_URL).head('/users').reply(200, '')

    const response = await client.head('users')

    expect(response.status).toBe(200)
  })

  it('OPTIONS request', async () => {
    nock(BASE_URL).options('/users').reply(200, '')

    const response = await client.options('users')

    expect(response.status).toBe(200)
  })

  it('parses JSON response', async () => {
    nock(BASE_URL).get('/users').reply(200, { users: [] })

    const response = await client.get('users')

    expect(response.bodyParsed).toEqual({ users: [] })
  })

  it('handles non-JSON response (bodyParsed is null)', async () => {
    nock(BASE_URL).get('/health').reply(200, 'OK', {
      'Content-Type': 'text/plain',
    })

    const response = await client.get('health')

    expect(response.body).toBe('OK')
    expect(response.bodyParsed).toBeNull()
  })

  it('sends default headers', async () => {
    const scope = nock(BASE_URL, {
      reqheaders: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    })
      .get('/users')
      .reply(200, {})

    await client.get('users')

    expect(scope.isDone()).toBe(true)
  })

  it('sends custom auth headers', async () => {
    const authClient = new HttpClient({
      baseUrl: BASE_URL,
      headers: {
        'X-Clowk-Secret-Key': 'sk_test_123',
        'X-Clowk-Publishable-Key': 'pk_test_456',
      },
      retryAttempts: 0,
    })

    const scope = nock(BASE_URL, {
      reqheaders: {
        'X-Clowk-Secret-Key': 'sk_test_123',
        'X-Clowk-Publishable-Key': 'pk_test_456',
      },
    })
      .get('/users')
      .reply(200, {})

    await authClient.get('users')

    expect(scope.isDone()).toBe(true)
  })

  it('handles HTTP 500 responses', async () => {
    nock(BASE_URL).get('/users').reply(500, { error: 'Internal Server Error' })

    const response = await client.get('users')

    expect(response.status).toBe(500)
    expect(response.success).toBe(false)
  })

  it('handles HTTP 502 responses', async () => {
    nock(BASE_URL).get('/users').reply(502, 'Bad Gateway')

    const response = await client.get('users')

    expect(response.status).toBe(502)
    expect(response.success).toBe(false)
  })

  it('handles HTTP 503 responses', async () => {
    nock(BASE_URL).get('/users').reply(503, 'Service Unavailable')

    const response = await client.get('users')

    expect(response.status).toBe(503)
    expect(response.success).toBe(false)
  })

  it('enforces response body size limit (>1MB)', async () => {
    const largeBody = 'x'.repeat(1_048_577) // 1 MB + 1 byte
    nock(BASE_URL).get('/large').reply(200, largeBody)

    await expect(client.get('large')).rejects.toThrow('response body too large')
  })

  it('builds URL correctly with path', async () => {
    nock(BASE_URL).get('/users/user_123').reply(200, { id: 'user_123' })

    const response = await client.get('users/user_123')

    expect(response.status).toBe(200)
  })

  it('builds URL correctly with leading slash', async () => {
    nock(BASE_URL).get('/users').reply(200, {})

    const response = await client.get('/users')

    expect(response.status).toBe(200)
  })
})
