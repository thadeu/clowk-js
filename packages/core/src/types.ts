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
  [key: string]: unknown
}

export interface TokenRequest {
  params?: Record<string, string>
  headers?: Record<string, string> | { get(name: string): string | null }
  cookies?: Record<string, string>
}
