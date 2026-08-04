import type { JwtPayload, TokenPair, TokenStorage } from './types'
import { ClowkClient } from './sdk/client'
import { SessionTokenResource } from './sdk/session-token'
import { InvalidTokenError } from './errors'
import { REFRESH_TOKEN_KEY, defaultStorage } from './token-storage'

export interface TokenManagerOptions {
  publishableKey?: string | null
  storage?: TokenStorage
  /** Renew this many seconds before `exp`, so a request never leaves with a token about to die. */
  refreshSkew?: number
  onChange?: (state: TokenManagerState) => void
}

export interface TokenManagerState {
  token: string | null
  user: JwtPayload | null
  sessionId: string | null
}

/**
 * Holds the access token in memory and the refresh token in storage, renewing
 * on demand.
 *
 * The access token is never persisted: it is the credential every request
 * carries, and rotation gives the refresh token a property it does not have —
 * reuse is detectable and burns the session.
 */
export class TokenManager {
  private accessToken: string | null = null
  private expiresAt: number | null = null
  private user: JwtPayload | null = null
  private sessionId: string | null = null

  /**
   * The in-flight renewal. Concurrent callers await this one promise instead of
   * each firing their own refresh — with rotation, parallel refreshes would
   * spend the same token twice and trip reuse detection, logging the user out
   * for doing nothing wrong.
   */
  private inFlight: Promise<string | null> | null = null

  private readonly storage: TokenStorage
  private readonly refreshSkew: number
  private readonly publishableKey: string | null
  private readonly onChange?: (state: TokenManagerState) => void

  constructor(options: TokenManagerOptions = {}) {
    this.storage = options.storage ?? defaultStorage()
    this.refreshSkew = options.refreshSkew ?? 60
    this.publishableKey = options.publishableKey ?? null
    this.onChange = options.onChange
  }

  get currentToken(): string | null {
    return this.accessToken
  }

  get currentUser(): JwtPayload | null {
    return this.user
  }

  get currentSessionId(): string | null {
    return this.sessionId
  }

  hasRefreshToken(): boolean {
    return this.storage.get(REFRESH_TOKEN_KEY) !== null
  }

  /** Exchanges the sign-in redirect token for a durable pair. */
  async exchange(signInToken: string): Promise<string | null> {
    return this.adopt(await this.resource().exchange(signInToken))
  }

  /**
   * Rebuilds the session from the stored refresh token. This is what makes a
   * reload survivable — without it the in-memory token is gone and the user is
   * simply logged out.
   */
  async restore(): Promise<string | null> {
    const stored = this.storage.get(REFRESH_TOKEN_KEY)

    if (!stored) return null

    return this.renew(stored)
  }

  /**
   * The token to send with a request. Renews when it is expired or close to it,
   * so callers never have to think about lifetime.
   */
  async getToken(): Promise<string | null> {
    if (this.accessToken && !this.isExpiring()) return this.accessToken

    const stored = this.storage.get(REFRESH_TOKEN_KEY)

    if (!stored) return this.accessToken

    return this.renew(stored)
  }

  async signOut(): Promise<void> {
    const stored = this.storage.get(REFRESH_TOKEN_KEY)

    if (stored) {
      try {
        await this.resource().revoke(stored)
      } catch {
        // A failed revoke must not strand the user in a signed-in UI. The
        // local state is cleared either way; the token expires on its own.
      }
    }

    this.clear()
  }

  clear(): void {
    this.accessToken = null
    this.expiresAt = null
    this.user = null
    this.sessionId = null
    this.storage.remove(REFRESH_TOKEN_KEY)
    this.emit()
  }

  private renew(refreshToken: string): Promise<string | null> {
    this.inFlight ??= this.performRenew(refreshToken).finally(() => {
      this.inFlight = null
    })

    return this.inFlight
  }

  private async performRenew(refreshToken: string): Promise<string | null> {
    try {
      return this.adopt(await this.resource().refresh(refreshToken))
    } catch {
      // A refresh that fails is terminal: the token was spent, revoked, or
      // expired, and no retry with the same value can succeed.
      this.clear()

      return null
    }
  }

  private adopt(pair: TokenPair): string {
    if (!pair.accessToken) throw new InvalidTokenError('Clowk returned no access token')

    this.accessToken = pair.accessToken
    this.user = decodeClaims(pair.accessToken)
    this.sessionId = pair.sessionId ?? this.user?.session_id as string ?? null
    this.expiresAt = this.resolveExpiry(pair)

    if (pair.refreshToken) this.storage.set(REFRESH_TOKEN_KEY, pair.refreshToken)

    this.emit()

    return pair.accessToken
  }

  /**
   * Prefers the `exp` claim over `expires_in`: the claim is what the server
   * will actually enforce, and it is immune to clock skew between the two
   * machines in a way a duration measured from "now" is not.
   */
  private resolveExpiry(pair: TokenPair): number | null {
    const exp = this.user?.exp

    if (typeof exp === 'number') return exp * 1000

    if (typeof pair.expiresIn === 'number') return Date.now() + pair.expiresIn * 1000

    return null
  }

  private isExpiring(): boolean {
    if (this.expiresAt === null) return false

    return Date.now() >= this.expiresAt - this.refreshSkew * 1000
  }

  private resource(): SessionTokenResource {
    return new SessionTokenResource(new ClowkClient({ publishableKey: this.publishableKey }))
  }

  private emit(): void {
    this.onChange?.({ token: this.accessToken, user: this.user, sessionId: this.sessionId })
  }
}

/**
 * Reads the claims without verifying them. Verification belongs to whoever
 * receives the token — the browser cannot hold a key to check a signature with,
 * and pretending otherwise is how a secret ends up in a bundle.
 */
export function decodeClaims(token: string): JwtPayload | null {
  try {
    const payload = token.split('.')[1]

    if (!payload) return null

    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))

    return JSON.parse(json) as JwtPayload
  } catch {
    return null
  }
}
