import type { HttpMiddleware } from '../../types'

export function createTimeoutMiddleware(opts: {
  openTimeout: number
  readTimeout: number
  writeTimeout: number
}): HttpMiddleware {
  return (next) => async (env) => {
    env.timeouts = {
      open: opts.openTimeout,
      read: opts.readTimeout,
      write: opts.writeTimeout,
    }

    const totalMs = (env.timeouts.open + env.timeouts.read) * 1000
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), totalMs)

    env.signal = controller.signal

    try {
      return await next(env)
    } finally {
      clearTimeout(timer)
    }
  }
}
