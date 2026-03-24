import type { ClowkResponse } from '../http/response'
import { Resource } from './resource'

export class SessionResource extends Resource {
  static resourcePath = 'sessions'

  async search(email: string): Promise<ClowkResponse> {
    return this.client.get(
      `${this.path()}/search?email=${encodeURIComponent(email)}`,
    )
  }

  async revoke(sessionId: string): Promise<ClowkResponse> {
    return this.destroy(sessionId)
  }
}
