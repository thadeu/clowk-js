import type { HttpMiddleware, Logger } from '../../types'

export function createLoggerMiddleware(opts: {
  logger: Logger | null
}): HttpMiddleware {
  return (next) => async (env) => {
    const logger = opts.logger
    if (!logger) return next(env)

    logger.info(`[Clowk::Http] ${env.method} ${env.url.toString()}`)
    const response = await next(env)
    logger.info(`[Clowk::Http] -> ${response.status}`)
    return response
  }
}
