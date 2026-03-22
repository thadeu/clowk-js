import { describe, it, expect } from 'vitest'
import {
  ClowkError,
  ConfigurationError,
  InvalidStateError,
  InvalidTokenError,
} from '../src/errors'

describe('Errors', () => {
  it('ClowkError is an instance of Error', () => {
    const err = new ClowkError('test')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ClowkError)
    expect(err.name).toBe('ClowkError')
    expect(err.message).toBe('test')
  })

  it('ConfigurationError extends ClowkError', () => {
    const err = new ConfigurationError('missing key')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ClowkError)
    expect(err).toBeInstanceOf(ConfigurationError)
    expect(err.name).toBe('ConfigurationError')
  })

  it('InvalidStateError extends ClowkError', () => {
    const err = new InvalidStateError('state mismatch')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ClowkError)
    expect(err).toBeInstanceOf(InvalidStateError)
    expect(err.name).toBe('InvalidStateError')
  })

  it('InvalidTokenError extends ClowkError', () => {
    const err = new InvalidTokenError('expired')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(ClowkError)
    expect(err).toBeInstanceOf(InvalidTokenError)
    expect(err.name).toBe('InvalidTokenError')
  })
})
