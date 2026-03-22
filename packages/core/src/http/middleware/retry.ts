import type { HttpMiddleware } from '../../types'

const RETRYABLE_PATTERNS = [
  'ECONNRESET',
  'ETIMEDOUT',
  'ECONNREFUSED',
  'UND_ERR_CONNECT_TIMEOUT',
  'UND_ERR_SOCKET',
  'fetch failed',
  'network error',
  'aborted',
  'EPIPE',
  'EAI_AGAIN',
]

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const message = error.message || ''
  const code = (error as { cause?: { code?: string } })?.cause?.code ?? ''
  return RETRYABLE_PATTERNS.some(
    (p) => message.includes(p) || code.includes(p),
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function createRetryMiddleware(): HttpMiddleware {
  return (next) => async (env) => {
    const maxAttempts = env.retryAttempts
    const interval = env.retryInterval

    let attempt = 0
    while (true) {
      attempt++
      env.attempt = attempt

      try {
        return await next(env)
      } catch (error) {
        if (!isRetryable(error) || attempt > maxAttempts) {
          throw error
        }

        if (interval > 0) {
          await sleep(interval * 1000)
        }
      }
    }
  }
}
