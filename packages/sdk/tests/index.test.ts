import { describe, it, expect } from 'vitest'
import {
  Clowk,
  configure,
  getConfig,
  resetConfig,
  ClowkClient,
  ClowkError,
  ConfigurationError,
  InvalidStateError,
  InvalidTokenError,
  HttpClient,
  ClowkResponse,
  JwtVerifier,
  SubdomainResolver,
  TokenExtractor,
  Resource,
  UserResource,
  SessionResource,
  SubdomainResource,
  TokenResource,
} from '../src'

describe('@clowk/sdk', () => {
  it('re-exports Clowk namespace', () => {
    expect(Clowk).toBeDefined()
    expect(Clowk.configure).toBe(configure)
    expect(Clowk.Client).toBe(ClowkClient)
  })

  it('re-exports configuration functions', () => {
    expect(typeof configure).toBe('function')
    expect(typeof getConfig).toBe('function')
    expect(typeof resetConfig).toBe('function')
  })

  it('re-exports error classes', () => {
    expect(new ClowkError('test')).toBeInstanceOf(Error)
    expect(new ConfigurationError('test')).toBeInstanceOf(ClowkError)
    expect(new InvalidStateError('test')).toBeInstanceOf(ClowkError)
    expect(new InvalidTokenError('test')).toBeInstanceOf(ClowkError)
  })

  it('re-exports SDK classes', () => {
    expect(ClowkClient).toBeDefined()
    expect(HttpClient).toBeDefined()
    expect(ClowkResponse).toBeDefined()
    expect(JwtVerifier).toBeDefined()
    expect(SubdomainResolver).toBeDefined()
    expect(TokenExtractor).toBeDefined()
  })

  it('re-exports resource classes', () => {
    expect(Resource).toBeDefined()
    expect(UserResource).toBeDefined()
    expect(SessionResource).toBeDefined()
    expect(SubdomainResource).toBeDefined()
    expect(TokenResource).toBeDefined()
  })
})
