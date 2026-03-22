import type { ClowkResponse } from '../http/response'
import { Resource } from './resource'

export class SubdomainResource extends Resource {
  static resourcePath = 'instances'

  async findByPk(key: string): Promise<ClowkResponse> {
    return this.search({ publishable_key: key })
  }
}
