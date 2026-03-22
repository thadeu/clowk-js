import { describe, it, expect } from 'vitest'
import { ClowkResponse } from '../../src/http/response'

describe('ClowkResponse', () => {
  it('sets all fields from constructor', () => {
    const response = new ClowkResponse({
      status: 200,
      body: '{"ok":true}',
      bodyParsed: { ok: true },
      headers: { 'content-type': 'application/json' },
      success: true,
    })

    expect(response.status).toBe(200)
    expect(response.body).toBe('{"ok":true}')
    expect(response.bodyParsed).toEqual({ ok: true })
    expect(response.headers).toEqual({ 'content-type': 'application/json' })
    expect(response.success).toBe(true)
  })

  it('success is false for non-2xx', () => {
    const response = new ClowkResponse({
      status: 404,
      body: 'Not Found',
      bodyParsed: null,
      headers: {},
      success: false,
    })

    expect(response.success).toBe(false)
    expect(response.bodyParsed).toBeNull()
  })
})
