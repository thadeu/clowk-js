import type { ClowkClientOptions } from '../types'
import { getConfig } from '../config'
import { HttpClient } from '../http/client'
import { ClowkResponse } from '../http/response'
import { UserResource } from './user'
import { SessionResource } from './session'
import { SubdomainResource } from './subdomain'
import { TokenResource } from './token'

export class ClowkClient {
  private _users?: UserResource
  private _sessions?: SessionResource
  private _subdomains?: SubdomainResource
  private _tokens?: TokenResource
  private _http?: HttpClient

  private readonly apiBaseUrl: string | null
  private readonly secretKey: string | null
  private readonly publishableKey: string | null

  constructor(options: ClowkClientOptions = {}) {
    this.apiBaseUrl = options.apiBaseUrl ?? this.deriveApiBaseUrl()
    this.secretKey = options.secretKey ?? getConfig().secretKey
    this.publishableKey = options.publishableKey ?? getConfig().publishableKey
  }

  get users(): UserResource {
    return (this._users ??= new UserResource(this))
  }

  get sessions(): SessionResource {
    return (this._sessions ??= new SessionResource(this))
  }

  get subdomains(): SubdomainResource {
    return (this._subdomains ??= new SubdomainResource(this))
  }

  get tokens(): TokenResource {
    return (this._tokens ??= new TokenResource(this))
  }

  async get(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.http.get(path, headers)
  }

  async post(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.http.post(path, body, headers)
  }

  async put(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.http.put(path, body, headers)
  }

  async patch(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.http.patch(path, body, headers)
  }

  async delete(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.http.delete(path, body, headers)
  }

  async head(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.http.head(path, headers)
  }

  async options(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return this.http.options(path, headers)
  }

  private deriveApiBaseUrl(): string | null {
    const subdomainUrl = getConfig().subdomainUrl
    if (!subdomainUrl) return null

    return `${subdomainUrl.replace(/\/$/, '')}/api/v1`
  }

  private get http(): HttpClient {
    if (!this._http) {
      const config = getConfig()
      const headers: Record<string, string> = {}

      if (this.secretKey) headers['X-Clowk-Secret-Key'] = this.secretKey
      if (this.publishableKey) headers['X-Clowk-Publishable-Key'] = this.publishableKey

      this._http = new HttpClient({
        baseUrl: this.apiBaseUrl,
        headers,
        logger: config.httpLogger,
        openTimeout: config.httpOpenTimeout,
        readTimeout: config.httpReadTimeout,
        writeTimeout: config.httpWriteTimeout,
        retryAttempts: config.httpRetryAttempts,
        retryInterval: config.httpRetryInterval,
      })
    }
    return this._http
  }
}
