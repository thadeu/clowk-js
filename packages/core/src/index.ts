// Configuration
export { configure, getConfig, resetConfig } from './config'

// Errors
export {
  ClowkError,
  ConfigurationError,
  InvalidStateError,
  InvalidTokenError,
} from './errors'

// HTTP
export { HttpClient } from './http/client'
export type { HttpClientOptions } from './http/client'
export { ClowkResponse } from './http/response'

// HTTP Middleware
export { createTimeoutMiddleware } from './http/middleware/timeout'
export { createRetryMiddleware } from './http/middleware/retry'
export { createLoggerMiddleware } from './http/middleware/logger'

// SDK Client & Resources
export { ClowkClient } from './sdk/client'
export { Resource } from './sdk/resource'
export { UserResource } from './sdk/user'
export { SessionResource } from './sdk/session'
export { SubdomainResource } from './sdk/subdomain'
export { TokenResource } from './sdk/token'

// JWT & Auth utilities
export { JwtVerifier } from './jwt-verifier'
export { SubdomainResolver } from './subdomain-resolver'
export { TokenExtractor } from './token-extractor'

// Types
export type {
  ClowkConfig,
  ClowkClientOptions,
  HttpEnv,
  HttpHandler,
  HttpMethod,
  HttpMiddleware,
  HttpResponseData,
  JwtPayload,
  Logger,
  TokenRequest,
} from './types'

// Convenience namespace
import { configure, getConfig, resetConfig } from './config'
import { ClowkClient } from './sdk/client'

export const Clowk = {
  configure,
  get config() {
    return getConfig()
  },
  reset: resetConfig,
  Client: ClowkClient,
}

export default Clowk
