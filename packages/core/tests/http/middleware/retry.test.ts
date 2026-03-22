import { describe, it, expect } from 'vitest'
import { createRetryMiddleware } from '../../../src/http/middleware/retry'
import type { HttpEnv, HttpResponseData } from '../../../src/types'

function createEnv(overrides?: Partial<HttpEnv>): HttpEnv {
  return {
    method: 'GET',
    url: new URL('https://api.clowk.dev/client/v1/users'),
    headers: {},
    timeouts: { open: 5, read: 10, write: 10 },
    retryAttempts: 2,
    retryInterval: 0.001,
    attempt: 1,
    ...overrides,
  }
}

const mockResponse: HttpResponseData = {
  status: 200,
  body: '{}',
  bodyParsed: {},
  headers: {},
  success: true,
}

describe('RetryMiddleware', () => {
  it('returns response on success', async () => {
    const middleware = createRetryMiddleware()
    const handler = middleware(async () => mockResponse)

    const result = await handler(createEnv())
    expect(result.status).toBe(200)
  })

  it('retries on transient network errors', async () => {
    const middleware = createRetryMiddleware()
    let callCount = 0

    const handler = middleware(async () => {
      callCount++
      if (callCount < 3) {
        throw new Error('fetch failed')
      }
      return mockResponse
    })

    const result = await handler(createEnv())
    expect(result.status).toBe(200)
    expect(callCount).toBe(3)
  })

  it('retries on ECONNRESET', async () => {
    const middleware = createRetryMiddleware()
    let callCount = 0

    const handler = middleware(async () => {
      callCount++
      if (callCount === 1) {
        throw new Error('ECONNRESET')
      }
      return mockResponse
    })

    const result = await handler(createEnv())
    expect(result.status).toBe(200)
    expect(callCount).toBe(2)
  })

  it('does NOT retry on non-retryable errors', async () => {
    const middleware = createRetryMiddleware()
    let callCount = 0

    const handler = middleware(async () => {
      callCount++
      throw new Error('some other error')
    })

    await expect(handler(createEnv())).rejects.toThrow('some other error')
    expect(callCount).toBe(1)
  })

  it('does NOT retry HTTP status errors (returns response as-is)', async () => {
    const middleware = createRetryMiddleware()
    let callCount = 0

    const errorResponse: HttpResponseData = {
      status: 500,
      body: 'Internal Server Error',
      bodyParsed: null,
      headers: {},
      success: false,
    }

    const handler = middleware(async () => {
      callCount++
      return errorResponse
    })

    const result = await handler(createEnv())
    expect(result.status).toBe(500)
    expect(callCount).toBe(1)
  })

  it('throws after exhausting retry attempts', async () => {
    const middleware = createRetryMiddleware()

    const handler = middleware(async () => {
      throw new Error('fetch failed')
    })

    await expect(handler(createEnv({ retryAttempts: 2 }))).rejects.toThrow(
      'fetch failed',
    )
  })
})
