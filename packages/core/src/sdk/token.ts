import type { ClowkResponse } from '../http/response'
import type { VerifyResult } from '../types'
import { Resource } from './resource'

export class TokenResource extends Resource {
  static resourcePath = 'tokens'

  async verify(token: string): Promise<ClowkResponse> {
    return this.client.post(`${this.path()}/verify`, { token })
  }

  async verifyWithSession(token: string): Promise<VerifyResult> {
    const response = await this.verify(token)
    const parsed = response.bodyParsed as Record<string, unknown>
    const data = (parsed?.data ?? parsed) as VerifyResult

    return data
  }
}
