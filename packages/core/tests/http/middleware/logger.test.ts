import { describe, it, expect, vi } from 'vitest'
import { createLoggerMiddleware } from '../../../src/http/middleware/logger'
import type { HttpEnv, HttpResponseData, Logger } from '../../../src/types'

function createEnv(overrides?: Partial<HttpEnv>): HttpEnv {
  return {
    method: 'GET',
    url: new URL('https://api.clowk.dev/client/v1/users'),
    headers: {},
    timeouts: { open: 5, read: 10, write: 10 },
    retryAttempts: 0,
    retryInterval: 0,
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

describe('LoggerMiddleware', () => {
  it('logs request and response', async () => {
    const logger: Logger = { info: vi.fn() }
    const middleware = createLoggerMiddleware({ logger })

    const handler = middleware(async () => mockResponse)
    await handler(createEnv())

    expect(logger.info).toHaveBeenCalledTimes(2)
    expect(logger.info).toHaveBeenCalledWith(
      '[Clowk::Http] GET https://api.clowk.dev/client/v1/users',
    )
    expect(logger.info).toHaveBeenCalledWith('[Clowk::Http] -> 200')
  })

  it('is a no-op when logger is null', async () => {
    const middleware = createLoggerMiddleware({ logger: null })
    const next = vi.fn(async () => mockResponse)

    const handler = middleware(next)
    const result = await handler(createEnv())

    expect(result.status).toBe(200)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
