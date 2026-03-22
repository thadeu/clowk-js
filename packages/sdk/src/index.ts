/**
 * @clowk/sdk — User-facing Clowk SDK package
 *
 * Re-exports everything from @clowk/core for a clean public API.
 * Install this package to use Clowk in any JavaScript/TypeScript project.
 */

// Configuration
export { configure, getConfig, resetConfig } from '@clowk/core'

// Errors
export {
  ClowkError,
  ConfigurationError,
  InvalidStateError,
  InvalidTokenError,
} from '@clowk/core'

// HTTP
export { HttpClient, ClowkResponse } from '@clowk/core'
export type { HttpClientOptions } from '@clowk/core'

// SDK Client & Resources
export { ClowkClient, Resource, UserResource, SessionResource, SubdomainResource, TokenResource } from '@clowk/core'

// JWT & Auth utilities
export { JwtVerifier, SubdomainResolver, TokenExtractor } from '@clowk/core'

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
} from '@clowk/core'

// Default namespace
export { Clowk, default } from '@clowk/core'
