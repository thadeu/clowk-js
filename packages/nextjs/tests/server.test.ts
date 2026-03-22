import { describe, it, expect } from 'vitest'
import { clowkMiddleware } from '../src/middleware'

describe('@clowk/nextjs', () => {
  describe('clowkMiddleware', () => {
    it('exports a function that returns a middleware handler', () => {
      const middleware = clowkMiddleware()
      expect(typeof middleware).toBe('function')
    })

    it('accepts custom options', () => {
      const middleware = clowkMiddleware({
        secretKey: 'sk_test',
        publicRoutes: ['/api/health', '/public/*'],
        signInUrl: '/login',
      })
      expect(typeof middleware).toBe('function')
    })
  })
})
