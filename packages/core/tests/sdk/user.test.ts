import { describe, it, expect } from 'vitest'
import { UserResource } from '../../src/sdk/user'
import { Resource } from '../../src/sdk/resource'

describe('UserResource', () => {
  it('has correct resourcePath', () => {
    expect(UserResource.resourcePath).toBe('users')
  })

  it('extends Resource', () => {
    expect(UserResource.prototype).toBeInstanceOf(Resource)
  })
})
