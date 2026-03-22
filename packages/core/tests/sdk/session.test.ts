import { describe, it, expect } from 'vitest'
import { SessionResource } from '../../src/sdk/session'
import { Resource } from '../../src/sdk/resource'

describe('SessionResource', () => {
  it('has correct resourcePath', () => {
    expect(SessionResource.resourcePath).toBe('sessions')
  })

  it('extends Resource', () => {
    expect(SessionResource.prototype).toBeInstanceOf(Resource)
  })
})
