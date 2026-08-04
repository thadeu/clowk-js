import type { ClowkResponse } from '../http/response'
import type { TokenPair } from '../types'
import { InvalidTokenError } from '../errors'
import { Resource } from './resource'

/**
 * Token lifecycle for public clients. These endpoints authenticate with the
 * publishable key — a browser cannot hold a secret key, and the refresh token
 * is itself the credential.
 */
export class SessionTokenResource extends Resource {
  static resourcePath = 'sessions'

  /**
   * Trades the short-lived JWT handed back by the sign-in redirect for a
   * refresh-capable pair. Sign-in delivers its token in a query string, so it
   * must not be held onto: this is where it becomes something durable.
   */
  async exchange(token: string): Promise<TokenPair> {
    return this.unwrap(await this.client.post(`${this.path()}/exchange`, { token }))
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    return this.unwrap(await this.client.post(`${this.path()}/refresh`, { refresh_token: refreshToken }))
  }

  async revoke(refreshToken: string): Promise<void> {
    await this.client.post(`${this.path()}/revoke`, { refresh_token: refreshToken })
  }

  private unwrap(response: ClowkResponse): TokenPair {
    if (!response.success) {
      throw new InvalidTokenError('Clowk rejected the token')
    }

    const parsed = response.bodyParsed as Record<string, unknown>
    const data = (parsed?.data ?? parsed) as Record<string, unknown>

    if (!data || typeof data.access_token !== 'string') {
      throw new InvalidTokenError('Clowk returned no access token')
    }

    return {
      accessToken: data.access_token,
      refreshToken: typeof data.refresh_token === 'string' ? data.refresh_token : null,
      expiresIn: typeof data.expires_in === 'number' ? data.expires_in : null,
      sessionId: typeof data.session_id === 'string' ? data.session_id : null,
    }
  }
}
