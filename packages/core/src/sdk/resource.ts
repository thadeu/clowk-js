import type { ClowkResponse } from '../http/response'

export interface ResourceClient {
  get(path: string, headers?: Record<string, string>): Promise<ClowkResponse>
  post(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse>
  delete(path: string, body?: unknown, headers?: Record<string, string>): Promise<ClowkResponse>
}

export abstract class Resource {
  static resourcePath: string

  constructor(protected client: ResourceClient) {}

  async list(): Promise<ClowkResponse> {
    return this.client.get(this.path())
  }

  async find(id: string): Promise<ClowkResponse> {
    return this.client.get(`${this.path()}/${id}`)
  }

  async show(id: string): Promise<ClowkResponse> {
    return this.client.get(`${this.path()}/${id}`)
  }

  async search(query: string | Record<string, string>): Promise<ClowkResponse> {
    const queryStr =
      typeof query === 'string'
        ? query
        : Object.entries(query)
            .map(([k, v]) => `${k}:${v}`)
            .join(' ')

    return this.client.get(
      `${this.path()}/search?query=${encodeURIComponent(queryStr)}`,
    )
  }

  async destroy(id: string): Promise<ClowkResponse> {
    return this.client.delete(`${this.path()}/${id}`)
  }

  protected path(): string {
    return (this.constructor as typeof Resource).resourcePath
  }
}
