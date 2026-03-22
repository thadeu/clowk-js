import type { HttpResponseData } from '../types'

export class ClowkResponse implements HttpResponseData {
  readonly status: number
  readonly body: string
  readonly bodyParsed: unknown | null
  readonly headers: Record<string, string>
  readonly success: boolean

  constructor(data: HttpResponseData) {
    this.status = data.status
    this.body = data.body
    this.bodyParsed = data.bodyParsed
    this.headers = data.headers
    this.success = data.success
  }
}
