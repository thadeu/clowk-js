export interface Logger {
  info(...args: unknown[]): void
}

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'

export interface HttpEnv {
  method: HttpMethod
  url: URL
  body?: unknown
  headers: Record<string, string>
  timeouts: { open: number; read: number; write: number }
  retryAttempts: number
  retryInterval: number
  attempt: number
  signal?: AbortSignal
}

export interface HttpResponseData {
  status: number
  body: string
  bodyParsed: unknown | null
  headers: Record<string, string>
  success: boolean
}

export type HttpHandler = (env: HttpEnv) => Promise<HttpResponseData>

export type HttpMiddleware = (next: HttpHandler) => HttpHandler

export interface TokenPair {
  accessToken: string
  refreshToken: string | null
  expiresIn: number | null
  sessionId: string | null
}

/**
 * Where the refresh token lives between page loads. Synchronous and tiny on
 * purpose, so `localStorage` satisfies it directly and a native shell can back
 * it with the Keychain.
 */
export interface TokenStorage {
  get(key: string): string | null
  set(key: string, value: string): void
  remove(key: string): void
}

export type ClowkResourceType = 'user' | 'token' | 'instance'

export interface ClowkItem<T extends Record<string, unknown> = Record<string, unknown>> {
  id: string
  resource: ClowkResourceType
  data: T
}

export interface ClowkConfig {
  appBaseUrl: string
  secretKey: string | null
  publishableKey: string | null
  subdomainUrl: string | null
  afterSignInPath: string
  afterSignOutPath: string
  mountPath: string
  callbackPath: string
  cookieKey: string
  sessionKey: string
  tokenParam: string
  issuer: string | null
  httpOpenTimeout: number
  httpReadTimeout: number
  httpWriteTimeout: number
  httpRetryAttempts: number
  httpRetryInterval: number
  httpLogger: Logger | null
}

export type ClowkClientOptions = Partial<Pick<ClowkConfig, 'secretKey' | 'publishableKey'>> & {
  apiBaseUrl?: string | null
}

export interface JwtPayload {
  iss?: string
  exp?: number
  iat?: number
  sub?: string
  session_id?: string
  [key: string]: unknown
}

export interface TokenRequest {
  params?: Record<string, string>
  headers?: Record<string, string> | { get(name: string): string | null }
  cookies?: Record<string, string>
}

export type SessionStatus = 'active' | 'revoked' | 'expired' | 'not_found' | 'unknown'

export interface SessionInfo {
  status: SessionStatus
  sessionId?: string
  reason?: 'lifetime' | 'idle'
  revokedAt?: string
  loggedInAt?: string
  lastActivityAt?: string
}

export interface SessionConfig {
  sessionLifetimeHours: number
  sessionIdleTimeoutMinutes: number | null
  singleSessionPerDevice: boolean
  maxConcurrentSessions: number
}

export interface VerifyResult {
  valid: boolean
  email: string
  name: string
  avatarUrl?: string
  provider?: string
  session?: SessionInfo
}
