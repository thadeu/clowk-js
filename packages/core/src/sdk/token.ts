import type { ClowkResponse } from '../http/response'
import { Resource } from './resource'

export class TokenResource extends Resource {
  static resourcePath = 'tokens'

  async verify(token: string): Promise<ClowkResponse> {
    return this.client.post(`${this.path()}/verify`, { token })
  }
}
