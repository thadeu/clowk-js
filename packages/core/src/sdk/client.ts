import type { ClowkClientOptions } from '../types'
import { getConfig } from '../config'
import { ConfigurationError } from '../errors'
import { HttpClient } from '../http/client'
import { ClowkResponse } from '../http/response'
import { SubdomainResolver } from '../subdomain-resolver'
import { UserResource } from './user'
import { SessionResource } from './session'
import { SessionConfigResource } from './session-config'
import { SubdomainResource } from './subdomain'
import { TokenResource } from './token'
import { SessionTokenResource } from './session-token'

export class ClowkClient {
  private _users?: UserResource
  private _sessions?: SessionResource
  private _sessionConfig?: SessionConfigResource
  private _subdomains?: SubdomainResource
  private _tokens?: TokenResource
  private _sessionTokens?: SessionTokenResource
  private _http?: HttpClient
  private _baseUrl?: Promise<string>

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

  get sessionConfig(): SessionConfigResource {
    return (this._sessionConfig ??= new SessionConfigResource(this))
  }

  get subdomains(): SubdomainResource {
    return (this._subdomains ??= new SubdomainResource(this))
  }

  get tokens(): TokenResource {
    return (this._tokens ??= new TokenResource(this))
  }

  get sessionTokens(): SessionTokenResource {
    return (this._sessionTokens ??= new SessionTokenResource(this))
  }

  async get(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return (await this.http()).get(path, headers)
  }

  async post(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return (await this.http()).post(path, body, headers)
  }

  async put(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return (await this.http()).put(path, body, headers)
  }

  async patch(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return (await this.http()).patch(path, body, headers)
  }

  async delete(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse> {
    return (await this.http()).delete(path, body, headers)
  }

  async head(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return (await this.http()).head(path, headers)
  }

  async options(path: string, headers?: Record<string, string>): Promise<ClowkResponse> {
    return (await this.http()).options(path, headers)
  }

  private deriveApiBaseUrl(): string | null {
    const subdomainUrl = getConfig().subdomainUrl
    if (!subdomainUrl) return null

    return `${subdomainUrl.replace(/\/$/, '')}/api/v1`
  }

  /**
   * Where this client sends its requests.
   *
   * An explicit `apiBaseUrl` or a configured `subdomainUrl` answers without
   * touching the network. Only when neither is set does the publishable key get
   * resolved through api.clowk.dev — which is what makes `subdomainUrl`
   * optional for a browser app that already ships a publishable key.
   *
   * The promise is kept rather than the value, so several requests firing at
   * once share one lookup instead of racing to make the same call.
   */
  private async resolveBaseUrl(): Promise<string> {
    if (this.apiBaseUrl) return this.apiBaseUrl

    if (!this.publishableKey) {
      throw new ConfigurationError('set subdomainUrl, apiBaseUrl or publishableKey to build Clowk URLs')
    }

    this._baseUrl ??= new SubdomainResolver({ publishableKey: this.publishableKey })
      .resolveUrl()
      .then((url) => `${url.replace(/\/+$/, '')}/api/v1`)

    return this._baseUrl
  }

  private async http(): Promise<HttpClient> {
    if (this._http) return this._http

    const baseUrl = await this.resolveBaseUrl()
    const config = getConfig()
    const headers: Record<string, string> = {}

    if (this.secretKey) headers['X-Clowk-Secret-Key'] = this.secretKey
    if (this.publishableKey) headers['X-Clowk-Publishable-Key'] = this.publishableKey

    this._http ??= new HttpClient({
      baseUrl,
      headers,
      logger: config.httpLogger,
      openTimeout: config.httpOpenTimeout,
      readTimeout: config.httpReadTimeout,
      writeTimeout: config.httpWriteTimeout,
      retryAttempts: config.httpRetryAttempts,
      retryInterval: config.httpRetryInterval,
    })

    return this._http
  }
}
