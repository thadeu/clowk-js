import { describe, it, expect } from 'vitest'
import {
  ClowkProvider,
  ClowkContext,
  useAuth,
  useClowk,
  useToken,
  SignInButton,
  SignUpButton,
  SignOutButton,
} from '../src'

describe('@clowk/react exports', () => {
  it('exports ClowkProvider', () => {
    expect(ClowkProvider).toBeDefined()
    expect(typeof ClowkProvider).toBe('function')
  })

  it('exports ClowkContext', () => {
    expect(ClowkContext).toBeDefined()
  })

  it('exports useAuth hook', () => {
    expect(typeof useAuth).toBe('function')
  })

  it('exports useClowk hook', () => {
    expect(typeof useClowk).toBe('function')
  })

  it('exports useToken hook', () => {
    expect(typeof useToken).toBe('function')
  })

  it('exports SignInButton component', () => {
    expect(typeof SignInButton).toBe('function')
  })

  it('exports SignUpButton component', () => {
    expect(typeof SignUpButton).toBe('function')
  })

  it('exports SignOutButton component', () => {
    expect(typeof SignOutButton).toBe('function')
  })
})
