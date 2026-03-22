import { describe, it, expect } from 'vitest'
import { createTimeoutMiddleware } from '../../../src/http/middleware/timeout'
import type { HttpEnv, HttpResponseData } from '../../../src/types'

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

describe('TimeoutMiddleware', () => {
  it('sets timeouts on env', async () => {
    const middleware = createTimeoutMiddleware({
      openTimeout: 3,
      readTimeout: 7,
      writeTimeout: 7,
    })

    let capturedEnv: HttpEnv | null = null
    const handler = middleware(async (env) => {
      capturedEnv = env
      return mockResponse
    })

    await handler(createEnv())

    expect(capturedEnv!.timeouts).toEqual({ open: 3, read: 7, write: 7 })
  })

  it('attaches abort signal to env', async () => {
    const middleware = createTimeoutMiddleware({
      openTimeout: 5,
      readTimeout: 10,
      writeTimeout: 10,
    })

    let capturedEnv: HttpEnv | null = null
    const handler = middleware(async (env) => {
      capturedEnv = env
      return mockResponse
    })

    await handler(createEnv())

    expect(capturedEnv!.signal).toBeInstanceOf(AbortSignal)
    expect(capturedEnv!.signal!.aborted).toBe(false)
  })

  it('aborts after timeout', async () => {
    const middleware = createTimeoutMiddleware({
      openTimeout: 0.01,
      readTimeout: 0.01,
      writeTimeout: 0.01,
    })

    const handler = middleware(async (env) => {
      // Wait longer than the timeout
      await new Promise((resolve) => setTimeout(resolve, 200))
      return mockResponse
    })

    const env = createEnv()
    await handler(env)

    expect(env.signal!.aborted).toBe(true)
  })
})
